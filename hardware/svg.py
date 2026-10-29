"""A few helpers for the RLC drawing set: the fume extractor's blueprint look (navy sheet, white frame,
blue dashed panels, amber labels) as plain SVG text."""
from xml.sax.saxutils import escape

BG = "#0d2545"
GRID = "#14325a"
LINE = "#e6eef7"
BLUE = "#7cc4f2"
PANEL = "#4f8fd0"
AMBER = "#f2c14e"
CORAL = "#ec8a6e"
GREEN = "#8fd694"
GREY = "#cfd8e3"
DIM = "#8aa6c4"
RED = "#ff6b6b"
FONT = "DejaVu Sans Mono, Menlo, Consolas, monospace"

NET_COLOUR = {"P12V": CORAL, "P12V_IN": CORAL, "GND": GREY, "P5V": BLUE, "P5V_R32": BLUE, "P3V3": GREEN}


class Sheet:
    def __init__(self, w, h):
        self.w, self.h, self.out = w, h, []

    def add(self, s):
        self.out.append(s)

    def text(self, x, y, s, size=14, fill=LINE, anchor="start", weight="normal", spacing=0, rotate=None):
        tr = f' transform="rotate({rotate} {x:.1f} {y:.1f})"' if rotate else ""
        ls = f' letter-spacing="{spacing}"' if spacing else ""
        self.add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
                 f'font-weight="{weight}"{ls}{tr}>{escape(str(s))}</text>')

    def line(self, x1, y1, x2, y2, stroke=LINE, width=2, dash=None, cap="round", opacity=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        o = f' opacity="{opacity}"' if opacity else ""
        self.add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" '
                 f'stroke-width="{width}" stroke-linecap="{cap}"{d}{o}/>')

    def poly(self, pts, stroke=LINE, width=2, fill="none", close=False):
        p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        tag = "polygon" if close else "polyline"
        self.add(f'<{tag} points="{p}" stroke="{stroke}" stroke-width="{width}" fill="{fill}" stroke-linejoin="round"/>')

    def rect(self, x, y, w, h, stroke=LINE, width=2, fill="none", r=0, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" stroke="{stroke}" '
                 f'stroke-width="{width}" fill="{fill}"{d}/>')

    def circle(self, x, y, r, stroke=LINE, width=2, fill="none"):
        self.add(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" stroke="{stroke}" stroke-width="{width}" fill="{fill}"/>')

    def path(self, d, stroke=LINE, width=2, fill="none"):
        self.add(f'<path d="{d}" stroke="{stroke}" stroke-width="{width}" fill="{fill}" stroke-linejoin="round" stroke-linecap="round"/>')

    def frame(self):
        self.rect(0, 0, self.w, self.h, stroke="none", fill=BG)
        # faint grid like drafting film
        for x in range(0, self.w, 40):
            self.line(x, 0, x, self.h, stroke=GRID, width=1, cap="butt")
        for y in range(0, self.h, 40):
            self.line(0, y, self.w, y, stroke=GRID, width=1, cap="butt")
        self.rect(24, 24, self.w - 48, self.h - 48, stroke=LINE, width=3)
        self.rect(40, 40, self.w - 80, self.h - 80, stroke=LINE, width=1.2)

    def panel(self, x, y, w, h, title, colour=BLUE):
        self.rect(x, y, w, h, stroke=PANEL, width=2, dash="10 7", r=6)
        tw = len(title) * 11.2 + 24
        self.rect(x + 18, y - 12, tw, 24, stroke="none", fill=BG)
        self.text(x + 30, y + 7, title, size=18, fill=colour, weight="bold", spacing=1.5)

    def svg(self):
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" width="{self.w}" height="{self.h}" '
                f'font-family="{FONT}">')
        return head + "\n".join(self.out) + "</svg>\n"

    def title_block(self, x, y, w, h, title, sub, drawing, sheet, no, rev="A", scale="NTS", supply="12 VDC 2 A"):
        self.rect(x, y, w, h, stroke=LINE, width=2)
        self.text(x + 18, y + 38, title, size=24, weight="bold", spacing=2)
        self.text(x + 18, y + 64, sub, size=14, fill=DIM, spacing=1.5)
        row = y + 80
        self.line(x, row, x + w, row, width=1.2)
        half = x + w / 2
        cells = [("DRAWING", drawing, "SHEET", sheet), ("DRAWING No.", no, "REV", rev), ("SCALE", scale, "SUPPLY", supply)]
        ch = (h - 80) / 3
        for i, (a, av, b, bv) in enumerate(cells):
            cy = row + i * ch
            if i:
                self.line(x, cy, x + w, cy, width=1)
            ly, vy = cy + min(22, ch * 0.4), cy + min(44, ch * 0.84)
            self.text(x + 18, ly, a, size=12, fill=DIM, spacing=1)
            self.text(x + 18, vy, av, size=16, fill=AMBER if i == 0 else LINE, weight="bold")
            self.text(half + 14, ly, b, size=12, fill=DIM, spacing=1)
            self.text(half + 14, vy, bv, size=16, fill=AMBER if i == 0 else LINE, weight="bold")
        self.line(half, row, half, y + h, width=1)
