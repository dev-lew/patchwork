import datetime as dt
import os
import secrets
import sys
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Response
from fastapi.security import APIKeyHeader
from sqlmodel import Session, create_engine

from dotenv import load_dotenv
import os

load_dotenv()

from app.models import UserSession

if (POSTGRES_URL := os.getenv("POSTGRES_URL")) is None:
    sys.exit("The POSTGRES_URL env variable must be set.")

if (API_KEY := os.getenv("API_KEY")) is None:
    sys.exit("The API_KEY env variable must be set.")

engine = create_engine(POSTGRES_URL, pool_pre_ping=True)


def get_session():
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
    session_id: Annotated[str | None, Cookie()] = None,
) -> UserSession:
    if session_id is None:
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

    user_session = session.get(UserSession, session_id)

    if user_session is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    if user_session.expires_at < dt.datetime.now():
        session.delete(user_session)

        raise HTTPException(status_code=401, detail="Session expired")

    return user_session


UserSessionDep = Annotated[UserSession, Depends(get_current_session)]