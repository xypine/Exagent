import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from time import monotonic


class ExaRateLimiterQueueError(TimeoutError):
    pass


@dataclass
class ExaRateLimiterMetrics:
    permitted_requests: int = 0
    rejected_requests: int = 0
    total_wait_seconds: float = 0.0
    max_wait_seconds: float = 0.0
    pending_requests: int = 0


class ExaRateLimiter:
    """Smoothly reserve request-start slots for one single-worker process."""

    def __init__(
        self,
        *,
        requests_per_second: float = 10,
        max_queue_wait_seconds: float = 30,
        max_pending_requests: int = 25,
        clock: Callable[[], float] = monotonic,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        if requests_per_second <= 0:
            raise ValueError("requests_per_second must be positive")
        if max_queue_wait_seconds < 0 or max_pending_requests < 1:
            raise ValueError("Invalid Exa rate-limiter queue bounds")

        self._interval = 1 / requests_per_second
        self._max_queue_wait = max_queue_wait_seconds
        self._max_pending = max_pending_requests
        self._clock = clock
        self._sleep = sleep
        self._next_start = 0.0
        self._lock = asyncio.Lock()
        self.metrics = ExaRateLimiterMetrics()

    async def acquire(self) -> float:
        async with self._lock:
            now = self._clock()
            if self.metrics.pending_requests >= self._max_pending:
                self.metrics.rejected_requests += 1
                raise ExaRateLimiterQueueError("Exa request queue is full.")

            scheduled_start = max(now, self._next_start)
            wait = max(0.0, scheduled_start - now)
            if wait > self._max_queue_wait:
                self.metrics.rejected_requests += 1
                raise ExaRateLimiterQueueError("Exa request queue wait exceeded its limit.")

            self._next_start = scheduled_start + self._interval
            self.metrics.pending_requests += 1
            self.metrics.permitted_requests += 1
            self.metrics.total_wait_seconds += wait
            self.metrics.max_wait_seconds = max(self.metrics.max_wait_seconds, wait)

        try:
            if wait:
                await self._sleep(wait)
        finally:
            self.metrics.pending_requests -= 1
        return wait
