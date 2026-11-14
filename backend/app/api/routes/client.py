from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.client_identity import ClientContext, enforce_rate_limit

router = APIRouter()
ClientDependency = Annotated[ClientContext, Depends(enforce_rate_limit)]


class ClientResponse(BaseModel):
    client_id: str


@router.get("/client", response_model=ClientResponse)
async def get_client(context: ClientDependency) -> ClientResponse:
    """Confirms anonymous-client wiring without creating an account or database record."""
    return ClientResponse(client_id=str(context.client_id))
