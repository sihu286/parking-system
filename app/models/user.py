from sqlalchemy import Column, DateTime, Enum, String, text
from app.db.database import Base

##관리자=/ 사용자
class User(Base):
    __tablename__ = "user"

    user_id = Column(String(30), primary_key=True)
    password = Column(String(100), nullable=False)
    name = Column(String(30), nullable=False)
    role = Column(Enum("ADMIN", "USER"), nullable=False)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))