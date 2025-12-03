# app/services/fraud_detector.py
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
import asyncio

from ..core.config import settings
from ..core.exceptions import FraudDetectionException, ModelLoadException

logger = logging.getLogger(__name__)

class FraudDetectionService:
    def __init__(self, model_service):
        self.model_service = model_service
        self.fraud_threshold = settings.FRAUD_THRESHOLD
        
    async def detect_fraud(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main fraud detection method with comprehensive error handling
        """
        try:
            # Validate input data
            self._validate_transaction_data(transaction_data)
            
            # Extract and engineer features
            features = await self._extract_features(transaction_data)
            
            # Get model predictions
            predictions = await self._get_model_predictions(features)
            
            # Apply business rules
            rule_results = await self._apply_business_rules(transaction_data, features)
            
            # Combine predictions and rules
            final_result = await self._combine_results(predictions, rule_results, transaction_data)
            
            # Log detection result
            logger.info(
                f"Fraud detection completed for transaction {transaction_data.get('transaction_id')}: "
                f"Score={final_result['fraud_score']:.4f}, Fraudulent={final_result['is_fraudulent']}"
            )
            
            return final_result
            
        except Exception as e:
            logger.error(f"Error in fraud detection: {str(e)}")
            # Return safe default response
            return {
                "fraud_score": 0.0,
                "is_fraudulent": False,
                "risk_level": "UNKNOWN",
                "confidence": 0.0,
                "reason": f"Detection error: {str(e)}",
                "features_analyzed": [],
                "recommendation": "MANUAL_REVIEW",
                "error": True
            }
    
    def _validate_transaction_data(self, data: Dict[str, Any]):
        """Validate transaction data"""
        required_fields = ['amount', 'sender_account', 'receiver_account', 'transaction_type']
        
        for field in required_fields:
            if field not in data or data[field] is None:
                raise FraudDetectionException(f"Missing required field: {field}")
        
        # Validate amount
        amount = data.get('amount', 0)
        if not isinstance(amount, (int, float)) or amount <= 0:
            raise FraudDetectionException("Amount must be a positive number")
        
        if amount > settings.AMOUNT_LIMIT:
            raise FraudDetectionException(f"Amount exceeds limit of ₹{settings.AMOUNT_LIMIT}")
        
        # Validate transaction type
        valid_types = ['P2P', 'P2M', 'M2P', 'BILL_PAYMENT', 'RECHARGE']
        if data.get('transaction_type') not in valid_types:
            raise FraudDetectionException(f"Invalid transaction type. Must be one of: {valid_types}")
    
    async def _extract_features(self, transaction_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Extract and engineer features for fraud detection with error handling
        """
        try:
            features = {}
            
            # Basic transaction features
            amount = float(transaction_data.get('amount', 0))
            features['amount'] = amount
            features['amount_log'] = np.log1p(amount)
            features['amount_normalized'] = min(amount / 100000, 1.0)  # Normalize to 0-1
            
            # Time-based features
            tx_time = transaction_data.get('transaction_time')
            if tx_time is None:
                tx_time = datetime.utcnow()
            elif isinstance(tx_time, str):
                try:
                    tx_time = datetime.fromisoformat(tx_time.replace('Z', '+00:00'))
                except ValueError:
                    tx_time = datetime.utcnow()
            
            features['hour'] = float(tx_time.hour)
            features['day_of_week'] = float(tx_time.weekday())
            features['is_weekend'] = 1.0 if tx_time.weekday() >= 5 else 0.0
            features['is_night'] = 1.0 if tx_time.hour < 6 or tx_time.hour > 22 else 0.0
            features['is_business_hours'] = 1.0 if 9 <= tx_time.hour <= 17 else 0.0
            
            # Transaction type encoding
            tx_type = transaction_data.get('transaction_type', 'P2P')
            features['is_p2p'] = 1.0 if tx_type == 'P2P' else 0.0
            features['is_p2m'] = 1.0 if tx_type == 'P2M' else 0.0
            features['is_m2p'] = 1.0 if tx_type == 'M2P' else 0.0
            features['is_bill_payment'] = 1.0 if tx_type == 'BILL_PAYMENT' else 0.0
            features['is_recharge'] = 1.0 if tx_type == 'RECHARGE' else 0.0
            
            # Account features
            sender_account = str(transaction_data.get('sender_account', ''))
            receiver_account = str(transaction_data.get('receiver_account', ''))
            
            features['same_account'] = 1.0 if sender_account == receiver_account else 0.0
            features['sender_length'] = float(len(sender_account))
            features['receiver_length'] = float(len(receiver_account))
            features['account_length_diff'] = abs(len(sender_account) - len(receiver_account))
            
            # Device and location features
            features['has_device_id'] = 1.0 if transaction_data.get('device_id') else 0.0
            features['has_location'] = 1.0 if transaction_data.get('location') else 0.0
            features['has_ip_address'] = 1.0 if transaction_data.get('ip_address') else 0.0
            
            # Behavioral features (if provided)
            features['user_age_days'] = float(transaction_data.get('user_age_days', 0))
            features['recent_transaction_count'] = float(transaction_data.get('recent_transaction_count', 0))
            features['daily_transaction_amount'] = float(transaction_data.get('daily_transaction_amount', 0))
            
            # Risk indicators
            features['high_amount'] = 1.0 if amount > 50000 else 0.0
            features['round_amount'] = 1.0 if amount % 1000 == 0 else 0.0
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            raise FraudDetectionException(f"Feature extraction failed: {str(e)}")
    
    async def _get_model_predictions(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Get predictions from the fraud detection model with fallback
        """
        try:
            if not self.model_service or not self.model_service.primary_model:
                logger.warning("No model available, using rule-based fallback")
                return self._fallback_prediction(features)
            
            # Prepare model input
            model_input = self.model_service.preprocess_features(features)
            if model_input is None:
                raise ModelLoadException("Failed to preprocess features")
            
            # Get prediction
            if hasattr(self.model_service.primary_model, 'predict_proba'):
                prediction_proba = self.model_service.primary_model.predict_proba(model_input)
                fraud_score = float(prediction_proba[0][1])  # Probability of fraud class
            else:
                prediction = self.model_service.primary_model.predict(model_input)
                fraud_score = float(prediction[0])
            
            # Ensemble prediction if available
            if self.model_service.ensemble_models:
                ensemble_scores = []
                for model in self.model_service.ensemble_models:
                    try:
                        if hasattr(model, 'predict_proba'):
                            score = model.predict_proba(model_input)[0][1]
                        else:
                            score = model.predict(model_input)[0]
                        ensemble_scores.append(float(score))
                    except Exception as e:
                        logger.warning(f"Ensemble model failed: {e}")
                
                if ensemble_scores:
                    # Average ensemble predictions
                    fraud_score = (fraud_score + np.mean(ensemble_scores)) / 2
            
            # Ensure score is in valid range
            fraud_score = max(0.0, min(1.0, fraud_score))
            
            return {
                "fraud_score": fraud_score,
                "is_fraudulent": fraud_score >= self.fraud_threshold,
                "risk_level": self._determine_risk_level(fraud_score),
                "confidence": self._calculate_confidence(fraud_score),
                "reason": self._generate_reason(fraud_score, features),
                "features_analyzed": list(features.keys()),
                "recommendation": "BLOCK" if fraud_score >= 0.8 else "MANUAL_REVIEW" if fraud_score >= self.fraud_threshold else "APPROVE"
            }
        
        except ModelLoadException:
            raise
        except Exception as e:
            logger.error(f"Error in model prediction: {str(e)}")
            return self._fallback_prediction(features)
    
    def _fallback_prediction(self, features: Dict[str, float]) -> Dict[str, Any]:
        """Fallback rule-based prediction when model is unavailable"""
        score = 0.0
        reasons = []
        
        # Simple rule-based scoring
        if features.get('amount', 0) > 100000:
            score += 0.3
            reasons.append("High amount transaction")
        
        if features.get('is_night', 0) == 1:
            score += 0.2
            reasons.append("Night time transaction")
        
        if features.get('same_account', 0) == 1:
            score += 0.4
            reasons.append("Same sender and receiver account")
        
        if features.get('round_amount', 0) == 1:
            score += 0.1
            reasons.append("Round amount")
        
        score = min(score, 1.0)
        
        return {
            "fraud_score": score,
            "is_fraudulent": score >= self.fraud_threshold,
            "risk_level": self._determine_risk_level(score),
            "confidence": 0.6,  # Lower confidence for rule-based
            "reason": "; ".join(reasons) if reasons else "Rule-based assessment",
            "features_analyzed": list(features.keys()),
            "recommendation": "MANUAL_REVIEW" if score >= self.fraud_threshold else "APPROVE"
        }
    
    def _determine_risk_level(self, fraud_score: float) -> str:
        """Determine risk level based on fraud score"""
        if fraud_score >= 0.8:
            return "CRITICAL"
        elif fraud_score >= 0.6:
            return "HIGH"
        elif fraud_score >= 0.3:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _calculate_confidence(self, fraud_score: float) -> float:
        """Calculate model confidence"""
        # Higher confidence for scores closer to 0 or 1
        distance_from_center = abs(fraud_score - 0.5)
        confidence = 0.5 + distance_from_center
        return min(confidence, 1.0)
    
    def _generate_reason(self, fraud_score: float, features: Dict[str, float]) -> str:
        """Generate human-readable reason for the decision"""
        if fraud_score < 0.3:
            return "Transaction appears normal"
        
        reasons = []
        
        if features.get('amount', 0) > 50000:
            reasons.append("high transaction amount")
        if features.get('is_night', 0) == 1:
            reasons.append("unusual transaction time")
        if features.get('same_account', 0) == 1:
            reasons.append("same sender and receiver")
        if features.get('round_amount', 0) == 1:
            reasons.append("round amount pattern")
        if features.get('is_weekend', 0) == 1 and features.get('amount', 0) > 25000:
            reasons.append("high weekend transaction")
        
        if reasons:
            return f"Suspicious patterns detected: {', '.join(reasons)}"
        else:
            return f"Model detected suspicious patterns (score: {fraud_score:.3f})"
    
    async def _apply_business_rules(self, transaction_data: Dict[str, Any], features: Dict[str, float]) -> Dict[str, Any]:
        """
        Apply business rules for fraud detection
        """
        rules_results = {}
        
        try:
            # Rule 1: Amount limit check
            amount = features.get('amount', 0)
            if amount > settings.AMOUNT_LIMIT:
                rules_results['amount_limit'] = {
                    "is_violation": True,
                    "severity": "CRITICAL",
                    "reason": f"Amount ₹{amount} exceeds UPI limit of ₹{settings.AMOUNT_LIMIT}",
                    "recommendation": "BLOCK"
                }
            
            # Rule 2: Time-based restrictions
            if features.get('is_night', 0) == 1 and amount > 50000:
                rules_results['night_high_amount'] = {
                    "is_violation": True,
                    "severity": "HIGH",
                    "reason": "High amount transaction during night hours",
                    "recommendation": "MANUAL_REVIEW"
                }
            
            # Rule 3: Same account check
            if features.get('same_account', 0) == 1:
                rules_results['same_account'] = {
                    "is_violation": True,
                    "severity": "HIGH",
                    "reason": "Transaction to same account",
                    "recommendation": "BLOCK"
                }
            
            # Rule 4: Velocity check (if data available)
            daily_amount = features.get('daily_transaction_amount', 0)
            if daily_amount > 100000:
                rules_results['velocity_check'] = {
                    "is_violation": True,
                    "severity": "MEDIUM",
                    "reason": f"High daily transaction volume: ₹{daily_amount}",
                    "recommendation": "MANUAL_REVIEW"
                }
            
            # Rule 5: Round amount pattern
            if features.get('round_amount', 0) == 1 and amount >= 10000:
                rules_results['round_amount_pattern'] = {
                    "is_violation": True,
                    "severity": "LOW",
                    "reason": "Suspicious round amount pattern",
                    "recommendation": "MONITOR"
                }
            
        except Exception as e:
            logger.error(f"Error applying business rules: {e}")
            rules_results['rule_error'] = {
                "is_violation": False,
                "reason": f"Rule evaluation error: {str(e)}"
            }
        
        return rules_results
    
    async def _combine_results(
        self, 
        predictions: Dict[str, Any], 
        rules_results: Dict[str, Any], 
        transaction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Combine model predictions and business rules results
        """
        try:
            # Start with model predictions
            final_result = {
                "fraud_score": predictions["fraud_score"],
                "is_fraudulent": predictions["is_fraudulent"],
                "risk_level": predictions["risk_level"],
                "confidence": predictions["confidence"],
                "reason": predictions["reason"],
                "features_analyzed": predictions["features_analyzed"],
                "recommendation": predictions["recommendation"],
                "rules_violated": [],
                "model_used": not predictions.get("error", False)
            }
            
            # Check for rule violations
            critical_violations = []
            high_violations = []
            
            for rule_name, result in rules_results.items():
                if result.get("is_violation", False):
                    violation = {
                        "rule": rule_name,
                        "severity": result.get("severity", "MEDIUM"),
                        "reason": result.get("reason", ""),
                        "recommendation": result.get("recommendation", "MANUAL_REVIEW")
                    }
                    final_result["rules_violated"].append(violation)
                    
                    if result.get("severity") == "CRITICAL":
                        critical_violations.append(violation)
                    elif result.get("severity") == "HIGH":
                        high_violations.append(violation)
            
            # Override based on rule violations
            if critical_violations:
                final_result["is_fraudulent"] = True
                final_result["risk_level"] = "CRITICAL"
                final_result["recommendation"] = "BLOCK"
                final_result["reason"] = f"Critical rule violations: {'; '.join([v['reason'] for v in critical_violations])}"
            elif high_violations:
                final_result["is_fraudulent"] = True
                final_result["risk_level"] = "HIGH"
                final_result["recommendation"] = "MANUAL_REVIEW"
                if not final_result["is_fraudulent"]:  # If model said it's not fraud
                    final_result["reason"] = f"Rule violations detected: {'; '.join([v['reason'] for v in high_violations])}"
            
            # Adjust fraud score based on rules
            if final_result["rules_violated"]:
                rule_penalty = len(critical_violations) * 0.3 + len(high_violations) * 0.2
                final_result["fraud_score"] = min(1.0, final_result["fraud_score"] + rule_penalty)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Error combining results: {e}")
            return predictions  # Return model predictions as fallback
    
    async def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """Get feature importance from the model if available"""
        try:
            if (self.model_service and 
                self.model_service.primary_model and 
                hasattr(self.model_service.primary_model, 'feature_importances_')):
                
                importances = self.model_service.primary_model.feature_importances_
                feature_names = self.model_service.feature_names or [f"feature_{i}" for i in range(len(importances))]
                
                return dict(zip(feature_names, importances.tolist()))
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting feature importance: {e}")
            return None
    
    async def validate_model_health(self) -> Dict[str, Any]:
        """Validate that the fraud detection system is working"""
        health_status = {
            "healthy": True,
            "issues": [],
            "model_available": False,
            "fallback_available": True
        }
        
        try:
            if self.model_service and self.model_service.primary_model:
                health_status["model_available"] = True
                
                # Test with dummy transaction
                dummy_data = {
                    "amount": 1000.0,
                    "sender_account": "test@upi",
                    "receiver_account": "merchant@upi",
                    "transaction_type": "P2P",
                    "transaction_time": datetime.utcnow()
                }
                
                result = await self.detect_fraud(dummy_data)
                if result.get("error"):
                    health_status["healthy"] = False
                    health_status["issues"].append("Model prediction test failed")
            else:
                health_status["issues"].append("No ML model loaded - using rule-based fallback")
            
        except Exception as e:
            health_status["healthy"] = False
            health_status["issues"].append(f"Health check failed: {str(e)}")
        
        return health_status