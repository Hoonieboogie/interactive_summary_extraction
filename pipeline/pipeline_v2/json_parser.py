"""Lenient JSON parser for LLM responses.

Extracts the first valid JSON object or array from a string.
Returns the parsed Python object, or None if nothing parseable is found.
"""
import json


def parse_json(text: str) -> dict | list | None:
    # Try object: first { to last }
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace : last_brace + 1])
        except json.JSONDecodeError:
            pass

    # Try array: first [ to last ]
    first_bracket = text.find("[")
    last_bracket = text.rfind("]")
    if first_bracket != -1 and last_bracket > first_bracket:
        try:
            return json.loads(text[first_bracket : last_bracket + 1])
        except json.JSONDecodeError:
            pass

    return None
