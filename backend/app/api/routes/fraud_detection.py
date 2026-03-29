from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime
import pandas as pd
import numpy as np

router = APIRouter()

class AnalyzeUPIRequest(BaseModel):
    upi_id: str

def random_int(min_val, max_val):
    return int(np.random.randint(min_val, max_val + 1))

@router.post("/analyze-upi")
async def analyze_upi(request: AnalyzeUPIRequest, api_request: Request):
    """
    Uses the real ML model to predict fraud for recent transactions.
    """
    upi_id = request.upi_id
    model_service = api_request.app.state.model_service

    if "@" not in upi_id:
        return []

    # 1. Generate recent transactions (since we don't have a real DB yet)
    transactions = []
    features_list = []
    
    today = datetime.now()
    beneficiaries = ["merchant", "P2P", "recharge", "bill_payment"]
    devices = ["Android", "iOS", "Web"]
    categories = ["grocery", "utilities", "electronics", "entertainment", "travel", "others"]
    
    num_txns = 20
    is_high_risk_user = "scammer" in upi_id.lower()

    for i in range(num_txns):
        # Generate raw data
        days_ago = random_int(0, 30)
        txn_date = today - pd.Timedelta(days=days_ago)
        hour = txn_date.hour if not is_high_risk_user else random_int(1, 4)  # scammers operate late
        
        amount = random_int(50, 25000)
        if is_high_risk_user and i < 5:
             amount = random_int(50000, 150000)
             
        txn_type = beneficiaries[random_int(0, len(beneficiaries) - 1)]
        device = devices[random_int(0, len(devices) - 1)]
        category = categories[random_int(0, len(categories) - 1)]
        is_foreign = 1 if is_high_risk_user and random_int(0, 10) > 8 else 0
        txns_last_24h = random_int(0, 5) if not is_high_risk_user else random_int(5, 15)
        
        # Build features for ML model
        feature_dict = {
            'transaction_amount': amount,
            'transaction_type': txn_type,
            'device_type': device,
            'merchant_category': category,
            'hour': hour,
            'transactions_last_24h': txns_last_24h,
            'is_foreign': is_foreign
        }
        features_list.append(feature_dict)
        
        # Build raw transaction for Frontend UI
        transactions.append({
            "id": f"TXN{random_int(100000, 999999)}-{i}",
            "date": txn_date.strftime("%Y-%m-%d"),
            "time": txn_date.strftime("%H:%M:%S")[:5],
            "amount": amount,
            "type": "Debit" if random_int(0, 1) == 0 else "Credit",
            "beneficiary": f"{category}_vendor@{txn_type}",
            "isNewBeneficiary": is_foreign == 1 or amount > 50000,
            "isLateNight": hour >= 23 or hour <= 5,
        })
        
    # 2. ML Prediction
    if model_service and model_service.primary_model:
        df_features = pd.DataFrame(features_list)
        # Use Pipeline handle preprocessing automatically
        probas = model_service.primary_model.predict_proba(df_features)[:, 1]
    else:
        # Fallback if model failed to load
        probas = [0.05] * num_txns

    # 3. Format Response for Frontend
    for i, txn in enumerate(transactions):
        # Scale probability to 0-100 score
        score = int(probas[i] * 100)
        # Add risk rules for UI
        factors = []
        if txn["amount"] > 15000: factors.append("Large Amount (High)")
        elif txn["amount"] > 5000: factors.append("Large Amount (Medium)")
        if txn["isNewBeneficiary"]: factors.append("New/Untrusted Beneficiary")
        if txn["isLateNight"]: factors.append("Unusual Transaction Time (Late Night)")
        
        if score > 65:
            level = "High"
            colorClass = "badge badge-high"
        elif score > 30:
            level = "Medium"
            colorClass = "badge badge-medium"
        else:
            level = "Low"
            colorClass = "badge badge-low"
            
        txn["risk"] = {
            "score": score,
            "level": level,
            "colorClass": colorClass,
            "factors": ", ".join(factors) if factors else "Standard Behavior"
        }

    # Sort descending by date/time
    transactions.sort(key=lambda x: x["date"] + x["time"], reverse=True)
    return transactions
