import logging
import os
import secrets
import sys
from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.security import APIKeyHeader
from pydantic import EmailStr, NonNegativeInt
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, create_engine, select

from app.enums import Category
from app.models import Cart, CartItem, NewCart, NewCartItem, NewUser, Product, User

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


AuthDep = Annotated[str, Depends(auth_api_key)]


app = FastAPI()


@app.get("/products")
async def get_products(
    session: SessionDep, categories: Annotated[list[Category] | None, Query()] = None
) -> Sequence[Product]:
    query = select(Product)

    if categories is not None:
        query = query.where(Product.categories.overlap(categories))

    return session.exec(query).all()


@app.get("/products/{id}")
async def get_product(id: str, session: SessionDep) -> Product:
    product = session.get(Product, id)

    if product is None:
        raise HTTPException(status_code=404, detail="User not found")

    return product


@app.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    user: NewUser, session: SessionDep, response: Response, _: AuthDep
):
    session.add(User(**user.model_dump()))
    session.commit()

    response.headers["Location"] = f"/users/{user.id}"


@app.get("/users/{id}")
async def get_user(id: str, session: SessionDep) -> User:
    user = session.get(User, id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@app.patch("/users/{id}")
async def update_user_email(id: str, email: EmailStr, session: SessionDep, _: AuthDep):
    user = session.get(User, id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.email = email


@app.delete("/users/{id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(id: str, session: SessionDep, _: AuthDep):
    user = session.get(User, id)

    if user is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    session.delete(user)
    session.commit()


@app.post("/carts", status_code=status.HTTP_201_CREATED)
async def create_cart(
    cart: NewCart, response: Response, session: SessionDep, _: AuthDep
):
    session.add(Cart(**cart.model_dump()))
    session.commit()

    response.headers["Location"] = f"/carts/{cart.id}"


@app.get("/carts/{id}")
async def get_cart(id: UUID, session: SessionDep, _: AuthDep) -> Cart:
    cart = session.get(Cart, id)

    if cart is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    return cart


@app.delete("/carts/{id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart(id: UUID, session: SessionDep, _: AuthDep):
    cart = session.get(Cart, id)

    if cart is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    session.delete(cart)
    session.commit()


@app.post("/carts/{cart_id}/items", status_code=status.HTTP_201_CREATED)
async def create_cart_item(
    cart_id: UUID,
    item: NewCartItem,
    session: SessionDep,
    response: Response,
    _: AuthDep,
):
    query = (
        insert(CartItem)
        .values(cart_id=cart_id, product_id=item.product_id, quantity=item.quantity)
        .on_conflict_do_update(
            index_elements=["cart_id", "product_id"],
            set_={"quantity": CartItem.quantity + item.quantity},
        )
    )

    session.exec(query)
    session.commit()

    response.headers["Location"] = f"/carts/{id}/items/{item.product_id}"


@app.get("/carts/{id}/items")
async def get_cart_items(
    id: UUID,
    session: SessionDep,
) -> Sequence[CartItem]:

    if session.get(Cart, id) is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    query = select(CartItem).where(CartItem.cart_id == id)

    return session.exec(query).all()


@app.get("/carts/{id}/items/{product_id}")
async def get_cart_item(
    id: UUID,
    product_id: str,
    session: SessionDep,
) -> CartItem:
    cart_item = session.get(CartItem, (id, product_id))

    if cart_item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    return cart_item


@app.patch("/carts/{id}/items/{product_id}")
async def update_cart_item_quantity(
    id: UUID,
    product_id: str,
    quantity: NonNegativeInt,
    session: SessionDep,
    _: AuthDep,
):
    cart_item = session.get(CartItem, (id, product_id))

    if cart_item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart_item.quantity = quantity

    session.add(cart_item)
    session.commit()


@app.delete("/carts/{id}/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart_item(id: UUID, product_id: str, session: SessionDep, _: AuthDep):
    cart_item = session.get(CartItem, (id, product_id))

    if cart_item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    session.delete(cart_item)
    session.commit()
