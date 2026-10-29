"""Checks the perfboard layout (layout.py) against the netlist (netlist.py), the way the fume extractor's
layout was checked: it builds the real electrical connections from the parts' holes, the bare-wire buses
and the insulated links, then compares them with the netlist.

  python3 hardware/check_layout.py

It reports: a part or pin not placed, a hole with two leads in it, a net in more than one piece, two nets
touching, a bus or link whose label is not the net it joins, a link or bus that joins nothing, a lead
under another part's body, two bodies in the same place, anything off the board.
"""
import sys
from itertools import combinations
from netlist import PARTS, NETS
import layout as L


def board_pins():
    """(ref, pin) -> net, for the parts on the perfboard"""
    out = {}
    for net, pins in NETS.items():
        for p in pins:
            ref, pin = p.split(".", 1)
            if PARTS[ref]["board"]:
                out[(ref, pin)] = net
    return out


def bus_holes(a, b):
    (c1, r1), (c2, r2) = a, b
    if c1 != c2 and r1 != r2:
        return None
    return [(c, r) for c in range(min(c1, c2), max(c1, c2) + 1) for r in range(min(r1, r2), max(r1, r2) + 1)]


def check(lay=L):
    problems = []
    on_board = lambda h: 1 <= h[0] <= lay.COLS and 1 <= h[1] <= lay.ROWS
    want = board_pins()

    # where each lead goes
    hole_pin = {}
    for ref, part in lay.PLACE.items():
        if ref not in PARTS or not PARTS[ref]["board"]:
            problems.append(f"{ref} is placed but is not a perfboard part")
            continue
        for pin, h in part["pins"].items():
            if (ref, pin) not in want:
                problems.append(f"{ref}.{pin} is placed but is not in the netlist")
            if not on_board(h):
                problems.append(f"{ref}.{pin} at {h} is off the board")
            if h in hole_pin:
                problems.append(f"{ref}.{pin} and {hole_pin[h][0]}.{hole_pin[h][1]} are in the same hole {h}")
            hole_pin[h] = (ref, pin)
    for (ref, pin) in want:
        if ref not in lay.PLACE or pin not in lay.PLACE[ref]["pins"]:
            problems.append(f"{ref}.{pin} is not placed")

    # connections: union-find over holes
    parent = {}
    def find(h):
        parent.setdefault(h, h)
        while parent[h] != h:
            parent[h] = parent[parent[h]]
            h = parent[h]
        return h
    def join(a, b):
        parent[find(a)] = find(b)

    wires = []                                   # (kind, label, holes)
    for net, a, b in lay.BUSES:
        hs = bus_holes(a, b)
        if hs is None:
            problems.append(f"bus {net} {a}-{b} is not straight along a row or column")
            continue
        wires.append(("bus", net, hs))
    for a, b, net in lay.LINKS:
        wires.append(("link", net, [a, b]))
    for kind, net, hs in wires:
        for h in hs:
            if not on_board(h):
                problems.append(f"{kind} {net} reaches {h}, off the board")
        for h in hs[1:]:
            join(hs[0], h)
    for h in hole_pin:
        find(h)

    # every net in one piece
    groups = {}
    for (ref, pin), net in want.items():
        h = lay.PLACE.get(ref, {}).get("pins", {}).get(pin)
        if h is None:
            continue
        groups.setdefault(net, set()).add(find(h))
    for net, gs in groups.items():
        if len(gs) > 1:
            pieces = []
            for g in gs:
                pieces.append(" ".join(sorted(f"{r}.{p}" for (r, p), n in want.items()
                                              if n == net and find(lay.PLACE[r]["pins"][p]) == g)))
            problems.append(f"net {net} is in {len(gs)} pieces: " + " | ".join(pieces))

    # no two nets in one piece
    group_nets = {}
    for (ref, pin), net in want.items():
        h = lay.PLACE.get(ref, {}).get("pins", {}).get(pin)
        if h is not None:
            group_nets.setdefault(find(h), set()).add(net)
    for g, nets in group_nets.items():
        if len(nets) > 1:
            problems.append("short: " + " and ".join(sorted(nets)) + " are joined")

    # every bus and link carries the net it is labelled with, and joins something
    for kind, net, hs in wires:
        nets = group_nets.get(find(hs[0]), set())
        if not nets:
            problems.append(f"{kind} {net} {hs[0]}-{hs[-1]} joins no part")
        elif net not in nets:
            problems.append(f"{kind} labelled {net} {hs[0]}-{hs[-1]} is on {', '.join(sorted(nets))}")
        if kind == "link" and len(hs) == 2 and hs[0] == hs[1]:
            problems.append(f"link {net} at {hs[0]} goes nowhere")
        if kind == "link":
            for h in hs:
                if h not in hole_pin and not any(h in w[2] for w in wires if w[0] == "bus"):
                    other = [w for w in wires if w[0] == "link" and h in w[2] and w[2] is not hs]
                    if not other:
                        problems.append(f"link {net} ends at {h}, where there is no lead, bus or other link")

    # bodies: no other part's lead underneath, no two bodies in the same place
    def inside(h, box):
        c1, r1, c2, r2 = box
        return c1 <= h[0] <= c2 and r1 <= h[1] <= r2
    for ref, part in lay.PLACE.items():
        for box in part.get("body", []):
            for h, (r, p) in hole_pin.items():
                if r != ref and inside(h, box):
                    problems.append(f"{r}.{p} at {h} is under the body of {ref}")
    for (ra, pa), (rb, pb) in combinations(lay.PLACE.items(), 2):
        for a in pa.get("body", []):
            for b in pb.get("body", []):
                if a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]:
                    problems.append(f"the bodies of {ra} and {rb} overlap")
    return problems


def summary(lay=L):
    nets = len({n for n in board_pins().values()})
    return (f"layout: {len(lay.PLACE)} parts, {nets} nets, {len(lay.BUSES)} buses, {len(lay.LINKS)} insulated links on "
            f"{lay.COLS} x {lay.ROWS} holes: every net connected, no shorts, no leads under bodies")


if __name__ == "__main__":
    p = check()
    if p:
        print("\n".join(p))
        print(f"\n{len(p)} problems")
        sys.exit(1)
    print(summary())
