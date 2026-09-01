from sqlalchemy import Column, Integer, String, DateTime, Float
from datetime import datetime
from app.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password_hash = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    gender = Column(String(10), nullable=True)   # 'male' / 'female'
    age = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)

    # 添加反向关系
    measurements = relationship("Measurement", back_populates="user")
    bmi_records = relationship("BMIRecord", back_populates="user")