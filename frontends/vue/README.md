# Vue Frontend

This frontend recreates the feel of the Lil Luv Dog collection page using Vue 3
and Vite, while fetching live product data from the FastAPI backend at
`/api/products`.

## Run it

1. Start the backend from `/backend`.
2. In `/frontends/vue`, install dependencies:

```bash
npm install
```

3. Start the Vue app:

```bash
npm run dev
```

The Vite dev server runs on `http://127.0.0.1:5173` and proxies `/api` and
`/static` requests to `http://127.0.0.1:8000`.

## Build

```bash
npm run build
```

## Structure

- `index.html`: Vite entry shell
- `src/main.js`: Vue bootstrap
- `src/App.vue`: storefront page
- `src/styles.css`: page styling
- `vite.config.js`: local dev proxy to FastAPI
