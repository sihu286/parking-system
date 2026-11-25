from datetime import datetime

from pydantic import BaseModel


class DisabledVehicleCreate(BaseModel):
    rfid_uid: str
    car_number: str | None = None
    owner_name: str | None = None
    disabled_person_name: str | None = None
    expire_date: datetime


class DisabledVehicleResponse(BaseModel):
    rfid_uid: str
    car_number: str | None = None
    owner_name: str | None = None
    disabled_person_name: str | None = None
    created_at: datetime | None = None
    expire_date: datetime

    model_config = {"from_attributes": True}