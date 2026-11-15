"""Gemini-backed synthesis for one or more already researched people."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

from google import genai
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.services.matching import (
    SYSTEM_PROMPT,
    MatchResponse,
    ScoredMatch,
    build_user_prompt,
    ground_matches,
    score_matches,
)

logger = logging.getLogger(__name__)


class GeminiMatchingError(Exception):
    """A safe, user-facing failure from the Gemini matching provider."""


class GeminiMatchingService:
    """Call only the configured free-tier Gemini model with stateless JSON output."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def score(
        self,
        *,
        profile: str,
        people: Sequence[dict[str, Any]],
        language: str = "English",
    ) -> list[ScoredMatch]:
        if not self._settings.gemini_api_key:
            logger.error("Match scoring unavailable: GEMINI_API_KEY is not configured")
            raise GeminiMatchingError(
                "Match scoring is unavailable because Gemini is not configured."
            )
        if not people:
            return []

        prompt = f"{SYSTEM_PROMPT}\n\n{build_user_prompt(profile, list(people), language)}"
        try:
            client = genai.Client(api_key=self._settings.gemini_api_key)
            interaction = client.interactions.create(
                model=self._settings.gemini_model,
                input=prompt,
                response_format={
                    "type": "text",
                    "mime_type": "application/json",
                    "schema": MatchResponse.model_json_schema(),
                },
                # Keep Gemini from retaining user profiles or research as conversation state.
                store=False,
            )
            output_text = getattr(interaction, "output_text", None)
            if not isinstance(output_text, str):
                raise ValueError("Gemini response did not contain JSON text")
            response = MatchResponse.model_validate_json(output_text)
        except (ValidationError, ValueError, TypeError) as error:
            logger.exception("Gemini returned an invalid match score")
            raise GeminiMatchingError(
                "Gemini returned an invalid match score. Try again."
            ) from error
        except Exception as error:
            logger.exception("Gemini matching provider request failed")
            raise GeminiMatchingError(
                "Gemini match scoring is temporarily unavailable. Try again."
            ) from error

        expected_ids = {str(person["id"]) for person in people}
        actual_ids = [match.id for match in response.results]
        if len(actual_ids) != len(expected_ids) or set(actual_ids) != expected_ids:
            logger.error(
                "Gemini did not score the requested people: expected IDs %s, received IDs %s",
                sorted(expected_ids),
                actual_ids,
            )
            raise GeminiMatchingError("Gemini did not score the requested people. Try again.")
        return score_matches(ground_matches(response, list(people), profile))
