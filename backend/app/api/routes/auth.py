from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm

from app.core.database import get_db, create_user, get_user_by_username, get_user_by_email
from app.core.auth import authenticate_user, create_access_token, get_current_user
from app.schemas.user import UserCreate, UserResponse, Token, UserInDB

router = APIRouter()

# ---------------------------
# Register new user
# ---------------------------
@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # check if username already exists
    db_user = get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    # check if email already exists
    db_email = get_user_by_email(db, user.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # create new user
    new_user = create_user(db, user)
    return new_user


# ---------------------------
# Login & get JWT token
# ---------------------------
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = authenticate_user(db, form_data.username, form_data.password)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------
# Get current user (protected route)
# ---------------------------
@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user
