from pathlib import Path

from app.product_seed_models import ProductSeed

PRODUCTS_JSON_PATH = Path(__file__).resolve().parents[1] / "db" / "products.json"


def load_seed_data():
    return ProductSeed.model_validate_json(PRODUCTS_JSON_PATH.read_text())


def load_seed_products():
    return load_seed_data().products
