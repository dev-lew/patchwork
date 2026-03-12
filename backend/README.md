# patchwork backend

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
