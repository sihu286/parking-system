from sqlalchemy import Column, Enum, String
from app.db.database import Base


## 주차장 자리
class ParkingSlot(Base):
    __tablename__ = "parking_slot"

    slot_id = Column(String(20), primary_key=True)
    slot_type = Column(Enum("GENERAL", "DISABLED"))
    weight_sensor_uid = Column(String(50), unique=True)
    rfid_reader_uid = Column(String(50))
    status = Column(Enum("빈자리", "점유", "이상"))