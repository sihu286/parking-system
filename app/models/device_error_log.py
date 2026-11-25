from sqlalchemy import Column, DateTime, Enum, Integer, String, Text, text
from app.db.database import Base


class DeviceErrorLog(Base):
    __tablename__ = "device_error_log"

    error_id = Column(Integer, primary_key=True, autoincrement=True)
    device_type = Column(Enum("무게센서", "RFID리더기", "보드"), nullable=False)
    device_uid = Column(String(50), nullable=False)
    error_code = Column(String(20), nullable=False)
    error_detail = Column(Text)
    status = Column(Enum("미처리", "처리중", "완료"), default="미처리")
    detected_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    action = Column(Text)
    action_time = Column(DateTime)