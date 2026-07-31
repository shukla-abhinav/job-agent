"""
Utility to extract and parse JSON from LLM response text.
Handles markdown code fences and extracts the first valid JSON block.
"""

import json
import re
from typing import Any


def extract_json(text: str) -> Any:
    """
    Extract and parse JSON from an LLM response.

    Handles:
    - Raw JSON responses
    - JSON wrapped in markdown code fences (```json ... ```)
    - Leading/trailing whitespace

    Args:
        text: Raw LLM response string.

    Returns:
        Parsed Python object (dict or list).

    Raises:
        ValueError: If no valid JSON could be extracted.
    """
    # Strip whitespace
    text = text.strip()

    # Try to find JSON inside markdown fences first
    fence_match = re.search(r"```(?:json)?\s*\n([\s\S]+?)\n```", text)
    if fence_match:
        candidate = fence_match.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Try raw parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the first { ... } or [ ... ] block
    json_match = re.search(r"(\{[\s\S]+\}|\[[\s\S]+\])", text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Could not extract valid JSON from LLM response. "
        f"Response preview: {text[:200]!r}"
    )
