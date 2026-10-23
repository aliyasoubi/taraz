"""FastAPI dependencies: the only place the web layer meets the core."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.core.security import COOKIE_NAME, CSRF_HEADER, session_valid

DbSession = Annotated[Session, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

_SAFE_METHODS = ("GET", "HEAD", "OPTIONS")


def require_user(request: Request, settings: SettingsDep) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if not token or not session_valid(token, settings):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "login_required")
    # A cross-site form cannot set a custom header; refusing writes without it stops CSRF.
    if request.method not in _SAFE_METHODS and CSRF_HEADER not in request.headers:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
