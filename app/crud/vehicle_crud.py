from sqlalchemy.orm import Session
from app.models.disabled_vehicle import DisabledVehicle


def get_vehicle_by_rfid(db: Session, rfid_uid: str):
    return db.query(DisabledVehicle).filter(
        DisabledVehicle.rfid_uid == rfid_uid
    ).first()


def get_vehicle_by_number(db: Session, car_number: str):
    return db.query(DisabledVehicle).filter(
        DisabledVehicle.car_number == car_number
    ).first()

## 등록 순서대로 정렬
def get_all_vehicles(db: Session):
    return db.query(DisabledVehicle).order_by(
        DisabledVehicle.created_at.desc()
    ).all()


def create_vehicle(db: Session, data: dict):
    vehicle = DisabledVehicle(**data)
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

#
# def update_vehicle(db: Session, vehicle: DisabledVehicle, data: dict):
#     for key, value in data.items():
#         setattr(vehicle, key, value)
#
#     db.commit()
#     db.refresh(vehicle)
#     return vehicle
#
#
# def delete_vehicle(db: Session, rfid_uid: str):
#     vehicle = get_vehicle_by_rfid(db, rfid_uid)
#     if vehicle:
#         db.delete(vehicle)
#         db.commit()