# app/schemas/transaction.py
from pydantic import BaseModel, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TransactionType(str, Enum):
    P2P = "P2P"  # Person to Person
    P2M = "P2M"  # Person to Merchant
    M2P = "M2P"  # Merchant to Person
    BILL_PAYMENT = "BILL_PAYMENT"
    RECHARGE = "RECHARGE"
    
class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class FraudCheckRequest(BaseModel):
    """Request model for fraud detection"""
    transaction_id: str = Field(..., description="Unique transaction identifier")
    amount: float = Field(..., gt=0, description="Transaction amount")
    sender_account: str = Field(..., description="Sender account number/UPI ID")
    receiver_account: str = Field(..., description="Receiver account number/UPI ID")
    transaction_type: TransactionType = Field(..., description="Type of transaction")
    transaction_time: Optional[datetime] = Field(None, description="Transaction timestamp")
    
    # Additional fraud detection features
    device_id: Optional[str] = Field(None, description="Device identifier")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    location: Optional[str] = Field(None, description="Transaction location")
    
    # Behavioral features
    user_age_days: Optional[int] = Field(None, description="User account age in days")
    transaction_hour: Optional[int] = Field(None, ge=0, le=23, description="Hour of transaction")
    is_weekend: Optional[bool] = Field(None, description="Is transaction on weekend")
    
    # Velocity features
    recent_transaction_count: Optional[int] = Field(None, ge=0, description="Recent transactions count")
    daily_transaction_amount: Optional[float] = Field(None, ge=0, description="Total daily amount")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > 200000:  # UPI limit
            raise ValueError('Amount exceeds UPI transaction limit')
        return v
    
    @validator('transaction_time', pre=True)
    def validate_transaction_time(cls, v):
        if v is None:
            return datetime.utcnow()
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

class TransactionCreate(BaseModel):
    """Schema for creating a transaction"""
    transaction_id: str
    amount: float
    sender_account: str
    receiver_account: str
    transaction_type: TransactionType
    transaction_time: datetime
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None

class TransactionResponse(BaseModel):
    """Response model for transaction data"""
    id: int
    transaction_id: str
    amount: float
    sender_account: str
    receiver_account: str
    transaction_type: str
    fraud_score: float
    is_fraudulent: bool
    fraud_reason: Optional[str]
    transaction_time: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

class FraudDetectionResponse(BaseModel):
    """Response model for fraud detection"""
    transaction_id: str
    fraud_score: float = Field(..., ge=0.0, le=1.0, description="Fraud probability score")
    is_fraudulent: bool = Field(..., description="Whether transaction is classified as fraud")
    risk_level: RiskLevel = Field(..., description="Risk level assessment")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence")
    features_analyzed: List[str] = Field(default=[], description="Features used in analysis")
    recommendation: str = Field(..., description="Recommended action")
    reason: Optional[str] = Field(None, description="Explanation for the decision")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class BatchFraudCheckRequest(BaseModel):
    """Request model for batch fraud detection"""
    transactions: List[FraudCheckRequest] = Field(..., max_items=100)
    
    @validator('transactions')
    def validate_batch_size(cls, v):
        if len(v) == 0:
            raise ValueError('At least one transaction is required')
        if len(v) > 100:
            raise ValueError('Batch size cannot exceed 100 transactions')
        return v

class FraudAlert(BaseModel):
    """Model for fraud alerts"""
    id: int
    transaction_id: int
    alert_type: str
    severity: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ModelInfo(BaseModel):
    """Model information response"""
    model_name: str
    version: str
    accuracy: Optional[float]
    precision: Optional[float]
    recall: Optional[float]
    f1_score: Optional[float]
    last_updated: Optional[datetime]

class FraudStatistics(BaseModel):
    """Fraud statistics response"""
    total_transactions: int
    fraudulent_transactions: int
    fraud_rate: float
    recent_alerts_count: int
    model_accuracy: float
    last_updated: datetime

class FeedbackRequest(BaseModel):
    """Feedback request for model improvement"""
    transaction_id: str
    is_actual_fraud: bool
    feedback_notes: Optional[str] = Field(None, max_length=500)
    confidence_rating: Optional[int] = Field(None, ge=1, le=5)