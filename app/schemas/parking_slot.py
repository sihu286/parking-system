from pydantic import BaseModel


class ParkingSlotResponse(BaseModel):
    slot_id: str
    slot_type: str
    weight_sensor_uid: str | None = None
    rfid_reader_uid: str | None = None
    status: str

    model_config = {"from_attributes": True}