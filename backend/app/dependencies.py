import datetime as dt
import os
import secrets
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Response
from fastapi.security import APIKeyHeader
from sqlmodel import Session, create_engine, select

from app.models import User, UserSession

POSTGRES_URL = os.getenv("POSTGRES_URL")
API_KEY = os.getenv("API_KEY", "dev-api-key")
engine = create_engine(POSTGRES_URL) if POSTGRES_URL else None


def get_session():
    if engine is None:
        raise HTTPException(
            status_code=503,
            detail="Database is not configured. Set POSTGRES_URL to enable this endpoint.",
        )

    with Session(engine) as session:
        yield session


def auth_api_key(api_key: Annotated[str, Depends(APIKeyHeader(name="api-key"))]):
    if not secrets.compare_digest(api_key, API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")


SessionDep = Annotated[Session, Depends(get_session)]
AuthDep = Annotated[str, Depends(auth_api_key)]


def get_current_session(
    session: SessionDep,
    response: Response,
    user_session_id: Annotated[str | None, Cookie()] = None,
) -> UserSession:
    if user_session_id is None:
        user_session = UserSession(
            id=secrets.token_urlsafe(),
            username=None,
            expires_at=dt.datetime.now() + dt.timedelta(days=1),
        )

        session.add(user_session)
        session.commit()

        response.set_cookie(
            key="session_id",
            value=user_session.id,
            httponly=True,
            samesite="strict",
        )

        return user_session

    user_session = session.get(UserSession, user_session_id)

    if user_session is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    if user_session.expires_at < dt.datetime.now():
        session.delete(user_session)

        raise HTTPException(status_code=401, detail="Session expired")

    return user_session


UserSessionDep = Annotated[UserSession, Depends(get_current_session)]
