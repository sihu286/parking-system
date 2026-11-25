from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.active_parking_crud import create_active, delete_active, get_active_by_car
from app.crud.parking_log_crud import create_parking_log
from app.crud.vehicle_crud import get_vehicle_by_number

##입차로직
def entry_vehicle(db: Session, car_number: str):
    active = get_active_by_car(db, car_number)
    if active:
        raise HTTPException(status_code=400, detail="이미 입차된 차량입니다.")

    #입차시 카메라가 읽은 차량번호로 disabled_vehicle에서 차량번호 조회
    vehicle = get_vehicle_by_number(db, car_number)

    ##일반차량의 경우
    rfid_uid = None
    status = "정상"

    ##장애인 차량 로직
    if vehicle:
        rfid_uid = vehicle.rfid_uid
        if vehicle.expire_date < datetime.now(): ##유효기관 확인
            status = "기간만료"

    create_parking_log(db, car_number, "IN")

    create_active(
        db,
        {
            "car_number": car_number,
            "entry_time": datetime.now(),
            "rfid_uid": rfid_uid,
            "status": status,
        },
    )

    return {
        "message": "입차 처리 완료",
        "car_number": car_number
    }

## 출차 로직
def exit_vehicle(db: Session, car_number: str):
    active = get_active_by_car(db, car_number)
    if not active:
        raise HTTPException(status_code=404, detail="현재 입차 중인 차량이 아닙니다.")

    create_parking_log(db, car_number, "OUT")
    delete_active(db, active)

    return {
        "message": "출차 처리 완료",
        "car_number": car_number
    }