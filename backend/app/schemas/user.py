# app/schemas/user.py
from pydantic import BaseModel, EmailStr, validator, Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")

class UserCreate(UserBase):
    """Schema for user creation (signup)"""
    password: str = Field(..., min_length=8, description="Password")
    
    @validator('username')
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v.lower()
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for required character types
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError('Password must contain uppercase, lowercase, digit, and special character')
        
        return v

class UserResponse(UserBase):
    """Schema for API responses"""
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserInDB(UserResponse):
    """Schema for user stored in DB"""
    hashed_password: str
    is_admin: bool
    failed_login_attempts: int
    locked_until: Optional[datetime]

class Token(BaseModel):
    """Schema for JWT tokens"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Optional[dict] = None

class TokenData(BaseModel):
    """Schema for token data"""
    username: Optional[str] = None
    user_id: Optional[int] = None

class PasswordChange(BaseModel):
    """Schema for password change"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_new_password(cls, v):
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError('Password must contain uppercase, lowercase, digit, and special character')
        
        return v

class UserUpdate(BaseModel):
    """Schema for user updates"""
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None