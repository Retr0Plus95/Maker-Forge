#!/usr/bin/env python3
"""Inline src/core.js and the fonts in fonts/ into src/app.html, producing index.html."""
import base64, json
from pathlib import Path
root = Path(__file__).resolve().parent
app = (root / "src/app.html").read_text(encoding="utf-8")
core = (root / "src/core.js").read_text(encoding="utf-8")
assert app.count("/*CORE*/") == 1, "placeholder /*CORE*/ must appear exactly once"
assert app.count("/*FONTS*/{}") == 1, "placeholder /*FONTS*/{} must appear exactly once"
# one WOFF2 file per font, weight and alphabet (copied from @fontsource by tools-fonts.js), keyed
# "<font>-<alphabet>-<weight>", e.g. "pacifico-latin-400"
files = sorted((root / "fonts").glob("*-normal.woff2"))
assert files, "fonts/ is empty: run node tools-fonts.js"
fonts = {f.name[:-len("-normal.woff2")]: base64.b64encode(f.read_bytes()).decode("ascii") for f in files}
# the fonts' copyright notices and licences travel with every copy of the page, as a comment
licences = (root / "fonts/LICENSES.md").read_text(encoding="utf-8")
assert "*/" not in licences and "</script" not in licences.lower(), "fonts/LICENSES.md cannot go into a script comment"
font_js = "/*\n" + licences + "*/" + json.dumps(fonts, separators=(",", ":"))
out = app.replace("/*CORE*/", core).replace("/*FONTS*/{}", font_js)
(root / "index.html").write_text(out, encoding="utf-8")
print("built index.html", len(out.encode("utf-8")), "bytes, with", len(files), "font files")
