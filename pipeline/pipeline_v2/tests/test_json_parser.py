import pytest
from json_parser import parse_json


class TestParseJsonObject:
    def test_clean_json(self):
        assert parse_json('{"key": "value"}') == {"key": "value"}

    def test_json_wrapped_in_text(self):
        raw = 'Here is the result: {"key": "value"} I hope this helps!'
        assert parse_json(raw) == {"key": "value"}

    def test_nested_json(self):
        raw = '{"outer": {"inner": 1}}'
        assert parse_json(raw) == {"outer": {"inner": 1}}

    def test_json_with_braces_in_string(self):
        raw = '{"key": "value with } brace"}'
        result = parse_json(raw)
        assert result == {"key": "value with } brace"}


class TestParseJsonArray:
    def test_array_response(self):
        assert parse_json('["a", "b"]') == ["a", "b"]

    def test_array_wrapped_in_text(self):
        raw = 'Result: ["a", "b", "c"] done'
        assert parse_json(raw) == ["a", "b", "c"]

    def test_object_preferred_over_array(self):
        """If both {} and [] exist, {} is tried first."""
        raw = '{"items": ["a", "b"]}'
        result = parse_json(raw)
        assert result == {"items": ["a", "b"]}


class TestParseJsonFallback:
    def test_no_json_returns_none(self):
        assert parse_json("no json here") is None

    def test_invalid_json_returns_none(self):
        assert parse_json("{not valid json}") is None

    def test_empty_string_returns_none(self):
        assert parse_json("") is None

    def test_only_braces_returns_none(self):
        assert parse_json("}{") is None
