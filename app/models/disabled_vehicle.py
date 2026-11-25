from sqlalchemy import Column, DateTime, String, text
from app.db.database import Base

##장애인 차량 등록 테이블
class DisabledVehicle(Base):
    __tablename__ = "disabled_vehicle"

    rfid_uid = Column(String(50), primary_key=True)
    car_number = Column(String(20), unique=True)
    owner_name = Column(String(30))
    disabled_person_name = Column(String(30))
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    expire_date = Column(DateTime, nullable=False)