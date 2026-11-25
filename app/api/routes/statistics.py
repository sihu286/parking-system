from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.statistics_service import get_statistics, get_recent_logs_only

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

##그래프 관련


@router.get("")
def statistics(
    period: str = Query(default="week"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_statistics(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/recent-logs")
def statistics_recent_logs(
    period: str = Query(default="week"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return {
        "recent_logs": get_recent_logs_only(
            db,
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    }
