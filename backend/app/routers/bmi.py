# app/routes/bmi.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services import bmi as bmi_service

router = APIRouter()


class BMIRequest(BaseModel):
    height: float  # 单位：米
    weight: float  # 单位：千克


class BMIResponse(BaseModel):
    height: float  # 单位：米
    weight: float  # 单位：千克
    bmi: float
    category: str
    record_id: int
    created_at: datetime


class BMIHistoryResponse(BaseModel):
    records: list[BMIResponse]


@router.post("/calculate", response_model=BMIResponse)
async def calculate_bmi_endpoint(
        bmi_data: BMIRequest,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """计算BMI并保存记录"""
    bmi_record = bmi_service.create_bmi_record(
        db, current_user.id, bmi_data.height, bmi_data.weight
    )

    return {
        "height":bmi_record.height,
        "weight":bmi_record.weight,
        "bmi": bmi_record.bmi_value,
        "category": bmi_record.category,
        "record_id": bmi_record.id,
        "created_at": bmi_record.created_at
    }


@router.get("/history", response_model=BMIHistoryResponse)
async def get_bmi_history(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """获取用户的BMI历史记录"""
    records = bmi_service.get_user_bmi_history(db, current_user.id)

    return {
        "records": [
            {
                "height":record.height,
                "weight":record.weight,
                "bmi": record.bmi_value,
                "category": record.category,
                "record_id": record.id,
                "created_at": record.created_at
            }
            for record in records
        ]
    }


@router.delete("/record/{record_id}")
async def delete_bmi_record(
        record_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    """删除指定的BMI记录"""
    success = bmi_service.delete_bmi_record(db, record_id, current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="记录未找到")

    return {"message": "记录删除成功"}