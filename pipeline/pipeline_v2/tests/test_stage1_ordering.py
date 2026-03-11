import pytest
from stage1_ordering import validate_ordering, order_files_fallback
from stage1_discovery import FileEntry


class TestValidateOrdering:
    def _entries(self, names):
        return [FileEntry(filepath=n, raw_content="") for n in names]

    def test_valid_ordering(self):
        entries = self._entries(["a.html", "b.html", "c.html"])
        result = validate_ordering(["b.html", "a.html", "c.html"], entries)
        assert [e.filepath for e in result] == ["b.html", "a.html", "c.html"]

    def test_ignores_unknown_files(self):
        entries = self._entries(["a.html", "b.html"])
        result = validate_ordering(["a.html", "unknown.html", "b.html"], entries)
        assert [e.filepath for e in result] == ["a.html", "b.html"]

    def test_appends_missing_files(self):
        entries = self._entries(["a.html", "b.html", "c.html"])
        result = validate_ordering(["b.html"], entries)
        paths = [e.filepath for e in result]
        assert paths[0] == "b.html"
        assert set(paths) == {"a.html", "b.html", "c.html"}

    def test_empty_ordering_returns_all(self):
        entries = self._entries(["a.html", "b.html"])
        result = validate_ordering([], entries)
        assert len(result) == 2

    def test_positions_assigned(self):
        entries = self._entries(["a.html", "b.html"])
        result = validate_ordering(["b.html", "a.html"], entries)
        assert result[0].position == 1
        assert result[1].position == 2


class TestOrderFilesFallback:
    def test_alphabetical_sort(self):
        entries = [
            FileEntry(filepath="c.html", raw_content=""),
            FileEntry(filepath="a.html", raw_content=""),
            FileEntry(filepath="b.html", raw_content=""),
        ]
        result = order_files_fallback(entries)
        assert [e.filepath for e in result] == ["a.html", "b.html", "c.html"]
        assert result[0].position == 1
