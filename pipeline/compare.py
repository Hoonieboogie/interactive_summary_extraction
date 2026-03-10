"""Comparison report generator: terminal table + HTML report."""

import json
import os
from datetime import datetime, timezone

from jinja2 import Template
from rich.console import Console
from rich.table import Table


def print_terminal_report(results: dict[str, list[dict]]) -> None:
    """Print a Rich table comparing model outputs side by side."""
    console = Console()
    model_names = list(results.keys())

    content_ids = []
    for entries in results.values():
        for entry in entries:
            cid = entry["content_id"]
            if cid not in content_ids:
                content_ids.append(cid)

    table = Table(title="Summary Extraction Comparison", show_lines=True)
    table.add_column("Content ID", style="cyan", min_width=20)
    for name in model_names:
        table.add_column(name, min_width=30, max_width=50)

    lookup: dict[str, dict[str, dict]] = {}
    for model_name, entries in results.items():
        lookup[model_name] = {e["content_id"]: e for e in entries}

    for cid in content_ids:
        row = [cid]
        for model_name in model_names:
            entry = lookup.get(model_name, {}).get(cid, {})
            summary = entry.get("summary", entry.get("error", "N/A"))
            latency = entry.get("latency_ms", 0)
            tokens = entry.get("prompt_tokens", 0)
            cell = f"{summary}\n\n[dim]({latency}ms, {tokens} tok)[/dim]"
            row.append(cell)
        table.add_row(*row)

    console.print(table)

    console.print("\n[bold]Totals:[/bold]")
    for model_name, entries in results.items():
        total_latency = sum(e.get("latency_ms", 0) for e in entries)
        total_tokens = sum(e.get("prompt_tokens", 0) for e in entries)
        errors = sum(1 for e in entries if "error" in e)
        console.print(
            f"  {model_name}: {total_latency/1000:.1f}s total, "
            f"{total_tokens} prompt tokens, {errors} errors"
        )


_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Summary Extraction Comparison</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Malgun Gothic', sans-serif; background: #f5f5f5; padding: 20px; }
  h1 { text-align: center; margin-bottom: 8px; color: #1a1a2e; }
  .meta { text-align: center; color: #666; margin-bottom: 24px; font-size: 14px; }
  .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .card-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px;
                padding-bottom: 8px; border-bottom: 2px solid #e0e0e0; }
  .card-title.flagged { border-bottom-color: #ff6b6b; }
  .flag-badge { background: #ff6b6b; color: white; font-size: 11px; padding: 2px 8px;
                border-radius: 4px; margin-left: 8px; }
  .models { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  .model-box { border: 1px solid #e8e8e8; border-radius: 8px; padding: 14px; }
  .model-name { font-weight: 600; color: #4a4a8a; margin-bottom: 8px; font-size: 14px; }
  .summary { font-size: 15px; line-height: 1.6; color: #333; white-space: pre-wrap; }
  .stats { margin-top: 10px; font-size: 12px; color: #888; }
  .totals { background: white; border-radius: 12px; padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .totals h2 { font-size: 16px; margin-bottom: 12px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals th, .totals td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
  .totals th { color: #666; font-weight: 600; }
</style>
</head>
<body>
<h1>Summary Extraction Comparison</h1>
<p class="meta">Generated: {{ generated_at }} | Models: {{ model_names | join(', ') }}</p>

{% for cid in content_ids %}
<div class="card">
  <div class="card-title{% if flags[cid] %} flagged{% endif %}">
    {{ cid }}
    {% if flags[cid] %}<span class="flag-badge">Low text ({{ input_chars[cid] }} chars)</span>{% endif %}
  </div>
  <div class="models">
    {% for model_name in model_names %}
    {% set entry = lookup[model_name].get(cid, {}) %}
    <div class="model-box">
      <div class="model-name">{{ model_name }}</div>
      <div class="summary">{{ entry.get('summary', entry.get('error', 'N/A')) }}</div>
      <div class="stats">
        {{ entry.get('latency_ms', 0) }}ms |
        {{ entry.get('prompt_tokens', 0) }} prompt tok |
        {{ entry.get('completion_tokens', 0) }} completion tok
      </div>
    </div>
    {% endfor %}
  </div>
</div>
{% endfor %}

<div class="totals">
  <h2>Totals</h2>
  <table>
    <tr>
      <th>Model</th>
      <th>Total Time</th>
      <th>Avg Latency</th>
      <th>Total Prompt Tokens</th>
      <th>Errors</th>
    </tr>
    {% for model_name in model_names %}
    {% set t = totals[model_name] %}
    <tr>
      <td>{{ model_name }}</td>
      <td>{{ "%.1f"|format(t.total_latency / 1000) }}s</td>
      <td>{{ "%.0f"|format(t.avg_latency) }}ms</td>
      <td>{{ t.total_prompt_tokens }}</td>
      <td>{{ t.errors }}</td>
    </tr>
    {% endfor %}
  </table>
</div>

</body>
</html>
"""


def generate_html_report(results: dict[str, list[dict]], output_path: str) -> None:
    """Generate a single-file HTML comparison report."""
    model_names = list(results.keys())

    content_ids = []
    for entries in results.values():
        for entry in entries:
            cid = entry["content_id"]
            if cid not in content_ids:
                content_ids.append(cid)

    lookup: dict[str, dict[str, dict]] = {}
    for model_name, entries in results.items():
        lookup[model_name] = {e["content_id"]: e for e in entries}

    flags: dict[str, bool] = {}
    input_chars: dict[str, int] = {}
    for cid in content_ids:
        chars = 0
        for model_name in model_names:
            entry = lookup.get(model_name, {}).get(cid, {})
            chars = max(chars, entry.get("input_chars", 0))
        input_chars[cid] = chars
        flags[cid] = chars < 100

    # Pre-compute totals in Python (safe when entries have error instead of metrics)
    totals = {}
    for model_name, entries in results.items():
        total_latency = sum(e.get("latency_ms", 0) for e in entries)
        total_prompt = sum(e.get("prompt_tokens", 0) for e in entries)
        errors = sum(1 for e in entries if "error" in e)
        totals[model_name] = type("T", (), {
            "total_latency": total_latency,
            "avg_latency": total_latency / max(len(entries), 1),
            "total_prompt_tokens": total_prompt,
            "errors": errors,
        })()

    template = Template(_HTML_TEMPLATE)
    html = template.render(
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        model_names=model_names,
        content_ids=content_ids,
        lookup=lookup,
        flags=flags,
        input_chars=input_chars,
        results=results,
        totals=totals,
    )

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
