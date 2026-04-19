import datetime as dt
import secrets

from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Cookie, HTTPException, Query, Response, status
from pwdlib import PasswordHash
from pydantic import EmailStr, NonNegativeInt, SecretStr
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import select

from app.dependencies import AuthDep, SessionDep, UserSessionDep
from app.enums import Category
from app.models import (
    Cart,
    CartItem,
    NewCart,
    NewCartItem,
    NewUser,
    NewUserSession,
    Product,
    User,
    UserSession,
)

router = APIRouter()

hasher = PasswordHash.recommended()


@router.get("/api/products")
async def get_products(
    session: SessionDep, categories: Annotated[list[Category] | None, Query()] = None
) -> Sequence[Product]:
    query = select(Product)

    if categories is not None:
        query = query.where(Product.categories.overlap(categories))

    return session.exec(query).all()


@router.get("/api/products/{id}")
async def get_product(id: str, session: SessionDep) -> Product:
    product = session.get(Product, id)

    if product is None:
        raise HTTPException(status_code=404, detail="User not found")

    return product


@router.post("/api/users", status_code=status.HTTP_201_CREATED)
async def create_user(
    user: NewUser, session: SessionDep, response: Response, _: AuthDep
):
    if session.get(User, user.username) is not None:
        raise HTTPException(status_code=400, detail="User already exists")

    user.password = hasher.hash(str(user.password))

    session.add(User(**user.model_dump()))
    session.commit()

    response.headers["Location"] = f"/users/account"


@router.get("/api/users/{username}")
async def get_user(username: str, session: SessionDep, _: AuthDep) -> User:
    user = session.get(User, username)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.patch("/api/users/{username}")
async def update_user_email(
    username: str, email: EmailStr, session: SessionDep, _: AuthDep
):
    user = session.get(User, username)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.email = email

    session.commit()


@router.delete("/api/users/{username}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(username: str, session: SessionDep, _: AuthDep):
    user = session.get(User, username)

    if user is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    session.delete(user)
    session.commit()


@router.post("/api/login")
async def create_user_session(
    username: str, password: SecretStr, session: SessionDep, response: Response
):
    user = session.get(User, username)

    if user is None or not hasher.verify(password.get_secret_value(), user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_session = NewUserSession(
        id=secrets.token_urlsafe(),
        username=username,
        expires_at=dt.datetime.now() + dt.timedelta(days=1),
    )

    session.add(UserSession(**user_session.model_dump()))
    session.commit()

    response.set_cookie(
        key="session_id",
        value=user_session.id,
        httponly=True,
        samesite="strict",
    )


@router.post("/api/logout", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_session(
    session: SessionDep,
    session_id: Annotated[str | None, Cookie()] = None,
):
    if session_id is not None:
        user_session = session.get(UserSession, session_id)

        if user_session is not None:
            session.delete(user_session)
            session.commit()


@router.post("/api/carts", status_code=status.HTTP_201_CREATED)
async def create_cart(
    id: UUID,
    username: str | None,
    response: Response,
    user_session: UserSessionDep,
    session: SessionDep,
    _: AuthDep,
):
    cart = NewCart(id=id, username=username, session_id=user_session.id)

    session.add(Cart(**cart.model_dump()))
    session.commit()

    response.headers["Location"] = f"/carts/{cart.id}"


@router.get("/api/carts/{id}")
async def get_cart(id: UUID, session: SessionDep, _: AuthDep) -> Cart:
    cart = session.get(Cart, id)

    if cart is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    return cart


@router.delete("/api/carts/{id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart(id: UUID, session: SessionDep, _: AuthDep):
    cart = session.get(Cart, id)

    if cart is None:
        raise HTTPException(status_code=404, detail="Cart not found")

    session.delete(cart)
    session.commit()


@router.post("/api/carts/{cart_id}/items", status_code=status.HTTP_201_CREATED)
async def create_cart_item(
    cart_id: UUID,
    item: NewCartItem,
    user_session: UserSessionDep,
    session: SessionDep,
    response: Response,
    _: AuthDep,
):
    cart = session.get(Cart, user_session.id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

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


@router.get("/api/carts/{id}/items")
async def get_cart_items(
    id: UUID, user_session: UserSessionDep, session: SessionDep, _: AuthDep
) -> Sequence[CartItem]:
    cart = session.get(Cart, user_session.id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    query = select(CartItem).where(CartItem.cart_id == id)

    return session.exec(query).all()


@router.get("/api/carts/{id}/items/{product_id}")
async def get_cart_item(
    id: UUID,
    product_id: str,
    user_session: UserSessionDep,
    session: SessionDep,
    _: AuthDep,
) -> CartItem:
    cart = session.get(Cart, user_session.id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart_item = session.get(CartItem, (id, product_id))

    if cart_item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    return cart_item


@router.patch("/api/carts/{id}/items/{product_id}")
async def update_cart_item_quantity(
    id: UUID,
    product_id: str,
    user_session: UserSessionDep,
    quantity: NonNegativeInt,
    session: SessionDep,
    _: AuthDep,
):
    cart = session.get(Cart, user_session.id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart_item = session.get(CartItem, (id, product_id))

    if cart_item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart_item.quantity = quantity

    session.commit()


@router.delete(
    "/api/carts/{id}/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_cart_item(
    id: UUID,
    product_id: str,
    user_session: UserSessionDep,
    session: SessionDep,
    _: AuthDep,
):
    cart = session.get(Cart, user_session.id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart_item = session.get(CartItem, (id, product_id))

    if cart_item is None:
        raise HTTPException(status_code=404, detail="Cart item not found")

    session.delete(cart_item)
    session.commit()
