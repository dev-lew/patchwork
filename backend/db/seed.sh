#!/bin/sh

set -eu

PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_URL}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" -f schema.sql

jq -c '.products[]' "products.json" | while read -r product; do
    ID=$(echo "$product" | jq -r '.id')
    NAME=$(echo "$product" | jq -r '.name')

    # Escape single quotes in description
    DESCRIPTION=$(echo "$product" | jq -r '.description' | sed "s/'/''/g")

    PICTURE=$(echo "$product" | jq -r '.picture')
    PRICE=$(echo "$product" | jq -r '.price')
    QUANTITY=$(echo "$product" | jq -r '.quantity')

    CATEGORIES_ARRAY=$(echo "$product" | jq -r '.categories | "{"+join(",")+"}"')

    SQL="INSERT INTO products (id, name, description, picture, price, quantity, categories)
    VALUES ('${ID}', '${NAME}', '${DESCRIPTION}', '${PICTURE}', ${PRICE}, ${QUANTITY}, '${CATEGORIES_ARRAY}'::text[])
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          picture = EXCLUDED.picture,
          price = EXCLUDED.price,
          quantity = EXCLUDED.quantity,
          categories = EXCLUDED.categories;"

    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_URL}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" -c "$SQL"
done
