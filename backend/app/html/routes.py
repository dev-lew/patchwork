from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from jinja2 import Environment, FileSystemLoader
from pydantic import EmailStr, NonNegativeInt
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import Session, select

from app.dependencies import AuthDep, SessionDep, engine
from app.enums import Category
from app.models import Cart, CartItem, NewCart, NewCartItem, NewUser, Product, User
from app.product_store import load_seed_products

router = APIRouter()

templates = Jinja2Templates(
    env=Environment(
        loader=FileSystemLoader("app/html/templates"),
        # Simplfy whitespace management when templating. Anything
        # templated will now be left justified
        trim_blocks=True,
        lstrip_blocks=True,
    ),
)


@router.get("/")
async def index():
    return RedirectResponse(url="/html/products")


@router.get("/html/products", response_class=HTMLResponse)
async def get_products(
    request: Request,
    categories: Annotated[list[Category] | None, Query()] = None,
):
    if engine is None:
        products = load_seed_products()
        if categories:
            requested_categories = {str(category) for category in categories}
            products = [
                product
                for product in products
                if requested_categories.intersection(product.categories)
            ]
    else:
        with Session(engine) as session:
            query = select(Product)
            if categories:
                query = query.where(Product.categories.overlap(categories))

            products = session.exec(query).all()

    return templates.TemplateResponse(
        request, "products.html", context={"products": products}
    )


@router.get("/html/login", response_class=HTMLResponse)
async def login(request: Request):
    return templates.TemplateResponse(request, "login.html")
