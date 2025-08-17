# scripts/setup_database.py
"""
Database setup script for UPI Fraud Detection system
This script initializes the database and creates sample data
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from backend.app.core.database import engine, Base, SessionLocal, create_user
from backend.app.core.auth import get_password_hash
from backend.app.core.database import Transaction, FraudAlert
from datetime import datetime, timedelta
import random
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Error creating tables: {e}")
        return False

def create_admin_user():
    """Create default admin user"""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        from backend.app.core.database import get_user_by_username
        admin_user = get_user_by_username(db, "admin")
        
        if not admin_user:
            hashed_password = get_password_hash("admin123")
            admin_user = create_user(
                db=db,
                username="admin",
                email="admin@frauddetection.com",
                hashed_password=hashed_password
            )
            
            # Make user admin
            admin_user.is_admin = True
            db.commit()
            
            logger.info("✅ Admin user created (username: admin, password: admin123)")
        else:
            logger.info("ℹ️  Admin user already exists")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating admin user: {e}")
        return False
    finally:
        db.close()

def create_test_user():
    """Create test user for development"""
    db = SessionLocal()
    try:
        from backend.app.core.database import get_user_by_username
        test_user = get_user_by_username(db, "testuser")
        
        if not test_user:
            hashed_password = get_password_hash("testpass123")
            test_user = create_user(
                db=db,
                username="testuser",
                email="test@example.com",
                hashed_password=hashed_password
            )
            logger.info("✅ Test user created (username: testuser, password: testpass123)")
        else:
            logger.info("ℹ️  Test user already exists")
        
        return test_user.id
        
    except Exception as e:
        logger.error(f"❌ Error creating test user: {e}")
        return None
    finally:
        db.close()

def create_sample_transactions(user_id, num_transactions=50):
    """Create sample transactions for testing"""
    if not user_id:
        return False
        
    db = SessionLocal()
    try:
        transaction_types = ["P2P", "P2M", "BILL_PAYMENT", "RECHARGE"]
        
        for i in range(num_transactions):
            # Generate random transaction data
            amount = random.uniform(100, 50000)
            transaction_type = random.choice(transaction_types)
            
            # Make some transactions fraudulent for testing
            is_fraudulent = random.random() < 0.1  # 10% fraud rate
            fraud_score = random.uniform(0.7, 0.95) if is_fraudulent else random.uniform(0.0, 0.4)
            
            # Random transaction time within last 30 days
            days_ago = random.randint(0, 30)
            hours_ago = random.randint(0, 23)
            transaction_time = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago)
            
            transaction_data = {
                "user_id": user_id,
                "transaction_id": f"TXN{datetime.now().strftime('%Y%m%d')}{i:04d}",
                "amount": round(amount, 2),
                "sender_account": f"user{i}@paytm",
                "receiver_account": f"merchant{random.randint(1,10)}@paytm" if transaction_type == "P2M" else f"user{random.randint(100,999)}@paytm",
                "transaction_type": transaction_type,
                "fraud_score": round(fraud_score, 4),
                "is_fraudulent": is_fraudulent,
                "fraud_reason": "High risk transaction detected" if is_fraudulent else "",
                "transaction_time": transaction_time,
                "device_id": f"DEVICE{random.randint(1000,9999)}",
                "ip_address": f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
                "location": random.choice(["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"])
            }
            
            from backend.app.core.database import create_transaction
            transaction = create_transaction(db, transaction_data)
            
            # Create fraud alert for fraudulent transactions
            if is_fraudulent:
                alert_data = {
                    "transaction_id": transaction.id,
                    "alert_type": "FRAUD_DETECTED",
                    "severity": random.choice(["HIGH", "CRITICAL"]),
                    "description": f"Suspicious transaction of ₹{amount:.2f} detected",
                    "status": "ACTIVE"
                }
                from backend.app.core.database import create_fraud_alert
                create_fraud_alert(db, alert_data)
        
        logger.info(f"✅ Created {num_transactions} sample transactions")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating sample transactions: {e}")
        return False
    finally:
        db.close()

def main():
    """Main setup function"""
    print("=" * 60)
    print("UPI FRAUD DETECTION - DATABASE SETUP")
    print("=" * 60)
    
    # Step 1: Create tables
    print("Step 1: Creating database tables...")
    if not create_tables():
        print("❌ Failed to create tables. Exiting.")
        return
    
    # Step 2: Create admin user
    print("\nStep 2: Creating admin user...")
    if not create_admin_user():
        print("❌ Failed to create admin user. Exiting.")
        return
    
    # Step 3: Create test user
    print("\nStep 3: Creating test user...")
    test_user_id = create_test_user()
    
    # Step 4: Create sample data
    if test_user_id:
        print("\nStep 4: Creating sample transactions...")
        if create_sample_transactions(test_user_id):
            print("✅ Sample data created successfully")
        else:
            print("⚠️  Failed to create sample data")
    
    print("\n" + "=" * 60)
    print("DATABASE SETUP COMPLETED!")
    print("=" * 60)
    print("\n📋 Quick Start:")
    print("1. Start the API: cd backend && python main.py")
    print("2. Visit: http://localhost:8000/docs")
    print("3. Login with:")
    print("   - Username: testuser")
    print("   - Password: testpass123")
    print("4. Or use admin account:")
    print("   - Username: admin")
    print("   - Password: admin123")
    print("\n🧪 Test the API:")
    print("   python backend/test_api.py")

if __name__ == "__main__":
    main()