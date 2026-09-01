from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from app.database import Base

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    height = Column(Float)
    front_image_url = Column(String(255))
    side_image_url = Column(String(255))
    created_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=8))

    front_annotated_image_url = Column(String, nullable=True)
    side_annotated_image_url = Column(String, nullable=True)

    user = relationship("User", back_populates="measurements")
    details = relationship("MeasurementDetail", back_populates="measurement")

class MeasurementDetail(Base):
    __tablename__ = "measurement_details"

    id = Column(Integer, primary_key=True, index=True)
    measurement_id = Column(Integer, ForeignKey("measurements.id"))
    parameter_name = Column(String(50), nullable=False)
    value = Column(Float, nullable=False)

    measurement = relationship("Measurement", back_populates="details")