# app/core/database.py
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Generator, Optional, Dict, Any
import logging

from .config import get_database_url

logger = logging.getLogger(__name__)

# Database setup
engine = create_engine(
    get_database_url(),
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False  # Set to True for SQL debugging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}')>"

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(String(100), unique=True, index=True, nullable=False)
    
    # Transaction details
    amount = Column(Float, nullable=False)
    sender_account = Column(String(100), nullable=False, index=True)
    receiver_account = Column(String(100), nullable=False, index=True)
    transaction_type = Column(String(20), nullable=False, index=True)
    
    # Fraud detection results
    fraud_score = Column(Float, default=0.0, nullable=False)
    is_fraudulent = Column(Boolean, default=False, nullable=False, index=True)
    fraud_reason = Column(Text, nullable=True)
    
    # Timestamps
    transaction_time = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional features for fraud detection
    device_id = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)
    location = Column(String(100), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    fraud_alerts = relationship("FraudAlert", back_populates="transaction", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_user_time', 'user_id', 'transaction_time'),
        Index('idx_fraud_score', 'fraud_score'),
        Index('idx_amount_range', 'amount'),
    )
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, transaction_id='{self.transaction_id}', amount={self.amount})>"

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    description = Column(Text, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False, index=True)  # ACTIVE, RESOLVED, FALSE_POSITIVE
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    transaction = relationship("Transaction", back_populates="fraud_alerts")
    
    def __repr__(self):
        return f"<FraudAlert(id={self.id}, severity='{self.severity}', status='{self.status}')>"

class ModelMetrics(Base):
    __tablename__ = "model_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    roc_auc = Column(Float, nullable=True)
    training_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<ModelMetrics(model_name='{self.model_name}', version='{self.version}')>"

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

# Database dependency
def get_db() -> Generator[Session, None, None]:
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Initialize database
async def init_db():
    """Create database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

# Database utilities with proper error handling
def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    try:
        return db.query(User).filter(User.username == username).first()
    except Exception as e:
        logger.error(f"Error getting user by username: {e}")
        return None

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    try:
        return db.query(User).filter(User.email == email).first()
    except Exception as e:
        logger.error(f"Error getting user by email: {e}")
        return None

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    try:
        return db.query(User).filter(User.id == user_id).first()
    except Exception as e:
        logger.error(f"Error getting user by ID: {e}")
        return None

def create_user(db: Session, username: str, email: str, hashed_password: str) -> User:
    """Create a new user"""
    try:
        db_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"Created user: {username}")
        return db_user
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        db.rollback()
        raise

def create_transaction(db: Session, transaction_data: Dict[str, Any]) -> Transaction:
    """Create a new transaction"""
    try:
        db_transaction = Transaction(**transaction_data)
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        db.rollback()
        raise

def get_transactions(
    db: Session, 
    user_id: Optional[int] = None, 
    limit: int = 100,
    offset: int = 0,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[Transaction]:
    """Get transactions with proper filtering and pagination"""
    try:
        query = db.query(Transaction)
        
        if user_id:
            query = query.filter(Transaction.user_id == user_id)
        if start_date:
            query = query.filter(Transaction.transaction_time >= start_date)
        if end_date:
            query = query.filter(Transaction.transaction_time <= end_date)
        
        return query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        return []

def create_fraud_alert(db: Session, alert_data: Dict[str, Any]) -> FraudAlert:
    """Create a fraud alert"""
    try:
        db_alert = FraudAlert(**alert_data)
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        return db_alert
    except Exception as e:
        logger.error(f"Error creating fraud alert: {e}")
        db.rollback()
        raise

def update_user_login(db: Session, user: User, success: bool = True):
    """Update user login information"""
    try:
        if success:
            user.last_login = datetime.utcnow()
            user.failed_login_attempts = 0
            user.locked_until = None
        else:
            user.failed_login_attempts += 1
            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                from datetime import timedelta
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        
        db.commit()
    except Exception as e:
        logger.error(f"Error updating user login: {e}")
        db.rollback()

def log_audit_event(
    db: Session,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """Log audit events"""
    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Error logging audit event: {e}")
        db.rollback()