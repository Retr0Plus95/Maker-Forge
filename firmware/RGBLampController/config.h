// RGB Lamp Controller: the settings you might want to change. Everything else is in the sketch.
#pragma once

#define FW_VERSION "1.0.0"

// ---- pins (WeMos D1 R32: the label printed next to the header, then the ESP32 GPIO) ----
// Only pins with no job at boot are used, so nothing on the board stops the ESP32 starting.
#define PIN_RED     25   // D3  -> R1 100R -> Q1 gate
#define PIN_GREEN   27   // D6  -> R2 100R -> Q2 gate
#define PIN_BLUE    23   // D11 -> R3 100R -> Q3 gate
#define PIN_IR      26   // D2  <- IR receiver OUT (R8 10k pull-up to 3.3 V)
#define PIN_BUTTON  19   // D12 <- push button to GND (internal pull-up)
#define PIN_STATUS  18   // D13 -> R9 220R -> status LED

// ---- strip PWM ----
#define PWM_FREQ    5000 // Hz: well above flicker, slow enough for the MOSFETs to switch cleanly
#define PWM_BITS    12   // 0..4095
#define FADE_MS     300  // how long a change of colour or brightness takes

// ---- Wi-Fi ----
#define HOSTNAME    "rgb-lamp"        // http://rgb-lamp.local/
#define SETUP_SSID  "RGB-Lamp-setup"  // the lamp's own network when it has no Wi-Fi saved
#define SETUP_PASS  "lamp-setup"      // at least 8 characters
#define OTA_PASS    "change-me"       // password for updates over Wi-Fi (Arduino IDE: Tools > Port > rgb-lamp)
#define FALLBACK_AFTER_MS 120000UL    // can't join the saved Wi-Fi for 2 min: open the set-up network as well

// ---- behaviour ----
#define SAVE_DELAY_MS     3000UL      // save the colour this long after the last change (spares the flash)
#define DIY_STORE_MS      2000UL      // hold a DIY key this long to store the current colour in it
#define SLEEP_FADE_MS     30000UL     // the sleep timer fades the lamp out over the last 30 s
#define HOLD_BRI_STEP     3           // button held: brightness change per 40 ms tick
#define PRINT_IR_CODES    1           // print every remote code on the serial monitor (115200 baud)
