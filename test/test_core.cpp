// Host tests for firmware/RGBLampController/lamp_core.h: colour maths, effects, the saved state,
// the NEC remote decoder (fed with the timings a VS1838B / TSOP38238 gives), the key map and the button.
//   make -C test
#include "lamp_core.h"
#include <cstdio>
#include <cstring>
#include <vector>
#include <set>

static int fails = 0, checks = 0;
#define CHECK(cond, what) do { checks++; if (cond) std::printf("  ok    %s\n", what); \
  else { fails++; std::printf("  FAIL  %s  (%s:%d)\n", what, __FILE__, __LINE__); } } while (0)

using namespace lamp;

static bool same(RGB a, RGB b) { return a.r == b.r && a.g == b.g && a.b == b.b; }

// ---- an IR receiver's output: idle high, low while the remote's LED flashes ("mark") ----
struct Edge { bool level; uint32_t us; };
struct Wave {
  std::vector<Edge> e; uint32_t t = 100000;
  void mark(uint32_t d) { e.push_back({false, t}); t += d; e.push_back({true, t}); }
  void space(uint32_t d) { t += d; }
  // code as printed by most tools: the first bit sent is bit 31
  void frame(uint32_t code, int markErr = 0, int spaceErr = 0) {
    mark(9000 + markErr); space(4500 + spaceErr);
    for (int i = 31; i >= 0; i--) { mark(560 + markErr); space(((code >> i) & 1 ? 1690 : 560) + spaceErr); }
    mark(560 + markErr); space(40000);
  }
  void repeat() { mark(9000); space(2250); mark(560); space(96000); }
};
static NecDecoder feed(const Wave& w, std::vector<uint32_t>* codes = nullptr, int* repeats = nullptr) {
  NecDecoder d;
  for (const Edge& x : w.e) {
    d.edge(x.level, x.us);
    if (d.hasCode()) {
      if (d.isRepeat()) { if (repeats) (*repeats)++; }
      else if (codes) codes->push_back(d.code());
      d.clear();
    }
  }
  return d;
}

static void gamma_ends_and_monotonic() {
  bool mono = true;
  for (int v = 1; v < 256; v++) if (gamma12(v) < gamma12(v - 1)) mono = false;
  CHECK(gamma12(0) == 0 && gamma12(255) == 4095, "gamma: 0 -> 0 and 255 -> 4095");
  CHECK(mono, "gamma: never goes down");
  CHECK(gamma12(128) > 800 && gamma12(128) < 1000, "gamma: half input is about a fifth of full duty (gamma 2.2)");
  CHECK(gamma12(1) <= 2, "gamma: the lowest step is tiny, so dimming is smooth at the bottom");
}

static void duty_follows_brightness() {
  CHECK(duty12(255, 255) == 4095 && duty12(255, 0) == 0 && duty12(0, 255) == 0, "duty: full, no brightness, no colour");
  CHECK(duty12(255, 128) == gamma12(128), "duty: a channel at full at half brightness = gamma of half");
  bool mono = true;
  for (int b = 1; b < 256; b++) if (duty12(200, b) < duty12(200, b - 1)) mono = false;
  CHECK(mono, "duty: never goes down as brightness goes up");
}

static void sanitize_state() {
  State s = defaults();
  s.on = true; s.bri = 0; s.effect = (Effect)200; s.lastEffect = (Effect)99; s.speed = 0; s.sleepMin = 5000;
  State t = sanitize(s);
  CHECK(t.bri == 1, "sanitize: brightness 0 while on becomes 1");
  CHECK(t.effect == SOLID && t.lastEffect == SMOOTH, "sanitize: unknown effects fall back");
  CHECK(t.speed == 1, "sanitize: speed 0 becomes 1");
  CHECK(t.sleepMin == 0, "sanitize: a sleep timer over 4 hours is dropped");
  s.speed = 77; t = sanitize(s);
  CHECK(t.speed == SPEED_MAX, "sanitize: speed above the top is clamped");
}

static void saved_state_round_trip() {
  State s = defaults();
  s.on = false; s.color = {12, 34, 56}; s.bri = 77; s.effect = FADE7; s.lastEffect = STROBE; s.speed = 9; s.sleepMin = 30;
  s.diy[3] = {1, 2, 3};
  uint8_t buf[STATE_BYTES];
  CHECK(encode(s, buf) == STATE_BYTES, "saved state: encode writes STATE_BYTES");
  State t = decode(buf, sizeof buf);
  CHECK(!t.on && same(t.color, s.color) && t.bri == 77 && t.effect == FADE7 && t.lastEffect == STROBE &&
        t.speed == 9 && t.sleepMin == 30 && same(t.diy[3], s.diy[3]), "saved state: comes back exactly");
}

static void saved_state_garbage() {
  uint8_t junk[STATE_BYTES];
  for (size_t i = 0; i < sizeof junk; i++) junk[i] = (uint8_t)(i * 97 + 13);
  junk[0] = STATE_VERSION;                       // right version, nonsense values
  State t = decode(junk, sizeof junk);
  CHECK(t.effect < EFFECT_COUNT && t.lastEffect < EFFECT_COUNT && t.speed >= 1 && t.speed <= SPEED_MAX &&
        t.bri >= 1 && t.sleepMin <= 240, "saved state: nonsense values come back in range");
  State d = defaults();
  State w = decode(junk, 5);
  CHECK(same(w.color, d.color) && w.bri == d.bri, "saved state: a short (half-written) record gives the defaults");
  junk[0] = STATE_VERSION + 1;
  w = decode(junk, sizeof junk);
  CHECK(same(w.color, d.color) && w.effect == d.effect, "saved state: another version gives the defaults");
}

static void effects_stay_sane() {
  State s = defaults(); s.color = {200, 100, 50};
  bool ok = true;
  for (int e = 0; e < EFFECT_COUNT; e++) for (int sp = 1; sp <= SPEED_MAX; sp++) {
    s.effect = (Effect)e; s.speed = sp;
    std::set<uint32_t> seen;
    for (uint32_t ms = 0; ms < 60000; ms += 37) { RGB c = effectColor(s, ms); seen.insert(c.r << 16 | c.g << 8 | c.b); }
    if (e == SOLID ? seen.size() != 1 : seen.size() < 2) ok = false;
  }
  CHECK(ok, "effects: solid stays one colour, every other effect changes, at every speed");
  CHECK(std::strcmp(effectName(SMOOTH), "Smooth") == 0 && std::strcmp(effectName((Effect)99), "?") == 0, "effects: names");
}

static void jump3_sequence() {
  State s = defaults(); s.effect = JUMP3; s.speed = 5;
  uint32_t st = stepMs(s);
  CHECK(same(effectColor(s, 0), RGB{255, 0, 0}) && same(effectColor(s, st), RGB{0, 255, 0}) &&
        same(effectColor(s, 2 * st), RGB{0, 0, 255}) && same(effectColor(s, 3 * st + 1), RGB{255, 0, 0}),
        "jump 3: red, green, blue, red");
  s.speed = SPEED_MAX; uint32_t fast = stepMs(s); s.speed = 1;
  CHECK(fast < stepMs(s), "speed: a higher speed steps faster");
}

static void breathe_follows_colour() {
  State s = defaults(); s.effect = BREATHE; s.color = {0, 255, 0};
  bool onlyGreen = true; int top = 0, bottom = 255;
  for (uint32_t ms = 0; ms < 20000; ms += 13) {
    RGB c = effectColor(s, ms);
    if (c.r || c.b) onlyGreen = false;
    if (c.g > top) top = c.g;
    if (c.g < bottom) bottom = c.g;
  }
  CHECK(onlyGreen && top >= 250 && bottom <= 30, "breathe: the chosen colour, from almost dark to full");
}

static void nec_24key_red() {
  Wave w; w.frame(0x00F720DF);
  std::vector<uint32_t> codes; feed(w, &codes);
  CHECK(codes.size() == 1 && codes[0] == 0x00F720DFu, "NEC: 24-key remote, red key");
  Action a = lookupKey(0x00F720DF);
  CHECK(a.key == K_COLOR && same(a.color, RGB{255, 0, 0}), "keys: 24-key red sets red");
}

static void nec_44key_power() {
  Wave w; w.frame(0x00FF02FD, 120, -110);         // a real receiver stretches marks and shortens spaces
  std::vector<uint32_t> codes; feed(w, &codes);
  CHECK(codes.size() == 1 && codes[0] == 0x00FF02FDu, "NEC: 44-key remote, power key, with receiver timing error");
  CHECK(lookupKey(0x00FF02FD).key == K_TOGGLE, "keys: 44-key power toggles");
}

static void nec_repeat() {
  Wave w; w.frame(0x00F700FF); w.repeat(); w.repeat();
  std::vector<uint32_t> codes; int reps = 0; feed(w, &codes, &reps);
  CHECK(codes.size() == 1 && reps == 2, "NEC: a held key sends one code then repeats");
  Action a = lookupKey(0x00F700FF);
  CHECK(a.key == K_BRI_UP && a.repeats, "keys: brightness up repeats while held");
}

static void nec_extended_address() {
  // address bytes that are not each other's inverse (extended NEC), command 0x20 / ~0x20
  Wave w; w.frame(0x12AB20DF);
  std::vector<uint32_t> codes; feed(w, &codes);
  CHECK(codes.size() == 1 && codes[0] == 0x12AB20DFu, "NEC: extended addresses decode");
  Wave bad; bad.frame(0x12AB20DE);                 // command check byte wrong
  codes.clear(); feed(bad, &codes);
  CHECK(codes.empty(), "NEC: a frame whose command check byte is wrong is dropped");
  CHECK(lookupKey(0x12AB20DF).key == K_NONE, "keys: unknown codes do nothing");
}

static void nec_noise_then_frame() {
  Wave w;
  w.mark(300); w.space(700); w.mark(9000); w.space(4500); for (int i = 0; i < 10; i++) { w.mark(560); w.space(1690); }
  w.space(30000);                                   // half a frame, then silence
  w.mark(150); w.space(200);                        // a glitch
  w.frame(0x00FFA25D);
  std::vector<uint32_t> codes; feed(w, &codes);
  CHECK(codes.size() == 1 && codes[0] == 0x00FFA25Du, "NEC: noise and half a frame, then a real frame decodes");
  CHECK(lookupKey(0x00FFA25D).key == K_COLOR && same(lookupKey(0x00FFA25D).color, RGB{0, 0, 255}), "keys: 44-key blue");
}

static void nec_half_frame_then_frame() {
  // the receiver caught only the end of one press, and the next frame starts straight after it
  Wave w; w.mark(9000); w.space(4500); for (int i = 0; i < 12; i++) { w.mark(560); w.space(560); }
  w.space(20000);
  w.frame(0x00F7E01F);
  std::vector<uint32_t> codes; feed(w, &codes);
  CHECK(codes.size() == 1 && codes[0] == 0x00F7E01Fu, "NEC: a frame that starts right after a broken one decodes");
}

static void keys_change_state() {
  State s = defaults(); s.on = true; s.bri = 250;
  s = apply(s, lookupKey(0x00F700FF));
  CHECK(s.bri == 255, "apply: brightness up stops at full");
  s.bri = 10; s = apply(s, lookupKey(0x00F7807F));
  CHECK(s.bri == BRI_MIN, "apply: brightness down stops at the lowest step, not off");
  s = apply(s, lookupKey(0x00F740BF));
  CHECK(!s.on, "apply: off key");
  s = apply(s, lookupKey(0x00F7609F));
  CHECK(s.on && s.effect == SOLID && same(s.color, RGB{0, 0, 255}), "apply: a colour key turns on, solid");
  s = apply(s, lookupKey(0x00F7C837));
  CHECK(s.effect == FADE7, "apply: 24-key FADE");
  s = apply(s, lookupKey(0x00FF827D));
  CHECK(s.effect == SOLID && s.lastEffect == FADE7, "apply: play/pause stops the effect");
  s = apply(s, lookupKey(0x00FF827D));
  CHECK(s.effect == FADE7, "apply: play/pause brings it back");
  s.speed = 5; s = apply(s, lookupKey(0x00FFE817));
  CHECK(s.speed == 6, "apply: quick");
  s.color = {250, 0, 0}; s = apply(s, lookupKey(0x00FF28D7));
  CHECK(s.color.r == 255 && s.effect == SOLID, "apply: red up, clamped, solid");
  s.diy[1] = {9, 8, 7}; Action d = lookupKey(0x00FFB04F);
  CHECK(d.key == K_DIY && d.index == 1, "keys: DIY2 is store 1");
  s = apply(s, d);
  CHECK(same(s.color, RGB{9, 8, 7}), "apply: DIY recalls its colour");
}

// ---- button: pressed = true while held; begin() at 0 ms ----
static std::vector<Button::Event> press(Button& b, std::vector<std::pair<uint32_t, bool>> steps, uint32_t until) {
  std::vector<Button::Event> out; size_t i = 0; bool level = false;
  for (uint32_t ms = 1; ms <= until; ms++) {
    while (i < steps.size() && steps[i].first <= ms) level = steps[i++].second;
    Button::Event e = b.update(level, ms);
    if (e != Button::NONE) out.push_back(e);
  }
  return out;
}

static void button_click() {
  Button b; b.begin(false, 0);
  auto ev = press(b, {{100, true}, {103, false}, {106, true}, {250, false}}, 1200);   // bounce, then a click
  CHECK(ev.size() == 1 && ev[0] == Button::CLICK, "button: a bouncy click is one click");
}

static void button_double() {
  Button b; b.begin(false, 0);
  auto ev = press(b, {{100, true}, {200, false}, {350, true}, {450, false}}, 1500);
  CHECK(ev.size() == 1 && ev[0] == Button::DOUBLE, "button: double click");
}

static void button_hold() {
  Button b; b.begin(false, 0);
  auto ev = press(b, {{100, true}, {1500, false}}, 2500);
  int ticks = 0; for (auto e : ev) if (e == Button::HOLD_TICK) ticks++;
  CHECK(ev.size() > 2 && ev.front() == Button::HOLD_START && ev.back() == Button::HOLD_END, "button: hold starts and ends");
  CHECK(ticks >= 15 && ticks <= 25, "button: hold ticks about every 40 ms");
  bool noClick = true; for (auto e : ev) if (e == Button::CLICK || e == Button::DOUBLE) noClick = false;
  CHECK(noClick, "button: a hold is not also a click");
}

static void boot_hold_short() {
  Button b; b.begin(true, 0);
  auto ev = press(b, {{0, true}, {3000, false}}, 4500);
  CHECK(ev.empty(), "button: held at power-up for 3 s does nothing (no reset, no hold, no click)");
  ev = press(b, {{4600, true}, {4700, false}}, 5500);
  CHECK(ev.size() == 1 && ev[0] == Button::CLICK, "button: works normally after that");
}

static void boot_hold_long() {
  Button b; b.begin(true, 0);
  auto ev = press(b, {{0, true}, {7000, false}}, 8000);
  CHECK(ev.size() == 1 && ev[0] == Button::BOOT_RESET, "button: held at power-up for 5 s asks for a Wi-Fi reset, once");
}

static void fader_eases_from_boot() {
  // the first frame comes a second or two after power-up: it must start the fade, not jump to full
  Fader f; f.begin(1500);
  const uint16_t full[3] = { 4095, 4095, 0 };
  uint16_t out[3];
  f.frame(1510, full, false, out);
  CHECK(out[0] > 0 && out[0] < 400 && out[2] == 0, "fader: 10 ms after boot the strip is only just coming up");
  for (uint32_t ms = 1520; ms <= 1820; ms += 10) f.frame(ms, full, false, out);
  CHECK(out[0] == 4095 && out[1] == 4095, "fader: full after the 300 ms fade");
  const uint16_t off[3] = { 0, 0, 0 };
  f.frame(1830, off, true, out);
  CHECK(out[0] == 0 && out[1] == 0, "fader: snap goes at once (jumps, flashes, strobes)");
}

int main() {
  std::printf("colour\n");   gamma_ends_and_monotonic(); duty_follows_brightness();
  std::printf("state\n");    sanitize_state(); saved_state_round_trip(); saved_state_garbage();
  std::printf("effects\n");  effects_stay_sane(); jump3_sequence(); breathe_follows_colour();
  std::printf("remote\n");   nec_24key_red(); nec_44key_power(); nec_repeat(); nec_extended_address(); nec_noise_then_frame(); nec_half_frame_then_frame();
  keys_change_state();
  std::printf("button\n");   button_click(); button_double(); button_hold(); boot_hold_short(); boot_hold_long();
  std::printf("fader\n");    fader_eases_from_boot();
  std::printf("\n%d checks, %d failed\n", checks, fails);
  return fails ? 1 : 0;
}
