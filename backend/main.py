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

@app.post("/seed")
async def seed_data():
    from app.core.database import SessionLocal, User, Transaction
    from app.core.auth import get_password_hash
    import random
    from datetime import timedelta
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "testuser").first()
        if not user:
            user = User(
                username="testuser",
                email="testuser@example.com",
                hashed_password=get_password_hash("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        if tx_count == 0:
            transactions = []
            now = datetime.utcnow()
            names = ['Zomato', 'Amazon', 'Airtel', 'Uber', 'Local Grocery', 'Rahul', 'Priya', 'Gym']
            upis = ['zomato@upi', 'amazon@paytm', 'airtel@sbi', 'uber@hdfc', 'grocery@icici', 'rahul@upi', 'priya@okaxis', 'gym@upi']
            types = ['P2M', 'P2M', 'BILL_PAYMENT', 'P2M', 'P2M', 'P2P', 'P2P', 'P2M']
            for i in range(15):
                idx = random.randint(0, len(names)-1)
                is_fraud = random.random() < 0.1
                amount = random.randint(50, 2000)
                if is_fraud:
                    amount = random.randint(15000, 50000)
                days_ago = random.randint(0, 14)
                tx_date = now - timedelta(days=days_ago, hours=random.randint(0, 23))
                tx = Transaction(
                    user_id=user.id,
                    transaction_id=f"TXN-{random.randint(1000000, 9999999)}",
                    amount=amount,
                    sender_account=f"testuser@bank",
                    receiver_account=upis[idx],
                    transaction_type=types[idx],
                    fraud_score=random.uniform(0.7, 0.99) if is_fraud else random.uniform(0.01, 0.2),
                    is_fraudulent=is_fraud,
                    fraud_reason="Suspicious high amount" if is_fraud else None,
                    transaction_time=tx_date
                )
                transactions.append(tx)
            db.add_all(transactions)
            db.commit()
            return {"message": "Database seeded successfully!"}
        return {"message": "Database already seeded."}
    finally:
        db.close()

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
