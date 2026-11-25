from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.device_error_log_crud import (
    get_all_device_error_logs,
    get_device_error_log_by_id,
    save_device_error_log,
    create_device_error_log,
)
from app.models.device_error_log import DeviceErrorLog

KST = ZoneInfo("Asia/Seoul")


def _serialize_device_error(row: DeviceErrorLog):
    return {
        "error_id": row.error_id,
        "device_type": row.device_type,
        "device_uid": row.device_uid,
        "error_code": row.error_code,
        "error_detail": row.error_detail if row.error_detail else "",
        "status": row.status if row.status else "미처리",
        "detected_at": row.detected_at.strftime("%Y-%m-%d %H:%M:%S") if row.detected_at else "",
        "action": row.action if row.action else "",
        "action_time": row.action_time.strftime("%Y-%m-%d %H:%M:%S") if row.action_time else "",
    }


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
    now = datetime.now(KST).replace(tzinfo=None)

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


def _filter_device_errors_by_period(rows, period: str, start_date: str | None, end_date: str | None):
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


def get_all_device_error_list(
    db: Session,
    period: str = "week",
    start_date: str | None = None,
    end_date: str | None = None,
):
    rows = get_all_device_error_logs(db)
    rows = _filter_device_errors_by_period(rows, period, start_date, end_date)

    return [_serialize_device_error(row) for row in rows]


def get_device_error_summary(
    db: Session,
    period: str = "week",
    start_date: str | None = None,
    end_date: str | None = None,
):
    rows = get_all_device_error_logs(db)
    rows = _filter_device_errors_by_period(rows, period, start_date, end_date)

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


def update_device_error_status(
    db: Session,
    error_id: int,
    status: str,
    action: str | None = None,
):
    row = get_device_error_log_by_id(db, error_id)

    if not row:
        return None

    row.status = status

    if action is not None:
        row.action = action

    if status == "완료":
        row.action_time = datetime.now()

    save_device_error_log(db, row)

    return _serialize_device_error(row)


def create_device_error(
    db: Session,
    device_type: str,
    device_uid: str,
    error_code: str,
    error_detail: str | None = None,
):
    if device_type not in ["무게센서", "RFID리더기", "보드"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 장비 유형입니다.")

    log = DeviceErrorLog(
        device_type=device_type,
        device_uid=device_uid,
        error_code=error_code,
        error_detail=error_detail,
        status="미처리",
    )

    created = create_device_error_log(db, log)

    return _serialize_device_error(created)
