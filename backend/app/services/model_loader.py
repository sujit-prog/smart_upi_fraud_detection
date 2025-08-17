# app/services/model_loader.py
import pickle
import joblib
import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from ..core.config import settings

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self):
        self.primary_model = None
        self.ensemble_models = []
        self.scaler = None
        self.feature_names = []
        self.model_metadata = {}
        self.fraud_threshold = settings.FRAUD_THRESHOLD
        self.last_updated = None
        
    async def load_models(self):
        """
        Load all ML models from the models directory
        """
        try:
            model_path = Path(settings.MODEL_PATH)
            if not model_path.exists():
                logger.warning(f"Model path {model_path} does not exist")
                return
            
            # Load primary fraud detection model
            await self._load_primary_model(model_path)
            
            # Load ensemble models if available
            await self._load_ensemble_models(model_path)
            
            # Load preprocessing components
            await self._load_preprocessing_components(model_path)
            
            # Load model metadata
            await self._load_model_metadata(model_path)
            
            self.last_updated = datetime.utcnow()
            logger.info("All models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
    
    async def _load_primary_model(self, model_path: Path):
        """Load the primary fraud detection model"""
        try:
            # Try different model file names and formats
            model_files = [
                "fraud_model.pkl",
                "fraud_detector.joblib",
                "main_model.pkl",
                "classifier.pkl"
            ]
            
            for model_file in model_files:
                file_path = model_path / model_file
                if file_path.exists():
                    if model_file.endswith('.pkl'):
                        with open(file_path, 'rb') as f:
                            self.primary_model = pickle.load(f)
                    elif model_file.endswith('.joblib'):
                        self.primary_model = joblib.load(file_path)
                    
                    logger.info(f"Loaded primary model from {model_file}")
                    break
            
            if not self.primary_model:
                logger.warning("No primary model found. Using fallback scoring.")
                
        except Exception as e:
            logger.error(f"Error loading primary model: {e}")
    
    async def _load_ensemble_models(self, model_path: Path):
        """Load ensemble models if available"""
        try:
            ensemble_path = model_path / "ensemble"
            if not ensemble_path.exists():
                return
            
            for model_file in ensemble_path.glob("*.pkl"):
                try:
                    with open(model_file, 'rb') as f:
                        model = pickle.load(f)
                        self.ensemble_models.append(model)
                    logger.info(f"Loaded ensemble model: {model_file.name}")
                except Exception as e:
                    logger.warning(f"Could not load ensemble model {model_file}: {e}")
            
            # Also check for joblib files
            for model_file in ensemble_path.glob("*.joblib"):
                try:
                    model = joblib.load(model_file)
                    self.ensemble_models.append(model)
                    logger.info(f"Loaded ensemble model: {model_file.name}")
                except Exception as e:
                    logger.warning(f"Could not load ensemble model {model_file}: {e}")
                    
        except Exception as e:
            logger.error(f"Error loading ensemble models: {e}")
    
    async def _load_preprocessing_components(self, model_path: Path):
        """Load preprocessing components like scalers, encoders"""
        try:
            # Load scaler
            scaler_files = ["scaler.pkl", "standard_scaler.pkl", "minmax_scaler.pkl"]
            for scaler_file in scaler_files:
                scaler_path = model_path / scaler_file
                if scaler_path.exists():
                    with open(scaler_path, 'rb') as f:
                        self.scaler = pickle.load(f)
                    logger.info(f"Loaded scaler from {scaler_file}")
                    break
            
            # Load feature names
            feature_names_path = model_path / "feature_names.pkl"
            if feature_names_path.exists():
                with open(feature_names_path, 'rb') as f:
                    self.feature_names = pickle.load(f)
                logger.info("Loaded feature names")
            
        except Exception as e:
            logger.error(f"Error loading preprocessing components: {e}")
    
    async def _load_model_metadata(self, model_path: Path):
        """Load model metadata and performance metrics"""
        try:
            metadata_files = ["model_metadata.pkl", "metrics.pkl"]
            for metadata_file in metadata_files:
                metadata_path = model_path / metadata_file
                if metadata_path.exists():
                    with open(metadata_path, 'rb') as f:
                        self.model_metadata = pickle.load(f)
                    logger.info(f"Loaded model metadata from {metadata_file}")
                    break
                    
        except Exception as e:
            logger.error(f"Error loading model metadata: {e}")
    
    def preprocess_features(self, features: Dict[str, float]) -> Any:
        """
        Preprocess features for model input
        """
        try:
            import pandas as pd
            
            # Convert to DataFrame
            df = pd.DataFrame([features])
            
            # Ensure all required features are present
            if self.feature_names:
                missing_features = set(self.feature_names) - set(df.columns)
                for feature in missing_features:
                    df[feature] = 0.0
                
                # Reorder columns to match training data
                df = df[self.feature_names]
            
            # Apply scaling if scaler is available
            if self.scaler:
                df_scaled = self.scaler.transform(df)
                return df_scaled
            
            return df.values
            
        except Exception as e:
            logger.error(f"Error preprocessing features: {e}")
            return None
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        info = {
            "primary_model_loaded": self.primary_model is not None,
            "ensemble_models_count": len(self.ensemble_models),
            "has_scaler": self.scaler is not None,
            "feature_count": len(self.feature_names),
            "fraud_threshold": self.fraud_threshold,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None
        }
        
        if self.primary_model:
            model_type = type(self.primary_model).__name__
            info["primary_model_type"] = model_type
        
        if self.model_metadata:
            info.update(self.model_metadata)
        
        return info
    
    async def reload_models(self):
        """Reload all models (useful for model updates)"""
        logger.info("Reloading models...")
        self.primary_model = None
        self.ensemble_models = []
        self.scaler = None
        self.feature_names = []
        self.model_metadata = {}
        
        await self.load_models()
    
    def validate_model_health(self) -> Dict[str, Any]:
        """Validate that models are working correctly"""
        health_status = {
            "healthy": True,
            "issues": []
        }
        
        if not self.primary_model:
            health_status["healthy"] = False
            health_status["issues"].append("No primary model loaded")
        
        # Test prediction with dummy data
        try:
            if self.primary_model:
                import pandas as pd
                import numpy as np
                
                # Create dummy features
                dummy_features = {f"feature_{i}": np.random.random() for i in range(10)}
                if self.feature_names:
                    dummy_features = {name: np.random.random() for name in self.feature_names[:10]}
                
                df = pd.DataFrame([dummy_features])
                _ = self.primary_model.predict_proba(df)
                
        except Exception as e:
            health_status["healthy"] = False
            health_status["issues"].append(f"Model prediction test failed: {str(e)}")
        
        return health_status