from fastapi import APIRouter

from app.api.routes import client, health

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(client.router, prefix="/v1", tags=["client"])
