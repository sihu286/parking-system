from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.abnormal_event import router as abnormal_router
from app.api.routes.statistics import router as statistics_router
from app.api.routes.admin_vehicle import router as admin_vehicle_router
from app.api.routes.sensor import router as sensor_router
from app.api.routes.entry_exit import router as entry_exit_router
from app.api.routes.overtime import router as overtime_router
from app.api.routes.device_error_log import router as device_error_log_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(monitoring_router)
api_router.include_router(abnormal_router)
api_router.include_router(statistics_router)
api_router.include_router(admin_vehicle_router)

# 누락되어 있던 라우터들
api_router.include_router(sensor_router)
api_router.include_router(entry_exit_router)
api_router.include_router(overtime_router)

api_router.include_router(device_error_log_router)