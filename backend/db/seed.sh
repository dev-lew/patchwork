#!/bin/sh

set -eu

escape_sql() {
    printf "%s" "$1" | sed "s/'/''/g"
}

nullable_text_sql() {
    if [ -z "${1}" ]; then
        printf "NULL"
    else
        printf "'%s'" "$(escape_sql "$1")"
    fi
}

nullable_number_sql() {
    if [ -z "${1}" ] || [ "${1}" = "null" ]; then
        printf "NULL"
    else
        printf "%s" "$1"
    fi
}

PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_PSQL_URL}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" -f schema.sql

jq -c '.products[]' "products.json" | while read -r product; do
    ID=$(escape_sql "$(echo "$product" | jq -r '.id')")
    NAME=$(escape_sql "$(echo "$product" | jq -r '.name')")

    DESCRIPTION=$(escape_sql "$(echo "$product" | jq -r '.description')")
    PICTURE=$(escape_sql "$(echo "$product" | jq -r '.picture')")

    PRICE=$(echo "$product" | jq -r '.price')
    COMPARE_AT_PRICE=$(nullable_number_sql "$(echo "$product" | jq -r '.compare_at_price // empty')")
    QUANTITY=$(echo "$product" | jq -r '.quantity')
    HANDLE=$(nullable_text_sql "$(echo "$product" | jq -r '.handle // empty')")
    VARIANT_LABEL=$(nullable_text_sql "$(echo "$product" | jq -r '.variant_label // empty')")
    BADGE_TEXT=$(nullable_text_sql "$(echo "$product" | jq -r '.badge_text // empty')")
    RATING=$(echo "$product" | jq -r '.rating // 0')
    REVIEW_COUNT=$(echo "$product" | jq -r '.review_count // 0')

    CATEGORIES_ARRAY=$(echo "$product" | jq -r '.categories | "{"+join(",")+"}"')

    SQL="INSERT INTO products (id, name, description, picture, price, compare_at_price, quantity, handle, variant_label, badge_text, rating, review_count, categories)
    VALUES ('${ID}', '${NAME}', '${DESCRIPTION}', '${PICTURE}', ${PRICE}, ${COMPARE_AT_PRICE}, ${QUANTITY}, ${HANDLE}, ${VARIANT_LABEL}, ${BADGE_TEXT}, ${RATING}, ${REVIEW_COUNT}, '${CATEGORIES_ARRAY}'::text[])
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          picture = EXCLUDED.picture,
          price = EXCLUDED.price,
          compare_at_price = EXCLUDED.compare_at_price,
          quantity = EXCLUDED.quantity,
          handle = EXCLUDED.handle,
          variant_label = EXCLUDED.variant_label,
          badge_text = EXCLUDED.badge_text,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          categories = EXCLUDED.categories;"

    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_PSQL_URL}" -U "${POSTGRES_USER}" "${POSTGRES_DB}" -c "$SQL"
done
