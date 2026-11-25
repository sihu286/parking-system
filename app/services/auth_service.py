from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.user_crud import get_user_by_id


def login_user(db: Session, user_id: str, password: str):
    user = get_user_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if user.password != password:
        raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")

    return {
        "user_id": user.user_id,
        "name": user.name,
        "role": user.role
    }