# app/core/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "UPI Fraud Detection API"
    database_url: str = "sqlite:///./test.db"
    secret_key: str = "your-secret-key"
    # CORS Settings
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # Database Settings
    DATABASE_URL: str = "sqlite:///./fraud_detection.db"
    POSTGRES_SERVER: Optional[str] = None
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    
    # JWT Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    ALGORITHM: str = "HS256"
    
    # ML Model Settings
    MODEL_PATH: str = "models/"
    FRAUD_THRESHOLD: float = 0.5
    
    # Redis Settings (for caching)
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security Settings
    PASSWORD_MIN_LENGTH: int = 8
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    
    # Monitoring Settings
    LOG_LEVEL: str = "INFO"
    ENABLE_METRICS: bool = True
    
    DEBUG: bool = False   # Add this
    RELOAD: bool = False  # Add this
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Environment-specific configurations
def get_database_url() -> str:
    if settings.POSTGRES_SERVER:
        return f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}/{settings.POSTGRES_DB}"
    return settings.DATABASE_URL