from sqlalchemy.orm import Session
from app.models.violation import Violation


def get_same_violation(db: Session, car, rfid, slot, vtype):
    return db.query(Violation).filter(
        Violation.car_number == car,
        Violation.rfid_uid == rfid,
        Violation.slot_id == slot,
        Violation.violation_type == vtype,
        Violation.status.in_(["미처리", "처리중"])
    ).first()


def create_violation(db: Session, data: dict):
    exist = get_same_violation(
        db,
        data.get("car_number"),
        data.get("rfid_uid"),
        data.get("slot_id"),
        data.get("violation_type")
    )

    if exist:
        return exist

    obj = Violation(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_all_violations(db: Session):
    return db.query(Violation).order_by(
        Violation.detected_at.desc()
    ).all()


def get_active_violations(db: Session):
    return db.query(Violation).filter(
        Violation.status.in_(["미처리", "처리중"])
    ).order_by(
        Violation.detected_at.desc()
    ).all()


def get_violation_by_id(db: Session, violation_id: int):
    return db.query(Violation).filter(
        Violation.violation_id == violation_id
    ).first()


def save_violation(db: Session, violation: Violation):
    db.commit()
    db.refresh(violation)
    return violation

