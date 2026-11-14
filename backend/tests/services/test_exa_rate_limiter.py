import asyncio

import pytest

from app.services.exa_rate_limiter import ExaRateLimiter, ExaRateLimiterQueueError


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0
        self.sleeps: list[float] = []

    def time(self) -> float:
        return self.now

    async def sleep(self, delay: float) -> None:
        self.sleeps.append(delay)
        self.now += delay


async def test_limiter_smoothly_paces_requests_without_initial_burst() -> None:
    clock = FakeClock()
    limiter = ExaRateLimiter(
        requests_per_second=10,
        clock=clock.time,
        sleep=clock.sleep,
    )
    starts: list[float] = []

    for _ in range(12):
        await limiter.acquire()
        starts.append(clock.now)

    assert starts == pytest.approx([index / 10 for index in range(12)])
    assert starts[1] - starts[0] == pytest.approx(0.1)
    assert limiter.metrics.permitted_requests == 12
    assert limiter.metrics.total_wait_seconds == pytest.approx(1.1)


async def test_limiter_rejects_wait_beyond_configured_bound() -> None:
    clock = FakeClock()
    limiter = ExaRateLimiter(
        requests_per_second=10,
        max_queue_wait_seconds=0.05,
        clock=clock.time,
        sleep=clock.sleep,
    )
    await limiter.acquire()

    with pytest.raises(ExaRateLimiterQueueError):
        await limiter.acquire()

    assert limiter.metrics.rejected_requests == 1


async def test_limiter_bounds_pending_requests() -> None:
    sleep_started = asyncio.Event()
    release_sleep = asyncio.Event()

    async def blocking_sleep(_: float) -> None:
        sleep_started.set()
        await release_sleep.wait()

    limiter = ExaRateLimiter(
        requests_per_second=10,
        max_pending_requests=1,
        sleep=blocking_sleep,
    )
    await limiter.acquire()
    waiting_request = asyncio.create_task(limiter.acquire())
    await sleep_started.wait()

    with pytest.raises(ExaRateLimiterQueueError):
        await limiter.acquire()

    release_sleep.set()
    await waiting_request
    assert limiter.metrics.pending_requests == 0
