from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.services.overtime_service import (
    check_overtime_vehicles,
    remove_overtime_vehicle,
    restore_overtime_vehicle,
)

router = APIRouter(prefix="/active-parking", tags=["active_parking"])

## 24시간 초과 차량 검사
@router.post("/check-overtime")
def check_overtime(db: Session = Depends(get_db)):
    return check_overtime_vehicles(db)

## 상태 복구
@router.patch("/{car_number}/restore")
def restore_active_parking(car_number: str, db: Session = Depends(get_db)):
    return restore_overtime_vehicle(db, car_number)

## active_parking에서 제거
@router.delete("/{car_number}")
def delete_active_parking(car_number: str, db: Session = Depends(get_db)):
    return remove_overtime_vehicle(db, car_number)
