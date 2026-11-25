from typing import Optional

from pydantic import BaseModel


class WeightSensorEvent(BaseModel):
    sensor_uid: str
    occupied: bool
    car_number: Optional[str] = None

## 수정함
class RfidSensorEvent(BaseModel):
    reader_uid: str
    rfid_uid: Optional[str] = None


class RfidTimeoutEvent(BaseModel):
    reader_uid: str