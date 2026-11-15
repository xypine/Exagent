import pytest
from fastapi import HTTPException

from app.core.client_identity import InMemoryRateLimiter
from app.core.config import Settings


def test_rate_limit_includes_retry_after_header(monkeypatch: pytest.MonkeyPatch) -> None:
    limiter = InMemoryRateLimiter()
    monkeypatch.setattr(
        "app.core.client_identity.get_settings",
        lambda: Settings(rate_limit_requests=1, rate_limit_window_seconds=10),
    )
    monkeypatch.setattr("app.core.client_identity.monotonic", lambda: 100.1)

    limiter.check("client:example")

    with pytest.raises(HTTPException) as raised:
        limiter.check("client:example")

    assert raised.value.status_code == 429
    assert raised.value.headers == {"Retry-After": "10"}
