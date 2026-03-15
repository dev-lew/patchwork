import logging
import os
import secrets
import sys
from collections.abc import Sequence
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.security import APIKeyHeader
from sqlalchemy.exc import MultipleResultsFound
from sqlmodel import Session, create_engine, select

from app.enums import Category
from app.models import Product

if (POSTGRES_URL := os.getenv("POSTGRES_URL")) is None:
    sys.exit("The POSTGRES_URL env variable must be set.")

if (API_KEY := os.getenv("API_KEY")) is None:
    sys.exit("The API_KEY env variable must be set.")

logging.basicConfig(
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger(__name__)

engine = create_engine(POSTGRES_URL)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def auth_api_key(api_key: Annotated[str, Depends(APIKeyHeader(name="api-key"))]):
    if not secrets.compare_digest(api_key, API_KEY):
        raise HTTPException(status_code=403, detail="Invalid API key")


app = FastAPI()


@app.get("/products")
async def get_products(
    session: SessionDep, categories: Annotated[list[Category] | None, Query()] = None
) -> Sequence[Product]:
    query = select(Product)

    if categories is not None:
        query = query.where(Product.categories.overlap(categories))

    return session.exec(query).all()


@app.get("/product/{id_}")
async def get_product(id_: str, session: SessionDep) -> Product | None:
    try:
        return session.exec(select(Product).where(Product.id_ == id_)).one_or_none()
    except MultipleResultsFound:
        logger.exception("Multiple products found with id=%s.", id_)
