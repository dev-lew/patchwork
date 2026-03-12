import os
import sys
from typing import Annotated, Sequence

from fastapi import Depends, FastAPI
from sqlmodel import Session, create_engine, select

from app.models import Product

if (postgres_url := os.getenv("POSTGRES_URL")) is None:
    sys.exit("The POSTGRES_URL env variable must be set.")

engine = create_engine(postgres_url)


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]

app = FastAPI()


@app.get("/products")
async def get_products(session: SessionDep) -> Sequence[Product]:
    return session.exec(select(Product)).all()
