from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from app.api.routes import fraud_detection, transactions, auth, analytics
from app.core.config import settings
from app.core.database import init_db
from app.services.model_loader import ModelService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model_service

    logger.info("Starting UPI Fraud Detection API...")

    # Initialize database
    await init_db()

    # Load ML models
    model_service = ModelService()
    await model_service.load_models()

    app.state.model_service = model_service

    logger.info("API startup complete!")
    yield
    logger.info("Shutting down API...")

app = FastAPI(
    title="UPI Fraud Detection API",
    description="Real-time fraud detection system for UPI transactions",
    version="1.0.0",
    lifespan=lifespan,
)

# Either use settings.ALLOWED_ORIGINS or define directly here:
# e.g. in settings: ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000", ...]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # or a hardcoded list during dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(fraud_detection.router, prefix="/api/v1/fraud", tags=["Fraud Detection"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
