from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.services.auth import (
    verify_password,
    get_password_hash, 
    create_access_token, 
    authenticate_user,
    get_current_user
)
from app.config import settings
from pydantic import BaseModel

router = APIRouter()

class LoginData(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int

class UserCreate(BaseModel):
    username: str
    password: str

class UserInfo(BaseModel):
    id: int
    username: str
    created_at: str
    gender: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None

class UsernameUpdate(BaseModel):
    new_username: str

class PasswordUpdate(BaseModel):
    new_password: str
    # 添加旧密码验证（根据安全需求）
    old_password: str

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginData,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id
    }

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已被注册")
    
    new_user = User(
        username=user.username,
        password_hash=get_password_hash(user.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "注册成功"}

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/user-info", response_model=UserInfo)
async def get_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "created_at": current_user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "gender": current_user.gender,
        "age": current_user.age,
        "weight": current_user.weight,
    }

@router.post("/logout")
async def logout():
    return {"message": "退出成功"}

# 修改用户名
@router.patch("/update-username", response_model=UserInfo)
async def update_username(
    update_data: UsernameUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 检查新用户名是否已存在
    existing_user = db.query(User).filter(
        User.username == update_data.new_username,
        User.id != current_user.id  # 排除当前用户
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户名已被使用"
        )
    
    # 更新用户名
    current_user.username = update_data.new_username
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "created_at": current_user.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

# 修改密码
@router.patch("/update-password")
async def update_password(
    update_data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 验证旧密码是否正确
    if not verify_password(update_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码不正确"
        )
    
    # 更新密码
    current_user.password_hash = get_password_hash(update_data.new_password)
    db.commit()

    return {"message": "密码更新成功，请重新登录"}

class ProfileUpdate(BaseModel):
    gender: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None

@router.get("/profile", response_model=UserInfo)
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "created_at": current_user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "gender": current_user.gender,
        "age": current_user.age,
        "weight": current_user.weight,
    }

@router.patch("/profile", response_model=UserInfo)
async def update_profile(
    update_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if update_data.gender is not None:
        current_user.gender = update_data.gender
    if update_data.age is not None:
        current_user.age = update_data.age
    if update_data.weight is not None:
        current_user.weight = update_data.weight
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "created_at": current_user.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "gender": current_user.gender,
        "age": current_user.age,
        "weight": current_user.weight,
    }