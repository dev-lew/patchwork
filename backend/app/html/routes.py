from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import EmailStr, NonNegativeInt
from sqlalchemy.dialects.postgresql import insert
from sqlmodel import select

from app.dependencies import AuthDep, SessionDep
from app.enums import Category
from app.models import Cart, CartItem, NewCart, NewCartItem, NewUser, Product, User

router = APIRouter()

templates = Jinja2Templates(directory="app/html/templates")


@router.get("/")
async def index():
    return RedirectResponse(url="/html/products")


@router.get("/html/products", response_class=HTMLResponse)
async def get_products(
    request: Request,
    session: SessionDep,
    categories: Annotated[list[Category] | None, Query()] = None,
):
    query = select(Product)
    if categories:
        query = query.where(Product.categories.overlap(categories))

    products = session.exec(query).all()

    return templates.TemplateResponse(
        request, "products.html", context={"products": products}
    )
