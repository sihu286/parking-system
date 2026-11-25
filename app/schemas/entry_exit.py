from pydantic import BaseModel


class EntryRequest(BaseModel):
    car_number: str


class ExitRequest(BaseModel):
    car_number: str


class EntryExitResponse(BaseModel):
    message: str
    car_number: str