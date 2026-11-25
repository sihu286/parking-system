from collections import Counter
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.parking_log import ParkingLog
from app.models.violation import Violation

KST = ZoneInfo("Asia/Seoul")


## 날짜 처리 로직
def _parse_date_range(start_date: str | None = None, end_date: str | None = None):
    start_dt = None
    end_dt = None

    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")

    if end_date:
        end_dt_original = datetime.strptime(end_date, "%Y-%m-%d")
##시작일이 종료일보다 늦으면 에러
        if start_dt and start_dt.date() > end_dt_original.date():
            raise HTTPException(
                status_code=400,
                detail="검색 시작일은 종료일보다 늦을 수 없습니다."
            )

        end_dt = end_dt_original + timedelta(days=1)

    return start_dt, end_dt

##날짜 범위
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

##날짜 조건
def _apply_datetime_range_by_dt(query, column, start_dt: datetime | None = None, end_dt: datetime | None = None):
    if start_dt and end_dt:
        query = query.filter(column >= start_dt, column < end_dt)
    elif start_dt:
        query = query.filter(column >= start_dt)
    elif end_dt:
        query = query.filter(column < end_dt)

    return query

## 문자열 날짜
def _apply_datetime_range(query, column, start_date: str | None = None, end_date: str | None = None):
    start_dt, end_dt = _parse_date_range(start_date, end_date)
    return _apply_datetime_range_by_dt(query, column, start_dt, end_dt)

## 그래프 x축 라벨을 만들기
def _format_label(dt: datetime, period: str) -> str:
    if period in ("day", "custom-hour"):
        return dt.strftime("%H:%M")
    if period in ("week", "month", "custom-day"):
        return dt.strftime("%m/%d")
    return dt.strftime("%m/%d")

##ParkingLog 목록을 받아서 그래프에 넣을 labels, entries, exits 배열로 바꿈
def _build_chart_for_logs(logs, start: datetime, period: str, bucket_count: int):
    labels = []
    entries = []
    exits = []
    bucket_map = {}

    current = start

    for _ in range(bucket_count):
        if period in ("day", "custom-hour"):
            key = current.replace(minute=0, second=0, microsecond=0)
            next_current = current + timedelta(hours=1)
        else:
            key = current.date()
            next_current = current + timedelta(days=1)

        labels.append(_format_label(current, period))
        entries.append(0)
        exits.append(0)
        bucket_map[key] = len(labels) - 1

        current = next_current

    for log in logs:
        if not log.created_at:
            continue

        if period in ("day", "custom-hour"):
            key = log.created_at.replace(minute=0, second=0, microsecond=0)
        else:
            key = log.created_at.date()

        idx = bucket_map.get(key)
        if idx is None:
            continue

        if log.event_type == "IN":
            entries[idx] += 1
        elif log.event_type == "OUT":
            exits[idx] += 1

    return {
        "labels": labels,
        "entries": entries,
        "exits": exits,
    }

## 일/주/월 입출차 그래프
def _build_entry_exit_chart(db: Session, period: str):
    now = datetime.now(KST).replace(tzinfo=None)

    if period == "day":
        start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
        logs = (
            db.query(ParkingLog)
            .filter(ParkingLog.created_at >= start)
            .order_by(ParkingLog.created_at.asc())
            .all()
        )
        return _build_chart_for_logs(logs, start, "day", 24)

    if period == "week":
        start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        logs = (
            db.query(ParkingLog)
            .filter(ParkingLog.created_at >= start)
            .order_by(ParkingLog.created_at.asc())
            .all()
        )
        return _build_chart_for_logs(logs, start, "week", 7)

    if period == "month":
        start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        logs = (
            db.query(ParkingLog)
            .filter(ParkingLog.created_at >= start)
            .order_by(ParkingLog.created_at.asc())
            .all()
        )
        return _build_chart_for_logs(logs, start, "month", 30)

    return {"labels": [], "entries": [], "exits": []}


def _build_entry_exit_chart_by_range(
    db: Session,
    period: str,
    start_date: str | None = None,
    end_date: str | None = None,
):
    start_dt, end_dt = _parse_date_range(start_date, end_date)

    if not start_dt or not end_dt or start_dt >= end_dt:
        return _build_entry_exit_chart(db, period)

    query = db.query(ParkingLog)
    query = _apply_datetime_range_by_dt(query, ParkingLog.created_at, start_dt, end_dt)
    logs = query.order_by(ParkingLog.created_at.asc()).all()

    if period == "day":
        hour_start = start_dt.replace(minute=0, second=0, microsecond=0)
        return _build_chart_for_logs(logs, hour_start, "day", 24)

    day_count = (end_dt.date() - start_dt.date()).days
    if period == "week":
        day_count = min(day_count, 7)
    elif period == "month":
        day_count = min(day_count, 30)
    else:
        day_count = min(day_count, 62)

    if day_count <= 0:
        return {"labels": [], "entries": [], "exits": []}

    day_start = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return _build_chart_for_logs(logs, day_start, period, day_count)

## 사용자 지정 날짜 그래프
def _build_custom_entry_exit_chart(
    db: Session,
    start_date: str | None = None,
    end_date: str | None = None,
):
    start_dt, end_dt = _parse_date_range(start_date, end_date)

    if not start_dt or not end_dt or start_dt >= end_dt:
        return {"labels": [], "entries": [], "exits": []}

    query = db.query(ParkingLog)
    query = _apply_datetime_range(query, ParkingLog.created_at, start_date, end_date)
    logs = query.order_by(ParkingLog.created_at.asc()).all()

    total_days = (end_dt.date() - start_dt.date()).days

    if total_days <= 1:
        hour_start = start_dt.replace(minute=0, second=0, microsecond=0)
        return _build_chart_for_logs(logs, hour_start, "custom-hour", 24)

    if total_days > 62:
        total_days = 62
        end_limit = start_dt + timedelta(days=62)
        logs = [log for log in logs if log.created_at and log.created_at < end_limit]

    day_start = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    return _build_chart_for_logs(logs, day_start, "custom-day", total_days)

## 위반 유형별 개수,프론트에서 도넛 차트나 비율 차트만들기 위한 구조 변환
def _build_violation_ratio_by_period(
    db: Session,
    period: str,
    start_date: str | None = None,
    end_date: str | None = None,
):
    query = db.query(Violation)

    if start_date or end_date:
        query = _apply_datetime_range(query, Violation.detected_at, start_date, end_date)
    else:
        start_dt, end_dt = _get_period_range(period)
        query = _apply_datetime_range_by_dt(query, Violation.detected_at, start_dt, end_dt)

    violations = query.all()
    counter = Counter()

    for row in violations:
        if row.violation_type:
            counter[row.violation_type] += 1

    return dict(counter)

## 최근 입출차 로그 목록 -> 프론트에서 쓰기 쉬운 딕셔너리 형태변환
def _build_recent_logs_by_period(
    db: Session,
    period: str,
    limit: int = 200,
    start_date: str | None = None,
    end_date: str | None = None,
):
    query = db.query(ParkingLog)

    if start_date or end_date:
        query = _apply_datetime_range(query, ParkingLog.created_at, start_date, end_date)
    else:
        start_dt, end_dt = _get_period_range(period)
        query = _apply_datetime_range_by_dt(query, ParkingLog.created_at, start_dt, end_dt)

    rows = query.order_by(ParkingLog.created_at.desc()).limit(limit).all()

    result = []
    for row in rows:
        result.append(
            {
                "log_id": row.log_id,
                "car_number": row.car_number,
                "event_type": row.event_type,
                "time": row.created_at,
            }
        )

    return result

## 통계 데이터를 요청
def get_statistics(
    db: Session,
    period: str = "week",
    start_date: str | None = None,
    end_date: str | None = None,
):
    custom_chart = None
    selected_period_chart = None

    if period == "custom":
        custom_chart = _build_custom_entry_exit_chart(db, start_date, end_date)
    elif start_date or end_date:
        selected_period_chart = _build_entry_exit_chart_by_range(db, period, start_date, end_date)

    day_chart = _build_entry_exit_chart(db, "day")
    week_chart = _build_entry_exit_chart(db, "week")
    month_chart = _build_entry_exit_chart(db, "month")

    if selected_period_chart is not None:
        if period == "day":
            day_chart = selected_period_chart
        elif period == "week":
            week_chart = selected_period_chart
        elif period == "month":
            month_chart = selected_period_chart

    return {
        "charts": {
            "day": day_chart,
            "week": week_chart,
            "month": month_chart,
            "custom": custom_chart,
            "violation_ratio": _build_violation_ratio_by_period(
                db,
                period=period,
                start_date=start_date,
                end_date=end_date,
            ),
        },
        "recent_logs": _build_recent_logs_by_period(
            db,
            period=period,
            limit=200,
            start_date=start_date,
            end_date=end_date,
        ),
    }

## 그래프 없이 최근 로그만 사용할때
def get_recent_logs_only(
    db: Session,
    period: str = "week",
    start_date: str | None = None,
    end_date: str | None = None,
):
    return _build_recent_logs_by_period(
        db,
        period=period,
        limit=200,
        start_date=start_date,
        end_date=end_date,
    )
