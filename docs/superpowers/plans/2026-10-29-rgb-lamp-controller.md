# RGB Lamp Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buildable, documented ESP32 (WeMos D1 R32) controller for a 12 V RGB strip lamp: firmware, perfboard
design, drawings, a Maker Forge project box, a repository like Solder-Fume-Extractor, and a project on retr0plus.se.

**Architecture:** All pure logic of the firmware lives in one header (`lamp_core.h`) that compiles on a computer
and is unit-tested there; the sketch only wires it to the hardware. The circuit is one netlist (Python data) from
which the layout checker and the drawings are made, so the schematic, the layout and the wire list cannot
disagree. The box is made by driving Maker Forge's enclosure generator headlessly.

**Tech Stack:** Arduino (arduino-esp32 3.x), C++17 + g++ for tests, arduino-cli, Python 3 (drawings, checker),
Node + jsdom + Playwright Chromium (Maker Forge box, renders, PNGs), the Website's build-pages.py.

**Spec:** `docs/superpowers/specs/2026-10-29-rgb-lamp-controller-design.md`

## Global Constraints

- Pins: R D3/GPIO25, G D6/GPIO27, B D11/GPIO23, IR D2/GPIO26, button D12/GPIO19, status LED D13/GPIO18.
- PWM: LEDC 5 kHz, 12-bit, gamma 2.2; fades about 300 ms.
- No third-party Arduino libraries (own NEC decoder); board FQBN `esp32:esp32:d1_uno32`.
- Set-up network `RGB-Lamp-setup`, host name `rgb-lamp` (`http://rgb-lamp.local/`); the page loads nothing from the internet.
- State saved 3 s after the last change; strip dark during boot (gate pull-downs).
- 5 V: L7805CV + heatsink, C2 330 nF, C3 100 nF, C4 100 µF, D2 1N5819 to the R32 5V pin. F1 2 A T, D1 1N4007 shunt, C1 470 µF 25 V.
- Perfboard 24 × 30 holes (70 × 90 mm). Drawing set RLC-2026, sheets RLC-01..04, SVG + PNG, fume-extractor style.
- Box ~160 × 84 × 45 mm from Maker Forge's enclosure generator without changing Maker Forge.
- Website: no inline scripts/styles, nothing external, 375 px wide without sideways scroll, `./check` passes.
- Docs plain and friendly; say clearly what was not tested on real hardware.

## Review Focus

1. A remote whose NEC address is not the inverted-byte form (extended NEC): the keys must still be decoded and mapped. → Task 1 test `nec_extended_address`.
2. Saved state that is out of range or garbage after a power cut mid-write: the lamp must start sane (clamped). → Task 1 test `sanitize_state`.
3. IR noise or a half frame followed by a real frame: the real frame must decode. → Task 1 test `nec_noise_then_frame`.
4. A long SSID (32 chars) or a 63-char password with spaces and symbols in the set-up form: stored exactly. → Task 2: the form handler uses `server.arg()` (decoded) and length checks; checked by compiling and reading.
5. The button held by accident at power-up for less than 5 s must not clear Wi-Fi. → Task 1 test `boot_hold_short`.

---

### Task 1: Firmware core logic with host tests

**Files:**
- Create: `firmware/RGBLampController/lamp_core.h`
- Test: `test/test_core.cpp`, `test/Makefile`

**Interfaces:**
- Produces (namespace `lamp`):
  - `struct RGB { uint8_t r, g, b; }`
  - `uint16_t gamma12(uint8_t v)`: 0→0, 255→4095, monotonic, gamma 2.2.
  - `RGB scale(RGB c, uint8_t bri)`
  - `enum Effect : uint8_t { SOLID, JUMP3, JUMP7, FADE3, FADE7, SMOOTH, FLASH, STROBE, BREATHE, EFFECT_COUNT }`, `const char* effectName(Effect)`
  - `struct State { bool on; RGB color; uint8_t bri; Effect effect; uint8_t speed; uint16_t sleepMin; RGB diy[6]; }`, `State defaults()`, `State sanitize(State)`
  - `RGB effectColor(const State&, uint32_t ms)`: colour before brightness, for time `ms` since the effect started.
  - `class NecDecoder { void reset(); bool edge(bool level, uint32_t us); bool hasCode() const; uint32_t code() const; bool isRepeat() const; void clear(); }`: fed with every edge (level after the edge, micros timestamp); `code()` is 32-bit MSB-first as `0xAAaaCCcc`-style printed by most tools (address, ~address or extended address, command, ~command).
  - `enum Key : uint8_t { K_NONE, K_ON, K_OFF, K_TOGGLE, K_BRI_UP, K_BRI_DOWN, K_COLOR, K_EFFECT, K_SPEED_UP, K_SPEED_DOWN, K_R_UP, K_R_DOWN, K_G_UP, K_G_DOWN, K_B_UP, K_B_DOWN, K_DIY }`, `struct Action { Key key; RGB color; Effect effect; uint8_t index; bool repeats; }`, `Action lookupKey(uint32_t code)`
  - `State apply(State s, const Action& a)`
  - `class Button { void begin(bool pressedAtBoot, uint32_t ms); enum Event { NONE, CLICK, DOUBLE, HOLD_START, HOLD_TICK, HOLD_END, BOOT_RESET }; Event update(bool pressed, uint32_t ms); }`: debounce 30 ms, double-click window 350 ms, hold after 600 ms with ticks every 40 ms, BOOT_RESET after 5000 ms held since boot.

- [ ] **Step 1: Write failing tests** in `test/test_core.cpp` (own tiny `CHECK` macro, prints `ok`/`FAIL`, exit code = failures): `gamma_ends_and_monotonic`, `scale_bri`, `sanitize_state` (bri 0 while on → 1, effect 200 → SOLID, speed 0 → 1, sleepMin 5000 → 0), `effects_stay_in_range` (every effect, 0..60 s), `jump3_sequence` (red, green, blue), `nec_24key_red` (recorded timings → `0xF720DF`, maps to K_COLOR red), `nec_44key_power` (`0xFF02FD` → K_TOGGLE), `nec_repeat` (leader 9 ms + 2.25 ms space → isRepeat), `nec_extended_address`, `nec_noise_then_frame`, `button_click`, `button_double`, `button_hold`, `boot_hold_short`, `boot_hold_long`.
- [ ] **Step 2: Run `make -C test`** → fails (no header).
- [ ] **Step 3: Implement `lamp_core.h`** (header-only, no Arduino includes; `<stdint.h>`, `<math.h>`). NEC timing windows: leader mark 9000 µs ±25 %, space 4500 (frame) or 2250 (repeat), bit mark 560, space 560 (0) or 1690 (1), ±35 %; any out-of-window edge resets.
- [ ] **Step 4: Run `make -C test`** → all ok.
- [ ] **Step 5: Commit** `firmware: lamp core logic with host tests`.

### Task 2: The sketch

**Files:** Create `firmware/RGBLampController/RGBLampController.ino`, `config.h`, `web_page.h`.

**Interfaces:** Consumes everything from Task 1. Produces HTTP `GET /` (page), `GET /api/state` (JSON `{on,hex,bri,effect,effects:[...],speed,sleep,sleepLeft,ssid,ip,rssi,version}`), `POST /api/set` (form fields `on`,`hex`,`bri`,`effect`,`speed`,`sleep`, any subset), set-up mode `GET /` form and `POST /wifi` (`ssid`, `pass`).

- [ ] **Step 1:** `config.h`: pins, `PWM_FREQ 5000`, `PWM_BITS 12`, names, `SETUP_PASS`, `OTA_PASS`, `FW_VERSION "1.0.0"`, `SAVE_DELAY_MS 3000`, `FADE_MS 300`.
- [ ] **Step 2:** sketch: IR edge ISR → ring buffer of (level, micros) → decoder in loop; LEDC via `ledcAttach`/`ledcWrite`; Preferences load/sanitize/save; Wi-Fi station or set-up AP + DNSServer captive portal; mDNS; ArduinoOTA; status LED patterns; `enableLoopWDT()`.
- [ ] **Step 3:** `web_page.h`: `PROGMEM` page (HTML/CSS/JS, no external files), polls `/api/state` every 2 s.
- [ ] **Step 4: Compile** `arduino-cli compile --fqbn esp32:esp32:d1_uno32 firmware/RGBLampController` → success.
- [ ] **Step 5: Commit** `firmware: sketch, web page and set-up portal`.

### Task 3: Netlist, perfboard layout and checker

**Files:** Create `hardware/netlist.py`, `hardware/layout.py`, `hardware/check_layout.py`.

**Interfaces:** Produces `NETS: dict[str, list[str]]` (pin refs like `"Q1.G"`), `PARTS: dict[str, dict]` (value, kind, notes), `LAYOUT` (part → {pin: (col,row)}, body rectangles), `BUSES` (net, row/col runs), `LINKS` (list of (a, b, net)); `check() -> list[str]` (problems; empty = good).

- [ ] **Step 1:** checker first, run on an empty layout → reports every net unconnected.
- [ ] **Step 2:** fill `LAYOUT`, `BUSES`, `LINKS` on 24 × 30 holes (cols 1..30 along 90 mm, rows 1..24 along 70 mm).
- [ ] **Step 3:** `python3 hardware/check_layout.py` → "all N nets connected, no shorts, no leads under bodies".
- [ ] **Step 4: Commit** `hardware: netlist, perfboard layout and checker`.

### Task 4: Drawings RLC-01..04

**Files:** Create `hardware/draw.py` (SVG), `hardware/render_png.js` (Chromium → PNG); output `docs/schematics/RLC-01_Schematic.*`, `RLC-02_Reference.*`, `docs/layout/RLC-03_Perfboard_Layout.*`, `docs/layout/RLC-04_Box_Wiring.*`.

- [ ] **Step 1:** `python3 hardware/draw.py` writes the four SVGs from `netlist.py`/`layout.py`; it asserts every net in the signal list exists.
- [ ] **Step 2:** `node hardware/render_png.js` → PNGs at 2048 px wide; look at each PNG.
- [ ] **Step 3: Commit** `docs: drawing set RLC-01..04`.

### Task 5: Project box with Maker Forge

**Files:** Create `enclosure/make_box.js` (runs Maker Forge's `index.html` in jsdom via `tools-test-env.js`), output `enclosure/*.stl`, `enclosure/rgb-lamp-controller-box.3mf`, `enclosure/rgb-lamp-controller-box.json`; `enclosure/render_box.js` (Chromium) → `images/box-*.png`.

- [ ] **Step 1:** script sets the enclosure state (size, openings, custom board, floor holes, vents, feet), rebuilds, checks every part closed and no placement warnings, writes the files.
- [ ] **Step 2:** renders: closed box front/back, open box from above.
- [ ] **Step 3: Commit** `enclosure: Maker Forge project box`.

### Task 6: Pictures, docs, CI

**Files:** Create `README.md`, `docs/Build_Guide.md`, `CHANGELOG.md`, `LICENSE`, `.gitignore`, `.github/workflows/build.yml`, `images/web-page.png`, `images/cover.png`.

- [ ] **Step 1:** screenshot of the web page in Chromium against a fake `/api/state`.
- [ ] **Step 2:** Build guide sections like the fume extractor's: what it does, safety, BOM, connection tables, R32 pins, programming, perfboard build order, box printing and assembly, bring-up, remote key map, web page, troubleshooting, not yet tested.
- [ ] **Step 3:** workflow: host tests + arduino-cli compile.
- [ ] **Step 4: Commit** `docs: README, build guide and CI`.

### Task 7: Push

- [ ] Once `Retr0Plus95/RGB-Lamp-Controller` exists: attach with push access, push `main`, check the Action.

### Task 8: Website

**Files (Website repo, branch `claude/rgb-lamp-controller`):** Modify `site/js/projects-data.js`, `site/js/downloads-data.js`, `site/js/logs-data.js`, `tools/build-pages.py`; create `site/img/projects/rgb-lamp-controller/*`, `site/files/rgb-lamp-controller-*.stl`, generated `site/projects/rgb-lamp-controller/index.html`.

- [ ] **Step 1:** add the page to build-pages.py using its `page()` helper and the existing lightbox; run it.
- [ ] **Step 2:** `./check`, `python3 tools/check-no-external.py`, Chromium at 375 px.
- [ ] **Step 3:** commit, push, open the pull request.
