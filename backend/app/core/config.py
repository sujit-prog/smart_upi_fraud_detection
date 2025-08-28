# app/core/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path
import secrets

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "UPI Fraud Detection API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    RELOAD: bool = False
    
    # Environment
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:3000"]
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./fraud_detection.db"
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    
    # JWT Settings - Generate secure defaults
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"
    
    # ML Model Settings
    MODEL_PATH: str = "models/"
    FRAUD_THRESHOLD: float = 0.5
    AMOUNT_LIMIT: float = 200000.0  # UPI transaction limit
    
    # Redis Settings (for caching)
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_ENABLED: bool = False
    
    # Security Settings
    PASSWORD_MIN_LENGTH: int = 8
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    BATCH_SIZE_LIMIT: int = 100
    
    # Monitoring Settings
    LOG_LEVEL: str = "INFO"
    ENABLE_METRICS: bool = True
    ENABLE_REQUEST_LOGGING: bool = True
    
    # API Limits
    MAX_TRANSACTIONS_PER_REQUEST: int = 1000
    MAX_DAYS_ANALYTICS: int = 365
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_settings()
    
    def _validate_settings(self):
        """Validate critical settings"""
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY == "your-secret-key-change-in-production":
                raise ValueError("SECRET_KEY must be changed in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production")
        
        if not Path(self.MODEL_PATH).exists():
            os.makedirs(self.MODEL_PATH, exist_ok=True)

def get_database_url() -> str:
    """Get the appropriate database URL based on environment"""
    settings_instance = Settings()
    
    if settings_instance.POSTGRES_SERVER:
        return f"postgresql://{settings_instance.POSTGRES_USER}:{settings_instance.POSTGRES_PASSWORD}@{settings_instance.POSTGRES_SERVER}/{settings_instance.POSTGRES_DB}"
    return settings_instance.DATABASE_URL

# Create settings instance
settings = Settings()