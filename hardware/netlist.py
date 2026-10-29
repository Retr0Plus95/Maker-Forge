"""RGB Lamp Controller: the circuit as data. One netlist feeds the layout checker and every drawing,
so the schematic, the perfboard layout and the wire lists cannot disagree.

Parts with board=False are mounted in the box (panel parts) or are the R32 itself; they reach the
perfboard through the screw terminals and pin headers, as listed in HARNESS.
"""

# ref: value, what it is, its pins (name -> pin number on the part), on the perfboard or not, notes
PARTS = {
    "T1":  dict(value="2-pin screw terminal", kind="terminal", pins={"GND": 1, "IN": 2}, board=True, note="5.0/5.08 mm pitch: 12 V in from J1"),
    "F1":  dict(value="PTC 2.5 A", kind="ptc", pins={"1": 1, "2": 2}, board=True, note="resettable fuse, 2.5 A hold, 30 V or more (RXEF250)"),
    "D1":  dict(value="1N4007", kind="diode", pins={"A": 1, "K": 2}, board=True, note="reverse-polarity shunt, band (K) to +12 V"),
    "C1":  dict(value="470µ 25V", kind="elec", pins={"+": 1, "-": 2}, board=True, note="electrolytic, 10 mm, 5 mm pitch"),
    "C2":  dict(value="330n", kind="cer", pins={"1": 1, "2": 2}, board=True, note="ceramic, 7805 input"),
    "U1":  dict(value="L7805CV", kind="reg", pins={"IN": 1, "GND": 2, "OUT": 3}, board=True, note="TO-220 + clip-on heatsink"),
    "C3":  dict(value="100n", kind="cer", pins={"1": 1, "2": 2}, board=True, note="ceramic, 7805 output"),
    "C4":  dict(value="100µ 10V", kind="elec", pins={"+": 1, "-": 2}, board=True, note="electrolytic, 6.3 mm, 2.5 mm pitch"),
    "D2":  dict(value="1N5819", kind="schottky", pins={"A": 1, "K": 2}, board=True, note="stops USB feeding back into the 7805"),
    "Q1":  dict(value="IRLZ44N", kind="nmos", pins={"G": 1, "D": 2, "S": 3}, board=True, note="red; IRLB8721 is better at 3.3 V"),
    "Q2":  dict(value="IRLZ44N", kind="nmos", pins={"G": 1, "D": 2, "S": 3}, board=True, note="green"),
    "Q3":  dict(value="IRLZ44N", kind="nmos", pins={"G": 1, "D": 2, "S": 3}, board=True, note="blue"),
    "R1":  dict(value="100R", kind="res", pins={"1": 1, "2": 2}, board=True, note="gate, red"),
    "R2":  dict(value="100R", kind="res", pins={"1": 1, "2": 2}, board=True, note="gate, green"),
    "R3":  dict(value="100R", kind="res", pins={"1": 1, "2": 2}, board=True, note="gate, blue"),
    "R4":  dict(value="10k", kind="res", pins={"1": 1, "2": 2}, board=True, note="gate pull-down, red"),
    "R5":  dict(value="10k", kind="res", pins={"1": 1, "2": 2}, board=True, note="gate pull-down, green"),
    "R6":  dict(value="10k", kind="res", pins={"1": 1, "2": 2}, board=True, note="gate pull-down, blue"),
    "R7":  dict(value="100R", kind="res", pins={"1": 1, "2": 2}, board=True, note="IR receiver supply filter"),
    "C5":  dict(value="10µ", kind="elec", pins={"+": 1, "-": 2}, board=True, note="electrolytic, IR receiver supply filter"),
    "R8":  dict(value="10k", kind="res", pins={"1": 1, "2": 2}, board=True, note="IR output pull-up"),
    "R9":  dict(value="220R", kind="res", pins={"1": 1, "2": 2}, board=True, note="status LED"),
    "J2":  dict(value="4-pin screw terminal", kind="terminal", pins={"12V": 1, "R": 2, "G": 3, "B": 4}, board=True, note="to the strip socket J7"),
    "J3":  dict(value="1x10 pin header", kind="header",
                pins={"BTN": 1, "LED": 2, "5V": 3, "GND1": 4, "GND2": 5, "3V3": 6, "R": 7, "G": 8, "B": 9, "IR": 10}, board=True,
                note="Dupont jumpers to the D1 R32"),
    "J4":  dict(value="1x3 pin header", kind="header", pins={"OUT": 1, "GND": 2, "VS": 3}, board=True, note="IR receiver lead"),
    "J5":  dict(value="1x2 pin header", kind="header", pins={"BTN": 1, "GND": 2}, board=True, note="push button lead"),
    "J6":  dict(value="1x2 pin header", kind="header", pins={"LED": 1, "GND": 2}, board=True, note="status LED lead"),
    # in the box
    "J1":  dict(value="DC jack 5.5/2.1", kind="dcjack", pins={"+": 1, "-": 2}, board=False, note="panel mount, back wall, centre +"),
    "J7":  dict(value="GX12 4-pin socket", kind="gx12", pins={"1": 1, "2": 2, "3": 3, "4": 4}, board=False, note="panel mount, back wall: strip"),
    "U2":  dict(value="VS1838B / TSOP38238", kind="irrx", pins={"OUT": 1, "GND": 2, "VS": 3}, board=False, note="38 kHz IR receiver, front wall"),
    "SW1": dict(value="12 mm push button", kind="button", pins={"1": 1, "2": 2}, board=False, note="momentary, front wall"),
    "LED1": dict(value="5 mm LED", kind="led", pins={"A": 1, "K": 2}, board=False, note="red, yellow or green; behind the jewel lens"),
    "M1":  dict(value="WeMos D1 R32", kind="r32", pins={"5V": 0, "GND": 0, "GND_D13": 0, "3V3": 0, "D3": 0, "D6": 0, "D11": 0, "D2": 0, "D12": 0, "D13": 0},
                board=False, note="ESP32 board, Uno form"),
}

NETS = {
    "P12V_IN": ["T1.IN", "F1.1", "J1.+"],
    "P12V":    ["F1.2", "D1.K", "C1.+", "C2.1", "U1.IN", "J2.12V", "J7.1"],
    "GND":     ["T1.GND", "J1.-", "D1.A", "C1.-", "C2.2", "U1.GND", "C3.2", "C4.-", "Q1.S", "Q2.S", "Q3.S", "R4.2", "R5.2", "R6.2",
                "J3.GND1", "J3.GND2", "C5.-", "J4.GND", "J5.GND", "J6.GND", "U2.GND", "SW1.2", "LED1.K", "M1.GND", "M1.GND_D13"],
    "P5V":     ["U1.OUT", "C3.1", "C4.+", "D2.A"],
    "P5V_R32": ["D2.K", "J3.5V", "M1.5V"],
    "P3V3":    ["J3.3V3", "R7.1", "R8.1", "M1.3V3"],
    "IR_VS":   ["R7.2", "C5.+", "J4.VS", "U2.VS"],
    "IR":      ["J4.OUT", "R8.2", "J3.IR", "U2.OUT", "M1.D2"],
    "PWM_R":   ["J3.R", "R1.1", "M1.D3"],
    "GATE_R":  ["R1.2", "R4.1", "Q1.G"],
    "CH_R":    ["Q1.D", "J2.R", "J7.2"],
    "PWM_G":   ["J3.G", "R2.1", "M1.D6"],
    "GATE_G":  ["R2.2", "R5.1", "Q2.G"],
    "CH_G":    ["Q2.D", "J2.G", "J7.3"],
    "PWM_B":   ["J3.B", "R3.1", "M1.D11"],
    "GATE_B":  ["R3.2", "R6.1", "Q3.G"],
    "CH_B":    ["Q3.D", "J2.B", "J7.4"],
    "BTN":     ["J3.BTN", "J5.BTN", "SW1.1", "M1.D12"],
    "LED":     ["J3.LED", "R9.1", "M1.D13"],
    "LED_A":   ["R9.2", "J6.LED", "LED1.A"],
}

# what each net is, for the signal list on the schematic
NET_INFO = {
    "P12V_IN": "J1 centre pin -> T1 -> F1 (before the fuse)",
    "P12V":    "+12 V after F1: strip +, 7805 input, D1 shunt, C1",
    "GND":     "0 V. Strip return on the top bus, logic on the lower buses",
    "P5V":     "7805 output, C3, C4",
    "P5V_R32": "after D2 -> J3-3 -> R32 5V pin (about 4.7 V)",
    "P3V3":    "R32 3V3 pin -> J3-6: IR receiver supply and pull-up",
    "IR_VS":   "IR receiver supply after the R7/C5 filter",
    "IR":      "IR receiver OUT -> J3-10 -> D2 (GPIO26)",
    "PWM_R":   "D3 (GPIO25) -> J3-7 -> R1",
    "PWM_G":   "D6 (GPIO27) -> J3-8 -> R2",
    "PWM_B":   "D11 (GPIO23) -> J3-9 -> R3",
    "GATE_R":  "R1 -> Q1 gate, R4 to 0 V",
    "GATE_G":  "R2 -> Q2 gate, R5 to 0 V",
    "GATE_B":  "R3 -> Q3 gate, R6 to 0 V",
    "CH_R":    "Q1 drain -> J2-2 -> strip R",
    "CH_G":    "Q2 drain -> J2-3 -> strip G",
    "CH_B":    "Q3 drain -> J2-4 -> strip B",
    "BTN":     "D12 (GPIO19) -> J3-1 -> J5 -> SW1 to 0 V",
    "LED":     "D13 (GPIO18) -> J3-2 -> R9",
    "LED_A":   "R9 -> J6-1 -> LED1 anode",
}

# wires from the perfboard to the parts in the box and to the R32: (board pin, other end, what it is, wire)
HARNESS = [
    ("T1.IN",   "J1.+",     "12 V in, centre pin",        "red, 0.5 mm² (20 AWG)"),
    ("T1.GND",  "J1.-",     "0 V in, sleeve",              "black, 0.5 mm² (20 AWG)"),
    ("J2.12V",  "J7.1",     "strip +12 V",                 "red, 0.5 mm² (20 AWG)"),
    ("J2.R",    "J7.2",     "strip R",                     "0.5 mm² (20 AWG)"),
    ("J2.G",    "J7.3",     "strip G",                     "0.5 mm² (20 AWG)"),
    ("J2.B",    "J7.4",     "strip B",                     "0.5 mm² (20 AWG)"),
    ("J4.OUT",  "U2.OUT",   "IR receiver out",             "3-way Dupont lead"),
    ("J4.GND",  "U2.GND",   "IR receiver 0 V",             "3-way Dupont lead"),
    ("J4.VS",   "U2.VS",    "IR receiver supply",          "3-way Dupont lead"),
    ("J5.BTN",  "SW1.1",    "button",                      "2-way Dupont lead"),
    ("J5.GND",  "SW1.2",    "button 0 V",                  "2-way Dupont lead"),
    ("J6.LED",  "LED1.A",   "status LED anode (long leg)", "2-way Dupont lead"),
    ("J6.GND",  "LED1.K",   "status LED cathode (flat side)", "2-way Dupont lead"),
    ("J3.5V",   "M1.5V",    "R32 power header: 5V",        "female-female jumper"),
    ("J3.GND1", "M1.GND",   "R32 power header: GND",       "female-female jumper"),
    ("J3.GND2", "M1.GND_D13", "R32 GND beside D13",        "female-female jumper"),
    ("J3.3V3",  "M1.3V3",   "R32 power header: 3V3",       "female-female jumper"),
    ("J3.R",    "M1.D3",    "R32 D3 (GPIO25): red",        "female-female jumper"),
    ("J3.G",    "M1.D6",    "R32 D6 (GPIO27): green",      "female-female jumper"),
    ("J3.B",    "M1.D11",   "R32 D11 (GPIO23): blue",      "female-female jumper"),
    ("J3.IR",   "M1.D2",    "R32 D2 (GPIO26): IR",         "female-female jumper"),
    ("J3.BTN",  "M1.D12",   "R32 D12 (GPIO19): button",    "female-female jumper"),
    ("J3.LED",  "M1.D13",   "R32 D13 (GPIO18): status LED", "female-female jumper"),
]


def pin_ref(s):
    ref, pin = s.split(".", 1)
    return ref, pin


def check_netlist():
    """Every pin named in a net exists, no pin is in two nets, every board pin is in a net."""
    problems, seen = [], {}
    for net, pins in NETS.items():
        for p in pins:
            ref, pin = pin_ref(p)
            if ref not in PARTS or pin not in PARTS[ref]["pins"]:
                problems.append(f"{net}: {p} is not a pin of any part")
            if p in seen:
                problems.append(f"{p} is in {seen[p]} and {net}")
            seen[p] = net
    for ref, part in PARTS.items():
        for pin in part["pins"]:
            if f"{ref}.{pin}" not in seen:
                problems.append(f"{ref}.{pin} is not connected to anything")
    for a, b, _, _ in HARNESS:
        na, nb = seen.get(a), seen.get(b)
        if na != nb:
            problems.append(f"harness {a} -> {b} joins {na} and {nb}")
    return problems


if __name__ == "__main__":
    p = check_netlist()
    print("\n".join(p) if p else f"netlist: {len(PARTS)} parts, {len(NETS)} nets, every pin used once")
