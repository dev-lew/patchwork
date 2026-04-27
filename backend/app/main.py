from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as json_router
from app.html.routes import router as html_router

app = FastAPI()


@app.middleware("http")
async def persist_session_cookie(request: Request, call_next):
    response = await call_next(request)
    session_id = getattr(request.state, "session_id_cookie", None)

    if session_id is not None:
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            samesite="strict",
        )

    return response


app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(json_router)
app.include_router(html_router)
