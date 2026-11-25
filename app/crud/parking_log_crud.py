from sqlalchemy.orm import Session
from app.models.parking_log import ParkingLog


def create_parking_log(db: Session, car_number: str, event_type: str):
    log = ParkingLog(
        car_number=car_number,
        event_type=event_type
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_logs(db: Session):
    return db.query(ParkingLog).all()