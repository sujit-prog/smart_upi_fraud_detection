# main.py
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import uvicorn
import logging
from datetime import datetime
import os
from contextlib import asynccontextmanager
import signal
import sys

from app.api.routes import fraud_detection, transactions, auth, analytics
from app.core.config import settings
from app.core.database import init_db
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware, RateLimitMiddleware
from app.core.exceptions import (
    FraudDetectionException,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    fraud_detection_exception_handler,
    general_exception_handler
)
from app.services.model_loader import ModelService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/app.log') if os.path.exists('logs') else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global model service instance
model_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler with proper startup and shutdown"""
    global model_service
    
    # Startup
    logger.info("🚀 Starting UPI Fraud Detection API...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    try:
        # Initialize database
        await init_db()
        logger.info("✅ Database initialized")
        
        # Load ML models
        model_service = ModelService()
        await model_service.load_models()
        
        # Store model service in app state
        app.state.model_service = model_service
        logger.info("✅ ML models loaded")
        
        # Validate system health
        health_check = model_service.validate_model_health()
        if not health_check["healthy"]:
            logger.warning(f"⚠️  System health issues: {health_check['issues']}")
        else:
            logger.info("✅ System health check passed")
        
        logger.info("🎉 API startup complete!")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down API...")
    
    try:
        # Cleanup resources
        if model_service:
            # Save any pending model metrics or cleanup
            pass
        
        logger.info("✅ Graceful shutdown complete")
        
    except Exception as e:
        logger.error(f"❌ Shutdown error: {e}")

# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-time fraud detection system for UPI transactions with advanced ML models and business rules",
    version=settings.VERSION,
    lifespan=lifespan,
    debug=settings.DEBUG
)

# Add middleware (order matters!)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, calls_per_minute=settings.RATE_LIMIT_PER_MINUTE)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"]
)

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(FraudDetectionException, fraud_detection_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check including dependencies"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "components": {}
    }
    
    try:
        # Check database
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            db.execute("SELECT 1")
            health_status["components"]["database"] = "healthy"
        except Exception as e:
            health_status["components"]["database"] = f"unhealthy: {str(e)}"
            health_status["status"] = "degraded"
        finally:
            db.close()
        
        # Check model service
        if hasattr(app.state, 'model_service') and app.state.model_service:
            model_health = app.state.model_service.validate_model_health()
            health_status["components"]["ml_models"] = "healthy" if model_health["healthy"] else f"degraded: {model_health['issues']}"
        else:
            health_status["components"]["ml_models"] = "unavailable"
            health_status["status"] = "degraded"
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        health_status["status"] = "unhealthy"
        health_status["error"] = str(e)
    
    return health_status

# Include API routes
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(fraud_detection.router, prefix=f"{settings.API_V1_STR}/fraud", tags=["Fraud Detection"])
app.include_router(transactions.router, prefix=f"{settings.API_V1_STR}/transactions", tags=["Transactions"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])

# Root endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "UPI Fraud Detection API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": "/health"
    }

# Graceful shutdown handler
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("logs", exist_ok=True)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=settings.ENABLE_REQUEST_LOGGING
    )