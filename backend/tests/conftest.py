import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

_tmp = Path(tempfile.mkdtemp(prefix="taraz-test-"))
os.environ.update(
    ENV="test",
    DATABASE_URL=f"sqlite:///{_tmp / 'test.db'}",
    SECRET_KEY="test-secret-key-that-is-long-enough",
    COOKIE_SECURE="false",
    STATIC_DIR=str(_tmp / "no-static"),
)

from app.security import hash_password  # noqa: E402

PASSWORD = "correct horse battery"
os.environ["AUTH_PASSWORD_HASH"] = hash_password(PASSWORD)

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import create_app  # noqa: E402
from app.security import login_throttle  # noqa: E402

BACKEND = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session", autouse=True)
def _schema() -> None:
    # Through the real migrations, so a model change without one fails here.
    command.upgrade(Config(str(BACKEND / "alembic.ini")), "head")


@pytest.fixture(autouse=True)
def _clean() -> Iterator[None]:
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f"DELETE FROM {table.name}"))
    login_throttle._failures.clear()


@pytest.fixture
def anon() -> TestClient:
    return TestClient(create_app())


@pytest.fixture
def client(anon: TestClient) -> TestClient:
    r = anon.post("/api/auth/login", json={"password": PASSWORD})
    assert r.status_code == 200, r.text
    anon.headers["X-Requested-With"] = "fetch"
    return anon


class Api:
    """Small helpers so tests read as ledger stories."""

    def __init__(self, client: TestClient) -> None:
        self.c = client

    def patient(self, name: str = "Test Patient") -> int:
        r = self.c.post("/api/patients", json={"name": name})
        assert r.status_code == 201, r.text
        return int(r.json()["id"])

    def account(self, title: str = "Mellat", **extra: object) -> int:
        r = self.c.post("/api/accounts", json={"title": title, **extra})
        assert r.status_code == 201, r.text
        return int(r.json()["id"])

    def tx(
        self, patient_id: int, type_: str, amount: int, on: str = "2026-10-01", **extra: object
    ) -> dict:
        body = {
            "patient_id": patient_id,
            "type": type_,
            "amount": amount,
            "occurred_on": on,
            **extra,
        }
        r = self.c.post("/api/transactions", json=body)
        assert r.status_code == 201, r.text
        return dict(r.json())

    def balance(self, patient_id: int) -> dict:
        r = self.c.get(f"/api/patients/{patient_id}")
        assert r.status_code == 200, r.text
        return dict(r.json())


@pytest.fixture
def api(client: TestClient) -> Api:
    return Api(client)
