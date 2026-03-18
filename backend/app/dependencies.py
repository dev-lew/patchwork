import os
import secrets
import sys
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import APIKeyHeader
from sqlmodel import Session, create_engine

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
