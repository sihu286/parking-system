from sqlalchemy.orm import Session
from app.models.parking_slot import ParkingSlot


def get_all_slots(db: Session):
    return db.query(ParkingSlot).all()


def get_slot_by_id(db: Session, slot_id: str):
    return db.query(ParkingSlot).filter(
        ParkingSlot.slot_id == slot_id
    ).first()


def get_slot_by_weight_sensor(db: Session, sensor_uid: str):
    return db.query(ParkingSlot).filter(
        ParkingSlot.weight_sensor_uid == sensor_uid
    ).first()


def get_slot_by_reader_uid(db: Session, reader_uid: str):
    return db.query(ParkingSlot).filter(
        ParkingSlot.rfid_reader_uid == reader_uid
    ).first()


def update_slot_status(db: Session, slot: ParkingSlot, status: str):
    slot.status = status
    db.commit()
    db.refresh(slot)
    return slot