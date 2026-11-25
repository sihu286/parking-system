from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.monitoring import MonitoringResponse
from app.services.monitoring_service import get_monitoring_data

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

## 모니터링
@router.get("", response_model=MonitoringResponse)
def monitoring(db: Session = Depends(get_db)):
    return get_monitoring_data(db)
