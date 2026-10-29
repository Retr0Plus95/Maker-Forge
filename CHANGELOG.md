# Changelog

## 1.0.0 — 2026-10-29

First design: drawing set RLC-2026 Rev A, firmware 1.0.0, box Rev A. Not built yet.

- Firmware for the WeMos D1 R32: three PWM channels with gamma and fades, nine effects, the 24- and 44-key IR
  remotes (own NEC decoder, no libraries), push button, phone web page, Wi-Fi set-up network, saved state,
  updates over Wi-Fi.
- Perfboard design on a 7 × 9 cm board: 7805 + Schottky 5 V, three IRLZ44N, PTC fuse and reverse-polarity shunt,
  IR receiver filter; layout checked against the netlist.
- Drawing set: schematic, reference sheet (R32 pins, jumpers, remote keys), perfboard layout with wire list, box
  and wiring.
- Project box made with Maker Forge: 171 × 91 × 50 mm, screw lid, prints without supports.
- Build guide.
