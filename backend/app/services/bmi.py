# app/services/bmi.py
from sqlalchemy.orm import Session
from app.models.bmi import BMIRecord
from fastapi import HTTPException


def calculate_bmi_value(height: float, weight: float) -> tuple[float, str]:
    """计算BMI值并返回分类"""
    if height <= 0 or weight <= 0:
        raise HTTPException(status_code=400, detail="身高和体重必须为正数")

    bmi = weight / (height ** 2)

    if bmi < 18.5:
        category = "体重过轻"
    elif bmi < 24:
        category = "正常范围"
    elif bmi < 28:
        category = "超重"
    else:
        category = "肥胖"

    return round(bmi, 2), category


def create_bmi_record(
        db: Session,
        user_id: int,
        height: float,
        weight: float
) -> BMIRecord:
    """创建BMI记录"""
    bmi_value, category = calculate_bmi_value(height, weight)

    bmi_record = BMIRecord(
        user_id=user_id,
        height=height,
        weight=weight,
        bmi_value=bmi_value,
        category=category
    )

    db.add(bmi_record)
    db.commit()
    db.refresh(bmi_record)

    return bmi_record


def get_user_bmi_history(db: Session, user_id: int) -> list[BMIRecord]:
    """获取用户的BMI历史记录"""
    return db.query(BMIRecord).filter(
        BMIRecord.user_id == user_id
    ).order_by(BMIRecord.created_at.desc()).all()


def delete_bmi_record(db: Session, record_id: int, user_id: int) -> bool:
    """删除指定的BMI记录"""
    record = db.query(BMIRecord).filter(
        BMIRecord.id == record_id,
        BMIRecord.user_id == user_id
    ).first()

    if not record:
        return False

    db.delete(record)
    db.commit()

    return True