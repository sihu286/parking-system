from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.entry_exit import EntryRequest, EntryExitResponse, ExitRequest
from app.services.entry_exit_service import entry_vehicle, exit_vehicle

router = APIRouter(prefix="/entry-exit", tags=["entry_exit"])

## 입차
@router.post("/entry", response_model=EntryExitResponse)
def entry(request: EntryRequest, db: Session = Depends(get_db)):
    return entry_vehicle(db, request.car_number)

## 출차
@router.post("/exit", response_model=EntryExitResponse)
def exit_(request: ExitRequest, db: Session = Depends(get_db)):
    return exit_vehicle(db, request.car_number)