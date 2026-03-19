from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as json_router
from app.html.routes import router as html_router

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(json_router)
app.include_router(html_router)
