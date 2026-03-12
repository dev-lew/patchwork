from decimal import Decimal
from sqlmodel import SQLModel, Field

class Product(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    description: str
    picture: str
    price: Decimal = Field(decimal_places=2)
    quantity: int = 0
    categories: list[str]
