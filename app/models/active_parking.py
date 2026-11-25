from sqlalchemy import Column, DateTime, Enum, ForeignKey, String
from app.db.database import Base


## 현재 주차장에 진입한 차량 정보를 저장하는 테이블
class ActiveParking(Base):
    __tablename__ = "active_parking"

    car_number = Column(String(20), primary_key=True)
    entry_time = Column(DateTime, nullable=False)
    rfid_uid = Column(String(50), ForeignKey("disabled_vehicle.rfid_uid"))
    status = Column(Enum("정상", "24시간 초과", "기간만료"))