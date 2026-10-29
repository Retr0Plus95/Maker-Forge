# RGB Lamp Controller: design

Date: 2026-10-29. Status: agreed with the owner in chat (choices below), written before building.

## Goal

A controller for the 12 V RGB LED strip in a 3D-printed desk lamp ("Desk Stranding", the Death Stranding
desk lamp on Printables), built by the owner on a 7 × 9 cm perfboard around an ESP32 in Arduino Uno form
(WeMos D1 R32), in a project box made with Maker Forge. It is its own project, laid out like the owner's
Solder-Fume-Extractor repository, and it also goes on retr0plus.se as a project.

Success: someone with a soldering iron can build it from the repository alone (parts list, schematic,
perfboard layout with a wire list, box files, firmware, step-by-step guide), and the lamp is controlled by
a standard strip remote, a button and a phone.

## The owner's choices

| Question | Answer |
|---|---|
| "IR transistors" | Both: MOSFETs for the strip and an IR receiver for a remote |
| ESP32 board | Uno-shaped ESP32: WeMos D1 R32 |
| Firmware | Own Arduino sketch: IR remote, button, Wi-Fi web page, remembers the colour, updates over Wi-Fi |
| 5 V supply | The owner's 7805 (with heatsink), not a buck module and not the R32's VIN |
| Website | Done from this session, as a pull request in the Website repository |
| Repository | `Retr0Plus95/RGB-Lamp-Controller`, public, MIT |

Assumed (the lamp's page could not be read from here): a 4-wire 12 V analog RGB strip (+12V, R, G, B,
common anode), at most about 2 A per colour. One metre of 60 LED/m 5050 strip draws about 1.2 A at full white.

## Electronics

Supply: 12 V 2 A adapter. On the perfboard:

- **Input:** screw terminal T1 (from the panel DC jack) → F1 2 A slow-blow (5 × 20 mm, PCB clips) → +12 V.
  D1 1N4007 across +12 V and 0 V as a reverse-polarity shunt (cathode to +12 V), as in the fume extractor:
  wrong polarity blows F1. C1 470 µF 25 V electrolytic on +12 V.
- **5 V:** U1 L7805CV with a clip-on TO-220 heatsink; C2 330 nF ceramic at its input, C3 100 nF ceramic and
  C4 100 µF 10 V electrolytic at its output. About 0.15 A average × 7 V ≈ 1 W, 0.5 A peaks while Wi-Fi sends.
- **5 V to the R32:** D2 1N5819 Schottky from the 7805 output to the R32's 5V pin, so a USB cable plugged
  into the R32 cannot drive current back into the 7805. The R32 sees about 4.7 V, as an ESP32 board does from
  USB through its own diode; its AMS1117 makes 3.3 V from that.
- **Strip drivers:** Q1–Q3 IRLZ44N (IRLB8721 is the better part at 3.3 V gate drive), low side. Gate:
  R1–R3 100 Ω in series from the GPIO, R4–R6 10 kΩ gate to 0 V, so the strip is dark while the ESP32 boots,
  resets or is unplugged. Drains to the strip's R, G, B; the strip's +12V straight from the fused rail.
  Output terminal J2 (+12V, R, G, B) → GX12-4 aviation socket on the box.
- **IR receiver:** VS1838B or TSOP38238 (pins OUT, GND, VS) on a 3-wire lead to header J4, behind a window
  in the front wall. Supply from 3.3 V through R7 100 Ω with C5 10 µF (datasheet filter); R8 10 kΩ pull-up
  on OUT to 3.3 V. Running it from 3.3 V keeps its output safe for the ESP32.
- **Button:** 12 mm panel push button to header J5 (BTN, 0 V); internal pull-up, debounced in firmware.
- **Status LED:** 5 mm LED (red, yellow or green) behind a printed jewel lens, to header J6, R9 220 Ω on board.
- **Link to the R32:** header J3, 10 pins: 5V, GND, GND, 3V3, R, G, B, IR, BTN, LED, with Dupont
  jumpers into the R32's own header sockets (no soldering on the R32).

### R32 pins

Only pins that every published D1 R32 pinout agrees on and that have no boot role (D4, D5 disagree between
sources; D7/GPIO14 and D10/GPIO5 pulse at boot; D8/GPIO12 and A0/GPIO2 are strapping pins):

| Signal | R32 label | GPIO |
|---|---|---|
| Red PWM | D3 | 25 |
| Green PWM | D6 | 27 |
| Blue PWM | D11 | 23 |
| IR in | D2 | 26 |
| Button | D12 | 19 |
| Status LED | D13 | 18 |
| 5V, 3V3, GND | power header (GND also beside D13) | |

## Firmware

Arduino sketch for arduino-esp32 3.x, board "WEMOS D1 R32". **No third-party libraries:** the NEC IR
decoder is written in the sketch (timings measured in an interrupt), so it can be tested on a computer.

- `RGBLampController.ino`: set-up and loop; `config.h`: pins, names, remote codes, timings;
  `lamp_core.h`: everything that is pure logic (colour, gamma, effects, NEC decoder, remote key map, button
  state machine), no Arduino calls; `web_page.h`: the phone page.
- **PWM:** LEDC, 5 kHz, 12-bit, gamma 2.2 from 8-bit colour × brightness. Changes fade over about 300 ms.
- **Effects:** solid, jump 3/7 colours, fade 3/7, smooth (rainbow), flash, strobe, breathe; speed setting.
- **IR remote:** the common 24-key and 44-key strip remotes (NEC). Held keys repeat (brightness, colour
  fine-tune). The 44-key DIY1–6 keys recall six colours; holding one for 2 s stores the current colour there.
  Learn mode: every code received is printed on the serial monitor, so another remote can be added to `config.h`.
- **Button:** click on/off, double-click next effect, hold to dim (direction alternates each hold).
  Holding it while powering up for 5 s clears the saved Wi-Fi.
- **Wi-Fi:** no saved network → it starts its own network `RGB-Lamp-setup` (password in `config.h`) with a
  set-up page at 192.168.4.1 (captive portal). Afterwards it joins the home network and answers at
  `http://rgb-lamp.local/`; if the network is gone it keeps working from remote and button and retries.
- **Phone page:** on/off, colour picker, swatches, brightness, effects, speed, sleep timer (15/30/60/120 min,
  fades out), status. Plain HTML/CSS/JS inside the firmware; it loads nothing from the internet.
  JSON API: `GET /api/state`, `POST /api/set`.
- **Memory:** the state is saved to flash (Preferences) 3 s after the last change; a power cut brings the
  lamp back as it was.
- **Updates over Wi-Fi:** ArduinoOTA with a password from `config.h`.
- **Safety net:** loop watchdog; strip dark during boot (gate pull-downs).
- **Status LED:** slow blink in set-up mode, fast blink while connecting, short flash for each IR key, off
  when all is well.

Testing: `test/` builds `lamp_core.h` with g++ and checks gamma, colour maths, effects, the NEC decoder
against recorded timings for both remotes (and repeats, noise, half codes), the key map and the button state
machine. The sketch is compile-checked with arduino-cli for `esp32:esp32:d1_uno32`. A GitHub Action does both.

## Drawings (house style of the fume extractor: dark blueprint, title block, drawing numbers)

Drawing set **RLC-2026**, each as SVG and PNG, generated by a script from one netlist:

- **RLC-01** schematic: A power, B R32 link, C strip drivers, D user interface, E design notes, signal list,
  capacitor types, title block.
- **RLC-02** reference: the R32 pin map (Uno labels and GPIO), the jumper list, the remote key maps.
- **RLC-03** perfboard layout: 24 × 30 holes (7 × 9 cm), component side, bare-wire buses, insulated links
  with a numbered wire list. A script builds the electrical connections from the layout and compares them with
  the netlist (every net joined, no two nets touching, no lead under another part's body), as the fume
  extractor's layout was checked.
- **RLC-04** box wiring: where the boards and panel parts sit in the box and how they connect.

## Project box (Maker Forge enclosure generator, unchanged)

About 160 × 84 × 45 mm, screw lid with M3 heat inserts, rubber feet. Maker Forge places one board's
standoffs, so:

- the perfboard sits on printed standoffs ("My own board", 90 × 70 mm, hole spacing to be measured and set
  in Maker Forge);
- the R32 is held by four M3 screws through the floor into nylon standoffs, in the Uno hole pattern.

Openings, each with an engraved label: back wall 12 V DC jack, GX12 strip socket, R32 USB; front wall IR
window, push button, status light (printed jewel lens); vent slots near the 7805. Files: 3MF and STL for
each part, and the Maker Forge project (`.json`) to open and change the box. Pictures rendered from Maker Forge.

## Repository

```
firmware/RGBLampController/   sketch, config.h, lamp_core.h, web_page.h
test/                         host tests for lamp_core.h
hardware/                     netlist + layout data, layout checker, drawing generator
docs/Build_Guide.md           full build guide
docs/schematics/, docs/layout/  RLC-01..04 SVG + PNG
enclosure/                    3MF, STL, Maker Forge project
images/                       renders, web page screenshot, cover
.github/workflows/build.yml   compile + tests
README.md, CHANGELOG.md, LICENSE (MIT)
```

## Website (Website repository, its own branch and pull request)

Project card in `site/js/projects-data.js` (Electronics, In Progress) with a picture and the repository
link; a project page `/projects/rgb-lamp-controller/` made by `tools/build-pages.py` (static HTML: build
steps, parts, drawings with the lightbox, box files); the box STL files on Downloads ("View in 3D"); a build
log entry. The site's rules apply: everything self-hosted, no inline scripts or styles, works at 375 px,
`./check` and `tools/check-no-external.py` pass.

## Not testable here

The real hardware, the IR remote, Wi-Fi on the D1 R32, the print fit of the box, the 7805's temperature in
the closed box. The documents say so where it matters, with a bring-up procedure to check each on the bench.
