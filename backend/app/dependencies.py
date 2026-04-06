import datetime as dt
import os
import secrets
import sys
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException
from fastapi.security import APIKeyHeader
from sqlmodel import Session, create_engine, select

from app.models import User, UserSession

if (POSTGRES_URL := os.getenv("POSTGRES_URL")) is None:
    sys.exit("The POSTGRES_URL env variable must be set.")

if (API_KEY := os.getenv("API_KEY")) is None:
    sys.exit("The API_KEY env variable must be set.")

engine = create_engine(POSTGRES_URL)


def get_session():
    with Session(engine) as session:
        yield session


def auth_api_key(api_key: Annotated[str, Depends(APIKeyHeader(name="api-key"))]):
    if not secrets.compare_digest(api_key, API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")


SessionDep = Annotated[Session, Depends(get_session)]
AuthDep = Annotated[str, Depends(auth_api_key)]


def get_current_user(
    session: SessionDep, user_session_id: Annotated[str | None, Cookie()] = None
):
    if user_session_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_session = session.get(UserSession, user_session_id)

    if user_session is None:
        raise HTTPException(status_code=401, detail="Invalid session")

    if user_session.expires_at > dt.datetime.now():
        query = select(UserSession).where(UserSession.id == user_session.id)
        session.exec(query).all()

        raise HTTPException(status_code=401, detail="Session expired")

    current_user = session.get(User, user_session.username)

    return current_user


UserSessionDep = Annotated[User, Depends(get_current_user)]
