#!/usr/bin/env python3
"""Inline src/core.js into src/app.html, producing index.html."""
from pathlib import Path
root = Path(__file__).resolve().parent
app = (root / "src/app.html").read_text(encoding="utf-8")
core = (root / "src/core.js").read_text(encoding="utf-8")
assert app.count("/*CORE*/") == 1, "placeholder /*CORE*/ must appear exactly once"
(root / "index.html").write_text(app.replace("/*CORE*/", core), encoding="utf-8")
print("built index.html", len(app) + len(core) - 8, "bytes")
