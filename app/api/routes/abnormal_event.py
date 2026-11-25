from fastapi import APIRouter, Depends, HTTPException,Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.abnormal_service import (
    get_abnormal_summary,
    get_active_abnormal_list,
    get_all_abnormal_list,
    update_abnormal_status,
)

##라우터 기본 주소
router = APIRouter(prefix="/api/abnormal-events", tags=["abnormal-events"])

## 수정 요청 데이터 형식
class AbnormalUpdateRequest(BaseModel):
    status: str
    action: str | None = None
    handler_id: str | None = None

##전체 이상상황 목록 조회
# @router.get("")
# def abnormal_list(db: Session = Depends(get_db)): ##의존성 주입
#     return get_all_abnormal_list(db)
@router.get("")
def abnormal_list(
    period: str = Query(default="week"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_all_abnormal_list(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )

## 요약 정보 조회

# @router.get("/summary")
# def abnormal_summary(db: Session = Depends(get_db)):
#     return get_abnormal_summary(db)

@router.get("/summary")
def abnormal_summary(
    period: str = Query(default="week"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_abnormal_summary(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )

##알림용 이상상황 조회
@router.get("/alerts")
def abnormal_alerts(db: Session = Depends(get_db)):
    return get_active_abnormal_list(db)

## 이상상황 상태 수정
@router.patch("/{violation_id}")
def abnormal_update(
    violation_id: int,
    data: AbnormalUpdateRequest,
    db: Session = Depends(get_db),
):
    if data.status not in ["미처리", "처리중", "완료"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 상태값입니다.") ##예외 처리

    updated = update_abnormal_status(
        db=db,
        violation_id=violation_id,
        status=data.status,
        action=data.action,
        handler_id=data.handler_id,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="이상 상황을 찾을 수 없습니다.")

    return updated