from logging.config import fileConfig

from alembic import context

from app import models  # noqa: F401  (registers the tables on Base.metadata)
from app.core.db import Base, engine

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=Base.metadata,
            # SQLite cannot ALTER most things in place; batch mode rebuilds the table.
            render_as_batch=connection.dialect.name == "sqlite",
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
