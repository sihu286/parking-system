from pydantic import BaseModel
from typing import Optional


class WeightResponse(BaseModel):
    message: str
    slot_id: str
    status: str


class RfidResponse(BaseModel):
    message: str
    slot_id: str
    status: Optional[str] = None
    violation_type: Optional[str] = None


class TimeoutResponse(BaseModel):
    message: str
    slot_id: str
    violation_type: str