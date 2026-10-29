// RGB Lamp Controller: everything that is pure logic, with no Arduino calls, so it is tested on a computer
// (test/test_core.cpp): colour and gamma, the effects, the saved state, the NEC remote decoder, the remote's
// key map and the button.
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <math.h>

namespace lamp {

struct RGB { uint8_t r, g, b; };

const uint8_t SPEED_MAX = 10;     // effect speed 1 (slow) .. 10 (fast)
const uint8_t BRI_MIN = 4;        // the dimmest the remote and button go while on
const uint8_t BRI_STEP = 16;      // one press of brightness up / down
const uint8_t CHANNEL_STEP = 16;  // one press of red / green / blue up / down (44-key remote)

// ---------------------------------------------------------------- colour

// PWM duty (0..4095) for one channel at a brightness, gamma 2.2: equal steps look equal to the eye
inline uint16_t duty12(uint8_t c, uint8_t bri) {
  double x = (double)c * bri / 65025.0;
  return (uint16_t)lround(pow(x, 2.2) * 4095.0);
}
inline uint16_t gamma12(uint8_t v) { return duty12(v, 255); }

inline RGB scale(RGB c, uint8_t k) {
  return { (uint8_t)((c.r * k + 127) / 255), (uint8_t)((c.g * k + 127) / 255), (uint8_t)((c.b * k + 127) / 255) };
}
inline RGB blend(RGB a, RGB b, double f) {
  return { (uint8_t)lround(a.r + (b.r - a.r) * f), (uint8_t)lround(a.g + (b.g - a.g) * f), (uint8_t)lround(a.b + (b.b - a.b) * f) };
}
// hue 0..360, full saturation and value
inline RGB hue(double h) {
  h = fmod(h, 360.0); if (h < 0) h += 360.0;
  double x = 1.0 - fabs(fmod(h / 60.0, 2.0) - 1.0);
  double r = 0, g = 0, b = 0;
  if (h < 60) { r = 1; g = x; } else if (h < 120) { r = x; g = 1; } else if (h < 180) { g = 1; b = x; }
  else if (h < 240) { g = x; b = 1; } else if (h < 300) { r = x; b = 1; } else { r = 1; b = x; }
  return { (uint8_t)lround(r * 255), (uint8_t)lround(g * 255), (uint8_t)lround(b * 255) };
}

// ---------------------------------------------------------------- state

enum Effect : uint8_t { SOLID, JUMP3, JUMP7, FADE3, FADE7, SMOOTH, FLASH, STROBE, BREATHE, EFFECT_COUNT };

inline const char* effectName(Effect e) {
  static const char* const names[EFFECT_COUNT] = { "Solid", "Jump 3", "Jump 7", "Fade 3", "Fade 7", "Smooth", "Flash", "Strobe", "Breathe" };
  return e < EFFECT_COUNT ? names[e] : "?";
}

struct State {
  bool on;
  RGB color;            // the solid colour (also the colour of flash, strobe and breathe)
  uint8_t bri;          // 1..255, used while on
  Effect effect;
  Effect lastEffect;    // what play/pause brings back
  uint8_t speed;        // 1..SPEED_MAX
  uint16_t sleepMin;    // sleep timer chosen on the web page, 0 = none (the countdown itself is not saved)
  RGB diy[6];           // the 44-key remote's DIY1..DIY6
};

inline State defaults() {
  State s;
  s.on = true; s.color = { 255, 160, 70 }; s.bri = 180; s.effect = SOLID; s.lastEffect = SMOOTH; s.speed = 5; s.sleepMin = 0;
  const RGB d[6] = { {255, 0, 0}, {0, 255, 0}, {0, 0, 255}, {255, 160, 70}, {200, 220, 255}, {160, 0, 255} };
  for (int i = 0; i < 6; i++) s.diy[i] = d[i];
  return s;
}

inline State sanitize(State s) {
  if (s.bri < 1) s.bri = 1;
  if (s.effect >= EFFECT_COUNT) s.effect = SOLID;
  if (s.lastEffect >= EFFECT_COUNT || s.lastEffect == SOLID) s.lastEffect = SMOOTH;
  if (s.speed < 1) s.speed = 1;
  if (s.speed > SPEED_MAX) s.speed = SPEED_MAX;
  if (s.sleepMin > 240) s.sleepMin = 0;
  return s;
}

// the state as bytes for flash; anything that does not read back cleanly gives the defaults
const uint8_t STATE_VERSION = 1;
const size_t STATE_BYTES = 29;

inline size_t encode(const State& s, uint8_t* o) {
  o[0] = STATE_VERSION; o[1] = s.on ? 1 : 0; o[2] = s.color.r; o[3] = s.color.g; o[4] = s.color.b;
  o[5] = s.bri; o[6] = s.effect; o[7] = s.lastEffect; o[8] = s.speed;
  o[9] = (uint8_t)(s.sleepMin & 0xFF); o[10] = (uint8_t)(s.sleepMin >> 8);
  for (int i = 0; i < 6; i++) { o[11 + i * 3] = s.diy[i].r; o[12 + i * 3] = s.diy[i].g; o[13 + i * 3] = s.diy[i].b; }
  return STATE_BYTES;
}

inline State decode(const uint8_t* in, size_t len) {
  if (!in || len != STATE_BYTES || in[0] != STATE_VERSION) return defaults();
  State s;
  s.on = in[1] != 0; s.color = { in[2], in[3], in[4] }; s.bri = in[5];
  s.effect = (Effect)in[6]; s.lastEffect = (Effect)in[7]; s.speed = in[8];
  s.sleepMin = (uint16_t)(in[9] | in[10] << 8);
  for (int i = 0; i < 6; i++) s.diy[i] = { in[11 + i * 3], in[12 + i * 3], in[13 + i * 3] };
  return sanitize(s);
}

// ---------------------------------------------------------------- effects

// one step of an effect (a jump, a fade from one colour to the next, one flash) in ms at the state's speed
inline uint32_t stepMs(const State& s) {
  uint32_t slow = 1000, fast = 1000;
  switch (s.effect) {
    case JUMP3: case JUMP7: slow = 2600; fast = 260; break;
    case FADE3: case FADE7: slow = 4000; fast = 580; break;
    case SMOOTH:            slow = 30000; fast = 3000; break;   // a whole turn of the colour wheel
    case FLASH:             slow = 1600; fast = 250; break;
    case STROBE:            slow = 400; fast = 85; break;
    case BREATHE:           slow = 8000; fast = 2150; break;
    default: break;
  }
  uint8_t sp = s.speed < 1 ? 1 : s.speed > SPEED_MAX ? SPEED_MAX : s.speed;
  return slow - (slow - fast) * (sp - 1) / (SPEED_MAX - 1);
}

// the colour an effect shows ms after it started, before brightness
inline RGB effectColor(const State& s, uint32_t ms) {
  static const RGB seven[7] = { {255, 0, 0}, {0, 255, 0}, {0, 0, 255}, {255, 255, 0}, {0, 255, 255}, {255, 0, 255}, {255, 255, 255} };
  const RGB off = { 0, 0, 0 };
  uint32_t st = stepMs(s);
  switch (s.effect) {
    case JUMP3: return seven[(ms / st) % 3];
    case JUMP7: return seven[(ms / st) % 7];
    case FADE3: case FADE7: {
      uint32_t n = s.effect == FADE3 ? 3 : 7, i = ms / st;
      return blend(seven[i % n], seven[(i + 1) % n], (double)(ms % st) / st);
    }
    case SMOOTH: return hue(360.0 * (ms % st) / st);
    case FLASH:  return (ms % st) < st / 2 ? s.color : off;
    case STROBE: return (ms % st) < st / 5 ? s.color : off;
    case BREATHE: {
      double level = (1.0 - cos(2.0 * M_PI * (ms % st) / st)) / 2.0;
      return scale(s.color, (uint8_t)lround(255.0 * (0.02 + 0.98 * level)));
    }
    default: return s.color;
  }
}

// ---------------------------------------------------------------- NEC remote decoder

// Fed with every edge of the IR receiver's output (it idles high and goes low while the remote's LED flashes):
// the level just after the edge and the time in microseconds. Codes are given as most tools print them:
// the first bit sent is bit 31, so the 24-key remote's red key is 0x00F720DF. The address bytes are not
// checked (many remotes use extended NEC); the command byte must match its inverse.
class NecDecoder {
 public:
  void reset() { state_ = IDLE; bits_ = 0; acc_ = 0; }
  void clear() { ready_ = false; repeat_ = false; }
  bool hasCode() const { return ready_; }
  bool isRepeat() const { return repeat_; }
  uint32_t code() const { return code_; }

  bool edge(bool level, uint32_t us) {
    uint32_t d = us - last_;
    last_ = us;
    switch (state_) {
      case IDLE: if (!level) state_ = LEAD_MARK; break;
      case LEAD_MARK:
        if (level && in(d, 7000, 11000)) state_ = LEAD_SPACE; else restart(level);
        break;
      case LEAD_SPACE:
        if (!level && in(d, 3700, 5300)) { bits_ = 0; acc_ = 0; state_ = BIT_MARK; }
        else if (!level && in(d, 1800, 2700)) state_ = REP_MARK;
        else restart(level);
        break;
      case BIT_MARK:
        if (!level || !in(d, 300, 900)) { restart(level); break; }
        if (bits_ < 32) { state_ = BIT_SPACE; break; }
        state_ = IDLE;                                     // the stop mark ends the frame
        if (((acc_ >> 8) & 0xFF) == (~acc_ & 0xFF)) { code_ = acc_; repeat_ = false; ready_ = true; return true; }
        break;
      case BIT_SPACE:
        if (!level && in(d, 300, 900)) acc_ <<= 1;
        else if (!level && in(d, 1300, 2100)) acc_ = acc_ << 1 | 1;
        else { restart(level); break; }
        bits_++; state_ = BIT_MARK;
        break;
      case REP_MARK:
        state_ = IDLE;
        if (level && in(d, 300, 900)) { repeat_ = true; ready_ = true; return true; }
        restart(level);
        break;
    }
    return false;
  }

 private:
  enum St : uint8_t { IDLE, LEAD_MARK, LEAD_SPACE, BIT_MARK, BIT_SPACE, REP_MARK };
  static bool in(uint32_t d, uint32_t lo, uint32_t hi) { return d >= lo && d <= hi; }
  void restart(bool level) { state_ = level ? IDLE : LEAD_MARK; }    // a falling edge may start a new frame
  St state_ = IDLE;
  uint8_t bits_ = 0;
  uint32_t acc_ = 0, code_ = 0, last_ = 0;
  bool ready_ = false, repeat_ = false;
};

// ---------------------------------------------------------------- the remotes' keys

enum Key : uint8_t { K_NONE, K_ON, K_OFF, K_TOGGLE, K_BRI_UP, K_BRI_DOWN, K_COLOR, K_EFFECT, K_PLAY, K_SPEED_UP, K_SPEED_DOWN,
                     K_R_UP, K_R_DOWN, K_G_UP, K_G_DOWN, K_B_UP, K_B_DOWN, K_DIY };

struct Action { Key key; RGB color; Effect effect; uint8_t index; bool repeats; };

struct KeyCode { uint32_t code; Action action; };

// the common 24-key and 44-key RGB strip remotes (NEC). Another remote: watch the serial monitor while
// pressing its keys (the sketch prints every code) and add lines here.
inline Action lookupKey(uint32_t code) {
  static const KeyCode keys[] = {
    // 24 keys: brightness up, down, off, on / R G B W / three rows of colours with flash, strobe, fade, smooth
    { 0x00F700FF, { K_BRI_UP, {0, 0, 0}, SOLID, 0, true } },   { 0x00F7807F, { K_BRI_DOWN, {0, 0, 0}, SOLID, 0, true } },
    { 0x00F740BF, { K_OFF, {0, 0, 0}, SOLID, 0, false } },     { 0x00F7C03F, { K_ON, {0, 0, 0}, SOLID, 0, false } },
    { 0x00F720DF, { K_COLOR, {255, 0, 0}, SOLID, 0, false } }, { 0x00F7A05F, { K_COLOR, {0, 255, 0}, SOLID, 0, false } },
    { 0x00F7609F, { K_COLOR, {0, 0, 255}, SOLID, 0, false } }, { 0x00F7E01F, { K_COLOR, {255, 255, 255}, SOLID, 0, false } },
    { 0x00F710EF, { K_COLOR, {255, 40, 0}, SOLID, 0, false } },  { 0x00F7906F, { K_COLOR, {0, 255, 90}, SOLID, 0, false } },
    { 0x00F750AF, { K_COLOR, {50, 0, 255}, SOLID, 0, false } },  { 0x00F7D02F, { K_EFFECT, {0, 0, 0}, FLASH, 0, false } },
    { 0x00F730CF, { K_COLOR, {255, 90, 0}, SOLID, 0, false } },  { 0x00F7B04F, { K_COLOR, {0, 255, 180}, SOLID, 0, false } },
    { 0x00F7708F, { K_COLOR, {110, 0, 255}, SOLID, 0, false } }, { 0x00F7F00F, { K_EFFECT, {0, 0, 0}, STROBE, 0, false } },
    { 0x00F708F7, { K_COLOR, {255, 150, 0}, SOLID, 0, false } }, { 0x00F78877, { K_COLOR, {0, 200, 255}, SOLID, 0, false } },
    { 0x00F748B7, { K_COLOR, {180, 0, 255}, SOLID, 0, false } }, { 0x00F7C837, { K_EFFECT, {0, 0, 0}, FADE7, 0, false } },
    { 0x00F728D7, { K_COLOR, {255, 220, 0}, SOLID, 0, false } }, { 0x00F7A857, { K_COLOR, {0, 140, 255}, SOLID, 0, false } },
    { 0x00F76897, { K_COLOR, {255, 0, 160}, SOLID, 0, false } }, { 0x00F7E817, { K_EFFECT, {0, 0, 0}, SMOOTH, 0, false } },
    // 44 keys: brightness up, down, play/pause, power / R G B W / four rows of colours
    { 0x00FF3AC5, { K_BRI_UP, {0, 0, 0}, SOLID, 0, true } },   { 0x00FFBA45, { K_BRI_DOWN, {0, 0, 0}, SOLID, 0, true } },
    { 0x00FF827D, { K_PLAY, {0, 0, 0}, SOLID, 0, false } },    { 0x00FF02FD, { K_TOGGLE, {0, 0, 0}, SOLID, 0, false } },
    { 0x00FF1AE5, { K_COLOR, {255, 0, 0}, SOLID, 0, false } }, { 0x00FF9A65, { K_COLOR, {0, 255, 0}, SOLID, 0, false } },
    { 0x00FFA25D, { K_COLOR, {0, 0, 255}, SOLID, 0, false } }, { 0x00FF22DD, { K_COLOR, {255, 255, 255}, SOLID, 0, false } },
    { 0x00FF2AD5, { K_COLOR, {255, 40, 0}, SOLID, 0, false } },  { 0x00FFAA55, { K_COLOR, {0, 255, 90}, SOLID, 0, false } },
    { 0x00FF926D, { K_COLOR, {50, 0, 255}, SOLID, 0, false } },  { 0x00FF12ED, { K_COLOR, {255, 170, 150}, SOLID, 0, false } },
    { 0x00FF0AF5, { K_COLOR, {255, 90, 0}, SOLID, 0, false } },  { 0x00FF8A75, { K_COLOR, {0, 255, 180}, SOLID, 0, false } },
    { 0x00FFB24D, { K_COLOR, {110, 0, 255}, SOLID, 0, false } }, { 0x00FF32CD, { K_COLOR, {255, 120, 180}, SOLID, 0, false } },
    { 0x00FF38C7, { K_COLOR, {255, 150, 0}, SOLID, 0, false } }, { 0x00FFB847, { K_COLOR, {0, 200, 255}, SOLID, 0, false } },
    { 0x00FF7887, { K_COLOR, {180, 0, 255}, SOLID, 0, false } }, { 0x00FFF807, { K_COLOR, {170, 200, 255}, SOLID, 0, false } },
    { 0x00FF18E7, { K_COLOR, {255, 220, 0}, SOLID, 0, false } }, { 0x00FF9867, { K_COLOR, {0, 140, 255}, SOLID, 0, false } },
    { 0x00FF58A7, { K_COLOR, {255, 0, 160}, SOLID, 0, false } }, { 0x00FFD827, { K_COLOR, {140, 180, 255}, SOLID, 0, false } },
    // red, green, blue up and down; quick and slow
    { 0x00FF28D7, { K_R_UP, {0, 0, 0}, SOLID, 0, true } },   { 0x00FFA857, { K_G_UP, {0, 0, 0}, SOLID, 0, true } },
    { 0x00FF6897, { K_B_UP, {0, 0, 0}, SOLID, 0, true } },   { 0x00FFE817, { K_SPEED_UP, {0, 0, 0}, SOLID, 0, false } },
    { 0x00FF08F7, { K_R_DOWN, {0, 0, 0}, SOLID, 0, true } }, { 0x00FF8877, { K_G_DOWN, {0, 0, 0}, SOLID, 0, true } },
    { 0x00FF48B7, { K_B_DOWN, {0, 0, 0}, SOLID, 0, true } }, { 0x00FFC837, { K_SPEED_DOWN, {0, 0, 0}, SOLID, 0, false } },
    // DIY1-3, auto / DIY4-6, flash / jump 3, jump 7, fade 3, fade 7
    { 0x00FF30CF, { K_DIY, {0, 0, 0}, SOLID, 0, false } }, { 0x00FFB04F, { K_DIY, {0, 0, 0}, SOLID, 1, false } },
    { 0x00FF708F, { K_DIY, {0, 0, 0}, SOLID, 2, false } }, { 0x00FF00FF, { K_EFFECT, {0, 0, 0}, SMOOTH, 0, false } },
    { 0x00FF10EF, { K_DIY, {0, 0, 0}, SOLID, 3, false } }, { 0x00FF906F, { K_DIY, {0, 0, 0}, SOLID, 4, false } },
    { 0x00FF50AF, { K_DIY, {0, 0, 0}, SOLID, 5, false } }, { 0x00FFF00F, { K_EFFECT, {0, 0, 0}, FLASH, 0, false } },
    { 0x00FF20DF, { K_EFFECT, {0, 0, 0}, JUMP3, 0, false } }, { 0x00FFA05F, { K_EFFECT, {0, 0, 0}, JUMP7, 0, false } },
    { 0x00FF609F, { K_EFFECT, {0, 0, 0}, FADE3, 0, false } }, { 0x00FFE01F, { K_EFFECT, {0, 0, 0}, FADE7, 0, false } },
  };
  for (const KeyCode& k : keys) if (k.code == code) return k.action;
  return { K_NONE, {0, 0, 0}, SOLID, 0, false };
}

inline uint8_t stepUp(uint8_t v, uint8_t by, uint8_t top) { return v > top - by ? top : v + by; }
inline uint8_t stepDown(uint8_t v, uint8_t by, uint8_t bottom) { return v < bottom + by ? bottom : v - by; }

inline void goSolid(State& s) { if (s.effect != SOLID) s.lastEffect = s.effect; s.effect = SOLID; s.on = true; }

// what a key (or the matching web or button action) does to the state
inline State apply(State s, const Action& a) {
  switch (a.key) {
    case K_ON: s.on = true; break;
    case K_OFF: s.on = false; break;
    case K_TOGGLE: s.on = !s.on; break;
    case K_BRI_UP: if (s.on) s.bri = stepUp(s.bri, BRI_STEP, 255); break;
    case K_BRI_DOWN: if (s.on) s.bri = stepDown(s.bri, BRI_STEP, BRI_MIN); break;
    case K_COLOR: goSolid(s); s.color = a.color; break;
    case K_EFFECT: s.on = true; s.effect = a.effect; if (a.effect != SOLID) s.lastEffect = a.effect; break;
    case K_PLAY:
      s.on = true;
      if (s.effect != SOLID) goSolid(s); else s.effect = s.lastEffect;
      break;
    case K_SPEED_UP: s.speed = stepUp(s.speed, 1, SPEED_MAX); break;
    case K_SPEED_DOWN: s.speed = stepDown(s.speed, 1, 1); break;
    case K_R_UP: goSolid(s); s.color.r = stepUp(s.color.r, CHANNEL_STEP, 255); break;
    case K_R_DOWN: goSolid(s); s.color.r = stepDown(s.color.r, CHANNEL_STEP, 0); break;
    case K_G_UP: goSolid(s); s.color.g = stepUp(s.color.g, CHANNEL_STEP, 255); break;
    case K_G_DOWN: goSolid(s); s.color.g = stepDown(s.color.g, CHANNEL_STEP, 0); break;
    case K_B_UP: goSolid(s); s.color.b = stepUp(s.color.b, CHANNEL_STEP, 255); break;
    case K_B_DOWN: goSolid(s); s.color.b = stepDown(s.color.b, CHANNEL_STEP, 0); break;
    case K_DIY: if (a.index < 6) { goSolid(s); s.color = s.diy[a.index]; } break;
    default: break;
  }
  return s;
}

// ---------------------------------------------------------------- button

// One push button to 0 V. Click, double click, hold (with ticks while held), and a long hold that started
// at power-up (BOOT_RESET: clear the saved Wi-Fi). update() is called often with the raw reading.
class Button {
 public:
  enum Event { NONE, CLICK, DOUBLE, HOLD_START, HOLD_TICK, HOLD_END, BOOT_RESET };
  static const uint32_t DEBOUNCE_MS = 30, DOUBLE_MS = 350, HOLD_MS = 600, TICK_MS = 40, RESET_MS = 5000;

  void begin(bool pressedAtBoot, uint32_t ms) {
    raw_ = stable_ = boot_ = pressedAtBoot; rawSince_ = pressMs_ = ms;
    holding_ = second_ = clickPending_ = resetSent_ = false;
  }

  Event update(bool pressed, uint32_t ms) {
    if (pressed != raw_) { raw_ = pressed; rawSince_ = ms; }
    bool edge = false;
    if (raw_ != stable_ && ms - rawSince_ >= DEBOUNCE_MS) { stable_ = raw_; edge = true; }

    if (boot_) {                                   // the press that was already there at power-up
      if (edge && !stable_) { boot_ = false; return NONE; }
      if (stable_ && !resetSent_ && ms - pressMs_ >= RESET_MS) { resetSent_ = true; return BOOT_RESET; }
      return NONE;
    }
    if (edge && stable_) {
      pressMs_ = ms; holding_ = false;
      if (clickPending_ && ms - releaseMs_ <= DOUBLE_MS) { clickPending_ = false; second_ = true; return DOUBLE; }
      clickPending_ = false;
      return NONE;
    }
    if (edge && !stable_) {
      if (holding_) { holding_ = false; return HOLD_END; }
      if (second_) { second_ = false; return NONE; }
      clickPending_ = true; releaseMs_ = ms;
      return NONE;
    }
    if (stable_ && !second_ && !holding_ && ms - pressMs_ >= HOLD_MS) { holding_ = true; lastTick_ = ms; return HOLD_START; }
    if (stable_ && holding_ && ms - lastTick_ >= TICK_MS) { lastTick_ += TICK_MS; return HOLD_TICK; }
    if (clickPending_ && !stable_ && ms - releaseMs_ > DOUBLE_MS) { clickPending_ = false; return CLICK; }
    return NONE;
  }

 private:
  bool raw_ = false, stable_ = false, boot_ = false, holding_ = false, second_ = false, clickPending_ = false, resetSent_ = false;
  uint32_t rawSince_ = 0, pressMs_ = 0, releaseMs_ = 0, lastTick_ = 0;
};

}  // namespace lamp
