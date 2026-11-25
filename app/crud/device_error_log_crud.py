from sqlalchemy.orm import Session
from app.models.device_error_log import DeviceErrorLog


def get_all_device_error_logs(db: Session):
    return db.query(DeviceErrorLog).order_by(
        DeviceErrorLog.detected_at.desc()
    ).all()


def get_device_error_log_by_id(db: Session, error_id: int):
    return db.query(DeviceErrorLog).filter(
        DeviceErrorLog.error_id == error_id
    ).first()


def create_device_error_log(db: Session, log: DeviceErrorLog):
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def save_device_error_log(db: Session, log: DeviceErrorLog):
    db.commit()
    db.refresh(log)
    return log