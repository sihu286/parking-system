from sqlalchemy import Column, DateTime, Enum, Integer, String, text
from app.db.database import Base

## 주차장 입출차 로그
class ParkingLog(Base):
    __tablename__ = "parking_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    car_number = Column(String(20))
    event_type = Column(Enum("IN", "OUT"))
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))