CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    picture TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    categories TEXT[] NOT NULL
);

