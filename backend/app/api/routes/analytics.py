# app/api/routes/analytics.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import extract
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging

from ...core.database import get_db, Transaction, FraudAlert
from ...core.auth import get_current_user
from ...models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/fraud-trends")
async def get_fraud_trends(
    days: int = Query(30, ge=7, le=365, description="Number of days for trend analysis"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get fraud trends over time
    """
    try:
        from sqlalchemy import func, extract
        
        # Calculate date range
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get daily fraud counts
        daily_fraud = db.query(
            func.date(Transaction.transaction_time).label('date'),
            func.count(Transaction.id).label('total_transactions'),
            func.sum(func.cast(Transaction.is_fraudulent, db.Integer)).label('fraud_count')
        ).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_time >= start_date
        ).group_by(
            func.date(Transaction.transaction_time)
        ).order_by(
            func.date(Transaction.transaction_time)
        ).all()
        
        # Format results
        trends = []
        for item in daily_fraud:
            fraud_rate = (item.fraud_count / item.total_transactions * 100) if item.total_transactions > 0 else 0
            trends.append({
                "date": item.date.isoformat(),
                "total_transactions": item.total_transactions,
                "fraud_count": item.fraud_count,
                "fraud_rate": round(fraud_rate, 2)
            })
        
        return {
            "period_days": days,
            "trends": trends,
            "summary": {
                "avg_daily_transactions": sum(t["total_transactions"] for t in trends) / len(trends) if trends else 0,
                "avg_fraud_rate": sum(t["fraud_rate"] for t in trends) / len(trends) if trends else 0,
                "total_fraud_cases": sum(t["fraud_count"] for t in trends)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting fraud trends: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get fraud trends"
        )

@router.get("/risk-patterns")
async def get_risk_patterns(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze transaction patterns and risk factors
    """
    try:
        from sqlalchemy import func
        
        # Time-based patterns
        hourly_pattern = db.query(
            extract('hour', Transaction.transaction_time).label('hour'),
            func.count(Transaction.id).label('count'),
            func.avg(Transaction.fraud_score).label('avg_fraud_score'),
            func.sum(func.cast(Transaction.is_fraudulent, db.Integer)).label('fraud_count')
        ).filter(
            Transaction.user_id == current_user.id
        ).group_by(
            extract('hour', Transaction.transaction_time)
        ).all()
        
        # Amount-based patterns
        amount_ranges = [
            (0, 1000),
            (1000, 5000),
            (5000, 25000),
            (25000, 50000),
            (50000, 100000),
            (100000, 200000)
        ]
        
        amount_pattern = []
        for min_amt, max_amt in amount_ranges:
            stats = db.query(
                func.count(Transaction.id).label('count'),
                func.avg(Transaction.fraud_score).label('avg_fraud_score'),
                func.sum(func.cast(Transaction.is_fraudulent, db.Integer)).label('fraud_count')
            ).filter(
                Transaction.user_id == current_user.id,
                Transaction.amount >= min_amt,
                Transaction.amount < max_amt
            ).first()
            
            if stats and stats.count > 0:
                amount_pattern.append({
                    "range": f"₹{min_amt}-₹{max_amt}",
                    "count": stats.count,
                    "avg_fraud_score": round(float(stats.avg_fraud_score or 0), 4),
                    "fraud_count": stats.fraud_count,
                    "fraud_rate": round((stats.fraud_count / stats.count * 100), 2)
                })
        
        # Transaction type patterns
        type_pattern = db.query(
            Transaction.transaction_type,
            func.count(Transaction.id).label('count'),
            func.avg(Transaction.fraud_score).label('avg_fraud_score'),
            func.sum(func.cast(Transaction.is_fraudulent, db.Integer)).label('fraud_count')
        ).filter(
            Transaction.user_id == current_user.id
        ).group_by(Transaction.transaction_type).all()
        
        return {
            "hourly_patterns": [
                {
                    "hour": int(item.hour),
                    "count": item.count,
                    "avg_fraud_score": round(float(item.avg_fraud_score or 0), 4),
                    "fraud_count": item.fraud_count,
                    "fraud_rate": round((item.fraud_count / item.count * 100), 2) if item.count > 0 else 0
                } for item in hourly_pattern
            ],
            "amount_patterns": amount_pattern,
            "transaction_type_patterns": [
                {
                    "type": item.transaction_type,
                    "count": item.count,
                    "avg_fraud_score": round(float(item.avg_fraud_score or 0), 4),
                    "fraud_count": item.fraud_count,
                    "fraud_rate": round((item.fraud_count / item.count * 100), 2) if item.count > 0 else 0
                } for item in type_pattern
            ]
        }
        
    except Exception as e:
        logger.error(f"Error analyzing risk patterns: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze risk patterns"
        )

@router.get("/alerts")
async def get_fraud_alerts(
    limit: int = Query(50, ge=1, le=100),
    severity: str = Query(None, description="Filter by severity: LOW, MEDIUM, HIGH, CRITICAL"),
    status_filter: str = Query("ACTIVE", description="Filter by status: ACTIVE, RESOLVED, FALSE_POSITIVE"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get fraud alerts for user's transactions
    """
    try:
        # Base query - join with transactions to filter by user
        query = db.query(FraudAlert).join(
            Transaction, FraudAlert.transaction_id == Transaction.id
        ).filter(
            Transaction.user_id == current_user.id
        )
        
        # Apply filters
        if severity:
            query = query.filter(FraudAlert.severity == severity.upper())
        if status_filter:
            query = query.filter(FraudAlert.status == status_filter.upper())
        
        # Get alerts with limit
        alerts = query.order_by(FraudAlert.created_at.desc()).limit(limit).all()
        
        # Format results
        result = []
        for alert in alerts:
            result.append({
                "id": alert.id,
                "transaction_id": alert.transaction_id,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "description": alert.description,
                "status": alert.status,
                "created_at": alert.created_at.isoformat(),
                "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None
            })
        
        return {
            "alerts": result,
            "total_count": len(result),
            "filters_applied": {
                "severity": severity,
                "status": status_filter,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting fraud alerts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get fraud alerts"
        )

@router.get("/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard data for fraud detection analytics
    """
    try:
        from sqlalchemy import func
        
        # Recent transactions (last 30 days)
        recent_date = datetime.utcnow() - timedelta(days=30)
        
        # Basic stats
        total_transactions = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == current_user.id
        ).scalar() or 0
        
        recent_transactions = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_time >= recent_date
        ).scalar() or 0
        
        total_fraud = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == current_user.id,
            Transaction.is_fraudulent == True
        ).scalar() or 0
        
        recent_fraud = db.query(func.count(Transaction.id)).filter(
            Transaction.user_id == current_user.id,
            Transaction.is_fraudulent == True,
            Transaction.transaction_time >= recent_date
        ).scalar() or 0
        
        # Average fraud score
        avg_fraud_score = db.query(func.avg(Transaction.fraud_score)).filter(
            Transaction.user_id == current_user.id
        ).scalar() or 0
        
        # Active alerts
        active_alerts = db.query(func.count(FraudAlert.id)).join(
            Transaction, FraudAlert.transaction_id == Transaction.id
        ).filter(
            Transaction.user_id == current_user.id,
            FraudAlert.status == "ACTIVE"
        ).scalar() or 0
        
        return {
            "overview": {
                "total_transactions": total_transactions,
                "recent_transactions_30d": recent_transactions,
                "total_fraud_cases": total_fraud,
                "recent_fraud_cases_30d": recent_fraud,
                "overall_fraud_rate": round((total_fraud / total_transactions * 100), 2) if total_transactions > 0 else 0,
                "recent_fraud_rate": round((recent_fraud / recent_transactions * 100), 2) if recent_transactions > 0 else 0,
                "avg_fraud_score": round(float(avg_fraud_score), 4),
                "active_alerts": active_alerts
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dashboard data"
        )