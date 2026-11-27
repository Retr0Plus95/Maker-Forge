# Maker Forge Bench 2.0 and the parts library

Written in Maker Forge's Session 82 for Maker Forge Bench's own sessions. Bench is
[Retr0Plus95/Maker-Forge-Bench](https://github.com/Retr0Plus95/Maker-Forge-Bench), read from 1.0.4. Its roadmap's 2.0, "The
home, and board to box", asks for four things:
- the board in its case as one assembly;
- clash checks;
- an exploded view;
- standard screws, standoffs and nuts from the shared Maker Forge Library.

As the roadmap says, that work happens in Bench's own repository and session. This page says what Maker Forge (Shape) now
offers it, and how each part could be used.

## What Shape has now

`PRCore.parts` (in Maker Forge's `src/core.js`, 0.63) is a library of 26 mechanical parts. Each is a function of its settings
that returns three things:

- **a closed mesh**, in millimetres, Y up, lying as it prints;
- **named connectors**, each `{ at, dir, up, kind }`: a point, the direction a mating part comes in from, and a second axis that
  fixes the turn. `snap(A, a, B, b)` gives the move that puts B's connector b on A's connector a;
- **metadata**, `{ bom, orient, support, notes, travel? }`: BOM lines (`[count, "what"]`), its print orientation, and whether
  it needs support.

The library is plain JavaScript with no page, so Bench can load the same `core.js`, or a copy of its parts section, and get the
same parts.

## How each part fits Bench 2.0

| Bench 2.0 wants | From the library |
|---|---|
| Standard screws, standoffs and nuts | `standoff` (M2, M2.5, M3; round or hex; insert, pilot or clearance hole), `fastenerBlock` (every hole kind at its real size), and the table `parts.fasteners` (clearance, pilot, insert, nut and head sizes). Their BOM lines feed the shopping list. |
| The board in its case | `boardMount` (ESP32 DevKit, ESP32-CAM, Nano, Pro Mini): its `board` connector is where the board sits, and its `portLeft`/`portRight` connectors mark where a plug goes in. Bench's own board outline and holes (its "Send to Shape" data) can be placed on that connector with `snap`. |
| Clash checks | Each part's mesh and its connectors give the shapes to check. A plug's path is known (Shape 0.62.7 checks it is clear in its boxes); Bench can check "C1 hits the lid" against the case's mesh the same way. |
| Exploded view | Move each part out along its connector's `dir`: the connectors already say which way each part comes off. |
| The wiring off the board | `usbcPanel`, `strainRelief` and `ventPanel` have connectors where a cable leaves the case. A wire's route can start at the board's pin and end at a panel's connector. |
| LEDs, servos, motors | `ledRing`, `led5Holder`, `ledFilament`, `servoMount`, `servoHorn`: their BOM lines name the part ("NeoPixel ring, 12 LEDs (37 mm)", "SG90 micro servo"), so Bench's parts cards can link to them. |

## Suggested order in Bench

1. **Read the parts in `forge-project.json`.** Add a `mechanical` list: `{ part, settings, clearance, at }` per part. Shape
   writes it, Bench shows it (its BOM in the shopping list, its mesh in the 3D view).
2. **Standard hardware in the 3D view:** standoffs under the board's holes, from the board's hole size.
3. **Clash check:** the tallest part on the board (Bench 0.9's height check) against the case's lid in the same assembly.
4. **Exploded view** along the connectors.

## Improvements this suggests for Bench

- The shopping list could group screws by size across the board and the case (from the BOM lines).
- "Before power" could add "the board sits on its standoffs, the case closes" once the case is in the project.
- Build steps could include printing and fitting the case parts. The library says each part prints with no support, so a step
  can say so.
