from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.sensor import RfidSensorEvent, RfidTimeoutEvent, WeightSensorEvent
from app.schemas.sensor_response import WeightResponse, RfidResponse, TimeoutResponse
from app.services.sensor_service import (
    handle_rfid_sensor,
    handle_rfid_timeout,
    handle_weight_sensor,
)

router = APIRouter(prefix="/sensor", tags=["sensor"])

## 무게센서 관련
@router.post("/weight", response_model=WeightResponse)
def weight_sensor(request: WeightSensorEvent, db: Session = Depends(get_db)):
    return handle_weight_sensor(
        db=db,
        sensor_uid=request.sensor_uid,
        occupied=request.occupied,
        car_number=request.car_number,
    )

## RFID관련
@router.post("/rfid", response_model=RfidResponse)
def rfid_sensor(request: RfidSensorEvent, db: Session = Depends(get_db)):
    return handle_rfid_sensor(
        db=db,
        reader_uid=request.reader_uid,
        rfid_uid=request.rfid_uid,
    )

## 장비이상 관련
@router.post("/rfid-timeout", response_model=TimeoutResponse)
def rfid_timeout(request: RfidTimeoutEvent, db: Session = Depends(get_db)):
    return handle_rfid_timeout(
        db=db,
        reader_uid=request.reader_uid,
    )