from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.measurement import Measurement, MeasurementDetail
from app.models.user import User
from app.services.auth import get_current_user
from app.services.measurement_calculation import MeasurementCalculator
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from app.config import settings
import time
import logging
import os
import uuid
import shutil

router = APIRouter()
logger = logging.getLogger(__name__)


class MeasurementDetailCreate(BaseModel):
    parameter_name: str
    value: float


class MeasurementCreate(BaseModel):
    height: float
    front_image_url: str
    side_image_url: str


class MeasurementResponse(BaseModel):
    id: int
    height: float
    front_image_url: str
    side_image_url: str
    front_annotated_image_url: Optional[str] = None
    side_annotated_image_url: Optional[str] = None
    created_at: datetime
    details: List[MeasurementDetailCreate]

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.strftime('%Y-%m-%d %H:%M:%S')
        }

async def save_annotated_image(image_path: str) -> str:
    """将可视化图片保存到 static/annotations 目录并返回访问URL"""
    try:
        # 确保目标目录存在
        os.makedirs(settings.ANNOTATED_IMAGES_DIR, exist_ok=True)

        # 生成唯一文件名
        unique_filename = f"annotated_{uuid.uuid4().hex}.jpg"
        destination_path = os.path.join(settings.ANNOTATED_IMAGES_DIR, unique_filename)

        # 复制文件到目标目录
        shutil.copy2(image_path, destination_path)

        # 返回相对URL路径
        return f"/api/static/annotations/{unique_filename}"

    except Exception as e:
        logger.error(f"保存可视化图片失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"保存可视化图片失败: {str(e)}"
        )


@router.post("/", response_model=MeasurementResponse)
async def create_measurement(
        measurement: MeasurementCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    try:
        logger.info(f"开始处理测量请求，用户ID: {current_user.id}, 身高: {measurement.height}")
        logger.info(f"正面图片URL: {measurement.front_image_url}")
        logger.info(f"侧面图片URL: {measurement.side_image_url}")

        # 创建测量记录
        db_measurement = Measurement(
            user_id=current_user.id,
            height=measurement.height,
            front_image_url=measurement.front_image_url,
            side_image_url=measurement.side_image_url
        )
        db.add(db_measurement)
        db.commit()
        db.refresh(db_measurement)
        logger.info(f"测量记录创建成功，ID: {db_measurement.id}")

        # 直接进行计算
        calculator = MeasurementCalculator(
            front_image_path=measurement.front_image_url,
            side_image_path=measurement.side_image_url,
            height=measurement.height
        )
        logger.info("MeasurementCalculator初始化成功")

        # 执行计算并获取结果（包括可视化图片）
        measurements, front_annotated_path, side_annotated_path = calculator.calculate_measurements()
        logger.info(f"计算完成，正面可视化图片路径: {front_annotated_path}")
        logger.info(f"计算完成，侧面可视化图片路径: {side_annotated_path}")

        # 保存可视化图片到 static/annotations 目录
        front_annotated_url = await save_annotated_image(front_annotated_path)
        side_annotated_url = await save_annotated_image(side_annotated_path)
        logger.info(f"可视化图片保存成功，正面URL: {front_annotated_url}")
        logger.info(f"可视化图片保存成功，侧面URL: {side_annotated_url}")

        # 更新测量记录中的可视化图片URL
        db_measurement.front_annotated_image_url = front_annotated_url
        db_measurement.side_annotated_image_url = side_annotated_url

        # 保存计算结果
        for measurement_data in measurements:
            db_detail = MeasurementDetail(
                measurement_id=db_measurement.id,
                parameter_name=measurement_data["parameter_name"],
                value=measurement_data["value"]
            )
            db.add(db_detail)
        db.commit()
        db.refresh(db_measurement)
        logger.info(f"测量完成，返回结果")

        return db_measurement
    except Exception as e:
        db.rollback()
        logger.error(f"计算过程中发生错误: {str(e)}", exc_info=True)  # 记录完整的错误堆栈
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"计算过程中发生错误: {str(e)}"
        )


@router.get("/history", response_model=List[MeasurementResponse])
async def get_measurements(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    from sqlalchemy.orm import joinedload
    measurements = db.query(Measurement).options(
        joinedload(Measurement.details)
    ).filter(
        Measurement.user_id == current_user.id
    ).order_by(Measurement.created_at.desc()).all()
    return measurements


@router.get("/count")
async def get_measurement_count(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    count = db.query(Measurement).filter(
        Measurement.user_id == current_user.id
    ).count()
    return {"count": count}







