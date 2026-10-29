/*
  RGB Lamp Controller  (firmware v1.0.0)
  ESP32 on a WeMos D1 R32 driving a 12 V RGB LED strip (common +12V, R, G, B) through three logic-level
  MOSFETs, for the "Desk Stranding" lamp. Controlled by the common 24- or 44-key strip remote (IR, NEC),
  one push button, and a web page on your phone.

  Board: "WEMOS D1 R32" (arduino-esp32 3.x). No other libraries needed.
  Build guide, schematic and perfboard layout: docs/Build_Guide.md

  The pure logic (colours, effects, remote decoder, keys, button) is in lamp_core.h and is tested on a
  computer: make -C test
*/
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <Preferences.h>
#include "soc/soc.h"
#include "soc/gpio_reg.h"
#include "config.h"
#include "lamp_core.h"
#include "web_page.h"

using namespace lamp;

static Preferences prefs;
static WebServer server(80);
static DNSServer dns;

static State st;                         // what the lamp should show
static bool dirty = false;               // st changed since it was last saved
static uint32_t dirtyMs = 0;
static uint32_t effectStart = 0;         // millis() when the current effect started
static uint32_t sleepEnd = 0;            // millis() when the sleep timer ends, 0 = no timer
static float duty[3] = { 0, 0, 0 };      // what the strip shows now (0..4095), eased towards the target

static bool apMode = false;              // the set-up network is open
static bool staWanted = false;           // a home network is saved
static bool staUp = false;               // joined it, mDNS and updates running
static uint32_t staStart = 0;
static String ssid, pass;

static NecDecoder nec;
static Button button;
static bool holdUp = false;              // button hold: the direction of this hold
static uint32_t lastCode = 0, lastCodeMs = 0, diyHeldSince = 0;
static RGB beforeDiy = { 0, 0, 0 };
static bool diyStored = false;
static uint32_t ledFlashUntil = 0, ledBlinks = 0, ledBlinkAt = 0;

// ---------------------------------------------------------------- IR receiver: edges in an interrupt

static volatile uint32_t irUs[128];
static volatile uint8_t irLvl[128];
static volatile uint8_t irHead = 0;
static volatile uint8_t irTail = 0;

void IRAM_ATTR irEdge() {
  uint8_t n = (irHead + 1) & 127;
  if (n == irTail) return;                                         // full: drop (the frame fails its check)
  irUs[irHead] = micros();
  irLvl[irHead] = (REG_READ(GPIO_IN_REG) >> PIN_IR) & 1;
  irHead = n;
}

// ---------------------------------------------------------------- state changes

static void change(const State& next) {
  State s = sanitize(next);
  if (s.effect != st.effect) effectStart = millis();
  if (!s.on) sleepEnd = 0;
  st = s;
  dirty = true;
  dirtyMs = millis();
}

static void flashLed(uint32_t ms) { ledFlashUntil = millis() + ms; }
static void blinkLed(uint32_t n) { ledBlinks = n * 2; ledBlinkAt = millis(); }

static void handleIr(uint32_t now) {
  if (nec.isRepeat()) {                         // a key is held: NEC sends a repeat every ~108 ms
    if (!lastCode || now - lastCodeMs > 250) return;
    lastCodeMs = now;
    Action a = lookupKey(lastCode);
    if (a.repeats) change(apply(st, a));
    else if (a.key == K_DIY && !diyStored && now - diyHeldSince >= DIY_STORE_MS) {
      st.diy[a.index] = beforeDiy;              // held 2 s: keep the colour from before the press in this key
      State s = st; s.color = beforeDiy;
      change(s);
      diyStored = true;
      blinkLed(3);
      Serial.printf("Stored #%02X%02X%02X in DIY%u\n", beforeDiy.r, beforeDiy.g, beforeDiy.b, a.index + 1);
    }
    return;
  }
  uint32_t code = nec.code();
  lastCode = code; lastCodeMs = now;
#if PRINT_IR_CODES
  Serial.printf("IR code 0x%08lX\n", (unsigned long)code);
#endif
  Action a = lookupKey(code);
  if (a.key == K_NONE) return;
  if (a.key == K_DIY) { beforeDiy = st.color; diyHeldSince = now; diyStored = false; }
  change(apply(st, a));
  flashLed(60);
}

static void handleButton(uint32_t now) {
  bool pressed = digitalRead(PIN_BUTTON) == LOW;
  Action a = { K_NONE, {0, 0, 0}, SOLID, 0, false };
  switch (button.update(pressed, now)) {
    case Button::CLICK: a.key = K_TOGGLE; change(apply(st, a)); break;
    case Button::DOUBLE:
      a.key = K_EFFECT; a.effect = (Effect)((st.effect + 1) % EFFECT_COUNT);
      change(apply(st, a));
      break;
    case Button::HOLD_START:
      if (!st.on) { State s = st; s.on = true; change(s); }
      holdUp = st.bri <= BRI_MIN ? true : st.bri >= 255 ? false : !holdUp;
      break;
    case Button::HOLD_TICK: {
      State s = st;
      s.bri = holdUp ? stepUp(s.bri, HOLD_BRI_STEP, 255) : stepDown(s.bri, HOLD_BRI_STEP, BRI_MIN);
      if (s.bri != st.bri) change(s);
      break;
    }
    case Button::BOOT_RESET:
      Serial.println("Button held at power-up: forgetting the Wi-Fi and restarting");
      prefs.remove("ssid"); prefs.remove("pass");
      for (int i = 0; i < 10; i++) { digitalWrite(PIN_STATUS, i & 1); delay(100); }
      ESP.restart();
      break;
    default: break;
  }
}

// ---------------------------------------------------------------- the strip

static void writeStrip(uint32_t now, uint32_t dtMs) {
  RGB c = st.on ? effectColor(st, now - effectStart) : RGB{ 0, 0, 0 };
  uint32_t bri = st.on ? st.bri : 0;
  if (sleepEnd) {                                          // the last 30 s of the sleep timer fade out
    int32_t left = (int32_t)(sleepEnd - now);
    if (left <= 0) { State s = st; s.on = false; s.sleepMin = 0; change(s); sleepEnd = 0; bri = 0; }
    else if ((uint32_t)left < SLEEP_FADE_MS) bri = bri * (uint32_t)left / SLEEP_FADE_MS;
  }
  const uint16_t target[3] = { duty12(c.r, bri), duty12(c.g, bri), duty12(c.b, bri) };
  // jumps, flashes and strobes switch at once; everything else eases over FADE_MS
  bool snap = st.on && (st.effect == JUMP3 || st.effect == JUMP7 || st.effect == FLASH || st.effect == STROBE);
  float stepMax = 4095.0f * dtMs / FADE_MS;
  const uint8_t pins[3] = { PIN_RED, PIN_GREEN, PIN_BLUE };
  for (int i = 0; i < 3; i++) {
    float d = target[i] - duty[i];
    duty[i] = snap || fabsf(d) <= stepMax ? target[i] : duty[i] + (d > 0 ? stepMax : -stepMax);
    ledcWrite(pins[i], (uint32_t)(duty[i] + 0.5f));
  }
}

static void saveIfDue(uint32_t now) {
  if (!dirty || now - dirtyMs < SAVE_DELAY_MS) return;
  uint8_t buf[STATE_BYTES];
  encode(st, buf);
  prefs.putBytes("state", buf, sizeof buf);
  dirty = false;
}

static void statusLed(uint32_t now) {
  bool on;
  if (ledBlinks) {
    on = ledBlinks & 1;
    if (now - ledBlinkAt >= 120) { ledBlinks--; ledBlinkAt = now; }
  } else if ((int32_t)(ledFlashUntil - now) > 0) on = true;
  else if (apMode && !staUp) on = (now / 500) & 1;                   // set-up network open: slow blink
  else if (staWanted && !staUp) on = (now / 125) & 1;                // joining the Wi-Fi: fast blink
  else on = false;                                                   // all well: dark
  digitalWrite(PIN_STATUS, on);
}

// ---------------------------------------------------------------- web page and API

static String jsonEscape(const String& s) {
  String o; o.reserve(s.length() + 8);
  for (size_t i = 0; i < s.length(); i++) {
    char ch = s[i];
    if (ch == '"' || ch == '\\') { o += '\\'; o += ch; }
    else if ((uint8_t)ch < 0x20) { char b[8]; snprintf(b, sizeof b, "\\u%04x", ch); o += b; }
    else o += ch;
  }
  return o;
}

static String stateJson() {
  char hex[8];
  snprintf(hex, sizeof hex, "#%02x%02x%02x", st.color.r, st.color.g, st.color.b);
  int32_t ms = sleepEnd ? (int32_t)(sleepEnd - millis()) : 0;
  uint32_t left = ms > 0 ? (uint32_t)ms / 1000 : 0;
  String j; j.reserve(420);
  j += "{\"on\":"; j += st.on ? "true" : "false";
  j += ",\"hex\":\""; j += hex;
  j += "\",\"bri\":"; j += st.bri;
  j += ",\"effect\":"; j += (int)st.effect;
  j += ",\"effects\":[";
  for (int i = 0; i < EFFECT_COUNT; i++) { if (i) j += ','; j += '"'; j += effectName((Effect)i); j += '"'; }
  j += "],\"speed\":"; j += st.speed;
  j += ",\"sleep\":"; j += sleepEnd ? st.sleepMin : 0;
  j += ",\"sleepLeft\":"; j += left;
  j += ",\"setup\":"; j += staUp ? "false" : "true";
  j += ",\"ssid\":\""; j += jsonEscape(staUp ? WiFi.SSID() : String(SETUP_SSID));
  j += "\",\"ip\":\""; j += staUp ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  j += "\",\"rssi\":"; j += staUp ? WiFi.RSSI() : 0;
  j += ",\"version\":\"" FW_VERSION "\"}";
  return j;
}

// a whole number from a form field, only if it is one and within lo..hi
static bool argInt(const char* name, long lo, long hi, long& out) {
  if (!server.hasArg(name)) return false;
  String v = server.arg(name);
  char* end = nullptr;
  long n = strtol(v.c_str(), &end, 10);
  if (v.length() == 0 || *end || n < lo || n > hi) return false;
  out = n;
  return true;
}

static void handleSet() {
  State s = st;
  long n;
  if (argInt("on", 0, 1, n)) s.on = n;
  if (server.hasArg("hex")) {
    String h = server.arg("hex");
    if (h.length() == 7 && h[0] == '#') {
      char* end = nullptr;
      unsigned long v = strtoul(h.c_str() + 1, &end, 16);
      if (!*end) {
        // flash, strobe and breathe use the colour; the colour-changing effects give way to it
        if (s.effect != FLASH && s.effect != STROBE && s.effect != BREATHE) goSolid(s);
        s.color = { (uint8_t)(v >> 16), (uint8_t)(v >> 8), (uint8_t)v };
        s.on = true;
      }
    }
  }
  if (argInt("bri", 1, 255, n)) { s.bri = n; s.on = true; }
  if (argInt("effect", 0, EFFECT_COUNT - 1, n)) { s.effect = (Effect)n; if (n != SOLID) s.lastEffect = (Effect)n; s.on = true; }
  if (argInt("speed", 1, SPEED_MAX, n)) s.speed = n;
  if (argInt("sleep", 0, 240, n)) {
    s.sleepMin = n;
    sleepEnd = n ? millis() + (uint32_t)n * 60000UL : 0;
    if (n) s.on = true;
  }
  change(s);
  server.send(200, "application/json", stateJson());
}

static void handleWifiSave() {
  String id = server.arg("ssid"), pw = server.arg("pass");
  if (id.length() < 1 || id.length() > 32 || (pw.length() > 0 && pw.length() < 8) || pw.length() > 63) {
    server.send(400, "text/plain", "The network name must be 1 to 32 characters and the password empty or 8 to 63 characters. Go back and try again.");
    return;
  }
  prefs.putString("ssid", id);
  prefs.putString("pass", pw);
  String msg = "<!doctype html><meta name=viewport content='width=device-width'><body style='font:16px system-ui;background:#0f1218;color:#e8ecf3;padding:20px'>"
               "<h1 style='font-size:20px'>Saved</h1><p>The lamp restarts and joins your Wi-Fi. Reconnect your phone to your own network, then open "
               "<b>http://" HOSTNAME ".local/</b>. If that address doesn't open, look for the lamp in your router's list of devices.</p>";
  server.send(200, "text/html", msg);
  delay(800);
  ESP.restart();
}

static void handleScan() {
  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_FAILED) { WiFi.scanNetworks(true); n = WIFI_SCAN_RUNNING; }
  if (n == WIFI_SCAN_RUNNING) { server.send(200, "application/json", "{\"busy\":true}"); return; }
  String j = "{\"busy\":false,\"nets\":[";
  for (int i = 0; i < n; i++) {
    if (WiFi.SSID(i).length() == 0) continue;
    if (j[j.length() - 1] != '[') j += ',';
    j += '"'; j += jsonEscape(WiFi.SSID(i)); j += '"';
  }
  j += "]}";
  WiFi.scanDelete();
  server.send(200, "application/json", j);
}

static void handleRoot() {
  if (!staUp) { server.send(200, "text/html", WIFI_PAGE); return; }   // on the set-up network, set-up comes first
  server.send(200, "text/html", LAMP_PAGE);
}

static void handleNotFound() {
  if (apMode) {                                   // phones check for a login page: send them to set-up
    server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/", true);
    server.send(302, "text/plain", "");
    return;
  }
  server.send(404, "text/plain", "Not found");
}

// ---------------------------------------------------------------- Wi-Fi

static void openSetupNetwork() {
  if (apMode) return;
  WiFi.mode(staWanted ? WIFI_AP_STA : WIFI_AP);
  WiFi.softAP(SETUP_SSID, SETUP_PASS);
  dns.start(53, "*", WiFi.softAPIP());
  apMode = true;
  Serial.printf("Set-up network \"%s\" open, password \"%s\", page http://%s/\n", SETUP_SSID, SETUP_PASS, WiFi.softAPIP().toString().c_str());
}

static void closeSetupNetwork() {
  if (!apMode) return;
  dns.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  apMode = false;
}

static void wifiLoop(uint32_t now) {
  if (apMode) dns.processNextRequest();
  if (!staWanted) return;
  bool connected = WiFi.status() == WL_CONNECTED;
  if (connected && !staUp) {
    staUp = true;
    Serial.printf("Joined \"%s\": http://%s.local/ or http://%s/\n", ssid.c_str(), HOSTNAME, WiFi.localIP().toString().c_str());
    closeSetupNetwork();
    static bool servicesUp = false;                 // once: they carry on across a lost and found Wi-Fi
    if (!servicesUp) {
      MDNS.begin(HOSTNAME);
      MDNS.addService("http", "tcp", 80);
      ArduinoOTA.begin();
      servicesUp = true;
    }
  } else if (!connected && staUp) {
    staUp = false;                                  // it keeps trying by itself (auto reconnect)
    staStart = now;
    Serial.println("Wi-Fi lost, trying again");
  }
  if (!staUp && !apMode && now - staStart > FALLBACK_AFTER_MS) openSetupNetwork();
  if (staUp) ArduinoOTA.handle();
}

// ---------------------------------------------------------------- set-up and loop

void setup() {
  const uint8_t pins[3] = { PIN_RED, PIN_GREEN, PIN_BLUE };
  for (uint8_t p : pins) { ledcAttach(p, PWM_FREQ, PWM_BITS); ledcWrite(p, 0); }   // dark first
  pinMode(PIN_STATUS, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_IR, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.println("\nRGB Lamp Controller " FW_VERSION);

  prefs.begin("lamp", false);
  uint8_t buf[STATE_BYTES];
  size_t len = prefs.getBytesLength("state");
  st = len == STATE_BYTES && prefs.getBytes("state", buf, sizeof buf) == STATE_BYTES ? decode(buf, len) : defaults();
  st.sleepMin = 0;                                   // a sleep timer does not survive a power cut
  effectStart = millis();
  delay(20);
  button.begin(digitalRead(PIN_BUTTON) == LOW, millis());
  attachInterrupt(digitalPinToInterrupt(PIN_IR), irEdge, CHANGE);

  ssid = prefs.getString("ssid", "");
  pass = prefs.getString("pass", "");
  WiFi.persistent(false);
  WiFi.setHostname(HOSTNAME);
  staWanted = ssid.length() > 0;
  if (staWanted) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(ssid.c_str(), pass.c_str());
    staStart = millis();
    Serial.printf("Joining \"%s\"...\n", ssid.c_str());
  } else {
    openSetupNetwork();
  }

  ArduinoOTA.setHostname(HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASS);
  ArduinoOTA.onStart([]() { for (uint8_t p : { PIN_RED, PIN_GREEN, PIN_BLUE }) ledcWrite(p, 0); });

  server.on("/", HTTP_GET, handleRoot);
  server.on("/lamp", HTTP_GET, []() { server.send(200, "text/html", LAMP_PAGE); });
  server.on("/wifi", HTTP_GET, []() { server.send(200, "text/html", WIFI_PAGE); });
  server.on("/wifi", HTTP_POST, handleWifiSave);
  server.on("/scan", HTTP_GET, handleScan);
  server.on("/api/state", HTTP_GET, []() { server.send(200, "application/json", stateJson()); });
  server.on("/api/set", HTTP_POST, handleSet);
  server.onNotFound(handleNotFound);
  server.begin();

  enableLoopWDT();                                   // a hung loop restarts the board after 5 s
}

void loop() {
  static uint32_t lastFrame = 0;
  uint32_t now = millis();

  while (irTail != irHead) {
    nec.edge(irLvl[irTail], irUs[irTail]);
    irTail = (irTail + 1) & 127;
    if (nec.hasCode()) { handleIr(now); nec.clear(); }
  }
  handleButton(now);
  if (now - lastFrame >= 10) { writeStrip(now, now - lastFrame); lastFrame = now; }
  statusLed(now);
  server.handleClient();
  wifiLoop(now);
  saveIfDue(now);
}
