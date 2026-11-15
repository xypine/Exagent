import json
import logging
from typing import Any

import pytest

from app.core.config import Settings
from app.services.gemini_matching import GeminiMatchingError, GeminiMatchingService


class FakeInteractions:
    def __init__(self, output: str) -> None:
        self.output = output
        self.calls: list[dict[str, Any]] = []

    def create(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        return type("Interaction", (), {"output_text": self.output})()


class FakeClient:
    interactions: FakeInteractions

    def __init__(self, *, api_key: str) -> None:
        assert api_key == "test-key"
        self.interactions = self.__class__.interactions


def _response(person_id: str) -> str:
    return json.dumps(
        {
            "results": [
                {
                    "id": person_id,
                    "confidence": "medium",
                    "breakdown": {
                        "decision_power": 30,
                        "background_fit": None,
                        "shared_ground": None,
                    },
                    "evidence": [
                        {
                            "factor": "decision_power",
                            "fact_id": "current_role",
                        }
                    ],
                    "missing_info": ["profile missing"],
                }
            ]
        }
    )


def test_score_uses_stateless_structured_output(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_interactions = FakeInteractions(_response("person-1"))
    FakeClient.interactions = fake_interactions
    monkeypatch.setattr("app.services.gemini_matching.genai.Client", FakeClient)
    service = GeminiMatchingService(Settings(gemini_api_key="test-key"))

    result = service.score(profile="", people=[{"id": "person-1", "name": "Aino"}])

    assert result[0].score == 75
    assert fake_interactions.calls[0]["model"] == "gemini-3.5-flash-lite"
    assert fake_interactions.calls[0]["store"] is False
    assert fake_interactions.calls[0]["response_format"]["mime_type"] == "application/json"


def test_score_rejects_unrequested_people(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeClient.interactions = FakeInteractions(_response("another-person"))
    monkeypatch.setattr("app.services.gemini_matching.genai.Client", FakeClient)
    service = GeminiMatchingService(Settings(gemini_api_key="test-key"))

    with pytest.raises(GeminiMatchingError, match="requested people"):
        service.score(profile="", people=[{"id": "person-1"}])


def test_score_logs_the_actual_provider_error(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    class FailingInteractions:
        def create(self, **_kwargs: Any) -> Any:
            raise RuntimeError("HTTP 429: quota exhausted")

    FakeClient.interactions = FailingInteractions()  # type: ignore[assignment]
    monkeypatch.setattr("app.services.gemini_matching.genai.Client", FakeClient)
    service = GeminiMatchingService(Settings(gemini_api_key="test-key"))

    with caplog.at_level(logging.ERROR, logger="app.services.gemini_matching"):
        with pytest.raises(GeminiMatchingError, match="temporarily unavailable"):
            service.score(profile="", people=[{"id": "person-1"}])

    assert "HTTP 429: quota exhausted" in caplog.text
