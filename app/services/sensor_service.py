from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.active_parking_crud import get_active_by_car, get_active_by_rfid
from app.crud.parking_slot_crud import (
    get_slot_by_reader_uid,
    get_slot_by_weight_sensor,
    update_slot_status,
)
from app.crud.vehicle_crud import get_vehicle_by_rfid
from app.crud.violation_crud import create_violation


## 무게센서 이벤트 (빈자리/점유/장애인 검증 넘김)
def handle_weight_sensor(
    db: Session,
    sensor_uid: str,
    occupied: bool,
    car_number: str | None = None,
):
    slot = get_slot_by_weight_sensor(db, sensor_uid)

    if not slot:
        raise HTTPException(status_code=404, detail="해당 무게센서와 연결된 주차구역이 없습니다.")

    if not occupied:
        update_slot_status(db, slot, "빈자리")
        return {
            "message": "빈자리 처리 완료",
            "slot_id": slot.slot_id,
            "status": "빈자리",
        }

    if slot.slot_type == "GENERAL":
        update_slot_status(db, slot, "점유")
        return {
            "message": "일반 주차구역 점유 처리 완료",
            "slot_id": slot.slot_id,
            "status": "점유",
        }

    if slot.slot_type == "DISABLED":
        if car_number:
            active = get_active_by_car(db, car_number)
            if not active:
                raise HTTPException(status_code=404, detail="입차 기록이 없는 차량입니다.")

        update_slot_status(db, slot, "점유")

        return {
            "message": "장애인 주차구역 점유 감지, RFID 검증 대기",
            "slot_id": slot.slot_id,
            "status": "점유",
        }

    raise HTTPException(status_code=400, detail="잘못된 주차구역 유형입니다.")


## 장애인 주차구역 RFID 검사
def handle_rfid_sensor(
    db: Session,
    reader_uid: str,
    rfid_uid: str | None,
):
    slot = get_slot_by_reader_uid(db, reader_uid)

    if not slot:
        raise HTTPException(status_code=404, detail="해당 RFID 리더기와 연결된 주차구역이 없습니다.")

    if slot.slot_type != "DISABLED":
        raise HTTPException(status_code=400, detail="장애인 주차구역이 아닙니다.")

    if rfid_uid is None or str(rfid_uid).strip().upper() == "NO_TAG":
        update_slot_status(db, slot, "이상")

        create_violation(
            db,
            {
                "car_number": None,
                "rfid_uid": None,
                "violation_type": "미인식",
                "slot_id": slot.slot_id,
                "handler_id": None,
                "status": "미처리",
                "action": "RFID 태그 미인식",
                "action_time": None,
            },
        )

        return {
            "message": "RFID 미인식 위반 처리 완료",
            "slot_id": slot.slot_id,
            "status": "이상",
            "violation_type": "미인식",
        }

    active = get_active_by_rfid(db, rfid_uid)

    if not active:
        vehicle = get_vehicle_by_rfid(db, rfid_uid)

        update_slot_status(db, slot, "이상")

        create_violation(
            db,
            {
                "car_number": vehicle.car_number if vehicle else None,
                "rfid_uid": rfid_uid,
                "violation_type": "불일치",
                "slot_id": slot.slot_id,
                "handler_id": None,
                "status": "미처리",
                "action": "입차 기록에 없는 RFID 감지",
                "action_time": None,
            },
        )

        return {
            "message": "RFID 불일치 위반 처리 완료",
            "slot_id": slot.slot_id,
            "violation_type": "불일치",
        }

    vehicle = get_vehicle_by_rfid(db, rfid_uid)

    if not vehicle:
        update_slot_status(db, slot, "이상")

        create_violation(
            db,
            {
                "car_number": active.car_number,
                "rfid_uid": rfid_uid,
                "violation_type": "불일치",
                "slot_id": slot.slot_id,
                "handler_id": None,
                "status": "미처리",
                "action": "disabled_vehicle에 등록되지 않은 RFID",
                "action_time": None,
            },
        )

        return {
            "message": "RFID 불일치 위반 처리 완료",
            "slot_id": slot.slot_id,
            "violation_type": "불일치",
        }

    if vehicle.expire_date < datetime.now():
        active.status = "기간만료"
        db.commit()

        update_slot_status(db, slot, "이상")

        create_violation(
            db,
            {
                "car_number": active.car_number,
                "rfid_uid": rfid_uid,
                "violation_type": "기간만료",
                "slot_id": slot.slot_id,
                "handler_id": None,
                "status": "미처리",
                "action": "RFID 사용 기간 만료",
                "action_time": None,
            },
        )

        return {
            "message": "기간만료 위반 처리 완료",
            "slot_id": slot.slot_id,
            "violation_type": "기간만료",
        }

    update_slot_status(db, slot, "점유")

    return {
        "message": "정상 주차 처리 완료",
        "slot_id": slot.slot_id,
        "status": "점유",
        "car_number": active.car_number,
        "rfid_uid": rfid_uid,
    }


## 일정 시간 내 RFID 응답이 없을 때 (장비이상)
def handle_rfid_timeout(
    db: Session,
    reader_uid: str,
):
    slot = get_slot_by_reader_uid(db, reader_uid)

    if not slot:
        raise HTTPException(status_code=404, detail="해당 RFID 리더기와 연결된 주차구역이 없습니다.")

    if slot.slot_type != "DISABLED":
        raise HTTPException(status_code=400, detail="장애인 주차구역이 아닙니다.")

    update_slot_status(db, slot, "이상")

    create_violation(
        db,
        {
            "car_number": None,
            "rfid_uid": None,
            "violation_type": "장비이상",
            "slot_id": slot.slot_id,
            "handler_id": None,
            "status": "미처리",
            "action": "1분 이내 RFID 응답 없음",
            "action_time": None,
        },
    )

    return {
        "message": "장비이상 처리 완료",
        "slot_id": slot.slot_id,
        "violation_type": "장비이상",
    }