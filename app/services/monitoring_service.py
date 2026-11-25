from sqlalchemy.orm import Session

from app.crud.active_parking_crud import get_all_active
from app.crud.parking_slot_crud import get_all_slots
from app.crud.violation_crud import get_all_violations


##이걸로 프론트 출력
def get_monitoring_data(db: Session):
    slots = get_all_slots(db)
    actives = get_all_active(db)
    violations = get_all_violations(db)

    return {
        "parking_slots": slots, ##자리상태
        "active_parkings": actives, ##주차장 등어온 차량
        "violations": violations, ##이상 상황
    }