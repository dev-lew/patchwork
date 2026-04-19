import datetime as dt
import secrets
from collections.abc import Sequence
from typing import Annotated
from uuid import UUID, uuid4

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
from sqlmodel import func, select

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


@router.get("/html/about", response_class=HTMLResponse)
async def get_about(
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    return templates.TemplateResponse(request, "about.html", context={"user": user})


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

    # TODO: Remove later, only needed to filter out extra
    query = query.where(func.length(Product.id) == 10)

    products = session.exec(query).all()

    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    return templates.TemplateResponse(
        request, "products.html", context={"products": products, "user": user}
    )


@router.get("/html/products/{id}", response_class=HTMLResponse)
async def get_product(
    id: str,
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    product = session.get(Product, id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    cart = session.exec(select(Cart).where(Cart.session_id == user_session.id)).first()

    if cart is None:
        cart = NewCart(
            id=uuid4(),
            username=user_session.username,
            session_id=user_session.id,
        )

        session.add(Cart(**cart.model_dump()))
        session.commit()

    return templates.TemplateResponse(
        request,
        "product.html",
        context={"product": product, "user": user, "cart": cart},
    )


@router.post("/html/carts/{cart_id}/items")
async def create_cart_item(
    cart_id: UUID,
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
    product_id: Annotated[str, Form()],
    quantity: Annotated[int, Form()] = 1,
):
    cart = session.get(Cart, cart_id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    product = session.get(Product, product_id)

    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    query = (
        insert(CartItem)
        .values(cart_id=cart_id, product_id=product_id, quantity=quantity)
        .on_conflict_do_update(
            index_elements=["cart_id", "product_id"],
            set_={"quantity": CartItem.quantity + quantity},
        )
    )

    session.exec(query)
    session.commit()

    if request.headers.get("HX-Request"):
        return templates.TemplateResponse(request, "partials/cart-added.html")

    return RedirectResponse(
        url=f"/html/products/{product_id}", status_code=status.HTTP_303_SEE_OTHER
    )


@router.get("/html/cart", response_class=HTMLResponse)
async def get_cart(
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    user = None

    if user_session.username is not None:
        user = session.get(User, user_session.username)

    cart = session.exec(select(Cart).where(Cart.session_id == user_session.id)).first()

    ctx = _cart_items_context(session, cart) if cart is not None else {"cart": None, "items": [], "subtotal": 0}
    ctx["user"] = user

    return templates.TemplateResponse(request, "cart.html", context=ctx)


def _cart_items_context(session, cart):
    items = []
    subtotal = 0

    cart_items = session.exec(
        select(CartItem).where(CartItem.cart_id == cart.id)
    ).all()

    for ci in cart_items:
        product = session.get(Product, ci.product_id)
        if product is not None:
            items.append({"product": product, "quantity": ci.quantity})
            subtotal += product.price * ci.quantity

    return {"cart": cart, "items": items, "subtotal": subtotal}


@router.post("/html/carts/{cart_id}/items/{product_id}")
async def update_cart_item(
    cart_id: UUID,
    product_id: str,
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
    quantity: Annotated[int, Form()],
):
    cart = session.get(Cart, cart_id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    if quantity <= 0:
        cart_item = session.get(CartItem, (cart_id, product_id))
        if cart_item is not None:
            session.delete(cart_item)
    else:
        cart_item = session.get(CartItem, (cart_id, product_id))
        if cart_item is not None:
            cart_item.quantity = quantity

    session.commit()

    if request.headers.get("HX-Request"):
        return templates.TemplateResponse(
            request, "partials/cart-items.html", context=_cart_items_context(session, cart)
        )

    return RedirectResponse(url="/html/cart", status_code=status.HTTP_303_SEE_OTHER)


@router.post("/html/carts/{cart_id}/items/{product_id}/delete")
async def delete_cart_item(
    cart_id: UUID,
    product_id: str,
    request: Request,
    session: SessionDep,
    user_session: UserSessionDep,
):
    cart = session.get(Cart, cart_id)

    if cart is None or cart.session_id != user_session.id:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart_item = session.get(CartItem, (cart_id, product_id))

    if cart_item is not None:
        session.delete(cart_item)

    session.commit()

    if request.headers.get("HX-Request"):
        return templates.TemplateResponse(
            request, "partials/cart-items.html", context=_cart_items_context(session, cart)
        )

    return RedirectResponse(url="/html/cart", status_code=status.HTTP_303_SEE_OTHER)


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
