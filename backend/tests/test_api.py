from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
def test_health():
    assert True


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_fraud_check():
    payload = {
        "user_id": 1,
        "amount": 75000,
        "merchant_id": "SUSPECT_M1",
        "location": "BLR",
        "device_id": "dev-123",
        "txn_type": "P2M"
    }
    res = client.post("/api/v1/fraud/check", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "risk_score" in data
    assert data["is_fraudulent"] is True
