# app/services/fraud_detector.py
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging
import asyncio

from ..core.config import settings

logger = logging.getLogger(__name__)

class FraudDetectionService:
    def __init__(self, model_service):
        self.model_service = model_service
        self.fraud_threshold = settings.FRAUD_THRESHOLD
        
    async def detect_fraud(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main fraud detection method
        """
        try:
            # Extract and engineer features
            features = await self._extract_features(transaction_data)
            
            # Get model predictions
            predictions = await self._get_model_predictions(features)
            
            # Apply business rules
            rule_results = await self._apply_business_rules(transaction_data, features)
            
            # Combine predictions and rules
            final_result = await self._combine_results(predictions, rule_results, transaction_data)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Error in fraud detection: {str(e)}")
            return {
                "fraud_score": 0.0,
                "is_fraudulent": False,
                "risk_level": "LOW",
                "confidence": 0.0,
                "reason": f"Error in detection: {str(e)}",
                "features_analyzed": [],
                "recommendation": "MANUAL_REVIEW"
            }
    
    async def _extract_features(self, transaction_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract and engineer features for fraud detection
        """
        features = {}
        
        # Basic transaction features
        features['amount'] = float(transaction_data.get('amount', 0))
        features['amount_log'] = np.log1p(features['amount'])
        
        # Time-based features
        tx_time = transaction_data.get('transaction_time', datetime.utcnow())
        if isinstance(tx_time, str):
            tx_time = datetime.fromisoformat(tx_time.replace('Z', '+00:00'))
        
        features['hour'] = tx_time.hour
        features['day_of_week'] = tx_time.weekday()
        features['is_weekend'] = 1 if tx_time.weekday() >= 5 else 0
        features['is_night'] = 1 if tx_time.hour < 6 or tx_time.hour > 22 else 0
        
        # Transaction type encoding
        tx_type = transaction_data.get('transaction_type', 'P2P')
        features['is_p2p'] = 1 if tx_type == 'P2P' else 0
        features['is_p2m'] = 1 if tx_type == 'P2M' else 0
        features['is_bill_payment'] = 1 if tx_type == 'BILL_PAYMENT' else 0
        
        # Account features
        sender_account = transaction_data.get('sender_account', '')
        receiver_account = transaction_data.get('receiver_account', '')
        
        features['same_account'] = 1 if sender_account == receiver_account else 0
        features['sender_length'] = len(sender_account)
        features['receiver_length'] = len(receiver_account)
        
        # Device and location features
        features['has_device_id'] = 1 if transaction_data.get('device_id') else 0
        features['has_location'] = 1 if transaction_data.get('location') else 0
        
        return features
    
    async def _get_model_predictions(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Get predictions from the fraud detection model
        """
        try:
            model_input = np.array(list(features.values())).reshape(1, -1)
            prediction = await self.model_service.predict(model_input)
            
            return {
                "fraud_score": float(prediction[0]),
                "is_fraudulent": prediction[0] >= self.fraud_threshold,
                "risk_level": self._determine_risk_level(prediction[0]),
                "confidence": 1.0,  # Placeholder for model confidence
                "reason": "Model prediction",
                "features_analyzed": list(features.keys()),
                "recommendation": "MANUAL_REVIEW" if prediction[0] >= self.fraud_threshold else "AUTO_APPROVE"
            }
        
        except Exception as e:
            logger.error(f"Error in model prediction: {str(e)}")
            return {
                "fraud_score": 0.0,
                "is_fraudulent": False,
                "risk_level": "LOW",
                "confidence": 0.0,
                "reason": f"Error in prediction: {str(e)}",
                "features_analyzed": [],
                "recommendation": "MANUAL_REVIEW"
            }
    
    def _determine_risk_level(self, fraud_score: float) -> str:
        """
        Determine the risk level based on the fraud score
        """
        if fraud_score >= 0.8:
            return "HIGH"
        elif fraud_score >= 0.5:
            return "MEDIUM"
        else:
            return "LOW"
    
    async def _apply_business_rules(self, transaction_data: Dict[str, Any], features: Dict[str, float]) -> Dict[str, Any]:
        """
        Apply business rules for fraud detection
        """
        rules_results = {}
        
        # Rule 1: Amount limit
        if features['amount'] > settings.AMOUNT_LIMIT:
            rules_results['amount_limit'] = {
                "is_violation": True,
                "reason": "Amount exceeds limit",
                "recommendation": "MANUAL_REVIEW"
            }
        else:
            rules_results['amount_limit'] = {
                "is_violation": False
            }
        
        # Rule 2: Time-based rule (e.g., no transactions between 2 AM and 6 AM)
        if features['is_night']:
            rules_results['time_based_rule'] = {
                "is_violation": True,
                "reason": "Transaction made during restricted hours",
                "recommendation": "MANUAL_REVIEW"
            }
        else:
            rules_results['time_based_rule'] = {
                "is_violation": False
            }
        
        # Additional business rules can be added here
        
        return rules_results
    
    async def _combine_results(self, predictions: Dict[str, Any], rules_results: Dict[str, Any], transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combine model predictions and business rules results
        """
        final_result = {
            "fraud_score": predictions["fraud_score"],
            "is_fraudulent": predictions["is_fraudulent"],
            "risk_level": predictions["risk_level"],
            "confidence": predictions["confidence"],
            "reason": predictions["reason"],
            "features_analyzed": predictions["features_analyzed"],
            "recommendation": predictions["recommendation"],
            "rules_violated": []
        }
        
        # Check for rule violations
        for rule, result in rules_results.items():
            if result.get("is_violation", False):
                final_result["rules_violated"].append({
                    "rule": rule,
                    "reason": result.get("reason", ""),
                    "recommendation": result.get("recommendation", "")
                })
        
        # Final recommendation based on rules and model
        if final_result["is_fraudulent"] or len(final_result["rules_violated"]) > 0:
            final_result["recommendation"] = "MANUAL_REVIEW"
        else:
            final_result["recommendation"] = "AUTO_APPROVE"
        
        return final_result