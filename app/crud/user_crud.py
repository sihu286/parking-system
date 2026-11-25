from sqlalchemy.orm import Session
from app.models.user import User


def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.user_id == user_id).first()


def create_user(db: Session, data: dict):
    user = User(**data)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user