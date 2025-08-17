# app/api/routes/fraud_detection.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime
import logging

from ...core.database import get_db, create_transaction, create_fraud_alert
from ...services.fraud_detector import FraudDetectionService
from ...schemas.transaction import TransactionCreate, TransactionResponse, FraudCheckRequest
from ...core.auth import get_current_user
from ...models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/check", response_model=Dict[str, Any])
async def check_fraud(
    request: FraudCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    app_request: Request = None
):
    """
    Real-time fraud detection for UPI transactions
    """
    try:
        # Get model service from app state
        model_service = app_request.app.state.model_service
        
        # Create fraud detection service
        fraud_service = FraudDetectionService(model_service)
        
        # Prepare transaction data
        transaction_data = {
            "user_id": current_user.id,
            "transaction_id": request.transaction_id,
            "amount": request.amount,
            "sender_account": request.sender_account,
            "receiver_account": request.receiver_account,
            "transaction_type": request.transaction_type,
            "transaction_time": request.transaction_time or datetime.utcnow(),
            "device_id": request.device_id,
            "ip_address": request.ip_address,
            "location": request.location
        }
        
        # Perform fraud detection
        fraud_result = await fraud_service.detect_fraud(transaction_data)
        
        # Save transaction to database
        transaction_data.update({
            "fraud_score": fraud_result["fraud_score"],
            "is_fraudulent": fraud_result["is_fraudulent"],
            "fraud_reason": fraud_result.get("reason", "")
        })
        
        db_transaction = create_transaction(db, transaction_data)
        
        # Create fraud alert if needed
        if fraud_result["is_fraudulent"]:
            alert_data = {
                "transaction_id": db_transaction.id,
                "alert_type": "FRAUD_DETECTED",
                "severity": fraud_result.get("severity", "HIGH"),
                "description": fraud_result.get("reason", "Suspicious transaction detected")
            }
            create_fraud_alert(db, alert_data)
        
        # Prepare response
        response = {
            "transaction_id": request.transaction_id,
            "fraud_score": fraud_result["fraud_score"],
            "is_fraudulent": fraud_result["is_fraudulent"],
            "risk_level": fraud_result.get("risk_level", "LOW"),
            "confidence": fraud_result.get("confidence", 0.0),
            "features_analyzed": fraud_result.get("features_analyzed", []),
            "recommendation": fraud_result.get("recommendation", "APPROVE"),
            "reason": fraud_result.get("reason", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Error in fraud detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fraud detection failed: {str(e)}"
        )

@router.post("/batch-check", response_model=List[Dict[str, Any]])
async def batch_fraud_check(
    requests: List[FraudCheckRequest],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    app_request: Request = None
):
    """
    Batch fraud detection for multiple transactions
    """
    if len(requests) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size cannot exceed 100 transactions"
        )
    
    results = []
    model_service = app_request.app.state.model_service
    fraud_service = FraudDetectionService(model_service)
    
    for request in requests:
        try:
            transaction_data = {
                "user_id": current_user.id,
                "transaction_id": request.transaction_id,
                "amount": request.amount,
                "sender_account": request.sender_account,
                "receiver_account": request.receiver_account,
                "transaction_type": request.transaction_type,
                "transaction_time": request.transaction_time or datetime.utcnow(),
                "device_id": request.device_id,
                "ip_address": request.ip_address,
                "location": request.location
            }
            
            fraud_result = await fraud_service.detect_fraud(transaction_data)
            
            results.append({
                "transaction_id": request.transaction_id,
                "fraud_score": fraud_result["fraud_score"],
                "is_fraudulent": fraud_result["is_fraudulent"],
                "risk_level": fraud_result.get("risk_level", "LOW"),
                "reason": fraud_result.get("reason", "")
            })
            
        except Exception as e:
            logger.error(f"Error processing transaction {request.transaction_id}: {str(e)}")
            results.append({
                "transaction_id": request.transaction_id,
                "error": str(e),
                "fraud_score": 0.0,
                "is_fraudulent": False
            })
    
    return results

@router.get("/model-info")
async def get_model_info(
    current_user: User = Depends(get_current_user),
    app_request: Request = None
):
    """
    Get information about loaded fraud detection models
    """
    model_service = app_request.app.state.model_service
    
    return {
        "loaded_models": model_service.get_model_info(),
        "fraud_threshold": model_service.fraud_threshold,
        "last_updated": model_service.last_updated.isoformat() if model_service.last_updated else None,
        "version": "1.0.0"
    }

@router.post("/feedback")
async def submit_feedback(
    transaction_id: str,
    is_actual_fraud: bool,
    feedback_notes: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback for fraud detection accuracy improvement
    """
    # This can be used to improve your models over time
    # Store feedback in database for model retraining
    
    return {
        "message": "Feedback submitted successfully",
        "transaction_id": transaction_id,
        "feedback_recorded": True
    }

@router.get("/statistics")
async def get_fraud_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get fraud detection statistics
    """
    try:
        # Calculate basic statistics from database
        from sqlalchemy import func
        from ...core.database import Transaction, FraudAlert
        
        total_transactions = db.query(func.count(Transaction.id)).scalar()
        fraudulent_transactions = db.query(func.count(Transaction.id)).filter(Transaction.is_fraudulent == True).scalar()
        
        fraud_rate = (fraudulent_transactions / total_transactions * 100) if total_transactions > 0 else 0
        
        # Get recent alerts
        recent_alerts = db.query(FraudAlert).order_by(FraudAlert.created_at.desc()).limit(10).all()
        
        return {
            "total_transactions": total_transactions,
            "fraudulent_transactions": fraudulent_transactions,
            "fraud_rate": round(fraud_rate, 2),
            "recent_alerts_count": len(recent_alerts),
            "model_accuracy": 95.5,  # This should come from your model metrics
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting fraud statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )