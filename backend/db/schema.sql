DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    picture TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    quantity INTEGER NOT NULL DEFAULT 0,
    handle TEXT,
    variant_label TEXT,
    badge_text TEXT,
    rating DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    review_count INTEGER NOT NULL DEFAULT 0,
    categories TEXT[] NOT NULL,
    hover_picture TEXT,
    hover_video TEXT
);

CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    email TEXT NOT NULL
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    username TEXT,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE carts (
    id UUID PRIMARY KEY,
    username TEXT REFERENCES users(username) ON DELETE CASCADE,
    session_id TEXT

    CHECK (username IS NOT NULL OR session_id IS NOT NULL)
);

CREATE TABLE cart_items (
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, product_id)
);
