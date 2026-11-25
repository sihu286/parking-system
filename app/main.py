from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import api_router

app = FastAPI()

templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(api_router)


def render_page(request: Request, template_name: str):
    return templates.TemplateResponse(
        request=request,
        name=template_name,
        context={}
    )


@app.get("/", response_class=HTMLResponse)
def dashboard_page(request: Request):
    return render_page(request, "dashboard.html")


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request):
    return render_page(request, "login.html")


@app.get("/monitoring", response_class=HTMLResponse)
def monitoring_page(request: Request):
    return render_page(request, "monitoring.html")


@app.get("/abnormal", response_class=HTMLResponse)
def abnormal_page(request: Request):
    return render_page(request, "abnormal.html")

@app.get("/device-error", response_class=HTMLResponse)
def device_error_page(request: Request):
    return render_page(request, "device_error.html")


@app.get("/statistics", response_class=HTMLResponse)
def statistics_page(request: Request):
    return render_page(request, "statistics.html")


@app.get("/registration", response_class=HTMLResponse)
def registration_page(request: Request):
    return render_page(request, "registration.html")


@app.get("/index", response_class=HTMLResponse)
def index_redirect():
    return RedirectResponse(url="/login", status_code=302)


@app.get("/test")
def test():
    return {"message": "서버 정상 동작 중"}