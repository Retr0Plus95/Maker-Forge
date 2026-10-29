"""RGB Lamp Controller: the perfboard layout as data, checked by check_layout.py and drawn by draw.py.

Board: 7 x 9 cm, 30 x 24 holes at 2.54 mm. Coordinates are (column, row): column 1 is the left edge, row 1
the top edge, looking down on the parts. In the box the top edge faces the back wall (12 V jack, strip
socket), the bottom edge the front wall (IR receiver, button, status light) and the left edge the D1 R32.

Bare-wire buses and insulated links are soldered on the underside; parts go on top.
body: the part's outline seen from above (columns and rows, fractions allowed), for the drawing and to
check that no other part's lead is underneath it.
"""
COLS, ROWS = 30, 24


def part(pins, body, label=None):
    return dict(pins=pins, body=[body], label=label)


PLACE = {
    # ---- 12 V in, fuse, protection (top left)
    "T1": part({"GND": (2, 2), "IN": (4, 2)}, (1.1, 1.0, 4.9, 2.9)),
    "F1": part({"1": (4, 4), "2": (6, 4)}, (3.2, 3.55, 6.8, 4.45)),
    "D1": part({"K": (8, 4), "A": (8, 6)}, (7.55, 4.45, 8.45, 5.55)),
    "C1": part({"+": (11, 4), "-": (11, 6)}, (9.1, 3.1, 12.9, 6.9)),
    # ---- strip terminal and MOSFETs (top right); TO-220 text facing the bottom edge, tab towards the top
    "J2": part({"12V": (19, 2), "R": (21, 2), "G": (23, 2), "B": (25, 2)}, (18.1, 1.0, 25.9, 2.9)),
    "Q1": part({"G": (15, 9), "D": (16, 9), "S": (17, 9)}, (14.05, 7.2, 17.95, 8.6)),
    "Q2": part({"G": (20, 9), "D": (21, 9), "S": (22, 9)}, (19.05, 7.2, 22.95, 8.6)),
    "Q3": part({"G": (25, 9), "D": (26, 9), "S": (27, 9)}, (24.05, 7.2, 27.95, 8.6)),
    # ---- gate resistors (1 = from the R32) and pull-downs
    "R1": part({"2": (15, 11), "1": (15, 17)}, (14.6, 12.6, 15.4, 15.4)),
    "R4": part({"1": (17, 11), "2": (17, 15)}, (16.6, 11.8, 17.4, 14.2)),
    "R2": part({"2": (20, 11), "1": (20, 17)}, (19.6, 12.6, 20.4, 15.4)),
    "R5": part({"1": (22, 11), "2": (22, 15)}, (21.6, 11.8, 22.4, 14.2)),
    "R3": part({"2": (25, 11), "1": (25, 17)}, (24.6, 12.6, 25.4, 15.4)),
    "R6": part({"1": (27, 11), "2": (27, 15)}, (26.6, 11.8, 27.4, 14.2)),
    # ---- 5 V for the R32 (left); 7805 text facing the bottom edge, heatsink towards the top
    "U1": part({"IN": (6, 12), "GND": (7, 12), "OUT": (8, 12)}, (4.1, 7.5, 9.9, 11.6)),
    "C2": part({"1": (5, 13), "2": (5, 15)}, (4.6, 13.45, 5.4, 14.55)),
    "C3": part({"1": (9, 13), "2": (9, 15)}, (8.6, 13.45, 9.4, 14.55)),
    "C4": part({"+": (11, 13), "-": (11, 15)}, (9.76, 12.76, 12.24, 15.24)),
    "D2": part({"A": (13, 13), "K": (13, 17)}, (12.6, 13.9, 13.4, 16.1)),
    # ---- IR receiver filter, status LED resistor (bottom)
    "R8": part({"1": (21, 19), "2": (21, 23)}, (20.6, 19.9, 21.4, 22.1)),
    "R7": part({"1": (27, 19), "2": (27, 23)}, (26.6, 19.9, 27.4, 22.1)),
    "C5": part({"+": (29, 20), "-": (29, 21)}, (28.0, 19.5, 30.0, 21.5)),
    "R9": part({"2": (6, 19), "1": (10, 19)}, (6.9, 18.6, 9.1, 19.4)),
    # ---- headers on the bottom edge: front panel leads and the jumpers to the R32
    "J6": part({"LED": (4, 23), "GND": (5, 23)}, (3.6, 22.6, 5.4, 23.4)),
    "J5": part({"GND": (9, 23), "BTN": (10, 23)}, (8.6, 22.6, 10.4, 23.4)),
    "J3": part({"BTN": (11, 23), "LED": (12, 23), "5V": (13, 23), "GND1": (14, 23), "GND2": (15, 23), "3V3": (16, 23),
                "R": (17, 23), "G": (18, 23), "B": (19, 23), "IR": (20, 23)}, (10.6, 22.6, 20.4, 23.4)),
    "J4": part({"OUT": (23, 23), "GND": (24, 23), "VS": (25, 23)}, (22.6, 22.6, 25.4, 23.4)),
}

# bare tinned wire on the underside, soldered at every hole it passes: (net, from, to)
BUSES = [
    ("P12V", (6, 4), (28, 4)),
    ("GND", (2, 2), (2, 22)),          # the 0 V spine down the left edge
    ("GND", (2, 6), (28, 6)),          # strip return: MOSFET sources to T1
    ("GND", (2, 15), (28, 15)),        # 7805, capacitors, gate pull-downs
    ("GND", (2, 22), (30, 22)),        # headers
    ("P5V", (8, 13), (13, 13)),
    ("P3V3", (16, 19), (27, 19)),
]

# insulated wire on the underside: (from, to, net)
LINKS = [
    ((4, 2), (4, 4), "P12V_IN"),       # T1 + to F1
    ((19, 2), (19, 4), "P12V"),        # strip + to the 12 V bus
    ((6, 12), (6, 4), "P12V"),         # 7805 in
    ((5, 13), (6, 12), "P12V"),        # C2 to 7805 in
    ((7, 12), (7, 15), "GND"),         # 7805 0 V
    ((8, 12), (8, 13), "P5V"),         # 7805 out
    ((13, 17), (13, 23), "P5V_R32"),   # D2 to J3 5V
    ((17, 9), (17, 6), "GND"),         # sources
    ((22, 9), (22, 6), "GND"),
    ((27, 9), (27, 6), "GND"),
    ((16, 9), (21, 2), "CH_R"),        # drains to the strip terminal
    ((21, 9), (23, 2), "CH_G"),
    ((26, 9), (25, 2), "CH_B"),
    ((15, 9), (15, 11), "GATE_R"),     # gates to their resistors
    ((15, 11), (17, 11), "GATE_R"),
    ((20, 9), (20, 11), "GATE_G"),
    ((20, 11), (22, 11), "GATE_G"),
    ((25, 9), (25, 11), "GATE_B"),
    ((25, 11), (27, 11), "GATE_B"),
    ((15, 17), (17, 23), "PWM_R"),     # R32 PWM to the gate resistors
    ((20, 17), (18, 23), "PWM_G"),
    ((25, 17), (19, 23), "PWM_B"),
    ((14, 23), (14, 22), "GND"),       # header 0 V pins
    ((15, 23), (15, 22), "GND"),
    ((5, 23), (5, 22), "GND"),
    ((9, 23), (9, 22), "GND"),
    ((24, 23), (24, 22), "GND"),
    ((29, 21), (29, 22), "GND"),       # C5 -
    ((16, 23), (16, 19), "P3V3"),      # J3 3V3 to the 3.3 V bus
    ((21, 23), (20, 23), "IR"),        # R8 to J3 IR
    ((21, 23), (23, 23), "IR"),        # and to J4 OUT
    ((27, 23), (25, 23), "IR_VS"),     # R7 to J4 VS
    ((27, 23), (29, 20), "IR_VS"),     # and to C5 +
    ((11, 23), (10, 23), "BTN"),       # J3 BTN to J5
    ((12, 23), (10, 19), "LED"),       # J3 LED to R9
    ((6, 19), (4, 23), "LED_A"),       # R9 to J6
]
