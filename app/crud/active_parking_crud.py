from sqlalchemy.orm import Session
from app.models.active_parking import ActiveParking


def get_active_by_car(db: Session, car_number: str):
    return db.query(ActiveParking).filter(
        ActiveParking.car_number == car_number
    ).first() ## 첫번째 꺼만 가져옴, 필요한건가?

def get_active_by_rfid(db: Session, rfid_uid: str):
    return db.query(ActiveParking).filter(
        ActiveParking.rfid_uid == rfid_uid
    ).first()


def create_active(db: Session, data: dict):
    obj = ActiveParking(**data) ##딕셔너리의 key-value를 함수 인자처럼 풀어 넣는 문법
    db.add(obj)
    db.commit()
    db.refresh(obj) ##DB 기준으로 다시 읽어오기
    return obj


def delete_active(db: Session, obj):
    db.delete(obj)
    db.commit()


def get_all_active(db: Session):
    return db.query(ActiveParking).all()


def get_overtime_targets(db: Session, 기준시각):
    return db.query(ActiveParking).filter(
        ActiveParking.entry_time < 기준시각,
        ActiveParking.status != "24시간 초과"
    ).all()




def restore_active_status(db: Session, obj):
    obj.status = "정상"
    db.commit()
    db.refresh(obj)
    return obj
