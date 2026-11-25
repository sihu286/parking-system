from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.crud.vehicle_crud import (
    create_vehicle,
    # delete_vehicle,
    get_all_vehicles,
    get_vehicle_by_rfid,
    # update_vehicle,
)
## from app.crud.active_parking_crud import delete_active_by_rfid


def get_vehicle_list(db: Session):
    return get_all_vehicles(db)


## 만료일자 관련
def _validate_expire_date(expire_date):
    if not expire_date:
        raise HTTPException(status_code=400, detail="만료일자는 필수입니다.")

    if isinstance(expire_date, str):
        try:
            expire_date = datetime.fromisoformat(expire_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="만료일자 형식이 올바르지 않습니다.")

    if expire_date.date() < datetime.now().date():
        raise HTTPException(status_code=400, detail="만료일자는 현재 날짜보다 과거일 수 없습니다.")


## 장애인 차량 등록
def register_vehicle(db: Session, data: dict):
    _validate_expire_date(data.get("expire_date"))

    exists = get_vehicle_by_rfid(db, data["rfid_uid"])
    if exists:
        raise HTTPException(status_code=400, detail="이미 등록된 RFID입니다.")

    return create_vehicle(db, data)


## 수정기능 없앨거임 나중에 없애기
# def update_registered_vehicle(db: Session, rfid_uid: str, data: dict):
#     vehicle = get_vehicle_by_rfid(db, rfid_uid)
#     if not vehicle:
#         raise HTTPException(status_code=404, detail="등록된 차량이 없습니다.")
#
#     if "expire_date" in data:
#         _validate_expire_date(data.get("expire_date"))
#
#     data["rfid_uid"] = rfid_uid
#     return update_vehicle(db, vehicle, data)


# def remove_vehicle(db: Session, rfid_uid: str):
#     vehicle = get_vehicle_by_rfid(db, rfid_uid)
#     if not vehicle:
#         raise HTTPException(status_code=404, detail="등록된 차량이 없습니다.")
#
#     delete_active_by_rfid(db, rfid_uid)
#
#     delete_vehicle(db, rfid_uid)
#     return {"message": "차량 삭제 완료"}