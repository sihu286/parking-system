from datetime import datetime

from pydantic import BaseModel


class ViolationResponse(BaseModel):
    violation_id: int
    car_number: str | None = None
    rfid_uid: str | None = None
    violation_type: str
    detected_at: datetime | None = None
    slot_id: str | None = None
    handler_id: str | None = None
    status: str
    action: str | None = None
    action_time: datetime | None = None

    model_config = {"from_attributes": True}


class ViolationProcessRequest(BaseModel):
    handler_id: str
    status: str
    action: str