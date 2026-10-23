from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.config import get_settings
from app.routers import accounts, auth, patients, reports, transactions
from app.security import require_user

CSP = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self'",
        # Animation libraries write inline style attributes.
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
)


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        h = response.headers
        h.setdefault("Content-Security-Policy", CSP)
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Referrer-Policy", "no-referrer")
        h.setdefault("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()")
        if request.url.path.startswith("/api/"):
            # Patient money data never lands in a browser or service-worker cache.
            h["Cache-Control"] = "no-store"
        return response


def _mount_spa(app: FastAPI, static_dir: Path) -> None:
    root = static_dir.resolve()
    index = root / "index.html"

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status.HTTP_404_NOT_FOUND)
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root):
            # Vite fingerprints everything under assets/; the rest must revalidate
            # so a deploy reaches an installed PWA.
            immutable = path.startswith("assets/")
            return FileResponse(
                candidate,
                headers={
                    "Cache-Control": "public, max-age=31536000, immutable"
                    if immutable
                    else "no-cache"
                },
            )
        return FileResponse(index, headers={"Cache-Control": "no-cache"})


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Taraz API",
        version="1.0.0",
        docs_url="/api/docs" if settings.env != "production" else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.env != "production" else None,
    )
    app.add_middleware(SecurityHeaders)

    @app.get("/api/health", include_in_schema=False)
    def health() -> dict[str, str]:
        return {"status": "ok"}

    api = APIRouter(prefix="/api")
    api.include_router(auth.router)
    protected = [Depends(require_user)]
    for module in (patients, transactions, accounts, reports):
        api.include_router(module.router, dependencies=protected)
    app.include_router(api)

    if (settings.static_dir / "index.html").is_file():
        _mount_spa(app, settings.static_dir)
    return app


app = create_app()
