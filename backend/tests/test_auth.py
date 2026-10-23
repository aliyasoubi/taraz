from fastapi.testclient import TestClient

from tests.conftest import PASSWORD


def test_api_requires_login(anon: TestClient) -> None:
    assert anon.get("/api/patients").status_code == 401
    assert anon.get("/api/auth/me").status_code == 401


def test_health_is_public(anon: TestClient) -> None:
    assert anon.get("/api/health").json() == {"status": "ok"}


def test_wrong_password_is_rejected(anon: TestClient) -> None:
    r = anon.post("/api/auth/login", json={"password": "nope"})
    assert r.status_code == 401
    assert "taraz_session" not in r.cookies


def test_login_sets_httponly_strict_cookie(anon: TestClient) -> None:
    r = anon.post("/api/auth/login", json={"password": PASSWORD})
    assert r.status_code == 200
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie and "path=/api" in cookie
    assert anon.get("/api/auth/me").json() == {"authenticated": True}


def test_repeated_failures_are_throttled(anon: TestClient) -> None:
    for _ in range(5):
        anon.post("/api/auth/login", json={"password": "nope"})
    r = anon.post("/api/auth/login", json={"password": PASSWORD})
    assert r.status_code == 429
    assert int(r.headers["retry-after"]) > 0


def test_writes_need_the_csrf_header(client: TestClient) -> None:
    del client.headers["X-Requested-With"]
    assert client.post("/api/patients", json={"name": "x"}).status_code == 403
    assert client.get("/api/patients").status_code == 200


def test_logout_ends_the_session(client: TestClient) -> None:
    client.post("/api/auth/logout")
    assert client.get("/api/patients").status_code == 401


def test_api_responses_are_not_cacheable(client: TestClient) -> None:
    r = client.get("/api/patients")
    assert r.headers["cache-control"] == "no-store"
    assert "frame-ancestors 'none'" in r.headers["content-security-policy"]
