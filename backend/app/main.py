"""Composition root: builds the FastAPI app from its parts."""

from fastapi import FastAPI

from app.api.errors import register_error_handlers
from app.api.middleware import SecurityHeaders
from app.api.router import api_router
from app.api.spa import mount_spa
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    docs = settings.env != "production"
    app = FastAPI(
        title="Taraz API",
        version="1.0.0",
        docs_url="/api/docs" if docs else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs else None,
    )
    app.add_middleware(SecurityHeaders)
    register_error_handlers(app)
    app.include_router(api_router)
    if (settings.static_dir / "index.html").is_file():
        mount_spa(app, settings.static_dir)
    return app


app = create_app()
