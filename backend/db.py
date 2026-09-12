"""Small direct-SQL database helper.

There is deliberately no ORM here.  Each request opens one PostgreSQL
connection, commits successful writes, and closes the connection afterward.
The SQL and its parameters remain explicit and easy to compare with schema.sql.
"""

from collections.abc import Generator

import psycopg

from app.config import settings


def get_db() -> Generator[psycopg.Connection, None, None]:
    """Provide a connection to a FastAPI route and always close it."""
    connection = psycopg.connect(settings.database_url)
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
