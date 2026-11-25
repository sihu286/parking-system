from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User

router = APIRouter()

## 로그인 처리
class LoginRequest(BaseModel):
    user_id: str
    password: str


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(
            User.user_id == data.user_id,
            User.password == data.password
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="아이디 또는 비밀번호가 올바르지 않습니다."
        )

    return {
        "user_id": user.user_id,
        "name": user.name,
        "role": user.role
    }