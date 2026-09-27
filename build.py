#!/usr/bin/env python3
"""Inline src/core.js, src/examples.js and the fonts in fonts/ into src/app.html, producing index.html."""
import base64, html, json, re
from pathlib import Path
root = Path(__file__).resolve().parent
app = (root / "src/app.html").read_text(encoding="utf-8")
core = (root / "src/core.js").read_text(encoding="utf-8")
assert app.count("/*CORE*/") == 1, "placeholder /*CORE*/ must appear exactly once"
assert app.count("/*FONTS*/{}") == 1, "placeholder /*FONTS*/{} must appear exactly once"
assert app.count("/*EXAMPLES*/") == 1, "placeholder /*EXAMPLES*/ must appear exactly once"
# the built-in examples: their drawings and which Start button opens which (Session 19)
examples = (root / "src/examples.js").read_text(encoding="utf-8")
assert app.count("/*THUMBS*/{}") == 1, "placeholder /*THUMBS*/{} must appear exactly once"
# pictures of each example for the Start sidebar, made by tools-thumbs.js (the buttons show icons without them)
thumbs_file = root / "examples/start-thumbs.json"
thumbs = json.loads(thumbs_file.read_text(encoding="utf-8")) if thumbs_file.exists() else {}
assert all(isinstance(k, str) and isinstance(v, str) and v.startswith(("data:image/webp;base64,", "data:image/png;base64,")) and "<" not in v for k, v in thumbs.items()), "examples/start-thumbs.json: data URLs only"
# one WOFF2 file per font, weight and alphabet (copied from @fontsource by tools-fonts.js), keyed
# "<font>-<alphabet>-<weight>", e.g. "pacifico-latin-400"
files = sorted((root / "fonts").glob("*-normal.woff2"))
assert files, "fonts/ is empty: run node tools-fonts.js"
fonts = {f.name[:-len("-normal.woff2")]: base64.b64encode(f.read_bytes()).decode("ascii") for f in files}
# the fonts' copyright notices and licences travel with every copy of the page, as a comment
licences = (root / "fonts/LICENSES.md").read_text(encoding="utf-8")
assert "*/" not in licences and "</script" not in licences.lower(), "fonts/LICENSES.md cannot go into a script comment"
font_js = "/*\n" + licences + "*/" + json.dumps(fonts, separators=(",", ":"))
# the user manual, MANUAL.md, as HTML for the app's Help window: headings, paragraphs, lists, tables, bold,
# italics, code and links; its screenshots stay in the repository (they would make the page far bigger)
def slug(s):
    return re.sub(r"\s", "-", re.sub(r"[^\w\s-]", "", s.lower()).strip())
def inline(s):
    s = html.escape(s, quote=True)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![*\w])\*([^*]+)\*(?![*\w])", r"<i>\1</i>", s)
    def link(m):
        text, url = m.group(1), m.group(2)
        if url.startswith("#"): return f'<a href="{url}" data-anchor="{url[1:]}">{text}</a>'
        if url.startswith("https://"): return f'<a href="{url}" target="_blank" rel="noopener">{text}</a>'
        return text
    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, s)
def manual_html(md):
    out, para, lst, table = [], [], None, []
    def flush():
        nonlocal para, lst, table
        if para: out.append("<p>" + inline(" ".join(para)) + "</p>"); para = []
        if lst: out.append(f"<{lst[0]}>" + "".join(f"<li>{inline(i)}</li>" for i in lst[1]) + f"</{lst[0]}>"); lst = None
        if table:
            rows = [[c.strip() for c in r.strip().strip("|").split("|")] for r in table if not re.match(r"^\|[\s:|-]+\|$", r.strip())]
            out.append("<table>" + "".join("<tr>" + "".join(f"<{'th' if i == 0 else 'td'}>{inline(c)}</{'th' if i == 0 else 'td'}>" for c in r) + "</tr>" for i, r in enumerate(rows)) + "</table>")
            table = []
    for line in md.splitlines():
        s = line.rstrip()
        if s.startswith("!["): flush(); continue
        m = re.match(r"^(#{1,4})\s+(.*)$", s)
        if m:
            flush(); n = len(m.group(1))
            if n > 1: out.append(f'<h{n + 1} id="m-{slug(m.group(2))}">{inline(m.group(2))}</h{n + 1}>')
            continue
        if s.startswith("|"): table.append(s); continue
        m = re.match(r"^(-|\d+\.)\s+(.*)$", s)
        if m:
            kind = "ul" if m.group(1) == "-" else "ol"
            if para or table or (lst and lst[0] != kind): flush()
            if not lst: lst = (kind, [])
            lst[1].append(m.group(2)); continue
        if s.startswith("  ") and lst: lst[1][-1] += " " + s.strip(); continue
        if not s.strip(): flush(); continue
        if lst or table: flush()
        para.append(s.strip())
    flush()
    return "".join(out)
manual = manual_html((root / "MANUAL.md").read_text(encoding="utf-8"))
assert "</script" not in manual.lower()
assert app.count('/*MANUAL*/""') == 1, 'placeholder /*MANUAL*/"" must appear exactly once'
out = app.replace("/*CORE*/", core).replace("/*EXAMPLES*/", examples).replace("/*THUMBS*/{}", json.dumps(thumbs, separators=(",", ":"))).replace('/*MANUAL*/""', json.dumps(manual)).replace("/*FONTS*/{}", font_js)
(root / "index.html").write_text(out, encoding="utf-8")
print("built index.html", len(out.encode("utf-8")), "bytes, with", len(files), "font files and", len(thumbs), "start pictures")
