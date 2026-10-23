"""Serves the built PWA from the same origin as the API."""

from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse


def mount_spa(app: FastAPI, static_dir: Path) -> None:
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
