# RGB Lamp Controller — Build Guide
**Drawing set RLC-2026, Rev A · Firmware v1.0.0** · Sheet 1 schematic · Sheet 2 reference · Sheet 3 perfboard layout · Sheet 4 box and wiring · `RGBLampController.ino`

---

## 1. What it does

An ESP32 on a WeMos D1 R32 drives the 12 V RGB LED strip in the 3D-printed "Desk Stranding" lamp
(the Death Stranding desk lamp on Printables). Three logic-level MOSFETs switch the strip's red, green and
blue to 0 V with 5 kHz PWM; the strip's common +12 V comes straight from the supply. You control it three ways:

- the **cheap 24- or 44-key remote** that comes with most RGB strips (an IR receiver on the front);
- one **push button** on the front: click on/off, double-click next effect, hold to dim;
- a **web page on your phone** (colour picker, brightness, effects, speed, sleep timer), served by the lamp itself.

It remembers its colour through a power cut and takes firmware updates over Wi-Fi.

| Spec | Value |
|---|---|
| Supply | 12 V DC, 2 A adapter (barrel 5.5/2.1 mm, centre +) |
| Strip | 12 V analog RGB, 4 wires: +12V, R, G, B (common anode). Not addressable (WS2812) strips |
| Strip current | up to 2 A per colour with IRLZ44N (more with IRLB8721) — within the adapter's limit |
| Logic | WeMos D1 R32 (ESP32-WROOM-32), 3.3 V |
| 5 V | L7805CV with heatsink, then a 1N5819 to the R32's 5V pin (about 4.7 V there) |
| PWM | 5 kHz, 12-bit, gamma 2.2; changes fade over 0.3 s |
| Effects | solid, jump 3, jump 7, fade 3, fade 7, smooth, flash, strobe, breathe; 10 speeds |
| Protection | F1 resettable PTC 2.5 A, D1 reverse-polarity shunt, gate pull-downs (strip dark while booting) |
| Board | 7 × 9 cm perfboard, 30 × 24 holes |
| Box | Maker Forge project box, 171 × 91 × 50 mm, about 170 g of PETG |

---

## 2. Safety — read this first

- **12 V at 2 A can't shock you, but it can start a fire.** A short in the strip wiring on an unfused supply
  heats the wires until the insulation melts. F1 is there for that: don't bridge it.
- Use a **proper enclosed 12 V adapter** with its own protection. Don't build a mains supply into the box.
- **Polarity:** centre pin +. If the adapter is the other way round, D1 conducts, F1 trips and nothing else
  sees the wrong voltage. Unplug, swap, and F1 resets by itself after a minute.
- The 7805 turns about 1 W into heat. Fit the heatsink and **print the box in PETG** (PLA softens near 55 °C).
- LED strips on full white for hours get warm too: the lamp needs air round the strip.
- Never put 12 V on any pin of the R32. Only VIN or its own jack may take more than 5 V, and this build uses neither.

---

## 3. Bill of materials

### Semiconductors & modules
| Ref | Part | Qty | Notes |
|---|---|---|---|
| M1 | WeMos D1 R32 (ESP32, Arduino Uno size) | 1 | Micro-USB, CH340 USB chip |
| U1 | L7805CV, TO-220 + clip-on heatsink | 1 | Heatsink about 15 mm wide, 10 mm deep, 20 mm tall |
| Q1–Q3 | IRLZ44N, TO-220 | 3 | Logic level. IRLB8721 is better at 3.3 V. **Not IRF520 / IRF540** |
| U2 | VS1838B or TSOP38238, 38 kHz IR receiver | 1 | The bare 3-leg part, not a module with an LED |
| D1 | 1N4007 | 1 | Reverse-polarity **shunt**, band (cathode) to +12 V |
| D2 | 1N5819 Schottky | 1 | Band (cathode) towards J3 |
| LED1 | 5 mm LED, red, yellow or green | 1 | Status light, behind the printed jewel lens |

### Passives
| Ref | Value | Qty |
|---|---|---|
| R1, R2, R3 | 100 Ω 1/4 W (gates) | 3 |
| R4, R5, R6 | 10 kΩ 1/4 W (gate pull-downs) | 3 |
| R7 | 100 Ω 1/4 W (IR supply filter) | 1 |
| R8 | 10 kΩ 1/4 W (IR pull-up) | 1 |
| R9 | 220 Ω 1/4 W (status LED) | 1 |
| C1 | 470 µF 25 V **ELECTROLYTIC**, 10 mm | 1 |
| C2 | 330 nF **CERAMIC** | 1 |
| C3 | 100 nF **CERAMIC** | 1 |
| C4 | 100 µF 10 V **ELECTROLYTIC**, 6.3 mm | 1 |
| C5 | 10 µF 16 V **ELECTROLYTIC**, 5 mm | 1 |
| F1 | PTC resettable fuse, 2.5 A hold, 30 V or more (RXEF250 or similar) | 1 |

### Connectors, wire and hardware
7 × 9 cm perfboard (24 × 30 holes) · T1 2-pin and J2 4-pin screw terminals, 5 mm pitch ·
J3 1×10, J4 1×3, J5 and J6 1×2 male pin headers · 10 female-female Dupont jumpers, 20 cm ·
3-way and 2 × 2-way Dupont leads for U2, SW1, LED1 · J1 panel DC jack 5.5/2.1 (8 mm hole) ·
J7 GX12 4-pin aviation socket and plug (12 mm hole) · SW1 12 mm momentary push button ·
0.8 mm tinned copper wire (buses) · 0.5 mm² / 20 AWG wire (power, strip) · 26 AWG for links ·
12 V 2 A adapter.

Box: 4 × M3 heat-set inserts + 4 × M3 × 8 countersunk screws (lid) · 4 × M2.5 heat-set inserts +
4 × M2.5 × 5 screws (perfboard) · 4 × M3 × 8 mm standoffs + 8 × M3 × 5 screws (R32) · 4 rubber feet,
3 mm or taller · a little hot glue.

---

## 4. Connections

### The R32 pins (sheet 2 has the picture)

Only pins that every published D1 R32 pinout agrees on and that have no job while the ESP32 starts.
D4 and D5 are wired to different GPIOs on different R32s; D7 and D10 pulse at boot; D8 and A0 are boot pins.

| R32 label | GPIO | Use | J3 pin |
|---|---|---|---|
| D12 | 19 | Button | 1 |
| D13 | 18 | Status LED | 2 |
| 5V (power header) | — | 5 V in, from D2 | 3 |
| GND (power header) | — | 0 V | 4 |
| GND (beside D13) | — | 0 V | 5 |
| 3V3 (power header) | — | 3.3 V out: IR receiver, R8 | 6 |
| D3 | 25 | Red PWM | 7 |
| D6 | 27 | Green PWM | 8 |
| D11 | 23 | Blue PWM | 9 |
| D2 | 26 | IR in | 10 |

Female-female jumpers go into the R32's own header sockets: nothing is soldered to the R32, so it comes out
in a minute if you want it for something else.

### Everything else
| From | To | Wire |
|---|---|---|
| J1 centre pin (+) | T1 +12V | red, 20 AWG |
| J1 sleeve (−) | T1 0V | black, 20 AWG |
| J2 +12V, R, G, B | J7 pins 1, 2, 3, 4 | 20 AWG |
| J7 plug pins 1–4 | strip +12V, R, G, B | the lamp's cable |
| J4 OUT, GND, VS | U2 OUT, GND, VS (pins 1-2-3 seen from the dome) | 3-way Dupont lead |
| J5 BTN, 0V | SW1, either way round | 2-way Dupont lead |
| J6 LED, 0V | LED1 long leg, LED1 short leg | 2-way Dupont lead |

**The strip:** most strips print `12V G R B` or `+ R G B` on the copper. Cut on the scissor mark, solder
four wires to the pads, and connect them to the GX12 plug in the order of J7 (1 = +12V, 2 = R, 3 = G, 4 = B).
If a colour comes out wrong, swap two of R, G, B: nothing is damaged either way, as long as +12V is on pin 1.

---

## 5. The strip driver

Each colour of the strip is switched to 0 V by a MOSFET (low side). The ESP32's pin drives the gate through
100 Ω (R1–R3), which stops the gate's charge current ringing; 10 kΩ (R4–R6) from gate to 0 V keeps the
MOSFET off whenever the ESP32 isn't driving the pin: while it boots, resets, or is unplugged. **The strip stays
dark until the firmware is running**, then fades in.

The ESP32 only gives 3.3 V. That's why the MOSFETs must be **logic-level**: IRLZ44N is fully specified from
4 V and works at 3.3 V for a couple of amps; IRLB8721 is specified at 4.5 V with a lower threshold and runs
cooler. An IRF520 or IRF540 needs 10 V on the gate: at 3.3 V it stays half on, gets hot and the strip is dim.

TO-220 pins, printed face towards you, legs down: **G – D – S** for the MOSFETs and **IN – GND – OUT** for the
7805. On the board both face the front edge (sheet 3).

---

## 6. The 5 V supply and power budget

The R32 gets its 5 V from U1, a 7805, through D2. D2 does two jobs: it stops a USB cable plugged into the R32
from pushing current backwards into the 7805, and because the R32 then gets about 4.7 V (lower than USB's 5 V),
nothing flows back into your computer either. **USB and 12 V connected together are fine.** The R32's own
3.3 V regulator (AMS1117) is happy from about 4.4 V.

| Load | at 5 V | at 12 V | Watts |
|---|---|---|---|
| ESP32 with Wi-Fi on, average (peaks 0.5 A) | 0.15 A | 0.15 A through U1 | 1.8 W in, ~1 W heat in U1 |
| IR receiver, status LED | 0.01 A | — | 0.05 W |
| Strip, 1 m of 60 LED/m 5050 at full white | — | 1.2 A | 14.4 W |
| **Total** | | **≈ 1.4 A** | **≈ 17 W** |
| 12 V 2 A adapter | | 2.0 A | 24 W |

So a 2 A adapter runs about 1.5 m of 60 LED/m strip at full white. For more strip, use a bigger adapter (F1
holds 2.5 A; for more than that use a 3.75 A PTC and IRLB8721s).

**U1's heat:** (12 − 5) V × 0.15 A ≈ 1 W. With a 20 °C/W clip-on heatsink it sits about 20 °C above the air in
the box. Without a heatsink it would run 50–65 °C hotter: don't skip it.

---

## 7. Building the perfboard (sheet 3)

**Perfboard, not stripboard:** pad-per-hole board, so there are no track cuts to get wrong. Everything is
either a bare-wire bus or an insulated link, all on the underside.

**Build order:**

1. **Bare-wire buses first**, on the empty board. Lay tinned wire along the row and solder it at every hole:
   +12 V on row 4 (columns 6–28), 0 V on rows 6, 15 and 22 and down column 2, +5 V on row 13 (columns 8–13),
   3.3 V on row 19 (columns 16–27). Use 0.8 mm wire for +12 V, row 6 and column 2: the strip current runs there.
2. **The 36 insulated links**, from the wire list on sheet 3, ticking each off. Links 8–13 (MOSFET sources and
   drains) carry strip current: use 20 AWG for those.
3. **Low parts:** resistors, D1 (standing, band up to the +12 V bus), D2 (band towards the bottom edge),
   C2, C3.
4. **Headers and terminals:** J3–J6 along the bottom edge, T1 and J2 along the top edge.
5. **Electrolytics:** C1, C4, C5, the + leg where sheet 3 shows the +. The stripe on the can is −.
6. **U1** with its heatsink clipped on, printed face towards the bottom edge.
7. **Q1–Q3 last** (touch something grounded first: MOSFET gates don't like static), printed face towards the
   bottom edge.

**How this was checked.** The layout is data (`hardware/layout.py`): every part's pins at holes, every bus,
every link. `hardware/check_layout.py` builds the real electrical connections from that and compares them with
the netlist (`hardware/netlist.py`, the same one the schematic is drawn from). It confirms all 20 nets are fully
connected, that no two nets touch, and that no lead sits under another part's body. The first draft failed
twice: R9 was in backwards against its links, and the 3.3 V bus ran through R3's lead (3.3 V shorted to the
blue PWM line). Exactly the kind of fault this catches and eyes miss.

**Not checked:** physical fit of your parts. Screw terminals are 5.0 or 5.08 mm pitch (both fit two holes),
PTC discs vary in size, and 7 × 9 cm boards come with 24 or 25 rows: measure before you solder.

---

## 8. Bring-up — before the lid goes on

Do these in order. Don't skip step 1.

1. **Continuity, nothing powered.** Meter on ohms: +12 V bus to 0 V, +5 V bus to 0 V and the 3.3 V bus to 0 V
   should all read well over 1 kΩ (the capacitors charge, so the reading climbs). Anything near zero: find the
   short now.
2. **Power, no strip, no R32.** Plug in the 12 V adapter. Measure: +12 V bus ≈ 12 V; U1 output (row 13) ≈ 5.0 V;
   J3 pin 3 ≈ 4.8–5.0 V (D2 drops less with no load). Nothing gets warm. If F1 trips at once, the supply is
   backwards (D1 did its job) or there's a short.
3. **Each colour, still without the R32.** Plug the strip in. Touch a 1 kΩ resistor from J3 pin 3 (5 V) to J3
   pin 7: the strip goes red. Pins 8 and 9: green and blue. Unplug the adapter.
4. **Firmware into the R32, on its own.** Only the USB cable on the R32, nothing else. Upload the sketch (§9).
   The serial monitor (115200) shows `RGB Lamp Controller 1.0.0` and `Set-up network "RGB-Lamp-setup" open`.
5. **All together.** Plug the ten jumpers onto J3 and the R32 (sheet 2's list), the panel leads onto J4–J6,
   then the 12 V adapter. The strip fades in warm white; the status light blinks slowly (set-up network open).
6. **Remote.** Point the remote at U2: the status light flashes at each key and the colour changes. With the
   USB cable in, the serial monitor prints each code (`IR code 0x00F720DF`).
7. **Button.** Click: off, click: on, double-click: next effect, hold: dims.
8. **Wi-Fi.** §10. Then close the lid.

---

## 9. Programming the R32

**Arduino IDE 2:**

1. File → Preferences → *Additional boards manager URLs*: `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
2. Tools → Board → Boards Manager: install **esp32 by Espressif Systems**, version 3.x.
3. Open `firmware/RGBLampController/RGBLampController.ino`. In `config.h`, change `SETUP_PASS` and
   `OTA_PASS` to your own.
4. Tools → Board → esp32 → **WEMOS D1 R32**. Tools → Port: the R32's port (Windows and macOS may need the CH340
   driver). Upload.

No other libraries are needed: the remote decoder is part of the sketch.

**arduino-cli:**
```
arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli compile --fqbn esp32:esp32:d1_uno32 firmware/RGBLampController
arduino-cli upload --fqbn esp32:esp32:d1_uno32 -p /dev/ttyUSB0 firmware/RGBLampController
```

**Later updates over Wi-Fi:** once the lamp is on your network, Tools → Port shows `rgb-lamp at 192.168.x.x`.
Pick it and upload; the IDE asks for `OTA_PASS`. The strip goes dark during the update and comes back after.

---

## 10. Wi-Fi set-up and the web page

The first time (or after a Wi-Fi reset) the lamp opens its own network:

1. On your phone, join **RGB-Lamp-setup** (password `lamp-setup`, or what you set in `config.h`).
2. The set-up page opens by itself (or go to `http://192.168.4.1/`). Pick your network, type its password,
   **Save and restart**.
3. Join your own Wi-Fi again and open **http://rgb-lamp.local/** (or the lamp's address from your router).

If the lamp can't reach the saved network for two minutes (router off, password changed), it opens
RGB-Lamp-setup as well, and keeps trying the saved network. Remote and button work all the time, Wi-Fi or not.

**Forget the Wi-Fi:** hold the button while plugging the 12 V in, and keep holding for 5 s. The status light
flickers and the set-up network opens.

**The page:** on/off, a colour picker and 12 colour dots, brightness, the nine effects with a speed slider,
and a sleep timer (15 min to 2 h; the lamp fades out over the last 30 s). It follows changes made with the
remote within two seconds. Everything is inside the firmware: it loads nothing from the internet.

**From a script or a home-automation system:**
```
curl http://rgb-lamp.local/api/state
curl -X POST -d "on=1" -d "hex=%23ff8000" -d "bri=200" http://rgb-lamp.local/api/set
curl -X POST -d "effect=5" -d "speed=7" http://rgb-lamp.local/api/set
```
Fields: `on` 0/1, `hex` `#rrggbb` (send `#` as `%23`), `bri` 1–255, `effect` 0–8 (solid, jump 3, jump 7,
fade 3, fade 7, smooth, flash, strobe, breathe), `speed` 1–10, `sleep` minutes 0–240.

The page has no password: anyone on your home network can change the colour (and the Wi-Fi settings). That's
normal for a lamp on a home network; don't put it on a network you don't trust.

---

## 11. The remote

The common **24-key** and **44-key** RGB strip remotes work as they're printed: on/off, brightness, the colour
keys, and FLASH, STROBE, FADE, SMOOTH (24 keys) or JUMP 3/7, FADE 3/7, FLASH, AUTO, QUICK, SLOW, red/green/blue
up and down, PLAY/PAUSE (44 keys). Sheet 2 shows every key and its code.

**DIY1–DIY6 (44 keys):** press to recall a colour; **hold for 2 s** to store the colour that was showing (the
status light blinks three times).

**Another remote:** most cheap remotes speak NEC. Open the serial monitor (115200), press each key and note the
code (`IR code 0x00FFA25D`). Add a line to the table in `lamp_core.h` (`lookupKey`), copying one of the lines
next to it, and upload.

---

## 12. Button and status light

| Button | Does |
|---|---|
| Click | on / off |
| Double click | next effect |
| Hold | dim up or down (the direction changes each hold) |
| Hold while plugging in, 5 s | forget the Wi-Fi |

| Status light | Means |
|---|---|
| Slow blink | set-up network RGB-Lamp-setup is open |
| Fast blink | joining your Wi-Fi |
| Short flash | a remote key was received |
| Three blinks | a DIY colour was stored |
| Dark | all well |

---

## 13. The box (sheet 4)

Made with **Maker Forge's project box generator** (Functional → Project box), from `enclosure/box-design.json`
by `enclosure/make_box.js`, which runs Maker Forge itself and checks the result:

- `enclosure/rgb-lamp-controller-box-bambu.3mf` for Bambu Studio and OrcaSlicer, `rgb-lamp-controller-box.3mf`
  for PrusaSlicer, and one STL per part in `enclosure/stl/`;
- `enclosure/rgb-lamp-controller-box.forge.json`: open it in Maker Forge (Project → Open) to change anything,
  or use the link in `enclosure/share-link.txt`.

**What's in it:** 171 × 91 × 50 mm with 2.4 mm walls and floor, a screw lid with countersunk M3 screws into
heat-set inserts, printed standoffs for the perfboard (M2.5 inserts), four floor holes for the R32's standoffs
in the Uno hole pattern, and engraved labels. Back wall: USB (lined up with the R32's micro-USB), 12V jack
(8 mm), STRIP socket (12 mm). Front wall, 36 mm up so the parts clear the Dupont plugs on the board: IR window,
STATUS light (a printed jewel lens) and the ON/OFF button. Vent slots in the floor under the board and in the
lid over the 7805: warm air goes out of the top.

**Printing:** PETG, 0.2 mm layers, 3 walls, 15 % infill. **No supports**: Maker Forge's printability check reads
0 mm² — round wall holes have 45° teardrop tops and the USB opening a pointed top. The box prints open side up,
the lid outside face down, the lens in clear PETG. Maker Forge estimates about 170 g and 3½ hours.

**Hole sizes are typical:** DC jacks come with 8 mm and 11 mm threads, GX12 sockets need 12 mm, and the R32's
micro-USB may sit a millimetre either way. Measure yours; change the hole in Maker Forge if needed. The
perfboard standoffs assume mounting holes 84 × 64 mm apart (3 mm in from the edges): measure your board and set
*Holes apart, across* and *front to back* on Maker Forge's board page.

**Assembly** (sheet 4 has the drawing):

1. Press the M3 inserts into the four corner posts and the M2.5 inserts into the perfboard standoffs (iron at
   about 220 °C for PETG).
2. Screw the four M3 standoffs to the floor from below, then the R32 onto them, USB to the back opening.
3. Fit the DC jack, the GX12 socket and the button from outside. Push the lens in from inside and the LED into
   the lens. Push U2 into its window from inside, dome out, and fix it with a dab of hot glue.
4. Wire J1 and J7 to T1 and J2, then the Dupont leads to J4, J5 and J6.
5. Screw the perfboard down, plug the ten jumpers in, and keep the wires away from the lid's lip.
6. Bring it up (§8). Then the lid, and the feet on the corners, clear of the screw heads under the floor.

`hardware/check_box.py` checks that every panel part clears the board under it and the lid: it caught the
button sitting on J4's Dupont plug in the first layout, and the button moved 6 mm to the right.

---

## 14. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Nothing at all, F1 hot | Supply backwards (D1 conducting) or a short: unplug, check |
| Strip on full white at power-up, won't go off | A MOSFET in backwards or shorted D–S; or the strip's + and − swapped |
| One colour always on | That MOSFET's gate pull-down missing, or its drain shorted to 0 V |
| One colour never on | Its gate link or R1–R3 open, or the MOSFET G and S swapped |
| Colours in the wrong order | R, G, B swapped between J2, J7 and the strip: swap two wires |
| Colours dim, MOSFETs hot | Not logic-level MOSFETs (IRF520/IRF540): use IRLZ44N or IRLB8721 |
| R32 resets when the strip comes on | Ground: check both 0 V jumpers and the column-2 bus |
| R32 doesn't start on 12 V, works on USB | No 5 V on J3 pin 3: U1 or D2 in backwards, or the 5V jumper on the wrong pin |
| U1 too hot to touch | No heatsink, or something on 5 V draws too much |
| Remote does nothing, serial shows nothing | U2's pins wrong (OUT-GND-VS from the dome side), or no 3.3 V on J4 pin 3 |
| Serial shows codes but nothing happens | A different remote: add its codes (§11) |
| Some keys work from far, others only close | Weak remote battery |
| `rgb-lamp.local` doesn't open | Some Android phones and routers ignore .local names: use the IP from your router |
| Set-up network doesn't appear | It's only open with no Wi-Fi saved: hold the button at power-up for 5 s |
| Flicker on a phone camera | 5 kHz PWM: some cameras see it at low brightness; raise `PWM_FREQ` in `config.h` (up to 19500 at 12 bits) |
| Upload fails | Hold BOOT (if your R32 has one) while it connects; CH340 driver; another program on the port |

---

## 15. Capacitor types — two, not interchangeable

**Electrolytic** (cylindrical cans, **polarised**, a stripe marks the negative leg): C1 470 µF, C4 100 µF,
C5 10 µF. Backwards they heat up and can vent.

**Ceramic** (small discs or blobs, either way round): C2 330 nF at the 7805's input and C3 100 nF at its
output. The 7805's datasheet asks for exactly these to stay stable; C4 next to C3 covers the slower current
steps when Wi-Fi transmits.

---

## 16. What has been tested and what hasn't

**Tested here:**
- the firmware's logic on a computer: 53 checks of gamma, effects, the saved state (including half-written and
  nonsense records), the remote decoder against recorded remote timings (with receiver timing errors, repeats,
  noise and half frames), the key map and the button (`make -C test`);
- the sketch compiles for the WEMOS D1 R32 with arduino-esp32 3.3 with no warnings;
- the web page in Chromium against a fake lamp: every control sends the right request, it follows the lamp,
  fits a 320 px phone and loads nothing from elsewhere (`node test/web_page_test.js`);
- the perfboard layout against the netlist (`python3 hardware/check_layout.py`);
- the box: built by Maker Forge with no warnings, every part closed, 0 mm² of support, and the panel parts
  clear the board and the lid (`node enclosure/make_box.js`, `python3 hardware/check_box.py`).

**Not tested yet:** a real build. In particular: the R32's pins on your board (check its silkscreen against §4),
real remotes' codes, Wi-Fi and the set-up portal on the R32, the 7805's temperature in the closed box, and the
printed box's fit (hole sizes, standoff spacing, lid). Report back what you find and the docs get updated.

---

## 17. Firmware notes

| File | What's in it |
|---|---|
| `RGBLampController.ino` | set-up and loop: PWM, the IR interrupt, button, Wi-Fi, web server, saving, updates |
| `config.h` | pins, PWM, names and passwords, timings |
| `lamp_core.h` | the pure logic, tested on a computer: colour and gamma, effects, the saved state, the NEC decoder, the remotes' keys, the button |
| `web_page.h` | the phone page and the Wi-Fi set-up page |

The state (on, colour, brightness, effect, speed, DIY colours) is saved to flash 3 s after the last change, so
dragging a slider doesn't wear the flash. A watchdog restarts the board if the loop ever hangs; the gate
pull-downs keep the strip dark while it restarts.

---

*Drawings: `RLC-01_Schematic`, `RLC-02_Reference` (docs/schematics), `RLC-03_Perfboard_Layout`,
`RLC-04_Box_Wiring` (docs/layout), each as SVG and PNG, drawn by `hardware/draw.py` from the netlist, the layout
and the box design.*
