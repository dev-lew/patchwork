import logging
import os
import sys
from collections.abc import Sequence
from typing import Annotated

from fastapi import Depends, FastAPI
from sqlalchemy.exc import MultipleResultsFound
from sqlmodel import Session, create_engine, select

from app.models import Product

if (postgres_url := os.getenv("POSTGRES_URL")) is None:
    sys.exit("The POSTGRES_URL env variable must be set.")

logging.basicConfig(
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

logger = logging.getLogger(__name__)

engine = create_engine(postgres_url)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()


@app.get("/products")
async def get_products(session: SessionDep) -> Sequence[Product]:
    return session.exec(select(Product)).all()


@app.get("/product/{id_}")
async def get_product(id_: str, session: SessionDep) -> Product | None:
    try:
        return session.exec(select(Product).where(Product.id == id_)).one_or_none()
    except MultipleResultsFound:
        logger.exception("Multiple products found with id=%s.", id_)
