from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic
from uuid import UUID

from fastapi import Header, HTTPException, Request, status

from app.core.config import get_settings

CLIENT_ID_HEADER = "X-Client-Id"


@dataclass(frozen=True)
class ClientContext:
    client_id: UUID
    ip_address: str


class InMemoryRateLimiter:
    """A local-process limiter; replace with a shared store before horizontal scaling."""

    def __init__(self) -> None:
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        settings = get_settings()
        now = monotonic()
        threshold = now - settings.rate_limit_window_seconds
        bucket = self._requests[key]

        while bucket and bucket[0] <= threshold:
            bucket.popleft()

        if len(bucket) >= settings.rate_limit_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Try again shortly.",
            )

        bucket.append(now)


rate_limiter = InMemoryRateLimiter()


async def enforce_rate_limit(
    request: Request,
    x_client_id: str | None = Header(default=None, alias=CLIENT_ID_HEADER),
) -> ClientContext:
    if x_client_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-Client-Id header.")

    try:
        client_id = UUID(x_client_id)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Client-Id must be a UUID.",
        ) from error

    # Do not trust X-Forwarded-For until a trusted-proxy configuration exists.
    ip_address = request.client.host if request.client is not None else "unknown"
    rate_limiter.check(f"client:{client_id}")
    rate_limiter.check(f"ip:{ip_address}")
    return ClientContext(client_id=client_id, ip_address=ip_address)
