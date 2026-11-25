from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.active_parking_crud import (
    delete_active,
    get_active_by_car,
    get_overtime_targets,
    restore_active_status,
)
from app.crud.violation_crud import create_violation

## 24시간 초과 주차로 카메라 인식 오류 의심
def check_overtime_vehicles(db: Session):
    기준시각 = datetime.now() - timedelta(hours=24) ##1일전 시간
    targets = get_overtime_targets(db, 기준시각) ##입차 시간이 기준시각보다 오래된 차량

    updated_cars = [] ##24시간 초과된 차량들 모음

    for target in targets:
        target.status = "24시간 초과"

        create_violation(
            db,
            {
                "car_number": target.car_number,
                "rfid_uid": None,
                "violation_type": "24시간초과",
                "slot_id": None,
                "handler_id": None, ##처리자
                "status": "미처리",
                "action": "입차 후 24시간 초과",
                "action_time": None,
            },
        )

        updated_cars.append(target.car_number)

    db.commit()

    return {
        "checked_count": len(targets),
        "updated_cars": updated_cars,
    }


def restore_overtime_vehicle(db: Session, car_number: str):
    target = get_active_by_car(db, car_number)
    if not target:
        raise HTTPException(status_code=404, detail="해당 차량의 active_parking 정보가 없습니다.")

##실제 장기 주차였을 경우 복구 처리
    restore_active_status(db, target)
    return {
        "message": "active_parking 상태를 정상으로 변경했습니다.",
        "car_number": target.car_number,
        "status": target.status,
    }

## 카메라 오류였을 경우 주차 목록에서 삭제
def remove_overtime_vehicle(db: Session, car_number: str):
    target = get_active_by_car(db, car_number)
    if not target:
        raise HTTPException(status_code=404, detail="해당 차량의 active_parking 정보가 없습니다.")

    delete_active(db, target)
    return {
        "message": "active_parking 정보를 삭제했습니다.",
        "car_number": car_number,
    }
