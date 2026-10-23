from fastapi import APIRouter, Depends

from app.api.deps import require_user
from app.api.routes import accounts, auth, patients, reports, transactions, treatments

api_router = APIRouter(prefix="/api")


@api_router.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}


api_router.include_router(auth.router)
for module in (patients, treatments, transactions, accounts, reports):
    api_router.include_router(module.router, dependencies=[Depends(require_user)])
