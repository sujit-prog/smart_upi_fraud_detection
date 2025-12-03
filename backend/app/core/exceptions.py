# app/core/exceptions.py
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from typing import Any

logger = logging.getLogger(__name__)

class FraudDetectionException(Exception):
    """Base exception for fraud detection errors"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)

class ModelLoadException(FraudDetectionException):
    """Exception for model loading errors"""
    pass

class DatabaseException(FraudDetectionException):
    """Exception for database errors"""
    pass

class ValidationException(FraudDetectionException):
    """Exception for validation errors"""
    pass

class RateLimitException(FraudDetectionException):
    """Exception for rate limiting"""
    pass

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Invalid input data",
            "details": exc.errors(),
            "timestamp": str(datetime.utcnow())
        }
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors"""
    logger.error(f"Database error on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Database Error",
            "message": "A database error occurred",
            "timestamp": str(datetime.utcnow())
        }
    )

async def fraud_detection_exception_handler(request: Request, exc: FraudDetectionException):
    """Handle fraud detection specific errors"""
    logger.error(f"Fraud detection error on {request.url}: {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Fraud Detection Error",
            "message": exc.message,
            "error_code": exc.error_code,
            "timestamp": str(datetime.utcnow())
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled error on {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "timestamp": str(datetime.utcnow())
        }
    )