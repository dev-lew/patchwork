import datetime as dt
import secrets
from collections.abc import Sequence
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from jinja2 import Environment, FileSystemLoader
from pwdlib import PasswordHash
from pydantic import EmailStr, NonNegativeInt
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
    session: SessionDep,
    user_session: UserSessionDep,
    categories: Annotated[list[Category] | None, Query()] = None,
):
    query = select(Product)
    if categories:
        query = query.where(Product.categories.overlap(categories))

    products = session.exec(query).all()

    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    return templates.TemplateResponse(
        request, "products.html", context={"products": products, "user": user}
    )


@router.get("/html/login", response_class=HTMLResponse)
async def get_login(
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    return templates.TemplateResponse(request, "login.html", context={"user": user})


@router.post("/html/login", response_class=HTMLResponse)
async def login(
    request: Request,
    session: SessionDep,
    username: Annotated[str, Form()],
    password: Annotated[str, Form()],
):
    user = session.get(User, username)

    if user is None or not hasher.verify(password, user.password):
        return templates.TemplateResponse(
            request, "login.html", context={"error": "Invalid username or password."}
        )

    user_session = UserSession(
        id=secrets.token_urlsafe(),
        username=username,
        expires_at=dt.datetime.now() + dt.timedelta(days=1),
    )

    session.add(user_session)
    session.commit()

    redirect = RedirectResponse(
        url="/html/account", status_code=status.HTTP_303_SEE_OTHER
    )

    redirect.set_cookie(
        key="session_id",
        value=user_session.id,
        httponly=True,
        samesite="strict",
    )

    return redirect


@router.get("/html/account", response_class=HTMLResponse)
async def get_account(
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    user = session.get(User, user_session.username)

    if user is None:
        return RedirectResponse(url="/html/login")

    return templates.TemplateResponse(request, "account.html", context={"user": user})


@router.post("/html/logout")
async def logout(
    session: SessionDep,
    response: Response,
    user_session: UserSessionDep,
):
    session.delete(user_session)
    session.commit()

    response.delete_cookie(key="session_id")
    response.headers["HX-Redirect"] = "/html/login"


@router.get("/html/account/create", response_class=HTMLResponse)
async def create_account(
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    return templates.TemplateResponse(
        request, "create-account.html", context={"user": user}
    )


@router.post("/html/account/create", response_class=HTMLResponse)
async def create_account_post(
    request: Request,
    session: SessionDep,
    username: Annotated[str, Form()],
    email: Annotated[str, Form()],
    password: Annotated[str, Form()],
    confirm_password: Annotated[str, Form()],
):
    if password != confirm_password:
        return templates.TemplateResponse(
            request, "create-account.html", context={"error": "Passwords do not match."}
        )

    if session.get(User, username) is not None:
        return templates.TemplateResponse(
            request, "create-account.html", context={"error": "Username already taken."}
        )

    session.add(User(username=username, password=hasher.hash(password), email=email))
    session.commit()

    user_session = UserSession(
        id=secrets.token_urlsafe(),
        username=username,
        expires_at=dt.datetime.now() + dt.timedelta(days=1),
    )

    session.add(user_session)
    session.commit()

    redirect = RedirectResponse(
        url="/html/account", status_code=status.HTTP_303_SEE_OTHER
    )

    redirect.set_cookie(
        key="session_id",
        value=user_session.id,
        httponly=True,
        samesite="strict",
    )

    return redirect
