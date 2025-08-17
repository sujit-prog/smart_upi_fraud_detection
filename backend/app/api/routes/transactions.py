# app/api/routes/transactions.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging

from ...core.database import get_db, get_transactions, Transaction
from ...core.auth import get_current_user
from ...schemas.transaction import TransactionResponse
from ...models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[TransactionResponse])
async def get_user_transactions(
    skip: int = Query(0, ge=0, description="Number of transactions to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of transactions to return"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    is_fraudulent: Optional[bool] = Query(None, description="Filter by fraud status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's transaction history with optional filters
    """
    try:
        # Base query
        query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
        
        # Apply date filters
        if start_date:
            query = query.filter(Transaction.transaction_time >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_time <= end_date)
        
        # Apply fraud filter
        if is_fraudulent is not None:
            query = query.filter(Transaction.is_fraudulent == is_fraudulent)
        
        # Get transactions with pagination
        transactions = query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()
        
        return transactions
        
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
    Get specific transaction by ID
    """
    try:
        transaction = db.query(Transaction).filter(
            Transaction.transaction_id == transaction_id,
            Transaction.user_id == current_user.id
        ).first()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
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

@router.get("/summary/stats")
async def get_transaction_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to include in summary"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get transaction summary statistics for the user
    """
    try:
        from sqlalchemy import func
        
        # Calculate date range
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Base query for the date range
        base_query = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_time >= start_date
        )
        
        # Get summary statistics
        total_transactions = base_query.count()
        total_amount = base_query.with_entities(func.sum(Transaction.amount)).scalar() or 0
        avg_amount = base_query.with_entities(func.avg(Transaction.amount)).scalar() or 0
        fraudulent_count = base_query.filter(Transaction.is_fraudulent == True).count()
        
        # Get transaction type breakdown
        type_breakdown = db.query(
            Transaction.transaction_type,
            func.count(Transaction.id).label('count'),
            func.sum(Transaction.amount).label('total_amount')
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_time >= start_date
        ).group_by(Transaction.transaction_type).all()
        
        return {
            "period_days": days,
            "total_transactions": total_transactions,
            "total_amount": float(total_amount),
            "average_amount": float(avg_amount),
            "fraudulent_transactions": fraudulent_count,
            "fraud_rate": (fraudulent_count / total_transactions * 100) if total_transactions > 0 else 0,
            "transaction_types": [
                {
                    "type": item.transaction_type,
                    "count": item.count,
                    "total_amount": float(item.total_amount)
                } for item in type_breakdown
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting transaction summary for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate transaction summary"
        )