from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.parking_slot import ParkingSlotResponse
from app.schemas.violation import ViolationResponse


class ActiveParkingResponse(BaseModel):
    car_number: str
    entry_time: datetime
    rfid_uid: Optional[str] = None
    status: str

    model_config = {"from_attributes": True}


class MonitoringResponse(BaseModel):
    parking_slots: list[ParkingSlotResponse]
    active_parkings: list[ActiveParkingResponse]
    violations: list[ViolationResponse]