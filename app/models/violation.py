from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, text
from app.db.database import Base

##이상상황 테이블
class Violation(Base):
    __tablename__ = "violation"

    violation_id = Column(Integer, primary_key=True, autoincrement=True)
    car_number = Column(String(20))
    rfid_uid = Column(String(50))
    violation_type = Column(Enum("미인식", "불일치", "기간만료", "24시간초과", "장비이상"))
    detected_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    slot_id = Column(String(20), ForeignKey("parking_slot.slot_id"))
    handler_id = Column(String(30), ForeignKey("user.user_id"))
    status = Column(Enum("미처리", "처리중", "완료"))
    action = Column(Text)
    action_time = Column(DateTime)