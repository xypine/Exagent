from fastapi import APIRouter

from app.api.routes import client, health, searches

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(client.router, prefix="/v1", tags=["client"])
api_router.include_router(searches.router, prefix="/v1", tags=["searches"])
