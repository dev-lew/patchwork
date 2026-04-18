from sqlmodel import SQLModel

from app.models import Product


class CollectionHero(SQLModel):
    title: str
    subtitle: str
    video: str
    poster: str | None = None


class ProductSeed(SQLModel):
    collection_hero: CollectionHero | None = None
    products: list[Product]
