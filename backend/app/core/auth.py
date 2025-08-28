# app/core/auth.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
import logging

from .config import settings
from .database import get_db, get_user_by_username, update_user_login, log_audit_event
from ..models.user import User

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token handler
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Hash password"""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logger.error(f"Error hashing password: {e}")
        raise

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    try:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Error creating access token: {e}")
        raise

def authenticate_user(db: Session, username: str, password: str, ip_address: str = None) -> Optional[User]:
    """Authenticate user credentials with security checks"""
    try:
        user = get_user_by_username(db, username)
        if not user:
            return None
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            logger.warning(f"Login attempt for locked account: {username}")
            return None
        
        # Check if account is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive account: {username}")
            return None
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            update_user_login(db, user, success=False)
            log_audit_event(
                db, user.id, "LOGIN_FAILED", "USER", 
                str(user.id), f"Failed login attempt", ip_address
            )
            return None
        
        # Successful login
        update_user_login(db, user, success=True)
        log_audit_event(
            db, user.id, "LOGIN_SUCCESS", "USER", 
            str(user.id), "Successful login", ip_address
        )
        
        return user
        
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return None

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            raise credentials_exception
        
        # Check token expiration
        exp = payload.get("exp")
        if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except JWTError as e:
        logger.warning(f"JWT validation error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        raise credentials_exception
    
    user = get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive"
        )
    
    # Log API access
    client_ip = request.client.host if request.client else None
    log_audit_event(
        db, user.id, "API_ACCESS", "ENDPOINT",
        str(request.url.path), f"API access", client_ip
    )
    
    return user

def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user and verify admin privileges"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

def validate_password_strength(password: str) -> bool:
    """Validate password strength"""
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False
    
    # Check for at least one uppercase, lowercase, digit, and special character
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    return has_upper and has_lower and has_digit and has_special