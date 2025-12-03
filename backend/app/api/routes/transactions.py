# app/api/routes/transactions.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from ...core.database import get_db, Transaction, log_audit_event
from ...core.auth import get_current_user
from ...schemas.transaction import TransactionResponse, TransactionSummary
from ...models.user import User
from ...core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[TransactionResponse])
async def get_user_transactions(
    skip: int = Query(0, ge=0, description="Number of transactions to skip"),
    limit: int = Query(100, ge=1, le=settings.MAX_TRANSACTIONS_PER_REQUEST, description="Maximum number of transactions to return"),
    start_date: Optional[datetime] = Query(None, description="Start date filter (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date filter (ISO format)"),
    is_fraudulent: Optional[bool] = Query(None, description="Filter by fraud status"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    min_amount: Optional[float] = Query(None, ge=0, description="Minimum amount filter"),
    max_amount: Optional[float] = Query(None, ge=0, description="Maximum amount filter"),
    search: Optional[str] = Query(None, min_length=1, max_length=100, description="Search in accounts or transaction ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's transaction history with comprehensive filtering and pagination
    """
    try:
        # Validate date range
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date cannot be after end date"
            )
        
        # Validate amount range
        if min_amount is not None and max_amount is not None and min_amount > max_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum amount cannot be greater than maximum amount"
            )
        
        # Base query
        query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
        
        # Apply filters
        if start_date:
            query = query.filter(Transaction.transaction_time >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_time <= end_date)
        if is_fraudulent is not None:
            query = query.filter(Transaction.is_fraudulent == is_fraudulent)
        if transaction_type:
            valid_types = ['P2P', 'P2M', 'M2P', 'BILL_PAYMENT', 'RECHARGE']
            if transaction_type.upper() not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid transaction type. Must be one of: {valid_types}"
                )
            query = query.filter(Transaction.transaction_type == transaction_type.upper())
        if min_amount is not None:
            query = query.filter(Transaction.amount >= min_amount)
        if max_amount is not None:
            query = query.filter(Transaction.amount <= max_amount)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Transaction.transaction_id.ilike(search_term),
                    Transaction.sender_account.ilike(search_term),
                    Transaction.receiver_account.ilike(search_term)
                )
            )
        
        # Get total count for pagination info
        total_count = query.count()
        
        # Get transactions with pagination
        transactions = query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
        
        # Log access
        log_audit_event(
            db, current_user.id, "VIEW_TRANSACTIONS", "TRANSACTION",
            f"page_{skip//limit + 1}", f"Viewed {len(transactions)} transactions"
        )
        
        return transactions
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transactions for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch transactions"
        )

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get specific transaction by ID with security validation
    """
    try:
        transaction = db.query(Transaction).filter(
            Transaction.transaction_id == transaction_id,
            Transaction.user_id == current_user.id
        ).first()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found or access denied"
            )
        
        # Log access
        log_audit_event(
            db, current_user.id, "VIEW_TRANSACTION", "TRANSACTION",
            transaction_id, "Viewed transaction details"
        )
        
        return transaction
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transaction {transaction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch transaction"
        )

@router.get("/summary/stats", response_model=TransactionSummary)
async def get_transaction_summary(
    days: int = Query(30, ge=1, le=settings.MAX_DAYS_ANALYTICS, description="Number of days to include in summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive transaction summary statistics for the user
    """
    try:
        # Calculate date range
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Base query for the date range
        base_query = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_time >= start_date
        )
        
        # Get summary statistics
        total_transactions = base_query.count()
        
        if total_transactions == 0:
            return TransactionSummary(
                period_days=days,
                total_transactions=0,
                total_amount=0.0,
                average_amount=0.0,
                fraudulent_transactions=0,
                fraud_rate=0.0,
                transaction_types=[]
            )
        
        # Amount statistics
        amount_stats = base_query.with_entities(
            func.sum(Transaction.amount).label('total'),
            func.avg(Transaction.amount).label('average'),
            func.min(Transaction.amount).label('minimum'),
            func.max(Transaction.amount).label('maximum')
        ).first()
        
        total_amount = float(amount_stats.total or 0)
        avg_amount = float(amount_stats.average or 0)
        
        # Fraud statistics
        fraudulent_count = base_query.filter(Transaction.is_fraudulent == True).count()
        fraud_amount = base_query.filter(Transaction.is_fraudulent == True).with_entities(
            func.sum(Transaction.amount)
        ).scalar() or 0
        
        # Transaction type breakdown
        type_breakdown = db.query(
            Transaction.transaction_type,
            func.count(Transaction.id).label('count'),
            func.sum(Transaction.amount).label('total_amount'),
            func.avg(Transaction.amount).label('avg_amount'),
            func.sum(func.cast(Transaction.is_fraudulent, db.Integer)).label('fraud_count')
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_time >= start_date
        ).group_by(Transaction.transaction_type).all()
        
        return TransactionSummary(
            period_days=days,
            total_transactions=total_transactions,
            total_amount=round(total_amount, 2),
            average_amount=round(avg_amount, 2),
            fraudulent_transactions=fraudulent_count,
            fraud_rate=round((fraudulent_count / total_transactions * 100), 2),
            transaction_types=[
                {
                    "type": item.transaction_type,
                    "count": item.count,
                    "total_amount": round(float(item.total_amount or 0), 2),
                    "avg_amount": round(float(item.avg_amount or 0), 2),
                    "fraud_count": item.fraud_count or 0,
                    "fraud_rate": round((item.fraud_count / item.count * 100), 2) if item.count > 0 else 0
                } for item in type_breakdown
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transaction summary for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate transaction summary"
        )

@router.get("/export/csv")
async def export_transactions_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    include_fraud_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export transactions to CSV format
    """
    try:
        from fastapi.responses import StreamingResponse
        import io
        import csv
        
        # Build query
        query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
        
        if start_date:
            query = query.filter(Transaction.transaction_time >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_time <= end_date)
        if include_fraud_only:
            query = query.filter(Transaction.is_fraudulent == True)
        
        transactions = query.order_by(Transaction.transaction_time.desc()).all()
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'Transaction ID', 'Amount', 'Sender Account', 'Receiver Account',
            'Transaction Type', 'Fraud Score', 'Is Fraudulent', 'Fraud Reason',
            'Transaction Time', 'Device ID', 'IP Address', 'Location'
        ])
        
        # Write data
        for tx in transactions:
            writer.writerow([
                tx.transaction_id,
                tx.amount,
                tx.sender_account,
                tx.receiver_account,
                tx.transaction_type,
                tx.fraud_score,
                tx.is_fraudulent,
                tx.fraud_reason or '',
                tx.transaction_time.isoformat(),
                tx.device_id or '',
                tx.ip_address or '',
                tx.location or ''
            ])
        
        output.seek(0)
        
        # Log export
        log_audit_event(
            db, current_user.id, "EXPORT_TRANSACTIONS", "TRANSACTION",
            f"csv_export_{len(transactions)}", f"Exported {len(transactions)} transactions to CSV"
        )
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting transactions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export transactions"
        )