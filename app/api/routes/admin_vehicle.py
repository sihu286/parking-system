from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.disabled_vehicle import DisabledVehicleCreate, DisabledVehicleResponse
from app.services.admin_vehicle_service import (
    get_vehicle_list,
    register_vehicle,
    ###remove_vehicle,
)

router = APIRouter(prefix="/api/admin/vehicles", tags=["admin_vehicle"])

## 장애인 차량 전체 조회
@router.get("", response_model=list[DisabledVehicleResponse])
def vehicle_list(db: Session = Depends(get_db)):
    return get_vehicle_list(db)

## 차량 등록
@router.post("", response_model=DisabledVehicleResponse)
def create_vehicle(request: DisabledVehicleCreate, db: Session = Depends(get_db)):
    return register_vehicle(db, request.model_dump())

## 차량 수정 <--- 나증에 뺄거
## 특정 항목을 향한 기능이기에 경로 설정
# @router.put("/{rfid_uid}", response_model=DisabledVehicleResponse)
# def edit_vehicle(rfid_uid: str, request: DisabledVehicleCreate, db: Session = Depends(get_db)):
#     return update_registered_vehicle(db, rfid_uid, request.model_dump())

# ## 차량 삭제
# @router.delete("/{rfid_uid}")
# def delete_vehicle(rfid_uid: str, db: Session = Depends(get_db)):
#     return remove_vehicle(db, rfid_uid)