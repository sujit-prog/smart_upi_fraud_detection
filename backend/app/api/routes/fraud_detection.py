# app/api/routes/fraud_detection.py
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime
import logging

from ...core.database import get_db, create_transaction, create_fraud_alert, log_audit_event
from ...core.exceptions import FraudDetectionException, ValidationException
from ...services.fraud_detector import FraudDetectionService
from ...schemas.transaction import FraudCheckRequest, FraudDetectionResponse, BatchFraudCheckRequest
from ...core.auth import get_current_user
from ...models.user import User
from ...core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/check", response_model=FraudDetectionResponse)
async def check_fraud(
    request: FraudCheckRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    app_request: Request = None
):
    """
    Real-time fraud detection for UPI transactions with comprehensive error handling
    """
    try:
        # Validate request
        if not app_request or not hasattr(app_request.app.state, 'model_service'):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Fraud detection service is not available"
            )
        
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
            "location": request.location,
            "user_age_days": request.user_age_days,
            "recent_transaction_count": request.recent_transaction_count,
            "daily_transaction_amount": request.daily_transaction_amount
        }
        
        # Perform fraud detection
        fraud_result = await fraud_service.detect_fraud(transaction_data)
        
        # Prepare transaction data for database
        db_transaction_data = {
            "user_id": current_user.id,
            "transaction_id": request.transaction_id,
            "amount": request.amount,
            "sender_account": request.sender_account,
            "receiver_account": request.receiver_account,
            "transaction_type": request.transaction_type,
            "transaction_time": request.transaction_time or datetime.utcnow(),
            "device_id": request.device_id,
            "ip_address": request.ip_address,
            "location": request.location,
            "fraud_score": fraud_result["fraud_score"],
            "is_fraudulent": fraud_result["is_fraudulent"],
            "fraud_reason": fraud_result.get("reason", "")
        }
        
        # Save transaction to database
        db_transaction = create_transaction(db, db_transaction_data)
        
        # Create fraud alert if needed (in background)
        if fraud_result["is_fraudulent"]:
            background_tasks.add_task(
                create_fraud_alert_task,
                db_transaction.id,
                fraud_result,
                current_user.id
            )
        
        # Log audit event
        client_ip = app_request.client.host if app_request.client else None
        log_audit_event(
            db, current_user.id, "FRAUD_CHECK", "TRANSACTION",
            request.transaction_id, 
            f"Fraud check: score={fraud_result['fraud_score']:.4f}, fraudulent={fraud_result['is_fraudulent']}",
            client_ip
        )
        
        # Prepare response
        response = FraudDetectionResponse(
            transaction_id=request.transaction_id,
            fraud_score=fraud_result["fraud_score"],
            is_fraudulent=fraud_result["is_fraudulent"],
            risk_level=fraud_result.get("risk_level", "LOW"),
            confidence=fraud_result.get("confidence", 0.0),
            features_analyzed=fraud_result.get("features_analyzed", []),
            recommendation=fraud_result.get("recommendation", "APPROVE"),
            reason=fraud_result.get("reason", ""),
            timestamp=datetime.utcnow()
        )
        
        return response
        
    except FraudDetectionException as e:
        logger.error(f"Fraud detection error: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message
        )
    except Exception as e:
        logger.error(f"Unexpected error in fraud detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fraud detection service temporarily unavailable"
        )

@router.post("/batch-check")
async def batch_fraud_check(
    batch_request: BatchFraudCheckRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    app_request: Request = None
):
    """
    Batch fraud detection for multiple transactions
    """
    try:
        if len(batch_request.transactions) > settings.BATCH_SIZE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Batch size cannot exceed {settings.BATCH_SIZE_LIMIT} transactions"
            )
        
        model_service = app_request.app.state.model_service
        fraud_service = FraudDetectionService(model_service)
        
        results = []
        successful_checks = 0
        
        for transaction_request in batch_request.transactions:
            try:
                transaction_data = {
                    "user_id": current_user.id,
                    "transaction_id": transaction_request.transaction_id,
                    "amount": transaction_request.amount,
                    "sender_account": transaction_request.sender_account,
                    "receiver_account": transaction_request.receiver_account,
                    "transaction_type": transaction_request.transaction_type,
                    "transaction_time": transaction_request.transaction_time or datetime.utcnow(),
                    "device_id": transaction_request.device_id,
                    "ip_address": transaction_request.ip_address,
                    "location": transaction_request.location
                }
                
                fraud_result = await fraud_service.detect_fraud(transaction_data)
                
                results.append({
                    "transaction_id": transaction_request.transaction_id,
                    "fraud_score": fraud_result["fraud_score"],
                    "is_fraudulent": fraud_result["is_fraudulent"],
                    "risk_level": fraud_result.get("risk_level", "LOW"),
                    "reason": fraud_result.get("reason", ""),
                    "recommendation": fraud_result.get("recommendation", "APPROVE"),
                    "success": True
                })
                
                successful_checks += 1
                
            except Exception as e:
                logger.error(f"Error processing transaction {transaction_request.transaction_id}: {str(e)}")
                results.append({
                    "transaction_id": transaction_request.transaction_id,
                    "error": str(e),
                    "fraud_score": 0.0,
                    "is_fraudulent": False,
                    "success": False
                })
        
        # Log batch operation
        client_ip = app_request.client.host if app_request.client else None
        log_audit_event(
            db, current_user.id, "BATCH_FRAUD_CHECK", "TRANSACTION",
            f"batch_{len(batch_request.transactions)}", 
            f"Batch fraud check: {successful_checks}/{len(batch_request.transactions)} successful",
            client_ip
        )
        
        return {
            "results": results,
            "summary": {
                "total_transactions": len(batch_request.transactions),
                "successful_checks": successful_checks,
                "failed_checks": len(batch_request.transactions) - successful_checks,
                "fraud_detected": sum(1 for r in results if r.get("is_fraudulent", False))
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch fraud detection: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch fraud detection failed"
        )

@router.get("/model-info")
async def get_model_info(
    current_user: User = Depends(get_current_user),
    app_request: Request = None
):
    """
    Get information about loaded fraud detection models
    """
    try:
        if not app_request or not hasattr(app_request.app.state, 'model_service'):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model service not available"
            )
        
        model_service = app_request.app.state.model_service
        fraud_service = FraudDetectionService(model_service)
        
        model_info = model_service.get_model_info()
        health_status = await fraud_service.validate_model_health()
        
        return {
            "model_info": model_info,
            "health_status": health_status,
            "fraud_threshold": model_service.fraud_threshold,
            "version": settings.VERSION,
            "last_updated": model_service.last_updated.isoformat() if model_service.last_updated else None
        }
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get model information"
        )

@router.post("/feedback")
async def submit_feedback(
    transaction_id: str,
    is_actual_fraud: bool,
    feedback_notes: str = None,
    confidence_rating: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit feedback for fraud detection accuracy improvement
    """
    try:
        # Validate transaction belongs to user
        from ...core.database import Transaction
        transaction = db.query(Transaction).filter(
            Transaction.transaction_id == transaction_id,
            Transaction.user_id == current_user.id
        ).first()
        
        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found"
            )
        
        # Log feedback for model improvement
        log_audit_event(
            db, current_user.id, "FRAUD_FEEDBACK", "TRANSACTION",
            transaction_id,
            f"Feedback: actual_fraud={is_actual_fraud}, model_predicted={transaction.is_fraudulent}, notes={feedback_notes}"
        )
        
        return {
            "message": "Feedback submitted successfully",
            "transaction_id": transaction_id,
            "feedback_recorded": True,
            "will_improve_model": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit feedback"
        )

# Background task functions
async def create_fraud_alert_task(transaction_id: int, fraud_result: Dict[str, Any], user_id: int):
    """Background task to create fraud alert"""
    try:
        from ...core.database import SessionLocal
        db = SessionLocal()
        
        try:
            alert_data = {
                "transaction_id": transaction_id,
                "alert_type": "FRAUD_DETECTED",
                "severity": fraud_result.get("risk_level", "HIGH"),
                "description": fraud_result.get("reason", "Suspicious transaction detected"),
                "status": "ACTIVE"
            }
            create_fraud_alert(db, alert_data)
            logger.info(f"Created fraud alert for transaction {transaction_id}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error creating fraud alert in background: {e}")