import datetime as dt

from decimal import Decimal
from typing import Self
from uuid import UUID

from pydantic import EmailStr, PositiveInt, SecretStr, model_validator
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import Column, Field, SQLModel, Text


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: str = Field(primary_key=True)
    name: str
    description: str
    picture: str
    price: Decimal = Field(decimal_places=2)
    quantity: int = 0
    categories: list[str] = Field(sa_column=Column(ARRAY(Text)))


class User(SQLModel, table=True):
    __tablename__ = "users"

    username: str = Field(primary_key=True)
    password: str
    email: str


class NewUser(SQLModel):
    username: str = Field(primary_key=True)
    password: SecretStr
    email: EmailStr


class UserSession(SQLModel, table=True):
    __tablename__ = "sessions"

    id: str = Field(primary_key=True)
    username: str | None
    expires_at: dt.datetime


class NewUserSession(SQLModel):
    id: str = Field(primary_key=True)
    username: str | None
    expires_at: dt.datetime


class Cart(SQLModel, table=True):
    __tablename__ = "carts"

    id: UUID = Field(primary_key=True)
    user_id: str | None = Field(default=None, foreign_key="users.id")
    session_id: str | None


class NewCart(SQLModel):
    id: UUID
    user_id: str | None
    session_id: str | None

    @model_validator(mode="after")
    def check_at_least_one(self) -> Self:
        if not (self.user_id or self.session_id):
            raise ValueError("Either user_id or session_id must be set")

        return self


class CartItem(SQLModel, table=True):
    __tablename__ = "cart_items"

    cart_id: UUID = Field(primary_key=True, foreign_key="carts.id")
    product_id: str = Field(primary_key=True, foreign_key="products.id")
    quantity: int


class NewCartItem(SQLModel):
    product_id: str
    quantity: PositiveInt
