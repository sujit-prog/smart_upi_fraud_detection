from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import logging
from datetime import datetime
import os
from contextlib import asynccontextmanager

from app.api.routes import fraud_detection, transactions, auth, analytics
from app.core.config import settings
from app.core.database import init_db
from app.services.model_loader import ModelService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model service instance
model_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    global model_service
    
    # Startup
    logger.info("Starting UPI Fraud Detection API...")
    
    # Initialize database
    await init_db()
    
    # Load ML models
    model_service = ModelService()
    await model_service.load_models()
    
    # Store model service in app state
    app.state.model_service = model_service
    
    logger.info("API startup complete!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down API...")

# Create FastAPI application
app = FastAPI(
    title="UPI Fraud Detection API",
    description="Real-time fraud detection system for UPI transactions",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Include API routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(fraud_detection.router, prefix="/api/v1/fraud", tags=["Fraud Detection"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )