from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import HTTPException

from app.models.violation import Violation
from app.crud.violation_crud import (
    get_all_violations,
    get_active_violations,
    get_violation_by_id,
    save_violation,
)
from app.crud.active_parking_crud import get_all_active


## 차랼번호 정규화
def _normalize_car_number(car_number: str | None) -> str:
    return (car_number or "").replace(" ", "").strip() ##공백제서거


## 주차장에 진입한 차량
def _get_active_by_car(db: Session, car_number: str | None):
    target = _normalize_car_number(car_number)

    if not target:
        return None

    ## 차량번호 찾기
    rows = get_all_active(db)

    for row in rows:
        if _normalize_car_number(getattr(row, "car_number", None)) == target:
            return row

    return None


##프론트에서 쓰기 편한 딕셔너리로 변환
def _serialize_violation(row: Violation, db: Session):
    active_exists = False

    if row.violation_type in ["24시간초과", "24시간 초과"] and row.car_number:
        active_exists = _get_active_by_car(db, row.car_number) is not None

    return {
        "violation_id": row.violation_id,
        "detected_at": row.detected_at.strftime("%Y-%m-%d %H:%M:%S") if row.detected_at else "",
        "slot_id": row.slot_id if row.slot_id else "-",
        "car_number": row.car_number if row.car_number else "-",
        "violation_type": row.violation_type if row.violation_type else "",
        "status": row.status if row.status else "미처리",
        "action": row.action if getattr(row, "action", None) else "",
        "handler_id": row.handler_id if getattr(row, "handler_id", None) else "",
        "action_time": row.action_time.strftime("%Y-%m-%d %H:%M:%S") if getattr(row, "action_time", None) else "",
        "can_manage_active": active_exists,
    }


##전체 이상상황 목록 조회
def get_all_abnormal_list(
    db: Session,
    period: str = "week",
    start_date: str | None = None,
    end_date: str | None = None,
):
    rows = get_all_violations(db)
    rows = _filter_violations_by_period(rows, period, start_date, end_date)

    return [_serialize_violation(row, db) for row in rows]


##처리 중인 이상상황 조회
def get_active_abnormal_list(db: Session):
    rows = get_active_violations(db)
    return [_serialize_violation(row, db) for row in rows]


##이상상황 처리 상태별 갯수
def get_abnormal_summary(
    db: Session,
    period: str = "week",
    start_date: str | None = None,
    end_date: str | None = None,
):
    rows = get_all_violations(db)
    rows = _filter_violations_by_period(rows, period, start_date, end_date)

    summary = {
        "total": len(rows),
        "미처리": 0,
        "처리중": 0,
        "완료": 0,
    }

    for row in rows:
        status = row.status if row.status else "미처리"

        if status in summary:
            summary[status] += 1

    return summary


##이상상황 업데이트
def update_abnormal_status(
    db: Session,
    violation_id: int,
    status: str,
    action: str | None = None,
    handler_id: str | None = None,
):
    status = status.strip()

    row = get_violation_by_id(db, violation_id)

    if not row:
        return None

    row.status = status

    if hasattr(row, "action"):
        row.action = action if action is not None else row.action

    if hasattr(row, "handler_id"):
        row.handler_id = handler_id if handler_id is not None else row.handler_id

    row.action_time = datetime.now()

    db.commit()
    db.refresh(row)

    return _serialize_violation(row, db)


## 추가부분
def _parse_date_range(start_date: str | None = None, end_date: str | None = None):
    start_dt = None
    end_dt = None

    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")

    if end_date:
        end_dt_original = datetime.strptime(end_date, "%Y-%m-%d")

        if start_dt and start_dt.date() > end_dt_original.date():
            raise HTTPException(
                status_code=400,
                detail="검색 시작일은 종료일보다 늦을 수 없습니다."
            )

        end_dt = end_dt_original + timedelta(days=1)

    return start_dt, end_dt


def _get_period_range(period: str):
    now = datetime.now(ZoneInfo("Asia/Seoul")).replace(tzinfo=None)

    if period == "day":
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = start_dt + timedelta(days=1)
        return start_dt, end_dt

    if period == "week":
        end_dt = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        start_dt = end_dt - timedelta(days=7)
        return start_dt, end_dt

    if period == "month":
        end_dt = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        start_dt = end_dt - timedelta(days=30)
        return start_dt, end_dt

    return None, None


def _filter_violations_by_period(rows, period: str, start_date: str | None, end_date: str | None):
    if start_date or end_date:
        start_dt, end_dt = _parse_date_range(start_date, end_date)
    else:
        start_dt, end_dt = _get_period_range(period)

    result = []

    for row in rows:
        detected_at = row.detected_at

        if start_dt and detected_at and detected_at < start_dt:
            continue

        if end_dt and detected_at and detected_at >= end_dt:
            continue

        result.append(row)

    return result
