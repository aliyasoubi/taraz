from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.config import SettingsDep
from app.security import (
    COOKIE_NAME,
    issue_session,
    login_throttle,
    require_user,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    password: str = Field(min_length=1, max_length=256)


class Me(BaseModel):
    authenticated: bool


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
            "تعداد تلاش‌ها زیاد بود؛ کمی بعد دوباره امتحان کنید",
            headers={"Retry-After": str(wait)},
        )
    if not verify_password(body.password, settings):
        login_throttle.fail(client)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "رمز عبور درست نیست")
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
