# Maker Forge

A browser-based studio for designing **multi-colour 3D prints** from photos, logos and names, and exporting them ready to slice.

Everything runs locally in the browser. No account, no uploads, no server: your images and models never leave the machine. (The page does load its three code libraries from jsDelivr, a public CDN, so that one service sees that it was opened. The fonts are built in. No Google Fonts, no analytics. The optional AI figure finder on the Paint tab downloads once from jsDelivr when you ask for it, and runs on your computer too.) One HTML file, no build toolchain, MIT licensed.

---

## What it does

Four tabs in the top bar — **Make · Art · Colours · Export**. Down the left edge, a rail of small icons: one per group of settings in the current tab. Clicking an icon opens a short pop-up panel with just those sliders plus a line of instructions; clicking it again closes the panel. The model fills the middle, and a **Start from** sidebar on the right groups every object and preset. A progress bar and an activity log show what the app is doing. Each tab has the everyday controls in view and the fussy ones tucked into collapsible groups. A status bar along the bottom always shows whether the model is ready, how much filament it needs and roughly how long it takes.

| Tab | What lives there |
| --- | --- |
| **Make** | Eleven generators and shapes: flat shapes, the **name plate & keychain** generator (34 fonts previewed live, emoji and symbol charms on either or both sides, a picture beside the name, double-sided, engraved or raised), **plastic canvas / mosaic** panels, **bobble heads with printed spring necks**, **lightboxes and layered shadow boxes**, **circuit-board art from a schematic screenshot**, **cookie cutters traced from artwork**, **turned shapes** (vase, egg, cone, dome, ring), photo frames, tea light holders, plaques, cylinders, hex prisms, spheres, or your own STL. Preset buttons set up a product in one click. |
| **Art** | Photos, logos and text placed on any object, front **or back**. Colour separation, crisp outline tracing, photo relief and lithophanes, pixel/cross-stitch snapping, halo outlines, brightness/contrast/saturation, rotate, trim, background drop, split-view preview with zoom. |
| **Colours** | Up to 8 slots with colour, name, material and price. Palette presets, colour matching, and a **printer library** (Bambu, Prusa, Creality, Elegoo, Anycubic, Voron) that sets bed size, nozzle, layer height and how many colours the machine can load. |
| **Export** | Preflight checks (watertightness, bed fit, colour count vs printer, features thinner than the nozzle, thin colour layers, unused filaments), material in g/m/cost, rough print time, **colour swap heights** for single-filament printers, and the files themselves: zip with 3mf, coloured obj, per-filament STLs, a merged STL, notes and the project file. Projects save and reopen as `.json`, plus **batch export**: one keychain per name from a list. |

### New in 0.18.1

- **AI figure finder for busy backgrounds.** Colouring from a photo finds the figure by its colour against the background, which fails on a shelf, a desk or a patterned wall. On the photo card, **Busy background? Find the figure with AI** runs a small AI model (U²-Net, 4.6 MB) that marks the photo's main object, then lines the photo up from that. Nothing loads until you press it: then it downloads once (about 19 MB with its runtime, ONNX Runtime Web), every file is checked against its known fingerprint before it runs, and it works on your computer (your photos are not sent anywhere). Its result is saved with the project, so a reopened project colours the same without it. In tests with one front photo of a figure in front of a bookshelf, finding it by colour got 48 to 58% of the surface right; with the AI, 83 to 85% (87% on a plain background).
- Lining up picks the angle more steadily (a turn away from the side you chose has to fit clearly better), and a thin rim of background round a slightly misplaced outline no longer takes a filament of its own.

### New in 0.18

- **Colour a model from a photo.** Import a plain model (a figurine, a bust, a toy), open the **Paint** tab and drop a coloured photo of it on **From a photo of the model**. The app finds the figure in the photo, lines it up with the model's outline by itself (size, place, a slight turn, and the angle the photo was taken from), picks your filaments from the photo's colours (light and shade count as one colour; 2 to 8 colours, starting from the number your printer loads) and colours the model. The colour only goes where the photo really sees (the face does not come out on the back of the head); what no photo shows takes the nearest colour, and small specks are cleaned up while small details such as eyes stay. Add a photo from the back or a side for those parts (up to six photos). Fine-tune by dragging the photo, with the arrow buttons or keys, or by picking the side it was taken from; **Colours it reads** shows each colour in the filament it prints in. Then touch up with the brush and fill: they paint on top. The photos are saved in the project file.

| A plain figure coloured from a photo of its front and one of its back |
| --- |
| ![The Paint tab with the back photo lined up (yellow outline) and the coloured figure](docs/images/painter-photo.jpg) |

### New in 0.17.2

- **Every font is built in.** The 34 lettering fonts and the Easy reading font are inside `index.html`, so the page never downloads a font (and never talks to Google).
- **Saved projects keep imported models.** A project file now holds the model you imported and its paint. The autosave and share links still leave the model out and tell you which file to open again; opening the same file brings the paint back. Undo after opening a second model brings back the first.
- Fixed: a picture on a photo frame landed in the window and printed nothing (it now goes on the border); the arrow keys on the tab bar also moved your artwork; unticking "Show the paint" also left the paint out of the exported files without a word (it is now "Use the paint", with a warning); the phone case's Art tab showed placement controls that did nothing; damaged project files could crash a build.

### New in 0.17

- **Colour painter.** A new **Paint** tab colours any model, made here or imported, in up to eight filaments: **height bands** cut straight into the mesh, a **colour fade** between two filaments layer by layer, **stripes**, **tops and sides**, **separate pieces**, **smooth areas** split at sharp edges, a **picture projected** through the model, **random blobs**, or by hand with a **brush, fill and eraser** (mirror strokes for symmetrical models, keys 1 to 8 for colours). Painting follows the model when a setting changes. The paint goes into the 3mf files as slicer paint (`paint_color` for Bambu Studio and OrcaSlicer, `mmu_segmentation` for PrusaSlicer), so there is nothing to paint again in the slicer.
- **Import STL, OBJ and 3MF.** 3mf files from Bambu Studio, OrcaSlicer and PrusaSlicer keep their painting, the filament each part prints in, and the filament colours, so a model painted elsewhere can be repainted here.
- **Phone cases** for 75 phones, from the iPhone SE to the iPhone 18 Pro Max and Galaxy S26 Ultra (sizes from the makers' spec sheets): a snug TPU case or a bumper, a quick **fit test rim**, holes for the buttons and the port, a camera opening, a lip that prints without support, and a picture inlaid in the back in several colours.
- **39 printers**, grouped by maker, including the Bambu X2D, H2S, H2C and P2S, Prusa CORE One, Creality K2, Elegoo Centauri Carbon, Snapmaker U1 and more. Your printer is remembered for every new project.
- **Easy reading.** The **Aa** button makes text and buttons bigger (up to 175%), switches on high contrast, uses a font drawn for low vision (Atkinson Hyperlegible), keeps messages up longer and can read them aloud; 🔊 reads the open page aloud. Every slider has a **↺ default** button and every page a **Reset this page** button.
- **Project boxes:** round holes are round again (pointed tops are an option), and choosing a fan, display or board bigger than the box makes the box grow to fit instead of quietly leaving it out.
- **Pilot lights** wherever an LED goes: a printed **jewel lens** for a plain 3 or 5 mm LED (print it in a clear or coloured see-through filament), or holes sized for bought chrome-bezel LED holders and metal pilot lights from 8 to 22 mm.
- Fixed: reopening a saved project quietly changed four settings (charm size, picture size, artwork outline width and the plastic canvas pixel count).

| Colour fade and stripes on the Paint tab | Brush with mirrored strokes |
| --- | --- |
| ![A vase fading from navy to orange with white stripes](docs/images/painter-fade.jpg) | ![A sphere in height bands with mirrored brush strokes](docs/images/painter-brush.jpg) |
| **Phone case** for an iPhone 17 Pro | **A picture inlaid in the case's back** |
| ![A phone case with button and port openings](docs/images/phone-case.jpg) | ![The case turned over, a star inlaid in two colours](docs/images/phone-case-back.jpg) |
| **39 printers**, your Bambu X2D remembered | **Easy reading:** bigger text, high contrast, clear letters |
| ![The printer picker grouped by maker](docs/images/printers.jpg) | ![The app at 130% with high contrast](docs/images/easy-reading.jpg) |
| **A PSU box with a 120 mm fan**: round grille, the box grew to fit | **Pilot lights** with printed jewel lenses |
| ![A PSU box with a round 120 mm fan grille](docs/images/psu-box-fan.jpg) | ![Four red jewel lenses in front of the power bank box](docs/images/pilot-lights.jpg) |

### New in 0.16

- **Project boxes grew up.** Engraved labels beside any opening ("USB-C", "ON/OFF", "12V"), magnet lids, a sliding lid on 45° rails, stick-on-foot recesses, ports that open to the top edge so the lid closes them, pointed tops for wide ports, your logo inlaid into the lid in its own colours, and a **fit test**: a small box with your walls, lid, screws and one of each opening, to try before the real print. The stock boxes now print without support.
- **Tracer:** SVG logos are drawn sharp and keep the size stated in the file; hairlines can be thickened to a printable width; multi-colour logos keep their colours on a body in your main filament; back plates get a hanging hole, a keychain loop or countersunk screw holes placed clear of the shape.
- **Name plates from a list:** paste names (or a spreadsheet column) and each gets its own plate, packed onto the bed.
- **Measure and look inside:** a measuring tape that snaps to corners, a section view that cuts the model at any height, and rulers in inches when you work in inches.
- **Share a link** that opens the same design for someone else (pictures stay on your machine).
- **Lithophane test strip:** steps from 0.6 to 3.2 mm, numbered, to choose thicknesses for your filament.
- **Checked in a real browser:** `npm run check:browser` opens the app in Chromium and walks every object and page. It found and fixed a name plate bug that only real fonts showed: plates with charms were clipped and printed with holes under the letters.

### Highlights

- **Photo to 3D tracer.** Photograph a flat part on paper, give one real measurement, and get a printable replacement. Background removal or an automatic (Otsu) threshold separates the part; cleanup closes nicks and drops specks; round-ish holes are detected by circularity and replaced with true circles snapped to a sensible diameter plus a clearance for bolts. Scale either from one ruler measurement, or from **the sheet of paper under the part**: the sheet is detected, straightened with a perspective correction, and used as the ruler, so the photo can be taken at an angle. A hand brush adds or erases bits of the trace, and the outline exports as **SVG and DXF** at true scale for Inkscape, laser cutters, Fusion, FreeCAD or LibreCAD. On a synthetic 60 × 30 mm bracket photographed straight on it recovered exactly 60.00 × 30.00 mm; photographed at an angle on A4 with no measurement typed, 60.57 × 30.88 mm, with 8 mm and 5 mm holes measured at 7.93 and 4.92 mm.
- **Sub-pixel outline tracing.** Contours come from marching squares with linear interpolation over a scalar field, not from a binary pixel mask. Letters are traced from the font's own anti-aliased coverage, and plates from a signed distance field, so offsets are smooth at any distance. Measured on a test ring: edge wobble fell from ±0.053 mm to ±0.005 mm while using a quarter of the points.
- **Outline tracing instead of pixel blocks.** Colour regions are traced with marching squares, smoothed, simplified with Douglas-Peucker, then triangulated with earcut. Logos keep round curves and sharp corners, and meshes are roughly ten times lighter than a voxel-style approach.
- **Name plates that follow the name.** The plate is a true distance-field offset of the rendered glyphs, so it hugs the letters. Widen the border until the letters merge into one piece; a "bridge gaps" control closes near-touching letters without fattening the plate.
- **Lightboxes.** A photo becomes either a backlit panel (white diffuser plus colour zones, where darker filaments print thicker and block more light) or a layered shadow box of stacked plates with growing cut-outs. Both come with a frame, a slotted stand and a channel for an LED strip.
- **Schematics become circuit boards.** Drop in a screenshot of a schematic or a PCB layout and the dark lines are thresholded, thickened to a printable width and raised as copper on a solder-mask coloured plate, with mounting holes, edge fingers and an optional hatched ground pour that keeps clear of the traces. Small marks and labels can be split off into a silkscreen colour by connected-component size.
- **Hearts instead of dots.** Connected-component analysis finds the dots on `i` and `j` in any font, removes them and drops in a heart, star, flower or round dot.
- **Drapes onto curved surfaces.** Artwork is projected onto the object's real geometry, with conforming subdivision so a logo follows a cylinder or sphere without T-junctions.
- **Every part is a closed solid.** Top surface, bottom surface and walls generated from the actual boundary edges, so slicers do not need to repair anything.
- **Double-sided pieces.** A name plate can carry a mirrored copy of the name underneath, so a tag reads correctly from either side, and any artwork can be placed on the back face of a flat object.
- **Turned parts without CSG.** A closed-loop lathe builds spheres with bores, hollow vases and rings as single watertight meshes, which is how the bobble head gets its socket.
- **Undo/redo, autosave, project files.** `Ctrl+Z` / `Ctrl+Shift+Z`, arrow keys nudge artwork, `Delete` removes it, `Ctrl+S` saves, and the last session restores automatically.

---

## Running it

Open `index.html` in a browser. That is the whole install.

To hack on it:

```bash
git clone <your-fork>
cd maker-forge
python3 build.py      # inlines src/core.js into src/app.html -> index.html
```

The test rigs run the real app headlessly in jsdom with a software canvas:

```bash
npm install                                      # test dependencies only: jsdom, three, earcut, jszip, onnxruntime-web
node tools-smoke-test.js index.html              # clicks every tab, button and export path
node tools-audit.js index.html nameplate,board   # sweeps controls to their extremes
node tools-audit.js index.html board art         # sweeps the artwork controls
npm run test:tracer                              # traced parts measured against known sizes
npm run test:print                               # printability checks on shapes with known answers
npm run test:enclosure                           # project boxes: sizes, openings, lids, labels, hostile files
npm run test:paint                               # the colour painter: mesh splitting, paint steps, 3mf paint in and out
npm run test:phonecase                           # every phone in the list, openings, the lip, hostile files
npm run test:photo                               # colour from a photo, and the AI figure finder (the real model, run in Node)
npm run test:jigsaw && npm run test:litho        # puzzles and lithophanes
npm run test:size                                # on-screen size = exported size, in every format
npm run survey:print                             # what the printability check says about every object
```

And one in a real browser (needs Playwright with Chromium: `npm i --no-save playwright && npx playwright install chromium`):

```bash
npm run check:browser                            # screenshots of every page in browser-check/, layout and error checks
```

The audit drives every slider to both ends and toggles every checkbox, waiting for each rebuild to finish, then checks the resulting meshes for open edges, NaN coordinates, empty output and zero volume. It also flags **dead controls**: if moving a control leaves the model byte-identical at both extremes, something is not wired up. That check found two real bugs that every other test missed.

The app exposes `window.MakerForge` (state, live parts, check results, a build counter and the geometry library) for these rigs and for poking at things in the browser console.

`src/core.js` is the geometry library and has no DOM dependencies, so it also runs under Node for tests:

```js
globalThis.THREE = require("three");
globalThis.earcut = require("earcut");
require("./src/core.js");
const solid = PRCore.extrudePolys([{ outer: PRCore.ringRect(55, 28, 6, 10), holes: [] }], 3);
console.log(PRCore.checkMesh(solid));   // { tris, open: 0, volume }
```

`checkMesh` reporting `open: 0` is the invariant every generator must hold: each part is a closed, consistently oriented mesh.

### Dependencies

Loaded from CDNs at runtime, no package manager: [three.js](https://threejs.org) r128 (preview and primitives), [earcut](https://github.com/mapbox/earcut) (polygon triangulation), [JSZip](https://stuk.github.io/jszip/) (3mf and zip writing), all from jsDelivr. The 35 fonts (the name plate typefaces and Atkinson Hyperlegible) are **built into `index.html`**: `fonts/` holds them as WOFF2 files from [Fontsource](https://fontsource.org) 5.3.0, one per font, weight and alphabet, and `build.py` packs them in (1.9 MB). `npm run fonts` copies them again after a font is added.

Only when the AI figure finder is used: [ONNX Runtime Web](https://onnxruntime.ai) 1.30.0 (`ort.wasm.bundle.min.mjs` and its 14 MB `.wasm`, from jsDelivr) and the model `models/u2netp.onnx` (from `models/` next to the page, or from this repository through jsDelivr). **On your own website**, upload the `models` folder next to `index.html` so the model comes from your site. If the site sends a Content-Security-Policy, it needs `script-src blob: 'wasm-unsafe-eval'` and `connect-src https://cdn.jsdelivr.net` for the finder (plus `font-src data:` for the built-in fonts).

---

## How it works

```
image / text  ->  raster mask per filament   (colour quantisation, k-means palette)
                      |
                      +-- distance transform  ->  offsets: plates, halos, inset accents
                      |
                  marching squares  ->  loops  ->  Chaikin  ->  Douglas-Peucker
                      |
                  earcut + conforming refinement  ->  2D triangulation
                      |
                  surface projection (binned ray casting against the object)
                      |
                  top + bottom + boundary walls  ->  closed solid per filament
                      |
                  3mf / obj / stl with extruder assignment
```

Key pieces in `src/core.js`:

| Function | Role |
| --- | --- |
| `kmeans`, `buildCellMap` | Palette extraction and colour separation onto filament slots |
| `edt`, `dilateMask`, `erodeMask`, `closeMask` | Exact Felzenszwalb distance transform and morphology |
| `labelMask` | Connected components (dot detection, piece counting) |
| `traceMask`, `chaikin`, `decimate`, `groupLoops` | Contours to polygons with holes |
| `triangulate`, `refine` | earcut plus conforming edge subdivision |
| `makeProjector` | Binned projection of a 2D point onto the object's surface with interpolated normals |
| `sweepTube` | Tube swept along a 3D path with parallel-transport frames: springs, coils, wires |
| `revolve`, `revolveLoop` | Turned solids from an open profile with caps, or a closed profile with bores and hollows |
| `perforate`, `snapToGrid` | Plastic-canvas hole grids and pixel/cross-stitch snapping |
| `transformSolid`, `mirrorSolid`, `solidBounds` | Scaling, laying parts out for printing, mirroring, measuring |
| `solidFromTris`, `buildMaskSolid`, `extrudePolysAt` | Closed solids from a planar triangulation |
| `homography`, `warpQuad`, `quadCorners` | Perspective correction from a detected sheet of paper |
| `outlineSVG`, `outlineDXF` | True-scale CAD outlines |
| `traceField`, `fieldToPolys`, `signedDistanceField`, `coverageField` | Sub-pixel contours, smooth offsets, anti-aliased coverage |
| `make3MF`, `make3MF_BBL`, `makeOBJ`, `makeSTL`, `prepareParts` | Export writers, Y-up to Z-up conversion |
| `checkMesh` | Open edges and signed volume |

Two 3mf flavours are written: `model-prusa-orca.3mf` uses the PrusaSlicer volume convention (`Metadata/Slic3r_PE_model.config`) plus core `basematerials` colours, which PrusaSlicer and OrcaSlicer read directly. `model-bambu.3mf` uses Bambu's own layout instead: one object per filament assembled with components, extruders assigned in `Metadata/model_settings.config`, and spool colours in `Metadata/project_settings.config`. The obj with per-part colours remains as a fallback.

---

## Printing notes

- Flat pieces print face down on a smooth plate, no supports, 0.10–0.12 mm layers.
- Patches for clothing: TPU, 0.8–1.2 mm. Attach with fabric glue or a low-temperature press; test on a scrap.
- Car badges: ASA or PETG. PLA softens in a hot car.
- Keychains: PETG, 3 mm plate, 4 mm ring hole.
- Lithophanes and tea lights: print upright, 100% infill, 0.6–0.9 mm walls, LED light only.

---

## Security

Everything runs locally; nothing is uploaded. The threats worth defending are a hostile **project file** and a compromised **CDN**.

- Project files pass through `sanitizeProject`: prototype-pollution keys are stripped, every number is finite and clamped, and anything that decides memory or time (trace resolution, grid cells, letter height and so on) has hard limits. Colours must be `#rrggbb` before they reach a style attribute, text is length-capped, fonts and object types are whitelisted, vectors must be three finite numbers, and embedded images must be `data:image/png|jpeg|webp|gif`. The box, painter, phone case, jigsaw, lithophane and printability tests each throw a deliberately hostile file at the loader.
- All user text reaches the page through `textContent` or `esc()`.
- Every script is pinned by version and Subresource Integrity hash (`integrity="sha384-…"`), computed from the npm package files, so the browser refuses a tampered copy. The fonts are built in, so nothing else is fetched.
- The AI figure finder's three files (runtime code, its WebAssembly and the model) are fetched only when asked for, and each is checked against a SHA-256 fingerprint before it is used: the code runs from the checked copy, so a changed file is refused and nothing of it runs. The browser check tries a wrong model file to make sure.

## Known limitations

- No boolean CSG. Engraving is available on the name plate (done in mask space); cutting artwork into an arbitrary imported mesh is not.
- Surface projection covers roughly 120° of a cylinder before the edges fall away. Full wrap-around needs a UV unwrap path.
- Cost and material figures assume solid parts and ignore infill savings, so treat them as a worst case.
- The painter colours whole triangles, so it splits the model into small ones (about 1.2 mm by default; height bands are cut exactly). Very fine brush work on big models makes big files.
- Phone sizes come from the makers' spec sheets, but camera and button positions are careful estimates: check them against your phone, and print the fit test rim first.
- Text rendering relies on the browser's canvas, so the exact glyph outlines follow whatever the browser does with the font. Letter spacing is applied glyph by glyph rather than through `ctx.letterSpacing`, so it behaves the same in every browser.

## Printer support

The printer library has 39 printers from Bambu Lab (A1 mini, A1, P1P, P1S / X1C, X1E, P2S, X2D, H2S, H2D, H2C), Prusa (MK3S+, MK4, CORE One, CORE One L, XL, MINI), Creality, Elegoo, Anycubic, Qidi, Snapmaker, Flashforge, Sovol and Voron, plus a custom profile. Each sets bed size, nozzle, layer height, how many filaments can be loaded and a flow rate for the time estimate. Pick one and the Check tab tells you whether your design fits the machine, and if the machine takes one filament it lists the heights at which to swap spools by hand.

## Ideas worth contributing

- Full cylindrical wrap for mugs and bottles (the painter's picture projection is flat for now).
- Painting from the colours or textures of AI-generated models (OBJ vertex colours, GLB textures).
- SVG import as vector paths rather than rasterising (0.16 draws SVGs at 2000 px, which suits most logos).
- More object generators: cable tags, luggage tags, signs with mounting holes.
- Real Gerber and KiCad file import for the circuit board generator, instead of working from a picture.
- A filament library with real vendor colour codes.
- Multi-line and arc-shaped name plates.
- Boolean CSG so any object can be engraved.

## Licence

MIT. See [LICENSE](LICENSE). The fonts in `fonts/`, also built into `index.html`, keep their own licences (SIL Open Font License 1.1, or Apache 2.0 for five of them): see [fonts/LICENSES.md](fonts/LICENSES.md), which `build.py` also copies into the page. The AI figure finder's model in `models/` is U²-Net under the Apache License 2.0: see [models/LICENSE.md](models/LICENSE.md).
