import asyncio
from datetime import datetime, timedelta
import random

from app.core.database import SessionLocal, Base, engine, User, Transaction
from app.core.auth import get_password_hash

def seed():
    print("Initial Tables:", Base.metadata.tables.keys())
    print("Dropping outdated Database tables...")
    Base.metadata.drop_all(bind=engine)
    print("Initializing Database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        try:
            user = db.query(User).filter(User.username == "testuser").first()
        except Exception as e:
            import traceback
            with open("error_trace.txt", "w") as f:
                f.write(traceback.format_exc())
            raise e
        if not user:
            print("Creating testuser...")
            user = User(
                username="testuser",
                email="testuser@example.com",
                hashed_password=get_password_hash("Password123!")
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            print("testuser already exists.")
            
        # Check if there are already transactions
        tx_count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
        if tx_count == 0:
            print("Seeding 15 transactions...")
            transactions = []
            now = datetime.utcnow()
            
            names = ['Zomato', 'Amazon', 'Airtel', 'Uber', 'Local Grocery', 'Rahul', 'Priya', 'Gym']
            upis = ['zomato@upi', 'amazon@paytm', 'airtel@sbi', 'uber@hdfc', 'grocery@icici', 'rahul@upi', 'priya@okaxis', 'gym@upi']
            types = ['P2M', 'P2M', 'BILL_PAYMENT', 'P2M', 'P2M', 'P2P', 'P2P', 'P2M']
            
            for i in range(15):
                idx = random.randint(0, len(names)-1)
                is_fraud = random.random() < 0.1  # 10% chance of fraud
                
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
            print("Transactions seeded successfully!")
        else:
            print(f"User already has {tx_count} transactions.")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
