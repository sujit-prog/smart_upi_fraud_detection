from pydantic import BaseModel, EmailStr

# Base user schema
class UserBase(BaseModel):
    username: str
    email: EmailStr

# Schema for user creation (signup)
class UserCreate(UserBase):
    password: str

# Schema for user stored in DB
class UserInDB(UserBase):
    id: int
    hashed_password: str

    class Config:
        from_attributes = True  # ✅ replaces orm_mode in Pydantic v2

# Schema for API responses
class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# Schema for JWT tokens
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
