# backend

## Hosting
This backend is hosted online with [render][render.com], [here][https://patchwork-backend-v0-0-1.onrender.com].
Render uses the docker image described by the Dockerfile.

We are using the free tier of Render which includes a Postgres instance. The Postgres instance
shuts down every month because they want us to pay, but we can easily recreate it with
the scripts in `db/`

## Docker
We just reused the suggested Dockerfile from the uv documentation.

