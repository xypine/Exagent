from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.client_identity import ClientContext, enforce_rate_limit

router = APIRouter()


class ClientResponse(BaseModel):
    client_id: str


@router.get("/client", response_model=ClientResponse)
async def get_client(context: ClientContext = Depends(enforce_rate_limit)) -> ClientResponse:
    """Confirms anonymous-client wiring without creating an account or database record."""
    return ClientResponse(client_id=str(context.client_id))
