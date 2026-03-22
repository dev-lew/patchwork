# patchwork backend

## Design

This is a standard CRUD [fastapi](https://fastapi.tiangolo.com/) backend
that interfaces with a Postgres database. It currently supports models
for products, users, and carts. The JSON api is reached from the /api
route which is what standard frameworks accept. There is a parallel
API for returning HTML (at /html/) since this is preferred for one framework, [htmx](https://htmx.org/).

### Tailwind

There is support for [tailwind](https://tailwindcss.com/) so styling can be consistent, but
this is not set in stone yet.

## Linting

We use [prettier](https://prettier.io/) for formatting, you can run

```bash

```

## pyproject.toml / dependencies

We use [pyproject.toml](https://peps.python.org/pep-0621/) to specify dependencies and
tool configuration. Inside you will see a dependency group named dev which specifies
the tooling and testing packages. To interact with pyproject.toml we use the
tool [uv](https://github.com/astral-sh/uv).

### uv

uv is a fast Python package manager that generally supersedes that of poetry and venv
tools like virtualenvwrapper. Since we don't package a wheel, we don't need its packaging
functions. However, it is used to run tooling and modify pyproject.toml.

To add a dependency:

```
uv add <package>
```

To add a dev dependency:

```
uv add --dev <package>
```

To run a tool:

```
uv run <tool>
```

uv automatically manages a virtual environment for you in .venv, you shouldn't need to
interface with it directly. If you do though, see the subcommands in `uv venv`.

`uv run` will run a python cli tool inside of the virtual environment automatically.

## Hosting

This backend is hosted online with [render][render.com], [here][https://patchwork-backend-v0-0-1.onrender.com].
Render uses the docker image described by the Dockerfile.

We are using the free tier of Render which includes a Postgres instance. The Postgres instance
shuts down every month because they want us to pay, but we can easily recreate it with
the scripts in `db/`

## Docker

We just reused the suggested Dockerfile from the uv documentation.
