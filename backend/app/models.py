from decimal import Decimal
from sqlmodel import ARRAY, Column, Field, SQLModel, Text


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: str = Field(primary_key=True)
    name: str
    description: str
    picture: str
    price: Decimal = Field(decimal_places=2)
    quantity: int = 0
    categories: list[str] = Field(sa_column=Column(ARRAY(Text)))
