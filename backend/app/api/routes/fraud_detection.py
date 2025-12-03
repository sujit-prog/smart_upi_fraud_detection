from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter()

class AnalyzeUPIRequest(BaseModel):
    upi_id: str

class TransactionOut(BaseModel):
    id: int
    amount: float
    destination: str
    timestamp: float
    type: str
    risk_score: int
    risk_level: str

@router.post("/analyze-upi", response_model=List[TransactionOut])
async def analyze_upi(request: AnalyzeUPIRequest):
    """
    Simple mock endpoint for now.
    Later you can replace with real DB + ML logic.
    """
    upi_id = request.upi_id

    if "@" not in upi_id:
        return []

    is_high_risk_user = "scammer" in upi_id.lower()
    now = datetime.utcnow().timestamp() * 1000  # ms

    transactions = [
        {
            "id": 101,
            "amount": 45000 if is_high_risk_user else 250,
            "destination": "groceries_vendor@okicici",
            "timestamp": now - 3600000,
            "type": "DEBIT",
        },
        {
            "id": 102,
            "amount": 50 if is_high_risk_user else 15000,
            "destination": "loan_repay_agent@ybl",
            "timestamp": now - 7200000,
            "type": "DEBIT",
        },
        {
            "id": 103,
            "amount": 500,
            "destination": "friend_upi@axisbank",
            "timestamp": now - 10800000,
            "type": "CREDIT",
        },
        {
            "id": 104,
            "amount": 99999 if is_high_risk_user else 5000,
            "destination": "unknown_wallet@paytm",
            "timestamp": now - 86400000,
            "type": "DEBIT",
        },
    ]

    def calc_risk(t):
        score = 0
        if t["amount"] > 10000:
            score += 40
        elif t["amount"] > 5000:
            score += 20

        if "unknown_wallet" in t["destination"]:
            score += 30

        hours_ago = (now - t["timestamp"]) / 3600000
        if t["amount"] > 5000 and hours_ago < 2:
            score += 30

        if "scammer" in t["destination"].lower():
            score = 95

        score = min(100, score)

        if score >= 70:
            level = "HIGH"
        elif score >= 40:
            level = "MEDIUM"
        else:
            level = "LOW"

        t["risk_score"] = score
        t["risk_level"] = level
        return t

    return [calc_risk(t) for t in transactions]
