# Maker Forge roadmap: from 0.57 to 2.5

Written in Session 66 (November 2026) at the owner's request: every good idea still open, sorted into releases, with
**2.0 as the fully parametric app** and **2.5 as the finished product**. It is a plan, not a promise: each release gets
its own pull request, its "Session N" notes in `HANDOFF.md`, and can be reordered. What is already built is in
`CHANGELOG.md`.

## What stays true in every release

- **Free and open source (MIT), no account needed to make and download anything.** Nothing a maker can do today moves
  behind a login or a price.
- **Your work stays on your device** unless you choose to share it. No tracking, no analytics.
- **Works offline as one file.** Online parts (the library, the marketplace, AI help) are extras the app works without.
- **Everything prints.** Closed meshes, on the bed, no support where it can be avoided, and the checks say so honestly.
- **Plain words.** Written for makers, not engineers. Every release updates the manual and lists its fixes under **Fixed**.

## The four stages

| Stage | Releases | What it is for |
| --- | --- | --- |
| Finish the workshop | 0.58 to 0.95 | Every object as good as the project box; the engine rebuilt underneath |
| **1.0** | 1.0 | Stable: file format frozen, every object tested on real prints, translated |
| Parametric | 1.1 to 2.0 | Sketches, constraints, a history you can edit, your own generators |
| Community | 2.1 to 2.5 | The library, the marketplace, makers' tools, the finished product |

---

## Stage 1: finish the workshop (0.58 to 0.95)

### 0.58 Shaped boxes, complete
What 0.57 left on rectangles only, built in the shapes' own frames:
- Levels, dividers and cable channels in round, hexagonal and octagonal boxes (plates cut to the shape).
- Mounting ears, strap loops, wall textures and bands round a curved wall; rain hoods and clear windows.
- Inlaid and raised art, and the inlaid lid logo, on every shape; boards under a sloped lid.
- Magnet and hinged lids on the polygon shapes; a bayonet (quarter-turn) lid for round boxes.
- Drilling templates for every shape (a round wall unrolled); the behind-the-wall check round a curve.
- New shapes: a wedge (sloped front *and* back), a pill (stadium), a triangle, a rounded "soap bar", your own outline
  drawn or traced from a picture.
- Splitting a shaped box into parts for a small bed.

### 0.59 Engine I: one solid, everywhere
The first five engine steps below (E1 to E5): every object's parts as true single solids, cached builds, builds off the
page's thread. Nothing new to see except that it is faster and the files are cleaner.

### 0.60 Shared features (the rest of the Session 64 list)
- **Embed anything with a pause:** a magnet, nut, NFC tag, coin or weight in any object; the export says the layer to pause at.
- **Threads on anything:** twist lids for jars and tea lights, lamp fittings, tripod and GoPro mounts, bottle threads.
- **Split anything too big for the bed**, with pins, dovetails or screws, and an assembly guide.
- **Assembly steps, What you'll need and names in 3D** for every multi-part object, not only boxes.
- **The box's style** (chamfers, rounds, textures, bands) on signs, plaques, phone cases and name plates.
- **Fits everywhere:** the calibration card's numbers used by every object that has a fit.

### 0.61 Files for slicers
- 3MF with settings inside: filament per part, layer pauses, colour changes, "no support here" hints
  (Bambu Studio / OrcaSlicer and PrusaSlicer, each checked in the real slicer).
- STEP export for the parametric objects (so they open in Fusion, FreeCAD, Onshape).
- Send to printer where the printer allows it from a browser (Bambu LAN, OctoPrint, Moonraker), off by default.
- A printable PDF: the assembly guide, the parts list, the drilling templates, the wiring plan.

### 0.62 to 0.69 One object family per release, brought to the box's level
Each gets: a plan view, a catalogue with pictures, recipes, a fit test, Fix what it can, and real-print notes.
- **0.62 Signs and name plates:** layouts, multi-line, borders, backlit and edge-lit signs, house numbers, braille.
- **0.63 Lithophanes and lamps:** lamp bases with the electronics box built in, colour lithophanes (CMYW), night lights.
- **0.64 Mechanisms:** gear trains worked out from a ratio, hinges, latches, print-in-place joints, a parts kit maker.
- **0.65 Organisers:** Gridfinity-style bins and baseplates, drawer dividers, tool holders traced from a photo of the tool.
- **0.66 Phone, tablet and controller cases and stands**, with a far larger device list and a "measure mine" wizard.
- **0.67 Jigsaws, games and toys:** tile games, dice, tokens, board-game inserts worked out from the box's size.
- **0.68 Home and garden:** hooks, brackets worked out from the load, planters with drainage, cable clips, wall plates.
- **0.69 Wearables and gifts:** badges, medals, keychains in sets, ornaments, cookie cutters and stamps as kits.

### 0.70 Electronics, complete
- A real parts database (several hundred boards and modules), updated without a new release.
- Boards from a photo with AI finding the corners, holes and ports; from a datasheet drawing.
- Wiring that checks itself (voltages, pin conflicts), a schematic export, a firmware starter for more platforms.
- Battery, heat and antenna advice together: "this box will run 3 weeks and stay under 45°C".
- DIN, 19-inch rack, VESA and Eurorack panels as starting points.

### 0.75 Painter and colour, complete
- Paint on shaped boxes and every generator; colour by height, by part, by picture, by AI ("make it look like oak").
- Filament library with real swatches and translucency; a preview of how thin colours show through.
- Fewer swaps: the app reorders colours and suggests where a colour change by layer does the job of an AMS.

### 0.80 Engine II: fast and exact
Engine steps E6 to E10 below. The app opens in under a second and every drag is live.

### 0.85 Help that knows what you are making
- **Describe anything:** the "Describe your project" box for every object, and a conversation that changes it
  ("make it 10 mm taller and add a switch on the left"). Your own key or a local model; never required.
- A guided first print for each kind of printer; printer profiles from the community.
- Fix-it: photograph the broken part, trace it, get a replacement.

### 0.90 Everyone can use it
- Translations (Swedish first, then German, French, Spanish, Japanese), right-to-left ready.
- Full keyboard and screen-reader use of every page; the 3D view described in words.
- A phone layout that is a real app (installable, offline), with the camera for tracing and measuring.
- Inches throughout, and imperial screws and nuts.

### 0.95 Proving it
- A print-tested gallery: every object and recipe printed, photographed, with the settings used.
- A public test page: any commit's test results and fingerprints. Performance budgets enforced in CI.
- Security review of project files, share links and every file the page downloads.

## 1.0 Stable
- The project file format is frozen and documented; every later version opens every 1.x file.
- No known bugs in the checks; every object's "what was tested on a real print" filled in.
- The manual as a searchable site and a printable book. A short video for each object.
- A plain `CONTRIBUTING.md`, good first issues, and the engine documented for developers.

---

## Stage 3: parametric (1.1 to 2.0)

The generators today are fixed recipes with sliders. 2.0 makes the app **fully parametric**: everything is a named
number, a sketch or a step you can go back and change, and the recipes are written in the same system anyone can use.

- **1.1 Named numbers.** Every setting can be a formula of others (`lid height = box height / 3`), with units.
  A table of your project's numbers; change one and everything follows.
- **1.2 Sketches.** Draw outlines with lines, arcs and splines, with dimensions and constraints (parallel, equal,
  tangent, symmetric). Any outline in the app (a box's shape, a sign, a pocket) can be a sketch.
- **1.3 Features.** Extrude, revolve, sweep, loft, shell, fillet, chamfer, pattern, mirror, boolean: as steps on
  true solids (Manifold, with exact rounds from signed distances where meshes are not enough).
- **1.4 History.** A timeline of steps; go back, change one, and the rest rebuilds. Steps can be switched off, reordered,
  grouped. Undo is the timeline.
- **1.5 Parts and assemblies.** Several parts in one project that fit each other by the calibrated fits, with joints
  (hinge, slide, thread, snap) that are checked for clashes and shown moving.
- **1.6 Generators as open recipes.** Every built-in object rewritten as a parametric recipe in a small, safe,
  documented language (and editable as blocks): read how the project box is made, change it, save your own.
- **1.7 Print-aware modelling.** Overhangs, bridges, thin walls and fits checked as you model, with one-click fixes
  (a teardrop, a chamfer, a split). Tolerances come from your printer's calibration.
- **1.8 Import as parametric.** STEP and mesh files in; find the planes, holes and cylinders; push, pull and re-dimension
  them. Scan to model from photos.
- **1.9 Release candidate:** every old project opens and converts; performance and the manual brought up to 2.0.
- **2.0 The fully parametric app.** Complete, free, open source. A box, a gear, a sign and your own design are all made
  of the same named numbers, sketches and steps.

---

## Stage 4: community (2.1 to 2.5)

These need a server, which the app has never had. They are **optional**: the app stays one offline file. See "Decisions
for the owner" below before any of it is built.

- **2.1 The library.** Publish a design as its recipe, not a dead mesh: others open it, change its numbers and print.
  Search, tags, collections, remixes that credit the original, licences chosen per design (CC and open hardware).
  Print-tested badges, photos of makes, the settings that worked.
- **2.2 Makers' tools.** A customiser page for your design that you can link or embed anywhere ("pick your name and
  size"), sets and variants, version history, comments, and print profiles shared per printer.
- **2.3 The marketplace.** Makers may sell designs or a licence to print and sell them; free designs stay first-class.
  Tips, bundles, commercial-use licences, and print-on-demand through local makers and print farms. The app and the
  free library never depend on it.
- **2.4 Workshops and teams.** Shared projects, review and comments on a design, classroom mode (a teacher's set of
  projects, no student accounts), a makerspace's printer queue.
- **2.5 The finished product.** Everything above polished together: one calm app that opens instantly, makes anything
  parametric, prints first time on your printer, and connects you to other makers if you want it. After 2.5: upkeep,
  new printers, new parts, and what the community asks for.

---

## The engine: ten more improvements

The solid stage of 0.57 is the start. In order:

- **E1 One solid for every part.** The rectangular box, and then every generator, joined by Manifold: no overlapping
  shells, exact volumes and weights, simpler print checks.
- **E2 A feature graph with caching.** Each wall, post, cradle and opening is a node keyed by its inputs; a drag
  rebuilds only what moved.
- **E3 Builds on the helper thread**, cancellable, with a rough preview first and the exact solid after.
- **E4 Shared frames.** Every generator places features through one "face frame" (flat, curved, sloped), so an
  opening, a label or a texture written once works on every shape.
- **E5 Meshes made for printing.** Curves tessellated by chord error, not fixed segments; arcs exported as arcs where
  the slicer takes them.
- **E6 Signed-distance modelling** for real fillets, smooth blends, offsets and wall-thickness checks, meshed only at the end.
- **E7 Exact fits by simulation.** Lids, threads and snaps checked by moving the parts through their travel (the
  boolean check the tests already do), in the app, with the calibrated gaps.
- **E8 One layout solver** for Arrange, plates, nesting and jigsaws: faster, and able to pack several projects on a bed.
- **E9 The slicer's eye.** A built-in layer preview (real perimeters and bridges) so the support, bridge and thin-wall
  checks match what will print; time and filament estimates within a few percent.
- **E10 WebGPU and WASM where it pays:** picking, painting, distance fields and the layer preview on the GPU, with the
  plain path kept as the fallback and as the tests' reference.

## Decisions for the owner

1. **Where the library and marketplace live.** Your website is EU-hosted, with no third parties and no visitor data.
   A library needs accounts, uploads, moderation and takedowns; a marketplace adds payments, tax and refunds. Options:
   your own EU server, a federated or git-based library with no accounts, or linking out to existing sites. This decides
   2.1 to 2.4 more than any code does.
2. **Moderation and safety.** Who reviews uploads, and the rules for weapons parts, trademarks and copied designs.
3. **Money.** Whether the marketplace takes a cut (and of what), or stays donation-funded.
4. **One file or many.** Parametric modelling will outgrow a single HTML file; the choice is a small build step with
   an offline single-file edition kept alongside, or staying strictly one file and accepting limits.
5. **The recipe language.** A small language of our own, a safe subset of JavaScript, or blocks only.
6. **AI help.** Bring-your-own-key only, a local model, or a hosted option.

## Not planned
- Accounts or payment to use the app itself. Ads. Telemetry.
- Sculpting, animation or rendering: other free tools do these well.
- A slicer of our own: the app prepares files for the slicers people already use.
