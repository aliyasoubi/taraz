from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import SettingsDep, require_user
from app.core.security import COOKIE_NAME, issue_session, login_throttle, verify_password
from app.schemas.auth import LoginIn, Me

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Me)
def login(
    body: LoginIn,
    request: Request,
    response: Response,
    settings: SettingsDep,
) -> Me:
    client = request.client.host if request.client else "unknown"
    wait = login_throttle.retry_after(client)
    if wait:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "too_many_attempts",
            headers={"Retry-After": str(wait)},
        )
    if not verify_password(body.password, settings):
        login_throttle.fail(client)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong_password")
    login_throttle.reset(client)
    token, max_age = issue_session(settings)
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/api",
    )
    return Me(authenticated=True)


@router.post("/logout", response_model=Me)
def logout(response: Response) -> Me:
    response.delete_cookie(COOKIE_NAME, path="/api")
    return Me(authenticated=False)


@router.get("/me", response_model=Me, dependencies=[Depends(require_user)])
def me() -> Me:
    return Me(authenticated=True)
