"""Checks that the parts in the box clear each other in height: every panel part (DC jack, strip socket, button,
status light, IR receiver) reaches into the box above the perfboard; nothing on the perfboard or the R32 may
come up into it, and nothing may touch the lid.

  python3 hardware/check_box.py

Heights are typical for the parts in the build guide; measure yours if they differ much.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import layout as L  # noqa: E402
from netlist import PARTS  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), "..")
CLEAR = 1.0                      # mm of air wanted between parts

# height of each kind of perfboard part above the board's top surface, mm
TALL = {"terminal": 10, "header": 20,       # a header with a Dupont plug on it
        "nmos": 22, "reg": 25,              # TO-220 standing, with leads; the 7805 with a 20 mm clip-on heatsink
        "res": 3, "cer": 6, "diode": 9, "schottky": 4, "ptc": 13}
ELEC_TALL = {"C1": 17, "C4": 12, "C5": 12}  # 10 x 16, 6.3 x 11, 5 x 11 mm cans
# panel parts inside the box: width across the wall, how far into the box, diameter of the body round the hole
PANEL = {"12V": ("J1 DC jack", 11, 14), "STRIP": ("J7 GX12 socket", 15, 17), "ON/OFF": ("SW1 push button", 13, 22),
         "STATUS": ("LED1 + jewel lens", 8, 10), "IR": ("U2 IR receiver", 7, 8)}


def load():
    with open(os.path.join(ROOT, "enclosure/box-design.json")) as f:
        return json.load(f)


def board_parts(D):
    """every perfboard part as (name, x1, y1, x2, y2, top) in box coordinates, mm"""
    E, PB = D["enclosure"], D["perfboard"]
    mx, my = (90 - 29 * 2.54) / 2, (70 - 23 * 2.54) / 2
    hx = lambda c: PB["x"] - 45 + mx + (c - 1) * 2.54
    hy = lambda r: PB["y"] + 35 - (my + (r - 1) * 2.54)
    board_top = E["floor"] + E["standH"] + 1.6
    out = []
    for ref, pl in L.PLACE.items():
        x1, y1, x2, y2 = pl["body"][0]
        kind = PARTS[ref]["kind"]
        tall = ELEC_TALL.get(ref) if kind == "elec" else TALL[kind]
        out.append((ref, min(hx(x1), hx(x2)), min(hy(y1), hy(y2)), max(hx(x1), hx(x2)), max(hy(y1), hy(y2)), board_top + tall))
    # the R32: its headers with jumpers plugged in
    R = D["r32"]
    r32_top = E["floor"] + R["standoff"] + 1.6 + 8.5 + 11
    out.append(("M1 R32 + jumpers", R["left"], R["back"] - 68.6, R["left"] + 53.3, R["back"], r32_top))
    return out


def panel_parts(D):
    E = D["enclosure"]
    inner_y = E["d"] / 2 - E["wall"]
    out = []
    for c in E["cut"]:
        if c.get("label") not in PANEL or c["face"] not in ("front", "back"):
            continue
        name, w, depth = PANEL[c["label"]]
        x = c["u"] if c["face"] == "front" else -c["u"]
        y1, y2 = (-inner_y, -inner_y + depth) if c["face"] == "front" else (inner_y - depth, inner_y)
        out.append((name, x - w / 2, y1, x + w / 2, y2, c["v"] - w / 2))
    return out


def check(D=None):
    D = D or load()
    E = D["enclosure"]
    problems = []
    lid_inside = E["h"] - 0.5
    lip = E["h"] - E["lipH"] - 0.3
    inner = (E["w"] / 2 - E["wall"], E["d"] / 2 - E["wall"])
    for name, x1, y1, x2, y2, bottom in panel_parts(D):
        for ref, a1, b1, a2, b2, top in board_parts(D):
            if x1 < a2 and a1 < x2 and y1 < b2 and b1 < y2 and top > bottom - CLEAR:
                problems.append(f"{name} (bottom {bottom:.1f} mm) is over {ref} (top {top:.1f} mm)")
        if bottom + (x2 - x1) > lip:
            problems.append(f"{name} reaches the lid's lip ({bottom + (x2 - x1):.1f} > {lip:.1f} mm)")
    for ref, a1, b1, a2, b2, top in board_parts(D):
        near_wall = a1 < -inner[0] + E["lipW"] + 1 or a2 > inner[0] - E["lipW"] - 1 or b1 < -inner[1] + E["lipW"] + 1 or b2 > inner[1] - E["lipW"] - 1
        if top > (lip if near_wall else lid_inside) - CLEAR:
            problems.append(f"{ref} (top {top:.1f} mm) touches the lid")
    return problems


if __name__ == "__main__":
    p = check()
    if p:
        print("\n".join(p))
        sys.exit(1)
    D = load()
    tallest = max(board_parts(D), key=lambda q: q[5])
    lowest = min(panel_parts(D), key=lambda q: q[5])
    print(f"box: {len(panel_parts(D))} panel parts clear the boards by {CLEAR} mm or more; tallest inside {tallest[0]} "
          f"at {tallest[5]:.1f} mm under a {D['enclosure']['h']} mm lid; lowest panel part {lowest[0]} from {lowest[5]:.1f} mm")
