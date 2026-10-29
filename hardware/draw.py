"""Draws the RLC-2026 drawing set from netlist.py and layout.py:
  RLC-01 schematic, RLC-02 reference (R32 pins, jumpers, remotes), RLC-03 perfboard layout, RLC-04 box wiring.
  python3 hardware/draw.py && node hardware/render_png.js
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from svg import Sheet, BG, LINE, BLUE, PANEL, AMBER, CORAL, GREEN, GREY, DIM, RED, NET_COLOUR  # noqa: E402
from netlist import PARTS, NETS, NET_INFO, HARNESS  # noqa: E402
import layout as L  # noqa: E402
import check_layout  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")
TITLE = "RGB LAMP CONTROLLER"
SUB = "ESP32 (D1 R32) · 12 V RGB STRIP DRIVER"

SHORT = {"P12V": "+12V", "P12V_IN": "+12V IN", "GND": "0V", "P5V": "+5V", "P5V_R32": "5V R32", "P3V3": "3V3"}


def net_name(n):
    return SHORT.get(n, n)


def save(sheet, rel):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(sheet.svg())
    print("wrote", rel)


# ------------------------------------------------------------------ RLC-03 perfboard layout

# where each part's name goes, in holes from the middle of its body: (dx, dy, anchor)
LABEL_AT = {
    "T1": (0, -1.75, "middle"), "J2": (0, -1.75, "middle"), "F1": (0, 1.05, "middle"), "D1": (0, -2.55, "middle"),
    "C1": (0, -0.05, "middle"), "U1": (0, 0.2, "middle"), "Q1": (0, 0.0, "middle"), "Q2": (0, 0.0, "middle"),
    "Q3": (0, 0.0, "middle"), "C4": (0, -0.05, "middle"), "C2": (0.55, 0, "start"),
    "D2": (-0.55, 1.15, "end"), "C3": (0, 1.45, "middle"), "R7": (-0.55, 0, "end"), "R9": (0, -1.0, "middle"), "C5": (-0.2, -1.75, "middle"),
    "J3": (0, 2.05, "middle"), "J4": (0, 2.05, "middle"), "J5": (0, 2.05, "middle"), "J6": (0, 2.05, "middle"),
}
PIN_NAME = {"GND1": "0V", "GND2": "0V", "GND": "0V", "IN": "+12V", "12V": "+12V"}


def layout_sheet():
    problems = check_layout.check()
    assert not problems, "layout does not match the netlist:\n" + "\n".join(problems)
    P = 30
    mm = P / 2.54
    bx0, by0 = 110, 240                                    # board's top left corner
    mx, my = (90 - 29 * 2.54) / 2, (70 - 23 * 2.54) / 2    # board edge to the first hole, mm
    hx = lambda c: bx0 + (mx + (c - 1) * 2.54) * mm
    hy = lambda r: by0 + (my + (r - 1) * 2.54) * mm
    links = L.LINKS
    rows_needed = (len(links) + 2) // 3
    by1 = by0 + 70 * mm
    wy = by1 + 80
    W, H = 2000, int(wy + 100 + rows_needed * 30 + 90)
    s = Sheet(W, H)
    s.frame()
    s.text(90, 108, TITLE + " — PERFBOARD LAYOUT", size=34, weight="bold", spacing=2)
    s.text(90, 146, "component side (looking down on the parts) · 0.1 in grid · 30 × 24 holes · 7 × 9 cm board", size=18, fill=BLUE)

    s.rect(bx0, by0, 90 * mm, 70 * mm, stroke="#6d8fb5", width=2.5, r=10, fill="#10305a")
    for cx, cy in ((3.5, 3.5), (86.5, 3.5), (3.5, 66.5), (86.5, 66.5)):
        s.circle(bx0 + cx * mm, by0 + cy * mm, 1.5 * mm, stroke="#6d8fb5", width=2)
    for c in range(1, L.COLS + 1):
        if c % 2 == 1 or c == L.COLS:
            s.text(hx(c), by0 - 10, c, size=13, fill=DIM, anchor="middle")
    for r in range(1, L.ROWS + 1):
        s.text(bx0 - 12, hy(r) + 5, r, size=13, fill=DIM, anchor="end")
    for c in range(1, L.COLS + 1):
        for r in range(1, L.ROWS + 1):
            s.circle(hx(c), hy(r), 3.6, stroke="#5c7fa8", width=1.3)
    s.text(bx0 + 45 * mm, by0 - 34, "BACK OF THE BOX ▲  12 V jack · strip socket", size=15, fill=DIM, anchor="middle")
    s.text(bx0 + 45 * mm, by1 + 30, "FRONT OF THE BOX ▼  IR receiver · button · status light", size=15, fill=DIM, anchor="middle")
    s.text(bx0 - 44, by0 + 35 * mm, "◀ D1 R32", size=15, fill=DIM, anchor="middle", rotate=-90)

    for net, a, b in L.BUSES:
        s.line(hx(a[0]), hy(a[1]), hx(b[0]), hy(b[1]), stroke=NET_COLOUR.get(net, GREY), width=8, opacity=0.85)
        for c in range(min(a[0], b[0]), max(a[0], b[0]) + 1):
            for r in range(min(a[1], b[1]), max(a[1], b[1]) + 1):
                s.circle(hx(c), hy(r), 2.8, stroke="none", fill="#ffffff")
    for a, b, net in links:
        s.line(hx(a[0]), hy(a[1]), hx(b[0]), hy(b[1]), stroke=AMBER, width=2.4, opacity=0.9)
        for c, r in (a, b):
            s.circle(hx(c), hy(r), 4.2, stroke="none", fill=AMBER)

    for ref, pl in L.PLACE.items():
        kind = PARTS[ref]["kind"]
        x1, y1, x2, y2 = pl["body"][0]
        X1, Y1, X2, Y2 = hx(x1), hy(y1), hx(x2), hy(y2)
        cx, cy = (X1 + X2) / 2, (Y1 + Y2) / 2
        val = PARTS[ref]["value"]
        colour = {"cer": GREEN, "elec": CORAL, "diode": CORAL, "schottky": CORAL, "ptc": CORAL}.get(kind, LINE)
        if kind == "elec":
            r = min(X2 - X1, Y2 - Y1) / 2
            s.circle(cx, cy, r, stroke=colour, width=2.5, fill=BG)
            plus = pl["pins"]["+"]
            s.text(hx(plus[0]) + 8, hy(plus[1]) - 5, "+", size=15, fill=colour, weight="bold")
        elif kind in ("nmos", "reg"):
            s.rect(X1, Y1, X2 - X1, Y2 - Y1, stroke=AMBER if kind == "nmos" else BLUE, width=2.5, fill=BG, r=3)
            s.line(X1 + 4, Y1 + 5, X2 - 4, Y1 + 5, stroke=DIM, width=4, cap="butt")
            if kind == "reg":
                for i in range(1, 6):                     # heatsink fins
                    yy = Y1 + 5 + i * (Y2 - Y1 - 30) / 6
                    s.line(X1 + 10, yy, X2 - 10, yy, stroke="#3c5f88", width=1.5)
            for pin, (c, rr) in pl["pins"].items():
                s.text(hx(c), hy(rr) + 20, pin, size=11, fill=DIM, anchor="middle")
        elif kind in ("terminal", "header"):
            s.rect(X1, Y1, X2 - X1, Y2 - Y1, stroke=BLUE, width=2.5, fill=BG, r=5)
            for pin, (c, rr) in pl["pins"].items():
                s.rect(hx(c) - 5, hy(rr) - 5, 10, 10, stroke=BLUE, width=1.5)
        else:
            s.rect(X1, Y1, X2 - X1, Y2 - Y1, stroke=colour, width=2.5, fill=BG, r=5)
            if kind in ("diode", "schottky"):
                k, a = pl["pins"]["K"], pl["pins"]["A"]
                band = Y1 + 5 if k[1] < a[1] else Y2 - 5
                s.line(X1 + 1, band, X2 - 1, band, stroke=LINE, width=4, cap="butt")
        for pin, (c, rr) in pl["pins"].items():
            s.circle(hx(c), hy(rr), 4.6, stroke=AMBER, width=2, fill=BG)
        dx, dy, anchor = LABEL_AT.get(ref, (0.5, 0, "start"))
        lx, ly = cx + dx * 2.54 * mm, cy + dy * 2.54 * mm
        short = (val.replace(" screw terminal", " terminal").replace("1x", "1×").replace(" pin header", "")
                 .replace("L7805CV", "L7805CV + heatsink"))
        s.text(lx, ly - 2, ref, size=14, fill=AMBER, weight="bold", anchor=anchor)
        s.text(lx, ly + 13, short, size=11.5, fill=LINE, anchor=anchor)
    for ref in ("J3", "J4", "J5", "J6", "T1", "J2"):
        for pin, (c, r) in L.PLACE[ref]["pins"].items():
            name = PIN_NAME.get(pin, pin)
            if ref in ("T1", "J2"):
                s.text(hx(c), hy(r) + 24, name, size=11, fill=DIM, anchor="middle")
            else:
                s.text(hx(c) + 4, hy(r) + 14, name, size=11, fill=DIM, anchor="end", rotate=-90)

    lx, ly = 1240, 240
    s.rect(lx, ly, 700, 300, stroke=LINE, width=2, r=6)
    s.text(lx + 22, ly + 40, "LEGEND", size=20, fill=AMBER, weight="bold", spacing=2)
    items = [(CORAL, 8, "bare wire bus — +12 V"), (GREY, 8, "bare wire bus — 0 V"), (BLUE, 8, "bare wire bus — +5 V"),
             (GREEN, 8, "bare wire bus — 3.3 V from the R32"), (AMBER, 2.4, "insulated link (underside)")]
    for i, (col, wdt, label) in enumerate(items):
        yy = ly + 80 + i * 34
        s.line(lx + 26, yy, lx + 86, yy, stroke=col, width=wdt)
        s.text(lx + 104, yy + 6, label, size=16)
    s.text(lx + 22, ly + 262, "Buses and links are soldered on the UNDERSIDE. Parts go on top.", size=14, fill=DIM)
    s.text(lx + 22, ly + 284, "TO-220 parts: printed face to the FRONT edge, metal tab to the back.", size=14, fill=DIM)

    ny = 575
    s.rect(lx, ny, 700, 345, stroke=LINE, width=2, r=6)
    s.text(lx + 22, ny + 40, "BUILD ORDER", size=20, fill=AMBER, weight="bold", spacing=2)
    notes = [
        "1  Bare-wire buses first, on the empty board:",
        "   +12 V row 4 · 0 V rows 6, 15, 22 and column 2",
        "   +5 V row 13 · 3.3 V row 19. Use 0.8 mm tinned wire",
        "   for +12 V, row 6 and column 2 (strip current).",
        "2  The insulated links from the wire list. Links 8-13",
        "   (sources and drains) in 0.5 mm² / 20 AWG wire.",
        "3  Resistors, diodes, ceramic capacitors, then the",
        "   headers, terminals and electrolytics (+ marked).",
        "4  U1 with its heatsink, then Q1-Q3 (static-safe).",
        "5  Smoke test before the R32 jumpers (Build Guide §8).",
    ]
    for i, n in enumerate(notes):
        s.text(lx + 22, ny + 78 + i * 26, n, size=15, fill=LINE if n[0] != " " else DIM)

    s.rect(90, wy, W - 180, H - wy - 60, stroke=LINE, width=2)
    s.text(118, wy + 40, f"WIRE LIST — {len(links)} INSULATED LINKS, UNDERSIDE", size=20, fill=AMBER, weight="bold", spacing=2)
    colw = (W - 240) / 3
    for i, (a, b, net) in enumerate(links):
        col, row = divmod(i, rows_needed)
        x = 130 + col * colw
        y = wy + 84 + row * 30
        s.text(x, y, f"{i + 1:>2}", size=15, fill=DIM)
        s.text(x + 44, y, f"{a[0]},{a[1]}", size=15)
        s.text(x + 150, y, "→", size=15, fill=DIM)
        s.text(x + 186, y, f"{b[0]},{b[1]}", size=15)
        s.text(x + 300, y, net_name(net), size=15, fill=AMBER, weight="bold")
    s.text(118, H - 84, "Coordinates are column,row. Checked by hardware/check_layout.py against the netlist: "
           f"{len(set(n for n in check_layout.board_pins().values()))} nets joined, no shorts, no lead under a part.", size=14, fill=DIM)
    save(s, "docs/layout/RLC-03_Perfboard_Layout.svg")


# ------------------------------------------------------------------ schematic symbols

ORANGE = "#ff9f43"


class Sch(Sheet):
    def wire(self, *pts, colour=LINE, width=2.2, dash=None):
        if dash:
            for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
                self.line(x1, y1, x2, y2, stroke=colour, width=width, dash=dash)
        else:
            self.poly(pts, stroke=colour, width=width)

    def dot(self, x, y):
        self.circle(x, y, 5, stroke="none", fill=LINE)

    def gnd(self, x, y, lead=0):
        if lead:
            self.line(x, y - lead, x, y)
        self.line(x - 14, y, x + 14, y, width=2.4)
        self.line(x - 9, y + 6, x + 9, y + 6, width=2.4)
        self.line(x - 4, y + 12, x + 4, y + 12, width=2.4)

    def flag(self, x, y, text, side="right", colour=BLUE, w=None):
        """a net label; (x, y) is where the wire meets it; side: which way the label sticks out"""
        w = w or max(64, len(text) * 11 + 26)
        h = 30
        if side == "right":
            pts = [(x, y), (x + 12, y - h / 2), (x + w, y - h / 2), (x + w, y + h / 2), (x + 12, y + h / 2)]
            tx = x + 12 + (w - 12) / 2
        else:
            pts = [(x, y), (x - 12, y - h / 2), (x - w, y - h / 2), (x - w, y + h / 2), (x - 12, y + h / 2)]
            tx = x - 12 - (w - 12) / 2
        self.poly(pts, stroke=colour, width=2.2, fill=BG, close=True)
        self.text(tx, y + 6, text, size=16, fill=colour, anchor="middle", weight="bold")

    def ref(self, x, y, r, v=None, anchor="start", vcol=LINE):
        self.text(x, y, r, size=16, fill=AMBER, weight="bold", anchor=anchor)
        if v:
            self.text(x, y + 19, v, size=14, fill=vcol, anchor=anchor)

    def res(self, x, y, vertical=False, ptc=False):
        """centred at (x, y), 80 long; returns the two ends"""
        if vertical:
            self.line(x, y - 40, x, y - 21)
            self.line(x, y + 21, x, y + 40)
            self.rect(x - 8, y - 21, 16, 42, width=2.2, fill=BG)
            if ptc:
                self.line(x - 16, y + 18, x + 16, y - 18, width=1.8)
            return (x, y - 40), (x, y + 40)
        self.line(x - 40, y, x - 21, y)
        self.line(x + 21, y, x + 40, y)
        self.rect(x - 21, y - 8, 42, 16, width=2.2, fill=BG)
        if ptc:
            self.line(x - 18, y + 14, x + 18, y - 14, width=1.8)
            self.line(x + 18, y - 14, x + 24, y - 14, width=1.8)
        return (x - 40, y), (x + 40, y)

    def cap(self, x, y, elec=False, tag=True):
        """vertical, centred at (x, y), 60 long; + at the top"""
        self.line(x, y - 30, x, y - 4)
        self.line(x - 14, y - 4, x + 14, y - 4, width=2.6)
        if elec:
            self.path(f"M{x - 14},{y + 9} Q{x},{y + 1} {x + 14},{y + 9}", width=2.6)
            self.line(x, y + 5, x, y + 30)
            self.text(x - 22, y - 10, "+", size=15, weight="bold")
        else:
            self.line(x - 14, y + 4, x + 14, y + 4, width=2.6)
            self.line(x, y + 4, x, y + 30)
        if tag:
            self.text(x + 20, y + 30, "ELEC" if elec else "CER", size=12, fill=ORANGE if elec else GREEN, weight="bold")
        return (x, y - 30), (x, y + 30)

    def diode(self, x, y, direction="up", kind="diode"):
        """centred at (x, y), 60 long; direction: from anode to cathode"""
        d = {"up": (0, -1), "down": (0, 1), "right": (1, 0), "left": (-1, 0)}[direction]
        px, py = -d[1], d[0]
        a = (x - d[0] * 30, y - d[1] * 30)
        k = (x + d[0] * 30, y + d[1] * 30)
        self.line(a[0], a[1], x - d[0] * 11, y - d[1] * 11)
        self.line(x + d[0] * 11, y + d[1] * 11, k[0], k[1])
        tri = [(x - d[0] * 11 + px * 12, y - d[1] * 11 + py * 12), (x - d[0] * 11 - px * 12, y - d[1] * 11 - py * 12),
               (x + d[0] * 11, y + d[1] * 11)]
        self.poly(tri, width=2.2, fill=BG if kind != "led" else BG, close=True)
        bx, by = x + d[0] * 11, y + d[1] * 11
        self.line(bx + px * 12, by + py * 12, bx - px * 12, by - py * 12, width=2.6)
        if kind == "schottky":
            self.line(bx + px * 12, by + py * 12, bx + px * 12 - d[0] * 5, by + py * 12 - d[1] * 5, width=2.4)
            self.line(bx - px * 12, by - py * 12, bx - px * 12 + d[0] * 5, by - py * 12 + d[1] * 5, width=2.4)
        if kind == "led":
            for o in (0, 9):
                sx, sy = x + px * (16 + o) + d[0] * 2, y + py * (16 + o) + d[1] * 2
                ex, ey = sx + px * 12 + d[0] * 8, sy + py * 12 + d[1] * 8
                self.line(sx, sy, ex, ey, width=1.6)
                self.poly([(ex - px * 4 - d[0] * 1, ey - py * 4 - d[1] * 1), (ex, ey), (ex - d[0] * 5 + px * 1, ey - d[1] * 5 + py * 1)], width=1.6)
        return a, k

    def nmos(self, x, y):
        """drain/source on the line x, gate from the left at y; returns gate end, drain end, source end"""
        self.circle(x - 10, y, 34, width=1.6)
        self.line(x - 60, y, x - 26, y)                     # gate lead
        self.line(x - 26, y - 18, x - 26, y + 18, width=2.4)   # gate plate
        for y1, y2 in ((y - 20, y - 10), (y - 5, y + 5), (y + 10, y + 20)):
            self.line(x - 19, y1, x - 19, y2, width=2.6)        # enhancement channel
        self.line(x - 19, y - 15, x, y - 15)
        self.line(x, y - 15, x, y - 50)                     # drain
        self.line(x - 19, y + 15, x, y + 15)
        self.line(x, y + 15, x, y + 50)                     # source
        self.line(x - 19, y, x, y)
        self.line(x, y, x, y + 15)                          # body tied to source
        self.poly([(x - 18, y), (x - 10, y - 5), (x - 10, y + 5)], width=1.6, fill=LINE, close=True)
        return (x - 60, y), (x, y - 50), (x, y + 50)

    def box(self, x, y, w, h, ref, val=None, ref_above=True):
        self.rect(x, y, w, h, width=2.4, fill=BG)
        if ref_above:
            self.text(x + w / 2, y - 12, ref, size=16, fill=AMBER, weight="bold", anchor="middle")
        if val:
            self.text(x + w / 2, y + h + 22, val, size=14, anchor="middle")

    def pin(self, x, y, name, num=None, side="left", inside=True):
        self.rect(x - 5, y - 5, 10, 10, width=1.8, fill=BG)
        if name:
            off = 12 if side == "left" else -12
            self.text(x + off, y + 5, name, size=13, anchor="start" if side == "left" else "end")
        if num is not None:
            off = -10 if side == "left" else 10
            self.text(x + off, y - 9, num, size=11, fill=DIM, anchor="end" if side == "left" else "start")


def schematic_sheet():
    s = Sch(2000, 1400)
    s.frame()

    # ---------------- A: power
    s.panel(70, 90, 600, 470, "A — POWER INPUT & 5 V SUPPLY")
    s.box(100, 168, 64, 84, "J1", None)
    s.text(132, 272, "DC JACK", size=13, anchor="middle")
    s.text(132, 289, "BACK WALL", size=11, fill=DIM, anchor="middle")
    s.pin(164, 188, "+", side="right"); s.pin(164, 232, "−", side="right")
    s.box(214, 172, 34, 76, "T1", None)
    s.pin(214, 188, None, 2); s.pin(214, 232, None, 1)
    s.pin(248, 188, None, side="right"); s.pin(248, 232, None, side="right")
    s.wire((169, 188), (209, 188)); s.wire((169, 232), (209, 232))
    s.text(132, 306, "12 V 2 A, centre +", size=11, fill=DIM, anchor="middle")
    a, b = s.res(320, 188, ptc=True)
    s.ref(296, 166, "F1"); s.text(320, 222, "PTC 2.5 A", size=13, anchor="middle")
    s.wire((253, 188), a)
    s.wire(b, (580, 188))
    s.flag(580, 188, "+12V", colour=CORAL)
    s.dot(420, 188); s.dot(510, 188)
    da, dk = s.diode(420, 248, "up")
    s.wire((420, 188), dk); s.gnd(420, 300, lead=22)
    s.ref(440, 242, "D1", "1N4007")
    ca, cb = s.cap(510, 248, elec=True)
    s.wire((510, 188), ca); s.gnd(510, 300, lead=22)
    s.ref(530, 236, "C1", "470µ 25V")
    s.wire((253, 232), (276, 232), (276, 286)); s.gnd(276, 300, lead=14)
    s.text(96, 352, "▸ D1 is a reverse-polarity SHUNT: it only conducts if the", size=13, fill=AMBER)
    s.text(96, 370, "  supply is backwards, then F1 trips. Unplug to reset it.", size=13, fill=AMBER)

    y5 = 440
    s.flag(160, y5, "+12V", side="left", colour=CORAL)
    s.wire((160, y5), (260, y5))
    s.dot(200, y5)
    c2a, c2b = s.cap(200, y5 + 46)
    s.wire((200, y5), c2a); s.gnd(200, c2b[1] + 10, lead=10)
    s.ref(150, y5 + 42, "C2", "330n", anchor="end")
    s.box(260, y5 - 32, 120, 72, "U1", None)
    s.text(320, y5 - 10, "L7805CV", size=15, anchor="middle", weight="bold")
    s.text(320, y5 + 8, "+ heatsink", size=12, fill=DIM, anchor="middle")
    s.text(266, y5 + 32, "IN", size=12, fill=DIM); s.text(374, y5 + 32, "OUT", size=12, fill=DIM, anchor="end")
    s.wire((320, y5 + 40), (320, y5 + 66)); s.gnd(320, y5 + 66)
    s.text(330, y5 + 58, "GND", size=12, fill=DIM)
    s.wire((380, y5), (530, y5))
    s.dot(420, y5); s.dot(470, y5)
    c3a, c3b = s.cap(420, y5 + 46)
    s.wire((420, y5), c3a); s.gnd(420, c3b[1] + 10, lead=10)
    c4a, c4b = s.cap(470, y5 + 46, elec=True, tag=False)
    s.text(490, y5 + 76, "ELEC", size=12, fill=ORANGE, weight="bold")
    s.wire((470, y5), c4a); s.gnd(470, c4b[1] + 10, lead=10)
    s.ref(392, y5 - 22, "C3", None, anchor="middle"); s.text(392, y5 - 6, "100n", size=13, anchor="middle")
    s.ref(488, y5 - 22, "C4", None, anchor="middle"); s.text(500, y5 - 6, "100µ 10V", size=13, anchor="middle")
    d2a, d2k = s.diode(560, y5, "right", kind="schottky")
    s.wire((530, y5), d2a)
    s.ref(560, y5 + 32, "D2", "1N5819", anchor="middle")
    s.flag(590, y5, "5V R32", colour=BLUE, w=74)

    # ---------------- B: the R32 link
    s.panel(700, 90, 460, 990, "B — D1 R32 LINK (J3)")
    pins = [("D12 · GPIO19", "BTN"), ("D13 · GPIO18", "LED"), ("5V", "5V R32"), ("GND", None), ("GND by D13", None),
            ("3V3", "3V3"), ("D3 · GPIO25", "PWM_R"), ("D6 · GPIO27", "PWM_G"), ("D11 · GPIO23", "PWM_B"), ("D2 · GPIO26", "IR")]
    top, step = 200, 52
    s.box(725, 150, 160, len(pins) * step + 40, "M1  WeMos D1 R32", None)
    s.text(805, top + len(pins) * step + 36, "ESP32 · 3.3 V logic", size=13, fill=DIM, anchor="middle")
    s.box(965, 172, 44, len(pins) * step - 4, "J3", None)
    for i, (rpin, net) in enumerate(pins):
        y = top + i * step
        s.pin(885, y, rpin, side="right")
        s.wire((890, y), (960, y), dash="8 6", colour=AMBER, width=2)
        s.pin(965, y, None, i + 1)
        s.text(987, y + 5, str(i + 1), size=13, fill=DIM, anchor="middle")
        s.pin(1009, y, None, side="right")
        if net:
            s.wire((1014, y), (1045, y))
            colour = {"5V R32": BLUE, "3V3": GREEN}.get(net, BLUE)
            s.flag(1045, y, net, colour=colour)
    s.wire((1014, top + 3 * step), (1039, top + 3 * step), (1039, top + 4 * step + 22))
    s.wire((1014, top + 4 * step), (1039, top + 4 * step))
    s.dot(1039, top + 4 * step)
    s.gnd(1039, top + 4 * step + 22)
    s.text(925, top - 30, "jumpers", size=12, fill=AMBER, anchor="middle")
    notes = [("Female-female Dupont jumpers into the R32's own", LINE), ("header sockets: nothing is soldered to the R32.", LINE),
             ("", LINE), ("Pins with no job at boot only. Not used:", AMBER), ("D4, D5   labels differ between R32 makers", DIM),
             ("D7, D10  pulse at boot (GPIO14, GPIO5)", DIM), ("D8, A0   boot strapping pins (GPIO12, GPIO2)", DIM),
             ("", LINE), ("USB: upload with the 12 V unplugged,", LINE), ("or over Wi-Fi once the firmware is in.", LINE),
             ("", LINE), ("Pin map and jumper list: sheet 2.", BLUE)]
    for i, (n, col) in enumerate(notes):
        s.text(722, 790 + i * 22, n, size=13.5, fill=col)

    # ---------------- C: strip driver
    s.panel(1190, 90, 740, 760, "C — STRIP DRIVER (3 × LOW-SIDE MOSFET)")
    xs = {"+12V": 1240, "R": 1420, "G": 1635, "B": 1850}
    s.rect(1210, 140, 700, 140, stroke=DIM, width=1.6, dash="6 6", r=6)
    s.text(1224, 162, "LED STRIP IN THE LAMP · 12 V, COMMON +", size=13, fill=DIM)
    s.wire((xs["+12V"], 182), (xs["B"], 182), colour=CORAL)
    for col, colour in (("R", RED), ("G", GREEN), ("B", BLUE)):
        x = xs[col]
        s.dot(x, 182)
        s.wire((x, 182), (x, 190))
        s.rect(x - 7, 190, 14, 26, width=2, fill=BG)
        s.wire((x, 216), (x, 222))
        a, k = s.diode(x, 246, "down", kind="led")
        s.wire(k, (x, 290))
        s.text(x + 34, 254, f"{col} ×3", size=13, fill=colour, weight="bold")
    s.wire((xs["+12V"], 182), (xs["+12V"], 290), colour=CORAL)
    s.rect(1210, 310, 700, 34, width=2.2, fill=BG)
    s.text(1440, 302, "J7  GX12-4 · BACK WALL", size=13, fill=AMBER, weight="bold")
    s.rect(1210, 380, 700, 34, width=2.2, fill=BG)
    s.text(1440, 368, "J2  SCREW TERMINAL", size=13, fill=AMBER, weight="bold")
    for i, (col, x) in enumerate(xs.items()):
        s.wire((x, 290), (x, 310), colour=CORAL if col == "+12V" else LINE)
        s.text(x, 333, f"{i + 1} {col}", size=13, anchor="middle")
        s.wire((x, 344), (x, 380), colour=CORAL if col == "+12V" else LINE)
        s.text(x, 403, f"{i + 1} {col}", size=13, anchor="middle")
    s.wire((xs["+12V"], 414), (xs["+12V"], 460), colour=CORAL)
    s.flag(xs["+12V"], 460, "+12V", side="right", colour=CORAL)
    for i, col in enumerate(("R", "G", "B")):
        x0 = xs[col]
        q = f"Q{i + 1}"
        g, d, src = s.nmos(x0, 560)
        s.wire((x0, 414), d)
        s.text(x0 + 30, 480, f"CH_{col}", size=12, fill=DIM)
        s.ref(x0 - 50, 494, q, "IRLZ44N", anchor="end")
        node = (x0 - 85, 560)
        s.wire(g, node)
        s.dot(*node)
        ra, rb = s.res(node[0] - 70, 560)
        s.wire(rb, node)
        s.ref(node[0] - 70, 540, f"R{i + 1}", None, anchor="middle")
        s.text(node[0] - 70, 588, "100R", size=13, anchor="middle")
        s.wire(ra, (ra[0], 700))
        s.flag(ra[0], 700, f"PWM_{col}", side="right", colour=BLUE)
        pa, pb = s.res(node[0], 640, vertical=True)
        s.wire(node, pa)
        s.gnd(node[0], 700, lead=20)
        s.ref(node[0] + 14, 636, f"R{i + 4}", "10k")
        s.gnd(x0, 640, lead=30)
    s.text(1210, 770, "▸ R4–R6 pull the gates low: the strip stays dark while the ESP32", size=13, fill=AMBER)
    s.text(1210, 788, "  starts, resets or is unplugged. 5 kHz PWM, 12-bit, gamma 2.2.", size=13, fill=AMBER)
    s.text(1210, 810, "▸ 3.3 V gate drive: logic-level MOSFETs only (IRLZ44N, IRLB8721).", size=13, fill=AMBER)
    s.text(1210, 828, "  IRF520 / IRF540 need 10 V on the gate and will stay half on.", size=13, fill=AMBER)

    # ---------------- D: user interface
    s.panel(70, 600, 600, 480, "D — FRONT PANEL: IR, BUTTON, STATUS LIGHT")
    yo, yg, yv = 730, 765, 800
    s.box(380, yo - 22, 40, 110, "J4", None)
    for yy, n in ((yo, 1), (yg, 2), (yv, 3)):
        s.pin(380, yy, None, n); s.pin(420, yy, None, side="right")
    s.box(500, yo - 26, 120, 118, "U2", None)
    s.text(560, yo + 110, "VS1838B", size=13, anchor="middle"); s.text(560, yo + 126, "TSOP38238", size=13, anchor="middle")
    s.text(560, yo + 144, "FRONT WALL", size=11, fill=DIM, anchor="middle")
    for yy, n in ((yo, "OUT"), (yg, "GND"), (yv, "VS")):
        s.pin(500, yy, n)
        s.wire((425, yy), (495, yy), dash="8 6", colour=AMBER, width=2)
    s.path(f"M590,{yo + 22} a10,10 0 0 1 0,26 M598,{yo + 14} a18,18 0 0 1 0,42", width=1.8)
    s.flag(140, yo, "IR", side="left", colour=BLUE)
    s.wire((140, yo), (375, yo))
    s.dot(230, yo)
    r8a, r8b = s.res(230, yo - 52, vertical=True)
    s.wire(r8b, (230, yo))
    s.flag(230 - 0, yo - 92 - 15 + 15, "3V3", side="right", colour=GREEN)
    s.ref(246, yo - 60, "R8", "10k")
    s.wire((375, yg), (350, yg), (350, yg + 8)); s.gnd(350, yg + 8)
    s.flag(140, yv, "3V3", side="left", colour=GREEN)
    r7a, r7b = s.res(190, yv)
    s.wire((140, yv), r7a)
    s.wire(r7b, (375, yv))
    s.dot(280, yv)
    c5a, c5b = s.cap(280, yv + 36, elec=True)
    s.wire((280, yv), c5a); s.gnd(280, c5b[1] + 8, lead=8)
    s.ref(190, yv - 18, "R7", None, anchor="middle"); s.text(190, yv + 32, "100R", size=13, anchor="middle")
    s.ref(300, yv + 22, "C5", "10µ")
    s.text(234, yv - 10, "IR_VS", size=12, fill=DIM)

    yb = 935
    s.box(380, yb - 22, 40, 70, "J5", None)
    s.pin(380, yb, None, 1); s.pin(380, yb + 30, None, 2)
    s.pin(420, yb, None, side="right"); s.pin(420, yb + 30, None, side="right")
    s.flag(140, yb, "BTN", side="left", colour=BLUE)
    s.wire((140, yb), (375, yb))
    s.wire((375, yb + 30), (350, yb + 30), (350, yb + 38)); s.gnd(350, yb + 38)
    s.wire((425, yb), (520, yb), dash="8 6", colour=AMBER, width=2)
    s.wire((425, yb + 30), (520, yb + 30), dash="8 6", colour=AMBER, width=2)
    s.wire((520, yb), (540, yb)); s.wire((520, yb + 30), (540, yb + 30))
    s.circle(544, yb, 4, width=2); s.circle(544, yb + 30, 4, width=2)
    s.line(556, yb - 4, 556, yb + 34, width=2.4)
    s.line(556, yb + 15, 572, yb + 15, width=2.4)
    s.line(548, yb, 552, yb); s.line(548, yb + 30, 552, yb + 30)
    s.ref(584, yb + 2, "SW1", "12 mm push")
    s.text(160, yb + 26, "internal pull-up", size=12, fill=DIM)

    yl = 1022
    s.box(380, yl - 22, 40, 70, "J6", None)
    s.pin(380, yl, None, 1); s.pin(380, yl + 30, None, 2)
    s.pin(420, yl, None, side="right"); s.pin(420, yl + 30, None, side="right")
    s.flag(140, yl, "LED", side="left", colour=BLUE)
    r9a, r9b = s.res(220, yl)
    s.wire((140, yl), r9a); s.wire(r9b, (375, yl))
    s.ref(220, yl - 18, "R9", None, anchor="middle"); s.text(220, yl + 32, "220R", size=13, anchor="middle")
    s.wire((375, yl + 30), (350, yl + 30), (350, yl + 38)); s.gnd(350, yl + 38)
    s.wire((425, yl), (520, yl), dash="8 6", colour=AMBER, width=2)
    s.wire((425, yl + 30), (520, yl + 30), dash="8 6", colour=AMBER, width=2)
    la, lk = s.diode(560, yl + 15, "down", kind="led")
    s.wire((520, yl), (560, yl), (560, yl - 15)); s.wire(la, (560, yl - 15))
    s.wire(lk, (560, yl + 45), (520, yl + 45), (520, yl + 30))
    s.ref(600, yl + 4, "LED1", "5 mm")

    # ---------------- E: notes
    s.panel(1190, 880, 740, 200, "E — DESIGN NOTES")
    en = ["1. U1 drops 7 V at about 0.15 A ≈ 1 W: fit the heatsink, vent the box.",
          "2. D2 stops USB feeding back into U1: the R32 gets about 4.7 V.",
          "3. U2 runs from the R32's 3.3 V so its output is ESP32-safe;",
          "   R7/C5 filter its supply (datasheet), R8 pulls OUT high.",
          "4. Strip current returns on its own 0 V bus straight to T1.",
          "5. All resistors 1/4 W 5 %. F1 hold 2.5 A, 30 V or more.",
          "6. Dashed amber lines are leads and jumpers, not board wiring."]
    for i, n in enumerate(en):
        s.text(1214, 918 + i * 24, n, size=14)

    # ---------------- signal list, capacitor types, title block
    s.rect(70, 1110, 1110, 236, width=2)
    s.text(92, 1142, "SIGNAL LIST", size=18, fill=AMBER, weight="bold", spacing=2)
    items = list(NET_INFO.items())
    half = (len(items) + 1) // 2
    for i, (net, info) in enumerate(items):
        col, row = divmod(i, half)
        x, y = 92 + col * 545, 1172 + row * 17
        s.text(x, y, net_name(net), size=13, fill=BLUE, weight="bold")
        s.text(x + 90, y, info.replace("->", "→"), size=12.5)
    s.rect(1196, 1110, 210, 236, width=2)
    s.text(1214, 1142, "CAPACITORS", size=16, fill=AMBER, weight="bold", spacing=1.5)
    s.text(1214, 1176, "ELECTROLYTIC", size=13, fill=ORANGE, weight="bold")
    s.text(1214, 1194, "polarised, stripe = −", size=12, fill=DIM)
    s.text(1214, 1212, "C1 C4 C5", size=13)
    s.text(1214, 1250, "CERAMIC", size=13, fill=GREEN, weight="bold")
    s.text(1214, 1268, "no polarity", size=12, fill=DIM)
    s.text(1214, 1286, "C2 C3", size=13)
    s.title_block(1422, 1110, 508, 236, TITLE, SUB, "SHEET 1 — SCHEMATIC", "1 OF 4", "RLC-2026-01")
    save(s, "docs/schematics/RLC-01_Schematic.svg")


# ------------------------------------------------------------------ RLC-02 reference

def remote_keys():
    """the key tables from the firmware (lamp_core.h), in the order of the keys on the remotes"""
    import re
    src = open(os.path.join(ROOT, "firmware/RGBLampController/lamp_core.h")).read()
    rx = re.compile(r"\{ 0x([0-9A-F]{8}), \{ (K_\w+), \{(\d+), (\d+), (\d+)\}, (\w+), (\d+), (true|false) \} \}")
    keys = [dict(code=m[0], key=m[1], rgb=(int(m[2]), int(m[3]), int(m[4])), effect=m[5], index=int(m[6])) for m in rx.findall(src)]
    return [k for k in keys if k["code"].startswith("00F7")], [k for k in keys if k["code"].startswith("00FF")]


KEY_TEXT = {"K_BRI_UP": "BRIGHT +", "K_BRI_DOWN": "BRIGHT −", "K_OFF": "OFF", "K_ON": "ON", "K_TOGGLE": "POWER", "K_PLAY": "PLAY/II",
            "K_SPEED_UP": "QUICK", "K_SPEED_DOWN": "SLOW", "K_R_UP": "RED +", "K_R_DOWN": "RED −", "K_G_UP": "GREEN +",
            "K_G_DOWN": "GREEN −", "K_B_UP": "BLUE +", "K_B_DOWN": "BLUE −"}
EFFECT_TEXT = {"FLASH": "FLASH", "STROBE": "STROBE", "FADE7": "FADE 7", "FADE3": "FADE 3", "SMOOTH": "SMOOTH", "JUMP3": "JUMP 3", "JUMP7": "JUMP 7"}


R32_TOP = [("SCL", 22), ("SDA", 21), ("AREF", None), ("GND", None), ("D13", 18), ("D12", 19), ("D11", 23), ("D10", 5), ("D9", 13), ("D8", 12),
           None, ("D7", 14), ("D6", 27), ("D5", "16?"), ("D4", "17?"), ("D3", 25), ("D2", 26), ("D1", 1), ("D0", 3)]
R32_BOTTOM = [("IO0", None), ("IOREF", None), ("RST", None), ("3V3", None), ("5V", None), ("GND", None), ("GND", None), ("VIN", None),
              None, ("A0", 2), ("A1", 4), ("A2", 35), ("A3", 34), ("A4", 36), ("A5", 39)]
USED = {"D13": "LED", "D12": "BTN", "D11": "BLUE", "D6": "GREEN", "D3": "RED", "D2": "IR", "3V3": "3V3", "5V": "5V"}
USED_GND = {("top", "GND"), ("bottom", "GND")}
AVOID = {"D10", "D9", "D8", "D7", "D5", "D4", "D1", "D0", "IO0", "A0"}


def key_label(k):
    if k["key"] == "K_EFFECT":
        return "AUTO" if k["effect"] == "SMOOTH" and k["code"].startswith("00FF") else EFFECT_TEXT.get(k["effect"], k["effect"])
    if k["key"] == "K_DIY":
        return f"DIY{k['index'] + 1}"
    return KEY_TEXT.get(k["key"], k["key"])


def draw_keys(s, x, y, keys, title, kw=82, kh=34, gap=6):
    """a remote laid on its side: each column is one row of keys on the remote, top row first"""
    cols = (len(keys) + 3) // 4
    w, h = cols * (kw + gap) + gap + 28, 4 * (kh + gap) + 62
    s.rect(x, y, w, h, stroke=LINE, width=2, r=20, fill="#0a1d38")
    s.text(x + 18, y + 28, title, size=15, fill=AMBER, weight="bold")
    for i, k in enumerate(keys):
        r, c = divmod(i, 4)
        kx, ky = x + 16 + r * (kw + gap), y + 44 + c * (kh + gap)
        if k["key"] == "K_COLOR":
            fill = "#%02x%02x%02x" % k["rgb"]
            s.rect(kx, ky, kw, kh, stroke="#00000066", width=1, fill=fill, r=9)
            dark = sum(k["rgb"]) > 420 or k["rgb"][1] > 200
            if k["rgb"] == (255, 255, 255):
                s.text(kx + kw / 2, ky + 15, "W", size=12, fill="#111", anchor="middle", weight="bold")
            s.text(kx + kw / 2, ky + kh - 6, k["code"][2:], size=10.5, fill="#111" if dark else "#fff", anchor="middle")
        else:
            s.rect(kx, ky, kw, kh, stroke=DIM, width=1.5, fill="#1d3557", r=9)
            s.text(kx + kw / 2, ky + 15, key_label(k), size=11.5, fill=LINE, anchor="middle", weight="bold")
            s.text(kx + kw / 2, ky + kh - 6, k["code"][2:], size=10.5, fill=DIM, anchor="middle")
    return w, h


def reference_sheet():
    s = Sch(2000, 1400)
    s.frame()
    s.text(90, 108, TITLE + " — REFERENCE", size=34, weight="bold", spacing=2)
    s.text(90, 146, "D1 R32 pins · jumpers · panel leads · the remotes' keys", size=18, fill=BLUE)

    # ---- the R32 headers (not to scale), USB to the left as printed on the board
    s.panel(70, 190, 900, 610, "D1 R32 — HEADERS SEEN FROM ABOVE (not to scale)")
    bx, by, bw, bh = 110, 322, 830, 290
    s.rect(bx, by, bw, bh, stroke=BLUE, width=3, r=14, fill="#10305a")
    s.rect(bx - 14, by + 70, 84, 54, stroke=LINE, width=2, fill=BG, r=4)
    s.text(bx + 28, by + 102, "micro-USB", size=12, fill=DIM, anchor="middle")
    s.rect(bx - 14, by + 200, 84, 64, stroke=LINE, width=2, fill=BG, r=4)
    s.text(bx + 28, by + 237, "DC jack", size=12, fill=DIM, anchor="middle")
    s.rect(bx + 330, by + 95, 200, 110, stroke=DIM, width=2, fill=BG, r=3)
    s.text(bx + 430, by + 146, "ESP32", size=16, fill=DIM, anchor="middle", weight="bold")
    s.text(bx + 430, by + 168, "WROOM-32", size=12, fill=DIM, anchor="middle")

    def header(pins, x0, y, top):
        x = x0
        for p in pins:
            if p is None:
                x += 16
                continue
            name, gpio = p
            used = name in USED or (name == "GND" and (("top" if top else "bottom"), "GND") in USED_GND)
            col = AMBER if used else (RED if name in AVOID else DIM)
            s.rect(x - 11, y - 11, 22, 22, stroke=col, width=2.4 if used else 1.4, fill=BG)
            ny = y - 58 if top else y + 52
            gy = y - 40 if top else y + 70
            s.text(x, ny, name, size=12.5, fill=col, anchor="middle", weight="bold" if used else "normal")
            if gpio is not None:
                s.text(x, gy, f"IO{gpio}", size=11, fill=col, anchor="middle")
            if used:
                fy = y + 36 if top else y - 24
                s.text(x, fy, USED.get(name, "0 V"), size=12, fill=LINE, anchor="middle", weight="bold")
            x += 40
    header(R32_TOP, bx + 70, by + 30, top=True)
    header(R32_BOTTOM, bx + 230, by + bh - 30, top=False)
    ly = 744
    for i, (col, t) in enumerate([(AMBER, "used here"), (RED, "left free on purpose"), (DIM, "free")]):
        s.rect(110 + i * 240, ly - 12, 14, 14, stroke=col, width=2)
        s.text(134 + i * 240, ly, t, size=14)
    s.text(110, ly + 28, "Free on purpose: D0/D1 serial · IO0, A0 (IO2), D8 (IO12) boot pins · D7 (IO14), D10 (IO5) pulse at boot ·", size=12.5, fill=DIM)
    s.text(110, ly + 46, "D4/D5 are IO17/IO16 on most R32s but IO10/IO9 on some. A2/A4 may be misprinted IO36/IO35.", size=12.5, fill=DIM)

    # ---- jumpers and leads
    s.panel(1000, 190, 930, 610, "J3 JUMPERS AND PANEL LEADS")
    for x, t in ((1024, "FROM"), (1124, "TO"), (1290, "WHAT"), (1640, "WIRE")):
        s.text(x, 238, t, size=13, fill=DIM)
    for i, (a, b, what, wire) in enumerate(HARNESS):
        y = 264 + i * 21.5
        s.text(1024, y, a, size=13, fill=AMBER, weight="bold")
        s.text(1124, y, b, size=13)
        s.text(1290, y, what, size=13)
        s.text(1640, y, wire, size=12.5, fill=DIM)
    s.text(1024, 264 + len(HARNESS) * 21.5 + 8, "M1 the D1 R32 · J1 DC jack · J7 strip socket · U2 IR receiver · SW1 button · LED1 light",
           size=12.5, fill=DIM)

    # ---- remotes
    s.panel(70, 830, 1860, 284, "THE REMOTES — every key and the code the serial monitor prints for it (NEC)")
    k24, k44 = remote_keys()
    w1, _ = draw_keys(s, 96, 856, k24, "24 KEYS · each column is a row of keys")
    draw_keys(s, 96 + w1 + 24, 856, k44, "44 KEYS · the same way round, top row first")
    s.text(96, 1100, "DIY1-6: press to recall, hold 2 s to store the colour that was showing. Another remote: press its keys with the "
           "serial monitor open (115200 baud) and add the codes to lamp_core.h.", size=12.5, fill=DIM)

    s.rect(70, 1134, 1330, 210, width=2)
    s.text(92, 1164, "BUTTON AND STATUS LIGHT", size=18, fill=AMBER, weight="bold", spacing=2)
    lines = [("Button: click", "on / off"), ("Double click", "next effect"), ("Hold", "dim up or down (the direction changes each hold)"),
             ("Hold while plugging in, 5 s", "forget the Wi-Fi and open the set-up network again"),
             ("Status light: slow blink", "set-up network RGB-Lamp-setup is open (password lamp-setup)"),
             ("Fast blink", "joining your Wi-Fi"), ("Short flash", "a remote key was received"), ("Dark", "all well")]
    for i, (a, b) in enumerate(lines):
        y = 1192 + i * 19
        s.text(92, y, a, size=14, fill=BLUE, weight="bold")
        s.text(420, y, b, size=14)
    s.title_block(1422, 1134, 508, 210, TITLE, SUB, "SHEET 2 — REFERENCE", "2 OF 4", "RLC-2026-02")
    save(s, "docs/schematics/RLC-02_Reference.svg")


# ------------------------------------------------------------------ RLC-04 box wiring

def box_sheet():
    import json
    D = json.load(open(os.path.join(ROOT, "enclosure/box-design.json")))
    E, R, PB = D["enclosure"], D["r32"], D["perfboard"]
    s = Sch(2000, 1400)
    s.frame()
    s.text(90, 108, TITLE + " — BOX AND WIRING", size=34, weight="bold", spacing=2)
    s.text(90, 146, "Maker Forge project box · inside seen from above, lid off · walls seen from outside", size=18, fill=BLUE)

    k, cx, cy = 7.3, 760, 600
    P = lambda X, Y: (cx + X * k, cy - Y * k)
    W, Dp, t = E["w"], E["d"], E["wall"]
    iw, idp = W - 2 * t, Dp - 2 * t
    s.panel(70, 190, 1370, 820, "INSIDE THE BOX — TOP VIEW, LID OFF")
    x0, y0 = P(-W / 2, Dp / 2)
    s.rect(x0, y0, W * k, Dp * k, stroke=LINE, width=3, r=E["radius"] * k, fill="#132f55")
    x1, y1 = P(-iw / 2, idp / 2)
    s.rect(x1, y1, iw * k, idp * k, stroke=DIM, width=1.6, r=max(0, E["radius"] - t) * k, fill="#0f2747")
    for sx in (-1, 1):
        for sy in (-1, 1):
            X, Y = sx * (iw / 2 - 3.6 + 0.5), sy * (idp / 2 - 3.6 + 0.5)
            s.circle(*P(X, Y), 3.6 * k, stroke=DIM, width=2, fill="#1b3a66")
            s.circle(*P(X, Y), 2.0 * k, stroke=DIM, width=1.4)
    # floor vent
    vent = next(c for c in E["cut"] if c["face"] == "bottom" and c["kind"] == "vent")
    vx, vy = P(vent["u"] - vent["w"] / 2, vent["v"] + vent["h"] / 2)
    for i in range(9):
        s.rect(vx + 8 + i * (vent["w"] * k - 16) / 9, vy + 8, 9, vent["h"] * k - 16, stroke="#355b8a", width=1.4, r=3)
    s.text(vx + vent["w"] * k / 2, vy + vent["h"] * k + 16, "floor vent", size=11, fill=DIM, anchor="middle")

    # the R32, turned USB to the back
    rx0, ry0 = P(R["left"], R["back"])
    s.rect(rx0, ry0, 53.3 * k, 68.6 * k, stroke=BLUE, width=2.6, r=8, fill="#10305a")
    s.text(rx0 + 26.6 * k, ry0 + 30 * k, "M1  D1 R32", size=16, fill=AMBER, anchor="middle", weight="bold")
    s.text(rx0 + 26.6 * k, ry0 + 30 * k + 20, "on 4 × M3 × 8 mm", size=12, anchor="middle")
    s.text(rx0 + 26.6 * k, ry0 + 30 * k + 36, "standoffs, floor holes", size=12, anchor="middle")
    ux, uy = P(R["left"] + R["usb_y"], R["back"])
    s.rect(ux - 4 * k, uy - 2, 8 * k, 5.5 * k, stroke=LINE, width=2, fill=BG, r=2)
    s.text(ux, uy + 7.5 * k, "micro-USB", size=11, fill=LINE, anchor="middle")
    jx, jy = P(R["left"] + 7.6, R["back"])
    s.rect(jx - 4.5 * k, jy - 2, 9 * k, 13 * k, stroke=DIM, width=1.6, fill=BG, r=2)
    s.text(jx, jy + 15 * k, "own DC jack:", size=10.5, fill=DIM, anchor="middle")
    s.text(jx, jy + 15 * k + 13, "not used", size=10.5, fill=DIM, anchor="middle")
    for (hx, hy) in R["holes"]:
        s.circle(*P(R["left"] + hy, R["back"] - hx), 1.7 * k, stroke=LINE, width=1.8)
    used = {"5V", "GND", "3V3", "D2", "D3", "D6", "D11", "D12", "D13"}

    def r32_header(pins, x_start, y_uno):
        xu = x_start
        out = {}
        for pnt in pins:
            if pnt is None:
                xu += 4.06 - 2.54
                continue
            name = pnt[0]
            X, Y = R["left"] + y_uno, R["back"] - xu
            px, py = P(X, Y)
            on = name in used
            s.rect(px - 7, py - 7, 14, 14, stroke=AMBER if on else "#5c7fa8", width=2 if on else 1.2, fill=BG)
            if on:
                s.text(px + (12 if y_uno > 26 else -12), py + 4, name, size=10.5, fill=AMBER, anchor="start" if y_uno > 26 else "end")
            out.setdefault(name, (px, py))
            xu += 2.54
        return out
    top = r32_header(R32_TOP, 18.8, 50.8)
    bottom = r32_header(R32_BOTTOM, 27.94, 2.54)

    # the perfboard and its parts
    mx, my = (90 - 29 * 2.54) / 2, (70 - 23 * 2.54) / 2
    HX = lambda c: PB["x"] - 45 + mx + (c - 1) * 2.54
    HY = lambda r: PB["y"] + 35 - (my + (r - 1) * 2.54)
    bx, by = P(PB["x"] - 45, PB["y"] + 35)
    s.rect(bx, by, 90 * k, 70 * k, stroke="#6d8fb5", width=2.6, r=6, fill="#10305a")
    for c in range(1, 31, 1):
        for r in range(1, 25, 1):
            if (c + r) % 2 == 0:
                s.circle(*P(HX(c), HY(r)), 1.3, stroke="none", fill="#2c4f7c")
    for sx in (-1, 1):
        for sy in (-1, 1):
            s.circle(*P(PB["x"] + sx * E["bsx"] / 2, PB["y"] + sy * E["bsy"] / 2), 3.2 * k, stroke=GREY, width=1.6, fill="#1b3a66")
    s.text(bx + 45 * k, by + 70 * k - 8, "perfboard on printed standoffs (M2.5 inserts)", size=11, fill=DIM, anchor="middle")
    for ref, pl in L.PLACE.items():
        x1_, y1_, x2_, y2_ = pl["body"][0]
        X1, Y1 = P(HX(x1_), HY(y1_))
        X2, Y2 = P(HX(x2_), HY(y2_))
        kind = PARTS[ref]["kind"]
        col = {"nmos": AMBER, "reg": BLUE, "terminal": BLUE, "header": BLUE}.get(kind, "#6d8fb5")
        if kind == "elec":
            s.circle((X1 + X2) / 2, (Y1 + Y2) / 2, abs(X2 - X1) / 2, stroke=col, width=1.4, fill="#10305a")
        else:
            s.rect(min(X1, X2), min(Y1, Y2), abs(X2 - X1), abs(Y2 - Y1), stroke=col, width=1.8 if kind in ("nmos", "reg", "terminal", "header") else 1.2,
                   fill="#10305a", r=2)
        if kind in ("nmos", "reg", "terminal", "header"):
            lx, ly = (X1 + X2) / 2, (Y1 + Y2) / 2 + 5
            if ref in ("J3", "J4", "J5", "J6"):
                ly = max(Y1, Y2) - 16
            s.text(lx, ly, ref, size=12, fill=AMBER if kind != "header" else LINE, anchor="middle", weight="bold")
    pin_xy = lambda ref, pin: P(HX(L.PLACE[ref]["pins"][pin][0]), HY(L.PLACE[ref]["pins"][pin][1]))

    # panel parts and their wires
    cut = E["cut"]
    def wall_xy(c):
        return (c["u"], idp / 2) if c["face"] == "front" else (-c["u"], idp / 2)
    back_y, front_y = idp / 2, -idp / 2
    def part_on(face, X, w, depth, label, sub, col=LINE):
        Y = back_y if face == "back" else front_y
        px, py = P(X - w / 2, Y if face == "back" else Y + depth)
        s.rect(px, py, w * k, depth * k, stroke=col, width=2.2, fill="#1d3557", r=3)
        tx = P(X, 0)[0]
        ty = y0 - 34 if face == "back" else y0 + Dp * k + 26
        s.text(tx, ty, label, size=13, fill=AMBER, anchor="middle", weight="bold")
        s.text(tx, ty + 15, sub, size=11, fill=LINE, anchor="middle")
        return P(X, Y - depth if face == "back" else Y + depth)
    c_dc = next(c for c in cut if c.get("label") == "12V")
    c_gx = next(c for c in cut if c.get("label") == "STRIP")
    c_ir = next(c for c in cut if c.get("label") == "IR")
    c_st = next(c for c in cut if c.get("label") == "STATUS")
    c_bt = next(c for c in cut if c.get("label") == "ON/OFF")
    j1 = part_on("back", -c_dc["u"], 11, 14, "J1", "DC jack")
    j7 = part_on("back", -c_gx["u"], 15, 17, "J7", "GX12-4")
    u2 = part_on("front", c_ir["u"], 6.5, 7, "U2", "IR receiver")
    l1 = part_on("front", c_st["u"], 6, 9, "LED1", "status light")
    sw = part_on("front", c_bt["u"], 13, 18, "SW1", "button")
    for i, (pin, col) in enumerate((("IN", CORAL), ("GND", GREY))):
        s.wire((j1[0] - 6 + i * 12, j1[1]), pin_xy("T1", pin), colour=col, width=2.6)
    for i, pin in enumerate(("12V", "R", "G", "B")):
        s.wire((j7[0] - 18 + i * 12, j7[1]), pin_xy("J2", pin), colour=(CORAL, RED, GREEN, BLUE)[i], width=2.4)
    for (part, ref, pins) in ((u2, "J4", ("OUT", "GND", "VS")), (l1, "J6", ("LED", "GND")), (sw, "J5", ("BTN", "GND"))):
        for i, pin in enumerate(pins):
            s.wire((part[0] - 6 + i * 6, part[1]), pin_xy(ref, pin), colour=AMBER, width=1.6, dash="6 5")
    s.text(x0 + 16, y0 - 34, "BACK", size=14, fill=DIM, spacing=2)
    s.text(x0 + 16, y0 + Dp * k + 26, "FRONT", size=14, fill=DIM, spacing=2)
    s.text(x0 + 16, y0 + Dp * k + 44, "panel parts sit 34-36 mm up the walls, above the boards", size=11, fill=DIM)
    # the R32 jumpers: one bundle, drawn as a dashed band
    j3 = [pin_xy("J3", p) for p in ("5V", "GND1", "3V3", "R", "G", "B", "IR", "BTN", "LED")]
    for name, src in (("5V", bottom.get("5V")), ("GND", bottom.get("GND")), ("3V3", bottom.get("3V3")), ("D3", top.get("D3")),
                      ("D6", top.get("D6")), ("D11", top.get("D11")), ("D2", top.get("D2")), ("D12", top.get("D12")), ("D13", top.get("D13"))):
        dst = {"5V": "5V", "GND": "GND1", "3V3": "3V3", "D3": "R", "D6": "G", "D11": "B", "D2": "IR", "D12": "BTN", "D13": "LED"}[name]
        b = pin_xy("J3", dst)
        mid_y = P(0, -28.5)[1]
        s.wire(src, b, colour=AMBER, width=1.4, dash="6 5")
    s.text(P(-48, -38)[0], P(-48, -38)[1], "R32 to J3: ten female-female jumpers, about 20 cm", size=12, fill=AMBER, anchor="middle")

    # walls from outside
    def wall_view(y, face, title):
        kw = 2.55
        x0w = 1470
        s.panel(1460, y, 470, 236, title)
        wx, wy = x0w + 10, y + 50
        Ww, Hw = W * kw, E["h"] * kw
        s.rect(wx, wy, Ww, Hw, stroke=LINE, width=2, r=4, fill="#132f55")
        s.line(wx, wy + 3 * kw, wx + Ww, wy + 3 * kw, stroke=DIM, width=1, dash="4 4")
        for c in cut:
            if c["face"] != face:
                continue
            u, v = c["u"], c["v"]
            px, py = wx + Ww / 2 + u * kw, wy + Hw - v * kw
            if c["kind"] == "rect":
                s.rect(px - c["w"] / 2 * kw, py - c["h"] / 2 * kw, c["w"] * kw, c["h"] * kw, stroke=LINE, width=1.6, fill=BG, r=2)
            else:
                d = c.get("dia") or MF_DIA.get(c["kind"], 8)
                s.circle(px, py, d / 2 * kw, stroke=LINE, width=1.6, fill=BG)
            if c.get("label"):
                ly = py + (d / 2 * kw + 14 if c.get("labelPos") != "above" else -(c.get("h", 8) / 2 * kw + 6)) if c["kind"] != "rect" else py - c["h"] / 2 * kw - 6
                s.text(px, ly, c["label"], size=11, fill=AMBER, anchor="middle")
            s.text(px, wy + Hw + 18, f"{v:g}", size=10.5, fill=DIM, anchor="middle")
        s.text(wx, wy + Hw + 34, "heights in mm above the bed; dashed: the lid's lip", size=11, fill=DIM)
    MF_DIA = {"barrel": 8, "btn": 12.2, "pilotp5": 8}
    wall_view(190, "back", "BACK WALL, FROM OUTSIDE")
    wall_view(452, "front", "FRONT WALL, FROM OUTSIDE")

    s.panel(1460, 714, 470, 296, "HARDWARE")
    hw = ["4 × M3 heat-set insert, lid posts", "4 × M3 × 8 countersunk screw, lid", "4 × M2.5 heat-set insert, perfboard",
          "4 × M2.5 × 5 screw, perfboard", "4 × M3 × 8 mm standoff (nylon/brass)", "8 × M3 × 5 screw, R32 and floor",
          "4 × rubber foot, 3 mm or taller", "DC jack 5.5/2.1 (8 mm hole)", "GX12-4 socket + plug (12 mm hole)",
          "12 mm push button · 5 mm LED", "hot glue for the IR receiver"]
    for i, h in enumerate(hw):
        s.text(1482, 752 + i * 23, h, size=13.5)

    s.rect(70, 1036, 1330, 300, width=2)
    s.text(92, 1068, "PUTTING IT TOGETHER", size=18, fill=AMBER, weight="bold", spacing=2)
    steps = ["1  Print box, lid and lens (lens in clear PETG). No supports needed. PETG: the 7805 warms the box.",
             "2  Press the M3 inserts into the four corner posts and the M2.5 inserts into the perfboard standoffs (iron at ~220 °C).",
             "3  Screw the four standoffs to the floor from below, then the R32 onto them, USB to the back opening.",
             "4  Fit J1, J7 and the button from outside; push the lens in from inside, the LED into the lens; glue U2 in its window.",
             "5  Wire J1 and J7 to T1 and J2 with 20 AWG, then the Dupont leads to J4, J5, J6 (see sheet 2).",
             "6  Screw the perfboard down, plug the ten R32 jumpers onto J3, tidy the wires away from the lid's lip.",
             "7  Bring it up as in the build guide §8 BEFORE the lid goes on. Then the lid: four M3 countersunk screws.",
             "8  Stick the feet on the corners, clear of the screw heads under the floor."]
    for i, st_ in enumerate(steps):
        s.text(92, 1102 + i * 28, st_, size=14)
    s.title_block(1422, 1036, 508, 300, TITLE, SUB, "SHEET 4 — BOX AND WIRING", "4 OF 4", "RLC-2026-04", scale="1:1.4 (top view)")
    save(s, "docs/layout/RLC-04_Box_Wiring.svg")


if __name__ == "__main__":
    which = sys.argv[1:] or ["schematic", "reference", "layout", "box"]
    if "schematic" in which:
        schematic_sheet()
    if "reference" in which:
        reference_sheet()
    if "layout" in which:
        layout_sheet()
    if "box" in which:
        box_sheet()
