from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.device_error_log_service import (
    get_all_device_error_list,
    get_device_error_summary,
    update_device_error_status,
    create_device_error,
)


router = APIRouter(prefix="/api/device-error-logs", tags=["device-error-logs"])


class DeviceErrorUpdateRequest(BaseModel):
    status: str
    action: str | None = None
    role: str | None = None

class DeviceErrorCreateRequest(BaseModel):
    device_type: str
    device_uid: str
    error_code: str
    error_detail: str | None = None

@router.get("")
def device_error_list(
    period: str = Query(default="week"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_all_device_error_list(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/summary")
def device_error_summary(
    period: str = Query(default="week"),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_device_error_summary(
        db,
        period=period,
        start_date=start_date,
        end_date=end_date,
    )

@router.post("")
def device_error_create(
    data: DeviceErrorCreateRequest,
    db: Session = Depends(get_db),
):
    return create_device_error(
        db=db,
        device_type=data.device_type,
        device_uid=data.device_uid,
        error_code=data.error_code,
        error_detail=data.error_detail,
    )

@router.patch("/{error_id}")
def device_error_update(
    error_id: int,
    data: DeviceErrorUpdateRequest,
    db: Session = Depends(get_db),
):



    if data.role == "ADMIN":
        raise HTTPException(status_code=403, detail="관리자는 조회만 가능합니다.")

    if data.status not in ["미처리", "처리중", "완료"]:
        raise HTTPException(status_code=400, detail="유효하지 않은 상태값입니다.")

    updated = update_device_error_status(
        db=db,
        error_id=error_id,
        status=data.status,
        action=data.action,
    )

    if not updated:
        raise HTTPException(status_code=404, detail="장비이상 로그를 찾을 수 없습니다.")

    return updated