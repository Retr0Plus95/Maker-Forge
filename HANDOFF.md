# Maker Forge — handoff summary

Paste this into a new chat along with the repository files to continue.

## Project overview

**Maker Forge** (v0.20.0) is a browser-based, MIT-licensed studio for multi-colour 3D printing: name keychains, photo-traced parts, jigsaw puzzles, lithophanes, lightboxes, bobble heads, circuit-board art and more. It runs entirely client-side with no build toolchain. Targets: GitHub, a personal website, and later a Linux desktop app (Electron or Tauri wrapper not started).

**Repository layout**

| File | Role |
| --- | --- |
| `src/core.js` | Geometry library, no DOM. Exposed as `window.PRCore`. Runs in Node for tests. |
| `src/app.html` | UI, state, generators, export. Contains the placeholders `/*CORE*/` where core is inlined, `/*EXAMPLES*/` (src/examples.js), `/*THUMBS*/{}` (the Start pictures), `/*MANUAL*/""` (MANUAL.md as HTML) and `/*FONTS*/{}` where the fonts go. |
| `src/examples.js` | The built-in examples (Session 19): `EXAMPLE_ART`, 25 pictures drawn with the canvas (MIT), and `EXAMPLES` / `EXAMPLE_FOR_TYPE`, which quick start or object opens with which picture, width, filaments, settings, paint steps and view. |
| `examples/start-thumbs.json`, `tools-thumbs.js` | A render of each example for the Start sidebar's buttons (41, about 210 KB as WebP data URLs), made by `node tools-thumbs.js index.html` (`ONLY=` for some). Run it after changing an example, then build. |
| `MANUAL.md`, `docs/manual/` | The user manual (Session 19) and its screenshots. `build.py` turns it into HTML for the app's Help window (**?** in the top bar); images stay out of the page. |
| `CHANGELOG.md` | What's new in each release, for users (moved out of the README in Session 19). |
| `tools-screenshots.js` | Takes the README and manual screenshots (`docs/manual/`, `docs/images/`, including `examples-gallery.jpg`): `node tools-screenshots.js index.html`, `ONLY=overview,gallery`. |
| `build.py` | Inlines core, the examples, the Start pictures, the manual (converted from Markdown) and the fonts (base64, with `fonts/LICENSES.md` as a comment) into app, producing `index.html`. |
| `fonts/`, `tools-fonts.js` | The built-in fonts (Session 15): 111 WOFF2 files, one per font, weight and alphabet, and `LICENSES.md`. `npm run fonts` copies them from the `@fontsource` dev dependencies after a font is added to `FONTS`. |
| `index.html` | The built single-file app. |
| `tools-test-env.js` | jsdom environment with a software 2D canvas stub; `boot(file)` returns `{ window, errors }`. |
| `tools-smoke-test.js` | Clicks every tab, generator, preset, button and export path. |
| `tools-audit.js` | Drives every slider to both extremes and toggles every checkbox, per generator; flags open edges, NaN, empty output, failed builds and **dead controls** (model unchanged). Usage: `node tools-audit.js index.html nameplate,board` or `... board art`. |
| `tools-tracer-test.js` | Traces a synthetic 60 mm bracket and prints the measurement table. |
| `tools-tracer-logo-test.js` | A logo on a transparent background (Session 10): white, black and coloured, both separation methods, smoothing 0.4 to 1.2 mm. The whole ring (thin stretch included), every letter, the small letters kept apart, the background empty. |
| `tools-tracer-paper-test.js` | The same bracket on A4 photographed at an angle; checks paper scaling, perspective correction, both separation methods and hand-brush edits. `TRACER='{"smooth":0}'` overrides settings. |
| `tools-printability-test.js` | Core-only printability checks on shapes with known answers (overhangs, bridges, ledges, stacked and sunk parts, thin walls, bed contact, brim, orientation). `node tools-printability-test.js [src/core.js\|index.html]`. |
| `tools-printability-app-test.js` | The same in the app: sphere, flat box, an STL table imported through the file input and fixed by Optimize, mirror + scale on a turned model, Revert, the Export page, a hostile project file. |
| `tools-jigsaw-test.js` | Jigsaw puzzles (Session 8): the cut alone (exact tiling, seeds, the gap measured on finished pieces, shaped outlines, labels, SVG, hostile input), then the generator in the app (parts, Shuffle, frame, tray, face down, downloads, a hostile project). `node tools-jigsaw-test.js index.html`; `CORE=1` for the geometry only (~25 s). |
| `tools-lithophane-test.js` | Lithophanes (Session 9): the sheet builder alone (outline areas, holes, simplified backs, the cylinder seam, a curve), then the generator in the app (thickness follows brightness, mirror, the upright slope limit, every shape and outline closed and support-free, the lamp shade, the hanging hole, Optimize, a hostile project). `node tools-lithophane-test.js index.html` (~85 s); `CORE=1` for the geometry only (~5 s). |
| `tools-print-survey.js` | Prints what the printability check says about every object and preset: `node tools-print-survey.js index.html [objects\|presets\|all]` (`NOPIC=1` skips the test picture). Use it after any generator change to spot new warnings. |
| `tools-enclosure-test.js` | Project boxes (Sessions 11 and 12): sizes and volumes, 30 opening kinds on 4 faces, placement messages, screws, lids and heads, boards, labels, magnets, feet, pointed tops, notches, the sliding lid, the lid logo, the fit test, the presets, the rulers, hostile project files. Session 40: a box bigger than the bed in parts that screw together (`ONLY=split`). |
| `tools-paint-test.js` | Colour painter (Session 13): crack-free mesh splitting (refine, height cuts), every paint step on a cube with known areas, the slicer paint codes, painted 3mf / OBJ out and 3mf / OBJ in, then the Paint tab in the app (every auto method, the paint list, a live band slider, brush, mirror, fill, detail, export, the colour check), OBJ import, a hostile project (paint, printer, same-name settings), the printer list and easy reading. Session 15: an imported model kept in a project file and brought back by opening the same file, Undo across two imported models, hostile models and scales, the paint switch warning. `CORE=1` for the geometry part. |
| `tools-project-test.js` | Project files (Session 15): every quick start and every object comes back unchanged from a saved project (settings compared with sorted keys), and the settings that used to run away when a project set them out of range build quickly and small. |
| `tools-art-test.js` | Pictures on objects (Session 15): a picture on a photo frame goes on the border, a picture that misses the model is reported, the phone case's Art tab, and the keys that move or delete artwork act only on the Art tab. |
| `tools-photo-test.js`, `tools-photo-figure.js` | Colour from a photo (Session 16). `tools-photo-figure.js` makes the test figure (a footballer of 8 parts with six known colours, eyes and a number on the back) and draws it into lit, noisy photos; it is shared with the browser check. The test: the engine alone (the figure found in the photo, the fit, a mirrored photo, the six colours, front only and front + back, the number on the back, no colour through the head, a three-quarter photo whose angle is found, eyes kept or cleaned, 600k triangles), then the Paint tab (an OBJ import, two photos dropped, the filaments, the accuracy, the preview, keys, a brush stroke on top, my own filaments, the colour count and fill controls, a project round trip, the model resized afterwards, a hostile project). Session 17: the AI figure finder with the real model in Node (`onnxruntime-web` dev dependency): a plain background, a worst case (a red disc hugging the head), a bookshelf, a tiny photo; in the app, a bookshelf photo by colour and then with the AI (through `MakerForge.paint.photo.ai.hooks.run`), and reopened without the AI. `CORE=1` for the engine only (~25 s; the whole test about 5 minutes, mostly jsdom). |
| `tools-phonecase-test.js` | Phone cases (Session 13): all 75 phones build a closed case of exactly the phone plus gap and wall, openings take plastic away where they should, the lip prints as a ledge over a slope, fit test rim, bumper, every setting changes the case, a picture inlaid in the back (mirrored for reading from the back), a hostile project file. |
| `tools-size-check.js` | The on-screen size readout against the export parts, the 3MF vertices (both flavours) and the STL, for four objects (Session 11). |
| `tools-browser-check.js` | **Real browser** (Session 12): opens `index.html` in Chromium via Playwright, answers the CDN requests from `node_modules` (same files, SRI still matches), walks every quick start, object, tab and panel page, saves screenshots and `report.html` to `browser-check/`, and flags page errors, an empty 3D view and layout problems (sideways scroll, content wider than the panel, HUD pills under the view buttons, cut-off text). Then checks what only a browser does: an SVG traced at its own size, the measuring tape, the section view, a share link opened in a second page, a list of name plates. `PRINT=1` reports printability with real fonts, `MOBILE=1` adds a phone-sized pass, `ONLY=`, `PAGES=0`, `THEME=dark`. Needs Playwright with Chromium (`npm i --no-save playwright && npx playwright install chromium`; a global install is found too). |
| `package.json` | Test dependencies and script shortcuts (`npm run build`, `test:tracer`, `test:smoke`, `test:audit`, `test:print`, `test:jigsaw`, `test:litho`, `test:enclosure`, `test:paint`, `test:phonecase`, `test:art`, `test:project`, `test:photo`, `test:size`, `survey:print`, `check:browser`). |
| `README.md`, `LICENSE` | Docs, MIT. |

Dependencies load from CDNs at runtime: three.js r128, OrbitControls, earcut 2.2.4, JSZip 3.10.1, all from jsDelivr. The fonts are built in (Session 15; from jsDelivr in v0.17.1, Google Fonts before). Dev deps: `npm i` (jsdom, three@0.128.0, earcut@2.2.4 and jszip@3.10.1 for the tests, `@fontsource/*` for `npm run fonts`).

**Files not in the Session 6 bundle.** Only `HANDOFF.md`, `index.html`, `app.html` and `tools-tracer-paper-test.js` arrived in Session 6. `src/core.js` was extracted from `index.html` (rebuilding reproduced the v0.11.2 `index.html` byte for byte), and `build.py`, `tools-test-env.js`, `tools-smoke-test.js`, `tools-audit.js` and `tools-tracer-test.js` were rewritten from their descriptions here. `README.md`, `LICENSE` and `tools-security-test.js` were not available and are not in the bundle: if you have the originals, keep them, and consider diffing your old test tools against the new ones.

**Key architecture in `app.html`** (sections are commented 1–9): constants (`FONTS` 34 entries, `PRINTERS`, `PRESETS`, `SHAPES`, `OBJECT_GROUPS`) → state and history (JSON snapshots, `sanitizeProject`) → helpers (`cutoutCanvas` background removal, `sourceCanvas` adjustments) → generators (`buildNamePlate`, `buildTracer`, `buildLightbox`, `buildLithophane`, `buildJigsaw`, `buildPCB`, `buildBobble`, `buildCutter`, `buildCanvasPanel`, `buildTurned`, `buildSimpleObject`) → artwork pipeline (`buildItem`) → scene and `rebuildAll` → checks (`runChecks`) → UI (`renderTab`, `renderStarts`, tab functions, field helpers `numField/selField/segField/checkField/slotField/fontField/symbolField/group`) → export (`buildZip` writes Prusa/Orca 3mf, Bambu 3mf, OBJ+MTL, per-colour STL, merged STL, project.json). `window.MakerForge` exposes state, parts, checks, a build counter (`rev`) and `busy` for tests.

**Key functions in `core.js`**: `traceField`/`fieldToPolys` (sub-pixel marching squares), `blurMask`, `signedDistanceField`, `coverageField`, `maskToPolys` (now smooth by default; `{stepped:true}` for pixel-exact), `edt`/`dilateMask`/`erodeMask`/`closeMask`, `labelMask`, `triangulate`/`refine`, `solidFromTris`, `extrudePolys(At)`, `buildMaskSolid`, `makeProjector`, `revolveLoop`, `sweepTube`, `checkMesh`, `make3MF`, `make3MF_BBL`, `makeOBJ`, `makeSTL`, `prepareParts`. Printability (Session 7): `analyzePrint`/`analyzePrintSteps`, `bestOrientation`/`bestOrientationSteps`, `brimSolid`, `affineSolid`, `rotationDownTo`, `sliceMask`, `flattenParts`, `bedContact`. Jigsaw (Session 8): `jigsawGrid`, `jigsawCut`, `jigsawEdge`, `jigsawPiece` (with `placeLabel`), `jigsawCutLines`, `jigsawSVG`, `ringField` (banded signed distance to rings), `ringDistance`, `outlineBand`, `strokeText` (a 4 × 6 stroke font; Session 12 added I, O and `- + / . : %` and space for box labels, the jigsaw still never uses I or O), `strokePolys` (stroke text as filled outlines, Session 12), `seededRandom`. Painter (Session 13): `meshEditor` (split edges without cracks: `refine(maxEdge, maxTris)`, `cut(axis, h)`, `source()` maps each new triangle to the one it came from), `meshTopology` (centres, normals, areas, neighbours), `triangleGrid`, the paint steps `paintHeights`, `paintGradient`/`gradientCuts`, `paintStripes`/`stripeCuts`, `paintDirection`, `paintShells`, `paintRegions`, `paintNoise`, `paintPicture`, `paintBrush`, `paintFill`, `paintSwap`, the slicer codes `paintCode`/`paintDecode`, and the readers `parseOBJ`, `parse3MFModel` (several model files, components, build transforms, paint). `mergeSolids` and `prepareParts` carry a per-triangle `paint`; `make3MF`/`make3MF_BBL`/`makeOBJ` write it. Colour from a photo (Session 16): `photoCam` (a named side or yaw/pitch), `photoXY` (the fit: photo-height units), `srgbToLab`, `photoMask` (the figure: alpha, or a flood from the border), `photoFit` (size, place, turn and mirror by outline overlap; with `angles`, the camera angle too), `photoPalette` (shade-aware colour groups), `photoClasses`, `photoRaster` (a z-buffer of triangle ids), `photoModelMask`, `photoView`, `paintFromPhotos` (votes with a depth test, the fill for unseen parts, speck clean-up). Session 17: `photoNetInput` / `photoNetOutput` (the AI figure finder's picture in and out, as rembg feeds U²-Net), `photoMaskFromMap` (its 320 × 320 map to a mask of any size), `keepFigure` (biggest piece plus pieces at least 2% of it). Lithophane (Session 9): `heightSheet` (a thickness grid as a closed solid, clipped to an outline, mapped flat, curved or round), `flatBack` (internal: a flat back triangulated from the boundary loops), `gridAround` (now exported).

## Completed this session

**Priority 1 (all done)**
1. Panel keeps its scroll position when a setting re-renders the same tab.
2. Art thumbnails toggle a picture on/off (with an on/off badge); adding a new picture switches earlier pictures off so they no longer stack. Disabled items are skipped in builds.
3. Picture beside the name: background removal (flood fill against the median border colour, tolerance slider), colour cleanup, and the chosen picture is no longer also stamped onto the plate as a decal.
4. Lightbox 💡 and Circuit board 🔌 have their own icons.
5. New original logo: stacked print layers tapering into a nozzle with a bead of filament.
6. Security review: project files are sanitised (`sanitizeProject`): hex colours validated before reaching style attributes, strings length-capped, fonts whitelisted, image assets accepted only as `data:image/(png|jpeg|webp|gif);base64`. innerHTML sinks reviewed; user strings go through `esc()`.

**Priority 2 (done)**: `maskToPolys` now blurs the mask into a coverage field and traces the 0.5 level, so every generator gets smooth curves. Measured edge wobble ±0.009 mm vs ±0.053 mm before, dimensions preserved.

**Priority 3 (v1 done)**: Photo to 3D tracer with a six-step guided panel (photo, separate, clean up, one real measurement, shape, check). Background removal or Otsu threshold with auto polarity; smoothing; keep largest piece; hole filling by size; outline offset for fit; circular-hole detection replaced by true circles snapped to a step plus clearance; mirror; preview canvas with the traced outline over the photo or the mask; measurement table. Test: 60.00 × 30.00 mm bracket, holes 7.97/4.96 mm measured (true 8/5) → 8.20/5.20 mm made with 0.2 mm clearance.

**Priority 4 (mostly done)**: tabs moved to the top bar; options docked left; new right sidebar "Start from" with quick-start presets and all objects grouped by category as cards (plus an accessible select `#objectSel`); both sidebars can be hidden; Settings (theme, units, autosave, max preview detail, clear saved work) and About dialogs; version badge; progress bar during builds and picture loading; bottom status line with an expandable activity log; spinner on the drop zone while pictures load.

**Priority 5 (started)**: view buttons for top, bottom, front, back, left, right and angle.

## Session 2 additions (Tracer v2)

- **Scale from the paper**: the sheet under the part (A3, A4, A5, Letter, Legal) is found as the largest bright blob, its corners taken from x+y / x−y extremes (`quadCorners`), and the photo is warped straight with a homography (`homography`, `warpQuad`) at `paperRes` (1500 px on the long side). The paper becomes the ruler, so photos can be taken at an angle.
- **Background separation rewritten for the tracer**: a colour key against the median background colour, cutting halfway between background and the part's typical colour. The old flood fill leaked through noisy parts and could not reach background showing through holes.
- **Hand brush**: Add / Erase strokes painted on the step-1 preview, stored in 0..1 image coordinates in `state.base.tracer.strokes` (sanitised on project load), applied after cleanup and before scaling; undo last stroke / clear all.
- **CAD export**: `outlineSVG` (true-scale mm) and `outlineDXF` (ASCII, closed POLYLINEs, $INSUNITS=4) via a button in step 6, and automatically inside the main zip under `cad/` for traced parts.
- **Mirroring now happens in pixel space** inside `resample()`, not via canvas transforms (the test canvas ignored them, which had silently hidden that the artwork Mirror control was never really tested).
- Results: straight-on 60.00 × 30.00 mm exact; angled A4 photo, no measurement: 60.57 × 30.88 mm, holes 7.93/4.92 mm → 8.00/5.00 mm. Both separation methods agree.

## Session 3: layout, bug hunt, security audit (v0.11.0)

- **Icon rail + pop-up pages.** `renderTab()` renders a tab in place, then `splitSections()` cuts it into pages at every `h2`, every `details.group` and every tracer `.card.step`. Each page gets an icon in `#secrail` (`SECTION_ICONS`, regex → glyph) and a line of instructions in `#sechelp` (`SECTION_HELP`). Only the active page is visible. `sectionState[tab:object]` remembers the active page and each page's scroll position, so a setting that re-renders the panel keeps your place. Clicking the active icon closes the pop-up.
- **Scroll-jump root cause fixed.** The font list used `scrollIntoView`, which scrolls every ancestor, so each re-render on the name plate threw the panel back to the fonts. It now scrolls only the font list.
- **Cookie cutter was broken.** Its rim never appeared (growing a shape was clipped at the picture's edge) and a logo on white produced a rectangle. New `padMask()` adds room before any growth; new `silhouetteMask()` keys away a plain background when the visible border is one uniform colour; the flange now joins the blade. The artwork outline halo had the same clipping bug and is fixed the same way.
- **Security.** SRI hashes on all four scripts (jsDelivr npm URLs). `sanitizeProject` now strips `__proto__`/`constructor`/`prototype`, clamps every number (hard `LIMITS` for resource-driving settings), validates vectors, slot indices, theme, units, printer and object type. Verified with `tools-security-test.js`: zero injected handlers or markup, no prototype pollution, all numbers clamped, app still builds.
- Audit status: every generator passes the extremes audit. Remaining findings are all expected on the synthetic test image (see known issues).

## Session 4: sub-pixel paper corners (v0.11.1)

- New `refineQuad(mask, w, h, roughQuad)` in core: traces the sheet sub-pixel, assigns outline points to the nearest edge (skipping 8% at each corner), fits each edge by total least squares and intersects neighbouring lines. The tracer's paper mode now uses it after `quadCorners`.
- Measured: corner error on a skewed synthetic sheet fell from 0.500 px to 0.014 px. On the angled-A4 bracket test, hole diameters improved to 7.96 / 4.95 mm (true 8 / 5), which means the scale is now right to well under 1%.
- **Open issue found:** the traced part's outer outline still reads 60.57 × 30.83 mm (true 60 × 30) while its holes are accurate. That is an additive bias of roughly a third of a millimetre per outer edge (about 1.5 to 2 px at 5 px/mm), not a scale error. The straight-on test hides it because measure mode scales the bounding box to the typed width (and its holes then read slightly small, 7.97 / 4.96). Suspects to check, in order: the jsdom canvas stub's nearest-neighbour `drawImage` used by `resample()` (browsers filter properly, so this may be a test artefact); the close/open smoothing at `sr = round(0.4 mm × px/mm)` around convex corners; the bounding box being set by a few edge pixels rather than the edge line. First step: run `tools-tracer-paper-test.js` with `smooth: 0` and with `paperRes` equal to the photo's own resolution, and see which one removes the bias.

## Session 5: outline-bias investigation closed (v0.11.2)

Ran the experiments planned in Session 4 on the angled-A4 bracket (`tools-tracer-paper-test.js` now accepts overrides: `TRACER='{"smooth":0}' node tools-tracer-paper-test.js index.html`, and prints the traced area against the true area).

| Setting | Outline | Holes (true 8 / 5) |
| --- | --- | --- |
| defaults | 60.57 × 30.83 | 7.96 / 4.95 |
| smooth 0 | 60.57 × 30.82 | 8.00 / 5.01 |
| workRes 1000 + smooth 0 (no downsampling) | 60.37 × 30.44 | 7.93 / 5.00 |
| paperRes 800 + smooth 0 | 60.48 × 30.80 | 7.86 / 4.85 |

**Conclusion: the tracer is accurate.** With no downsampling the traced *area* is 1721.8 mm² against a true 1722.4 mm² (−0.03%). The apparent oversize comes from measuring with a bounding box, which catches the outermost staircase steps of the synthetic photo's hard-edged, tilted rendering; about half of it also comes from the jsdom canvas stub's nearest-neighbour downsampling, which real browsers do not use. Real camera photos have soft edges, so the effect should be much smaller. Straightening resolution is not a factor.

One small real effect: smoothing shrinks round holes by about 0.05 mm (below printer tolerance). A blur-and-threshold replacement was tried and measured no better, so it was reverted; the smoothing hint now says so and recommends 0 for precision parts.

Possible follow-up: report Width and Height in the step-6 table from lines fitted to the traced edges rather than the bounding box, so noisy edges cannot inflate the numbers shown to the user.

## Session 6: rebuilt test tools, edge-to-edge sizes, three bug fixes (v0.11.3)

**Test tools rebuilt** (see the note under the repository table).
- `tools-test-env.js`: software 2D canvas with paths, arcs and curves, nonzero/even-odd fill, strokes, full affine transforms, `source-over`/`destination-out`/`copy`, box glyphs for `fillText`, real PNG encode/decode (so `toDataURL`, `toBlob`, `<img>` from data and blob URLs, and project assets round-trip), no-op WebGL renderer. `ctx._ensure()` and `ctx.data` work as before. **Changed on purpose:** `drawImage` now filters like a browser (box-filtered downscaling, bilinear upscaling, nearest neighbour only with `imageSmoothingEnabled = false`). The old stub's nearest-neighbour downscaling caused about half of the Session 5 bias, so tracer numbers differ from the Session 5 table (see below).
- `tools-smoke-test.js`: drops a real PNG through the Art tab's drop zone, then runs every preset, every object, every tab, every panel page and every button on the open page, and runs the export writers on each result. An empty build passes only if the app's own message says why. Options: `QUICK=1` (no button clicks), `ONLY=tracer,board` (objects; skips presets unless `PRESETS=1`), `PAGES=0-3`, `VERBOSE=1`.
- `tools-audit.js`: same usage as before. The model signature now includes the vertex centroid, so a mirror counts as a change. Dead-control reports that are expected are listed separately with the reason (whole-model scale and mirror act on view and export only; brush size; no specks, small marks or i/j dots in the test picture; strong-contrast test picture).
- `tools-tracer-test.js`: measurement mode, straight, turned 4° and turned −11°, plus a flat-colour regression case.
- **Time limit in the chat sandbox:** anything over 5 minutes is killed and background jobs do not survive between replies, so run the smoke test in chunks there: `ONLY=nameplate`, then `ONLY=tracer,board,canvas,bobble,cutter`, then `PRESETS=1 ONLY=turned,pcb,lightbox,frame,shell,box,cylinder,hex,sphere,none`. Audits likewise, three or four generators per run.

**Edge-to-edge sizes (the Session 5 follow-up).** New `fitDimensions(ring, { res })` in core: minimum-area rectangle for the outline's own axes (angle kept within ±45° so width stays nearest the photo's horizontal), then per side a weighted total-least-squares line through points sampled evenly by arc length, corners (8%) and cross-running points skipped, refined three times. A side counts as flat only if the fit covers at least 25% of it, is not tilted, and a quadratic fit shows no bow beyond half the photo's pixel size; otherwise that side uses its outermost point. `res` is the coarser of the tracing resolution and the photo's own detail (in paper mode, straightening adds pixels but no detail, so the sawtooth along tilted edges is judged at the photo's scale).
- Step-6 table: "Width (edge to edge)" / "Height (edge to edge)", or "(widest)" for a side that is not flat; an "Outermost points" row when it differs by 0.05 mm or more; a note with the angle when the part is turned.
- **Measurement mode now scales from the fitted size** (a px-unit trace of the mask before the main trace). This fixes a real bug: a part turned in the photo was scaled by its axis-aligned bounding box. Turned 4°: height 32.73 mm and holes 7.70 mm before, 30.00 mm and 8.20 mm (correct, with clearance) now.
- `window.MakerForge.tracer` exposes `tracerInfo` (including `dims`) for tests.

| Test (browser-like filtering) | Edge to edge | Bounding box | Holes measured (true 8 / 5) |
| --- | --- | --- | --- |
| Angled A4, threshold | 60.06 × 30.00 | 60.37 × 30.48 | 7.83 / 4.87 |
| Angled A4, background removal | 60.04 × 29.98 | 60.37 × 30.48 | 7.84 / 4.88 |
| Angled A4, smooth 0, workRes 1000 | 60.01 × 29.99 | 60.37 × 30.46 | 7.92 / 4.95 |
| Measurement, straight, 5 px/mm | 60.00 × 30.00 | 60.00 × 30.00 | 8.00 / 4.89 |
| Measurement, turned 4° | 60.00 × 30.00 | 60.14 × 30.14 | 7.96 / 4.92 |
| Measurement, turned −11°, 4 px/mm | 60.00 × 30.01 | 60.10 × 30.11 | 7.92 / 4.91 |

Traced area on the angled A4 photo is within ±0.06% of the true area. Holes in paper mode read about 0.15 mm small (the photo has only 2.4 px/mm and hard edges); snapping to 0.5 mm still lands them on 8.0 / 5.0.

**Bugs fixed**
1. **Threshold off by one** (existed in v0.11.2): Otsu's threshold t splits values ≤ t from values > t, but the dark test was `lum < t`, so a flat-coloured part whose brightness was exactly t vanished ("Nothing was traced"). Clean logos and screenshots hit this; noisy photos hid it. Now `<=` for dark and `>` for light.
2. **Silent empty trace:** in paper mode with the threshold method and "Part is lighter", the paper's shaved white margin counted as part, and the trace came out empty with no message. The margin is now cleared for both separation methods, and an empty trace always says why (background picked as the part → switch darker/lighter; otherwise try the other method or the Add brush).
3. **Plastic canvas "Leave the background open" did nothing** unless a colour was switched off on the Art tab. When none is, the colour filling at least half of the picture's border counts as background. A hint under the checkbox says so.

Also: the version badge said v0.9.0; it now reads v0.11.3.

**Verified this session:** audit of all 16 generators (plus the Art tab on the board): no findings beyond the expected list. Full smoke test with button clicks in three chunks: passed, no page errors. Both tracer tests pass.

## Session 7: Printability checker with Optimize and Revert (v0.12.0)

Session 7 started from `HANDOFF.md`, `index.html`, then the real `src/app.html` and `src/core.js` (uploaded files had CRLF line endings; normalised to LF, `build.py` reproduces the v0.11.3 `index.html` exactly). Plan items 1 and 2 need a real browser, slicers and real phone photos, so item 3 was done.

**What the user sees.** After every build, once editing pauses for 450 ms, the app works out in the background (yielding every 25 ms, abandoned if the model changes):
- *Needs support under about X mm²* (warn, 3 mm² or more) with the lowest height and the part most affected, or *No overhangs need support* (lists bridges that print fine).
- *N walls are thinner than the nozzle* with the thinnest width, part and height.
- *Barely touches the bed* (bad, under 1 mm²), *Small contact with the bed* / *Tall for its footprint* / *Large print in a material that warps* (ABS/ASA over 100 mm) suggesting a brim, or *Sits well on the bed*.
- Export tab → new **Printability** page: summary table, **Optimize for printing**, **Revert** (or *Stand it as designed* once Revert is gone), *Show problem areas in the preview* (red = needs support, blue = bridges and small ledges that print anyway, orange dots = thin walls), *Brim width*, *Steepest overhang without support (°)* (default 45), *Longest bridge (mm)* (default 10).
- **Optimize** tries the six axis directions, the ten largest flat-face directions and the current one; keeps the one needing least support (ties within 3% or 2 mm² go to a stable footing, then the current orientation, then more bed contact, then lower). If the result stands poorly it adds a 5 mm brim. The turn applies to the view and every export. Optimize runs in steps behind the busy indicator.

**How it works (core).** Everything is in the print frame (Y up, bed at y = 0).
- *Overhangs:* downward faces steeper than the limit are sampled (up to 16 × 16 per face); from each sample a ray goes straight down through an XZ bucket grid. A point is supported if it is within the first layer (`max(layer, 0.2)`), if an upward face is within half a layer below, or if it is **inside another part**, decided per part (that part's nearest face below points down). The per-part rule matters: the name plate's colour cap sits in the letters, which are sunk into the plate, so "nearest surface below" alone saw the plate top 0.9 mm down and reported 1042 mm² of support.
- *Small steep overhangs:* red faces are drawn onto an XZ grid; a connected patch no wider than the ledge limit (`max(1, 2.5 × nozzle)` mm) prints without support (a decal on a wall, a chamfered lip).
- *Flat ceilings* (normal within 10° of down) are rasterised per height level. Cells next to them that have material just below are anchors. Held on two sides (two or more anchor runs, or 90% of the edge held) and span ≤ the bridge limit → **bridge**; held and sticking out no more than the ledge limit (inscribed width) → **ledge**; otherwise support. Regions under 1 mm² are ignored.
- *Thin walls:* per part, slices at the middle of each level between distinct vertex heights (or 6 evenly spaced for curved parts) plus the first layer; a morphological opening with a nozzle-wide disc on a grid of `max(nozzle/4, extent/1200)`; whatever it cannot reach is thin. Filters: area ≥ 2 × nozzle², length ≥ 2.5 × nozzle (so star tips and corners are not walls), estimated width < 0.95 × nozzle, and the finding must stay thin one layer (≥ 0.25 mm) further up or down (so the rim where a round bottom meets the bed is not a wall).
- *Bed contact:* first-layer slice area and islands; brim reasons as listed above.
- *Brim:* one ring, `max(0.2, layer)` thick, from the first-layer outline dilated by the width, kept out of other colours' footprints, overlapping its own part by about 0.15 mm so they fuse; in the colour with the most plastic on the bed.

**App plumbing.** New state: `printer.overhang`, `printer.bridge`, `model.orient` (3×3 rotation, row order, or `null`), `model.brim`. The sanitiser refuses anything that is not a proper rotation (nine finite numbers, orthonormal, det ≈ 1), clamps brim 0–15, overhang 20–80, bridge 0–60, and forces `mirror` to a boolean. `printedParts()` / `printShift()` / `printBounds()` / `brimPart()` build the print frame (cached by a `partsVer` counter plus `state.model`); `exportParts()` uses them, so **without a turn the export is computed exactly as before**. The size readout, swap heights and filament totals (brim included) use the print frame. `window.MakerForge` adds `print`, `printNow`, `optimize` (async), `revertOptimize`, `exportParts`, `overlay`.

**Bug fixed on the way:** clicking the model to place artwork hit an unscaled, unturned copy of the base mesh, so with the whole-model scale at anything but 100% the artwork landed in the wrong place. The click now goes through the model's real transform.

**Audit tool strengthened.** The model signature now also covers the exported parts (scale, mirror, turn, brim) and, with the `export` tab argument, the printability result and overlay. Scale and Mirror are therefore tested for real instead of being listed as expected. Expected-dead entries can carry a condition: Mirror only on a model measured to be left-right symmetric; the overhang and bridge sliders and the overlay switch only when the model has nothing for them to act on.

**What the survey says** (`tools-print-survey.js`, default settings, test picture dropped in). Clean: tracer, board, canvas, cookie cutter, PCB, lightbox, frame, shell, box, cylinder, hex and presets Iron-on patch, Car badge, Ornament, Tea light, Cookie cutter, Trace a part, Lightbox, Circuit board, Photo frame. Reported, and checked by rendering slices:
- Name keychain and Double-sided tag: one 0.35 mm neck in the plate where the keyring loop meets the body (real; seen with the test canvas's box glyphs, may differ with real fonts).
- Plastic canvas preset: 11 charcoal slivers 0.2–0.35 mm where the star is clipped by the holes (real).
- Bobble head ~1030–1130 mm² and sphere ~2180 mm² of support plus a 12 mm² contact (real).
- Turned vase ~630 mm², all in the bottom 5 mm on the outside: the default profile `0.62 + … sin(π u^0.85)` leaves the bed almost horizontally. Real; see Unfinished.

**Timing** (Node, similar in a browser): a 57k-triangle sphere is analysed in about 0.45 s and orientation search takes about 0.45 s; the 150k-triangle presets take about 2.5 s in the background, longest single step 170 ms; Optimize on the tea light about 6 s in steps of about 0.35 s.

**Verified:** `tools-printability-test.js` (all pass), `tools-printability-app-test.js` (all pass), full smoke test in three chunks with button clicks plus a quick run of all presets and objects (no page errors), audit of all 17 generators plus the Export tab on sphere and box (no findings), both tracer tests (identical to the Session 6 table).

## Session 8: Jigsaw puzzles from a picture, faster and sturdier tracing (v0.13.0)

**What the user gets.** A new object, *Jigsaw puzzle* 🧩 (Start from → From a picture), and two quick starts: *Jigsaw puzzle* (48 pieces) and *Kids' puzzle* 🧸 (12 chunky round-knob pieces, 4 mm thick, with a tray). The active picture becomes the puzzle; without one you get plain pieces. The puzzle prints **assembled, face up**, every piece shrunk by half the gap along its cuts, so the pieces snap apart after printing and the colours line up across the cuts.
- Make tab, Basics: a live preview of the cut over the picture (shaped outlines dim what is cut away; cut lines stop at the outline), a summary line, **Shuffle the cut**, *Pieces (about)* 4–400 (the grid is chosen to keep pieces near square; the readout says e.g. "8 × 6 grid, each piece about 19 × 17 mm"), *Longest side* 40–400 mm, *Outline* (rectangle, rounded corners, oval, heart, hexagon), *Piece colour*.
- *Piece shape*: knob style (classic, round, square), knob size 0.7–1.3, *How different each piece is* 0–100 % (knob position, neck, head, lean, wavy edges and grid-corner jitter), *Cut pattern number* (the seed: the same number always gives the same cut).
- *Thickness and gap*: thickness (default 3 mm), gap (default 0.25 mm; hints below 0.15 and above 0.45), extra first-layer gap (default 0, because slicers already compensate elephant's foot).
- *Picture on the pieces*: printed in colour (colour layer default 0.6 mm on top of the body) or plain; *Print the picture face down* (the model is turned 180° about X, so the picture is the first layers against the bed).
- *Frame or tray*: a frame printed round the puzzle in one go, or a tray (floor plus a wall as tall as a piece) printed beside it on whichever side fits the bed better.
- *Labels on the back*: a grid reference per piece (row letter A–Z without I and O, column number; plain numbers past 24 rows), engraved 0.6 mm into the bottom, mirrored so it reads correctly when the piece is turned over. Each label is placed where its strokes keep at least 0.8 mm of plastic to the piece edge (knob sockets cut deep, so the middle is often wrong), shrinking to 2.2 mm tall before giving up; the checks count pieces left without one.
- *Cut lines and box picture*: a true-scale SVG of the cuts (red 0.1 mm hairlines, for a laser or craft cutter; also written into the export zip as `cad/puzzle-cut-lines.svg`) and a box-lid PNG of the finished picture with faint cut lines.
- Checks: piece count and size; *Knob necks are fragile* (warn under 1.5 mm printed, bad under 1 mm); *Pieces may fuse* / *Loose fit*; *Thin pieces*; the colour layer under two layers; the bed check names the tray when it is the reason the plate is too big.
- Other artwork is never stamped across the pieces (it would glue them together).

**How it works (core).**
- `jigsawCut`: corners on a jittered grid (border corners only slide along the border). Every edge's random shape is drawn up front in a fixed order, so later fixes never change other edges. An interior edge is a chain of cubic Béziers in edge-local coordinates: wavy lead-in, shoulder fillet, neck, head (upper-left and upper-right quarters; the square style stretches the Bézier handles), and back. Sizes scale with the smaller piece side `u` so elongated pieces do not get oversized knobs. A repair pass shrinks any knob that comes within `0.07u + gap` of another edge in its cell (and drops it below 55 % size). Shaped outlines: a knob must stay 0.1u inside the outline, or it is flipped to the other side, or flattened to a wavy cut; cells are measured against the outline (outline points mark every cell they cross, so slivers are never lost) and cells under 45 % of a full piece are merged into the neighbour they share the most inside edge with; a merged piece's outline is walked from its cells' edges.
- Two rings per piece: `rings` (the exact cut, used for tiling, preview and labels) and `fieldRings` (border edges pushed out by `max(2, 0.1u)`), so shrinking by half the gap acts on cuts only and `cut.clip` (the outline, or the full rectangle) gives the exact outer edge.
- `jigsawPiece`: a banded signed distance field of the piece on a grid of `s = clamp(u/180, 0.035, 0.15)` mm (exact distances within the band, sign by scanline, `ringField`), minus half the gap, `min` the outline's field, traced with `fieldToPolys` at 0 (simplification tolerance 0.08 s). The picture's colours are the blurred per-filament masks (`blurMask`) sampled bilinearly and `min`-ed with the piece field, so each colour region ends exactly at its piece's edge and neighbouring colours meet without overlap (tiny gaps only where three colours meet). Colours not present in a piece are skipped; a single-colour piece reuses the body outline.
- App (`buildJigsaw`): async, yields to the page every 60 ms with a progress line on big puzzles. Parts: *Pieces* (base filament, 0 to thickness − colour layer, plus the engraved first slab when labels are on), one *⟨filament⟩ picture* part per colour (thickness − colour layer to thickness), *Frame* or *Tray*. `window.MakerForge.jigsaw` exposes the cut and sizes for tests.

**Measured** (`tools-jigsaw-test.js`): pieces tile the rectangle exactly (areas sum to 15000.0000 mm² for every style at 0/60/100 % variation, 3000 random points each in exactly one piece); the gap measured across the cuts on finished pieces is within 0.019 mm (0.024 at a 0.5 mm gap) of half the gap on each side; the finished puzzle is exactly 150.000 × 100.000 mm; 960 pieces at extreme settings are each one island; oval, heart and hexagon outlines are covered exactly once with nothing outside and no piece under 30 % of a full piece. Timing (Node, similar in a browser): the default 48-piece colour puzzle builds in about 0.9 s, 300 pieces in about 2.8 s; the printability check then runs 1.5 to 3.7 s in the background. The print survey finds no support, no bridges, full bed contact, and 1 to 3 colour slivers of 0.35 mm where a cut crosses a picture edge at a shallow angle (the same class of finding as the plastic canvas).

**Bugs fixed on the way (existing code).**
1. **Latent tracing bug.** `traceField` decided whether a loop was an outline or a hole by sampling one grid node next to the contour; when that node sat exactly on the level (a straight clip edge aligned with the grid, value −7×10⁻¹⁵) a whole region was misread as a hole and silently dropped. The original v0.12 code fails the same way on that input. Closed loops are now oriented from the geometry (each crossing lies on a grid edge with a known inside node); open chains that run off the grid keep the old sampling rule, because for them "inside" is undefined and existing output depends on it.
2. **`traceField` is about 3× faster**: segments are chained by integer grid-edge id instead of formatted coordinate strings. Every object and preset produces byte-identical geometry to v0.12 (29 fingerprints of triangle count and volume per part), `maskToPolys` output is identical on 300 random masks, and both tracer tests print exactly the Session 6 numbers.
3. **Art tab showed dead controls** for objects that turn the picture into the object itself (tracer, cookie cutter, circuit board, lightbox, jigsaw): width, rotation, nudging, "how it prints", outline, sink and pixel squares did nothing. New `ART_USED_BY` lists what each of them reads; the Art tab shows only those plus a note pointing to the Make tab. 13 dead-control findings gone across the five.
4. **Test canvas `stroke`** built and scanned a full-canvas mask per line segment (19 s for one preview of 80 cuts); it now rasterises each segment inside its own bounding box, same shape.
5. **Audit tool**: an empty model counts as expected when the app's notice says why (brightness +80 washes the picture out; the cutter and tracer both explain); *Preview zoom* and the cutter's *Clean up specks* are listed as expected with reasons.

**Verified:** `tools-jigsaw-test.js` (all pass, geometry and app), smoke test in four chunks with every button clicked (`ONLY=jigsaw PRESETS=1`, `ONLY=nameplate`, `ONLY=tracer,board,canvas,bobble,cutter`, `ONLY=turned,pcb,lightbox,frame,shell,box,cylinder,hex,sphere,none`; all passed, no page errors), extremes audit of the jigsaw on the Make, Art and Export tabs, the Art tab of the board, lightbox, circuit board, cutter and tracer, and the Make tab of the tracer and name plate (no findings beyond the expected list), both printability tests, both tracer tests (identical to Session 6), the print survey.

## Session 9: Lithophanes, a faster mesh check (v0.14.0)

Session 9 started from the Session 8 bundle (`build.py` reproduced the v0.13.0 `index.html` byte for byte). Plan items 1 to 3 need a real browser, slicers and phone photos, so item 4 was done.

**What the user gets.** A new object, *Lithophane* 🌅 (Start from → From a picture, and in the object list), and two quick starts: *Lithophane* (flat, standing on a foot) and *Lithophane lamp* 🏮 (a cylinder, 70 mm inside, 80 mm tall). Both set filament 1 to white. The active picture becomes the sheet: thickness goes from *Thickest* (default 3 mm) at black to *Thinnest* (0.8 mm) at white, linearly in the picture's brightness, after the Art tab's brightness, contrast and saturation. Without a picture the build is empty and the app says why.
- Make tab, Basics: a **backlit preview** (transmission `exp(-1.3 t)` per mm, normalised between the thinnest and thickest, gamma 2.2, warm white), a summary line, *Flat / Curved / Lamp shade*.
  - Flat: *Width* 30–250 mm (height follows the picture's aspect plus the border), *Standing on a foot / Lying flat*, *Outline* (rectangle, arch window, oval, heart). A standing oval or heart shows a note that it sits in a cradle and that lying flat uses less plastic.
  - Curved: width along the back, *Curve* 30–240° (hint below 60°: may tip over), outline rectangle or arch.
  - Lamp shade: *Inside diameter* 30–200 mm (hint below 42 mm: LED tea lights are about 38 mm), *Height* 20–250 mm; the picture keeps its proportions, fills the height inside the borders and repeats as many whole times as fit round (the sub-line says how many), each copy centred in its share of the circumference, the gaps thin (bright).
- *Thickness*: thinnest 0.4–3, thickest 1–8 (they keep 0.2 mm apart), *Border* 0–15 mm (solid, as thick as the darkest part), *Corner radius* (rectangle; arch unless curved).
- *Detail*: mm per grid point, 0.15–1 (default 0.3). The grid is capped at 380k points (190k for curved sheets, whose back needs the full grid), which keeps every model under the printability checker's 800k-triangle limit; when the cap applies the sub-line gives the spacing actually used.
- *Hanging hole* (not on the lamp shade): 2–10 mm, centred under the top of the outline with a solid rim of `max(2.5 mm, border)`. Standing, it is a **teardrop** with a 45° roof; lying flat, a circle.
- Checks: *Light areas are very thin* (warn under `max(0.5, 3 × layer)`, with layers and nozzle widths), *A faint picture* (under 1.2 mm between light and dark), and an ok row *Print it at 100% infill*.
- Other artwork is never stamped onto a lithophane (like the jigsaw): an opaque decal would only cast a shadow.

**Printing upright without support.** Standing sheets, curved sheets and lamp shades print on edge, so the relief faces sideways. Where the sheet gets thicker going up (a dark area above a light one, the top border above the picture) the plastic would step out over the layer below. Every grid triangle's upward slope is a pure difference between two nodes in one column, so a per-column pass from the top down, `t[j] = max(t[j], t[j+1] − 0.9 × spacing)`, makes every face at most about 42° from vertical. It thickens the plastic *below* rather than thinning the dark area, so borders keep full strength and the top border gets a chamfered underside. On the photo-like test picture 2.9% of points change; the summary says how much when it is over 0.2%. Lying flat, nothing changes (every face looks up).
- **The foot** (flat, standing): a base 4 mm tall, as wide as the outline plus 8 mm, `clamp(0.22 H, 16, 40)` deep, and above it a slim cradle (thickest + 4 mm) that fills under the outline up to where its underside first gets steeper than 45° (`lithoCradleTop`: the highest gentle, downward-facing outline segment below the middle). Rectangle and arch: 1.2 mm (the corner radius); oval: 16 mm; heart: 40 mm, half its height, because its lower sides stay gentle almost to the lobes. The sheet dips 0.3 mm into the cradle to fuse. The foot is built from three slabs that only touch along vertical faces (the middle one holds the cradle profile): with overlapping pieces the printability checker's ray from a buried corner met the base's upward top face first and reported the sheet's own corners as unsupported. **Overlapping volumes in one part are not a union for `analyzePrint`**; worth remembering for any generator.
- Curved sheets have square bottom corners (nothing to stand in), and the arch outline keeps its round top.
- The survey and the test find **no support** on any of: flat standing (rectangle, oval, heart, arch, with hole), flat lying (with hole), curved (120°, arch at 200°), lamp shade. Optimize leaves a standing lithophane as it is and gives the lamp shade a 5 mm brim (*Tall for its footprint*).

**How it works (core `heightSheet`).** Nodes on a grid (`c` across, `cv` up; j = 0 at the bottom), a thickness per node, an optional signed distance (≤ 0 inside) and `map(u, v, w)`. Each cell is two triangles (diagonals alternate). A triangle is clipped to the inside along the straight line between edge crossings (marching triangles); a crossing is keyed by its grid edge, so both triangles on an edge share it and the sheet is watertight. Boundary walls come straight from the clipping (crossing-to-crossing edges, plus edges on the grid's outer border), so no edge map is needed. `wrap` joins the last column to the first. The app puts the grid half a cell off the outline, so straight edges fall between nodes, and gets exact distances from `ringField` (outline, and the hole as its own field for the rim). Backs: `"grid"` (a copy of the top grid), `"flat"` (for affine maps: the boundary edges chained into loops, grouped into outlines and holes with `groupLoops`, triangulated with earcut; half the triangles), `"columns"` (no outline, straight along v: one tall quad per column, the cylinder). Measured: outline areas within 0.05% (heart −0.04%), a rectangle exactly its size, a wedge's volume within 0.001%, the cylinder and a 120° curve exact to the polygon, flat and grid backs identical in volume. A 150 × 110 mm sheet at 0.3 mm builds in about 0.25 s in Node. In the app, `buildLithophane` took about 0.2 s for the default flat sheet (profiled once, before the flat back halved its triangles); the background printability check then takes about 0.7 s for the default flat lithophane (180k triangles) and 1.2 s for the lamp shade (396k), per the survey.

**`checkMesh` about 4× faster.** It counted directed edges in a `Map` keyed by strings; it now writes each directed edge as one exact number (`a × nv + b`), sorts them and binary-searches the reverse edge. Same counting rule (a removed face still reports 3, a doubled face 6), same volume. 350k triangles: about 1 s → 0.23 s. It runs on every part of every build (`runChecks`), so every generator benefits. All regression tests print the same numbers as before.

**Housekeeping.** Version v0.14.0 (badge and `package.json`); `npm run test:litho`. `package-lock.json` regenerated from `package.json` with `npm install --package-lock-only`: it now says `maker-forge` 0.14.0 with the pinned `devDependencies`; all 53 packages resolve to the same versions as before and `npm ci` installs cleanly.

**Verified on the final build:** `tools-lithophane-test.js` (59 checks, all pass, including the grid cap at 250 mm and 0.15 mm detail: 762k, 758k and 750k triangles for flat, curved and lamp shade), the smoke test in four chunks with every button clicked (`ONLY=lithophane PRESETS=1`, `ONLY=nameplate`, `ONLY=tracer,board,canvas,bobble,cutter,jigsaw`, `ONLY=turned,pcb,lightbox,frame,shell,box,cylinder,hex,sphere,none`; 17 presets, 18 objects, 204 clicks, no page errors), extremes audit of the lithophane's Make tab (no findings). Earlier in the session, after the `checkMesh` change and before two small final edits (hiding one field, skipping decals): the lithophane's Art and Export tabs (no findings), both printability tests, both tracer tests (identical to Session 6), the jigsaw test, the preset survey (the two new presets clean, the rest as in Session 8). A scripted extremes pass over the curved, lamp-shade, hole, oval and heart variants (every size control at both ends) found no open, empty, NaN, off-bed or over-800k builds, and one dead control: *Corner radius* on a curved arch, now hidden.

## Session 10: tracing logos, first real-browser feedback (v0.14.1)

First test in a real browser by the user. Reported: (1) a white logo on a transparent background (a brush-stroke ring with two large letters inside and a line of small text) traced only the ring, no letters; (2) raising the tracer's smoothing made half the ring disappear; (3) Bambu Studio still shows a warning on the Bambu 3mf, but colours load.

**Root causes (reproduced with `tools-tracer-logo-test.js` before fixing: 17 failures).**
1. *Keep only the biggest piece* was on by default, so the ring survived and every letter was dropped.
2. Smoothing was a close then an open with a disc of radius `smooth × px/mm`. The open deletes every stroke thinner than twice that radius, so the thin stretch of the ring was cut, the ring fell into arcs, and rule 1 kept the biggest arc. At 1.2 mm the whole 8 px ring went. The close likewise fused letters closer than twice the radius.
3. Transparency was not understood: transparent pixels read as black. A white logo only worked by luck; a black logo on transparency traced to nothing with either method.

**Fixes.**
- New core `smoothMask(mask, w, h, r)`: close and open as before, then every piece the close added and the open removed is judged by its length (its farthest point from what remains, capped by its bounding-box diagonal, so a lone speck is short). Pieces longer than `r + 1` are features and are put back: thin stretches of a ring, hairlines, the gap between letters, slots. Short bits (nicks, pinholes, specks, whiskers up to about r, corner trimmings) are still smoothed. The tracer uses it; the bracket tests print exactly the Session 6 numbers.
- *Keep only the main piece and what is inside it*: pieces inside the biggest piece's outline (letters in a ring, an i's dot in a hole) are kept if at least *Ignore pieces smaller than* (now always shown, default 0.5 mm², was 4); pieces outside are dropped and the panel says how many ("untick this to keep them"). `tracerInfo.leftOut` counts them.
- Transparency (not in paper mode): if at least 1% of the working image is transparent, *Remove background* uses the alpha channel directly (alpha ≥ 128), and *Brightness* sees the picture flattened onto black or white, whichever contrasts with the median of its opaque pixels. The step-2 panel says the picture has a transparent background. The preview still shows the original picture (`tracerInfo.img`), `tracerInfo.transparent` is set.
- `window.MakerForge.defaults` (the default `state.base`) for tests.

**Bambu Studio warning (investigated in its source, v02.08.04.57 and master; not changed).** Bambu Studio treats a 3mf as its own only when the model's `Application` metadata starts with `BambuStudio-`. For any other file it skips `Metadata/project_settings.config` (`dont_load_config`), keeps geometry plus the per-part `extruder` from `model_settings.config`, and shows the warning *The 3mf is not from Bambu Lab, load geometry data and color data only.* PrusaSlicer and Orca files get the same notice. Claiming to be Bambu Studio would make it apply our three-key config over built-in defaults through `load_config_model`, replacing the user's printer and process presets, so it is not worth removing the notice. Possible improvement, untested: standard 3MF colour groups (`m:colorgroup` with per-triangle `pid`/`p1`) trigger Bambu Studio's colour-mapping dialog for third-party files, which may carry the filament colours across as well; needs checking in Bambu Studio before shipping.

**Verified:** `tools-tracer-logo-test.js` (36 checks, all pass), both bracket tracer tests (identical to Session 6), smoke test `ONLY=tracer` with every button, quick smoke of all 17 presets plus tracer and cutter, extremes audit of the tracer (no findings; *Ignore pieces smaller than* listed as expected on the one-piece test picture), `tools-printability-test.js`.

**Still to check in a real browser:** the reported logo. At 60 mm its small text strokes are roughly nozzle width, so expect a thin-wall warning; a bigger size or leaving the text out helps. Letters inside a ring are separate islands: printed alone they are loose pieces (see Unfinished: a backing plate option).

## Session 11: Project boxes, tracer back plates and covers, bed rulers (v0.15.0)

**User feedback that drove this session:** wants the logo "as is" for their own box designs, a back plate option, hollow covers open on one side, rulers on all axes, a tool for electronics boxes (power bank, PSU) with screw / heat-insert holes and openings for USB, buttons, screens, fans, vents and knobs, and a check that exported sizes are right ("I always have to downsize").

**Size check (done, no bug found).** `node tools-size-check.js index.html`: for the tracer, flat shape, name plate and lithophane, the on-screen size readout, the export parts, the vertices written into the Prusa/Orca 3MF, the Bambu 3MF and the STL all agree to 0.02 mm; the outline SVG declares `width="…mm"`, DXF sets `$INSUNITS=4`. Likely causes of the user's impression: (1) the tracer's typed size is the traced shape only, so anything added around it (a plate margin, their own box) makes the finished object bigger; (2) the lithophane's "Width" is the picture panel, and the stand foot adds 8 mm; (3) the whole-model Scale % in "Size and mirror". Fixes: the tracer now shows **"Finished model: W × D × H"** in step 4 and the new ＋ step, a **"Step 4 size is the whole plate"** option, and bed rulers with the model's dimensions drawn on it.

**Project box / enclosure generator** (object `enclosure`, group "Functional" 🧰; `buildEnclosure`, `enclosureFields`, tables `SCREWS`, `FAN_SPACING`, `BOARDS`, `CUTOUTS`, `ENC_FACES`):
- Walls are flat panels (2D outline with openings as holes → `extrudePolysAt` → `affineSolid` into place); rounded corners are quarter rings in plan; the floor fills the inside. Pieces touch only along faces: every piece is closed; the square open box is exactly walls + floor by volume (34560 mm³).
- Lid printed beside the box (behind it if the bed is too narrow), outside face down; lip as four straight segments that stop short of the screw posts, or a full ring for press-fit lids; lid holes countersunk (90° cone as 0.2 mm steps, each a 45° overhang), counterbored or plain, with a warning and the needed thickness when the lid is too thin.
- Corner posts for M2–M4 heat inserts (4.0 mm hole for M3) or self-tapping pilots, pushed 0.5 mm into the walls so they fuse; board standoffs for Arduino Uno/Mega, Raspberry Pi 5/4/3, Zero, Pico or a custom hole pattern, with fit / post / headroom warnings.
- 30 opening kinds on any of six faces, each positioned by "across" and "height of its centre" (or front-to-back on lid and floor), duplicate / remove / turn 90°, auto-placed clear of others when added. Round wall holes get teardrop tops by default. Openings that don't fit, overlap, or sit on a missing lid are left out with a message; ones behind the lid's lip are flagged. Messages appear on the Openings page and in the checks list.
- Presets: Project box, Power bank box, PSU box, Raspberry Pi case (all closed, no warnings; printability support 39 / 81 / 635 / 100 mm²).
- Sanitizer: enums whitelisted, openings rebuilt through `newOpening` (≤ 80, numbers clamped ±400), table lookups use `encHas` (own keys only: a project with `board:"__proto__"` used to pass `BOARDS[E.board]`).
- Artwork from the Art tab is not stamped on boxes (skipped like the jigsaw).

**Tracer extras** (step "＋ Back plate or hollow cover", `tracerExtras`): "Just the shape" stays the default. Back plate follows the outline (distance field of the hole-filled silhouette, padded, half-pixel corrected), a circle, or a rounded rectangle; margin, thickness, own colour; logo raised, flush inlay (logo fills its pocket to 0.05 %) or engraved. Hollow cover: closed face on the bed, walls of the chosen thickness following the outline (strokes thinner than two walls stay solid). New tracer defaults: `extra, sizeOf, plateShape, plateMargin, plateThick, plateRadius, plateMode, inlay, plateSlot, wall, cap`.

**Rulers** (`makeRulers`, button 📏 `#vRuler`, `viewOpts.rulers` default on): mm rulers along the bed's X and Y (0 at the front-left like printer coordinates) and a Z ruler at the back-left corner as tall as the model; orange dimension lines and labels for the model's width, depth and height (they follow Scale %, Optimize turns and the units setting). Old bed objects and label textures are disposed on every rebuild.

**Tests:** new `tools-enclosure-test.js` (`npm run test:enclosure`: sizes, volumes, 30 kinds × 4 faces, placement warnings, screws/lids/heads, countersink volume, boards, presets + printability, rulers, hostile project) and `tools-tracer-plate-test.js` (in `test:tracer`). All pass, together with the three older tracer suites (numbers unchanged), smoke (all objects and presets), audit of enclosure and tracer (no findings), printability tests. `window.MakerForge` now also exposes `enclosure`, `cutouts`, `newOpening`, `buildEnclosure`, `bedHelper`.

**Not yet checked in a real browser or slicer:** the ruler labels' look at different zooms, and whether the opening sizes match real modules. They are typical datasheet sizes (OLED, LCD, IEC, KCD1, voltmeter especially vary between makers): verify with calipers and a test print of one panel.

## Session 12: a real browser, and many of the 50 ideas (v0.16.0)

Started from the Session 11 files on GitHub (`build.py` reproduced `index.html` byte for byte; the full smoke test passed in 3.5 minutes in one go, so the chunking advice in Session 6 does not apply to this environment). The user asked for the browser check, gave PrusaSlicer a low priority, and asked to work through the ideas list and the unfinished items.

**Real-browser check (`tools-browser-check.js`).** Chromium via Playwright, with software WebGL (SwiftShader). Google Fonts are fetched through Node (`route.fetch()`), so a proxy that re-signs TLS does not break them; offline the app falls back to system fonts. 136 screenshots on the first run, no page errors. What it found, all fixed:
1. **Name plates with charms were broken in real browsers.** The plate canvas left room for the border, the keyring tab and end caps, but not for charm symbols or a picture beside the name. With real glyphs the heart's border ran off the canvas, `traceField` returned the clipped outline as open chains, and closing each chain with a straight line made three crossed fragments: holes in the plate under the letters, 145 mm² of "support" for the default Name keychain. jsdom's box glyphs hid it (though even there the plate was clipped by 0.3 mm: `tools-size-check.js` now reads 111.33 mm wide instead of 111.03). Fixed twice over: the canvas pads for charms and pictures, and **`traceField` can close a region that reaches the grid's edge along that edge** (`closeEdges`, passed through `fieldToPolys` and `maskToPolys`; it traces a copy with a ring of outside nodes, so the outline runs along the outer edge of the last pixel). It is opt-in, used by the name plate and the tracer only: the first version was on for everything, and the survey diff showed every picture decal (box, cylinder, turned, plastic canvas) gaining a slab in the picture's background colour, because a background covering the image border used to trace to no outline at all and the decals rely on that. For the tracer this clears the old known issue about a part that runs off the edge of the photo. The tracer now also catches "the background was picked" (over half the border) before tracing, since it would otherwise print a frame. `tools-jigsaw-test.js` checks both behaviours on a C-shaped mask and a frame.
2. The name's inset **top colour layer** left 0.35 mm slivers where script strokes are thin: it is now opened by just over half a nozzle. The default Name keychain now reads no support and no thin walls with real fonts.
3. The **check pill** was hidden behind the view buttons on every screen (it drops below them when they would meet); the **view buttons ran off a phone screen**; the **camera** framed a sphere around the origin, so wide models had their size labels cut off (it now frames the model plus its labels, centred, for the narrower of the two view angles, and shows the bed when nothing is built); the **top view** was turned 45°; a **notice** about the previous object stayed up after switching; **slider hints** ("Inside: …") and the **tracer's preview** showed the previous build until the next re-render (both refresh after every build; box warnings re-render the page unless a field has focus).

**Printability fixes found on the way.** A face exactly at the overhang limit (a 45° teardrop roof) was flagged because of rounding in its normal (tolerance 1e-4 now). `sliceMask` computed each triangle's crossing from either end of a shared edge, and chose the rows a segment covers with rounding that could skip the row through its end point, so a row through a vertex could flip inside-out: that made the PSU box lid's two "0.2 mm thin walls" (false). Both fixed; see the survey below for what moved.

**Project box** (all in `buildEnclosure`, tests in `tools-enclosure-test.js`):
- **Labels** beside any opening (idea 2): per opening text (capitals, digits, `- + / . : %`), below or above; size, line width and depth for the box. Cut into the outside of walls, lid (face down, so they are its first layers) and floor (reads with the box turned over). Letter counters stay as islands. Labels that do not fit or would hit an opening, post, foot or screw head are left out with a message. The Power bank box preset carries IN, OUT, CHARGE and POWER.
- **Magnet lid** (idea 9): solid corner posts with a pocket on top, matching pockets in the lid, eight magnets (5 × 2 to 12 × 3); warnings when the lid or the box is too thin.
- **Rubber-foot recesses** (idea 12): four pockets under the floor, 8 / 10 / 12.7 mm, depth set; the panel explains that a recess wider than the bridge limit is flagged but prints.
- **Pointed tops** (idea 44) for ports and plain rectangles in walls, offered with a note when the top edge is wider than the bridge limit; snap-in parts (rockers, IEC, voltmeters) are excluded because they clip onto the flat edge. Rounded port holes in walls get **square top corners** (with "print-friendly tops", the old teardrop switch): the plug still fits and the top is a clean bridge. The stock Project box went from 39 mm² of support to 0.
- **Notches** (idea 12, cable exits): a rectangular wall opening can run to the top edge; the lid's lip gets a gap there. The Raspberry Pi case's port side is now a notch: 106 mm² of support to 0.
- **Sliding lid** (idea 4): side walls end under the lid, 45° dovetail rails along them, the front wall lowered, the back wall stops it; the lid is a stack of 0.2 mm slabs stepping in at 45°, printed top up, with a finger notch; square corners only. The test checks the lid clears the rails by exactly the fit gap.
- **Logo on the lid** (idea 1): the active artwork split into the loaded filaments like a decal, inlaid flush into the lid's outside face (its first layers, so crisp and support-free) or engraved; colours matching the lid or the picture's background stay lid. Width, position, depth; left off with a message when it would overlap an opening or run off the lid. The Art tab now says what boxes do with artwork and offers "Put it on the lid".
- **Fit test** (idea 46): a tick box builds a small box with the same walls, lid, lip, screws or magnets, and one of each different opening (wall openings at their real heights, labels included).
- Floor openings keep clear of posts, board standoffs and feet (old known issue).

**Tracer:**
- **SVG files** (idea 20, partly): drawn from their viewBox at 2000 px on the long side (they used to come out at their nominal pixel size, or blank without a width), and a size stated in mm, cm, in or pt is kept: step 4 offers "The file's own size". Measured in Chromium: a 40 × 20 mm plate with a 6 mm hole traced at 39.994 × 19.981 mm, hole 5.994 mm. Paths are still rasterised, not read as vectors.
- **Thicken lines thinner than** (idea 23): the centre lines of strokes narrower than the minimum are widened to it; thick areas unchanged.
- **Keep its colours** (idea 26): the traced shape becomes a body in the object filament with a face (0.6 mm) in the picture's colours, each clipped to the outline; on the shape alone or raised on a back plate.
- **Holes in the back plate** (ideas 16, 17): a hanging hole, a keychain loop on a tab over the top edge, or two / four countersunk screw holes, placed where they clear the shape; the panel says how much more margin is needed when they do not fit.

**Name plates from a list** (idea 42): "A list of names" on the Make tab; each line (or a pasted spreadsheet row's first column) becomes a plate with the current settings, packed in rows on the bed, one part per role and filament. Each name's plate is cached while the settings stay the same, so editing the list only builds the new names (about 1.5 s per name in headless Chromium). The Export tab's "one 3mf per name" still works and is pre-filled from the list.

**View tools:** a **measuring tape** (idea 28, ↔): two clicks, the corner nearest the click within 12 px is taken exactly, distance and x / y / z shown; a **section view** (idea 29, ✂): a slider cuts the model at a height (clipping plane, inside faces shown); **inch rulers** (idea 32) when the units are inches.

**Share link** (idea 49): Export → Share a link copies the project (pictures left out) deflated into `#p=` after the address; opening it goes through `sanitizeProject`, the hash is cleared, and Undo returns to what was there. A Power bank box link is about 2,900 characters. From a `file://` copy the link only works on that computer; it is for a hosted copy.

**Other unfinished items done:** lithophane **test strip** (a fourth shape: steps 0.6 to 3.2 mm by default, numbered on an engraved rail in tenths, with a preview and instructions); the turned **vase profile** leaves the bed at about 35° instead of flat (`sin(π u)` instead of `sin(π u^0.85)`) and its neck eases in over the top half (a smoothstep instead of a straight taper over the last fifth), so the inside of the default vase never leans over more than about 37°: 633 mm² of support to none (5 mm² with a picture decal on it). The first try changed only the start and moved the support up into the neck (1,516 mm², the inside of the taper at 46°); the survey diff caught it; a **"Turned for printing"** note with "Stand it as designed" in the Make tab's Size and mirror group; `window.MakerForge` adds `camera`, `controls`, `shareLink`, `measure`.

**Verified** on the final build: full smoke test with every button (21 presets, 19 objects, 244 clicks, no page errors); audits of the box (25 controls), tracer (18), name plate (18), lithophane (9) and turned shapes (8) with no findings; the printability, tracer (all four), project box, lithophane, jigsaw (82 checks) and size suites all pass. The browser check: 135 screenshots, no page errors, no layout findings, and every browser-only feature measured as expected (SVG 39.994 × 19.981 mm, tape 92.000 mm, section 18.0 mm, a 2,891-character share link, three names as three one-piece plates).

**Print survey, Session 11 build against this one** (`node tools-print-survey.js`, the badge picture loaded). Only these lines change, all for the better: name plate and Name keychain / Double-sided tag lose their one "thin wall" (the clipped plate); the turned vase 633 → 5 mm² of support (the 5 is under the picture decal's lower edge, where the vase leans in); Project box 39 → 0 (it gains one bridge, the square top of a port); Power bank box 81 → 27 mm² (its labels add 10 small ledges); PSU box 635 → 603 mm² and its two false thin walls gone; Raspberry Pi case 100 → 0. Everything else, including every picture decal, reads exactly as before. With real fonts in Chromium the default Name keychain went from 145 mm² of support and 11 thin walls to none.

**Still needs a real check:** Firefox and Safari (only Chromium was run); a slicer and real prints of the sliding lid (rail fit), the magnet pockets (press fit), labels at the default 0.6 mm line width, the fit-test box, the lithophane test strip and the smoothed vase; share links from a hosted copy (tested only from the local file in Chromium).

## Session 13: colour painter, phone cases, 39 printers, easy reading (v0.17.0)

The user asked for: all bugs seen on the way fixed, performance and stability, many more printers (theirs is a Bambu Lab **X2D**), phone sizes researched for a phone case tool, 50 new ideas, the next big tool (automatic and manual **colour painting** of any model, including imported ones, in up to 8 colours, by height and more), a reset-to-default for sliders, and an app that is easy to read and find things in, with accessibility as a priority.

**Colour painter (Paint tab).** The paint is a list of steps, replayed in order after every build (`applyPaint` in the rebuild, `repaint` when only the steps change), so it follows the model when a setting changes, and it is undoable like everything else. Steps: height bands (2 to 8, edges cut into the mesh, "line up with the layers"), a colour fade (every layer in a range is one of two filaments, the second one's share rising evenly by error diffusion), stripes, tops / walls / undersides by angle, separate pieces (largest first), smooth areas split at sharp edges (neighbours get different colours when the palette allows; tiny areas join their neighbour), a picture from the Art tab projected from the front, back, sides or top (split into the loaded filaments like the decals), random blobs (value noise, a pattern number), swap one colour for another, and by hand: brush (radius, only the side facing you, mirror to the other side), fill (a smooth area up to an edge angle, or the same colour) and eraser. Keys 1 to 8 pick a colour, [ ] the brush size, B F E V the tool. While painting, the left button paints and the right button turns the view; on touch screens one finger paints, two move ("Turn view" switches back). Brush strokes paint live (only the touched triangles are recoloured), then the whole list is replayed.
- **Mesh:** triangles are painted whole, so `meshEditor` splits the model: longest-edge bisection until no edge is over 1.2 mm (Normal; Coarse 2.5, Fine 0.6; automatic uses none unless a brush, fill, picture or blob step needs it; at most 900,000 triangles, the detail is lowered with a message beyond that), and cuts along every band height. Each split puts one vertex on the shared edge and cuts both triangles, so the mesh stays closed with exactly the same volume (tested on a cube, a revolved ball, and every auto step on the vase). The refined mesh is cached per original solid and key, so strokes and colour changes never redo it; imported models are welded once per file and scale.
- **Files:** painted triangles get `paint_color` (Bambu Studio, OrcaSlicer) or `slic3rpe:mmu_segmentation` (PrusaSlicer, whose 3mf also sets the triangle's base material) with PrusaSlicer's TriangleSelector code for a whole triangle: filament 1 "4", 2 "8", 3 to 18 "0C" to "FC". The OBJ groups faces by colour under `usemtl`. STL has no colour. The export README says so. Checked in Node (round trip, codes) and in Chromium (a painted vase exported as a Bambu 3mf and opened again: every triangle kept its filament). **Not yet opened in a real slicer.**
- **Import:** STL, OBJ (polygons fanned, negative indices) and 3MF (every .model file in the zip, components with `p:path` as Bambu keeps them, build transforms, triangle paint; the filament colours from `Metadata/project_settings.config` go into the slots). The painting of a 3mf is kept as "imported paint" under the steps. JSZip does not run in jsdom's realm, so 3mf import is only tested in the browser check.
- The colour count check counts painted colours; the Paint page shows each colour's share of the surface.

**Phone cases** (`buildPhoneCase`, 75 phones in `PHONES`, `phoneSpec`). Heights, widths and thicknesses are from the makers' spec sheets (searched in September 2026: iPhone SE to iPhone 18 Pro Max and iPhone Air, 17e; Galaxy S23 to S26 incl. Ultra, Edge and FE, A16 to A57; Pixel 8 to 11 incl. a-models; OnePlus 13 and 15, Xiaomi 15 and 17, Nothing Phone (3)). The corner radius, camera opening (seen from the back), camera bump and button positions are estimates by family, shown and editable on the pages with a note to check them with a ruler. Pixel 11 Pro and Pro XL are left out: the sizes found were inch conversions. The case prints back down: the back is a flat plate (a field traced with `fieldToPolys`, camera opening subtracted), the wall is one `heightSheet` wrapped round the outline over (arc length, height), with its rows placed exactly where the profile turns, so button and port openings are exact rounded slots, the bottom edge is a 50° chamfer, and under the lip a 45° slope carries all but the last 0.8 mm (a ledge that narrow prints; the checker agrees). Options: gap, wall, back, lip and its thickness, rounding, full case or bumper, a **fit test rim** (the wall alone), one hole per button or one long slot a side, charging port / port and speakers / closed, the camera opening and its margin, and a picture inlaid in the back (reuses the project box's `encLogo`, mirrored so it reads from the back). What remains flagged: the tops of the button openings (short bridges, 114 mm² on the iPhone 17 Pro).

**Printers.** 39 printers grouped by maker (`brand`, a `note` shown under the picker), the build height is editable, and your printer is remembered in this browser (`makerforge.printer`) and used for new projects and Start over. Bambu X2D: 256 × 256 × 260 mm single nozzle (about 235.5 mm wide with both nozzles), 5 filaments in the usual combo (4 in the AMS 2 Pro plus a spool on the second nozzle). The table's comment gives the sources' date; "colors" follows the usual combo and is editable.

**Easy reading and finding things.** The **Aa** button: text and buttons 100 to 175% (CSS `zoom` on the panels, the app bar and the view's overlays, not on the 3D canvas; the start sidebar steps aside at 130% and over on narrower screens), high contrast (stronger text, lines and focus rings in light and dark), extra clear letters (Atkinson Hyperlegible, loaded only when chosen), messages for longer or until clicked, messages read aloud, less movement. 🔊 in the panel header reads the open page aloud (title, help, every label with its value, notes). Arrow keys move along the tabs and the page icons. Every slider gets **↺ default** when it is off its default: `findDefault` finds which number a field shows by swapping candidate numbers for a marker for a moment (this object's settings, the model, the printer's spec, the selected artwork, box openings) and reads the same place in a fresh project; fields with computed getters get none. Each page with two or more such sliders has **Reset this page**, and the Make tab's first page **Start this … over**.

**Bugs fixed on the way.**
1. **Reopening a project changed settings.** `sanitizeProject` clamps numbers by key name (`LIMITS`), and four keys meant something else elsewhere: charm size and picture size (0.4 to 3) were raised to 1, the artwork outline width (0.2 to 6 mm) to 5 mm, and the plastic canvas's 120 pixels across cut to 90. Every reload of an autosaved project did it. `LIMITS_AT` now holds limits by parent and key; paint steps are cleaned by `cleanPaint` instead.
2. A project key such as `toString` looked up `LIMITS[k]` on the prototype and turned its number into NaN (now `hasOwnProperty`). A printer model `"__proto__"` passed the model check (now `encHas`).
3. Printer nozzle, layer height and flow in project files were not clamped (now `cleanPrinter`).
4. Removing a filament left paint steps pointing at the wrong colour (now remapped; the removed one goes back to the part's own colour).
5. **Project box holes looked oval** (reported by the user with a screenshot of a 382 mm box with a 120 mm fan): every round hole in a wall was a teardrop by default ("print-friendly tops"), which reads as a misshapen oval, most of all on a big fan opening. Round holes are round now; the pointed tops are an option ("Pointed tops on holes in the walls", off). Projects saved before v0.17 (file format below 5) open with round holes, since that option was on for everyone. The cost: the tops of round holes show as a little support in the check (Project box 0 → 41 mm², Power bank box 27 → 74, PSU box 603 → 652); printers bridge holes this size without trouble.
6. **An opening bigger than its face disappeared** (the user picked a 120 mm fan for a 75 mm tall side): it was left out with a message only on the Export tab. Now changing an opening's size, kind, face or turn grows the box just enough and slides the opening into place (`encGrowToFit`, notice "The box grew from … to … mm, Undo puts it back"; "Make the box bigger when an opening does not fit" turns it off). An opening that still does not fit gets a "Not in the box yet" card with a **Make it fit** button, and stays in the checks.
7. **A board bigger than the box left its standoffs standing outside the box** (a Raspberry Pi in a 50 × 40 mm box came out 67 mm wide). The standoffs are left out until the board fits, the warning gives the smallest box, and picking a board (or turning it, or changing its size or standoffs) grows the box round it.
8. The phone case's camera opening running off the phone is now said, not silently cut.
9. "↺ default" on a box opening could show another opening's value: `findDefault` matched the openings list by position against the default box's. Lists (`cut`, the phone's `btn`) are no longer probed; openings are matched through `newOpening` only, and their positions have no reset.
10. "Start this object over" and "Remove all paint" act at once with a message that Undo brings things back, instead of a pop-up (easier with big text or a screen reader; jsdom has no `confirm()`, which the smoke test caught).
11. **Opening a 3mf lost each part's filament** (found by the browser check's painted-3mf round trip). Only the per-triangle paint was read, so a file whose parts print in different filaments (a picture decal, a lid, any multi-part Bambu Studio project) opened with every unpainted part in filament 1. `parse3MFModel(files, main, cfg)` now reads the slicer's settings: Bambu Studio / OrcaSlicer `Metadata/model_settings.config` (an extruder per object and per part, the part id being the component's object id) and PrusaSlicer `Metadata/Slic3r_PE_model.config` (per object and per volume, a volume being a triangle range); an unpainted triangle takes its part's filament. Filament colours come from Bambu's `project_settings.config`, else PrusaSlicer's `Slic3r_PE.config` (`extruder_colour`, then `filament_colour`), else the file's `<basematerials>` colours. A filament the file uses beyond the project's list is added (with a stock colour when the file gives none), up to 8.
12. **A share link of a project box opened a slightly different box**: the lens filament (`lensSlot`) was missing from the box defaults, so loading the link added it. It is in `DEFAULTS.enclosure` now. The browser check caught it (it compares the whole box state).

The browser check's round trip had two faults of its own, fixed: it counted only painted parts (an unpainted part's triangles print in the part's filament, which the file stores per part, not per triangle), and it read the model back 0.6 s after choosing the file. Opening that 217,000-triangle file takes about 1.4 s of script in Chromium; in this container the whole import took 5 to 23 s, nearly all of it software rendering (SwiftShader, no GPU). It now waits for the import, counts the filament every triangle prints in, and leaves out the fresh decal that a picture still on the project puts on the opened model.

**Pilot lights (the user asked for traditional dashboard pilot lights wherever an LED goes).** New opening kinds, first in the list: **Pilot light, printed jewel lens** for a 5 mm or 3 mm LED (holes 8 and 6 mm plus the clearance), chrome-bezel LED holders for 5 and 3 mm LEDs (holes 8 and 6 mm), metal pilot lights 8, 10, 12, 16 and 19 mm and the 22 mm AD16-22 dashboard lamp. The bare LED holes are still there ("bare hole"). For every printed pilot light that made it into the box, one jewel lens is built (`buildEnclosure`, after the lid): an octagonal flange that stops it inside the wall, a shank as long as the wall is thick whose corners stay inside the hole, a faceted dome narrowing to a small flat, and a pocket for the LED from the back that stops where the narrowing dome would leave less than 0.9 mm of wall round it; all eight-sided, printed flange down in a row in front of the box, in "Filament for the pilot light lenses" (`lensSlot`). No lenses in the fit test. The Project box and Power bank box presets use printed pilot lights now (the power bank's four charge lights are 10 mm apart instead of 6). With pilot lights the survey reads Project box 45 mm² of support and Power bank box 91 (41 and 74 with the bare LED holes): the tops of the bigger round holes; each lens only has a small bridge over its LED pocket. A printed pilot light's hole is never smaller than its lens (`lensMinHole`: 7.8 mm for a 5 mm LED, 5.6 mm for a 3 mm one, before the clearance), and its Diameter slider starts there.

**Caught by the final survey:** the first version of the lens ran the LED pocket up to 1.2 mm under the lens's top. The dome narrows faster than that, so the 5 mm lens's pocket came out through the side of the dome (the revolved profile crossed itself: still a closed mesh, so `checkMesh` passed, but the printability check saw 22 mm² of "support" inside the lens) and the 3 mm lens kept 0.14 mm of wall there. Fixed as above (the Project box's survey line went from 67 to 45 mm², the pocket's roof now read as a bridge); `tools-enclosure-test.js` now casts horizontal rays from each lens's axis (every 0.05 mm up, 16 directions) and requires them to go in and out of the plastic in turn, end outside, and cross at least 0.75 mm each time (0.86 and 0.87 mm now; the old lens fails with 272 bad rays and 0.03 mm).

**Verified on the final build** (commit 32416b1; the documentation commits after it change no code):

- **Smoke test:** full, with every button (22 quick starts, 20 objects, 5 tabs, 328 clicks, no page errors).
- **Test suites, all passing:** `tools-paint-test.js` (75 checks), `tools-phonecase-test.js` (25; the first check builds all 75 phones), `tools-enclosure-test.js` (84, including the lens walls, the too-small hole and the hostile lens filament), both printability tests (83), all four tracer tests (59 checks; the bracket measurements are the same as in Session 6), `tools-lithophane-test.js` (59) and `tools-jigsaw-test.js` (82).
- **Size check:** readout, STL, 3mf and Bambu 3mf agree.
- **Audits:** phone case (19 controls), turned shapes (8), project box (26), tracer (18), name plate (18) and lithophane (9). No findings beyond the expected list, which now includes the box's grow switch when every opening already fits.
- **Print survey:** the same as the lens-fix build. Against Session 12: Project box 0 → 45 mm² and Power bank box 27 → 91 (round holes and pilot lights); PSU box 603 → 652 (round fan holes); the new Phone case reads 114 (the tops of the button openings); everything else unchanged.
- **Real-browser check** (`PRINT=1 MOBILE=1`): 150 screenshots with no findings, no page errors and web fonts loaded. The browser-only features measured as expected: an SVG at 39.994 × 19.981 mm, the tape at 92.000 mm, the section at 18.0 mm, a 3,197-character share link that opens the same box, and three names as three one-piece plates. The painter test drew a 7-point brush stroke with the mouse, and a painted Bambu 3mf read back with every triangle's filament.
- **Not checked:**
  - a painted 3mf opened in Bambu Studio, OrcaSlicer or PrusaSlicer;
  - Firefox or Safari;
  - a printed phone-case fit-test rim;
  - a printed pilot-light lens.

### 50 ideas for next sessions (tools we are working on now)

Status checked against v0.30.0 (2026-10-24): 16 done, 11 partly done, 23 open.

**Project box**
1. Logo on the lid: pick an artwork and emboss, engrave or inlay it (reuse the tracer's flush-inlay code) in a second colour. (done, Session 12: inlay or engraved; not embossed, the lid prints face down)
2. Text labels next to openings ("USB-C", "ON/OFF", "12V") engraved 0.4 mm into the wall, one field per opening. (done, Session 12)
3. Snap-fit lid: flexible cantilever hooks on the lip and matching windows in the walls, no screws. (open)
4. Sliding lid: grooves in two walls, a lid that slides in, optional finger notch and end stop. (done, Session 12; no end stop yet)
5. Hinged lid: print-in-place pin hinge along the back edge, printed as one piece with clearance. (open)
6. Board ghost: draw the chosen board (and its USB, HDMI, header positions) as a see-through preview in the box, and one-click "add openings for this board's ports" that lines them up automatically. (open)
7. Import a board outline and mounting holes from a KiCad `.kicad_pcb` or a Gerber edge-cuts file. (open)
8. Battery bays: 18650 / 21700 / AA / 9V holders with spring slots and wire channels, as a floor insert. (open)
9. Magnet pockets in the corners of the lid and box (6 × 3, 8 × 2 …), sized for press-fit with a glue gap. (done, Session 12: magnet lid)
10. Gasket groove for a TPU seal and a separate printable TPU gasket: splash-proof boxes. (open)
11. Wall-mount tabs and DIN-rail clips on the back; a VESA 75/100 pattern for screens. (partly: a wall-mount keyhole is one of the box's openings; no tabs, DIN rail or VESA)
12. Feet: rubber-foot recesses in the floor, or printed feet with a chamfer, and cable exit notches in the wall top edge. (done, Session 12: foot recesses and notches to the top edge; printed feet not done)
13. Split tall boxes into rings that stack and screw together when the box is taller than the printer. (open)
14. Ribs and bosses anywhere: click on a wall to add an M3 boss or a PCB guide rail (card-guide slots for boards that slide in). (partly: standoffs for the chosen board; no bosses or guide rails placed by clicking)
15. Knob generator: printed knobs for 6 mm D-shaft and 18T knurled pots, with a pointer line, in the second colour. (open)

**Tracer**
16. Hanging hole, keychain loop or bail on the back plate, placed automatically where there's room. (done, Session 12: hole and loop; no bail)
17. Screw bosses and counterbored mounting holes on the back plate (reuse the enclosure's SCREWS table). (done, Session 12: 2 or 4 countersunk holes; no bosses yet)
18. Reference object scaling: a coin or credit card in the photo sets the scale (known sizes built in). (open; the tracer scales from a sheet of paper instead, Session 6)
19. Multi-level tracing: several brightness bands become stacked layers, each its own height and colour. (open in the tracer; the Lightbox's layered paper-cut shadow box does something like it for pictures)
20. SVG import: skip the photo and trace a real vector logo exactly. (partly, Session 12: drawn sharp at 2000 px with its real size; still rasterised, not read as paths)
21. Stand for the traced shape: a slot base so a logo stands on a desk. (open)
22. Mirror-pair export: part and its mirror image side by side (left and right brackets). (open; only the double-sided name plate has a mirrored copy)
23. Stroke-thicken for logos with hairlines: minimum line width so nothing prints thinner than two perimeters. (done, Session 12)
24. Cookie-stamp mode: the traced logo as a raised stamp with a handle on the back. (open; the cookie cutter has no stamp)
25. Hollow cover with a lip or snap ring so it clicks onto the thing it covers; "fits over an object of W × D" mode where the inside, not the outside, gets the typed size. (partly, Session 11: the hollow cover; no lip, snap ring or sizing by the inside)
26. Keep the colours: trace each colour of a multi-colour logo to its own part and filament slot. (done, Session 12: a coloured face on a body)
27. Live caliper overlay: show the measured dimensions on the picture as you hover edges. (partly: the tracer's table gives sizes between fitted edges, the way calipers measure; nothing live on hover)

**Rulers and measuring**
28. A measuring tape tool: click two points on the model, get the distance (and angle). (done, Session 12; no angle yet)
29. Section view: a slider that cuts the model at a height to show wall thickness and internal posts. (done, Session 12)
30. Ghost of a reference object on the bed (a credit card, an AA battery, a hand) for instant scale. (open)
31. Grid snapping in the enclosure: drag openings on a 2D face view with snapping to 0.5 mm and to other openings' centres. (open: openings are placed by typing their position)
32. An inch ruler when the units setting is inches. (done, Session 12)

**Lithophane**
33. Colour lithophane (CMYK-style layered filament swap) for printers with an AMS. (open)
34. Heart, circle and hexagon night-light boxes with a built-in LED tea-light holder. (partly: the Lithophane lamp, a cylinder that sits over an LED tea light, and heart and oval outlines on flat lithophanes; no closed night-light boxes)
35. Moon and globe lithophanes (sphere mapping) with a stand. (open)
36. Frame for a flat lithophane with a slot for an LED strip and a USB-C opening (reuse the enclosure openings). (partly: the Lightbox prints a backlit picture in a frame whose stand has a channel for an LED strip; no frame for a lithophane, no USB-C opening)

**Jigsaw, name plates, flat shapes**
37. Jigsaw puzzle box: a lid with the picture on it and a tray (reuse the enclosure lid). (partly: a tray or frame can print with the puzzle; no lid with the picture)
38. "Missing piece" gift puzzle: one piece with a personal message on the back in a second colour. (partly: each piece can carry an engraved grid reference; no message on one piece)
39. Name plate with a USB-C cable holder or a magnet pocket for the fridge. (open; the bobble head has a magnet pocket, name plates don't)
40. Door sign with screw holes and a keyhole on the back. (open)
41. Coaster set generator: flat shape + artwork + cork recess on the bottom. (partly: a hexagon coaster quick start; no cork recess, no set)
42. Batch name plates from a CSV (a class, a wedding): one plate per name, packed onto the bed. (done, Session 12)

**Printability and export**
43. Auto-orient for boxes: choose the face that needs the least bridging for each lid and panel. (partly: Optimize turns the whole model for printing; not per lid or panel)
44. Bridge-aware openings: when a wall opening is wider than the bridge limit, offer a pointed or arched top automatically. (done, Session 12: pointed tops, square-top port holes, notches)
45. Per-part print settings in the 3MF (for example 100 % infill on screw posts, a modifier volume for insert bosses). (open)
46. Print a test coupon: a small plate with the chosen insert hole, a USB-C cutout and a lid-lip sample, to dial in fits before printing the box. (done, Session 12: the fit-test box)
47. Export a PDF assembly sheet: dimensions, screw list (4 × M3 × 8 countersunk, 4 inserts), and a picture of each face. (open)
48. Bambu colour mapping: try `m:colorgroup` in the 3MF so Bambu's filament mapping dialog appears. (researched in Session 30, not done: Bambu Studio's import of such colours was still buggy)
49. Share link: pack the project into a URL so a friend can open the same box. (done, Session 12: pictures left out)
50. A community parts library: the CUTOUTS table as a JSON file users can extend (their own modules, with photos), imported and exported from the Project tab. (open)


### 50 more ideas (Session 13)

Status checked against v0.30.0 (2026-10-24): 15 done, 11 partly done, 24 open.

Painter
1. Colour AI-generated models: read OBJ vertex colours and GLB/glTF textures, then quantise to the loaded filaments. (done, Session 20)
2. Wrap a picture round a model (cylindrical and spherical projection), not only straight through it. (done, Session 18; pictures on objects wrap too since Session 34)
3. Export sub-triangle paint (TriangleSelector split trees) so edges are exact without refining the mesh: smaller files. (open)
4. A layer preview: slide through the heights and see each layer's colours, with the number of colour changes. (done, Session 18)
5. A purge and waste estimate per printer type (AMS, CFS, tool changer), and a "fewer changes" option that merges thin bands. (partly, Session 18: the purge and waste estimate; no "fewer changes" option)
6. Height bands as colour-change pauses (M600) for single-nozzle printers without an AMS, exported per slicer. (done, Session 30)
7. A box select: drag a rectangle on the view to paint everything inside it (front faces or all the way through). (done, Session 18, with a lasso too)
8. Radial symmetry (4, 6, 8 ways) for mandalas and vases, and front / back mirroring. (done, Session 18: radial symmetry and a mirror)
9. A brush that stops at sharp edges ("magnetic"), and a soft brush that paints only faces within an angle of the first. (done, Session 18: the smart brush)
10. Colour by curvature (edges and hollows darker) for weathered, stone and wood looks. (done, Session 18)
11. Named paint layers that can be hidden and shown, and strokes grouped per layer. (done, Session 30: named steps that can be hidden)
12. A BVH for raycasting, so brushing a million-triangle model stays smooth. (done, Session 22)
13. Keep paint when the imported model is scaled or mirrored (paint in model space: it already follows scale; check mirror). (done, Session 30)
14. Paint by picking a colour on the model (eyedropper) and "select all of this colour". (done, Session 18)
15. Save the imported model inside the project file (compressed), so a painted import reopens without the original file. (done, Session 19: a saved project file keeps the model; the autosave and share links leave it out)

Phone cases
16. Flexible button covers (raised TPU bumps) instead of holes. (open)
17. A raised camera guard ring printed with a 45° inside chamfer. (open)
18. A MagSafe ring recess in the back, and a strap loop or lanyard holes at the bottom corners. (open)
19. A card pocket on the back, and a print-in-place kickstand. (open)
20. Measure a phone that is not in the list from a photo on paper (the tracer's paper scaling), camera included. (open)
21. Exact camera and button positions from Apple's and Samsung's accessory design guidelines, checked with real phones. (open)
22. Tablets (iPad, Galaxy Tab), e-readers and game controllers. (open)
23. Grip textures on the sides and a name engraved or painted on the back. (partly, Session 31: a picture or name inlaid or engraved in the back; no grip texture)

Printers and slicing
24. Dual-nozzle beds: narrow the bed automatically when both nozzles are used (X2D, H2D, H2C), and show exclusion zones (the A1's purge area). (partly: the X2D's notes say both nozzles narrow the bed to about 235 mm; not applied, no exclusion zones)
25. Put the printer and plate settings into the 3mf, so Bambu Studio and PrusaSlicer open with the right printer. (open: Bambu Studio ignores a third-party file's settings, Session 10)
26. A "my spools" library: brand, colour code, material and price, used for the palette and cost. (partly: each filament has a name, material and price per kilo; not kept as a library between projects)
27. Material presets that set fit clearances (TPU cases, PETG boxes, PLA snap fits). (open)
28. Test one painted export in each slicer from the command line (PrusaSlicer and OrcaSlicer both have a CLI) in the test suite. (open)

Easy to use
29. A guided mode: a few big questions (what, for whom, which colours) that set everything up. (open)
30. Describe the model in words for screen readers (size, parts, colours, warnings) and announce each finished build. (partly: messages are announced to screen readers and can be read aloud; no description of the model)
31. Keyboard control of the 3D view (arrows turn, + and − zoom) with a visible focus ring on the view. (open)
32. A search box for settings. (open)
33. Colour-blind friendly palettes and a pattern overlay in the view to tell filaments apart. (done, Session 18)
34. A tablet layout with bottom sheets and bigger touch targets. (done, Session 21)
35. An undo list with named steps. (open: undo and redo, without a list)
36. Every warning with a small picture of the problem and the fix. (partly: the print check marks problem areas on the model; the messages have no pictures)
37. Translations, with right-to-left layout for Arabic and Hebrew. (open)
38. Remember the last page per object between visits, and a "recently made" row. (partly: the last few projects are listed; the page per object is not remembered)

Speed and reliability
39. Move tracing, refining, painting and the printability check into a Web Worker, so the page never freezes. (partly, Sessions 22 and 30: the print check, picking boxes and colour from a photo run on a helper thread; builds still run on the page)
40. Save to IndexedDB with the last five versions, instead of one localStorage entry with a size limit. (open)
41. Work offline as an installable app (service worker, fonts and libraries cached). (open)
42. A memory guard: warn before an import or a paint detail would use more than the browser can give. (partly: hard limits keep a build from running away; no warning before a big import)
43. Run the real-browser check in CI on every push, with screenshots attached to the pull request. (open: the workflows run only after merges, for squashes and releases)

New tools
44. Gridfinity bins with labels in a second colour. (open)
45. Cable clips, cable tags and wall hooks from a diameter and a screw size. (open)
46. Plant pots with saucers and drainage, painted with the fade or stripes. (partly: vases and pots, the turned shapes and the Cactus pot quick start; no saucer or drainage)
47. Knobs and keycaps with inlaid text or symbols. (open)
48. Colour lithophanes (a CMY layer stack behind white). (open)
49. Stencils and cookie stamps from the tracer, with bridges added automatically. (open)
50. Topographic relief maps from an elevation picture, painted by height. (partly: the Contour map plaque quick start and photo relief; no elevation file)

## Session 14: ready to go public, no Google Fonts (v0.17.1)

v0.17.0 was merged as Retr0Plus95/Maker-Forge#3 (squash). The owner is making the repository public and hosting `index.html` on their own website. Before that:

**Checked, nothing found:** every file on `main` and every commit on every branch for keys, tokens, passwords, private keys and local paths; no email address beyond GitHub's noreply ones (the owner's commits use `…@users.noreply.github.com`); no file ever added and later deleted; the licence (MIT, "Maker Forge contributors"), `package.json` (private) and the lockfile (public npm registry only).

**Changed:**
- Personal details about the owner were taken out of this file (their eyesight, the lettering of their logo). The old wording is still in the history of `main`; rewriting it was judged not worth it.
- The PrusaSlicer 3mf and the OBJ named the app "PhotoRelief Studio" (its old name) in their headers; both say "Maker Forge" now.
- **No Google Fonts.** The 34 lettering fonts and Atkinson Hyperlegible load from the `@fontsource` 5.3.0 packages on jsDelivr, the CDN the libraries already use, so a visitor's browser talks to jsDelivr only. `fontFaceCSS()` (after `FONTS` in `src/app.html`) writes one `@font-face` per font, weight and alphabet (111 rules; `FONT_SUBSETS` lists the alphabets each font has, `FONT_RANGES` the unicode ranges, which are the same across all packages), so a file downloads only when a letter in its range is drawn; the Easy reading font is no longer added by `applyPrefs`. The app grew by 3 KB. Embedding the fonts instead was measured and left: +1 MB (Latin only) to +2.5 MB (every alphabet) for every visitor. To add a font: add it to `FONTS` and `FONT_SUBSETS` (the alphabets are the `/* <id>-<subset>-<weight>-normal */` comments in the package's `<weight>.css`), and `npm i -D --save-exact @fontsource/<id>@5.3.0` for the browser check.
- The `@fontsource` packages are test dependencies: `tools-browser-check.js` serves their files for the jsDelivr font URLs (as it does the libraries), loads all 36 faces (a missing one is a finding) and reports any request to Google as an error. The Easy reading dialog, the About text, the README (privacy line, dependencies, security: the hostile-file tests are named correctly now, `tools-security-test.js` never existed) and `CLAUDE.md` say where fonts come from.

**Verified:** full smoke test (22 quick starts, 20 objects, 328 clicks), the paint (with the renamed headers), printability and size tests, the name plate audit (no findings), the print survey (identical to v0.17.0), and the real-browser check (`PRINT=1 MOBILE=1`: 150 screenshots, no findings, no page errors, 36 of 36 font faces loaded, the real-font printability of every quick start identical to v0.17.0, so the glyphs are the same).

**For the website:** only `index.html` is needed. It must be served over https (copying a share link uses the clipboard), preferably as its own page; inside an iframe it needs `allow-scripts allow-same-origin allow-downloads`. A Content-Security-Policy, if the site sets one, must allow `cdn.jsdelivr.net` for scripts and fonts, and the page's own inline script and styles.

## Session 15: fonts built in, a bug hunt (v0.17.2)

The owner merged v0.17.1 (Retr0Plus95/Maker-Forge#4), asked for the fonts to be built into the page and for a search for bugs.

**Fonts built in.** The 34 lettering fonts and Atkinson Hyperlegible are in `fonts/` as WOFF2 files from the `@fontsource` 5.3.0 packages, one per font, weight and alphabet (111 files, 1.9 MB, every alphabet each font has), with `fonts/LICENSES.md` (30 fonts under the SIL Open Font License 1.1, 5 under Apache 2.0: Satisfy, Permanent Marker, Rock Salt, Chewy, Luckiest Guy; each copyright line and both licence texts). `npm run fonts` (`tools-fonts.js`) copies them from the `@fontsource` dev dependencies and rewrites `LICENSES.md`; it checks that each package's family name is the one in `FONTS`. `build.py` packs them into `index.html` as base64 (`FONT_FILES`, keyed `<font>-<alphabet>-<weight>`, at the placeholder `/*FONTS*/{}`) with `LICENSES.md` in front of them as a comment, so every copy of the page carries the licences. `fontFaceCSS()` writes one `@font-face` per file with a `data:` URL and the alphabet's `unicode-range` (`FONT_RANGES`), so the browser only decodes a file when it draws a letter in that range. The page is 3.3 MB (about 2.1 MB over the wire with compression). In Chromium it becomes ready as fast as v0.17.1 (about 2.5 s in this container, dominated by software WebGL), with 5 to 8 MB more memory; v0.17.1 downloaded 34 font files at start for the font previews, this downloads none. Adding a font: add it to `FONTS`, `npm i -D --save-exact @fontsource/<id>@5.3.0`, `npm run fonts`, `python3 build.py`. A website's Content-Security-Policy needs `font-src data:`.

**The bug hunt.** Extremes audit of every object on the Make, Art, Colour, Paint and Export tabs (the Colour and Paint tabs for the first time), a hostile-project fuzz (every number of an object's settings, the picture's and the model's set to 1e9, -1e9, 0, text and 1e-9, loaded as a project file), the full browser check, and reading the Session 13 code. Found and fixed:

1. **A picture on a photo frame landed in the window and printed nothing** (the Art tab audit: rotation, moves, thickness and seven more "dead"). New pictures on a frame start on the bottom border, sized to fit it (`defaultPlace`, `defaultWidth`; switching to the frame also fits them, and switching away gives them their size back unless it was changed on the frame: the first version left them border-sized on every later object, which the print survey showed), and the Art tab says so.
2. **A picture that lands off the model printed nothing without a word.** The checks now say "The picture … misses the model" (a frame's window gets its own wording).
3. **The phone case's Art tab showed eleven placement controls that did nothing** (a case takes its picture only as the inlay in the back). Like the project box: a note and a "Put it in the back" button, the inlay's own settings once it is on, and a note that a bumper has no back.
4. **The arrow keys on the tab bar also moved the artwork**, and Delete or Backspace removed the selected picture from any tab. The page-wide handler did not look at `defaultPrevented` or the focus. Nudging and deleting now happen only on the Art tab, with no button, tab or field focused, and not when a control used the key.
5. **An imported model was never saved**: a project file kept its paint steps but not the model, and opening the model file again wiped the paint as a new model. Opening any project also left the previously imported model on screen. A saved project file now keeps the model (`projectPayload(true)`: the Y-up triangles as base64 and the paint it came with; `sanitizeProject` takes only whole, finite triangles, at most 4 million, and paint of the right length). The autosave, the recent list and share links leave it out; such a project names the file on the Make and Paint tabs and when it opens ("Open cube.obj again"), and opening the same file (same name and triangle count) keeps the paint steps, scale and filaments. A share link of an imported model says the model is not in it. Opening a project replaces the model; Start over clears it.
6. **Undo after opening a second model put the first model's paint on the second.** Models are not in the undo snapshots; the tab now remembers the models opened in it (`openedModels`, up to about 150 MB, newest kept) and Undo and Redo switch back to the one each step was made with.
7. **"Show the paint" was not just a view switch**: unticked, the paint was left out of the exported files too, silently. It is now "Use the paint (untick to see and print the plain model)", and the checks warn while paint steps are switched off.
8. **"Scale the whole model" and an imported model's scale were not clamped when a project opened** (a negative scale exports the model inside out), and an imported model's name that was not text broke the Make tab. Clamped to the sliders' ranges; the name must be text.
9. **Text, null or a list where a number belongs reached the geometry** (the fuzz: a flat shape's width of "12abc" threw "Invalid typed array length"). `sanitizeProject` now checks every setting against `DEFAULTS()`: a number must be a finite number and a group of settings an object, or the default is used. The same check covers a picture's own settings (width, rotation, zoom, outline, colour adjustments, pixel size; a text width left the cookie cutter and tracer empty), and a picture's aspect ratio is taken from the picture when the project opens instead of from the file.
10. **Out-of-range settings in a project file made builds run away.** A per-setting scan (every number of every object at +1e9 and -1e9, each in its own process with a time limit) found: a negative vase wall looped for minutes (the inside profile steps from the top down to the wall height), a negative bobble plinth made 22 million triangles, and huge bobble bore, shoulder, waist and neck, a huge vase neck, a tiny canvas pitch and a thick name plate border took 10 to 60 s. The generic clamp is only ±100 000, so these settings got their sliders' ranges in `LIMITS_AT` (vase, bobble head and plastic canvas sizes; name plate spacing, arc, rim and border). The plastic canvas keeps 120 cells (a picture can ask for more than the slider's 90), which takes about 45 s in jsdom; the jigsaw's 500 pieces take about 12 s. `tools-project-test.js` checks that every quick start and object comes back unchanged from a saved project (it caught the default box's openings missing four keys that loading added, now in `DEFAULTS`) and that the cases above now build in seconds.

Not bugs, recorded in `tools-audit.js`: the printer settings on the Colour tab change the bed, the checks and the print time, not the model (each was checked to change a check or the time; the nozzle feeds the thin-wall check); the bridge limit has nothing to act on when every flat ceiling is a narrow ledge (turned shapes, shell, cylinder); the Paint tab's fill angle, "only the side facing me" and "mirror my strokes" set how the next stroke works. Some settings are only capped at ±100 000 when a project opens (a plastic canvas margin, for example): they cost no memory or time, and an absurd size only gets "Bigger than the print bed". The plastic canvas at its 120-cell maximum takes about 40 s to build in jsdom.

New test file `tools-art-test.js` (`npm run test:art`; 11 of its checks fail on v0.17.1); `tools-paint-test.js` gained the project-model, undo, paint-switch and hostile-value checks.

**Verified** on the final build (the last change, giving pictures their size back after the frame, was then checked with `tools-art-test.js`, a quick smoke test and the print survey):
- **Smoke test:** full, with every button (22 quick starts, 20 objects, 328 clicks, no page errors).
- **Test suites, all passing:** paint (91 checks), phone case (25), project box (84), printability (83), all four tracer tests (59), lithophane (59), jigsaw (82), the new `tools-art-test.js` (18) and `tools-project-test.js` (11), and the size check.
- **Audits:** every object's Make tab (tracer, name plate, lithophane, phone case, turned shapes, project box, and the fourteen others), no findings beyond the expected list.
- **Print survey:** identical to v0.17.1 except the photo frame, whose picture now prints (352 → 1,336 triangles; the survey's badge picture used to land in the window).
- **Real-browser check** (`PRINT=1 MOBILE=1`): 150 screenshots, no findings, no page errors, 36 of 36 font faces loaded and all built in (no font downloads), share link, painted 3mf read back with every triangle's filament, the real-font printability of every quick start unchanged.
- **Not checked:**
  - a real browser other than Chromium;
  - the page served from the owner's website (https, compression, any Content-Security-Policy);
  - the Session 13 items still waiting on a slicer or a real print.

## Session 16: colour a model from a photo (v0.18.0)

The owner asked how the painter could get much better. The case behind it: a plain (uncoloured) figurine of a footballer for their little brother, and a coloured picture of the same model; Bambu Studio's painter is "very limited" and a paid AI tool was poor. They want to import a model and paint it completely, preferably automatically, with several tools. Agreed plan: colour from a photo (this session), then brush preview, eyedropper, box select and the other painter ideas.

**How it works.** A new paint step, **From a photo of the model** (first in the Auto colour list, and the method shown when a plain model is imported).
1. **Photos** are dropped on the card (`#photoInput`, up to 6 per step). Each is kept like a picture in `assets` (JPEG at 0.9 unless it has a see-through background, then PNG; at most 1600 px), but it is not an Art tab item, so it is never laid on the model as a decal. The first photo is taken as the front, then back, right, left.
2. **Lining up** (`photoFitView`): the figure is found in a 480 px copy (`photoMask`: its alpha when the picture has one, otherwise a flood from the border; the "Background" setting is the tolerance) and matched to the model's outline seen from that side (`photoFit`: the outlines' overlap is maximised over size, place, a turn of up to 20° and, when asked, mirroring). A new photo, a new side and "Line it up again" also search the angle it was taken from (±45° round, ±20° up: 15° steps quickly at low detail, then finer). The fit is stored in units of the photo's height (`{ a, tx, ty, rot, mirror }`), so it holds at any resolution. Each view also keeps the model's middle and height as seen from its side (`box`): when the imported model's size changes afterwards, the fit is carried over (`photoFitNowFor`), so the photos follow the model. Artwork decals are left out of the outline (`decal:true` on their parts) and are not coloured by the step.
3. **Colours** (`photoPickColours`): pixels inside the lined-up model's outline (shrunk 2 px) from every photo go to `photoPalette`. It over-splits in Lab (lightness at half weight), then merges the closest groups, and a pair that is the same colour in light and shade (every linear channel darker by about the same factor) counts as three times closer, so light and shade stay one colour. Each colour keeps its group keys (the step stores them, so replaying never runs k-means) and shows as the mean of its brighter half. The number of colours starts at the printer's "Colours it can load" (2 to 8). The first photo sets the filaments to the photo's colours with plain names (`colourWord`: "Red", "Beige", "Blue 2"), with a message that Undo brings the old ones back. "Use my nearest filaments" maps each colour to the closest loaded filament instead (Lab), and each colour has its own "prints in" choice.
4. **Painting** (`photoLabels`, `paintFromPhotos`): per view, the photo's pixels at up to 900 px are sorted into the colours (inside the model's outline, except near the edge where the photo shows background), and the model is drawn into the same picture with a depth test (`photoRaster`), so a triangle takes only colours the photo really shows on it. Votes are weighted by how squarely the face looks at the camera (edge-on faces are mostly outline and background); triangles smaller than a pixel use their middle. Two smoothing passes, then what no photo sees takes the nearest seen colour over the surface (a Dijkstra fill that goes round creases sharper than 50°), then patches smaller than "Clean up specks" (1 mm² by default) join their neighbour. The step's result per part is cached on the refined mesh by the photos, fits, colours and options (not the filament choice), so brush strokes after it replay in about the time of a plain repaint.
5. **The card** (`photoCard`): the drop zone; a chip per photo; the photo with the lined-up outline as a thick yellow line edged in black, or "Colours it reads" (each colour in the filament it prints in); drag, ◀ ▶ ▲ ▼ − + ⟲ ⟳ buttons, or arrow keys, + and −, comma and full stop on the focused preview (Shift for bigger steps; size and turn keep the model's middle in place); the outline match with advice under 75%; the side (Front, Right, Back, Left, Top) and exact angles; mirrored; Background; Number of colours; each colour's filament; the three filament buttons; the hidden-parts fill, the speck size, smoothing; and how much of the surface the photos show, with a nudge to add a back photo when one photo shows under 70%. Controls that change the fit or the colours repaint after a short pause with a busy line ("Colouring the model from the photos…"), and the panel keeps the keyboard focus on the control in use (`renderKeepFocus`).

**Saving.** The step is `{ k:"photo", views:[{ asset, name, cam:{ yaw, pitch }, fit, tol, match, box }], pal:[{ rgb, keys }], slots, colours, use, fill, speck, smooth }`. `cleanPaint` keeps at most 6 photos and 8 colours, clamps every number (fit size 1e-5 to 10 photo heights per mm, place ±5, turn ±0.35 rad, yaw ±180, pitch ±89, Lab keys, RGB), turns a fit with text in it into "not lined up yet", keeps a filament list as long as the colours, and takes names and picture ids as plain text. A fit that would make the model more than four photos big is skipped when painting (a hand-edited file cannot make a build run away). Project files now keep only the pictures that items or photo steps use (they used to keep every picture ever added in the session); removing a filament keeps a photo step's colours in their places, like height bands. Share links leave photos out, as they do pictures: the card then says which photo is missing.

**Found and fixed while testing:**
1. **White shorts on a white background were masked out** (the figure found in the photo overlapped the truth only 94.7%). Colours are now read through the lined-up model's own outline, so the photo's mask only has to be good enough to line up.
2. **Shading split skin into two colours and lost the boots** with plain k-means: fixed by the shade-aware merging above.
3. **Background at the outline painted white over the back** through faces seen edge-on: the facing weight and reading only inside the model's outline fixed it.
4. **Triangles smaller than a pixel were never "seen"**, so fine meshes were coloured only by the fill; they now count when their middle is visible and they face the camera (at least 0.2).
5. **The angle search stepped 60° instead of 15°**, and took 6.4 s; now explicit steps and a quick low-detail round first (2.7 s for a three-quarter photo of a 570k-triangle model in Node).
6. **In the real browser, a picture left on the Art tab was laid on the figure as a decal and spoiled the outline** (match 82% instead of 89%): decals are now left out of lining up and colouring.

**Verified:**
- `tools-photo-test.js` (28 checks, all passing). The engine on the test figure (568,680 triangles after refining to 1 mm): the figure found in the photo, the fit within 0.2% in size, 0.15% of the height in place and 0.07° in turn; the six colours within ΔE 1 to 9; front photo alone 86.5% of the outside surface right with every triangle coloured, front and back 97.8%; the back number from the back photo only; nothing through the head; a 35°/10° photo found at 34°/10° in 2.7 s and 96.4% right; eyes kept at 1 mm² and cleaned at 40 mm²; 606k triangles painted in under a second. In the app: both photos lined up by themselves (front 4° round, back −178°, outlines 89% and 82%) and the model coloured in about 8 s in jsdom, 97.9% of the surface right on 372,842 triangles, a brush stroke on top about as quick as a plain repaint, the resize follow (46.7% right without it), a project round trip with the same paint, and a hostile project opening in 4 s.
- Real-browser check: the same figure and photos through the file inputs in Chromium: front 2° (outline 89%), back −176° (81%), six colours, every triangle painted in about 9 s, a 30 px mouse drag moved the photo exactly 30 px, two screenshots (the README image is the first).
- The full browser check: 147 screenshots, no findings and no page errors.
- Smoke test, `test:paint`, `test:project`, `test:art`, `test:phonecase` and the Paint tab audit on a turned shape (`node tools-audit.js index.html turned paint`: no findings) all pass. The print survey is identical to v0.17.2 apart from timings.
- **Not checked:** a real photo of a real figurine (real photos have perspective, lens distortion, a pose that differs from the model and busy backgrounds; the fit uses a camera far away, so a close-up photo lines up less well); painted exports of a photo-coloured model in a slicer; browsers other than Chromium; phones (touch dragging on the preview uses pointer events and should work).

**Next** (the painter ideas the owner liked): a brush preview that highlights what it will paint, an eyedropper and "select all of this colour", box and lasso select, a smart brush that stops at edges, radial symmetry, a layer preview with the number of colour changes and a purge estimate, colouring AI-made models from their textures (GLB/OBJ), wrapping a picture round a model, colour by curvature, sub-triangle export, a BVH for picking, and patterns for colour-blind users. For photos: a lasso to mark the figure when the background is busy, a perspective (near camera) fit, and matching the photo's pose by letting each photo line up per part.

## Session 17: the AI figure finder (v0.18.1)

The owner asked whether another programming language would add capabilities. The answer: not one to write the app in, but ready-made WebAssembly libraries loaded like three.js, and first Web Workers. Asked for details of the small AI model for photos on busy backgrounds, then "keep going".

**What it is.** On the photo card, **Busy background? Find the figure with AI** (in place of the Background setting once used). U²-Net small (`models/u2netp.onnx`, 4.6 MB, Apache 2.0, the ONNX file from rembg's release, licence and SHA-256 in `models/LICENSE.md`) marks the photo's main object; ONNX Runtime Web 1.30.0 (MIT) runs it on the WebAssembly back end, one thread, no worker.
- **Loading** (`aiLoad`, `aiGet`, `AI_FIGURE`): nothing until the button is pressed. Then three files, each checked against its SHA-256 before use: `ort.wasm.bundle.min.mjs` (73 KB) and `ort-wasm-simd-threaded.wasm` (14.2 MB) from jsDelivr's npm copy, the model from `models/` next to the page (skipped for a page opened as a file, which cannot read it) or else `cdn.jsdelivr.net/gh/Retr0Plus95/Maker-Forge@main/models/u2netp.onnx`. The runtime runs from the checked copy through a blob URL (its `import.meta.url` replaced by the jsDelivr address, so nothing in it resolves against `blob:`), with `env.wasm.wasmBinary` set to the checked wasm so it fetches nothing itself. Checked files go to Cache Storage when the page may use it (https), so a later visit does not download again. Progress shows in the status line. A wrong file is refused with its own message; any other failure says to check the connection or to put `models/` on the website. The hashes come from the npm package (jsDelivr is blocked from this container, so they were not compared with jsDelivr's copies directly; jsDelivr serves npm files unchanged).
- **Running** (`aiFigureMap`, `aiFindFigures`): the photo at 640 px, squeezed to 320 × 320 with area averaging, divided by its brightest value and standardised (`photoNetInput`); the first output stretched to 0..255 (`photoNetOutput`). The map is kept as a 320 × 320 grey PNG picture in `assets` (`v.ai` on the view), so saving, undo and reopening need no model; `usedAssets` keeps it in project files, `cleanPaint` takes `ai` as a picture id of at most 40 characters. `photoFigure(v, px)` gives the AI's mask (`photoMaskFromMap`, cut at half) when a photo has one, else the colour method, everywhere a figure is needed: lining up, colours, painting and the preview. It works on every photo of the step at once; photos added later to such a step use it too when the finder is already loaded in the tab. "Find the figure by colour instead" undoes it for one photo. Either way the angle search restarts from the side the photo was taken from.
- **Lining up with the AI's outline**: the AI marks the main thing and fills hollows (the gap between the legs, a bright object touching the head), so its outline is a little too big; a part of it the model does not cover counts 0.7 (`photoFit`'s new `opt.extra`).

**Also changed for every photo:**
1. **A steadier angle.** A figure's outline changes little as it turns: on the test figure the overlap moved 1 to 2 points at random between 0° and 24°, and the search took the noise. A turn away from the side asked for now has to gain 0.1 points of overlap per degree (a 35° photo gains 15). Front and back test photos now come out at exactly 0° and 180° (were 4° and −178°); a 35°/10° photo is still found at 34°/10°; a 20° photo comes out at 7° with or without the preference (its outline cannot tell).
2. **A rim of background no longer takes a filament.** With an outline 3% too big, 7.7% of the pixels read for colours were background, and colour groups of 0.4 to 1% of them took three of six filaments (skin and white merged, hair lost). Colours are now read inside the lined-up model less a rim of 2% of its height (was 2 px), and a colour group under 0.4% of the pixels joins its nearest group before any are merged (`photoPalette`).

**Tried and not kept:** refining the fit to the photo's strongest edges (no better: a red disc behind the head has stronger edges than the head), trimming the AI's outline to near the model and refitting, and checking doubtful pixels' colours against the figure's and the background's (up to 72% from 64% on the worst case, but unsteady between rounds).

**Verified:**
- `tools-photo-test.js`, all 38 checks. The engine: the AI's mask on a plain photo 93.7%; on the worst case 80% (the colour method 25%, its fit 124% too big), the fit within 2.9% in size and 0.9% of the height in place; in front of a bookshelf 88% (colour 45%), the fit within 0.3% and 0.28%; a 40 × 30 photo works; about 2 s a photo in Node. The app, one front photo in front of a bookshelf: by colour the outline matches 45% and about half the surface is right; with the AI 89%, 0°, size within 0.4%, 84% of the surface right (a plain background gives 87%); reopened without the AI, the same paint. Over three bookshelf scenes (Node): 48 to 58% right by colour, 83 to 85% with the AI.
- The browser check in Chromium: a wrong model file refused before it runs; the real files (served from `node_modules` and `models/` in place of jsDelivr) loaded, checked and run in about 13 s including the transfer, outline 89%, 1° round, size within 0.2%; screenshot `paint-photo-ai`.
- The full browser check: 148 screenshots, no findings, no page errors. Smoke test, `test:paint`, `test:project`, `test:art`, `test:phonecase` and the Paint tab audit on a turned shape (no findings) all pass.
- **Not checked:** the real download from jsDelivr (blocked here; the `gh` copy of the model exists only once this branch is merged into `main` and the repository is public, until then only a website with `models/` or a local server works); a real photo; Firefox and Safari (WebAssembly SIMD is needed; recent versions have it); how long the model takes on a phone.

## Session 18: painter tools (v0.19.0)

The owner asked to "build all the suggested improvements": the painter ideas they liked in Session 16, Web Workers and a faster picker, textures of AI-made models, the photo follow-ups, Manifold for cutting and engraving, and sub-triangle export. This session did the painter tools (v0.19); the rest follows in the next releases (see Unfinished). Mid-session they also asked for a user manual and a finished-looking example with original art for every Start from button.

**Brush and fill page:**
- **Pick colour** (`paintPick`, key I): the colour under the pointer (its paint, or the part's own filament: `colourAt` via the raycast's `faceIndex`) becomes the brush colour; the tool goes back to the brush or fill.
- **Recolour** (`paintRecolour`, key R): adds a swap step from that colour to the brush colour (nothing when they are the same).
- **Repeat round the middle** (1 to 12): brush strokes and fills carry `radial`. `C.symmetryCopies` rotates the points and the view direction round the upright line x = z = 0, mirrored across x = 0 too when "Mirror my strokes" is on. The live stroke and the replay share it.
- **Smart brush** (`edge`, degrees): `C.brushTris` paints only triangles within the radius that join the one under the pointer without crossing an edge sharper than that. The live stroke and the replay share it.
- **Brush preview** (`previewTris`, `showPreview`): the triangles the next dab would paint (repeats and smart brush included), drawn over the model in the brush colour moved a third of the way to white (or to black for light colours) so it shows over the same colour. The model is split for painting on the first hover with the brush (`preparePaint`), not on the first stroke. `paintPrepared` is dropped when leaving the Paint tab with nothing painted or opening another model. With nothing painted, `printedParts` (the files and the print checks) uses the original mesh, and "Use the paint" off shows the plain model.
- **Box or lasso** (`area` steps, key A): drag a box or draw a loop over the view (an SVG outline over the canvas). The step keeps the screen matrix `projection × view × model group` (16 numbers) and the outline in screen units, so it replays the same after the view turns. `C.areaTris` projects the refined mesh and takes triangles whose middle is inside. For "the side you see" there is a depth test at up to 1024 pixels over the outline, front faces only: a back face at the edge of a front face won slivers before this. Options: right through, and rub out. The result is cached per refined mesh. A view that is not ready (a non-finite matrix) adds nothing.

**Auto colour:**
- **Edges and hollows** (`curve` step, `C.curvatureClasses`/`paintCurvature`): each triangle's signed bend (angle to each neighbour over the distance between their middles, about 1/radius on a curve; convex positive) is area-averaged over a band. Tighter than the chosen radius counts as an edge (+) or a hollow (−). Filaments for edges, hollows and the rest. The classes are cached per refined mesh.
- **Pictures wrapped** (`picture` step `wrap: "around" | "ball"`, `turn`, `start`; `C.paintPictureWrap`): round the upright middle line (the picture's height follows its shape at the model's widest) or over a ball at the model's middle (latitude); "only the outside" skips faces not turned away from the axis or centre.

**Layers and colour changes** (a new Paint page, `paintLayersPage`):
- `C.layerSlots(parts, h)` gives the filaments each layer uses: every triangle crossing the layer's middle, painted colour or the part's own. The inside follows the outside, as slicers carry painted colours inward (the first version added each part's own filament to every layer it spans, which counted a two-band vase as 45 changes instead of 1).
- `C.colourChanges(bits)` counts changes in print order, each layer starting with the loaded filament when it can and ending on one the next layer uses. It is checked on nine patterns with known answers.
- The checks (`lastChecks.layers`, printers that load more than one filament) turn this into grams and seconds with new printer settings `purge` (g) and `swap` (s): `changeCost(model)` gives 0.05 g / 15 s for tool changers (Prusa XL, Snapmaker U1, H2C), 0.3 g / 45 s for the H2D and X2D, 0.15 g / 40 s for Prusa MMU3 printers and 0.4 g / 60 s otherwise. They are editable on the page and in Printer details; `cleanPrinter` clamps them to 0–5 g and 0–600 s. These are rough typical figures, not measured.
- The print time now adds changes × time per change instead of 1.2 s per filament per layer. The Export tab mentions the changes.
- A slider shows one layer with its colours by cutting the model there (`showLayerCut`, the section view). The section view now also clips a painted model at once: before, only after the next rebuild.

**Patterns for colour** (Easy reading, `prefs.patterns`): `withPatterns` adds a pattern to the model materials in their shader (`onBeforeCompile`). There is one per filament index, the first plain, drawn in screen space in black or white against the colour. Painted models carry a `slotId` attribute per corner; whole parts use a uniform. `swatchStyle` draws the same pattern on the Paint tab's swatches with CSS gradients.

**Verified:**
- `tools-paint-test.js` all passing, with new checks:
  - core: the smart brush stops at a cube's edge; four copies round the middle land on the four sides alike; a box over half the screen takes exactly the front half (200 of 200 mm², no side or back); right through takes the back; a small lasso takes a patch; broken matrices paint nothing; a cube's edges and an L-block's inside corner; a 10 mm ball at two limits; halves of a picture round a cylinder (942 + 942 of 1885 mm²); layer colours and nine change-count patterns;
  - app: a stroke four times round the vase paints about four times as much; the smart brush replays; pick colour and recolour; a repeated fill; the preview lights exactly what the stroke paints; box and rubbing out on the vase; a wrapped picture and a ball; the six Paint pages; X2D and U1 change costs; two bands = 1 change and seven stripes = 14; the Layers page, the layer cut and the Export line; pattern swatches; hostile values for every new setting.
- Audits of the Paint and Colours tabs on a turned shape: no findings (the new stroke and printer settings are listed as expected).
- Browser check, in Chromium:
  - hovering lights 299 triangles; a box drawn with the mouse painted 2,645 triangles and a lasso of 17 points took it to 5,413;
  - patterns changed 8,641 pixels of the view (screenshot: skin striped, shorts hatched, base dotted);
  - the photo-painted footballer needs about 776 colour changes (310 g, 13 hours at AMS figures).
- **Not checked:** the purge and time figures against a real printer; the patterns in browsers other than Chromium; painted exports of the new steps in a slicer.

## Session 19: an example for every button, a user manual (v0.20.0)

Asked for: "a beautiful example for every start from here button, so people can see for example a circuit board, the phone case with the art, an example of a patch on clothes, a puzzle and so on", a user manual, and then a rewritten project page with more screenshots and the right keywords.

**Examples** (`src/examples.js`, packed at `/*EXAMPLES*/`):
- `EXAMPLE_ART`: 25 pictures drawn with the canvas from code written here (MIT), each `{ name, w, h, draw(x, W, H) }`: ladybird, moon and stars, mountain patch, winged badge, Christmas tree, forest silhouette (tea light), moonlit forest (a relief, kept but unused), pixel cat (34 × 34, one square per stitch), happy face, gingerbread, a photo of a bracket on paper, sunset hills, LED-heart circuit, family garland, hot-air balloons, whale, lighthouse and night lake (greys, for lithophanes), gear and bolt, battery, retro sunset, fox, contour map (marching squares over a height field), cactus garden, honey bee. Decal pictures use exactly the example's filament colours, so each colour is one clean part.
- Rules learnt the hard way, in the file's header comment: never rely on `clip()` (cut away with `destination-out` and an even-odd path, `keepInside`), and keep decal shapes off the picture's edge (a decal drops any region touching it as background; the tea light's forest vanished until its trees stopped at the edge).
- `EXAMPLES` (by quick start name, plus Flat shape, Plaque, Cactus pot, Coaster, Vase, Planet for objects without one) and `EXAMPLE_FOR_TYPE`. An entry has `art`, `width` (mm), `item` settings, `slots` ([hex, name]), `base` settings, `paint` steps, `view` ("flip" or "layout") and an optional `note`.
- In the app: `loadExample(key, preset)` runs from `applyPreset` and `chooseObject`. Examples load only while every picture is an example (`item.example === true`); `dropExamples()` takes them (and an untouched example paint, `examplePaintSig`) away, and runs from `addFiles` and `addTextItem`, so the first picture of your own takes the example's place with the same settings. Filaments change only on a quick start, or while they are the defaults or the last example's (`exampleSlotSig`); object settings only on a quick start or while they are still as they started (`exampleBaseFree`). A token stops two quick clicks from both adding pictures; `exampleBusy` is part of `MakerForge.busy` so the tests wait for it. `sanitizeProject` keeps `example` only when it is `true`. The Art tab says which picture is an example; the notices say what to do (`exampleNote`).
- **Turn over** (⟳, `viewOpts.flip`, `setViewFlags`): the model turned half round the front-to-back axis on screen only, so a case back or a lid logo (which print face down) can be seen. Files and checks do not change; clicks still land right as they go through the group's matrix. Off with the section view. The phone case and the two boxes with logos open turned over; the lightbox opens laid out.
- **Start pictures**: `tools-thumbs.js` opens each quick start and object in a fresh page and asks `MakerForge.thumb(w, h)` (`modelThumb`: the model alone, no bed or rulers, cropped and fitted) for a WebP. `renderStarts` shows them (`START_THUMBS`, validated as data URLs), two across.
- The vase's fade is short (20 to 32 mm): a fade cuts the mesh at every layer, and the first 40 mm fade made 928k triangles and took 7 s; now 359k.

**User manual**: `MANUAL.md` (14 sections, screenshots in `docs/manual/`). `build.py` converts it (headings with ids, paragraphs, lists, tables, bold, italics, code, links; images left out) into `MANUAL_HTML`; the **?** button opens it in a wide modal, and its contents list jumps within the window.

**Project page**: README rewritten around what you can make, with the example gallery, screenshots of every tab, printers and slicers, a keyword-rich FAQ and a condensed developer section; the version history moved to `CHANGELOG.md`. `package.json` has a description, keywords, homepage and repository; the page has a description, keywords, Open Graph tags and schema.org `SoftwareApplication` data. The GitHub About text and topics cannot be set from a session: suggested ones are in the Session 19 reply to the owner.

**Fixed along the way**:
- A backlit lightbox left out every colour touching the photo's edge (a sky, a field): `maskToPolys` drops edge regions unless asked (the decals rely on that), and the lightbox did not ask. It now passes `closeEdges` for its colour zones.
- The lightbox's parts were laid out in a column 294 mm long, too long for a 256 mm bed; the stand now lies lengthways beside the frame (214 × 228 mm at the default 170 mm width). The layered mode keeps its layout.
- The name plate's canvas added the room for charms and a picture above and below the name as well as beside it, making it four times taller than needed: `padX`/`padY` now. A keychain with a picture builds in about 2 s instead of 8 in Chromium; every name plate is faster. A picture's colours are traced in a window round the picture.
- A name plate's top layer covered a picture printed in its own colours (it used the letters and the picture as one mask): the top layer now follows the letters only when the picture is in colour.
- The test canvas (`tools-test-env.js`) draws linear and radial gradients (per pixel, premultiplied, in the user space of the fill), so the photo-like examples look right in jsdom too.

**Verified**: smoke test; audit of every generator (no findings); project test (every quick start and object round-trips with its example; the example marker in a hostile file; your own picture replaces the example); paint (the vase opens painted and its paint goes quietly), jigsaw, lithophane, phone case, enclosure, art, tracer, print, photo and size tests; the print survey; every example looked at in Chromium, and the car badge, lightbox and phone case examples pass every check. Some examples still show yellow advice, "walls thinner than the nozzle" (0.15 to 0.35 mm), from slivers where two colours of a picture meet (the patch, the plaque, the coaster, the cactus pot); nothing red. **Not checked:** printing the examples; the pictures in browsers other than Chromium.

## Session 20: the AI sections: cut-out, models with their own colours, a hand-fixed outline (v0.21.0)

Asked for: "Add the AI now", then "Do all the AI sections first" (the roadmap's AI items: the AI figure finder on the Art tab, GLB textures and OBJ vertex colours, a hand-fixed figure outline, close-up photos), then a pull request and an updated project page. The branch was brought up to date by merging `main` (after PR #5 was squash-merged), not by resetting it.

**AI cut-out** (Art tab and keychain):
- `PRCore.cutoutWithMap(rgba, W, H, map, mw, mh, th)`: the picture's alpha from the figure finder's map (`photoMaskFromMap`: enlarged, cut, dust dropped); `edgeOpacity` says how much of a picture's border is opaque.
- App: `pictureHasBackground(d)` (border over half opaque, at 256 px) decides whether the button shows. `aiCutout(d)` loads the AI (`aiLoad`, the same SHA-256-checked download as Session 17), runs `aiFigureMap` and makes a new picture; it keeps the original in `d.uncut` and sets `d.crop = true`, so the picture is trimmed to the subject. Under 1% kept: a notice, and nothing changes. `aiUncut(d)` puts it back.
- `aiCutoutRow` offers it on the Art tab and in the keychain's picture group; there the flood-fill colour cut-out is switched off once the AI has cut the picture. `usedAssets` keeps `uncut`; `sanitizeProject` keeps it only as a short string. Hook: `MakerForge.art.{cutout, uncut, hasBackground}`.
- `aiFailed(err)` is the shared error notice for both AI buttons.

**Models with their own colours** (what Meshy, Tripo, Rodin and most 3D apps export):
- Readers in `src/core.js`:
  - `parseGLB` (GLB chunks, or `.gltf` text) and `parseGLTF`. They handle node transforms (TRS or matrix, with mirrored ones turned back to outward) and modes 4, 5 and 6.
  - Materials: `baseColorFactor`, `baseColorTexture`, `COLOR_0` and KHR_materials_pbrSpecularGlossiness. Pictures come from a bufferView or a data URI, WebP included.
  - Clear errors for glTF 1, Draco, meshopt or Basis, a separate `.bin`, and a cut-off GLB.
  - `parseMTL` and `parseOBJColours` read vertex colours (0–1 or 0–255, times Kd), `vt` (turned to picture space, v down) and `usemtl`/`map_Kd`.
  - All of them return triangle soup turned Z up, with per-corner sRGB colours `cc`, picture places `uv`, a picture per triangle `texOf`, and `images`.
- `modelTriColours(solid, src, source, mc)` gives the colour of each (refined) triangle: its middle's place in the source triangle, the picture sampled bilinearly (repeating), times the corner colours, in linear light. So detail inside big triangles comes through on the finer mesh (tested: a diagonal across two triangles comes out 50.1% / 49.9%). `modelPalette` and `modelColourLabels` turn that into up to 8 colours, via `photoPalette`/`photoClasses`, with neighbour passes that tidy lone triangles.
- App:
  - `importModelFile(file, others)`: the model input takes several files, so an OBJ comes with its MTL and pictures. Pictures are matched by name, or a single dropped picture is used; a missing one is named in the notice.
  - `modelColourIn` decodes pictures into assets (at most 2048 px). GLB is in metres (×1000). A model with colours, or in metres, that comes out under 10 mm or over 500 mm across is made 80 mm across, and the notice says so.
  - `stlColour` holds `{cc, uv, texOf, tex}` and is saved in the project (base64). `cleanModelColour` checks every length against the triangle count and every picture id against the file's pictures; a bad `uv`/`texOf` is dropped and the corner colours are kept.
  - The paint step `k: "model"` is listed first in PAINT_METHODS, is added when such a model opens, and is in `paintNeedsFine`. It offers the number of colours, "Set my filaments to its colours" or "Use my loaded filaments" (`photoSetFilaments` / `photoNearestFilaments`), and "Tidy single stray triangles". `cleanPaint` clamps it.
- `tools-aimodel-test.js` (`npm run test:aimodel`, `CORE=1` for the readers) covers:
  - the photo test's footballer as a GLB with vertex colours, as a GLB with a picture, as an OBJ with vertex colours, and as an OBJ + MTL + PNG: every triangle's colour exact, and 100% of the surface right in the app with six colours;
  - node transforms, damaged files, the metre and 80 mm rules, the Paint tab controls, a project round trip, and hostile projects.
- The GLB writer used by that test moved into `tools-photo-figure.js` (`makeGLB`, `colourSquares`, `figureGLB`), and `figure(step)` can refine more coarsely, for smaller files in the browser tools.

**Hand-fixed figure outline** (colour from a photo):
- `PRCore.photoFixMap(fix, W, H)` turns strokes `{ add, r, p:[x0, y0, …] }` into a map (x in parts of the photo's width, y and r in parts of its height), so the same strokes fit the photo at any size. Each stroke is a chain of capsules, and later strokes win. The work stops at 60 × the photo's pixels, so a hostile file of huge brushes takes 175 ms, not minutes. `photoFixMask` applies the map to a mask.
- App:
  - `photoFound(v, px)` is the figure as found (AI or colour); `photoFigure` adds `v.fix`. So the fixes feed the line-up, the colouring (`photoView`) and the previews.
  - `photoPickColours` also leaves out what was taken away from inside the lined-up outline. `photoFixKey` puts the fixes in the colouring cache key.
- Photo card:
  - The view choice gains **Figure it found**, which darkens the background to navy. The outline and the figure-as-found are cached per canvas (`photoPrevCache`), so a stroke redraws quickly.
  - **What dragging on the photo does**: Move the photo, Add to the figure, or Take away. The brush size runs from 0.5 to 20% of the photo's height, with a ring cursor (`drawPhotoRing`).
  - **Undo the last fix** and **Clear my fixes**.
  - While a stroke grows, the preview keeps its fix map (`pc.fixMap`, `pc.fixDone`) and draws only the new part on top (`photoFixMap(…, out)`), so a frame costs the same after hundreds of strokes. An undo or a new card draws afresh; the test checks the two match pixel for pixel.
  - The pointer is mapped through the preview's letterbox (`object-fit: contain`). Strokes redraw once a frame, and the colours are read again 0.6 s after the brush rests. The fixes do not move the line-up by themselves: **Line it up again** does.
- `cleanPhotoFix`: at most 2000 strokes and 100 000 numbers, points clamped to the photo, r between 0.002 and 0.25, `add` a boolean.
- Tested in `tools-photo-test.js` (section 7b2). On the bookshelf photo without the AI, pointer strokes (big ones across the background, then a 1% and a 0.5% brush near the edges; 446 strokes) took the figure from 45% to 91% like the true one. Line it up again then gave: size off 0.6%, place off 0.59%, and 81.9% of the surface right instead of 53.6%, about what the AI gets. Also tested: the round trip, undo and clear, and hostile fixes.

**Close-up photos: started, not in the app yet.** In `src/core.js`:
- `photoRef`, `photoUV`, `PHOTO_K_MAX`: a fit may carry `k` (the model's height over the camera's distance from its middle; 0 = far away) and `ref` (that middle and height in camera space). `photoRaster` and `photoFit` (`opt.k`) enlarge what is nearer the camera.
- `photoFit` has a finer last step on a 400 px grid, used only when `k > 0`, and a `"mid"` mode.
- `photoFitCloseness` tries k = 0, 0.3, 0.6 and 0.9, then finer; a closer camera must win by 2 points of overlap per 1 of k. `photoFitAngles` refines its best angle when `k > 0`.

Without `k` every photo lines up exactly as before (the engine test gives the same numbers). Measured on rendered close-ups of the test figure (camera 1.2 to 2.5 model heights away, one photo, the angle known):

| | Right with the far-away fit | Found k | Right with k |
| --- | --- | --- | --- |
| k 0.6, 20° up | 66% | 0.56–0.6 | 84–86% |
| k 0.5, 30° round, 10° up | 67% | 0.525 | 87% |
| k 0.8, 25° up | 56% | 0.825 | 83% |

Far-away photos kept k at 0 to 0.075, with no loss.

Still to do:
- Save `k` in `v.fit` (clamp it in `cleanPaint`).
- Give `photoFitNowFor` the whole model's `ref` from `photoModel()`, so every part is seen from one camera.
- Run the closeness search when a photo is lined up, plus a "How close was the camera?" setting.
- Test in `tools-photo-test.js` with close-up photos.

The angle search from the front can still miss a 20° turn on a close-up (the existing preference for the side asked for). Searching angles both far away and at k 0.5 found it more often, but took three times as long (8–9 s), so it was left out.

**Also fixed**: a cut-off GLB said its data was "in a separate file"; it now says the file is cut short.

**Verified**:
- `test:aimodel`, `test:photo` (with the real network in Node), `test:paint`, `test:project`, and the smoke test.
- In Chromium (`tools-browser-check.js`, new this session): a mouse stroke with Take away lands where it was aimed (through the letterbox); the AI cut-out runs in the browser on the bookshelf photo; a GLB with a PNG picture (decoded by the browser, not the test stub) opens in its six colours at 102 mm.
- New README screenshots: `docs/images/model-colours.jpg` and `docs/images/photo-fix.jpg` (`tools-screenshots.js` scenes `modelcolours` and `photofix`). The `photofix` scene sends the test's 446 strokes as pointer events inside the page (3 minutes). Sending them as separate Playwright mouse moves, about 26 000, went past 50 minutes in software-rendered Chromium, and the cause was not pinned down; the browser check covers a real mouse stroke.

**Not checked**: real AI-made models from Meshy, Tripo or Rodin (only models written by the test); KTX2 or Basis pictures (refused); the cut-out on real photos; the hand-fix brush on a touch screen; any print.

## Session 21: phones and tablets (v0.22.0)

Asked for: "make viewing on mobile a priority" (after the v0.21 pull request), and "make a new pull request with every new version release" (now in CLAUDE.md).

**What was wrong** (measured in Chromium at 390 × 844, 844 × 390, 768 × 1024 and 1024 × 768):
- On a phone held upright, the settings panel was 248 px tall with 1105 px of content, and nothing scrolled. The phone CSS let `#panel` overflow (for a page scroll), but `.app` was fixed at the window's height and `.sheet` hid its overflow.
- Below 1100 px, Start from was `display:none` with no way to open it, so the quick starts, the examples and the object list could not be reached. "Change the object" did nothing visible.
- The app bar did not fit below about 1180 px: on a phone on its side and on tablets, **Download files**, Settings, the manual and About were past the right edge (the page was 1071 px wide in every case, hidden by `body{overflow:hidden}`).
- The view buttons ran off the stage, or wrapped into two rows over the model.
- On a phone, closing the panel (‹) switched the desktop grid columns back on.

**Layout modes** (`fitLayout`, `layoutMode`):
- Chosen in JavaScript, not by media queries, because Easy reading zooms the panels by `--ui` and a width breakpoint cannot see that. `data-layout` is set on `<html>`:
  - `wide`: 1100 × ui px and wider, as before.
  - `phone`: under 760 × ui px, and not a short landscape screen.
  - `narrow`: everything else.
- Runs on `resize` and from `applyPrefs`, which replaces the old "hide Start from under 1900 px at 130% text" rule.
- **narrow**: the rail, the settings (at most 46% of the width) and the model. Start from is a drawer (`.app.starts-open`, `#startBtn` in the app bar, `#startsBack` behind it). The drawer's close button reads ✕, and it closes after a quick start or object is chosen (`startsChosen`), on Escape and on the backdrop. `setSide("right", …)` opens and closes the drawer, so "Change the object" works too.
- **phone**: rows are app bar, model (up to 40% of the height), page icons, then settings (the rest). `.sheet` scrolls, the sheet foot is sticky, and ‹ gives the model the whole height (`.app.no-left`). The tabs sit on their own row as five equal columns; the logo name and version are hidden. Notices run across the bottom of the model.
- **App bar** (`fitBar`): Redo, Aa, theme, Settings, the manual and About are wrapped in `.barmore`; with `display:contents` they sit in the bar as before. When the bar overflows (`scrollWidth > clientWidth`), `.tight` puts them in a ⋯ menu with names (`.lbl`), and `.tighter` hides the logo name, the version and the tab icons. The menu closes on any click, a choice included, and on Escape.
- **View buttons** (`fitTools`, from `resize`): when they would wrap, the seven views fold into ◱▾ (`#vAngles`, `.vangleset`), which opens them in a row below. `fitHud` then moves the size pills.
- Wording: the Basics help no longer says "on the left"; the Paint help says "↶ at the top (Ctrl+Z)".

**Tests**:
- `tools-browser-check.js` `pageLayout` now reports:
  - app bar buttons off the screen;
  - settings that overflow without a way to scroll.

  Both would have caught the old bugs, which the sideways-scroll check missed because the body hides overflow.
- `MOBILE=1` now drives the phone: the Start from drawer (390 px wide, closes after Iron-on patch), the More menu (six labels, closes after a choice), the folded view buttons (one row), scrolling the settings, closing and reopening the panel. It then checks a phone on its side and both tablet orientations (`narrow`, and no layout findings).
- `tools-screenshots.js` scene `phone` makes `docs/images/phone.jpg` (three phone screens) for the README.

**Not checked**:
- A real phone or tablet: Safari on iOS (its toolbar and `100dvh`), Android Chrome, touch painting with a finger, pinch zoom in the 3D view (OrbitControls handles touch, and while painting one finger paints and two zoom, as before), and downloading the zip on iOS.
- The narrow layout at 175% text on a small laptop.

## Session 22: speed, and a check of the repository (v0.23.0)

Asked for: "list bug fixes in release updates" (now a rule in CLAUDE.md: every CHANGELOG entry and pull request lists its fixes under **Fixed**; 0.22's entry got its list), "start with speed workers", and "check the git hub repo for errors and if something isn't supposed to be there". PR #6 (v0.21 + v0.22) had been squash-merged; `main` was merged into the branch (resetting it is refused in this environment), so the branch's tree equals `main` plus this session's work.

**The repository check**:
- **Clean:**
  - every tracked file (182), and every commit on every branch, for keys, tokens, passwords, private keys and local paths. The only email addresses are a font designer's, in the licence notice her fonts require. Commits use noreply addresses only.
  - links: every local link and picture in the Markdown files exists; every `package.json` script names a file that exists; every `tools-*.js` is used; the page's `og:image` and the model's jsDelivr address point at files on `main`.
  - `index.html` is exactly what `build.py` makes from `src/`.
  - branches: GitHub has only `main`, the merged branches are gone, and the repository is public.
- **Removed:** `docs/images/easy-reading-settings.jpg` and `docs/images/v0.16-features.jpg` (380 KB), used nowhere since the README rewrite. Old PRs #2 and #3 link to them through commit addresses, which keep working.
- **Changed:**
  - `.gitignore` also ignores `.DS_Store`, `Thumbs.db`, `*.log`, `.vscode/` and `.idea/`.
  - The known-issues note on the AI figure finder no longer says it waits for the repository to be public.
- **Tests on `main`:** every suite passed; print and size failed only after this session's first draw-loop change (see below).

**Where the time went** (a CPU profile in Chromium while switching objects, `(program)` being mostly drawing): of 5 to 6 s busy, about two thirds was drawing the view, 60 times a second, whether or not anything had changed. The rest was spread over the distance transform, the printability check, the mesh check and mesh splitting. A pick took 13 ms on the painted vase (359k triangles) and 15 ms on the photo figure (569k), on every brush move.

**Drawing only on change** (`viewSnapshot`, the render loop):
- Each frame the loop takes an exact snapshot of everything the picture depends on: the camera pose and lens, the canvas size, the clear colour, the cut plane, the pattern uniforms, and every object's id, visibility, pose (or matrix), light, material (version, colour, opacity, side, wireframe, clipping, map version, pattern slot) and geometry (id, draw range, attribute and index versions). It draws only when the snapshot differs from the last drawing, the controls moved, or `requestRender()` asked.
- There is no need to remember to ask: anything that changes what is shown changes one of those numbers. A new kind of change (a shader uniform moved by hand, say) must go into the snapshot, or call `requestRender()`.
- Idle: 0 drawings in 2 s (was about 120). A drag draws every frame.
- The jsdom renderer stub has no `getClearColor`; the first version crashed the page in the tests, so it is guarded.

**Picking with boxes** (`meshBVH`, `bvhRaycast` in the core; `geomBVH`, `boxedRaycast` in the app):
- A bounding volume hierarchy: median splits along the longest side, leaves of up to 8 triangles, found by quickselect, with storage that grows. The ray walks the nearer child first with slab tests, and uses Möller–Trumbore with three.js's culling rule: FrontSide counts only faces with det > 0, DoubleSide both. A zero direction component uses 1e30, never NaN.
- `boxedRaycast` replaces `raycast` on the model meshes and on `baseMesh`, so every existing pick (brush, preview, eyedropper, recolour, measure, placing artwork) uses it. The ray goes into the mesh's own space with the world's length, so `t` stays the world distance. Material arrays and BackSide fall back to three.js.
- Boxes are cached per geometry and position version. Up to 30 000 triangles they are built on the spot (a few ms); bigger ones go to the helper thread, and picking falls back to three.js until they arrive.
- Tests (`tools-speed-test.js`, `npm run test:speed`):
  - Every ray on the figure, a sphere and 3000 random triangles (degenerate ones included, rays along the axes, front faces only and both sides) finds the same nearest hit as testing every triangle: 2200 rays.
  - Building takes 419 ms for 569k triangles; a pick takes 0.02 ms against 14.8 ms.
  - In the app, 300 rays on the painted vase find the same triangle, point and normal as three.js.
  - In Chromium, 400 screen picks on the vase and the project box are identical, at 0.015 ms against 3.9 ms.

**The helper thread** (`onHelper`, `helperWorker`, `helperMain`):
- A Web Worker made from the core's own `<script id="prcore">` plus a small message handler, through a blob URL made once. It does two jobs: `print` (runs `analyzePrintSteps` to the end) and `bvh` (sends the boxes back as transferred buffers).
- A newer printability job terminates the worker and starts a fresh one, rather than queueing behind a result nobody wants. Jobs still out are turned down; a turned-down `bvh` job is simply asked again on the next pick.
- If a worker cannot start (jsdom, an old browser, a Content-Security-Policy without `worker-src blob:`), or it dies, `helper.failed` is set and everything runs on the page as before (printability in 25 ms slices).
- In Chromium the helper starts from `file://`, and its printability result equals the page's own check on the vase and the project box.

**The mesh check once** (`meshCheck`): `runChecks` ran `checkMesh` on every part after each build and again when printability finished. It is now cached per solid, since parts do not change after they are built. On a rebuild of the project box: 5 checks for 5 parts.

**A race the speed-up uncovered**: the browser check's measuring tape (two clicks on the project box) found one point instead of two.
- A quick start dropped `exampleBusy` before its own last steps: a rebuild, 60 ms, then `schedule()` for a second rebuild 130 ms later. So `MakerForge.busy` read false in between, the check clicked, and the second rebuild cleared the first point (`refreshScene` clears measurements).
- The check passed only because drawing 60 times a second used to keep the page slow enough.
- Now a scheduled rebuild counts as busy (`rebuildPending`), and the quick start stays busy until its last rebuild is scheduled. Choosing an object had no gap: `rebuildAll` marks itself busy before its first await.

**Tests**:
- `test:speed` (new; the core part, and the app in jsdom, where there is no worker, so the fallbacks are what is tested).
- `tools-browser-check.js` checks the real worker, the picks, the printability match, idle drawing and drawing during a drag.
- All the other suites were run on the new build.

**Not done**:
- Builds (distance transforms, tracing, extrusion) still run on the page: they start from canvas pictures, so moving them means splitting each generator into a picture step and a geometry step.
- Painting a big model from a photo, and the colour-change count, also still run on the page.
- The worker has not been tried in Firefox or Safari.

## Session 23: close-up photos (v0.24.0)

Asked for: "start on close-up photos" (the core was ready from Session 20), with a new branch and pull request per release while the last one is open. This work is on `claude/v0.24-close-up-photos`, which starts from `claude/relaxed-dirac-cuhvec` (v0.23, PR #7); the owner chose that over waiting or adding it to #7.

**In the app**:
- `photoFitView` lines a photo up as from far away first, as before. Unless `v.near` is set by hand, it then runs `photoFitCloseness` at the angle found. If the camera was close (`k ≥ 0.15`), and the photo is being searched for its angle, it looks again within ±10° with that `k` (`photoFitAngles` with `opt.k`) and runs closeness again at any better angle.
- A photo from far away (`k` under 0.15) keeps the far-away fit exactly; the engine test's numbers for the existing photos are unchanged.
- `v.fit.k` (3 decimals) is saved.
- `photoFitNowFor` keeps `k` through a size change (`photoFitScaled`), and adds `ref`, the whole model's middle from `photoRefOf(model, cam)` (cached per model and angle), at every use. So the preview, the colour picking, `photoView` and `paintFromPhotos` on each part all see the model from the same camera. `ref` is never saved; `photoBake` strips it.
- The photo card has **How close was the camera?**: Work it out, Far away or zoomed in (`v.near = 0`), Arm's length (0.3) or Close up (0.7). The four buttons sit two by two (`.seg.two`): four in a row wrapped "Far away or zoomed in" onto three lines. A note under it says what the fit used, as times the model's height away (1/k).
- `cleanPaint` clamps `fit.k` and `near` to 0..`PHOTO_K_MAX` (1.2), and drops anything that is not a finite number.

**Tests** (`tools-photo-test.js`):
- Engine: two rendered close-ups have their closeness found:
  - k 0.6 at 20° up, found 0.56: 65.3% of the surface right as from far away, 84.2% allowing for it;
  - k 0.5 at 30° round and 10° up, found 0.525: 67.9% → 87.1%.

  The far-away front photo stays at k 0.
- App:
  - A close-up added on the Paint tab is worked out (k within 0.15, pitch within 6°), and the card says so.
  - **Far away** by hand lines it up worse; **Work it out** brings it back.
  - A project round trip keeps `k` and the paint.
  - A hostile project's `k` and `near` are clamped or dropped.

**Not checked**: real close-up photos from a phone (lens distortion is not modelled, only the perspective); a figure whose depth is large compared with its height, such as a model lying down photographed end-on, where a small `k` already changes a lot.

## Session 24: more accurate colour from a photo (v0.24.1)

Done from the website's Claude session, on its own branch (`claude/new-session-brpgo5`), started from `main` at v0.22.0 while this repository's session made v0.23.0 and v0.24.0 (Sessions 22 and 23), then merged onto Session 23's branch (`claude/v0.24-close-up-photos`) so it applies on top of both. Session 23's closeness controls and project format (`v.near`, **How close was the camera?**) are kept; this session's own closeness field was dropped in the merge. The owner imported `CristianoRonaldo.3mf` (a 17 cm figurine from MakerWorld, 319,622 triangles), added its product picture with the AI figure finder and 4 colours, and got the shaded half of the shirt, arms and legs in green, a green face and a striped base top: "its not doing it right, can we get more accuracy". The picture is a marketing image (very likely AI-made): the painted figure lit hard from the upper right on a dark grey backdrop, a grey copy of the figure behind it, round icons and a size label, the camera at chest height and close by. The model file and picture are the owner's (someone else's design) and are **not** in the repository.

**Why it went wrong**, each measured on the real files (app in jsdom, the 3MF converted to OBJ with `parse3MFModel` because JSZip never resolves in the test stub, a test-environment limit):
1. **Shade became a colour.** The 4 colours were dark grey-green, red, orange and *dark red* `#3a0e0a`: the shaded red took a filament, and the shaded sleeves, legs and face went to the nearest dark colour. The palette's light-and-shade rule compares channel ratios, and a strong colour's weak channels are noise in deep shade.
2. **The line-up was wrong**: 22° round, 12° up, outline 71%. The AI marks the grey copy too (it touches the coloured figure at a hand), plus the icons; the fit tilted the model to cover both. The picture is also from close by, which a camera far away cannot match.
3. **The base top was guessed, not read**: seen at about 12°, under the 0.2 facing weight (16°) a face needs to count as seen, so the fill spread the colours of the front's CR7 letters back across it in stripes.

**Changes** (`src/core.js` unless said):
- **Light** (`photoLight`, `photoUnshade`, `photoLitBy`, `photoTriNormals`): pixels on the lined-up model are grouped by hue (36 hue bins × 3 saturation bands; greys left out, burnt-out highlights left out); within a group log brightness must follow `amb + (1 − amb)·max(0, n·l)`, compared with a robust error against the group's mean. 400 directions × 11 fills on a sample, then refined; then the model's own shadow (`photoLitBy`, the model drawn from the light, cached per solid and direction) is kept if it explains more. Returns `{ dir, amb, shadows, fit }` or null when it explains under 10% (evenly lit). `photoUnshade` divides each model pixel by its shading (at most 5×) and leaves pixels that were nearly black (max channel < 24) in shade clear (alpha 0); `photoPalette` and `photoClasses` now skip clear pixels (also a cut-out PNG's).
- **Palette**: a pair of groups that are the same strong colour (each channel's share within 0.1, darker one at least 8% as bright) joins first, even below the number asked for: a spare filament no longer goes to a shade.
- **Line-up** (`photoFit`): after the first search, pieces of the mask the model does not touch are dropped (`focus`), then what lies more than 6% of the model's height outside the lined-up outline (`trim`, only when that is at least 3% of the mask); searched again, twice. On the owner's picture the mask's overlap with the figure went from 76% to 97% on test scenes, and the outline from 71% to 85%.
- **Closeness, worked out** (on top of Session 23): with **Work it out**, a new photo and **Line it up again** use `photoFitFull`: the angle searched as from far away and at k 0.45, the better kept (a closer camera must win by 2 points per 1 of k), then `photoFitCloseness` at that angle. At a given angle (the angle fields, mirroring, the background) only `photoFitCloseness` runs. `photoFitCloseness` now compares every k at the fine 400 px step (`opt.fine`; the coarse comparison took 0.075 for a camera at 0.2). On the owner's picture Session 23's way (angles from far away first) is what gave 22° round; with `photoFitFull` it is 0° round, 2° up, k 0.45, outline 85%. About 9 s per photo in Node on that model.
- **Facing from a close camera** (`paintFromPhotos`): each face's weight uses the line from the camera's position, not the far camera's axis.
- **Low angles through the inside**: a face seen at weight 0.05 to 0.2 counts as seen only through pixels with the model on all four sides two pixels away at about the same depth (not the outline, not beside a limb in front of the body). The base top is then read from the picture (green and red halves with the crest) instead of striped.
- **Strict mask** (`photoView(…, strict)`): with the AI's mask or hand fixes, no pixel the mask calls background is read, even in the model's middle (the colour method keeps the old rule for white on white).
- **Fill**: a seed's distance starts at up to 4% of the model's size by how squarely it was seen, so colours glimpsed along the outline spread last (`o.fillTrust === false` turns it off).
- App: **Even out light and shadow** (`o.shade`, on for new steps, `false` for steps saved before; in the cache keys), the light in words on the card (`photoLightWords`), `photoLightOf` / `photoReadPixels` (cached, used by the colours, the painting and the Colours it reads preview), `photoStrict` (the AI's map or hand fixes).
- **Line it up again** and the side buttons read the colours again (`photoPickColours`), as adding a photo and the AI button already did: after hand fixes the colours had been picked with the old fit and missed the base (65.9% of the surface right; read again, 80.1%).

**Measured**:
- The owner's case (app, AI, 4 colours), before → after: colours dark grey-green, red, orange, dark red → red, green, orange (skin and gold), grey (the boots, grey in the picture); face skin with hair, the shirt red with its green lower diagonal, red sleeves with green wristbands, the shorts' crest and 7, skin knees, red socks with green tops, the base top in its two halves with the crest, CR7 in gold. Still wrong: grey along the left leg (the grey copy stands beside it inside the AI's mask) and on the fingers (the AI's 320 px map cannot see between them); the back (one photo) is a patchwork guess.
- Five rendered product photos (`tools-photo-figure.js` `productPhoto`, cameras at k 0 to 0.7, 5° to 20° up, lit from either side), the AI's mask, 5 colours, the mean: v0.22.0's engine 80.5% of the surfaces the photo shows right and 69.3% of the whole figure; now 93.9% and 79.6%. The low-angle rule costs about 0.8 points of that on the test figure (its base top has the same colours as its front, so the old fill guessed it as well) and is kept for bases like the owner's; the trusted fill adds 0.5.
- The bookshelf photo (Session 17), found by colour: the books round the figure are now left out of lining up, so it lines up roughly (outline 78%, size off 3%, 75.8% of the surface right; it was 45%, 124% and 53.6%). The checks that expected the colour method to fail there were reworded; the AI still does better (80 to 82%).
- `tools-photo-test.js` section 5c (the engine on a product photo) and 7d (the app: the light note, closeness found, the five paints, shade off and on, Far away by hand then Work it out and Line it up again, a round trip, a step saved before this version) and the hostile file (k and shade); Session 23's 7b3 (a close-up photo) stays. The front-photo-only test moved 86.5% → 85.2% (limit 85%): the extra faces seen at low angles are all right, but they change where the fill puts the shirt and shorts line on the unseen back.

**Test runs** after merging Sessions 22 and 23: `tools-photo-test.js` (75 checks), `test:paint`, `test:project`, `test:aimodel`, `test:speed`, the smoke test and the Paint tab audit on a turned shape (no findings) all pass; the owner's case gives the same result as before the merge. Before the merge, the browser check (`ONLY=turned PAGES=0`) in Chromium: no findings; the two-photo footballer lines up at 2° and 180° (outlines 89% and 81%), painted all over in 23 s, the AI finder runs in the browser. The browser check was not run again after the merge (Session 23 ran it on its own changes).

**Not checked**: the owner's own case in a real browser (it ran in jsdom and Node; the browser check covers the test figure); a photo with several lights, coloured light or strong reflections (one grey key light plus an even fill is assumed; a light that cannot be made out is left alone); the time on a phone (about 9 s per photo here); a real print.

**Next**: a second figure touching the first could be dropped by colour or depth from the AI's map rather than by distance; a finer figure mask round fingers (the AI's map is 320 px); a better guess for the back from one photo (clothes usually go round: the front's colour at the same height); a crease-aware clean-up (boundaries on sculpted figures follow folds and hems).


## Session 25: squash merges without false conflicts (no app change; still v0.24.1)

Asked for: after v0.24.0 (#8) and v0.24.1 (#9) both showed "This branch has conflicts that must be resolved" once the release before them was squash-merged, and after being offered merge commits instead: "no i want squash and merge, fix the error instead".

**Why it happens**: "Squash and merge" puts a pull request's work on `main` as one new commit. Its files are the pull request's, but git can't link it to the branch's own commits. A branch started on top of that pull request (the next release, begun while the last one waited for review) still shares only the older `main` with it. So git measures both sides from there, finds both changed the same lines (version, CHANGELOG, the same code) and reports conflicts, although nothing really disagrees. #8 and #9 were fixed by hand in Sessions 23 and 24 by merging each file from the right starting point.

**The fix** (nothing in the app changes):
- `tools-after-squash.js` merges `main` into a branch from the right starting point. That is the newest commit of the branch whose exact files are already on `main` (a squash commit has the same files as the pull request's last commit when it was up to date), or, with `--from <sha>`, where the branch and the merged pull request part. Only `main`'s newer changes come in, and nothing the branch did is undone.
  - It works out the result with `git merge-tree --write-tree --merge-base=…` (git 2.40+; the container has 2.43). Then it makes a real merge commit (parents: the branch and `main`) with exactly those files.
  - It never rebases or force-pushes; `--push` is a plain push, refused if the branch moved.
  - Real conflicts (both sides changed the same lines even from there) stop it before anything changes, with the files listed (exit 2).
  - A branch not built on a squashed one is left alone ("a normal merge is the right one").
- `.github/workflows/after-squash.yml` runs it after every merged pull request into `main` (and by hand from the Actions tab), for each open same-repository pull request with `--from` the merged one's last commit. It runs `main`'s copy of the tool, saved before each branch is checked out. Real conflicts get a comment on that pull request instead. It needs `contents: write` and `pull-requests: write` (asked for in the file).
- CLAUDE.md: the owner keeps Squash and merge; start branches from the latest `main`; after a squash, use the tool, not a hand merge, rebase or force-push; `npm run test:squash`.
- This branch (`claude/relaxed-dirac-cuhvec`, last used for v0.23.0) was brought up to `main` with the tool itself: from 4769553, no conflicts, its files then exactly `main`'s.

**Tests** (`npm run test:squash`, 20 checks, throwaway repositories in the temp folder):
- the problem reproduced (a normal merge conflicts); after the tool, the branch's own files in a merge commit with both parents, a deleted file still deleted, and a clean merge with `main` afterwards;
- `main` moved on after the squash: that change comes in too;
- a branch that undid one of the squashed pull request's changes: a normal merge quietly puts it back with no conflict, the tool keeps it undone (why a hand merge isn't good enough);
- a real conflict: exit 2, the file named, the branch untouched;
- an unrelated branch left alone; a pull request squashed while behind `main` (only `--from` finds the place);
- `--branch` with `--push` against a bare remote: one commit added, not forced; trailers; uncommitted changes and bad options refused;
- the real history of #8 (7ce6d8a after eea0209) and #9 (a8ad830 after 6499316): both conflict normally, and the tool merges them with each branch's files unchanged.

The workflow's script was run locally with a stand-in for `gh`, against a bare remote. It used two open pull requests built on a squashed one: one was updated and pushed, keeping its changes plus `main`'s later fix; the other, with a real conflict, was left alone and got the comment.

**Not checked**: the workflow on GitHub itself (it only runs once it is on `main`; the first squash merge after that is its real test, or run it by hand from the Actions tab). If the repository's Actions settings forbid write access for workflows, the push and comment fail and say so in the run's log.

## Session 26: Bambu Studio's notice explained, section buttons on phones (v0.24.2)

Asked: "bambu slicer still shows invalid config", and "did you optimize for phone viewing?" (while starting more accurate colour from a photo, which comes next).

**Bambu Studio** (read in its source at the newest release, v02.08.04.61, and master; `src/slic3r/GUI/Plater.cpp` `load_files`, `src/libslic3r/Format/bbs_3mf.cpp`):
- A 3mf counts as Bambu's own only when its `Application` metadata starts with `BambuStudio-`. Otherwise `_load_model_from_file` sets `dont_load_config` and skips `project_settings.config`, but `Metadata/model_settings.config` (each part's extruder) and the triangles' `paint_color` are still read.
- Opened as a project (`load_config` true) with that empty config, 2.08 shows the notification *"The 3mf is not from Bambu Lab, load geometry data and color data only."* 2.07 showed it as a dialog with "Don't show again" (`skip_non_bambu_3mf_warning`); 2.08 has no checkbox.
- **Import geometry only** (the choice when a 3mf is dragged in, or File → Import) runs `load_files(…, LoadStrategy::LoadModel)`: `load_config` is false, the branch that resets everything but the extruders runs, and there is no notice. That is the advice now given.
- *"The 3mf file has invalid config, load geometry data only"* exists too, but only for a config that was loaded (`!is_bbl_vendor_config && !check_project_config`: two or more `nozzle_diameter` values with a different number of `extruder_type`). Our files never have their config loaded, and no version of the app has written `BambuStudio-`, so by the source the owner's message is the "not from Bambu Lab" notice. Asked for a screenshot in case it is the other one.
- Not changed, as in Session 10: claiming `BambuStudio-` would load our three-key config over the user's printer, process and filament presets. A complete, correct config per Bambu printer (hundreds of keys, with each system preset's values) could do it, but needs checking in Bambu Studio itself.
- The Slicer notes (Export tab), the notes in the zip (`README.txt`), the help hint and the manual (Files, and a new troubleshooting entry) now say this. The old notes claimed the spool colours come from `project_settings`; they don't for third-party files.

**Phones**: a phone check of v0.24.1's photo card (390 × 844, the footballer and two photos) found nothing cut off or off the screen. But the section buttons under the view ran past the edge with no sign: the Export tab's 11 buttons fit 7 at 390 px, leaving Share a link, Project file, **Slicer notes** and Help reachable only by swiping the row. The Make tab's last button was half off. The row now wraps (`flex-wrap:wrap` in the phone layout), all on screen at 360, 390 and 430 px. `pageLayout` in `tools-browser-check.js` now also flags section buttons off the screen; it only checked the app bar before.

**Tests**: the smoke test; the browser check with `MOBILE=1` before the change (no findings); a phone-width script (not kept in the repository) for the photo card, the Export tab's notes and the section buttons on every tab at 360, 390 and 430 px. All passed after the change, and the browser check with `MOBILE=1` passed again with the new rule.

**Not checked**: Bambu Studio itself (it is a desktop app; the advice comes from its source). A real phone.

## Session 27: bugs, freezing, photo accuracy, earlier versions (v0.25.0)

Asked: "a lot of things has broken in the app ... make a prio to hunt for bugs", "cannot build the model, cant read properties of undefined", then "when i removed all the art work from the art tab it worked again", "i imported the file without a problem", "its freezing and slow", "still not the best result from painting from a picture" (two screenshots of the owner's figurine), and "i want a way to add the older versions so the user just picks themselfs".

**Hunting** (Chromium through Playwright; scripts kept out of the repository, described here):
- Projects saved by v0.17.1, v0.20, v0.22, v0.23, v0.24.0 and v0.24.1 (every quick start, each version's `index.html` from git history, the same browser storage), then the current version opened over each: all build (v0.17.1's six artwork-only quick starts ask for artwork, as they should).
- Imports of 900 000-triangle STL, OBJ and both 3MF layouts: 3 to 6 s, no errors. A brush stroke on an imported model paints from the first stroke (a test that seemed to show otherwise had missed the figure).
- The owner's way through the app, for seven quick starts with artwork: import (the test footballer, then a two-part Bambu 3MF of 284 000 triangles with two filaments), a photo, Number of colours, the model's size, Add text, artwork clicked onto the model, its width, Line it up again, a filament removed, Undo, Export: no error. **The owner's "Cannot read properties of undefined" was not reproduced.**
- So `rebuildAll` now builds each piece of artwork on its own (try/catch): one that fails is left out (`d.solids = null`) and the notice names it, with the error and where it happened (`errWhere(err)`: the first function named in the stack, e.g. "(in buildItem)"); "Could not build the model" says where too. A screenshot of either now points at the cause.
- The "Far away or zoomed in" in the owner's second screenshot is set only by that button (or a project where it was pressed); **Work it out** puts it back.

**Freezing** (`longtask` observer in Chromium, a 372 842-triangle figure): adding a photo froze the page 7.5 s in one go (10.8 s in all); a size change 4.4 s; each artwork change about 0.8 s. Lining a photo up (`photoFitFull` / `photoFitCloseness` / `photoFit`) now runs on the helper thread (`helperMain` job "photoFit", `photoFitView` async): adding a photo now freezes at most 2.1 s (4.1 s in all). A line-up turned down because the thread was restarted for other work is asked for again; a newer line-up of the same photo makes an older one's result be dropped (`photoFitLatest`, a WeakMap, so nothing is saved). In Node on that model: the line-up 1.0 s, `photoLight` 0.7 s, `paintFromPhotos` 0.5 s, `meshTopology` 0.4 s, the paint mesh 0.4 s, the rest about 0.1 s each: a size change reruns all of it on the page. **Next**: the paint steps (light, unshading, `photoView`, `paintFromPhotos`) on the helper thread too, or caching them across a size change.

**Accuracy** (a five-scene benchmark: the product photo of the photo test and four more, a grey copy touching or overlapping the figure, light from either side, turned 25°; the AI's mask, five colours):
- `photoUnshade` brightens up to 10× (was 5×): with the light from the side the camera was turned away from, the red in deep shade stayed dark red, took a filament and pushed the hair into the skin's colour.
- Pixels too dark to read in shade: only under 8 (was 24). At 24, black boots and hair in half shade went unread and the fill gave them the socks' red: the legs were 9 to 13% wrong with the true line-up, now 2 to 8%.
- `photoFit` trims a second time at 3% of the model's height (6%, then 3%): a grey copy touching the figure pulled the angle 10° off.
- Mean of the five scenes, as the app lines them up: what each photo shows 91.8% → 94.5%, the whole figure 76.9% → 80.6% (with the true line-up 94.5% → 99.4% and 83.8% → 86.0%). Still wrong: a test figure turned 25° is lined up as from 1° (its round limbs barely change outline as it turns); the back from one photo.
- `tools-photo-test.js` passes (75 checks); the product photo's seen part 98.2%, the two close-ups 86.0% and 84.3% (84.2% and 87.1% before).

**Earlier versions**: `tools-release.js` and `.github/workflows/release.yml`. After each merge to `main` (and by hand), every version on `main` without a release gets one: tag `v<version>` on that version's last commit, its `index.html` attached as `maker-forge-<version>.html`, its CHANGELOG.md section (or the `major.minor` one, or today's) as the notes. The first run makes eleven: 0.15.0, 0.16.0, 0.17.0, 0.17.1, 0.20.0, 0.22.0, 0.23.0, 0.24.0, 0.24.1, 0.24.2 and 0.25.0 (versions squashed together into one pull request, like 0.18 to 0.19, have no commit of their own on `main`). `npm run release:dry` shows what it would do. The About dialog, the README and the manual link the Releases page.

**Tests**: photo (75), smoke, paint, project, speed and the browser check; the squash test is unchanged.

**Not checked**: the owner's own figurine and photo (not in the repository); the release workflow on GitHub (it runs once this is on `main`; the Actions tab shows it); a real phone.

## Session 28: the website error, and freezing (v0.25.1)

Asked: "when i launch the site through my website or through mobile i got the error. when i download the package from git it works fine" (https://retr0plus.se/maker-forge/app/), then "slow down and fix all the bugs and issues and why the app is so slow and freezes all the time, i thought the workers were gonna speed things up ... make a new pr".

**The website error.** The owner's site (the Website repository's `tools/import-maker-forge.py`) serves the app under a Content-Security-Policy with `script-src 'self' blob: 'wasm-unsafe-eval'` and `worker-src 'none'`. The importer moves the vendored libraries and the app's main script into `app.<hash>.js`, placed *before* the inline `<script id="prcore">`, and the policy blocks that inline script. So `PRCore` was undefined and every build failed with "Cannot read properties of undefined (reading 'coverageField')"; phones visiting the site saw the same, while a downloaded `index.html` worked. Now the main script is a function, `makerForge()`, behind a small starter at its end. If `window.PRCore` is missing, the starter waits for the page (DOMContentLoaded, since the site puts the app first), loads the library's own text as a `blob:` script (the policy allows `blob:`) and then starts; if that fails as well, the notice says to download `index.html`. Checked against a copy of the site's layout and policy served locally (scratch `sitesim.js`): v0.25.0 shows the owner's exact message, v0.25.1 builds. **The site still serves v0.25.0 until it is imported again.** Its `worker-src 'none'` also blocks the helper thread, so on the site the printability check and the photo line-up run on the page: allowing `worker-src 'self' blob:` there would bring them back (the Website repository was not changed).

**Freezing** was measured with a `longtask` observer in headless Chromium (software WebGL): every quick start opened, then its first slider moved (scratch `freeze.js`), plus CPU profiles of the worst (scratch `profile.js`). In headless Chromium with software graphics, the longest single freeze, v0.25.0 → v0.25.1:

| Quick start | Opening it | Its first slider |
|---|---|---|
| Name keychain | 2783 → 439 ms | 1393 → 278 ms |
| Double-sided tag | 1244 → 247 | 1217 → 232 |
| Kids' puzzle | 3398 → 302 | 515 → 385 |
| Lithophane | 1702 → 194 | 800 → 277 |
| Lithophane lamp | 733 → 345 | 794 → 341 |
| Jigsaw puzzle | 816 → 423 | 629 → 461 |
| Trace a part | 824 → 227 | 524 → 222 |
| Plastic canvas | 669 → 97 | 740 → 100 |
| Phone case | 740 → 403 | 487 → 152 |
| Cookie cutter | 341 → 220 | 257 → 188 |

The other twelve were under 0.4 s before and stay there (within a few tens of milliseconds, which is the measurement's own spread). The page was frozen in all, opening the Name keychain, for 4.9 s, now 0.9 s.

What took the time, and what changed (each core change is checked number by number against the old way in `tools-speed-test.js`):
- `edt` (distance fields, used by name plates, the tracer, puzzles and the photo painter): the pass down the columns read memory a column at a time. For a mask it is the distance to the nearest set pixel above or below, now found in two sweeps in row order: the same values, about twice as fast.
- `checkMesh` sorted every directed edge (0.6 s on the 569 000-triangle figure). Edges now go in a list under their lower corner and are paired there: the same open-edge count and volume, about 7 times faster.
- `heightSheet` (lithophanes, phone cases): triangles with all three corners on the sheet skip the per-triangle lists. The same solid.
- **Name plate**: the outline is a field taken straight from the distances to the letters (`border − distance`, or for joined letters the distance into the grown shape minus the join), with the keyring tab and its hole as the larger and smaller of that and their circles: two distance passes instead of four, and smoother. On four test names it lies within 0.08 mm of the old outline with the same pieces and holes (scratch `fieldcmp.js`). Working on a half-size grid was tried first and dropped: it closed a small hole and joined two pieces. Letters, the top layer, the picture's colours and the back are traced in a window round them (`traceIn`); the picture's colours are read from its own rectangle; the mask and the letters' coverage come from one canvas read; the build pauses between steps.
- **Pictures**: `resample` keeps the last four sizes of each picture (every caller gets a copy). Source pictures, examples and thumbnails are drawn in memory (`willReadFrequently`), not on the graphics chip: every read back from the chip stalled the page (a puzzle's picture: 0.9 s). Pictures kept with the project are written as PNG in the background (`pictureAsset`: `toBlob`, the getter writes it on the spot if asked sooner), and the autosave waits for them (`saveLocal`). Artwork buttons use small thumbnails (`thumbURL`).
- Opening a quick start built the model twice. It now builds again only when a picture whose width changed is laid on the model, or is a cookie cutter's outline.
- An imported model's geometry, the copy pictures are laid on, and so its picking boxes are kept from build to build while its solid is the same (`keptGeom`, `keptSoup`): on a 373 000-triangle figure coloured from a photo, opening the Export tab froze 0.7 s, now 0.2 s; a picture's width 0.86 s, now 0.6 s; adding a photo 3.1 s, now 2.1 s at most.
- `schedule()` waits `clamp(lastBuildMs × 0.4, 130, 450)` ms after a slider stops, so a slow model is not rebuilt at every pause in a drag.
- The tracer pauses between its four steps; a box's or phone case's logo is split and traced once per picture, size, scale and filaments (`encLogoCache`).
- **Plastic canvas**: since v0.20 (examples on the Start buttons) its picture was built twice, as stitches and as a decal over them: it is now in `CONSUMES_ART` (the Art tab shows mirror, colours and smoothing for it). Each hanging hole overlapped a corner hole, and with **Leave the background open** every open square overlapped its four corner holes; earcut then left plastic inside holes. Corner holes that would touch a hanging hole or an open square are left out (so an open background keeps its bars, like real canvas), overlapping openings are joined exactly (`rectUnion`, core), and a convex outline with 64 or more holes is triangulated in upright strips between columns of holes (`stripsOf` in `triangulate`; earcut's cost grows with the square of the number of holes: 90 stitches across took 3.5 s, now 0.35 s).

**Tests**: all pass on the final build: smoke (every quick start, object and button), print, jigsaw, lithophane, project (every quick start comes back unchanged; out-of-range values), art, tracer, speed (with the new number-by-number checks of `edt`, `checkMesh`, strips and `rectUnion`), enclosure, phone case, paint, photo, opening models with their own colours, and the browser check in Chromium. `tools-audit.js` finds no dead controls on the plastic canvas, name plate or tracer. The print survey against v0.25.0 shows no new warning; the Plastic canvas quick start's 27 bridges, 0.1 mm² of support and 11 walls thinner than the nozzle are gone (they were the decal over the stitches), the canvas object's 2 bridges too (the hanging holes).

**Still slow**: changing the size of a big imported model coloured from a photo (4.2 s in one go on the 373 000-triangle figure, 5.3 s before). The scale is built into the model's solid (`stlCache` is keyed on it), so the weld (0.5 s), the paint mesh and its topology (0.7 s), the light and the shade taken out of the photo (1.1 s) and the painting (0.6 s) all start again. Next: keep the solid at 100% and apply the size as a transform (the print frame already scales, `modelMatrix`), or move the paint steps to the helper thread (Session 27's next step).

The release workflow ran when v0.25.0 was merged: the Releases page has 0.15.0 to 0.25.0, each with its file.

**Not checked**: a real phone; the live site (it needs the new version imported); Firefox and Safari; whether `toBlob` keeps the page free in every browser (Chromium encodes away from the page).

## Session 29: bug hunt (v0.25.2)

Asked: "fix bugs" (after v0.25.1 was merged).

**Hunting** (Chromium through Playwright; scripts kept in the scratchpad, not in the repository):
- `chromehunt.js`: every quick start and the objects without one (turned, box, cylinder, hex, sphere); on the Make, Art and Colours tabs every slider at its lowest and highest, every drop-down's choices, every tick box both ways, each followed by a check for page and console errors, failure notices, empty parts, NaN or out-of-range corners, open edges and builds still running after 90 s. 2 602 changes over 27 quick starts and objects: nothing found (one false alarm: "NaN" inside "banana socket").
- `phonehunt.js`: an iPhone-sized touch screen (390 × 844) on a copy of the owner's website (its layout and security policy, `sitesim.js`); every quick start, every tab and section tapped; page errors, failed builds, controls past the screen's edge, sideways scrolling: nothing found.
- The owner's way of working on that copy, phone-sized: import the test figure (372 842 triangles), add its photo: lined up (89% outline), all painted, no errors, but the page froze 5.0 s at once (no helper thread there).
- With helper threads blocked, the printability check still finishes on the page (1 to 3 s after a build).

**Fixed**:
- **Lining a photo up without a helper thread** froze the page for the whole search. `photoFitAngles`, `photoFitCloseness` and `photoFitFull` are now generators (`…Steps`), one fit per step; the old names run them in one go (`runSteps`: the helper thread and the tests get the same results), and `photoFitView` runs them a step at a time with `yieldUI()` when no helper answered, dropping the result if a newer line-up of the photo started or the photo was removed meanwhile (`removePhoto` forgets it in `photoFitLatest`). On the website copy: 5.0 s → 2.1 s at most (the painting after it), the same line-up.
- **The AI figure finder on a website that only allows its own downloads** (`connect-src 'self'`, as the owner's): its engine came only from jsDelivr. `AI_FIGURE` now looks for `ort.wasm.bundle.min.mjs` and `ort-wasm-simd-threaded.wasm` in `models/` first, like the model (the same SHA-256 checks); the runtime is still told its jsDelivr address for `import.meta.url`. On the website copy with the three files in `models/`, the AI cut-out works and nothing is fetched from elsewhere. `models/LICENSE.md`, the message and the manual say what to put there. **The website needs those two files from `onnxruntime-web@1.30.0/dist/` copied into its `models` folder.**
- **"Bigger than the print bed"** measured the parts where the view showed them (`partOffset`): a layered lightbox laid out wider than the bed passed with Layout off, and Explode could push a model that fits over the bed's height. `runChecks` now measures the print frame (`printBounds()`) whenever the parts have a layout, the model is turned, or Explode is on. `tools-printability-app-test.js` checks a layered lightbox of eight 100 mm layers (822 mm laid out) with the view showing it put together; it fails on v0.25.1.

**Tests**: all pass on the final code: smoke, print (with the new bed test), speed, project, art, paint, photo (it runs in jsdom, which has no helper thread, so it lines photos up step by step), the model test and the browser check.

## Session 30: one filament at a time, paint steps, instant resizing (v0.26.0)

Asked: "finish all the tasks for now" (the task list after v0.25.2).

**An imported model's Scale (%) is a transform** (the last of Session 28's speed items). It used to be built into the model's solid, so a size change re-imported, re-welded and re-painted the whole model (4.2 s frozen on the 373 k-triangle test figure coloured from a photo). Now:
- `modelScale()` = the model's size (Size and mirror) × the import's own scale. Every place that used `state.model.scale` uses it (`modelMatrix`, `printShift`, `printedParts`, the view, the bed and size checks). `frameKey` includes it, so the print-frame caches follow.
- The stl build welds the model at 100% once (`stlCache` no longer keys on the scale), and the field's `onChange` only refreshes the scene and the checks.
- The paint and the photo fits were already in model units (paint steps normalised to the model's bounds; a photo fit records the box it was made at, `photoFitScaled`), so they follow without change.
- Pictures and text placed on an imported model are now in model units too, so they grow and shrink with it. **Projects are now `v:6`.** `sanitizeProject` converts older projects with an imported model whose scale was not 100%: each item's `place.c`, `width`, `offU`, `offV`, `height`, `minH`, `maxH` and `embed` are divided by the old scale, so the project prints exactly as before. `tools-project-test.js` checks a v5 project at 150% (width 30 → 20, the place point [30, 15, 0] → [20, 10, 0]) and that a v6 project is left alone; `tools-photo-test.js` checks that 150% keeps the same solid and paint and makes the printed model 1.5 times taller.
- Measured in Chromium (`perf.js` in the scratchpad, the test figure and its photo): the size change froze 4.2 s; now 0.05 to 0.1 s.

**One filament at a time: paint as pauses** (painter idea 6). `C.layerSlots(parts, h)` already gave each layer's colours as bits (Session 18). The new `C.pauseColours(bits)` picks one colour per layer for a printer that can only swap spools at a pause (M600): a layer keeps the loaded colour when it has it (a name's foot, sunk into its plate, prints in the plate's colour), otherwise takes the colour that goes on furthest up. It returns the start colour, the swaps (`{ layer, slot }`), how many layers had more than one colour, which colours lost out there, and the colours that never print (only ever sharing layers with another).
- `runChecks` uses it whenever the printer loads one filament and the model uses more than one colour, painted or as parts. A model it can print is a yellow warning ("Uses 3 colours on a one-filament printer: 2 swaps by hand"); a colour that never prints keeps the red problem and names it.
- `lastChecks.swaps` (the Export tab's **Colour swap heights**) is the start colour and then each swap as the height of the top of the first layer in the new colour, `(layer + 1) × layer height`, and the layer number (1-based), as the slicer's layer slider shows them. The old list had one swap per part colour at the part's lowest point: painted colours were left out, a colour that came back was listed once, and a name sunk into its plate got its swap below the plate's top.
- `colourChangesText(title)` writes `colour-changes.txt` for the zip: the start colour, each pause and how to add pauses in PrusaSlicer, Bambu Studio / OrcaSlicer and other slicers (`MF.paint.swapText` for the tests: the page's JSZip can't finish in jsdom, see Known bugs).
- Assumes the slicer's first layer is as thick as the others; the text says to pick the nearest layer otherwise.

**Paint steps can be hidden and named** (painter idea 11). Each step in the Paint list has **◉/◌** (hide for now: `o.hide = true`, left out of `applyPaint` and so out of the model and the print) and **✎** (rename in place: Enter keeps, Escape cancels, leaving the box keeps; at most 40 characters). `runChecks` warns when steps are hidden and names them. `cleanPaint` keeps `name` (text only, control characters removed, 40 characters) and `hide` (only `true`); the paint test checks both, and that a name with markup is shown as text.

**Mirror-safe paint** (painter idea 13): checked rather than changed. `mirrorSolid` and `affineSolid` (with a negative determinant) flip each triangle's winding in place, so triangle order, and with it the paint, stays as it was. The paint test now mirrors a painted vase, and mirrors and turns it: the same paint on every triangle, the stroke on the other side, the same positive volume, closed, and on the bed.

**Colour from a photo on the helper thread** (the last of Session 28's speed items on the page itself). Adding a photo to the 373 k-triangle test figure froze the page 2.4 s at once (4.0 s in all), changing its number of colours 1.0 s. The profile: finding the light (`photoLight`, 1.2 s), evening it out (`photoUnshade`, 0.7 s), reading the colours onto the model (`photoView` and `paintFromPhotos`, 1.4 s), preparing the mesh for paint (`meshEditor`, `meshTopology`, 0.75 s, once per model).
- A new helper job, `photoPaint`, does the first three: given the solid to paint, the model (for the light), each photo's pixels, its fit, the recipe for its figure outline (the colour method's tolerance, or the AI map, and the hand fixes: the outline is found again there) and the light if already known (else the 480 px photo to find it in). Without a solid it only finds the lights and evens the photos out (for picking the colours).
- `photoLabels`, for a model of at least `photoHelperMin` (40 000) triangles, starts the job and returns the last result meanwhile (marked `pending`, so the photo card's counts wait for the real one). The answer goes into `pc.photo` and the page's own caches (`photoLightCache`, `photoShadeCache`, under the same keys, `photoLightKey` and `photoShadeKey`), then the model is repainted. `photoColoursNow` (every place that picked the colours and then repainted) asks the helper for the lights and the 400 px evened-out photos first. `photoRepaint` asks for the colours before it repaints, so the model is repainted once.
- `MF.busy` counts the jobs out. A job turned down because the thread restarted is asked for again; one that fails (or more than 3 restarts) sets `pc.photoOnPage` and the page does it, as it does with no helper (jsdom, a website that forbids workers).
- `MF.busy` (the tests' hook) now also counts a photo line-up under way (`photoFitting`): one done step by step with no helper thread did not count, so the photo test's "saved and opened again" check could save half way through a line-up and compare against a photo the line-up changed afterwards. It failed that way on v0.25.2's build too under load; the app's own Save still does not wait for a line-up.
- `onHelper`: a newer printability job no longer restarts the thread while other work (a photo) waits there; the old job runs out and its answer is dropped.
- The helper's colours are the page's to the triangle: the browser check colours the footballer on the helper (`helperMin = 0`), then again on the page from nothing (`MF.paint.photo.forget()`), and compares the palette and every triangle's paint; on the big figure, 4 and 5 colours, both identical.
- Measured in Chromium (`perf.js`, the test figure and its photo; the numbers move by a few hundred ms from run to run): adding the photo froze the page 2.0 to 2.4 s at once (3.4 to 4.2 s in all) without the helper, 1.0 to 1.1 s (about 2.0 s in all) with it; what is left is `meshEditor` and `meshTopology` getting the model ready for paint (once per model, on the page) and the first draw's shader. Changing the number of colours: 1.0 s at once without, 0.33 to 0.35 s with. `perf.js` now waits 0.9 s after a slider (some changes wait half a second before they start) and `MF.busy` counts the photo steps (`photoBusy`), so a step's work no longer spills into the next measurement. In one run of six, importing the figure froze the page 2.2 s (otherwise 0 ms); not seen again.

**Fixed: the print files kept the paint from before** (found by the browser check: after the photo step's colours came back from the helper, the layers page counted 0 colour changes on a painted figure). `printedParts()` is cached by `frameKey()`, which changes with the parts' geometry (`partsVer`), not their paint; `applyPaint` gives each part a new paint array but bumps `partsVer` only when the mesh changed. So since v0.17 a repaint that kept the mesh (a fill, box or lasso, recolour, Undo, a band's colour, an Auto colour setting, a photo) left `exportParts` (the zip, the 3mf files), `runChecks`' layer colours and the swap list with the old array. Brush strokes came through only because a stroke paints into the cached array live. The cache key now includes `paintRev`. The paint test changes a band's colour and checks the export has the new colour (on v0.25.2 the same change exports the old one).

**Bambu Studio and the filament colours** (task 46, researched only). Bambu Studio 2.5 added a "Standard 3mf Import color" step: a 3MF from another app with colours in the 3MF materials extension (`<m:colorgroup>` per triangle, or `<basematerials>` per object) is turned into colour painting, with a dialog that maps the colours to filaments and adds filaments. Users report it as buggy (it repaints whole parts, adds 10+ filaments even on Cancel, filament numbers change between imports); Bambu Lab's issue [bambulab/BambuStudio#9666](https://github.com/bambulab/BambuStudio/issues/9666) was still open in September 2026. Writing those colours into `model-bambu.3mf` might carry the colours across, but would also bring that dialog and turn our clean part-per-filament files into painting. Not done: it needs trying in Bambu Studio 2.5 or later first.

**The owner's website** (the Website repository, read in Session 30 when the owner added it to the session). Maker Forge lives on its own site, forge.retr0plus.se (since 2026-10-08; retr0plus.se's `/maker-forge/app/` redirects there). The owner's desktop runs the Website's `tools/forge-update.mjs`: within 15 minutes of a commit on Maker Forge's `main` it runs the smoke test (`QUICK=1`), imports the app with `tools/import-maker-forge.py --standalone` (every library, the ONNX Runtime files and the model fetched or copied and checked against the pinned hashes, so the site hosts them itself) and uploads it. The forge site's CSP already allows `worker-src blob:`. **So the website needs nothing by hand: Session 29's "copy the two ONNX files into `models/`" and "allow `worker-src`" were about the old copy inside retr0plus.se and are not needed.** Checked: the Website's import tool imports v0.26.0 without a complaint (its `AI_FIGURE` and runtime-address patterns still match), and the imported copy, served at an https address with its `.htaccess` CSP, opens in Chromium, colours the 373 k-triangle figure from its photo on the helper thread (100% painted, 2 helper jobs), runs the AI figure finder from its own files, with no CSP violations, no requests to other websites and no errors. Keep in mind when changing `AI_FIGURE`, the runtime-address line or the `<script id="prcore">` tag: the import matches them by pattern and stops if they change. Website work belongs in the Website repository's own session (the owner, Session 30).

**Tests**: all pass on the final code: smoke, project (with the v5 project at 150%), print, art, speed, paint (the pauses on bands, a name plate and a spot of paint; `colour-changes.txt`; hidden and named steps and a hostile project's names; mirrored paint; the export following a band's colour), photo, the model test, enclosure and the browser check (the helper's photo colours against the page's, triangle by triangle). The print survey has no new warnings, and the audits of the imported model and the name plate have no findings.

**Still to check by hand**: the pauses in a real slicer and a real print (that the heights land on the right layers in PrusaSlicer and Bambu Studio, and how a thicker first layer shifts them); the hide and rename buttons on a phone.

## Session 31: pictures in the back of a phone case (v0.26.1)

Asked: "when I add artwork on the phone cases it looks weird, like it's not sitting right and won't print well", then "do the fixes and try to improve wherever you see the chance". The owner sent two screenshots: a Pixel 8 case (154.2 mm) with the example's sunset and with their own picture, both shredded and flickering.

**Found, by opening a case in Chromium with several pictures and by measuring every phone** (`pcall.js` in the scratchpad: the down-facing area at z = 0, case + picture − the back without a picture, must be 0):
- **The Pixel 8 and 8a: the picture inside solid case.** Their camera bar runs right across the back, so the back's outline (`plate`, from `fieldToPolys`) is two pieces. `buildPhoneCase` added the picture's pocket to `plate[0]` only, which was the other piece: the whole picture (1306 mm² on the example) overlapped the case. In the view the two coplanar faces fought (the owner's screenshots); in a slicer the overlap is resolved one way or the other.
- **Nested picture regions** (a dot inside a ring, the middle of a letter): every region's outer ring became a hole in the plate, so a region inside another's hole became a hole inside a hole, and the island (the other region's hole, put back as case) covered it. 3.5 mm² on the example, on every phone; the same in a box's lid (`labHoles`, `labIslands`).
- The picture prints face down, so the right way up it was hidden; the view only turned over for the example (`view:"flip"`).
- The Art tab's preview was blank for a case's back and a box's lid: `encLogo` made its own cell map and never set `item._cm`.
- Gaps between two colours narrower than the nozzle were left as case: 0.19 mm walls between the cells of a honeycomb ("2 walls are thinner than the nozzle"). Each colour was already opened by half a nozzle; the gaps between them were not closed.
- A photo inlaid in four filaments becomes rough flat areas, without a word.
- Every case said "Needs support under about 114 mm²": the tops of the button and port openings. The print check's known weak spot: a flat ceiling whose ends meet rounded corners was never seen as held (see Known bugs, now fixed).

**Changed**:
- `inlayPocket(union)`: each region of the picture is a hole in the layer round it, unless it lies in a hole of another region (the smallest one containing its first point); each such hole comes back as an island, with holes for the regions inside it. The case gives each top-level hole to the piece of the back that contains it; the box's lid uses it for its logo and labels.
- `encLogo`: gaps narrower than the nozzle (closing the union by half a nozzle, away from the grid's edge) take the colour of a neighbour; the preview's cell map (background left out) and raw map go on the item (`_cm`, `_raw`, `_inlay`; `_inlay` is a runtime key); and an `advice`: "photo" when the picture has more than 400 colours at 4 bits a channel, "colours" when over a quarter of it is more than 80 (RGB) from its filament. Both become messages.
- `autoFlip(want)`: the case turns over when its back has a picture (and back when it has none), unless the ⟳ button was used (`flipChosen`, cleared when another object or example is opened).
- The case's messages go into the checks (Export) and, for the picture, onto the Art tab (`artWarnings`); the Art tab re-renders after a build when they change, else redraws the preview.
- The "Fine detail is thinner than the nozzle" check skips switched-off pictures and inlays (the inlay cleans its own).
- `matchToArtwork()` (Colours → Match to artwork, and a button under the photo message on the Art tab): with a picture inlaid in a case's back or a box's lid, the case's (or lid's) filament stays, the picture's background (the colour round half its border or more) is left out of the k-means, and the changed filaments are named with `colourWord` (plus their material if not PLA). It used to recolour every slot: on the Phone case quick start the case became white.
- **Print check** (`classifyFlats` in `src/core.js`): a cell beside a flat region is also an anchor when it is solid just above the ceiling's level (y + 0.05) and, for some depth d in 0.3, 0.6, 0.9, 1.2 mm, there is material within 2.5 d of it at d and at every shallower depth, the distance measured round the region, never across it (`roundDist`, a chamfer distance with the region as an obstacle). A circular corner reaches its 45° point at 2.4 times its depth. The window round each group of ceilings grows to 3.2 mm. The beam test (a 20 mm gap stays "support", span 20.00) and the lip test (still ledges) guard against holding too much. On the iPhone 17 Pro case: 115 → 68 mm² flagged; the slot tops are bridges (5.9 to 8.8 mm), except the two right-hand buttons (14.7 and 16.9 mm, over the 10 mm bridge setting). The case's message now says these are the openings' tops and to leave supports off. Two side effects found by the tests and fixed: holding cells along a lip's root, broken into stretches by the openings, made `twoSided` true, so the lip read as a bridge; a held region narrower than the ledge limit is now a ledge first (its span is its width). And the window: with one slot alone, the corner lay outside the old 3-cell window and nothing was found.
- Print survey against v0.26.0: no new warnings. Less flagged support where boxes and cases have rounded openings: Project box 45 → 25 mm², Power bank box 91 → 73, PSU box 652 → 633, Phone case 114 → 68; a few regions change between ledge and bridge (vase, tea light) without any change in support.
- Not done, and why: a pointed (45°) top on the openings, as boxes have, needs half the opening's length in height; a 17 mm button slot would need 8.5 mm, more than the 9 mm phone side allows.

**Tests**: all pass on the final code: smoke, phone case, print (with a slot with rounded ends), box, art, project, the real-browser check, the audits of the phone case and the box (no findings) and the print survey (no new warnings, less support as above). The new phone case checks (the pocket on the Pixel 8 and with a bullseye, stripes 0.2 mm apart, the turn-over and ⟳, the preview, Match to artwork) fail six times on v0.26.0's build and pass on this one; the slot test fails on v0.26.0's core.

**Still to check by hand**: a printed case with a picture on a Pixel 8 (the pocket) and on any phone (how the slot tops bridge in TPU); the turned-over view on a real phone screen.

## Session 32: cutting with Manifold (v0.27.0)

Asked, after v0.26.1: "should we do manifold and cutting and stuff?" (yes, as its own release), then "Go for it": watch the v0.26.1 pull request (it had been merged), then Manifold.

**What it does**
- **Art tab, How it prints: Raised, Engraved or Inlaid** for a flat or stepped picture on an object. Engraved cuts it into the surface; Inlaid cuts it in and fills the cut with the picture's colours, flush with the surface; a colour that is the object's own is not cut. **Depth** 0.2–5 mm (0.8). Not for a relief, not where the picture is the object itself (the `CONSUMES_ART` objects), and not on the jigsaw, lithophane, project box and phone case (`NO_DECALS`: the last two have their own inlays).
- **Import a model, Make tab: Cut it flat**, 0–60% of the model's height (0): everything below is cut off, so it stands on a flat face.
- Before you print: "This model has gaps in its surface, so it can't be cut" (the artwork is then shown raised, and the message says how to repair it), "The cutting tool could not be downloaded", "“name” is cut deeper than the model is thick", "Part of “name” could not be cut in".

**The library**: Manifold 3.5.4 (`manifold-3d` on npm, Apache 2.0): `manifold.js` (82 KB) and `manifold.wasm` (541 KB). `cutLoad()` gets them the first time a cut is asked for, the way the AI figure finder gets its files (`aiGet`: `models/` next to the page first, then jsDelivr; the same browser cache; each file checked against its SHA-256), imports the code from a blob URL and gives it its machine code (`wasmBinary`, and `locateFile: f => f`, so it never looks for a file by its own address, which a blob has none of). Tests hand in the library through `MakerForge.cut.hooks.module`.
- **Listed in `AI_FIGURE`** (`manifold`, `manifoldWasm`), though it is not part of the figure finder, so that the owner's website hosts its own copy with no change to the Website repository: its `tools/import-maker-forge.py` self-hosts every `name:{ urls:[...], sha256:"..." }` part it finds there, and stops if any jsDelivr address is left in the page. Checked: the import run on this build (in the scratchpad, from a copy of the Website's tools) fetches both files from npm, checks their SHA-256 and writes them to `vendor/manifold-3d@3.5.4/`; the imported copy, run in Chromium with the site's own `.htaccess` security settings, loads Manifold from there, inlays and engraves, with no blocked files, no requests to other sites and no errors. The Website's import also copies `models/LICENSE.md`, which now covers Manifold.
- **Also in `models/`** (like `u2netp.onnx`): for a website that hosts the app itself, and for the tests. Not an npm dev dependency: `manifold-3d` brings about 60 packages with it (gltf-transform, `sharp` with its native binaries, esbuild-wasm), and the Website's `forge-update` runs `npm ci` on this repository whenever `package-lock.json` changes. The tests load it with `require("./tools-test-env.js").manifold()` (the code is a module; it runs from a copy named `.mjs` in the system's temporary folder).

**The geometry** (`src/core.js`, after the 3MF reader):
- `cutBase(M, solid)`: the solid read into Manifold, kept by the caller (`{ M, man, id, solid, volume }`), or null when it is not closed (after `Mesh.merge()`, which joins corners repeated at one place). A solid facing inward is read again the right way out; pieces that overlap (eyes set into a head, a shell's floor inside its walls) are joined (`decompose`, `union`). `cutFree(prep)` deletes it: Manifold's objects live outside JavaScript's memory, and every one is deleted when done with.
- `cutSolid(prep, cutters)`: the base minus every cutter, and for each cutter marked `keep` the piece of the base it took (an inlay; where two cutters overlap, the earlier one has it); `removed[k]` (mm³) and `bad[k]` (a cutter that is not closed, left out). Each piece is cut from the base itself, not from what the cutters took together: that has the cutters' own walls, and cutting along walls that lie exactly on each other is slow (0.8 s rather than 25 ms for the contour-map example's 32 000 cutter triangles). A base over 20 000 triangles is first cut down to a box round the artwork. A cutter's own pieces (letters, bands) are not joined: joining hundreds took most of a second.
- `cutFlat(prep, y)`: everything below `y` (up is +y) cut off (`trimByPlane`).
- Every triangle of a result knows where it came from: Manifold keeps each input triangle's number (`faceID`) and which input it was (`runOriginalID`, one `reserveIDs` each). `from` is −1 for the base, k for cutter k (or the flat face), `face` the triangle of that solid.
- `cutSources(cut)`: each triangle's source triangle in the base: its own, or for a cut's walls and floor and a flat face, that of the base's triangle beside it, spread in from the cut's edge one triangle at a time over shared edges (8 ms; a nearest-centroid search took 1.2 s). `cutCorners(cut, src, source, { cc, uv, texOf })`: an imported model's own colours (9 colour bytes and 6 texture numbers per triangle) worked out again at each new corner from its place in its source triangle.
- Manifold's JavaScript takes `[x, y, z]` only as an Array made in its own window (`instanceof Array`); arrays from jsdom's window failed with "Missing field: x". `cutFlat` passes `{ x, y, z }`, which works everywhere.

**The app** (`src/app.html`):
- `buildItem`: when `cutMode(d)`, the picture's solids are cutters, from `CUT_OUT` (0.6 mm) above the surface, so the whole surface is cut also between the points they were laid on, to `d.depth` below it. `d._cut` and `d._cutInfo` are runtime keys.
- `rebuildAll`: if any picture wants a cut, `cutReady()` (the download, with a busy line) and `cutPrep(parts[0].solid)`; `cutBlocked` is "open" (not closed) or "load" (no library), and the pictures are then built raised. After the pictures, `cutArtwork(parts, items)`: the first part becomes the cut one (`cutPart` carries an import's `importPaint` and `importColour`), and the inlay pieces are added as parts (`decal`, `inlay`). `cutCache` keeps the result while the base solid and the cutters are the same objects; `cutPreps` keeps two read-in solids (an import cut flat and then engraved needs both).
- Depth check: a picture that took less than 0.8 × its cutters' volume × depth / (depth + `CUT_OUT`) is "cut deeper than the model is thick" (the cutters' volume below the surface; on a sphere and a vase the estimate was within 1.5% of what was cut).
- **Cut flat** (`cutModelFlat`, right after an import's solid is built, before pictures are laid on it): the model keeps its own coordinates, because paint steps are stored in them (brush points, height bands, photo fits), and is lowered onto the bed by `cutDrop` where it is drawn and printed: `printShift()` gives `[0, −cutDrop × scale, 0]` without a turn and `printedParts()` adds it; with a turn (Optimize), the turn's own shift already sets it on the bed. Reopening the same model file for a project saved without it keeps the flat cut, as it keeps the scale.
- Settings: `item.cut` ("raised", "engrave" or "inlay"), `item.depth` (0.2–5), `base.stl.flat` (0–60), all clamped by `sanitizeProject`.

**Measured**: in Node on a 359 000-triangle model: reading it in 0.78 s (once), cut flat 0.63 s, an engraving 0.5 s, `cutSources` 0.13–0.2 s, `cutCorners` 0.1 s. In Chromium: the first inlay, with the download and the check, 0.5 s; a rebuild with an inlay on the cylinder about 150 ms. On the 373 000-triangle figure in Chromium (`demo-cut.js` in the scratchpad), the page frozen for: the first cut flat at 2% 3.4 s (with starting the library and reading the model in, both once); a text engraved into it 1.5 s the first time (reading the flat-cut model in), then 0.75–0.8 s for each move; the same text raised 0.1 s. The contour-map example inlaid in a box, in the test page (jsdom): 2.2 s → 0.86 s after the two speed-ups above.

**Tests**: new `tools-cut-test.js` (`npm run test:cut`; `CORE=1` for the library only), 58 checks:
- the library on a box: closed results; each cutter takes 10 × 10 × 2 mm; what is left, plus the inlay, plus the engraving, adds up to the box exactly; the inlay is flush with the top; the box itself is untouched; every triangle says where it came from; colours carried over (the box's own, and the colour round an engraving for its walls and floor); cut flat at 2 mm; a cutter facing inward is turned the right way out; a solid with a gap is refused; two overlapping pieces are joined;
- in the app: without the library (no download in the test page) the cut is marked as not possible and the picture is shown raised, with the message; engraved into a box (no extra parts, closed, about the badge's area × 1 mm taken out, the print file closed and on the bed, the Art tab shows Depth and not the raised settings); inlaid (a closed piece per colour, the box and its inlays add up to the whole box, flush with the top, each piece in its filament; a picture in the box's own colour leaves the box whole); 5 mm into a 3 mm box is reported, 1 mm is not; a ball with a gap can't be cut, says so and shows the picture raised; a ball cut flat at 10% (closed, 3 mm off, on the bed on a 253 mm² face, the slice's area; on the bed at 200% too; a box opened after it is not lowered: this caught a bug, `cutDrop` was only reset for imports, so a box opened after a flat-cut model sat 3 mm under the bed; back on the ball it is cut again; the Make tab says how much it cuts off); a two-colour OBJ keeps every triangle's colour through a flat cut and an engraving, and so does its paint; a project keeps the settings and none of the working values, and a hostile one (a cut of markup, depths of 10⁹ and −3, flat cuts of −40 and 10⁶) is cleaned.
- The audit has a `CUT=engrave|inlay` option: `CUT=inlay` on the box and the cylinder, `CUT=engrave` on the sphere, vase, hex, frame, board and bobble head (Art tab): no findings.
- A sweep in the scratchpad inlaid each object's example (or a badge) into every object: every one could be cut, nothing open, and the box, cylinder, hex, frame, board and bobble head add up exactly (the shell less by the overlap of its floor and walls, now joined).
- The real-browser check has a cutting step: the badge inlaid and engraved into the cylinder by clicking the Art tab's buttons (Manifold downloaded through the check's copy of jsDelivr, checked and run), and a ball opened as a file and cut flat; screenshots `cut-inlay`, `cut-engrave`, `cut-flat`. The step first switched every picture back on at its end, which changed the later painted-3mf step; it now puts back which were on.
- All suites pass: smoke, cut, project, print, art, paint, box, phone case, models with their own colours, speed, photo, jigsaw, lithophane, tracer, and the real-browser check. The print survey shows no change from v0.26.1 (nothing is cut unless asked for).

**README and manual pictures** (asked for after the pull request: "update the information on the GitHub and website, with new pictures"): every picture `tools-screenshots.js` makes was taken again with v0.27.0, and two scenes are new: `cutfigure` (the footballer GLB in its own colours, cut flat at 3%, a dark "10" inlaid in the white number patch on its back; `docs/images/cut-figure.jpg`) and `artcut` (the bee coaster inlaid, on the Art tab's How it prints page; `docs/manual/art-cut.jpg`). Both are in the README's screenshot table, the second in the manual. The tool serves Manifold from `models/`, opens the How it prints page through the rail, and lays out the gallery on a blank page (on the app's page, the app's own timers failed with "Cannot set properties of null"). The README's version badge said 0.25. Two `setPointerCapture` calls of the photo fixer were the only ones not in a `try` (simulated pointers in the picture tool made them throw, which skipped the rest of the stroke's set-up); they are now like the others. The How it prints page's help line mentions raised, engraved and inlaid. GitHub's About box (description, website, topics) cannot be changed from this session ("Repository settings writes are not permitted through this proxy"): the owner was given the text. The website's Maker Forge page (retr0plus.se/maker-forge/, in the Website repository) still says v0.24.1 with What's new up to v0.25.2; its pictures are its own copies in `site/img/projects/maker-forge/`. That is for the Website's own session: the owner was given a prompt for it.

**Not done, next**: split a model in two at a height, with holes for filament pins (the top half laid beside the bottom on the bed; pictures and paint that cross the cut must be split too); a hole through an imported model (a keyring loop); cutting on the helper thread (on a 300 000-triangle model each change to engraved artwork takes about a second on the page); a relief carved in. A model with gaps is not repaired by the app.

**Still to check by hand**: an engraved and an inlaid print, and a flat-cut figure on the bed; how slicers take the inlay pieces (they touch the object exactly); Firefox and Safari.

## Session 33: business cards (v0.28.0)

Asked after v0.27.0: "I want to be able to make business cards, 3d printed, what do you think", then "make the card, i want to make it a little flashy too", then "the credit card size sounds good, add nfc pocket as an option and on question 3 you should do both as options, the more options the better in all parts of the app" (question 3 was a QR code with a web address or a contact card: both are options, and either side can have its own).

**What it does**: a new object, **Business card** (`card`, in Personalise, and a quick start with its example). Make tab pages: the basics (size, upright, layout), Name and details, Fonts and sizes, Colours, QR code, Logo, Border and band, Pattern, Back of the card, Printing the card, NFC tag, Keyring or lanyard hole, Copies. The Art tab's picture is the card's logo (`card` is in `NO_DECALS` and `ART_USED_BY`; artwork is never laid on a card as a decal). Settings are in `state.base.card` (see `DEFAULTS`); `cleanCard` checks every one of them in `sanitizeProject`, building the card again from its defaults.

**How a card is built** (`buildCard` → `cardOne` → `cardFace`, in `src/app.html` after the phone case):
- Each face is drawn into a picture of the face, 16 pixels a millimetre (fewer for a big card: about 2.6 million pixels at most), as layers: the pattern (z 10), the band (20), the border (30), the NFC mark (35), the QR code's patch (40), the logo (50), the code's squares (55), the words, icons and the line under the name (60). The words, icons, logo and QR code are drawn with the canvas (`cardDraw`); the card's outline, the border, the band and the patterns are worked out at every pixel from a signed distance (`cardField`, a one-pixel ramp), so their edges are exact with or without a real canvas. A true distance lets one pixel far from any edge fill the run of pixels it vouches for (most of the card); a pattern is worked out every other pixel and the distance read off in between (`cardFieldCoarse`). The outline is kept (`cardFieldCache`) while the size and shape stay the same.
- `cardCompose` stacks the layers from the top: each takes the coverage nothing above it took (`min(f, 255 − taken)`), in its filament; an element in the card's own filament punches the layers under it (a QR code's dark squares in the card's colour show the card through a light patch). What is in the card's colour with nothing under it (`free`) cannot be seen when flush (a warning says so), stands up when raised and is cut when engraved.
- Each filament's share is traced (`cardTrace`: `fieldToPolys` at 127.5 on the byte field, in a window round what is set) and extruded. Faces: the one on the bed is always flush, its first layers (`depth`, rounded to whole layers, at least two); the one on top flush, raised or engraved. The bed face is mirrored into the plan; the plan is the top face as seen from above. The hole, a leaf corner and anything placed left or right is set as seen from the front, so the back is drawn with the outline mirrored.
- **Nothing too thin to print**, as for inlays in a case's back (Session 31): after stacking, a gap between colours narrower than the nozzle (between two letters, in a small letter's middle) takes the colour beside it (`cardFillGaps`: the colours' union closed by half a nozzle, the new pixels given to a neighbour, and its value set so its edge with the other colour stays where that colour's is: the layers still fit exactly); a pattern's line cut to a sliver by the border, the card's edge or the clear space round the words loses that sliver (`cardTrimPattern`: an opening by half a nozzle, on the pattern's own pixels only, so lettering is never thinned). Pattern, border and icon lines are at least 1.2 nozzle widths, so the trim never takes a whole line. The envelope icon is an outline (filled and cut by its flap, it left 0.35 mm of gold at its corners), and the company line is in the font of the rest (the name's font, Bebas Neue in the example, has strokes about as thin as a 0.4 mm nozzle at 3 mm). The print check on the example card, in Chromium with real fonts: no thin walls and no other message (before: 14 strips of card between letters, then 31 pattern slivers). Some options still get a note or two, which is fair: short dashes on a dashed border, a sunburst's tips, a guilloche fading in, a small monogram's letters. The print survey (jsdom, with its two-colour badge as the logo) shows 13 thin walls on the card: the gaps between the test page's box-shaped letters (0.44 mm, read as 0.35 on the check's 0.1 mm grid); with real fonts there are none. Every other object and quick start is as in v0.27.0.
- Layers of the body: the bed face's layer of card (with pockets for its colours), the core, the top face's layer, raised pieces on top; each slab closed, stacked. The colours fit exactly: on the example, every height is covered once (4612.2 mm² against 4612.0 worked out by hand) and the parts add up to the card's volume within 0.03%.
- **QR codes**: `qrEncode` (Session 33's encoder in `src/core.js`: numeric, alphanumeric or byte (UTF-8) mode, versions 1–40, L/M/Q/H, the 8 masks scored by the standard's penalty; every code checked against node-qrcode's for 316 codes while it was written) and `qrPayload` (link, vCard 3.0, MeCard, Wi-Fi, mailto with a subject, tel, SMSTO, text). The vCard leaves out the empty parts of N and the phone's type, so the default card's contact code is version 8, not 9 (0.64 mm squares at 34 mm). Error correction "automatic" takes the strongest whose squares are at least 1.75 nozzle widths, else the strongest at the smallest size. A code on both sides can have a different job on the back (a link on the front, a contact card on the back, as the example does). Square, rounded or dotted squares, three kinds of eyes, initials in the middle (then error correction H, the middle 22% left clear). A light patch goes behind the code when the code's filament is the card's own or not clearly darker; contrast and the square size are checked once the finish is known (a code raised in one colour keeps its patch, in that colour, with the squares as holes).
- **NFC**: a pocket for the tag (0.4 mm wider than it) from the top of the bed face's colours (at least 0.4 mm of floor), as deep as the tag plus 0.1 mm in whole layers, with at least 0.4 mm (and the top face's own layer) over it; the card is made thicker when it must be (`info.thickened`, said on the Make tab). The pause is before the first layer over the pocket, in the colour swaps' convention (`(round(z1/layer) + 1) × layer`), in Before you print, on the Export tab and in `nfc-tag.txt` in the zip (`cardNfcText`). A tag that does not leave 1 mm of card all round is left out, with a message. The mark (a dot and three arcs) goes on the face(s) asked, under the code and the logo, never over them; when it is hidden there a message says so.
- Layouts: the words fill a column; the code takes the right (or left) side, or the foot of an upright card; the split layout's band holds the logo and the code. Words too tall for the column are all scaled down (to half at most), a line too wide is narrowed on its own, both with a message; letters under 6.5 nozzle widths tall get a message too. The back centres the logo and the code side by side, then the words under the code (`qr.caption`), the name and title if asked, the back's own words and the details.
- Copies (1–12) are laid out in rows on the bed, 4 mm apart; a list of names (`Name | Title` a line, up to 24) makes one card each. A list or copies that do not fit the bed are said, not split.

**Measured** (Chromium with software graphics, a rebuild of the example after a change of name): 1.19 s before the speed-ups, 0.93 s after (the outline kept, runs of pixels skipped; tracing and extruding the outlines is most of the rest). In the test page (jsdom) about 1.6 s.

**Tests**: new `tools-card-test.js` (`npm run test:card`; `CORE=1` for the encoder only), with `jsqr` 1.4.0 (Apache-2.0, no dependencies) as a dev dependency. The encoder: 92 codes of every mode, length (to 2900 letters) and error correction, all 40 versions at each level, the capacities, the 8 masks, all read back with jsQR (version 23 at L is left out: jsQR misreads it, and node-qrcode's code for the same text fails there too), and each payload's exact text. The card: every QR code is read back with jsQR from the printed geometry (each face's triangles drawn into a picture in their filaments' brightness, the bed face from below): the example's two codes, each layout's, every finish's, all 15 patterns on either side, every border with every band edge, every square and eye style with and without initials, and every kind of code. Also: the layers and volume above, the raised, engraved, face-up and one-colour finishes (one filament swap), the NFC pocket's volume, its heights, the pause in the checks and the zip, a coin tag thickening the card, a tag too big, the hole's place on each face, the six corner shapes' areas, every size lying and upright and a size of my own, copies apart on the bed, a list of names, the pages of the Make tab, the Art tab's note, a saved card coming back exactly and a hostile one cleaned and built. It caught one bug in the new code: a QR code's round eyes had their inner circle drawn anticlockwise from 0 to 2π, which by the canvas spec is an arc of no length, in browsers as in the test page: the eyes would have printed solid and the code not scanned. The eye is filled even-odd, so the circle now goes the usual way round. And two more: the logo's setting was first called `logo.src`, and `src` is one of the working keys saving leaves out (`runtimeKeys`), so initials chosen as the logo came back as the picture: it is `logo.from`. The gap fill first also closed a dense code's dark squares (holes of card colour in its patch, 0.39 mm across for a dotted, initialled code at 34 mm): a QR code's square, and anything drawn in the card's own colour, are now kept as drawn (`keep`).

**Seen in Chromium** (contact sheets in the scratchpad, not committed): each layout, a topo pattern, a sunburst, a halftone fade, a wavy band, raised and engraved backs, face up, one colour, upright, the NFC mark and the hole. Faint marks of the far face's walls showed through the near face when the view was a hand's width away and not when close: SwiftShader's multisampling with walls thinner than a pixel (the geometry was checked: every height covered exactly once). A depth range that follows the camera did not change it, so it was taken out again. Not seen on a real graphics chip yet.

**Not done, next**: QR codes and the logo on the back side by side are the only arrangement there; a vertical (upright) layout of its own beyond the code at the foot; a second line of company or tagline under the logo; a gradient band (two colours shading by dithering); emboss (raised in the card's own colour, not just its colours); slots for a whole NFC card; the build on the helper thread (a card spends about a second on the page per change). A card for each name with a different contact code each: done (the name comes from the list).

**Still to check by hand**: a printed card (flush colours face down on a textured and a smooth plate; 0.6 mm squares at 0.4 mm nozzle; reading the codes from the print with an iPhone and an Android phone; the NFC pause in Bambu Studio, OrcaSlicer and PrusaSlicer, and a phone reading the tag through 0.6 mm of plastic); Firefox and Safari.

## Session 34: pictures cut out and placed accurately (v0.29.0)

Asked for: the owner's Stora Sköndal logo (a white S and name on plain green) on a name keychain printed with its green background, and **Cut out the subject with AI** said "The AI found no clear subject". "We need to make this and the other painting AI better", and then "focus on the imported pictures and art placement: much more accuracy, better results, fewer bugs".

**Background taken away by colour** (`src/core.js`, after `edgeOpacity`):
- `pictureBackground(rgba, W, H)`: the median colour of the picture's outer two rows and columns, the share of them within 12 ΔE (Lab) of it (`plain`), their noise, whether it is white, and how much of the edge is clear already.
- `cutoutByColour(rgba, W, H, { bg, tol, holes })`: the background is flooded from the edge through every pixel within `t1` of its colour, or a small step (`t0`/2) from a background pixel, up to three times `t1` (a table lit from one side). `t0` comes from the noise, `t1 = t0 + 12`, both scaled by `tol` (0-100, 50 = ×1, 0 = ×0.5, 100 = ×2). Patches of the colour inside (not reached from the edge) are cleared with `holes: true`; `"auto"` clears them except on a white background where a patch is over 1.5% of the picture (a drawing's white inside its outline, a badge's white S). Specks of 3 pixels or 1e-5 of the picture go. The edge, two pixels either side of where background meets subject, is soft: each pixel is a blend of the background round it (the mean of nearby background pixels, so a gradient is followed) and the subject pixel within 3 that best explains it, and takes that pixel's colour with the blend's share as its alpha (no rim of the background). Measured on the new test pictures (`tools-cutout-pictures.js`, drawn 4 × 4 finer with noise, with the true coverage of every pixel): the logo on green 98.5% overlap, every miss a pixel exactly half covered, edges 0.4% from the true coverage; a badge on white 100%; text on white 95.6% (half-covered pixels again); a ring logo 99.9%; a cartoon on white 99.96% with its white face kept; a photo on a lit table 99.96%. The AI on the same: 76.6%, 62.2%, 52.5%, 65.4%, 99.5%, 99.5%. 0.6 s for a 1600 px picture (Lab conversion and the passes; not on the helper thread).
- `plateColour`: the colour round a cut-out's own edge, when it is 70% of that edge and 30-97% of the picture: a badge's plate, offered as **Take the green round it away too** (`cutBy.peel`, up to 4, each a further `cutoutByColour` with `holes: true`).
- `cutoutCombine`: the AI's cut-out with the colour one's alpha where it is lower.

**The cut-out in the app** (`aiCutoutRow`, `cutByColour`, `colourCutout`, `useCutout`, `pictureBgOf`): a picture whose edge is 80% one colour shows **✂ Take the background away** first and **✨ Cut out with AI** beside it; a busy one only the AI. `d.cutBy` = `{ by:"colour", tol, holes, inside, peel }` or `{ by:"ai" }`, saved, and cleaned in `sanitizeProject` (only kept with `d.uncut`). The colour cut-out's settings (**Inside it too / Only round it**, **How different a colour can be and still go**, 350 ms after the slider stops) cut it again from the original. `aiCutout` now runs on the original (`d.uncut || d.asset`), so **Cut out with AI instead** works from a colour cut-out; when the AI keeps under 1% and the edge is 50% one colour, or the AI cannot be loaded and the edge is plain, it falls back on the colour (the owner's case). On a plain background the AI's result takes its edges from the colour cut-out, unless that would take away more than 3% of what the AI kept (a white shirt on a pale wall: on the test figure the two together scored 82% against the AI's 94%). `aiHooks.load` stands in for the download in the tests. The keychain's own background removal (`cutoutCanvas`) is now `cutoutByColour` with `holes: false`, its tolerance (4-90, 28 by default) mapped to 50 at 28: with the default filaments the gold rim round the logo's letters went from 2.1 to 0.9 mm³ (what is left is round the green patches kept inside).

**The photo painter's AI** (`aiFindFigures`, `photoFound`): a map with under 0.5% figure is not kept: the colour outline stays and the card says so (it used to replace it, leaving the photo with no figure). Tried and left out, measured on the test figure: the AI with the colour mask (82 against 94%), a second pass on a crop round the figure (88 → 46% on the bookshelf photo, unstable), the photo and its mirror image averaged (+0.9, +0.2, −3.9, +2.7 points), a bigger input (the model is fixed at 320).

**Placing pictures accurately:**
- **Wrapped round** (`makeWrapProjector` in core, `wrapsRound` and `d.wrap` in the app): `makeProjector`'s bins in angle round the upright axis through x = z = 0, height, and distance from the axis (the surface furthest out); the picture's width runs round at the radius under its middle. Default on the sides of cylinders, round shells and turned shapes (`WRAP_AUTO`), a choice on every curved object but the hex (imported models and spheres default to straight on); never on a top. A 50 mm band on the 70 mm cylinder: 50.00 mm round wrapped, 55.70 projected. Supports in the survey went down a little (turned 5.0 → 0, cylinder and shell 0.2 → 0, hex 1.8 → 0.9).
- **Fringes** (`buildCellMap`): a cell whose colour is a blend of the cells either side of it (opposite neighbours across, down or diagonally, of two other colours, the blend within 15% of their distance plus 10) takes the nearer of the two. Black lettering on white printed a teal rim with the default filaments (1.6 mm³ at Standard, 16.8 once thin lines were kept); now none.
- **Thin lines** (`maskToPolys` `keep`, on for `buildMaskSolid`): after the blur, a cell keeps its side of the 0.5 line (inside ≥ 0.7, outside ≤ 0.3) where the blur left it at 0.4 or more (inside) or 0.6 or less (outside): a line two cells wide traces 1.99 wide (was 1.5, and shorter), a 3 × 3 dot is kept (was lost); one cell wide still goes. The art's outline is simplified by a quarter cell, not half (that thinned a two-cell line by 15%): about 40-60% more triangles in decal presets, 1% in the whole survey, builds no slower that I could see.
- **Only the background is left out** (`dropCellBackground` in core, `d._bg`, `d.keepBg`): the colour on more than half the picture's edge, where reached from it, is set to −1 in the cell map, so the preview shows it see-through; every slot is then traced with `closeEdges`, so other colours reach the edge (a flag in two halves printed nothing before; now 299 + 299 of 600 mm²). **Print the background too** keeps it. A picture all one colour is all background (as before), unless ticked. Not in relief mode.
- The Split preview draws the photo half the same way round as the colours (mirror, back side). `cropCanvas` trims to alpha over 127 (what prints), not 16.
- The Bobble head example's eye highlights moved in, so the dark ring round them is 0.87 mm rather than 0.35 (kept now, it would be under a nozzle).

**Tests**: `tools-art-test.js` has two new sections: the background by colour (the owner's logo, inside the S and only round it, the tolerance, saving, putting it back, the AI finding nothing and the AI that cannot load both falling back, a badge and its plate, a cartoon, a busy photo, the keychain, a hostile `cutBy`) and pictures placed accurately (a flag to its edges, the see-through preview, Print the background too, a thin line and dot, wrapping on a cylinder and straight on). `tools-photo-test.js`: the AI finding no figure keeps the colour outline. `tools-cutout-pictures.js`: the test pictures and their scoring.

**Second round** (the owner: "keep going", the same release, before it was merged):
- **Wrapped along the side too** (`makeWrapProjector`): the side's profile under the picture's middle (401 heights, `find` at that angle) gives the distance along the side from the middle's height, and the picture's up-and-down position is that distance (`heightAt`). On a cylinder nothing changes; on a 70 mm sphere a 40 mm square measures 40.00 mm round and 40.00 mm up along the surface (39.88 in the core test with a coarser sphere; 42.44 projected flat). Spheres now wrap by default (`WRAP_AUTO`); the bobble head and imported models do not.
- **Width and height** on the Art tab are linked fields (`numField` gives `w._sync`); new text is trimmed to its letters (`crop:true` in `addTextItem`): "Your name" printed 46.00 mm wide for a width of 46 (it was about 5% narrower, the canvas's margin).
- **A clear edge has no background** (`cellMapFor`): a picture with 2% or more of its edge see-through leaves nothing out. Found by the test: text trimmed to its letters (box letters in the test page) filled its edge and was dropped as background; a logo with clear rounded corners filling its picture would have been too (in v0.28.0 it was, as a region touching the edge).
- **A picture that is all background** says so on the Art tab (nothing of it prints; tick Print the background too).
- **Take this colour away too** (`cutColours`: k-means of 6 on a 128 px copy, shades within a colour distance of 40 merged, 3-97% of the picture): chips under a colour cut-out; a click adds the colour to `cutBy.peel` (up to 4), cleared everywhere (`holes: true`).
- **Jigsaw slivers** (`dropSlivers` in core, used by `buildJigsaw`): each colour of the picture's map (left-out colours as the piece's own) is opened by half a nozzle and what drops out takes the nearest kept colour.
- Tests: `tools-art-test.js` gained the all-background note, a 40 mm square on the sphere both ways, Height 20 → width 40, new text as wide as set, and the ring logo's blue dot taken away with a chip (no blue left, the red ring whole).

**Not done, next**: the colour cut-out on the helper thread (0.6 s at 1600 px on the page); choosing the background's colour by clicking the picture; a cut-out brush like the photo painter's hand fixes; slivers where a piece's outline cuts a colour region into a thin strip (the picture's own slivers are dropped now: `dropSlivers`); the same sliver clean-up for decals on objects (`buildItem`), which keep their thin features on purpose for now.

**Still to check by hand**: the owner's own logo picture (the test one is drawn to look like it); a wrapped picture on a printed cylinder; Firefox and Safari.

## Session 35: colour from a photo that follows the model's shape (v0.30.0)

Built on Session 34 (v0.29.0, pull request #19, still open when this was done): its branch was merged into this one, and every test below ran on the two together (`test:photo`, `test:art`, `test:paint`, `test:project`, `test:speed`, the smoke test and `check:browser`). Merge #19 first.

Asked: "work more on making the painting feature better, painting from picture should be a lot better and more accurate, how do we improve it, and maybe a feature or ai that looks at the model and outline picked by the app and corrects the rest, then improve all the features in the app". The owner's case is still the CR7 figure (`CristianoRonaldo.3mf`, 319 622 triangles, 900 000 once refined for paint) and its product picture (an artist's render, so the pose differs a little from the model); neither is in the repository.

**What was wrong** (measured on the owner's case): each triangle took the colour most of its photo pixels voted for (the refined mesh has about three triangles per photo pixel, so most triangles have one vote or none), two tidying passes followed, and what no photo sees took the nearest seen colour over the surface. Three things came of it: ragged edges and specks; the back a patchwork (the nearest colour, seeded from glimpses at the outline); and grey patches on the legs and arms. The last one was not the colours (the photo's classes were clean) but the pose: with the photo lined up, 8.4% of the model's pixels read no figure, and the model's shins read the base and the boots (the render's legs stand narrower than the model's, its arms a little higher, its head higher).

**1. Following the model's shape** (`paintFromPhotos` with `o.shape` not false; `shapeLabels`, `cheapestLabels`, `graphCut`, `meshPatches`, `patchGraph`, `nearestTwo`, `meshGraph` in `src/core.js`). The colours are the cheapest labelling of a Potts model, solved by alpha-expansion over a Boykov–Kolmogorov max-flow (`graphCut`, for any graph with arcs `first/head/rev`):
- Data, seen triangles: how many of its photo pixels (weighted as before) say otherwise, divided by pixels per mm² (so every photo counts alike).
- Data, unseen triangles facing away from a camera: the colour on the other side of the same part. A ray from the triangle towards the camera (the eye for a close camera) to the first face that looks back at the camera; one ray per group of triangles 1.5% of the model across (`meshPatches(topo, 64, …)`), only for triangles more than 2% of the model from anything seen (nearer ones follow the next point). Cost 6·bmm/far per mm² for any other colour.
- Data, other unseen triangles: a pull towards the nearest seen colour, 3·bmm/far per mm², weaker as the second nearest colour gets as near (`nearestTwo`: a bucket queue, the two nearest colours per triangle, the old trusted-start distances and ×4 over folds sharper than 50°). The nearest colour alone (with a min-cut) wears thin bands away on the hidden side; the ray alone has nothing for parts seen nowhere.
- An edge between colours: its length × bmm × max(0.05, exp(−(1 − cos θ)/0.15)), θ the fold between the two triangles; bmm = 1 photo pixel in mm (`o.beta`, 1). Everything is scaled to whole numbers so the flow is exact.
- Speed: patches of about 2 × 2 photo pixels (at most 12 triangles, not across a 25° fold nor 40° from where they started) are solved first (3 cycles), then triangles within 15 steps of an edge between colours (2 cycles); when patches would not make the problem smaller than 70%, all triangles at once (2 cycles). The CR7 (900 000 triangles): about 6 s in all (2.5 s before), on the helper thread. The test figure (568 680): 4–5 s (about 1 s before).
- Speck clean-up, the trusted start of v0.24.1 and the vote gathering are as before; `o.fill` false leaves what no photo sees unpainted; `shape: false` is the old way (with `o.smooth`).

**2. Bending a photo onto the model** (`photoBend`, `photoBendApply` in `src/core.js`; `photoBendOf`, `photoBent`, `photoFigureRead` in `src/app.html`). Demons registration of the two outlines' distance maps (chamfer, clamped to ±D, D = 3% of the photo's height), coarse to fine over three levels (40, 30, 10 rounds), the shift smoothed by a box blur run twice (radius 2) each round and capped at D; worked out at about 400 pixels and applied at any size (nearest pixel). Only the figure within 2D of the model pulls (the owner's picture has a grey copy of the figure beside it). The bend is only for an outline that can be trusted, the AI's or one fixed by hand (`photoBends`): the colour method's loses white shorts on a light background, and a photo in the model's own pose was squeezed 24 pixels into the gap. The light and the colours are still found in the photo as it is (`photoReadPixels(o, v, px, true)` for picking): bending them too turned the product photo's fifth colour from gold to red in shade (a near tie between two small groups that a few pixels decide). Bent pixels are evened out with the light from the straight photo; the shade cache keys say which (`photoShadeKey(…, bent)`). The helper gets the page's bend with each photo (`spec.bend`), so both colour alike. The owner's case: outlines 81.5% → 96.1%.

**In the app**: **Follow the model's shape** under Finishing (on; when off, **Smooth ragged edges** comes back); **Bend the photo a little to fit the model** on the photo card for an AI or hand-fixed outline (on), with how much the outlines overlap before and after. Saved as `o.shape` (true unless false) and `v.bend` (only `false` is kept); `sanitizeProject` keeps them to booleans. The card's "the rest took the nearest colour" now says the other side of the same part. Test hooks: `MF.paint.photo.lightOf`, `bendOf`, `read`, `pixels`.

**Measured** on the test figure (`npm run test:photo`), each triangle from its own pixels → following the shape: front photo 85.0% → 91.2% of the surface right; front and back 97.8% → 98.3%; three-quarter and back 96.8% → 97.9%; close-ups 86.0% → 88.2% and 84.3% → 86.4%; the product photo 87.8% → 98.5% of what it shows and 79.5% → 88.0% of the whole figure (with the light found as before). The backs of the legs and arms, from the front photo only: 25% → 95% skin. A figure posed differently (arms 2.5 mm out, legs 1.5 mm, head 1 mm up): outlines 74.4% → 90.8% bent, 85.2% → 86.7% of the surface right; a photo in the model's own pose with the AI's outline: 89.1% → 91.4% (the bend also takes up what the line-up left). The owner's case, compared in pictures (scratchpad, not committed): the front clean (skin legs, red socks with green tops, grey boots, the shirt's diagonal, the shorts' crest and 7, the base in two halves with CR7 in gold); the back red shirt, green shorts, skin legs, red socks; the base top no longer streaked (its crest, seen at a low angle, is gone: too few pixels).

**Tests**: `tools-photo-test.js` gained: the graph cut against every cut of 400 small random graphs; following the shape against each triangle's own pixels (front, front and back); the backs of legs and arms; a posed figure bent to fit; a photo in the model's pose bent with the AI's outline; the close-up checks now compare closenesses with `shape: false` (what they are about) and check the shape solver beats both; a hostile project's `shape` and `bend`.

The full audit (`node tools-audit.js index.html`, every object) flags the card's **Name in capitals** and **A card for each name in a list** as dead. v0.28.0's build does the same in a full run, and neither build does with the card audited alone (`… index.html card`): something an earlier object in the run leaves behind, not this release. Worth a look in the audit.

**Not done, next**: an open mouth and dark hair take the darkest of four colours (dark green on the CR7); a sixth colour or the brush fixes it, but a "small dark details" hint could keep them in the colour round them. The bend only knows outlines (an arm in front of the body is not moved inside the body's outline); per-part lining up would do that. The crest on the base top, seen at a grazing angle, is lost; reading such faces from a sharper photo (PHOTO_RES 900) or a second photo from above would bring it back. Correction by example (a stroke that re-colours the region the solver joined to it) was looked at and left: **Fill → Fill the same colour** already does that on the result.

**Still to check by hand**: a real photo of a real printed figure; the speed on a phone (6 s on this machine's Node for the CR7).

## Session 36: the idea lists checked, and 100 more ideas (no app change; still v0.30.0)

Asked: "was there a list of 50 new ideas somewhere?", then "go for it and add 100 more ideas, 10 of them that are huge and very useful for makers". Earlier in the same conversation the owner described a **litho book** (see Unfinished) and said not to build it yet.

**The two lists checked** against the code on `main` (v0.30.0), each idea marked done, partly done or open, with the session that did it: Session 12's 50 ideas, 16 done, 11 partly, 23 open; Session 13's 50, 15 done, 11 partly, 24 open. A mark says what is there, not what the idea asked for: "partly" names the half that is missing.

### 100 more ideas (Session 36)

None of these is started. Each is new: not in the two lists above, not in Unfinished, not already in the app.

**The ten big ones** (each a session or more; each a reason for a maker to open the app)
1. **Filament painting, HueForge-style.** A photo printed in 3 to 6 filaments stacked layer by layer, the colours mixing by how much light each filament lets through (its TD value, typed in or measured with a printed test). Pick the filaments and the swap heights by optimisation against the photo, show the backlit and front-lit result, and export the swap list and a 3MF with the colour changes (pauses for one-nozzle printers already exist). The most-asked-for kind of picture print, and the app has most of the pieces: lithophane thickness, paint by height, pauses.
2. **Mechanisms toolkit.** Threads (ISO metric, bottle caps and jar lids, with clearance for the nozzle), spur and planetary gears (module, teeth, bore with a D-flat or a hex), print-in-place hinges, living hinges, snap-fit hooks with the strain worked out for PLA, PETG or TPU, dovetails and press-fit pins. Each with a fit-test coupon (three clearances side by side), so the right one is picked from a print.
3. **Model doctor.** For any imported model: close holes and fix flipped faces (Manifold), thicken walls thinner than the nozzle, hollow with drain holes and an even wall (for resin or to save filament), decimate to a triangle budget, and split a model too big for the bed into pieces that fit, with pin holes and a labelled assembly picture. Most broken downloads become printable without another program.
4. **Plate planner and seller's toolkit.** Many objects (different ones, or one per row of a spreadsheet of orders: name, colour, size) packed onto as many plates as needed, each plate a 3MF plate with its time, filament and colour changes; per item the material, power and wear cost and a price with a margin; a packing list and printed labels (order number, name) for each bag. For makers who sell at fairs and online.
5. **Send to the printer.** Upload the export straight to the printer from the page: Bambu printers on the LAN, OctoPrint, Moonraker (Klipper) and PrusaLink. Add a slicer compiled to WebAssembly for real print times, filament and a layer preview, instead of the estimate. One click from design to printing, with the printer's own profiles.
6. **3D relief from any photo, with AI depth.** A small depth model (for example Depth Anything V2 Small, Apache-2.0, run by the ONNX Runtime Web the app already loads for the figure finder; a bigger download than the figure finder's, so checked and loaded only when asked for) turns a portrait, a pet or a landscape into a true relief: medallions, coins, plaques, a bust relief on a box lid, a 3D lithophane. Far better than brightness as height, which makes a dark sweater a hole.
7. **Workshop organiser from a photo.** Lay tools on a sheet of paper, take one photo, and get a drawer insert or wall board with a pocket for each tool (the tracer's paper scaling and outlines), finger notches to lift them out, an engraved name under each, a contrasting colour at the bottom so a missing tool shows, and Gridfinity sizes as an option (bins and baseplates of any size, a standard many makers use).
8. **Sign maker.** Channel letters and neon-style signs: hollow letters with a slot for an LED strip, a diffuser face printed in white or clear, a back with wire paths and screw or keyhole mounts, letters joined by a rail or set on a backboard, and the LED strip's length worked out. House numbers, shop signs, gaming-room names: a popular thing to make and sell.
9. **Tactile and Braille.** Braille text set to the standard dot sizes and spacing (Grade 1 and Grade 2 English, more languages), signs with raised letters and Braille together for doors, tactile maps and diagrams from a picture (lines raised, areas textured, a key in Braille), and labels for kitchen jars and medicine. Useful far beyond hobby printing, and almost nothing else makes it easy.
10. **Fix-it parts library.** The everyday parts that break: knobs, shelf pins, furniture feet and glides, battery covers, cable clips, curtain hooks, drawer runners' wheels, appliance caps and buttons. Each from two or three caliper measurements, with a picture of where to measure, a fit-test version, and a note on which material lasts (PETG or TPU).

**Pictures and art**
11. Several pictures on one object, each from the Art tab list, with "Arrange" to line them up, space them evenly or put one in each corner.
12. A text path: words along a circle or an arc, for coins, badges and the rim of a coaster.
13. Outline text and pictures with a second colour's stroke on the outside only, at a set width, for text that reads on any background.
14. A gradient fill for text and shapes, made of bands of the loaded filaments.
15. Clip art built in: a small drawn library (stars, hearts, paws, flowers, sports, music, holidays) to drop on anything without searching the web.
16. A picture's own outline as the object's shape for every flat object (a coaster or a magnet shaped like the logo), not only the cookie cutter and the tracer.
17. Halftone and dither for one-colour prints: a photo as dots or lines of one filament on another, sized so no dot is under a nozzle wide.
18. A preview of the picture as it prints at true size on screen (a ruler on the side), so a 12 mm logo is seen at 12 mm.

**Lithophanes**
19. A matching frame for each lithophane shape, with a slot that holds a battery LED puck and a switch hole.
20. Calibration from a printed test strip: photograph the lit strip, and the preview's light constant and the best thicknesses are worked out from it.
21. A lithophane box: four or six panels, each with its own photo, joined at the corners, on a base that holds the light.
22. A panorama lithophane for wide photos, bent into an S or a wave so it stands by itself.
23. A night light that plugs in: a lithophane with a housing that fits a common plug-in LED night light.
24. Lithophane window hangers: a frame with a hook and a suction-cup loop, thin enough to glow in daylight.
25. A hidden-message lithophane: a picture that only shows when lit (the front printed flat in another colour).
26. Brightness and contrast curves for lithophanes, with a histogram, so faces don't come out too dark.

**Name plates, keychains and tags**
27. Pet tags with the phone number engraved on the back and a ring of the right size for a collar.
28. Luggage tags with a strap slot, the name on the front and contact details hidden under a flap.
29. Desk name plates with a stand (a wedge or a triangular bar) and the name on both sides.
30. Wedding and party place cards that stand, from a list of guests, with table numbers.
31. Keychains that hold an AirTag or a Tile, with the name on the cover.
32. Bag and backpack charms in two layers, a shaker charm with a clear window (a pause for the beads).
33. Word art keychains in script fonts with all letters joined automatically into one piece.

**Business cards**
34. A stand for the cards on a table, with the logo, holding 20 or 50 cards.
35. NFC tags written from the app: Web NFC on Android writes the contact or link straight to the tag before it goes in.
36. Loyalty and stamp cards with punch-out or tick spots, and gift cards with a code.
37. Card sizes and layouts for ID badges, with a slot for a lanyard clip.

**Jigsaw and games**
38. A puzzle in the shape of the picture's subject (the outline of a dog), every piece a part of it.
39. A sliding-tile puzzle (the 15-puzzle) from a picture: tiles that slide in a frame, printed in place.
40. Tabletop gaming: miniature bases with textures, dice towers, card holders, token trays, terrain tiles that clip together.
41. Board game inserts: a box's inside size typed in, trays for each component, a lid that closes flush.
42. A chess or checkers set from a picture set, with a board in two colours and pieces that store under it.

**Phone cases and gadgets**
43. Phone stands and docks: an angle, a cable slot, a name, for any phone in the list.
44. Cases for small gadgets from their size: AirPods, game cartridges, a remote control, a power bank.
45. Camera accessories: lens caps, hot-shoe covers, cable clips for a gimbal.
46. A watch band adapter and a band in TPU, from the lug width.

**Project boxes**
47. Cable glands (PG7 to PG16) printed with the box, and a strain-relief clamp for a loose cable.
48. Light pipes for LEDs on a board, from the LED's position to a hole in the lid.
49. Buttons through the lid: a printed cap with a stem that presses a tact switch on the board below.
50. Display windows sized for common screens (0.96", 1.3" OLED, 2.4" TFT, e-paper), with the bezel and mounting clips.
51. Vent louvres and fan guards that print without support, placed on a wall with a size.
52. Labels on the box's walls in a second colour (not only engraved), and a QR code for the project's notes.

**Colour painter and colour from a photo**
53. Paint with a picture as a stamp: click to place a decal from the Art tab on any curved model, the paint following the surface.
54. A colour palette from a photo for the whole project: the filaments set to the five main colours of any picture, with the nearest real filaments named.
55. "Small dark details" kept: eyes and mouths keep the colour round them unless they are big enough to print.
56. Per-part lining up for colour from a photo: the arms and head moved separately to their places in the photo.
57. A second photo from above for tops (hats, shoulders, the base's crest).
58. Paint from a short video: frames taken round the figure, each lined up, for every side at once.
59. Fill by connected region with a tolerance on the angle between faces, like a paint bucket for 3D.
60. A stripe brush that paints bands round a model, for socks, sleeves and trims.

**Imported models**
61. Read STEP files (Opencascade compiled to WebAssembly) for parts made in CAD.
62. Read 3MF files with several plates and objects and keep their names and plates.
63. Scale to a known length: click two points on the model and type what the distance should be.
64. Add a base or a stand to any model: a round, square or shaped plinth with a name on its front.
65. Emboss text onto a curved model's surface, raised and following it (not only engraved).
66. Mirror, rotate by 90°, and lay on a face picked by clicking.
67. A display stand or wall mount for an imported figure: a peg hole drilled into its base and a matching stand or bracket.

**Printability and export**
68. Supports drawn by the app for the few spots that need them (tree supports with a gap), for slicers set to "none".
69. A seam picture: where the seam of each layer will be, from the shape, with a suggestion to hide it.
70. Warping risk for big flat parts in ABS, ASA or PA, with mouse ears added at the corners.
71. A time estimate that knows the printer's speeds, compared to the slicer's when one is sent back.
72. Ironing hints: the flat tops that would look better ironed, marked on the model, with the slicer setting to use.
73. STL and 3MF thumbnails written in the file, so file managers and slicers show the model.
74. Export for resin printers: hollowing, drain holes and a support-friendly tilt.
75. Export the colours as an OBJ with a texture, for showing a model online or in a render.

**Easy to use**
76. A "what can I make with this?" start: drop any file (photo, logo, model, list of names) and the app suggests the objects that use it.
77. Templates people can save: a project as a starting point with its own name and picture on the Start page.
78. Presets per printer for every object (sizes that fit the bed, colours that fit the AMS).
79. A side-by-side compare of two versions of a project.
80. A print diary: every export kept with its date, settings, picture and a note on how the print went.
81. A beginner mode that hides advanced settings, and a toggle to show them all.
82. Big-screen mode for a TV or projector at a club or a class.
83. A short animated tip for each object the first time it is opened, which can be switched off.

**Speed and reliability**
84. Open huge models (several million triangles) by streaming the file and simplifying while reading.
85. A crash-safe autosave of the last good state, with a restore offer after a reload.
86. GPU picking and painting through WebGL for models over a million triangles.
87. Every build cancellable: a newer change stops the old build at once.

**Calibration and learning**
88. Calibration prints from the app: temperature tower, retraction test, flow cube, tolerance gauge, overhang and bridge tests, each labelled with its values for the chosen filament.
89. A filament test swatch: a small tag for each spool with its brand, colour, temperature and a thickness ladder for lithophanes and filament painting.
90. Tolerance learning: after a fit test, the measured fit is stored per printer and used by every object with a fit.
91. School kits: molecule models from a formula, maths surfaces from an equation, a topographic map from a place name's height data.
92. A "how it prints" animation: the layers built up in the view, with the colour changes shown.

**More small tools**
93. Wall plate covers for switches and sockets (UK, EU, US sizes), with a name or a pattern.
94. Cable chains and cable combs from a cable count and diameter.
95. Hooks, brackets and shelf supports from a load, a screw size and a wall type.
96. Plant labels and garden markers from a list, with a spike that goes into the soil.
97. Bookmarks with a picture or a name, thin and flexible in PETG or TPU.
98. Spiral-vase-mode pots and lamp shades with patterns (Voronoi, waves, a picture embossed), printed with one wall.
99. Drawer handles and knobs in matching sets, from the hole spacing.
100. Ring sizers and rings with an engraved or inlaid name, from a ring size.

## Session 37: parts that fit, and the keychain's surname and credit (v0.31.0)

Asked: "Mechanisms toolkit, model doctor, 3d relief from any photo, sign maker and fix it parts library should be done over the next two builds" (planned split in Unfinished: this is the first of the two), and before that "i want to be able to add a second line for the surname, and a small engraving option on the back for the site name or whatever i want to get some credit when i give these out for free".

**1. The keychain** (`buildNamePlate`, `buildNameBatch`, `nameplateFields` in `src/app.html`).
- `nameplate.line2` (≤ 60 letters), `line2Size` (0.3–1 of the name's letter height, 0.5), `line2Gap` (mm, 2.5): a second line centred under the name in the same font, drawn after the i/j dots are swapped (so its letters are never taken for dots). Its size and gap appear once it has text; typing its first letter re-renders the panel and puts the caret back. In a list, `Emma | Svensson` (split on `|`; the batch cache key leaves `line2` out).
- `nameplate.credit` `{ on, text ≤ 40, size 1.5–8, depth 0.2–1.2, inlay, slot, font }` (font: Nunito by default): drawn mirrored about the name's centre, at its size, then made 12% smaller until every pixel is 0.8 mm inside the plate's edge (a distance field of the plate's outside, so also clear of the ring hole); `plateInfo.credit` says the size used. The plate's bottom `credD` mm are cut with the letters (`cutOut`: holes, with the letters' own holes put back as islands), and with `inlay` the letters are a part of their own in `slot`, flush in the first layers. Not with `doubleSided` (the back is the name's).
- **Fixed on the way**: an engraved name was cut with each letter's outline only, so the middle of o, B, e… was cut away too (an engraved "Bob" printed as "Dob"). `cutOut` keeps them.

**2. Gears and threads in the core** (`gearOutline`, `threadForm`, `threadSolid`, `hexRadius` in `src/core.js`).
- `gearOutline(z, m, pa, bl)`: involute flanks from the base circle (straight down to the root below it), root and tip circles as the standard (rf = r − 1.25m), a tip cut back if the flanks would cross; `bl` comes off each tooth at the pitch circle. No undercut is modelled: under about 13 teeth the panel says they mesh less smoothly.
- `threadSolid`: a grid of 16 rows per pitch × 72 (or more) points round, its radius from the ISO form (flats p/4 and p/8, 60°, depth 0.6134p); a screw is chamfered 45° at both ends and closed with fans; `inside` makes a nut's hole in a prism (`outside(a)`, a hexagon with `hexRadius`), its radius the screw's plus the gap at every point, countersunk to the screw's size at both faces. Right-handed (anticlockwise seen from above climbs).

**3. Mechanisms and fix-it parts** (new objects `mech` and `fixit` under Functional; `buildMech`, `buildFixit`, `mechFields`, `fixitFields` and helpers `fit*`, `alongX`, `alongZ` in section 4c of `src/app.html`). One fit gap for both, `state.base.fit.gap` (0.25 mm), on a **Fit** page of each. Everything is built where it prints.
- Mechanisms: gears (a pair, laid apart or meshed to check, centre distance in the panel), bolt and nut (`METRIC` table M3–M30 with pitch, hex size and nut height, or your own), print-in-place hinge (knuckles alternate between the leaves, the pin belongs to one leaf, the other's knuckles are tubes with a teardrop hole `fitTear`, gaps of the fit gap between knuckles, axis at 0.8 R so the knuckles stand on a flat), snap-fit clip (two arms with outward hooks and a slit between them to squeeze into, and a plate with the slot), fit test (holes from `from` in `step`s, labels in the stroke font, a peg; a dot beside the hole for the gap now set; optionally an M8 test bolt and nut).
- Fix-it parts: knob (fluted, knurled, star or smooth outline; D, round or hex hole; printed on its top with a pointer line cut in the first 0.6 mm), leg cap (over the end) or tube plug (ribbed, 0.3 mm proud), shelf support (an L on its side, the pin lying with a flat underneath), battery cover (rim, tabs, latch), cable clip (1–8 cables, arch drawn in at 45° to a short flat, screw holes or a tape pad), spacer or washer; **How many** up to 24 (`fitCopies`).
- Quick starts **Gear pair**, **Bolt and nut**, **Replacement knob** (with Start pictures). The objects have no example picture, so the sidebar shows their emoji. Pictures are not laid on them (`NO_DECALS`, and skipped in the build).
- Saved projects: `sanitizeProject` gives every choice one of its own values (`ENUMS`), every switch true or false, drops unknown keys, fills missing groups; every number has a `LIMITS_AT` range. The quick-start code merges `mech`/`fixit` one level deeper.

**4. The print check on overlapping shells** (`surfaceBelow` in `src/core.js`). A part merged from shells that overlap by 0.01 mm (the app's usual way of stacking layers) had faces buried inside it that the check took for surfaces in the open: the nearest face below a point decided "inside", and that was a buried face pointing up. It now counts the faces below (down +1, up −1, the two triangles of one face meeting under the point once). A knob read 698 mm² of support and a keychain with a credit about 650 mm²; both read 0 now, and three overlapping boxes read exactly their real 400 mm² shelf.

**Tests**: new `tools-fit-test.js` (`npm run test:fit`, `CORE=1` for gears and threads only):
- gears: four pairs turned through a whole tooth without touching, at the right centre distance, teeth reaching in; the standard's radii; a tooth half the circular pitch at the pitch circle, the backlash off it;
- threads: closed solids; the nut's thread the screw's plus the gap at every point (5544 points, within 3e-7 mm); the ISO depth; right-handed;
- every kind closed and on the bed, ten other choices too; an M10 nut 0.25 mm bigger all round; the hinge's leaves never inside each other and the pin's clearance; meshed gears at the panel's distance; a knob's hole with the fit gap and after changing it; four spacers' volume;
- the print check: the knob, the clip, three overlapping boxes;
- the keychain: a surname makes the plate deeper, the gap deeper still; the credit flush in its filament in the first 0.4 mm, inside the outline, the plate cut away under it; engraved, left empty with plate above; shrunk when too big; none on a double-sided tag; `Emma | Svensson` in a list.
`tools-project-test.js` gained hostile project files for a bolt, gears, an unknown mechanism, a cable clip, a knob and the keychain's new settings. Every slider of every mechanism and fix-it kind was checked to change the model (only the whole-model scale, which every object has, does not).
Also run and passed:
- the full smoke test (26 quick starts, 23 objects, 499 clicks);
- `test:print`, `test:art`, `test:project`;
- the control audit on mech, fixit and nameplate (no findings);
- `check:browser` (189 screenshots, no findings; the helper thread's print check matches the page's).

The print survey against v0.30.0's build: every earlier quick start and object reads the same (support, bridges, ledges, thin walls, bed contact), so the change to the print check touches only the new shells. The new ones read 0 mm² of support (the M10 bolt and nut 52 436 triangles).
Seen in Chromium: the surname under the name, the credit read from below, the gears meshing, the bolt, the hinge, the clip, the knob, the fit test, and an engraved "Bob" before and after.

**Not done, next**: the plan's other half of this build, pins on their own (the fit test covers the fit); rack and pinion, bevel and worm gears; a knob's set-screw hole; nuts on their own and threaded holes in other objects (a box's lid); countersunk screw holes (needs Manifold). v0.32.0 as planned: model doctor, AI depth relief, sign maker.

**Still to check by hand**: real prints of the fit test (which gap the default should be), a gear pair on shafts, an M10 bolt and nut at 0.25 mm, the hinge breaking free, the snap-fit clip's hook depth, a credit flush on a textured plate.

## Session 38: signs, a 3D relief from a photo, and the model doctor (v0.32.0)

The second of the two builds planned in Session 36 ("Mechanisms toolkit, model doctor, 3d relief from any photo, sign maker and fix it parts library should be done over the next two builds"); the owner said "Keep going" after v0.31.0. Built on Session 37's branch (pull request #22 still open).

**1. Signs** (new object `sign` under Personalise; `buildSign`, `signMounts`, `signMountOptions`, `withHoles`, `signFields`, section 4d of `src/app.html`).
- Solid and lit letters are drawn on a canvas in a lettering font (as a name plate) and traced from a signed distance field: the letters at 0.5 px, walls `0 < d < wall`, the face `d > wall + fit gap`, the ledge in four bands (`wall .. wall + 1.6·k/4`) stacked so it slopes at 45°. Lit letters are drawn at 5 px/mm or finer (24 MP at most) so the 0.4 mm steps survive tracing; a step that still comes out filled (traced too coarsely to keep its inside) is left out.
- Neon style follows the stroke font (`strokeText`): a field of the distance to the strokes, the walls `sw/2 < d < sw/2 + wall`, the board either a rounded rectangle or `d < sw/2 + wall + margin`. Holes at stroke ends that touch no other stroke; the strip's length is the strokes' total.
- Mounts: lit letters hang from a keyhole inside each letter (the head goes into the hollow), with the wire hole at the letter's thickest point at least 16 mm from it; solid letters on their own get a blind keyhole pocket (2.5 mm of keyhole, 3.5 mm of slot for the head, a roof in four 45° steps, 12 mm thick or more) or a pin hole (8 mm or more); boards get screw holes at their top corners.
- `withHoles` gives each extra hole only to the outline it lies in. Adding every hole to every outline (as first written) put the "2"'s keyhole into the "4" too, and earcut filled the gap between them with stray triangles.
- Too big (over 40 MP of canvas, or 3 m of text) says so and builds nothing.

**2. A relief from a photo** (new object `relief` under From a picture, consumes the picture; `buildRelief`, `depthLoad`, `depthOf`, `depthField`, `reliefRunDepth`, `reliefFields`, section 4e).
- The depth model: Depth Anything V2 Small, int8, 27 MB (`AI_FIGURE.depth`): over jsDelivr's 20 MB a file, so it is loaded from `models/` next to the page or from the ONNX community's copy on Hugging Face at revision `4472b73…` (pinned), checked by SHA-256. The 4-bit version (19 MB, under jsDelivr's limit) was tried: it runs, but on a test scene it correlated 0.70 with the true depth against int8's 0.91, and put a box behind the wall. The model is not in the repository (`.gitignore`); `models/LICENSE.md` describes it.
- The ONNX runtime is now shared: `ortRuntime()` downloads and starts it once for both the figure finder and the depth model. The runtime's address line (`split("import.meta.url")…`) is unchanged, moved into `ortRuntime`: the website's importer finds it by pattern (worth checking on the next import).
- The picture goes in with its longer side 518 px, both sides multiples of 14 (the model takes any such size and answers at the same size); the answer is spread between its 1st and 99th percentiles and kept as an 8-bit PNG asset (`item.depthMap`, in `usedAssets`, cleaned like `uncut`). Before the button is pressed (and when the source is Brightness) the relief rises with brightness.
- The depth is shaped before it becomes height:
  - `subject`: Otsu's split of the depth histogram. When a far background is between 15% and 90% of the picture, everything below the split is the base and the rest is spread over 0..1.
  - `boost`: `basRelief` in `src/core.js`, as a carver does. Each step between neighbours is limited softly (`tau·tanh(g/tau)`, `tau = 0.25/(1 + 10·boost)`), and the surface is rebuilt from those steps by a Poisson solve on a pyramid (over-relaxed, 400 sweeps at the coarsest level and 120 at each finer one; about 0.1 s for 200 × 200 and 0.9 s in the app at 518 px).
  - Without it, the rendered bobble head tried in Chromium came out as flat-topped steps: a head in front of a wall is a jump far bigger than the head's own roundness. A first try that added each pixel's difference from its blurred surroundings only sharpened the edges.
  - Then smoothing, `flatten` and a power curve (`contrast`).
- The surface: `heightSheet` on a flat back, as a flat lithophane (outline from `lithoOutline`, hole, border at `rim` × the relief), thickness `base + height·f`.

**3. The model doctor** (an imported model's Make tab; `meshReport`, `repairMesh`, `simplifyMesh` in `src/core.js`; `doctorCheck`, `doctorRun`, `doctorApply`, `doctorBack`, `doctorFields` in `src/app.html`).
- `meshReport`: open edges and the loops they make (holes), edges with more than two triangles, edges two triangles cross the same way (flipped), triangles with no area, doubled triangles, shells (union-find), volume.
- `repairMesh`: weld at 0.001 mm, drop flat and doubled triangles, a flood across two-triangle edges turning each shell's triangles to agree, each shell turned outward by its volume, then each hole loop (walked against its triangles) triangulated on its Newell plane with earcut, or fanned from its middle if that fails. `src` says which triangle each came from (−1 for fills).
- `simplifyMesh`: Forstmann's fast quadric scheme (MIT) in typed arrays: thresholds rising each pass, a collapse refused if it would flip a neighbour (normal dot < 0.2) or touch an open edge; every triangle left is an original (`src`).
- The app makes a new model from the welded one (`stlCache`, which now keeps the weld's `src`), maps the file's paint and own colours through both source maps, opens it under a new name (`… (repaired, N triangles)`), and keeps the old one in `openedModels`, so Undo and Back to the original work. Speed on 303 200 triangles in Node: check 0.7 s, repair 1.5 s, simplify to a tenth 0.6 s.

**Fixed**: a keychain's plate in several pieces had every letter's hole added to every piece (`cutOut`, since the engraved name was written), so an engraved name on such a plate kept a solid top: the engraving was lost. `cutOut` uses `withHoles` now.

**Tests**:
- `tools-sign-test.js` (`npm run test:sign`):
  - every style on every backing closed, without torn or flipped edges;
  - lit letters: heights, the faces the wall and fit gap smaller, the strip, keyholes and wire holes, the ledge with no support;
  - solid letters: the keyhole pocket with no support, too thin says so, the gap between separate numbers empty;
  - neon: the L's 100 mm of strip, the groove's width, missing letters said.
- `tools-relief-test.js` (`npm run test:relief`):
  - the real model when `models/` has it: its SHA-256, correlation 0.91 with a scene's true depth, the ball, box and wall in order, a 364 × 518 picture;
  - with a stand-in dome: brightness first, the input size, the depth kept, the heights (7 mm in the middle, the 1st–99th percentile spread halfway out), the flat background, round with a border and hole, brightness, and the depth coming back from a saved project without the model.
- `tools-doctor-test.js` (`npm run test:doctor`):
  - the report on a good and a broken ball;
  - repair: holes, flips, the doubled triangle, volume within 2%, the source map, inside out, points 0.0002 mm apart;
  - simplify to 50/10/2%: closed, volume kept, the bumpy surface within 0.6 mm, originals only, an open edge kept;
  - in the app: a broken STL found, repaired, simplified and put back.
- `tools-project-test.js` gained hostile signs and reliefs. Writing them found that the cleaning merged the file's sign and relief into the defaults object itself, so an unknown key survived; and that a 200-letter sign at 400 mm took 70 s to refuse. Both fixed.
- `tools-browser-check.js` gained a sign step (real fonts, all three styles, no support) and a relief step (the real model served from `models/`, its button, 9 s).
Also run and passed:
- the full smoke test (30 quick starts, 25 objects, 524 clicks);
- `test:fit`, `test:print`, `test:photo` (the shared runtime), `test:art`, `test:project`;
- the control audit on sign and relief (no findings);
- `check:browser` (202 screenshots, no findings; the figure finder still downloads and finds its figure through `ortRuntime`).

The print survey against v0.31.0's build: every earlier quick start and object reads the same; the new ones read 0 mm² of support.
Seen in Chromium: lit letters and their backs (keyholes, wire holes), solid house numbers, the neon sign, a relief of the drawn lighthouse, and a relief of a picture of the bobble head (`MakerForge.thumb`), before and after the carving.

**Not done, next**:
- The model doctor's split for the bed with pins: it needs each piece laid on its own cut face for printing, and the app has no print placement per part yet (the painter and the layout assume one model in place).
- Hollowing with drain holes, and thickening thin walls (both need an offset surface: a distance field on a grid and marching cubes, or Manifold's level sets).
- Signs: wire paths along the back, letters spaced for a raceway, script fonts for neon.
- Relief: colour on the relief (the photo's colours as paint), a relief on a box lid or a medallion with a rim.

**Still to check by hand**:
- a printed lit letter with a real LED strip and face;
- a neon strip in the groove (6 mm silicone neon varies: 6.0–6.5 mm);
- the keyhole pockets on a real screw;
- a relief from a real photo of a face (the tests use a drawn scene);
- a repaired and a simplified model from Thingiverse in a slicer.

## Session 39: many more project-box openings, and mounting (v0.33.0)

Asked for (the owner, after v0.32.0): "Can you add a bunch more components openings to project boxes, the the small esp32 cam,
the movement sensor from the esp32 bird cam project and many others like the type c charging board and other small components I
have used in projects and others", then, while it was being built: "should we add mounting attachments and hanging from wall and
such for project boxes ?" And for after this release: "After 0.32 and all current features I think we need to work on expanding
and fixing all the other current features and parts of the app, more accurate painting art placement and everything else" (the plan
is under Unfinished, "The next builds: expand and fix").

**Openings** (`CUTOUTS`, `CUT_GROUPS`, `cutoutMenu` in `src/app.html`)
- 76 kinds now (were 43), each with a group `g`. **Add an opening** is a grouped `<select>` (`selField` already took `{ group, items }`).
  The old keys are unchanged, so saved projects open as they were.
- The ESP32 bird cam project is not in any of the owner's repositories or on the website, so both common PIR sensors went in:
  the HC-SR501 (`pir501`: the 23 mm Fresnel dome and its two M2 holes 28 mm apart) and the mini AM312 / HC-SR505 (`pirmini`, a
  10.4 mm hole for its dome). "The small esp32 cam" is taken as the ESP32-CAM's OV2640 lens (`esp32cam`, 8.5 mm; the XIAO ESP32-S3
  Sense uses the same module). The type-C charging board is `usbcboard` (9.4 × 3.6 mm, a little bigger than a bare USB-C port, for the
  TP4056 and IP5306 boards' sockets).
- Four new shapes in `openingRings`:
  - `pir`: a dome and two screws across.
  - `camera`: a lens and four screws; `holeShift` puts the screws' middle 1.2 mm above the lens, as on the Pi camera.
  - `twin`: two eyes (HC-SR04), never closer than their size plus 1.2 mm.
  - `grille`: small round holes packed in a circle (speaker 28 mm with 2 mm holes, buzzer 10 mm with 1.6 mm holes). A grille is
    capped at 160 mm and about 1500 holes (the bars widen), because a hostile file's 400 mm grille of 1 mm holes would have made
    40 000. A screw hole that would break into its dome or lens is left out rather than torn into it.
- The new port-like rectangles (`usbcboard`, `dcpcb`, `xt60`, `slide`, the DHT grilles) can take a pointed top or a notch (`ENC_POINTABLE`).
- Sizes are typical datasheet values, as before. The TFT and 1.3-inch OLED screens vary most between makers and say "check yours".
  The window of a TFT is centred on its screws here; on a real module it sits nearer one end.

**Mounting** (`encMount`, `encDinClip`, `DIN`; settings `mount`, `earN`, `tabN`, `earHole`, `earT`, `strapW`, `strapT`, `strapDir`)
- Seven choices in a "How it hangs" list: not mounted, screw ears, hanging tabs, DIN rail clip, strap loops, SKÅDIS hooks, pegboard pegs.
  The tabs and the hooks came from the owner's second message ("maybe this kind of hook too and other hooks", with a picture of a
  tapered tab with an upright slot).
- Planned before the openings, so the faces it uses are "taken" (an opening there is left out and says why).
- **Screw ears:** two (the middle of each side) or four (near the corners, if the sides are long enough, else two and a warning).
  - Each ear is `earT` thick, `2·hole + 6` wide, with its hole `hole + 1.5` out from the wall.
  - A 45° fin stands at each edge, clear of the screw head; the fins stop where the ear starts to round off (first tried longer:
    their tips overhung the round end, 7.7 mm² of support).
  - The lid moves over by the ears' reach (`mount.out`), and the bed check counts it.
- **DIN rail clip:** a separate part printed flat to the left of the box, screwed under the floor with two M3 × 8 mm screws through
  clearance holes 18 mm apart.
  - It slides onto 35 mm top-hat rail from the end: a 5 mm plate, and a hook along each edge with 0.25 mm of play beside the flange
    and 0.15 mm above its 1 mm thickness.
  - The lips reach 1.5 mm over the flanges, their undersides stepped at 45°. So it prints without support, and pulling it straight
    off would have to spread the hooks.
  - No spring: a snap-on clip needs a flexure that prints well in the plane it bends in. That was more than this session could test,
    so it is in Not done.
- **Strap loops** on the back wall:
  - **Across:** an extruded profile with a 45° underside; its top bridges only the strap's thickness.
  - **Up:** a U from the bed up, with no overhang at all.
  - The loops sit at a quarter of the width from each side, or a single one in the middle on a narrow box.

- **Hanging tabs:** a plate on the back, from the bed up to above the lid, tapering to a round top.
  - The slot is `earHole` wide with 8 mm between its ends, round at the bottom and pointed at the top. It starts 3 mm above the lid's top
    (`B.top`), so the screw's head can be reached.
  - The plate is fused 0.5 mm into the wall below the lid only, so it never runs into the lid.
- **SKÅDIS hooks and pegboard pegs:** at the top of the back, as far apart as the grid allows (40 mm for SKÅDIS, 25.4 mm for
  pegboard), centred.
  - Each turns **up** behind the board, so nothing starts in mid-air when the box prints standing.
  - A SKÅDIS hook is a 4.2 mm profile with a 45° underside, 11 mm tall where it passes the 15 mm slot.
  - A peg is a 5.6 mm teardrop (its underside pointed at 45°) for 1/4-inch holes, with a round post standing on it behind the board.
  - A box too narrow for two hangs from one and says so.

**Tests** (all headless)
- `npm run test:enclosure`:
  - every kind on four faces (now 76 × 4);
  - each new shape measured: the dome and screws, the eyes' spacing and its minimum, the camera's screw rectangle and its shift,
    the grilles inside their circle;
  - the grouped list;
  - each mount, by points inside or outside the mesh: the ear's hole and fins, the clip's flange slot, lip and plate, the floor's
    screw holes, the strap channel, the tab's slot above the lid, the hooks' and pegs' spacing and the board's room behind them;
  - support area under 3 mm² for each mount;
  - the warnings: too short for four ears, too small for a clip, too short for a strap across;
  - openings left out on a clip screw or behind a loop;
  - a hostile project for the mounting settings and silly opening sizes.
- Also: the smoke test, `tools-audit.js index.html enclosure`, `test:project`, `test:print` and the print survey (see below).

**Not done**
- A snap-on DIN clip with a spring (see above). The slide-on clip needs a free rail end or an end stop.
- The board ghost with one-click port openings (idea 6), battery bays, and boards for the ESP32 dev kits and the ESP32-CAM: the
  common ones have no mounting holes, so they need a cradle rather than standoffs.
- Still to check on a real print: every new opening's size with real parts, the HC-SR501's screws, the ears' strength, the DIN clip
  on a real rail (fit and hold), the strap loops, the tabs on a screw, and the hooks on a real SKÅDIS board and pegboard (how they
  go in, and whether a full box tips forward).

## Session 40: a project box in parts that screw together (v0.34.0)

Asked from the bench supply's session (repository FOUR-CHANNEL-PSU): add a "split into parts that screw together" option to the project box. The owner's Bambu X2D has a 256 × 256 × 260 mm bed; the bench supply's case (`case/make-case.js` there) is about 300 mm long and was made as two separate boxes bolted together through a big opening in the walls where they meet. Done meant: a 300 mm box with openings on all walls splits into bed-sized parts that are closed solids with matching screw holes, and every test passes.

**What it does** (`encSplitPlan`, `encJoinSolids`, `encSplitParts`, `encPackPlates`, `platePlace`, `encSplitText`, `encSplitReadme` and `plateBounds` in `src/app.html`; `splitSolid`, `splitSolidAt` and `planeClear` in `src/core.js`):
- Settings (Make tab, page **Split into parts**): `split` is `"bed"` (the default: only when the box is wider than the bed's X or deeper than its Y), `"parts"` (always, into `splitParts`, 2–8) or `"off"`; `splitScrew` is M2–M4 (M3). `sanitizeProject` keeps them to those; a project from before splits only when the box is bigger than the bed.
- The box is cut across the way it is too long for the bed (its longer side when both or neither are) into n = ceil(L / (bed − 10)) parts, L counting mounts that stick out past its ends. Joins start evenly spaced, then each moves in 0.5 mm steps to the nearest place where nothing on the long walls, the floor or the lid lies within tf + 1 mm of it: openings and their labels, corner posts, foot recesses, standoffs, the board's outline, the lid's screw heads. In `"bed"` mode up to two more parts are tried before giving up (a 220 mm vent on a 300 mm box gives 32 + 236 + 32). A join that can't avoid something is said ("Opening 1 crosses a join", "A join runs through a board standoff"). Parts are at least 2·tf + 12 mm long and joins keep max(R, t) + tf + 1 from the ends, on the flat of the walls.
- Each join: a flange inside each part, a U along both long walls and the floor, tf thick and b wide: tf = max(insert depth + 1, 5, and with lid posts 2 × the post radius and the lid's head + 2), b = max(insert + 4, 2 × the post radius): 8 and 8 mm for M3. They reach 0.5 mm into the walls and floor, like the corner posts. The first part's flange has `SCREWS` insert holes right through it (pilot holes with **Self-tapping**), the next part's clearance holes. Screws about 50 mm apart: both bottom corners, along the floor, up both walls (8 on the 300 × 160 × 110 box). All with pointed tops (they are hidden inside). A screw is tf + the insert's depth long (M3 × 14), and the text gives the next standard length.
- A counterbore for the screw heads (so M3 × 10 would do) was built first. Its pointed tops broke out through the top of the floor strip and of the wall strip under the lid posts: 46 mm² of support in part 2, found by the print check. Dropped.
- Lid posts: with corner posts (a screwed or magnet lid) the flanges' wall strips run up to the top, and their top (the lid screw's insert depth + 1, or a magnet pocket) is a block with a hole for a lid screw, each side of every join on both walls (`split.pins`). They join the corner posts in the lid's holes (`lidPins`) and in `taken.top` (a logo keeps off them); the lid's lip leaves a gap over the flanges. Without posts (press-fit, or no screws) the flanges stop 0.5 mm under the lip and each part of the lid presses in on its own.
- The box, the lid and the logo's inlay pieces are built whole as before, then cut with `splitSolidAt`: the lid where it prints, turned over beside the box (so a z split cuts it at −z, and its pieces are reversed). The flanges are added to each box part after the cut, flush with the cut faces. Parts are named "Box part k", "Lid part k" and "Lid part k logo (colour)"; the lenses stay one part.
- Plates: `encPackPlates` lays the parts in rows on each plate (5 mm from the edge, 8 mm apart), a new plate when one is full; a logo goes with its lid part; each plate's parts are centred on its bed, the plates in a square-ish grid (`platePlace`: in a row, 17 plates were 5 m long and the print check took 30 s in jsdom). Each part gets a `layout` (so the files, the checks and the print positions use it, as the lightbox's layers do) and a `plate`. The view shows the box put together; **⊞** lays the parts out, and `makeBed` draws the other plates' outlines.
- Checks: `printedParts()` carries each part's `plate`; with plates, `runChecks` measures each one (`plateBounds`): "Fits the bed: 5 parts on 4 plates, each fits…", or which plate is too big. A box bigger than the bed with splitting off is told it can be made in parts. The split's messages carry `split:true` and also show on its page.
- Download: `plates/plate-N-prusa-orca.3mf` and `plates/plate-N-bambu.3mf` for each plate, `plates/stl/<part>.stl` for each part, `how-it-goes-together.txt`, and README lines. The model files hold every plate side by side, as before.
- Not split: the fit test; a sliding lid (it says so); a box too shallow for the flange and its post (it says how tall); a box bigger than the bed both ways (it says how deep it may be).
- With the mounts (Session 39, merged while this was being written; the work moved onto the new `main` before its first push): the joins keep clear of everything the mounts put in `taken` (ears on the sides, loops, tabs and hooks on the back, the DIN clip's floor screws). The plan measures the footprint with the mount solids: a box whose ears take it past the bed is split (a 240 mm box with ears is 267 mm wide), and the end parts' lengths count what sticks out past the box's ends. The DIN rail clip stays a part of its own, laid out with the rest.

**The plane cut** (`splitSolid`): each triangle that crosses the plane is split, with one new corner per edge (shared, so the halves stay watertight by index); the cut's outline is walked into loops, outlines and holes told apart by their turn, and filled with earcut. No Manifold, nothing to download, and the box stays synchronous. The first version gave earcut the loops as they were: on the three-part lid (its countersinks are 0.2 mm slabs) earcut got stuck on points a hair apart and dropped points in a straight line (its `filterPoints`), leaving 8 open edges. Now earcut gets the corners only, and each triangle's edge along the outline takes back the points between its corners (a fan from the opposite corner, or round a new point in the middle when two edges have some). A random sweep then found a box whose join was forced through a floor grille and its label: two edges of the floor's first layer crossed the plane 0.00000004 mm apart, one a hair behind the other, which earcut took for a zigzag of no width. Points that close to a neighbour are now dropped before earcut and taken back on the edge the same way (that box is a test now). `planeClear` moves a plane 0.013 mm at a time off any corner within 1 µm of it. Checked against Manifold's flat cut: the same volumes to 0.001 mm³.

**Tests**
- `tools-cut-test.js`, the library: cuts across and through a hole (each against Manifold), a ball, two separate pieces, three cuts at once, a plane that misses, a painted solid, a thin plate full of holes cut a hair from a corner, and `planeClear`.
- `tools-enclosure-test.js`, a new part (`ONLY=split` runs just it):
  - the 300 × 160 × 110 box with 11 openings on all six faces on the X2D's bed: two box parts and two lid parts, closed and outward, every opening in, each part within the bed;
  - the box parts are the whole box plus the flanges to 0.01 mm³, and meet at the join;
  - each of the 8 join screws checked with rays from points round it: the insert's size in part 1, the clearance size in part 2, plastic round both; the lid's four extra holes over the inserts in the flange tops;
  - 4 plates, each within the bed, nothing on one overlapping; the checks say so; nothing near the join needs support; the instructions; the Make tab's page; M4 screws;
  - a join moves round openings on the front and the back; a long vent gives three parts; one that can't be avoided is said; three parts on request; a box long front to back; magnet and press-fit lids; a sliding lid, 300 × 300, **Never**, the fit test and a small box are not split;
  - with mounts: a 240 mm box whose ears make it 267 mm wide is split with every part within the bed; 240 × 250 mm with ears is cut across its width, the way that is too long, though its depth is longer; a hanging tab in the middle of the back moves the join off it and stays whole on one part;
  - the sweep's box with a join forced through a floor grille and its label: every part closed;
  - hostile settings, too few parts, a project from before.
- `tools-project-test.js`: a box a million km wide in a billion parts, and a 300 mm box asked for a billion parts (8, built in 6 s).
- `tools-audit.js` takes `SET='{...}'`, settings to audit from. The box at its defaults, at 300 × 140 × 90 (split in two), the same with ears, and at 200 × 100 × 60 in three parts (with **Number of parts**): no findings.
- `tools-browser-check.js`: a split step in Chromium: the 300 mm box in 2 parts on 4 plates, each plate's 3mf read back from the download within the bed, 4 STL files and `how-it-goes-together.txt`; screenshots `split-assembled` and `split-laid-out`.
- A sweep in the scratchpad: about 1,300 random boxes (sizes, lids, screws, corners, openings with labels, feet, boards, every mount, beds from 180 to 350 mm, every split choice), about 560 of them split: every part closed and outward, and when split to fit the bed with nothing said, every part within it. One box came out open before the near-duplicate fix above; the 840 after it all came out closed.
- Also passed: `test:enclosure`, `test:project`, `test:cut`, `test:print`, the smoke test (30 quick starts, 25 objects, 527 clicks), and `check:browser` (205 screenshots, no findings). The print survey reads exactly as v0.33.0's apart from timings: every quick start and object fits the bed, so nothing is split.

**Not done, next**
- Splitting both ways, for a box bigger than the bed in both directions; parts are never turned on a plate (one that would fit turned gets a plate of its own).
- A join never goes through an opening: when it can't avoid one it only warns, and the flange covers the opening from inside.
- Dowels or a lip to line the parts up: the screws and the flat faces do it now.
- The sliding lid; feet in the middle of a long box.
- The bench supply's case (FOUR-CHANNEL-PSU, `case/make-case.js`) could now be one 300 mm box: for that repository's session.

**Still to check by hand**: a printed join (an M3 insert in its 4.0 mm hole with a pointed top, the flanges flat against each other, the lid parts meeting over the join), and the per-plate files in Bambu Studio, OrcaSlicer and PrusaSlicer.
## Session 41: sharp paint edges (v0.35.0)

Asked for (the owner, after v0.33.0's plan): "Go for it": the first of the "expand and fix" builds, painting and art placement
accuracy. The website README pictures went in as Website#2 the same day, and FOUR-CHANNEL-PSU turned out to be filled in already,
with its own README and pictures: its case script was run against this branch and builds with no warnings.

**The problem:** the brush, the eraser, the box and lasso tool, and pictures painted on a model all coloured **whole triangles**. A
colour's edge was therefore as jagged as the paint detail: on Normal (1.2 mm triangles) a stroke's edge was about 0.2 mm off on
average and up to half a millimetre, and on Coarse a round dab printed as a cog. The old idea "sub-triangle paint export" (painting
part of a triangle in the 3mf's paint codes) needs a slicer check of the codes. Instead, the mesh itself is now **cut along every
painted edge**, which every slicer reads.

**Core** (`src/core.js`)
- `meshEditor().cutField(fn, box)`: cuts the surface where `fn(x, y, z)` crosses 0, like `cut()` for a plane.
  - Each crossing is found on its edge by six steps of false position (the field need not be straight).
  - A crossing within 5% of an end is left uncut, so no sliver is made.
  - With `box`, only the edges filed near it are looked at. The editor keeps a lazy grid of edge middles (`edgesIn`, cell 3 × the
    mean edge), and splits add their new edges to it. A stroke across a 488 000-triangle ball is cut in about 150 ms.
- `strokeField(pts, r)`: the stroke as the set of points within r of the polyline through its points (a single point: a ball).
  `f` is the distance less r. Its segments are filed in a grid padded by a cell, so answers near the edge are exact.
- `strokeTris` / `paintStroke`: the triangles whose middles are inside that shape, facing the camera when asked. The smart brush's
  fold limit still floods from under the stroke. Long jumps between points are probed along the segment, so a fast stroke no longer
  leaves gaps. This replaces `paintBrush`'s per-point discs in `runPaintOps`; the live stroke and the preview still use `brushTris`.
- `pictureUV(dir, box)` and `pictureWrapUV(o)`: where a point lands on a projected or wrapped picture (factored out of the painters).
- `pictureFields(pic)`: the picture's colours as shapes.
  - For each colour (and −1, "none", which also covers everything off the picture): a signed distance in pixels from the edge of its
    patches, from two `edt`s on a grid padded by a pixel, read bilinearly between pixel middles.
  - `which(fu, fv)` gives the colour the point is deepest in.
  - `paintPicture` and `paintPictureWrap` take it as an optional last argument, to colour by shape rather than by the pixel under the
    middle (they must, on a mesh cut along those shapes).
- `areaField(M, poly)`: the box or lasso outline as a shape: the point's distance on the screen from the outline, below 0 inside.

**App** (`applyPaint`, `sharpenPart`, `sharpKey`, `scheduleSharpen`, `flushSharpen`, `picFields`)
- `state.paint.sharp` (default true; a project saved before it opens with it on; anything but `false` reads as on).
- The cut mesh is built **on top of** the refined one (the `pc` before: refine and plane cuts) as `pc.sharp`:
  `{ key, solid, topo, src (to the original model), base: pc, srcBase (to pc's triangles) }`. Its key holds the strokes, boxes and
  lassos and the pictures' settings only, so other steps (height bands, a fade, a fill) don't recut.
- `runPaintOps` works on the cut mesh. The slow steps are worked out once on `base` and each piece of a cut triangle takes its
  triangle's answer (`of(arr, t)`): curvature, colour from a photo (and its helper-thread job) and the model's own colours. The area
  tool is asked of the cut mesh itself, so pieces inside the outline are taken and those outside not.
- **When it is cut:**
  - models under 60 000 triangles (`SHARP_NOW_TRIS`): at once;
  - bigger ones: 500 ms after painting stops (`scheduleSharpen`, put off while a build or a stroke is under way). Until then the
    model shows its triangles painted as before;
  - before a download (`flushSharpen` in `exportZip`).
- A painted picture is read at 240 pixels across with Sharp edges on (160 before), since its colour edges now follow its pixels.
- **Paint detail** page: a **Sharp edges** checkbox and a note on what it does.

**Measured** (`npm run test:sharp`, new)
- **A stroke on a plate at Normal detail:** the paint's edge on average 0.011 mm from the stroke's true edge (0.208 on the triangles
  alone; worst 0.42 against 0.47: the uncut 5% near corners). The plate stays closed with its volume.
- **A 12 mm dab on 2.5 mm triangles:** its disc's area within 1%.
- **A cut in a corner** changes nothing away from it.
- **A picture (two halves and a disc) on a wall:**
  - the straight edge between the halves is 0.003 mm off (0.136 before);
  - the circle is 0.144 mm off (0.328 before). It is drawn in 0.8 mm pixels, so a quarter pixel is the floor;
  - each colour's area is within 0.4%.
- **A 7-sided lasso on the plate:** its area within 0.5%, only on the top face, its edge 0.007 mm off (0.435 before).
- **In the app, on the vase (209 000 triangles):**
  - a dab is cut in (closed) and its area matches its disc within 6% on the curved side;
  - the download has the cut model;
  - the eraser's edge is cut too;
  - a new stroke waits, then is cut by itself;
  - off puts the plain triangles back;
  - an old project opens with it on, and a hostile value reads as on.
- `tools-paint-test.js`: "the brush preview lights up exactly the triangles the stroke paints" now runs with Sharp edges off (with
  them on, the stroke is then cut in).

**Bugs found along the way** (a new scratch harness builds an object in real Chromium, with real fonts, from random combinations of
its settings and checks every part: closed, outward, not NaN, on the bed, no page error; 120 name keychains, then 80 more)
- **A double-sided tag's back name stood 0.8 mm (up to 4) below the plate** (`extrudePolysAt(backPolys, -backH, 0.3)`), so the plate
  printed in the air round the letters. Every double-sided case in the harness failed "below the bed". It is now set flush into
  the bottom like the credit (`bottomPolys`, the plate cut away under it, `Name (back)` from 0 to the depth). `backH` is now the depth,
  0.2 to 1.2 mm and at most 40% of the plate; the field is **Back letter depth**.
- **The print check read it as needing no support**: `analyzePrintSteps` took y = 0 as the bed even when a part reached lower, so the
  plate's underside counted as lying on the bed. It now checks from the lowest point, as a slicer drops the print (`res.sunk`). A plate on
  a post 0.8 mm below the bed now reads 764 mm². The print survey is unchanged for every other object, so nothing else had parts below
  the bed.
- **Slivers of plate between letters set into the back**: with the name flush in the bottom, the survey found a 0.37 mm wall in the
  first layers (inside a script name's loops; the credit had the same). `fillNarrow` closes the letters' mask by 0.55 × the nozzle, so
  gaps narrower than about a nozzle print in the letters' colour. The tag now has no thin walls and needs no support.
- Tests: `test:fit` has the tag flush and cut, needing no support, and the print check on a part below the bed.
- Checked and already fixed: HANDOFF's Known bugs still said the keychain's picture used a flood fill; it has used the colour cut-out
  since Session 34.

**Not done**
- The brush preview still lights up whole triangles (the cut comes after the stroke). A ring the brush's size is drawn as before.
- Colour from a photo, curvature, the model's own colours and fills still colour whole triangles: their edges come from per-triangle
  answers, not shapes.
- Cutting on the helper thread (a 500 000-triangle model takes about a second, after a pause).
- A picture's colour edges follow its pixels, smoothed; following the picture's own anti-aliased edges would be smoother still.
- Still to check: a cut model's 3mf in Bambu Studio, OrcaSlicer and PrusaSlicer (it is an ordinary closed mesh with more triangles,
  so no surprise is expected).

## Session 42: the name keychain, the double-sided tag and business cards (v0.36.0)

The first section update on the road to v0.50 ("Don't forget to check for bugs along the way and update the documentation with
screenshots included. And go for it").

**Bug hunt** (the Chromium fuzz harness from Session 41, `mf-fuzz.js` in the session's scratchpad, not kept in the repository; it
takes an object, a list of values per setting or `auto`, and builds random combinations, checking every part)
- Name keychain: 200 cases after the fixes, none bad. Business card: 160 cases, none bad. Signs, plaque, frame: 60 each, none bad.
- **The credit on the back was never placed on a script name in a real browser** (`plateInfo.credit.size` 0, "too big"), on v0.31 to
  v0.34 alike: `backFit` (then inline) drew it only at the middle of the name's outline, and on "Emma" in Dancing Script that middle is
  4 px from a gap in the plate, so every size failed. jsdom's box glyphs give a plate with no gap there, so `test:fit` passed. Now
  every spot of the plate where `dEdge ≥ margin` is a candidate (a 0.5 mm grid, nearest the middle first, with up and down counted
  double); each is tried with up to 600 of the text's pixels, then pixel by pixel. "@retr0plus" now fits at its full 3.5 mm.
  `plateInfo.credit.moved` says how far it went. The test is a name with a gap in its middle ("Ab          Cd", no bridging): the credit
  moves aside at its full size.

- `tools-audit.js index.html nameplate,card` found two card controls that change nothing. **Name in capitals** really did
  nothing on the default card: its font, Bebas Neue, has capitals only (as Bungee does). Those fonts are marked `capsOnly` in
  `FONTS`, and the switch is a note with them. **A card for each name in a list** does nothing with an empty list (the card says
  so); it is in the audit's expected list for that case.

**New**
- **Its own text on a double-sided tag's back** (`nameplate.backText`, ≤ 40): drawn in the name's font through the same `backFit`,
  from 0.8 × the letter height down to 2 mm, 1.2 mm inside the edge, flush like the mirrored name. `plateInfo.back.size` (0 when it
  doesn't fit; the panel says so). The checkbox is now **Something on the back too**.
- **A magnet pocket** (`nameplate.magnet`: a `MAGNETS` key or "none"; `magnets` 1 or 2; idea 39).
  - A round pocket 0.3 mm wider and 0.2 mm deeper than the magnet, open to the bed (the magnet is glued in afterwards).
  - Placed at the deepest point of a distance field of the plate's outside, the ring hole and any letters set into the back
    (`backRaster`); two go in the left and right halves.
  - Refused with a reason in `plateInfo.magnet`: a plate thinner than the pocket plus 0.8 mm, or no spot (r + 0.8) mm clear.
  - The plate is now built as slabs at every height where something changes: letters in the back, the pocket's roof, an engraved
    name. Each slab is cut by what is in it.
  - A 10 mm pocket's roof is a 10.3 mm bridge, over the default 10 mm limit: the check asks for support, and the panel says so.
- **A tagline on business cards** (`card.tagline`, ≤ 80): a row under the title at 0.85 of its size, front only, in the title's
  filament, in `mainH`, both layouts' placing, the width fit, the small-letter warning and the nudge.

**Tests**
- `test:fit`:
  - the credit moving aside;
  - the back text flush, fitted and 1.2 mm inside;
  - a back text too long;
  - an 8 × 2 pocket (empty to 2.2 mm at its middle, 3.6 mm out still empty, 4.6 mm out plate, plate above);
  - two pockets on a long name;
  - too thin, and no room for 12 mm behind 8 mm letters;
  - a pocket clear of back text.
- `test:card`: a tagline on every layout, measured in the title's filament, every code still reading.
- `test:project`: hostile back text, magnet and tagline.

**Not done**
- Cards' own next steps (Session 33): a vertical layout of its own, emboss in the card's colour, NFC card slots.
- A magnet sealed inside with a pause (the pocket is open, for glue).
- A keychain plate's interior holes (a letter counter bigger than the border, as in "Emma" at 3.2 mm) are kept, as before.
- Still to check by hand: a printed tag with a magnet; the back text and credit on a real print.

## Session 43: signs, plaques and photo frames (v0.37.0)

The second section update on the road to v0.50.

**Bug hunt**
- **The Chromium fuzz harness:** signs, plaques and frames, 60 each at first, then 50 more each with the new options. None bad.
- **The audit** of the frame, the plaque and the sign.
- **The weak spot was what the frame lacked, not a bug:** it was a flat ring with a window, with nowhere to put a photo.

**A frame for a photo** (`FRAME_PHOTOS`, `frameDims`, `buildPhotoFrame`, `unionHeadSlot`; settings `frame.photo` (a size key or
"none"), `pw`, `ph`, `landscape`, `border`, `overlap`, `sheet`, `panelT`, `stand` ("leg"/"none"), `hang`)
- **Sizes and the old frame.** `frameDims` gives every size: from the frame's own settings (the old frame, unchanged, still the
  default and the **Photo frame** quick start) or from the photo:
  - pocket = photo + 0.3; window = photo − 2 × overlap; outer = pocket + 2 × border;
  - thickness = panel + (sheet + 0.6) + bevel + 1, where bevel = (pocket − window) / 2.
  - Placing art on the border and its default width use `frameDims` too.
- **Printed face up**, so artwork on the front works as on any frame.
  - The frame is 0.2 mm slabs: the pocket open to the back; above `zb` its wall moves in 0.2 per 0.2 (45°) to the window, so the
    window's edge is a bevel like a mount board's and the roof over the photo's edges needs no support.
  - A half-disc notch on the pocket's bottom edge, 6 mm across at the back and shrinking 1 mm per mm (a 45° half cone), lifts the
    panel out.
- **The back panel:**
  - 0.15 mm smaller all round than the pocket, printed photo side down, beside the frame (or behind it, if not beside);
  - a socket block for the stand: a 3.2 × 12.2 mm slot, 6 mm deep, 45% of the way up;
  - near the top corners, two keyhole blocks 7 mm high. The head hole is 9.5 mm; the slot 4.5 mm wide runs 9 mm up; the lip's
    underside narrows from 9.5 to 4.5 mm in 0.25 mm steps over 2.5 mm, so it needs no support. An earlier flat lip read 60 mm².
- **The stand (leg):** printed flat, its tab 2.9 × 11.9 × 5.8 mm. Its upright edge is as tall as the socket's height above the
  frame's bottom edge, and its foot runs 45% of that behind. It is printed in the frame's window when it fits there, which keeps a
  10 × 15 frame and its parts on a 256 mm bed. The first version laid it beside the panel: 297 mm.
- When the frame and panel don't fit the bed together (A5 with a wide border), the panel says to split the print into objects in
  the slicer.
- **Quick start "Frame for a photo"** (10 × 15 cm, stand and keyholes); its Start picture is made with `ONLY=... node tools-thumbs.js`.

**Stands** (`slotStand`, `standFor`; `board.stand`, `frame.standBase`, `sign.stand`)
- A block 10 mm high, as deep as 3 × the piece's thickness + 26 mm (28 to 48), and 55% of the piece's width long (30 to 180).
- The slot is the thickness + 0.3, 7 mm deep, leaning back 10°, with 2 mm 45° chamfers on the top edges.
- It is printed on its side as an extrusion of its profile, so nothing overhangs more than 10°. It is laid in front of the piece.
- **Where:** a plaque; a frame without a photo (`standBase`, kept apart from the photo frame's leg so the old frame's default stays
  one part); a sign with a backing (the "Board" or "Sign" part, the slot sized to the back's thickness).

**Card (carried over from v0.35):** fonts with capitals only (`capsOnly`) replace the **Name in capitals** switch with a note.

**Tests** (`npm run test:frame`, new)
- The old frame unchanged (size and volume).
- A 10 × 15 frame:
  - three closed parts on the bed;
  - its outer size, the window open right through, the pocket behind the window's edge, the 45° bevel (2.0 mm in over 2 mm up);
  - the panel 0.15 mm smaller, the notch, the stand in the window;
  - no support, and it fits the bed.
- Every photo size upright and sideways; your own size with no stand and no keyholes.
- The stand's slot (5.40 mm across at 9 mm up for a 5 mm frame: 5.3 / cos 10°); a plaque and a desk sign with stands, needing no
  support.
- `test:project`: a hostile frame and plaque.

**Not done**
- Signs: wire paths along the back, letters spaced for a raceway, script fonts for neon (from Session 38).
- Frames: a mat (a second, coloured border inside the window), several photos in one frame, a frame that splits for big photos.
- Still to check by hand: a printed 10 × 15 frame with a real photo and sheet (the 0.15 mm press fit of the panel, the stand's angle
  and grip, the keyholes on screws), the slot stand's 0.3 mm fit.

## Session 44: the tracer and the photo relief, and imported models kept (v0.38.0)

The third section update on the road to v0.50, and the first of the basics asked for in Session 43 ("improve basic things that
are missing").

**Bug hunt**
- **The Chromium fuzz harness** (now with `keepExample` in a spec, so objects made from a picture keep their example):
  - the tracer: 80 random combinations of edges, countersinks, thickness, offset, holes, plate and cover modes, colours, size;
  - the relief: 60 of source, shape, size, colours, stand, border, hole and shaping.
  - Every part closed, outward-facing, NaN-free, on the bed, no page error, none slow: no case failed.
- **The weak spots were what was missing:** a traced part came out with sharp square edges and a first layer that squishes out
  (so a part traced to fit came out too big at the bottom); a relief was one colour, and could only hang.

**The traced part's edges** (`tracerEdges`; settings `tracer.edgeTop` ("square"/"chamfer"/"round"), `edgeSize` 0.2–5,
`edgeBottom` 0–1, `sink`)
- Built as slabs like the photo frame:
  - the top `eT` mm in 0.2 mm slabs, each the outline's distance field at its own inset (45° for a chamfer, a quarter circle
    for a rounded edge); the bottom `eB` mm in 0.1 mm slabs stepping in at 45°; the middle is the traced outline as before;
  - round holes stay true circles in every slab, grown by the inset (so a hole's edge is chamfered too);
  - `eT` is kept to 45% of the thickness, `eB` to 30%.
- **The field's inset:** `signedDistanceField` counts from pixel centres, so a level t lies t/2 px inside the outline below
  1 px and t − 0.4 px beyond (measured on a 15 mm disc). `tracerEdges` maps the inset it wants to the level it needs.
- **Countersinks:** each round hole widens at 45° towards the top. A hole within 0.6 mm of a screw's clearance (SCREWS: M2 to
  M4) takes that screw's head + 0.4 mm; any other round hole widens to twice its size, at most 6 mm more. Each is trimmed to
  leave 0.8 mm of part to the outline (less the top edge) and to stop half way to the next round hole: the first version let the
  example bracket's 15.4 mm countersinks break out through its edge, which read 172 mm² of support in Chromium (the jsdom
  trace's holes sat further in, so the headless test had missed it). The depth is kept 0.6 mm above the bottom chamfer. The
  panel lists each countersink and says when one was trimmed.
- Only for the shape on its own in one colour: a plate, a cover or the picture's colours (whose top layer is the colours) say
  so instead.
- The slabs overlap by 0.01 mm (as the frame's do), so the volume reading counts each overlap twice: about 1% high on a 5 mm
  part with a 1 mm edge. Slicers join them.

**The relief** (`relief.colour` "one"/"photo", `relief.stand`)
- **The photo's colours:** the picture read at one pixel per grid cell (up to 800 across), matched to the filaments by
  `buildCellMap` (the Art tab's switched-off colours left out); every face triangle (normal up, inside the border) takes its
  pixel's filament as `importPaint`, as a model with its own colours does, so the paint pipeline and every export carry it.
  The border, the outline's walls and the back stay in the relief's filament. The panel names the filaments used.
- **A stand:** `standFor` with the slot as wide as the thickest point within 3 mm of the bottom edge (the border's height when
  there is one).

**Imported models kept in this browser** (`keepModel`, `keptModel`, `forgetModels`, `MODEL_DB`)
- Every model opened (from a file or a project file) is put in IndexedDB (`makerforge` / `models`) under its name (the file's
  name and its triangle count, as `state.base.stl.name`), with its paint and its own colours.
- The newest four are kept, up to 300 MB. Nothing is stored when "Save my work in this browser" is off. **Clear saved work in
  this browser** clears them.
- `loadProject`, opening a project without its model (the autosave, the recent list, a share link), takes the model from
  IndexedDB. Only from there, and only when the file carried no model at all: a file whose model the cleaning refused stays
  without one and says so (the first version also took the tab's own copy and so brought back a refused model by its name:
  `test:paint`'s hostile models and its "says which file to open" checks caught it). A share link carries no pictures, so a model's picture colours (a GLB's texture) are dropped
  then and its plain colours kept.
- jsdom has no IndexedDB (the functions do nothing there); `check:browser` opens a model, reloads the page and finds it back.

**Tests**
- New `tools-tracer-edge-test.js` (in `npm run test:tracer`): the wall measured by ray casts at known heights (a 1 mm chamfer in
  0.47 mm half way up, 0.89 mm near the top; a 1.5 mm rounding at its quarter circle; a 0.4 mm bottom chamfer); countersunk
  holes measured at three heights; no support; an edge kept to 45%; not with the colours kept.
- `test:relief`: the photo's colours (the border and back unpainted, every colour off leaving it plain), the stand's slot.
- `test:project`: a hostile relief colour and stand, hostile tracer edges.
- `check:browser`: a GLB (325 190 triangles, with its picture colours) opened, the page loaded again, and the project saved without the model opened with the same model and its colours.

**Not done**
- The tracer: references other than paper (a bank card or a coin), a second height level (bosses, counterbores), lens
  distortion. Rounded and chamfered edges on a back plate or a cover.
- The relief: colour by the AI's segments rather than by pixel (a face in one skin tone), a relief on a box lid.
- Keeping models: no list of kept models to pick from yet (they come back with a project only).
- Still to check by hand: a printed traced part with a bottom chamfer (does it cancel the slicer's own elephant-foot
  compensation, or add to it?), countersinks with real screws, a coloured relief in a slicer.

## Session 45: project boxes, many more parts (v0.39.0)

Asked: "add 100 new components the most common ones first and then the rest of the boards modules arduino add ons with a
search function too" and "go back and work on project boxes, flesh them out for real, add any missing features add many missing
components openings and boards". This session also landed v0.35-v0.38 on `main` (see Session 44's end) and planned the
rest of the box work (Unfinished, "Asked for next").

**Boards and modules** (`BOARDS` with `BOARD_GROUPS`; 69 against 6 before)
- Each: `g` (its group), `label`, `k` (more search words), `w` × `d` (component side up), and `holes` + `screw` only where
  the holes are the same on every maker's board (Arduino Uno/Leonardo/Mega/Due, Raspberry Pi 5/4/3, 3 A+, Zero, Pico, the
  L298N). `check:true` marks sizes that differ between makers; the panel says to measure.
- **Cradles** (`encCradle`, `ENC_CRADLE`): a board with no holes listed, or with **By its edges** (`boardHold`), sits on a
  4 mm seat under each corner at the standoff height, inside an L-shaped fence 1.6 mm thick (at most the wall + 0.4), 0.3 mm
  clear of the board and 1.2 mm over its top. All upright extrusions: no support (measured 0 mm²).
- **Several boards** (`E.more`, up to 12: `{ kind, x, y, h, rot, hold }`; `encBoardList` gives the main board and these):
  each has its own standoffs or cradle, fit check and headroom check; two that overlap on the floor are named; the box's
  "grow to fit" (`boardNeed`) takes the biggest need; the split planner keeps its joins clear of every board (it took only
  the main board with holes before). `encFreeBoardSpot` puts a new one beside the others.
- **Add this board's ports** (`BOARD_PORTS`, `encAddBoardPorts`): `[edge, along, opening, up]` per port in the board's own
  drawing. The board slides 1 mm from the walls its ports face, then each port becomes an opening on that wall: `u` from
  the wall's own direction (front: x; back: −x; left: −plan y; right: plan y, worked out by probing a built box), `v` the
  board's top + `up`. Pressing it again adds nothing twice.
  - Known: a Raspberry Pi slid into a corner sits on the corner screw post (the warning says so); the Pi 5 swaps its
    network and USB ports compared with the Pi 4 the table follows.

**Openings** (`CUTOUTS`: 152, 76 new) with `k` search words; new kinds `dsub` (the D narrowing 10° each side, two screws),
`xlr` (a round hole and two screws on the diagonal) and `ledring` (four arcs, so the ring's middle stays joined to the wall).
Their size fields are on the opening's page. The "every kind on every face" test box grew to 220 × 180 × 140 mm (the Pi 7-inch
screen is wider than the old one's side).

**Search** (`searchSelField`): a search box over a grouped list; every word typed must be in the entry's label, `k`, group
name or key. "Add" lists pick the first match while typing and add it on Enter. Used for the board, the extra boards and the
openings.

**Tests**
- New `tools-boards-test.js` (in `npm run test:enclosure`): all 69 boards alone in a box (closed, standoffs or a cradle);
  the cradle measured by ray casts (seat, fence, clear between) and needing no support; By its edges; four boards with the
  overlaps named, then moved apart with no warnings; a supply too big, with the size it needs; Add this board's ports for an
  Uno, a Pi, a turned Pi and an ESP32 (every port's middle inside its opening, the board against its walls, no second set);
  the search (relay, esp8266, gland m20, nothing found); a hostile file (100 extra boards of nonsense, numbers that are
  words).
- Fuzz in Chromium: 120 random boxes with boards, holds, modules, new openings, lids, splits and mounts: none bad.

**Not done**
- The parts are not drawn inside the box yet (0.40), so a port's body, a tall capacitor or a fan's depth is not checked.
- Holes for most modules: they differ between makers, so cradles are used; a "my module's holes" entry per extra board
  would let people type them.
- Still to check by hand: a printed cradle with a real ESP32 DevKit (the 0.3 mm clearance), the Uno's and the Pi's port
  openings against real boards.

## Session 46: the inside of a project box (v0.40.0)

Asked: "Maybe a second floor for multipurpose boxes / ... if we use a 120mm fan inside a project box there will be a lot of
empty space and we should have different levels and shapes inside the box too ... Add as many options as you can think of
without being overwhelming". All of it under one closed page, **Inside: levels and dividers**.

**See-through parts** (`enclosureInfo.ghosts`: `ghostBox(x0, y0, z0, x1, y1, z1, kind, label)` in plan coordinates, z up)
- Each board: its plate (1.6 mm), the room its parts take (`BOARD_TALL`, typical tallest part: a USB-B 13 mm, a relay 19, an
  L298N's heatsink 27; supplies and battery holders are all body), and the main board's ports (`boardPortPlace`, shared with
  Add this board's ports). Levels and dividers in place; a divider's fan as a 25 mm block.
- Drawn in `refreshScene` as see-through boxes in the model group (not in the size, the camera framing or clicks; hidden in
  the Start pictures); only for a box in one piece and not with Explode or the layout. **Show the parts inside** turns them off.
- **Checks from them**: a board whose parts reach the lid, the top or the level above (a warning, with how much); a port of the
  main board with no opening in front of it when the board is within 15 mm of that wall (`enclosureInfo.hints`, shown under
  Board mounts, not a warning: a port may be meant to stay inside).

**Levels** (`E.levels`, up to 3: `{ z, t, hold:"posts"|"ledges", cable, vent }`; `encLevels`)
- The plate: the inside less 0.4 mm all round, square notches round the corner posts; a 24 × 8 mm cable slot at the back, air
  slots in the middle. Printed flat in front of the box, its boards' mounts on it (`levelSolids`).
- **Posts**: four 3.5 mm posts with a 2.5 mm pilot hole, 7 mm in from the plate's sides (further from the corners when there are
  corner posts); the plate has 3.4 mm holes over them. **Ledges**: along the side walls, 0.2 mm out for each 0.25 mm up to 3 mm
  under the plate. The first ledges reached 0.4 mm into the wall, and the print check counted the hidden underside of their
  lowest step as 124 mm² of support: they now start at the wall's face.
- A board on a level (`E.more[i].lvl`) stands on the level's top; boards on different levels are not "overlapping"; the floor
  under a level is free for floor openings.

**Dividers** (`E.walls`, up to 4: `{ axis, at, height, fan, cable }`; `encDividers`; `height`, not `h`, which the general
LIMITS clamp to 1 mm and so lost "0: up to the lid")
- Grooves: a 1.2 mm rib each side of a 2.4 mm slot up both walls it meets and along the floor (1.6 mm). The plate: the span
  less 0.8 mm, up to the lid (or under the lowest level), 2 mm thick, printed flat, a 14 × 8 mm cable notch, a fan's rings and
  screw holes (`openingRings` with a fan) when it fits. A divider outside the box is left out; one across a floor board named.

**Zip-tie anchors** (`E.anchors = { n, where }`): two 2 × 2 × 5 mm posts and a 1.2 mm bar over a 3.5 mm gap, 4 mm in from the
back, the sides or all walls, skipping boards, standoffs and corner posts (a hint says how many were left out).

**Plates**: when the parts don't fit one bed as laid out, `encPackPlates` (the box split's packer) puts each on a plate; the
lid's logo goes with the lid (`role`/`sec`). A split box packs its levels and dividers with its own parts, uncut.

**Tests**: new `tools-inside-test.js` (in `test:enclosure`): a level on posts (size, posts with pilot holes, clearance holes, no
support), on ledges (the slope by ray casts, no support), boards on a level and the checks (too tall under the lid and under a
level, the Uno's ports named until Add this board's ports), a divider with a 120 mm fan (size, grooves by ray casts, under a
level it no longer fits, outside the box, across a board), zip-tie anchors (the bar and gap, no support, left out under a
board), plates, the panel and a hostile file.

**Not done**
- Ducts from a fan to the vents; a battery bay door; dividers that are part of the box (glued or printed in).
- A level's boards are not checked against the posts under it, nor a level's cable slot against a board above it.
- Still to check by hand: a printed level on posts and on ledges, a divider in its grooves (the 0.4 mm play), a fan in a divider.

## Session 47: project boxes that print without support (v0.41.0)

The print fixes from the box plan (Unfinished: "0.41, lids, mounts and print fixes"). Measured in Chromium before and after:
PSU box 633 → 184 mm², power bank box 73 → 47, project box 25 → 25, Raspberry Pi case 0.

**Where the PSU box's support came from** (each opening taken out in turn): the 60 mm fan's ring grille 383 mm² (the top of
every curved slot is a flat overhang), the vent slots' round tops 55, the voltmeter window 54, the IEC inlet 52, the rocker
45, two banana sockets 24, the potentiometer 9. The power bank box: the USB-A port 26, the button 15, four pilot lights 33.

**Changes**
- `encPointed(c, rings)`: an opening's top is "pointed", "flat" or "auto" (new openings, `newOpening`); auto points a wall
  opening of an `ENC_POINTABLE` kind when its width is more than `state.printer.bridge` (10 mm). Saved projects keep "flat".
  `ENC_POINTABLE` gained the new port kinds (USB-B, mini-USB, stacked USB-A, micro/mini-HDMI, full SD, keystone, RJ11). The
  panel's checkbox became Auto / Flat / Pointed with a line saying what Auto chose. The fit test's "same opening" key uses
  the top actually made, not the word.
- Fan grilles: a new style "slots" (2.2 mm upright slots, 1.6 mm bars, inside the circle, `encGableSlot`'s 45° gable on top),
  the default for new fans (`CUTOUTS.fan.style`), so the PSU box quick start uses it. The fan's screw holes are teardrops in a
  wall whatever `E.teardrop` says (they are under the fan's frame).
- `encHoneycomb(..., wall)`: in a wall the cells are flat-topped (the same grid turned a quarter: columns), so each top is a
  bridge of one side (cell/√3, 2.3 mm for 4 mm cells) between 60° slopes. On a lid or floor, unchanged.
- Vent slots in a wall: `encGableSlot` instead of round ends.

**Tried and taken out: a snap-fit lid.** Wedges on the lip and ridges on the walls (additive only) do not work: a ridge that
sticks out further than the lip's gap (0.2 mm) also hits the lip itself, so the lid jams rather than snaps. A real snap needs
something cut away: a groove round the inside of the walls, or a window in the lip that a bump on the wall clicks into (the
lip built in bands, or cut with Manifold). Next time, with a fit-test print: windows in the lip's middles (1.2 × 12 mm,
0.6 mm from the lid plate), 0.45 mm diamond bumps on the walls at the matching height, the lip at least 3 mm.

**Tests**: new `tools-boxprint-test.js` (in `test:enclosure`): Auto on a USB-A (25.6 → 0 mm²), a USB-C staying flat under a
10 mm limit and pointed under 6 mm, a saved flat top kept; a 60 mm fan's rings (317 mm²) against slots and honeycomb (0);
slot and honeycomb vents (0); honeycomb on the lid unchanged; the quick starts' support under their new limits.

**Not done**
- The snap-fit lid (above), the hinged lid, the snap-on DIN clip, artwork on walls: still in the plan.
- Snap-in parts (IEC inlet, rockers, meters) keep flat tops (a gable would show round the bezel); most printers bridge them.
- Small round holes (pilot lights, banana sockets) count a little support with teardrops off; they print fine in practice.

## Session 48: Arrange it for me (v0.42.0)

The layout solver from the box plan (Unfinished: "0.42, arrange it for me"), as asked: "the ai to help design after specific
needs and parts chosen". The solver comes first so 0.43's AI only has to choose parts and settings, never positions.

**Changes**
- `encArrange(keepSize)` (exposed as `MF.arrange`): every board in `encBoardList(E)` packed on its floor or level. The main
  board goes first, 1 mm in from the walls its ports face (from `BOARD_PORTS` and `boardPortPlace`), clear of the corner
  posts; the rest are packed bottom-left on a skyline, 3 mm apart, each turned whichever way packs lower, biggest first.
  Without `keepSize` it tries inner widths 2 mm apart, packs each, and keeps the smallest floor area that holds everything
  and fits `state.printer.bed`; the height follows the tallest board plus its `BOARD_TALL` parts and the main board's
  highest port opening (with a pointed top's gable). With levels the height is left alone. The main board's port openings (`c.auto === "ports"`) are put back where the board ends up. Returns
  `{ok, before, after, n, ports}` or `{ok:false, why}`.
- Corner clearance uses the box's own rule for corner posts (`bossesOn`: a magnet lid, or screws unless the lid presses or
  slides in), so a box with no lid keeps its boards off the posts too (found by the doc screenshot: two "sits on a screw
  post" warnings).
- Board mounts: two buttons, **Arrange it for me (smallest box)** and **Arrange in this box**, with a note of what changed
  and one Undo step.

**Tests**: new `tools-arrange-test.js` (in `test:enclosure`): three sets in the smallest box (no warnings, every port opening
in place), packed tighter than a row, the Uno against the wall its ports face, a 200 × 150 box kept, a box too small
refused with a hint, boards on a level, the panel button, and 60 random sets of 2 to 6 boards with random lids and
fastenings (nothing overlapping, on a post or outside the box; the few too big for one floor on the bed said so).

**Not done**
- It does not add levels by itself when the parts don't fit one floor on the bed; it says so. Next with the AI help.
- Cable room between boards is the 3 mm gap only; openings other than the main board's ports stay where they are.

## Session 49: move while painting, the icon maker, Describe your project, AI help (v0.43.0)

Asked (the owner, during 0.42): "I hate that I can't move as much when painting and instead I have to switch to select all the
time", and from the box plan: "the icon maker with ai help of course" (the owner chose "Both": their own API key in the browser
now, a local model later; "Maybe a small local model too").

**Moving while painting** (`paintControls`, a capture-phase `pointerdown` and `touchstart` on `#view`, `stopGlide`, `cancelStroke`).
Before: while painting, the left button and one finger only painted; turning the view meant the Turn view tool. Now each press
decides: on the model it paints, beside it (brush, eraser, fill, pick, recolour) it turns the view (`controls.mouseButtons.LEFT`
/ `touches.ONE` set per press, before OrbitControls' own handlers; touch events can come before pointer events, so `touchstart`
decides again). The middle button slides (the wheel zooms), the right button turns, Space held frees the view (`paintHold`), and
a floating **✋ Move** button (bottom left of the view, Paint tab only) toggles the Turn view tool and back to what was in hand.
A second finger during a stroke cancels it (taken back when under half a second old or at most four dabs, `cancelStroke`), so a
pinch no longer leaves a dab. **Found while testing:** OrbitControls' damping glide went on during a stroke started straight
after a turn, so the model slid under the brush; `stopGlide` (damping off, `update()`, the camera put back, damping on) stops it
on a paint press. Test: `tools-paintmove-check.js` in real Chromium (part of `npm run check:browser`): mouse beside and on the
model, Space, middle and right buttons, the Move button, and touch through CDP (`Input.dispatchTouchEvent`): one finger beside /
on the model, and a second finger straight after the first. The paint test and the smoke test pass.

**The icon maker** (`ICONS` (54, drawn for Maker Forge on a 24-unit grid), `ICON_GROUPS`, `ICON_SHAPES`, `ICON_IDEAS`,
`newIconRecipe`, `cleanIcon`, `iconCanvas`, `iconSrc`, `iconSVG`, `iconPanel`, `iconGrid`, `addIconItem` in `src/app.html`). An Art
item with `icon` (a recipe: `badge {shape, slot, ring, ringSlot}`, `gap`, up to four `layers {icon, slot, size, x, y, rot}`, `label
{text, slot}`) is drawn from the recipe like text (no asset): `iconSrc` redraws it when the recipe or any filament colour changes
(`_iconSig`, a runtime key), called from `sourceCanvas` and the build loop, so the lid logo and decals follow. Shapes are paths
(M L H V C S Q Z), circles, arcs and rounded rectangles, each a 2-unit line, a fill or a hole (`destination-out`), drawn by
`iconPathOn` (no `Path2D`: the tests' canvas has none). Icons laid over others get a halo in the badge's colour (or cut through
when there is no badge). Colours are the filaments' own, so `buildCellMap` maps them exactly. Projects keep the recipe
(`sanitizeProject` → `cleanIcon`: shapes from the list, unknown icons dropped, four layers, numbers clamped, the word stripped of
`<>` and control characters, 16 letters); share links keep icon items (no picture to leave out).

**AI help** (`AI`, `aiAsk`, `aiSave`, `aiSettings` in Settings). Off by default. **Claude:** a plain `fetch` to the Messages API
with the person's key (`x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`),
`output_config: { effort:"low", format:{ type:"json_schema", schema } }`, `max_tokens` 8000, the model `claude-opus-5-5` by default
(changeable), and the server-side fallback for a declined answer (`fallbacks:"default"` with `anthropic-beta:
server-side-fallback-2026-07-01`) on the models that take it; `stop_reason: "refusal"`, 401 and 429 said plainly. No SDK: the app
is one file with no build step, and the SDK would be another library to load and to self-host on the website. **Ollama:**
`POST {address}/api/chat` with `format: schema`, `stream:false`, temperature 0. The key lives in memory, or in `localStorage`
(`makerforge.ai`) only with Remember ticked; never in a project, link or export (tested). What is sent: the words typed, the lists
of names, the filament colours. The AI never makes geometry: it returns names from the lists (enums in the schema), checked by
`aiCleanPlan` / `aiIconToRecipe` → `cleanIcon`.

**Describe your project** (`encDescribe`, `aiFromWords`, `aiCleanPlan`, `encApplyPlan`, `encPlaceOpening`, `encLogoSpot`,
`ENC_RECIPES`). Without AI the words are split into parts (commas, "and", "with", "plus"); each part's count ("two", "4 x"; 1 to 20,
so "18650" is no count), fan size ("60 mm") and words (sizes in mm removed, hyphens split, plurals matched, a size in mm counted as a
hint so "5 mm LED" is the 5 mm one) are scored against every board and opening name. The main controller is the first
Arduino/Pi/ESP/MCU board. Faces: screens in the lid (a wide window in a wall needs support; the lid prints face down), fans and
vents on a side, sockets and glands at the back, the rest on the front. `encApplyPlan`: boards → `encArrange(false)` (levels
placed just above the tallest part under them, the box tall enough), each face grown for its biggest opening, `encArrange(true)`,
then every opening placed by `encPlaceOpening` (its face, then the next faces; rows at mid height and up and down; along the face
from the middle; a cheap check of the flat area, the lip and the other openings), the real build checked, and the faces of
anything still left out grown by 12 mm (up to five rounds). An AI icon goes on the lid at `encLogoSpot` (the free spot nearest the
middle, smaller when it must be). `encArrange` now prefers squarer boxes (a 25% cost per unit of aspect over 1.3): the doc
screenshot came out 65 × 152 mm; it is 127 × 84 now. The five recipes: no warnings; support 0 to 100 mm² (what is left is under
snap-in parts and buttons, as in Session 47).

**Tests**: new `tools-iconai-test.js` (`npm run test:iconai`): all 54 icons draw, each only in its colour; an idea's colours; the
word; an icon on a plate from the Art tab button, an idea, the grid's search, its colour pieces, a filament's colour change; the
project and share link; a hostile icon; the icon inlaid into a box's lid; the words matched part by part; a box filled in clean;
all five recipes clean; words with no parts; an AI plan cleaned (unknown names, counts, levels, faces, notes) and applied with a
level and a lid icon; the requests to Claude and Ollama checked against a stand-in `fetch` (headers, schema, fallback, a refusal,
a wrong key); the key in no project, link or storage; the box's Plan it with AI, the Art tab's Design it with AI, and Settings,
with a stand-in AI (`MF.ai.state.hooks.ask`). The lid icon's orientation was checked against a lid opening in the printed lid.

**For the website**: `AI_FIGURE`, the runtime's address line and `<script id="prcore">` are unchanged. But the forge site's
security policy (`connect-src 'self'`) blocks the AI: it needs `https://api.anthropic.com` (Claude) and, for Ollama, the
person's own `http://localhost:11434` added to `connect-src`, or AI help works only in the downloaded file. That is the Website
session's call (the owner, Session 30); the app says so when the request is blocked.

**Not done, next**
- A local model in the browser (WebGPU) instead of Ollama: a few hundred MB, checked like the others; not started.
- Icons from an online library (Iconify's open sets) or SVG Repo: not added (licences vary, and the site's security policy).
- The icon on a box's walls (artwork on walls is still in the plan).
- **Still to check by hand**: a real Claude key and a real Ollama (only stand-ins here); an inlaid icon printed; painting on a
  real phone and tablet.

## Session 50: click to colour (v0.44.0)

Asked (the owner, Session 49): "fix the auto painter function from a pic, can we use the depth ai and maybe add another small
model and combine all of them ... can we build a special tool or are there solutions, I still want to paint the Cristiano Ronaldo
from imagine without much extra manual painting". The special tool first: a click on a part of the photo outlines it, and the
outline is painted onto the model. It fixes what the automatic colours got wrong in a click or two, and colours a model part by
part when the photo is hard.

**The model**: SlimSAM-77 (Apache 2.0; a Segment Anything slimmed to 77% fewer weights), Xenova's int8 ONNX at revision
`5850ab45…`: `vision_encoder_quantized.onnx` (8.9 MB: 1 × 3 × 1024 × 1024 in, `image_embeddings` and
`image_positional_embeddings` 1 × 256 × 64 × 64 out) and `prompt_encoder_mask_decoder_quantized.onnx` (4.9 MB: `input_points`
1 × 1 × n × 2 in the 1024 pixels, `input_labels` int64 1/0, the embeddings; `pred_masks` 1 × 1 × 3 × 256 × 256 logits over the
padded square and `iou_scores`). In `AI_FIGURE.sam` / `.samDecoder` (`models/` first, then Hugging Face at that revision, each
checked by SHA-256; the website's importer handles that form), `samMB` 14. Not in the repository (`.gitignore`), like the
depth model; the tests use copies in `models/` when they are there. **Not SegFormer** (NVIDIA's non-commercial licence, Session 49).

**Engine** (`src/core.js`): `samInput` (the longer side to 1024, bilinear, ImageNet normalised, zero padding),
`samPrompt` (clicks [x, y, on] in parts of the photo), `samMask` (the best-scored of the three masks, cropped to the photo's
part of the padded square, bilinear to any size, logit > 0, only the pieces a positive click is in), `maskRLE` / `maskFromRLE`
(runs in base 36), `photoMaskTris` (each triangle's middle through the photo's camera and fit: in the mask, and at the depth
of what is seen there, within 1.5% of the model's depth + 0.3 mm; with `through`, also at the depth of the farthest surface
there, the back of the same part as a camera behind would see it, not what lies between). **Found while testing:** a face seen
edge on (the base's top under the boots) is nearer than the recorded depth and its middles fall on the next pixel row; the
check is now |depth − z| ≤ tol, not depth − z ≤ tol (boots 55% → 91% right). "Right through" first took every triangle behind
the outline (the insides of the arms: 69% shirt); front and back only: 94%.

**App** (`samLoad`, `samEmbed` (the last three photos kept), `samSelect`, `photoViewOf`, `photoAreaTris`): a paint step
`{ k:"photoarea", asset, w, h, rle, slot, through }`: the mask in the photo's own coordinates (its longer side `SAM_MASK`, 360),
applied through the photo's current fit and camera (and its bend, `photoBendApply` on the mask), cached per paint part. So it
opens offline, follows the photo when it is lined up again, and paints nothing (its text says "its photo is gone") when the photo
is removed. `cleanPaint`: the asset an id, sizes 8 to 1024, runs only `[0-9a-z.]` up to 300 000 characters. The photo card: a
fourth tool **✨ Click to colour** (`photoClick`, `photoClickAdd`, `drawPhotoClicks`, `photoClickPanel`): click adds, Alt-click,
the right button or **Click leaves out** take away (up to 12 clicks), the outline in pink with the clicks as dots, **Paint it in**
(filament chips), **Right through**, **Paint it**, **Undo the last click**, **Start again**.

**Measured** on the photo test's footballer (`npm run test:clickcolour`, the real model in Node): one click on the shirt: 81% of
the true shirt outlined, 99.9% of what it paints right; the base 97% / 99.7%; the hair 86% / 97.7%; two clicks on the boots
95% / 90.8%. Reading the photo 11–12 s in Node (single thread), 15 s in Chromium with the download; a click 0.15–0.4 s.
In the app: one click on the shirt painted 18 077 triangles, 97.8% shirt, none at the back; right through 91.7% shirt with its
back. `tools-clickcolour-check.js` (Chromium, part of `check:browser`): the files fetched and checked, two mouse clicks, 6.1%
of the photo outlined at 96%, Paint it, no page errors.

**Not done, next** (still the 0.44 plan): (1) the depth model to line up each part (an arm in front of the body) and find the
camera better; (2) automatic regions: a grid of clicks over the figure with the same model, so each region takes one colour
(a shaded shirt stays the shirt's): measure it on a real photo first (the test figure's flat colours already score 98.5% on
the product photo, Session 35); MediaPipe's multiclass segmenter (Apache 2.0, TFLite) is the other way; (3) click to colour on
the 3D view itself (Segment Anything on the rendered view), for a model with no photo; (4) sharp edges for clicked outlines
(they paint whole triangles, like a box or lasso). **Still to check by hand**: the owner's CR7 figure and picture (not in the
repository); a phone (the encoder's few seconds).

## Session 51: project boxes, floors, rooms, batteries and cables (v0.45.0)

Asked (the owner): "the ability to add mounting spaces to second and third floors, better dividing sections and tools, mounting
for many different size batteries lipo the wide ones. And a cable management system between the floors and just extra extra work
on the project boxes".

**Batteries** (`BOARDS`, group "battery": 38 now, each with `tall`, its thickness): LiPo pouches by code (302030 to 1260100), RC
packs (2S 1300 to 4S 5000), 18650 x1–x4, 21700 x1–x2, 26650, AA x1–x6, AAA x2–x4, C, D, 23A, CR2032/CR2450 holders, 12 V
lead-acid 1.2 and 7 Ah. `encBoardList`: a battery's `hold` is "strap" unless "edges" (the panel's **Corner cradle**; stored as the
existing `hold` values, so projects stay valid), `sh` 0 (it lies on the floor). `encStrapTray` (`ENC_TRAY`): L-shaped fences at the
corners (`fh` 40% of its thickness, 4–12 mm) and slots 2.6 × 22 mm (a 20 mm strap; shorter, for zip ties, on a small battery; two
straps on one over 90 mm) either side across the short side, through the floor (`holesOn.bottom`, worked out in the early board
pass) or through its level's plate (`levelSlots`).

**Floors** (`encLevels`): `pass` (back, front, left, right, corners, none; `cable:false` from before is "none") and `passSize`, a
mounting grid `grid` (0, 10, 15, 20 mm: 3.2 mm holes, skipping the plate's edge, posts, passes, air slots, strap slots, the mounts
of boards on it, corner notches, the anchors and the channel notches), `anchors` (0–8 zip-tie anchors along its back edge, decided
before the grid). The main board's floor `E.boardLvl` (the panel's **On**); `encArrange` packs the main board on its floor.
Mounts on a level are trimmed to the plate (`encClip`, `plateB`): **found while testing** (a support check over 120 boxes), a board
arranged 1 mm from a wall on a level had its cradle fence 1.5 mm over the plate's edge (it was so before this release too; on the
floor the wall takes the fence). Anchors stood over a channel notch: they keep clear of notches now.

**Cable channels** (`ENC_DUCT`, `encDucts`, `E.ducts`: up to four, `{face, at}`): two 1.6 mm sides 9 mm deep, 10 mm apart, with
3 mm lips (a 4 mm opening), from the floor to under the lid, printed with the box (upright: no support). The level outlines are
notched round them (`encNotch`: a step into the straight edge on that side; a channel on a corner is left out and said so).
Warnings: a board on a channel, an opening behind one. `encArrange` counts a wall with a channel as 10 mm thicker.

**Rooms** (`encDividers`, `encPlateOutline`): `notch` (small, large, ends, none; `cable:false` from before is "none"); where an
across and a front-to-back divider cross, the across one has a slot from the top and the other from the bottom, each half the
lower one's height (a half-lap), the floor rails broken there, a cable notch over the joint dropped. **Make rooms in one go**: two
(front and back, side by side), three in a row (a third each), four in a cross.

**Also**: `encArrange` with a sliding lid now keeps the main board's ports under the front wall, which ends under the lid
(`underLid`); the random-set test found it once the battery list grew (a Pi Zero's mini-HDMI left out).

**Tests**: new `tools-floors-test.js` (in `test:enclosure`): every battery in a tray and in a cradle, closed, no warnings; a
LiPo's tray measured (on the floor, fences, slots through the floor); an RC pack on a level; the main board on a level with Arrange in
this box; mounting holes every 10 and 20 mm and none under a board's mounts; every cable pass and size; anchors on a level; two
channels measured (sides, lips, opening) and the levels notched; a channel in a corner, an opening behind one; crossing dividers
(each loses half the joint), notches, nine rooms, the presets on the panel; a hostile project. A support sweep over 96 boxes (main
boards and batteries on levels, grids, anchors, channels, passes): none needs support. The doc picture: `docs/images/floors.jpg`.

**Not done, next**: dividers standing on a level; **Arrange** inside rooms (it warns when a divider crosses a board); a battery
compartment with a door; a custom battery size; strap loops instead of floor slots (a 22 mm bridge needs a gable).
**Still to check by hand**: a printed strap tray with a real LiPo and strap; the half-lap fit (0.4 mm gap).

## Session 52: project boxes, screw mounts you can move and neater holders (v0.46.0)

Asked (the owner): "The ability to change the position of the screw mounts to take advantage of as much space as possible on
the bottom floor", and "The mounting slots some boards and batteries looks a little strange? The four square corners". Also
asked, for the releases after this one: all the other box improvements "and even 20 more", and "make it easy to add art and
icons and engravings" (next: 0.47).

**Holders** (`encRim`, `ENC_RIM`): a cradle (`encCradle`) and a strap tray (`encStrapTray`) are one rim now, built from convex
pieces (an outer strip to the corners, an inner strip stopping `relief` (0.8 mm) short of the part's corners, a quarter disc for
each rounded outer corner), so each is trimmed to a level's plate as before (`encClip`). Gaps: a finger gap (`encFingerGap`,
8–20 mm) in the middle of a cradle's long sides; a tray's gaps are where each strap passes (the slots are just outside them).
The cradle's seats are L-shaped (2.5 mm under the board's edge, `ENC_CRADLE.seat`) and reach the rim.

**Short lid posts** (`E.postStyle` "full"/"hang", the Lid page, `encPostStyleField`): `postLen` (screw insert depth + 5 or the
magnet pocket + 5, at least 10) at the top, over a cone (`encLoft`, 0.4 mm to the post's radius over `bossR - 0.4`: 45°). The
floor is free up to `postFree`; full posts when the box is too shallow (a warning). Without hanging posts nothing changes. Floor
openings may go under them; a level notches round them only when it reaches up into them (`notchOf`); the board warning "sits
on a screw post" only when the board's parts reach `postFree`; `encArrange` drops the 9 mm corner margin.

**Levels** (`L.hold` "posts"/"brackets"/"custom"/"ledges", `L.at` up to six `{x, y}`; the panel's **It is held by**):
`postPlan` (worked out before the plates) gives each level's screw positions. Corner posts: level k's at `lvW/2 - 7 - 9k`, so
a level above stands its posts on the level under it, printed on that plate (`levelSolids[k-1]`, added while that plate is
made), clear of its screws. **Found while planning it** (a bug since Session 46): every level's posts stood on the floor at the
same spots, so level 2's ran through level 1's plate. Brackets (`BRK`): a D-shaped boss on each side wall (7 mm, M3 hole) over a
45° wedge (`encLoft` from the D squeezed to the wall, 8.5 mm), at the corner posts' front/back positions; a level too low for
them (15.5 mm above the one under it) stands on corner posts, with a warning. Custom posts: where they are put (clamped 4 mm in).
Warnings: a board under a post (on the floor or level it stands on), a post on a screw of the level under it, a board under a
bracket (by its parts' height), a bracket on a cable channel. Also new: a board on the floor under a level's post was never
checked before. `encArrange` (`bands(k)`): the posts a level stands on in the corners, and wall brackets, widen the band along
the side walls (`cX`) and the clearance from the front and back in it (`cY`) for that floor; `corner` was one number before.
`enclosureInfo.levels[k]` has `hold` (what it got), `posts`, `onPosts`; `enclosureInfo.lidPosts` `{n, hang, free, r}`.

**Tests**: new `tools-mounts-test.js` (in `test:enclosure`): the rim all round with finger gaps, the corner pockets, the seats;
a tray's strap gaps; short posts (nothing under them, too shallow, a board under one); brackets (the floor free, the boss, the
plate's holes, too low); posts where you put them; two levels on posts (9 mm from the screws under them, nothing through level
1); support for all of them (none); a board under a post and wall brackets instead; Arrange with brackets and 18 random sets
with a level on corner posts; a hostile project; the panel. The doc picture: `docs/images/mounts.jpg`, rendered alone in a
plain scene (`tools-partshot.js`, the parts by name).

**Not done, next**: posts dragged in the 3D view (they are typed in); Arrange placing boards round posts where you put them (it
warns); brackets on the front and back walls. Next release (0.47): art, icons, engravings and labels on any face of the box.
**Still to check by hand**: a printed wall bracket and short post with a screw in; a board dropped into the new rim.

## Session 53: project boxes, art, words and icons on any face (v0.47.0)

Asked (the owner): "make it easy to add art and icons and engravings" (with the box list in Session 52).

**Art** (`E.art`, up to `ENC_ART.max` 10, each cleaned by `encArtClean` in the build and in `sanitizeProject`): `{face, kind
(text/icon/picture), text, font, icon, size, x, y, rot, finish (engrave/inlay/raised), slot, depth}`. `encArtShape`: words are
drawn by `textCanvas` (the font loaded first: `document.fonts.check`, then a rebuild once `load` finishes), an icon by
`drawIcon` on a 480 px square, both traced from their ink (`encInkMask`, `maskToPolys` with `keep`); words are scaled so their
letters are `size` tall, an icon so its 24-unit square is (a flat icon stays flat: **found while testing**, "minus" was 140 mm
wide the first way). Shapes are cached by kind/text/font/icon/size without the filament (**found while testing**: a copy in
another filament came out in the first one's). The picture goes through `encLogo` (a stand-in `E.logo`), so it splits into the
filaments like the lid logo. Placing (in `buildEnclosure`, after the labels and before the split plan): a wall's piece is
centred `y` above the wall's middle, the lid's and the floor's at (x, y) on the plan (the floor reads with the box turned over:
`encArtPlace` mirrors it); each must fit its face (1 mm in on walls, 1.5 mm and the corners' rounding on the lid and floor) and
keep 0.6 mm from `taken` (openings, labels, screw heads), or it is left out with a warning. **Raised** is for walls only (the
lid and the floor print face down: it becomes inlaid there). Cutting: a wall's outside is now made in slabs for any number of
cut depths (labels and art), like the lid's; inlaid art is a part per filament ("Front art (Red)") filling its pocket; raised
art in the box's filament is part of the box, in another a part of its own. Lid art goes into both lids' cuts (the screwed lid
mirrored, `flipY`, as it prints face down; the sliding lid at its top). A box made in parts takes art on the lid only (a
warning). `enclosureInfo.art`. **Label every opening** (`encAutoLabel`): a short name from the opening's kind for ports,
buttons and lights; it only fills openings without a label.

**Tests**: new `tools-boxart-test.js` (in `test:enclosure`): words on all six faces in all three finishes (the volume each takes
or adds, the inlay filling its pocket), raised in the box's filament, the lid's and floor's art in the first layers, the lid's
read from above, all 54 icons, left out over an opening or past the edge, turned words, no lid, the sliding lid, support (none),
the Art tab picture inlaid and engraved, Label every opening, the panel, a hostile project. The doc picture:
`docs/images/box-art.jpg`, rendered with the lid turned over onto the box (`tools-partshot.js`, `ASSEMBLE=1 SLOTCOL=1`).

**Not done, next**: dragging art in the 3D view (it is typed in); art wrapping round a rounded corner; art on a box made in
parts; a picture inlaid in the lid and on a wall at once recomputes the trace each build (`encLogoCache` holds one size).
**Still to check by hand**: raised and inlaid words on a printed wall (text 5 mm and under); fonts in a slicer preview.

## Session 54: project boxes, a parts list, a floor grid, names and printed extras (v0.48.0)

Asked (the owner, Session 52's list): "Do all the other improvements and even 20 more. Really flush out the whole project box
system".

**What you'll need** (`enclosureInfo.need`, `[count, what]`, the panel's group of that name with **Copy the list**): lid screws
(length: the lid plus the insert depth less 1, rounded up to 6/8/10/12/16/20/25/30) and inserts, or magnets (two per post);
board screws (6 mm) per screw size and inserts; level screws (each level's posts or brackets, not ledges); straps and zip ties
(from `encStrapTray` per battery); feet; DIN clip screws; fans in openings and dividers; tie-mount screws; joins of a box in
parts; the boards themselves. Opening parts (switches, sockets) aren't counted.
**Finger pull** (`E.pull`, the Lid page; not for a sliding lid or none): a notch 18 × 3.5 mm in the top of the front wall
(`notchesOn.front`, so the lid's lip leaves a gap over it), left out with a warning over an opening.
**Board names** (`E.partNames`, shown only with a board on the floor): `encLabelText` of the label up to its first bracket,
comma or colon (the first word when it is wider than the board + 12 mm), 3.2 mm stroke text in front of the board (behind it
when there's no room), clear of other boards (+2.5), `taken.bottom` and each other; cut 0.4 mm into the floor's top (a slab
from `fl - 0.4` with them as holes). **Found while testing**: each name was blocked by its own board's margin.
**Floor grid** (`E.floorGrid` 0/10/15/20): through holes 3.2 mm (`holesOn.bottom`, `taken.bottom`) kept 6 mm from the walls, and
clear of `taken.bottom`, floor boards (+4), names, full-height lid posts, the first level's corner posts (worked out as
`postPlan` does) or posts where they are put, channels, dividers' lines and floor anchors' bands.
**Extras** (in front of the box, packed like the levels): `E.ductCover` (a 13.2 mm strip, 1.2 thick, the channel's height, with
a tongue 0.2 mm wider than the 4 mm gap between the lips), `E.spacers` (0–16, `spacerH`, `spacerScrew`: tubes the clearance hole
+ 3.2 mm across), `E.tieMounts` (0–16: a 12 × 18 × 1.6 base with an M3 hole, a 3.5 mm bridge for a tie).
**Snap catches** (`E.snap`, a press-fit lid only; `SN`): two 45° ridges (10 mm long, 0.5 mm out, 1.6 mm tall) on the outside of
the lip's front and back at `xs` (half the inner width from the middle, at least 12 mm from the ends and clear of a finger pull),
at the lip's middle height; grooves 12 × 2.4 mm, 0.7 mm deep, cut into the inside of the front and back walls (a slab from local
y 0, in the walls' slab system) at the same places, `zc = H - lipH/2`. Not with a lip under 3 mm or walls under 1.6 mm (a
warning). `enclosureInfo.snap`.
**Your own battery** (`BOARDS.batcustom`; `E.batW/batD/batT` for the main one, `bw/bd/bt` on an extra one, kept only on that kind).
**Airflow hint**: a converter, supply, Pi, amplifier or motor driver in a box with no air opening (group "air", or a fan, vent,
grille) and no divider fan. It is `enclosureInfo.air`, shown under Board mounts with a 🌡, not in `hints` (those are things to fix:
**found while testing**, the arrange test expects none for a good layout).

**Tests**: new `tools-boxextras-test.js` (in `test:enclosure`). The doc picture: `docs/images/box-extras.jpg`.

**Not done, next** (the rest of Session 52's list): a snap-fit and a hinged lid; a gasket groove; a battery compartment with a
door; Arrange inside rooms and dividers on levels; dragging art and posts in the 3D view.
**Still to check by hand**: a channel cover's press fit; a zip-tie mount's bridge; names 3.2 mm tall on a real floor.

## Session 55: project boxes, Arrange inside rooms and dividers on a level (v0.49.0)

Asked (the owner): "Keep going" (the rest of Session 52's box list).

**Rooms in `encArrange`**: the dividers standing on a floor (`divsOn(k)`) cut it into rooms (`roomsOf`: the lines across and
front to back, each taking `DB` (half the divider, its gap and a rib, + 0.6) either side, inside the cable channels' margins).
`packRooms`: the main board in the room touching most of the walls its ports face (then the biggest), the rest largest first
into the room with the most free area where `packFloor` still fits them; a board against the back goes against its room's back
(`backY`). A room keeps clear of the corner posts only at the box's corners it touches: `packFloor` takes the front and back
margins apart now (`cY`, `cB`). **Found while testing**: with both, four rooms in a cross wasted 9 mm in every room and a Uno
didn't fit a 95 × 70 mm room. In this box the rooms are where the dividers are; in the smallest box the dividers keep their
place in proportion (`lineAt`), each width tries depths from the area's lower bound up in 2 mm steps (widths in 4 mm steps
with dividers), and the dividers are moved with the box when it is applied. `{ rooms }` in the result, named in the message.
**Fixed**: Arrange ignored dividers (a divider across a board was only warned about afterwards).
**Dividers on a level** (`w.lvl`, `encDividers` clamps it to the levels there are; the panel's **Stands on**; kept in a project
only when above the floor): two ribs 3 mm tall (`DIVR`) printed on the level's plate along its line (`divRibRects`, broken where
another on that level crosses), worked out before the plates are made; no wall ribs (a plate going in would catch on them);
the plate stops 2 mm short of each side (`ENC_LEVEL.gap`); its room is from the level's top to the next level or the lid
(`divBase`, `divRoof`); under 8 mm it is left out with a warning. Crossings only between dividers on the same floor. The level's
mounting holes keep 5 mm from them; the floor grid only minds the floor's dividers. `dividerInfo` has `lvl` and `base`.

**Tests**: new `tools-rooms-test.js` (in `test:enclosure`): two rooms in the box, three in a row in the smallest box (the
dividers moved in proportion), four in a cross, a Pi with its ports in two rooms, 24 random sets with one or two dividers; a
divider on a level (its ribs on the level, nothing on the box, its height), two crossing on a level and one on the floor, a
level with no room, a board across one, support, a hostile project, the panel. The doc picture: `docs/images/rooms.jpg`.

**Not done, next**: a hinged lid, a gasket groove, a battery compartment with a door; rooms of their own sizes in the smallest
box (they keep their proportions); dragging art and posts in the 3D view.

## Session 56: project boxes, a hinged lid (v0.50.0)

Asked (the owner): "Keep going".

**The hinge** (`E.hinge`, a press-fit lid only; `HG`): `HG.n` (5) knuckles along `Lh` (the back less its rounded corners and 3 mm
each end), 0.5 mm apart, the box's at the ends and the middle. The axis is `HG.r` (3.5) + `HG.clear` (0.3) behind the back and
`lidT - r` above the top: then the lid's knuckles (the lid's frame: y = -D/2 its back, z = 0 its outside on the bed) are the
knuckle's circle hulled with its foot on the bed, joined to the lid's edge by a strip above the box's top; the box's are the
circle hulled with a point on the wall 2.6 r under the axis (its underside 42° from upright), and a strip into the wall under
the top. Both are extruded across with `Mx` (the snap bumps' frame). The pin holes (2 mm, for 1.75 mm filament) are teardrops
pointing up as each part prints. The top of the back (from 2.6 r under the axis) is in `taken.back`: a back opening there is left
out, a mount on the back that wants it means no hinge (a warning), as does a back under 30 mm or a box under 3 r + 6 mm deep.
Opening the lid moves everything under the axis away from the back wall, so the lip needs no gap. What you'll need lists the
pin; `enclosureInfo.hinge` `{length, knuckles}`.

**Tests**: new `tools-hinge-test.js` (in `test:enclosure`): five knuckles and their volume, the box's pin hole on the axis, the
pin in What you'll need, support (none), what stops it, a hostile project, the panel. The doc picture: `docs/images/hinge.jpg`
(the lid turned onto the box, `tools-partshot.js` `ASSEMBLE=1`).

**Not done, next**: a gasket groove; a battery compartment with a door; rooms of their own sizes in the smallest box; dragging art
and posts in the 3D view. **Still to check by hand**: the hinge printed and turning (the 0.3 mm clearance, the pin's fit).

## Session 57: project boxes, a gasket groove and a battery door (v0.51.0)

Asked (the owner): "a hinged lid, a gasket groove, a battery compartment with a door, Arrange working inside rooms, dividers on
levels, and dragging posts or art in the 3D view" (the first, fourth and fifth are 0.49 and 0.50).

**Gasket groove** (`E.gasket` 0/1.5/2/2.5/3, screwed or magnet lids; `encGasketField` on the Lid page): `gw = cord + 0.3` wide,
`gd = 0.7 cord` deep, centred on the walls' middle line (a rounded rectangle, `R - t/2` at the corners), cut from the lid's inside
face: in the lid's slab system a slab from `lidT - gd` up is the lid's outline with the groove's outside as a hole, plus an island
(the groove's inside) carrying the lid's own holes (openings, screw holes). Not with walls under `gw + 1.2`, a lid under `gd +
0.8`, a press-fit or sliding lid, or where it would meet a screw or magnet hole (`toLine`, 0.4 mm). Its length (the middle
line) goes in What you'll need (+10 mm); `enclosureInfo.gasket`.
**Battery door** (`hold` "door" for a battery, main or extra; `ENC_DOOR`): the early board pass makes an opening (the battery +
0.6 mm), a recess from below round it (`dt = fl - 0.8`, 0.8 to 1.6 mm; 3.5 mm past the opening along the sides, 9.5 at the ends,
the ends being across the short side), M2 pilot holes through the floor at the posts, `taken.bottom`; the boards pass puts the
battery on the door (`base = dt`), a rim round it (`encRim`, up to 16 mm), two posts (r 3, 6 mm, M2 pilot) 5.5 mm past its ends,
and the door (0.25 mm smaller than the recess, `dt - 0.1` thick, M2 clearance holes) printed flat in front of the box after the
extras. It falls back to a strap tray, with a warning, on a level, with a floor under 1.6 mm, or where the door would reach the
walls or something else on the floor. Two M2 screws per door in What you'll need.

**Tests**: new `tools-sealdoor-test.js` (in `test:enclosure`): the groove's size and the volume it takes, the cord's length, a
magnet lid, what stops it, support; the door: the battery's height, the opening, recess, ledge and posts, the door's size and
thickness, its screws, when it falls back, support; a hostile project; the panel. Pictures: `docs/images/gasket.jpg`,
`docs/images/battery-door.jpg`.

**Not done, next**: dragging posts and art in the 3D view (0.52); a hint when a board stands over a battery door's recess (its
ledge is 0.8 mm); a door that clips instead of screws. **Still to check by hand**: a cord in the groove, squeezed; the door's fit.

## Session 58: project boxes, dragging things in the 3D view (v0.52.0)

Asked (the owner, with Session 57's list): "dragging posts or art in the 3D view".

**How it works** (`viewOpts.boxMove`, not saved; the switch `encMoveField` is on Board mounts, the Art page and a level with
posts where you put them): a `pointerdown` listener in the capture phase (before OrbitControls) takes the pointer's ray into the
Box mesh's own frame (`boxLocalRay`: the mesh's world matrix inverted, so the view's scale, turn and bed offset don't matter) and
`boxDragPick` finds the nearest of: art on a wall (the ray against that wall's outside plane, only from outside, within the
piece's size + 1 mm; `BOX_FACE` gives each wall's normal and its `u` along it), a post you put (an upright box round it from the
floor or level under it to its level), a board (a box from its base to its parts' top). It keeps where on it you took it
(`grab`); `boxDragTo` intersects the ray with the same plane (the wall, or the level at the post's middle or the board's base) and
sets the settings the panel's numbers set (art `x`/`y`, `E.boardX`/`boardY`, an extra board's `x`/`y`, `L.at[i]`), rounded to
0.5 mm and clamped; the box is rebuilt every 120 ms while dragging and once at the end (then Undo, the panel). OrbitControls is
off during a drag; a press on nothing leaves it to turn the view. The click that places Art tab artwork is skipped while the
switch is on. To find the settings: `enclosureInfo.boards[i].src` (an extra board's own object), `levels[k].src` (the level's
object; `encLevels` keeps it), `wallH` per wall. Test hooks: `MakerForge.boxDrag` {pick, start, to, end}.

**Tests**: new `tools-boxdrag-test.js` (in `test:enclosure`): the main board on the floor and an extra on a level, words on the
front, an icon on the back and the right side, nothing picked from inside a wall or on a miss, a post you put, words before a
board behind them, the switch. In real Chromium (`tools-boxdrag-check.js`, real mouse events): the switch clicked, the Uno dragged
80 px on screen moved 77 px with the camera still, a drag on empty space still turned the view, no page errors. Not in
`check:browser` yet.

**Not done, next**: dragging openings on the walls; dragging art on the lid and floor (they face the bed in the print layout);
a highlight on what is under the pointer. **Still to check by hand**: dragging on a touch screen.

## Session 59: project boxes, boards held without glue or screws (v0.53.0)

Asked (the owner, with a picture of the cradles): "The mounting spaces for the different objects still seems a little meh, is
it a tight fit or will there be need to glue? Is there another way or maybe other options to add as well". It was a loose fit
(the rim 0.3 mm clear, nothing over the board): glue was needed.

**Grips** (`encGrip`, `ENC_GRIP`; `grip` per board: `E.boardGrip`, an extra's `grip`, kept in a project only when not the
default; `encGripField` on the panel): "ribs" (the default, so every cradle in an older project gets them too) — triangular
ribs 1.2 mm wide on the rim's inside reaching 0.15 mm into the board's edge, from its seat to the rim's top, the top 1 mm a loft
back to the rim (a lead-in): two on each long side at a third of its length (clear of the finger gap), one in the middle of
each short side; only where the rim is (a level's plate trims it). "clips" — the long sides' middle gap at least 22 mm, a beam
7 × 1 mm standing free in it from the floor to just over the board, its hook a loft from 0.6 mm over the board (flat
underneath, 0.1 mm over the board's top) to the beam at 1.6 mm up; ribs on the short sides. "loose" — the rim alone.
**Snap pins** (`pins`: `E.boardPins`, an extra's `pins`; `encSnapPin`): the standoff solid, a pin of two half-discs 0.8 mm apart,
the screw's clearance less 0.3 across, 1.8 mm tall, then a 1.2 mm barb loft from 0.3 mm wider to 0.5 mm narrower; the parts list
drops that board's screws. `enclosureInfo.boards[i].grip` says which ("ribs"/"clips"/"loose"/"screws"/"pins"/"strap"/"door").

**Tests**: new `tools-grip-test.js` (in `test:enclosure`): ribs into the board's edge, clips (the beam, the hook over the board,
the board's space clear), support; snap pins (solid standoff, the slot, the barb), the parts list; a hostile project; the panel.
Picture: `docs/images/grips.jpg`. **Still to check by hand**: the ribs' 0.15 mm press with real boards (makers' sizes vary: a
loose one wants glue, a tight one a file); the clips' spring in PLA and PETG; the snap pins in a Pi's 2.75 mm holes.

## Session 60: a stale note fixed (v0.53.1)

Found while taking screenshots for the owner: the Board mounts note for a board in a cradle still described the old loose fit
("a dab of hot glue keeps it") under the 0.53 grip choices. It says now that it sits in a rim with a seat under each corner, held
as chosen above; a board on snap pins says "solid standoffs, each with a snap pin". Text only. Tested: `tools-grip-test.js`,
the project box's audit, the box's smoke test.

## Session 61: project boxes, room for what you add (v0.54.0)

The owner: "look at the generator itself and come up with 20 improvements, ease of use, common sense ideas, something like
adding another component won't mess up the outer box size completely and many more, find 10 bugs too". The three items planned
for 0.54 (below) moved to 0.55.

**Bugs found** (each reproduced in jsdom first, all fixed; `tools-boxroom-test.js` checks them):
1. Adding a module could more than double the box: `encFreeBoardSpot` put it in a row along the width without looking at the
   box, and `encBoardChanged` grew the box round its middle (`2*|x|`), so a relay beside a Uno made a 100 mm box 218 mm wide.
2. The new module could land on a corner screw post (the old spot finder ignored posts, dividers, channels and levels' posts).
3. A third level in a shallow box was listed on the Inside page but dropped by `encLevels` (closer than 4 mm) without a word.
4. Levels typed out of height order: `encLevels` sorts them for the build, so "Level 1" on the panel and a board's "On: Level 1"
   were different shelves.
5. Removing a level renumbered the extra boards but not the main board (`boardLvl`) or the dividers (`walls[].lvl`).
6. Two dividers added in a row both went to `axis:"x", at:0`.
7. Arrange threw away the labels on the main board's port openings (it removed every `auto:"ports"` opening and made new ones).
8. Add this board's ports after the board moved left the old openings behind (4 holes for 2 ports); picking another board, or
   none, kept the old board's port holes.
9. A duplicated port opening kept `auto:"ports"`, so the next Arrange deleted it.
10. A new opening on a full wall: `freeSpot` gave a place off the face, `encGrowToFit` pushed it back onto another opening, and it
   was left out instead of the box growing.
11. Position limits: the main board ±120 mm, modules ±150 (fields and dragging) in boxes up to 300 mm.
12. A box made smaller than its board had no fix but typing the size back (the "Make it fit" button was for openings only).

**Improvements** (20): one-sided growth by just enough, everything else kept against the old walls (`encGrowSides` /
`encShiftAll`: parts, posts put by hand, dividers, channels and openings move; art and the lid logo stay on their faces' middles);
a new part where there is room (`encPlace`: a 1 mm scan of each floor against `encBusy`, both turns, floors in order, then the
side giving the smallest, squarest box, found by a binary search on the growth); the size switch at the top (`E.grow`, which was a
tick box on the Openings page); inside sizes (`viewOpts.encInside`, a panel setting, not saved in the project); Shrink to fit
(`encShrinkWrap`: centre the parts and their openings, then a binary search on width, depth and height while no new warning
title appears); the box's problems at the top with Make it all fit (`encFixAll`, also with the size kept); the parts overview
with floor use; each part's own problems (`info.issues`, filled wherever a warning names a board); Duplicate and Centre it for
modules, Centre and Remove this board for the main one; port openings that follow the main board (`encPortsFollow`, each
opening now has `board` and `port`; older ones are matched by kind in order) on a move, turn, drag, Arrange or a new standoff
height, keeping labels; another board picked swaps its ports (`encMainPicked`, which also finds the new board a place when the
old spot does not suit it); a turned part slides back inside (`encKeepInside`); a full wall grows (`encRoomOnFace` /
`encFreeU`, from the faces' lengths now in `enclosureInfo.faceU`); levels kept in height order with their parts
(`encSortLevels`, remapping `boardLvl`, `more[].lvl`, `walls[].lvl`) and removed with them (`encRemoveLevel`); a new level over
the tallest parts under it, the box taller if it must be (`encNewLevel`); a new divider splitting the biggest room
(`encNewDivider`); a board dragged past a wall gets room like one typed there.

`enclosureInfo` gained `lidPosts.at` (the posts in plan), `ceil`, `ri`, `lipH`, `wall`, `faceU`, `ductRects`, and per board `issues`,
`m` (its margin from the walls) and `room` (the height over its floor). A height the parts need is now grown for too (parts
reaching the lid on the top floor), as the warning always asked.

Tested: `tools-boxroom-test.js` (34 checks: every bug above, every improvement, a hostile file), the whole `test:enclosure`
suite, the project box's audit and smoke test, `npm run test:project`, `ONLY=enclosure npm run check:browser`. Not done: the 3D
drag's growth is only tested through the same function as the number fields (`encBoardChanged`), not with the real mouse
(`tools-boxdrag-check.js` drags but does not cross a wall). Shrink to fit takes about 25 builds (a second or two on a big box).

## Session 62: project boxes, seeing the parts (still v0.54.0, the same pull request)

The owner, after Session 61 (its pull request not merged yet, so this joins 0.54.0): "Fix any bugs, make it easier to use add
more features and maybe an easy way to view components. Just go crazy and make it the best project box generator ever".

**A bug hunt that clicks at random**, `tools-boxfuzz.js` (new; `SEED`, `RUNS`, `STEPS`; not in `test:enclosure`, it is slow): each
run opens a quick start and does random things through the panel (about 30 actions), checking after each step for page errors,
open meshes, sizes out of range, and that adding a part never puts it on something, Shrink to fit makes no new warning, Make it all
fit leaves no board out and adding an opening leaves none out. It found, all fixed (checked in `tools-boxview-test.js`):
1. When the box grew for a part, `encPlace` looked for room with the corner posts, a level's posts and brackets, cable channels
   and rounded corners where they had been, not moved out with the walls: a part could land on a post (`encBusy(…, g)` now moves
   what stands against a wall with it, `atWall`).
2. A board sticking out of the box (`fits:false`) was not an obstacle, so a new part went on top of it once the box grew.
3. With dividers making every room too small one way and too short the other, no single-side growth helped and the part was
   dropped in the middle (over others), its "no room" note then overwritten: a second search grows two sides at a corner, and
   `encAddPart` notifies last.
4. Corner posts, or a level's posts (`xi > 8`), that only fit the bigger box appeared under the part it grew for: `encAddPart`
   builds once the part is in and looks again (up to three times) when it is on something.
5. A copied opening is put in first, so it could push the openings after it out (`encRoomOnFace` only checked whether the new one
   was left out): the build now records `clashes` (who pushed whom), and the new one moves.
6. An opening that could not fit even in a bigger box (a 155 mm screen past a notch) grew the box wider and taller for nothing:
   `encOpeningChanged` puts the box back and says so. `freeSpot` no longer offers a place off the end of the face.
7. A full wall grew round its middle, splitting the new room between both ends: it grows on one side now (`encGrowSides`).
8. On the lid and the floor a new opening only looked sideways for room (`encFreeU` searches both ways there; on a wall at its
   height first, then higher or lower, then a taller box). An opening that only just fits fell between the 0.5 mm steps: the
   ranges' ends are tried too.
9. A taller box lets a level pressed down by the lid rise, and its parts with it: `encMakeRoom` repeats until it settles.

**Seeing the parts:**
- **Plan of the inside** (`encPlanSVG`, `encPlanPage`, `openPlanBig`): an SVG of each floor from the last build, in mm (back at the
  top), with every part (name, screw holes, the main board's ports), lid posts, a level's posts or brackets, dividers, channels,
  wall openings as marks, floor openings dashed, parts on other floors dashed. `encSel` is the picked part ({ main } or { m }):
  its settings under the plan; drag (0.5 mm), arrow keys (Shift 5), R, D, Delete, Escape; ⤢ a bigger copy in the modal. The
  panel re-renders after a build when `encPanelSig` (warnings, parts, their places, the inside) changes.
- **The catalogue** (`openPartsBrowser`, `boardDrawing`, `openingDrawing`): boards at one scale (170 × 100 mm view) with holes,
  ports and a 10 mm bar; openings as `openingRings` paths. Add to the box (`encAddPart`), As the main board (`encMainPicked`).
- **Names in 3D** (`encNameSprite`, `viewOpts.boxNames`, on by default) and the picked part amber; ghosts carry `who`.
- **How to put it together** (`encAssembly`), on its page and as `how-to-assemble.txt` (with What you'll need) in the download;
  the openings' parts in What you'll need (not a board's own ports), and Copy for a spreadsheet (CSV).
- **The 0.55 plan, done:** strap loops (`strapBy`/`boardStrapBy` "loops", `ENC_TRAY.loop`; a C-shaped gable profile run along the
  strap, turned with a proper rotation), level brackets on the front and back walls (`bracketWalls` "frontback", worked out across
  and along the wall they are on), and Arrange moving a post you put that a board now covers (nearest free place, clear of boards
  by 4 mm, other posts by 10, the plate's edge by 4).

Tested: `tools-boxview-test.js` (45 checks), `tools-boxroom-test.js`, the whole `test:enclosure`, the box's smoke test and audit,
`test:project`, the browser check for project boxes; in Chromium the plan's dragging and keys, the catalogue, the names in 3D and
the download's `how-to-assemble.txt` (JSZip cannot build a zip in jsdom). `tools-boxfuzz.js`: 20 seeds of 4 to 6 runs (each
about 20 random steps); the last eleven clean. One case was seen once and never again (seed 64, before the last fixes: a Pi 3 A+
on a corner post after the box grew both ways, in a box made in parts); its replay and later seeds were clean. A main board placed
by `encMainPicked` keeps its turn (`keepRot`): its ports face the walls they do; modules may be turned to fit. Pictures: `docs/images/box-plan.jpg`, `box-parts.jpg`. Not done: dragging openings along the walls in the plan; a
real print of the strap loops (3 mm under a 45° gable: check the strap slides through).

## Session 63: project boxes, boards on walls, wiring, KiCad, heat, recipes, style (v0.55.0)

The owner asked "What else to make it even better", was given nine ideas, and answered "Do all of them". All nine are in:

- **Boards on a wall or under the lid** (`ENC_MOUNT_FACES`, `boardFace`/`boardSide` for the main board, `face`/`side` on a module,
  `encMountField`): boards with screw holes only. In `encBoardList` such a part has `lvl -1` (on no floor) and `x, y` on its face
  (along it seen from outside, and the height of its middle; under the lid across and front to back). `faceMount` in
  `buildEnclosure` builds the standoffs: on a wall a teardrop pointing down with a teardrop hole pointing up, extruded inwards in
  the wall's frame (`faceInfo[f].M/T`); under the lid circles on the lid's inside face (`lidMounts`, built with the lid). A board
  with its parts in is seen from outside the other way round (`mir`). Its info has `face`, `bb` (its plan footprint, with what
  stands off the face), `z` (its heights), `faceOver` when it runs off its face (`encMakeRoom` grows that face's sides). Checked
  in 3D against every other part and the levels; `encBusy` keeps new floor parts out from under it where it reaches their floor;
  `encShiftAll` moves it as an opening on its face; Arrange, ports and the 3D drag leave it alone (its floor port openings go when
  it moves to a wall). In the plan it is drawn and dragged along its wall (`encFaceDelta`).
- **The plan's tools**: openings picked (`encSel.cut`), dragged along their wall or on the floor, moved with the keys; distance
  lines from the picked part; snapping (`snapTo`, within 2 mm, guides, Alt to drag freely); Tab through `[data-pick]`.
- **Wiring** (`E.wires`, `encWireEnds`, `encWireAt`, `encPassAt`, `encWires`, `encWiringText`): ends are ids (`encId`, given to
  modules and openings as the panel is drawn and kept in the project; copies get new ones), routed across then front to back,
  through each level's cable pass; `wiring.txt` in the download.
- **KiCad** (`kicadParse`, `KICAD_PORTS`, `KICAD_PANEL`, `encSyncCustomBoards`, `encImportKicad`): a small S-expression reader; the
  outline from Edge.Cuts (or the footprints when there is none), holes, edge connectors as ports (`BOARD_PORTS["kc_<id>"]`), LEDs,
  buttons and knobs as `panel` parts. `E.customBoards` (up to 8) are clamped and made into `BOARDS["kc_<id>"]` on load, before each
  build and each panel; the group "Your own boards" is added to `BOARD_GROUPS`.
- **Shapes** (`BOARD_SHAPES` for 11 boards, `boardShapesAt`, `encTopIn`, `info.shapes`, `info.reach`): drawn as `feat` ghosts, in the
  plan and the catalogue; used by the bracket and short-lid-post checks, `encBusy` (the reach of overhanging sockets) and a check
  after every part is placed for a socket past its board's edge into another part.
- **Heat** (`ENC_WATTS`, `encWattsOf`, `encPartWatts`, `encHeat`, `encAddCooling`, `ENC_FAN_FLOW`): watts per part (typical, set by
  `watts` / `boardWatts`), a closed box's 5 W/m²K × 15 K, vents' open area from `placedRings`, ~3 cm²/W over that, a fan above
  15 W (3.1 × W ÷ 10 K m³/h). Vents are sized by their real open area (honeycomb or slots, whichever is more), a second pair on the
  short walls when the long ones cannot take enough.
- **Recipes** (`ENC_KITS`, `encStartKit`): defaults, the kit's settings, `aiFromWords` with faces set per kind and extra openings,
  `encApplyPlan`, a minimum size (the pedal), labels, `encFixAll`, `encTidyLabels`. All six build with no warnings.
- **Style** (`E.edge`/`edgeSize`, `E.texture`/`textureDepth`, `E.band`/`bandZ`/`bandH`/`bandSlot`): the lid's edge as 0.2 mm slabs
  inset from the bed (kept clear of a gasket groove); grooves (pointed tops) and hexagons (a corner up) cut into the walls' outer
  skin through the existing `wc` layers, clear of `taken`; the band inlaid the same way with a part of its own.
- **The fit test for the holders** (`E.testKind` "holders", `encHolderCard`, `ENC_HOLDERS`): a 130 × 82 mm card and its tiles.

**Fixed:** `sanitizeProject` rebuilt each module, level and opening from a fixed list of fields, so a reopened project lost a
module's `strapBy` (0.54), a level's `bracketWalls` (0.54), an opening's `auto`/`board`/`port` (0.54: port openings stopped
following the board, and Arrange made them again) and pulled modules back within ±150 mm. All kept now, with the new fields, and
`tools-boxpro-test.js` saves and reopens a project with every one. A fan only counted for cooling over 15 W. A label with no room
is moved above its opening before it is dropped (`encTidyLabels`, also on Label every opening).

Tested: `tools-boxpro-test.js` (45 checks: each face and side, clashes, growth, the panel; the plan's keys and Tab; wiring with a
pass and a missing end; a KiCad file written for the test; shapes; heat; every recipe; every style and the card without support;
a saved project and a hostile one), the whole `test:enclosure`, the box's smoke test and audit, `test:project`, the print survey,
the browser check, and `tools-boxfuzz.js` with the new actions (where a board is mounted, recipes, the heat buttons, wires,
the style, the holders' card; `DUMP=<folder>` now saves the box before a step that went wrong): seeds 101-104 and 111-113, 5 runs
of 22 steps each. It found one bug, fixed: a wall chosen for a board, then a board without screw holes picked, left `boardFace`
set, and `encShiftAll` moved that floor board as a wall part when the box grew (now it asks `encBoardList` where each part
really is, and picking such a board clears it). Its check after adding a part now looks at warnings that name the part added:
a box shrunk until everything is left out shows its old clashes again once a new part makes it grow (seed 111). In Chromium: snapping while dragging, the plan with wires and a
board on a wall, the catalogue's shapes. Not tested: a real KiCad board beyond the test file (other footprint libraries name
parts differently: the patterns are in `KICAD_PORTS` / `KICAD_PANEL`), and real prints of the wall standoffs, the styles and the card.

## Session 64: calibration, the bird house camera, what sticks out behind a wall (still v0.55.0, the same pull request)

The owner asked what the box maker still misses, was given a list (calibration feed-back, box shapes, plungers and light pipes,
more board imports and a parts library, drill templates and face drawings, the engine) and answered "Do all of them then we
calibrate tonight, I need to print a box for a lip 8k mah 126090 and a small dome movment sensor and then add a small esp32 cam
in another box for a little bird house". This session did what tonight needs, in the 0.55.0 pull request (#47, not merged yet);
the rest is next (see Next).

- **Your printer's fits** (`FIT_DEFAULT`, `FIT_RANGE`, `FIT_STEP`, `FIT_DIR`, `cleanFit`, `printerFit`, `encFit`, `encFitOver`,
  `encScrew`, `storedFit`, `fitSave`): `state.printer.fit`, cleaned by `cleanPrinter` (only when there, so a project from before
  is unchanged), saved with the printer (`makerforge.printer`), carried by a project file; a project without fits keeps this
  browser's (`loadProject` keeps `myFit`). `gap` (the room round a board in a cradle, was `ENC_CRADLE.gap`), `rib` and `clip`
  (`ENC_GRIP.into`/`.over`), `pin` (a snap pin this much thinner than the screw's clearance, was 0.3), `pilot` and `insert` (added
  to every hole from `SCREWS` in the box: every lookup there goes through `encScrew`), `loop` (`ENC_TRAY.loop.gap`), and `lid` /
  `clear`, where a new box's `fit` and `clear` start (`DEFAULTS` reads them with `storedFit`, which stands alone: DEFAULTS runs
  before the constants exist). The defaults are the old numbers, so nothing changes until the fits are set: the print survey
  is unchanged.
- **The calibration card** (`encHolderCard`, `ENC_HOLDERS` now 172 × 122 mm, `FIT_ROWS`): seven rows (RIBS, CLIPS, RIM, LOOP,
  PIN, INS, WALL), three sizes each, 1 the tightest, built with `encFitOver` set to each sample's sizes. Its middle sizes are
  `E.cal` (kept by `sanitizeProject`), set when the card is chosen, so the picks still match the printed card after the fits
  change; `encCalibrationPanel` has a 1-2-3 pick per row, **Make a new card round my picks** and **Back to the standard fits**.
  `encLoopAt` is the strap loop on its own (the tray uses it). The small box test has **Keep these gaps for every new box**.
  Settings: `fitSettingsGroup` on the Colours tab ("Fits (from the calibration card)").
- **The bird house** (two `ENC_KITS`): the battery box (a `lipo126090`, 94 × 61 × 13 with its protection board, on strap loops;
  the TP4056 made the main board so `encAddBoardPorts(true, true)` puts its USB-C through the wall; an MT3608; `pirmini` in front;
  a PG7 gland; gasket, ears) and the camera box (an ESP32-CAM in clips, a `camholder` over it, h 22). Recipes take `holds`,
  `main`, `over` and `h` now; with `main`, Arrange may make the box bigger (`encArrange(false)` when it does not fit).
- **The camera holder** (`camholder` in `CUTOUTS`, `ENC_CAM`, `camFrames`, `info.cams`): the lens hole, and a three-sided frame
  on the lid's inside (8.5 mm + the gap fit, 1.2 mm walls, 3.2 mm tall), open towards the front (or the right, turned); left out
  with a warning when it would reach the lip, and a warning when a board's parts reach it. A ghost shows the camera.
- **What sticks out behind a wall** (`deep`, `body` on 45 `CUTOUTS`; `placedOpen`, `info.behind`): a ghost behind each panel
  part, and a warning when it meets a board on the floor; `encFixAll` grows that wall by the overlap (up to 3 rounds). A board's
  own port openings (`auto: "ports"`) and a KiCad board's panel parts are skipped. `encFixAll` also takes an opening "behind
  the lid's lip" down under it (`info.wallV`), or makes the box taller when lower would clash or leave the wall. Recipes with
  `round: true` (both bird house boxes) get `E.teardrop` "flat" (`encTeardropFlat`): a teardrop cut flat 1 mm over the circle, so
  no support (a short bridge) and a gland's flange or a dome's lip still covers the hole; the panel's choice is Round / Pointed
  top / Pointed, cut flat. (They were round at first: the print check then wanted 45 and 26 mm² of support. `tools-boxcal-test.js`
  read a `supportArea` that does not exist, so its "no support" checks passed whatever; it reads `overhang.area` now.) It found the bench power supply recipe's inlet,
  switch and sockets inside the LRS-100 (the recipe's box is now 27 mm deeper).

**Fixed on the way** (the bird house boxes in Chromium said "4 walls are thinner than the nozzle"): the screw ears' 45° fins
ended in a knife-edge at the wall (now a 0.6 mm step); a floor cradle's rim had no bounds, so a board put 1 mm from a wall for its
ports (Arrange, Add this board's ports) left a free sliver of rim and, on a wall under 1.6 mm, reached through it (floor cradles
are clipped to the inside now, like a level's); and `sliceMask` in `src/core.js` filled slice rows odd-even, so two overlapping
shells of one part (the TP4056's rim on the LiPo tray's: Arrange keeps 3 mm between boards, their rims reach 1.9 and 2.2 mm)
read as a gap with thin walls either side. It now fills by winding (each crossing's way from the triangle's normal), as slicers
do, with odd-even kept for a row with a crossing whose way is unclear. The version badge was typed by hand and said v0.53.1 in
0.54.0: `build.py` now writes `package.json`'s version into it (and stops if the badge is not found).

Tested: `tools-boxcal-test.js` (new, in `test:enclosure`): the card (closed, no support, fits a 220 mm bed, three sizes a row,
1 the tightest), a pick (the printer's fit, stored, the card unchanged, shown picked), a new card round the picks, every fit used
by a box (ribs, the cradle's room, pilot and insert holes, the panel's words, strap loops still without support), a new box's
lid gap and clearance, the small box's button, Settings, a project keeping its fits, one from before keeping the browser's, a
hostile one; both bird house recipes (no warnings, closed, no support), the frame (on the lid, near a wall, over a board),
a rocker switch in front of an Uno and Make it all fit, a gland behind the lid's lip (lowered; one too big: the box taller),
a Pi's own audio jack. In Chromium: the card, both boxes (nothing to check but unused filaments) and the manual's pictures
(`docs/images/box-calibration.jpg`, `box-birdhouse.jpg`, `box-camholder.jpg`). Not tested: a real print of the card (tonight),
the OV2640 in the frame, the 126090's real size with its protection board, and the body depths (typical datasheet values).

## Session 65: project boxes for outdoors and for bought boxes, battery life, nut pockets, more imports (v0.56.0)

The owner asked for ten more improvements, shared features and engine ideas, then "Do all of them and fix bugs along the way".
This session is the boxes' part of that, as 0.56.0 (its own pull request after #47). The rest is in Next.

- **Battery life** (`encBattery`, `encBatteryWh`, `ENC_SLEEP_MW`, `encSleepMw`, `encDaysText`; `E.power` {mode, wakes, secs, extW,
  extSleepMw, eff}, `E.boardWh`/`boardSleepMw`, a module's `wh`/`sleepMw`): energy from the label's mAh and the cells, 80% used,
  awake = the heat page's watts without chargers, converters and batteries (`encIsPower`, `encIsBattery`), a converter's
  efficiency (85%) and quiet draw. The bird house battery recipe has `power` (20 wakes a day, 30 s, the camera box's 1 W / 20 mW
  outside): about 29 days. `ENC_WATTS` has the ESP32-CAM at 1 W (it was 0.5, as an ESP32).
- **Nut pockets** (`E.fasten` "nut", `SCREWS[..].nutAf/nutT`, `ENC_NUT`, `encNutSlice`): a hex pocket 3 mm under each corner post's
  top with a slot to the box's middle (one C-shaped outline), and a roof in 0.2 mm steps 0.4 mm narrower each (45°, no support);
  posts grow round the nut; the lid's screw length, What you'll need and the steps follow. Split flanges keep pilot holes.
- **A printed TPU gasket** (`E.gasketPrint`, `E.gasketSlot`, `encGasketSlot`: a TPU slot if one is loaded): a ring the cord's width
  along the groove, half the cord proud; `info.gasket.printed`; no cord in What you'll need.
- **Outdoors** (a page): `encFaceSolid` (a profile in (out, up) run along a wall, outward-facing) makes **rain hoods** (`c.hood`,
  `info.hoods`); the **breather** opening (M12, not counted as a vent); the **solar panel** (`E.solar` one of `ENC_SOLAR` or
  "custom" with `solarW/D/X/Y`, `encSolarRect`): its outline 0.4 mm into the lid's outside (a pocket would face the bed: 4842 mm²
  of support in the first try) and a 5 mm cable hole under it; round holes that seal (Session 64's "flat" teardrops).
- **Mounts** (`encMount`): "tripod" (`ENC_TRIPOD`: a 1/4-20 nut's hex through the floor, in a boss with a stepped roof, `info.tripod`,
  a warning when a board is over it) and "magnets" (four pockets under the floor, cut with the feet, `E.mountMagnet` default 8x3:
  10 mm pockets were 10.2 mm bridges, over the 10 mm limit).
- **Knob scales** (`c.dial` ticks / 0-10 / minmax, `c.knob`, `ENC_DIAL_KINDS`): strokes cut like labels, kept in `taken`.
- **Firmware** (`encFirmware`, `ESPHOME_BOARDS`): esphome.yaml (or pins.h) in the zip and a Copy button on the Wiring page.
- **Plungers and light pipes** (`c.plunger`, `c.pipe`, `c.reach`; parts in a row in front, `info.extras.plungers/pipes`), **clear
  windows** (`c.window`; `encFaceSlab` for walls, a lid part shifted with the lid; `encClearSlot`), **a flexing lid button**
  (`flexbtn`, kind "flex": a U slot; a nub on the lid's inside).
- **Templates and drawings** (`encFaceDrawings`, `encFaceSVG`, `encFaceDXF`): true size, as cut (`openingRings` with wall false),
  the floor seen from below; in the zip under cad/.
- **Imports** (`boardFileParse`: `kicadParse`, `eagleParse` (DOMParser), `easyedaParse` (Standard JSON, 10 mil units, y down);
  `boardFromFeatures`), `encAddCustomBoard` shared, and **your parts** (`myParts`, `myPartsSave`, `encMeasuredBoard`;
  `makerforge.parts`, up to 40; adding copies into `E.customBoards`). `KICAD_PORTS`/`KICAD_PANEL` know TYPE-C, SW-TH, TS, KEY-6X6.

Shared features (the "make it global" answer, begun here):
- **A QR code on anything** (`cleanQr`, `qrCanvas`, `qrSrc`, `addQrItem`, `qrPanel`; an item's `qr` {text, ec, quiet}, `_qrSig` a
  runtime key, kept in share links like icons): drawn from C.qrEncode like an icon from its recipe, through the picture pipeline.
  `tools-qrart-test.js` (in `test:card`) reads it back with jsQR from a name plate's and a plain box's printed geometry.
- **Calibration per material and in one place** (`FIT_MATS`, `fitMaterial` (the box's slot, else the object's), `cleanFitMat`,
  `printer.fitMat[mat]` over `printer.fit`, `fitSave` per material, the lid/openings/move gaps shared): 0.55's picks (in
  `printer.fit`) stay for every material. `move` is the moving parts' gap (`DEFAULTS().base.fit.gap` reads it; **Keep … for every
  new part** on a mechanism's Fit page). The Fits page has the test prints (`chooseObject`).

Tested: `tools-boxplus-test.js` (new, 41 checks, in `test:enclosure`): each feature closed and without support of its own, the
numbers (battery days, the gasket's height, the plungers' lengths), the warnings (a board over the tripod nut, a thin floor for
magnets, a scale with no room, a panel bigger than the lid), the files (ESPHome, pins, SVG, DXF), Eagle and EasyEDA boards written
for the test, your parts saved, added and removed, a project saved and opened twice, a hostile one. Not tested: real prints (the
nut pockets' fit, the TPU gasket's squeeze, the hoods, the flexing button's spring), a real EasyEDA or Eagle file beyond the
test ones, the ESPHome file on a real ESP32-CAM, and windows on a split box (they would go on a plate of their own).

## Next (no plan yet)

The owner's list from Session 64, still to do (each for a release of its own, from main after #47 is merged): box shapes (a
sloped front, round and hexagonal boxes, a clamshell split), printed button plungers, a flexing button in the lid and printed
light pipes, EasyEDA and Eagle board imports, a board measured from a photo, your own parts library kept across projects,
paper drilling templates for a bought box and each face as SVG/DXF, and the engine (the body built with Manifold, builds on the
helper thread). The calibration card's real print (the owner, tonight) may move `FIT_DEFAULT`.

## Earlier plan: 0.55 (done in 0.54.0)

Done in Session 62 (0.54.0), kept here for the record; the next release needs a new plan. The three items were:
1. **Strap loops instead of floor slots** for a battery's strap tray: a loop standing on the floor each side of the battery
   where the slots are now, so the floor stays closed (a splash-proof box with the gasket). The strap (22 mm) passes under a
   roof that must be a 45° gable to print without support (about 11 mm high over a 3 mm opening). A choice beside "Strap tray"
   (`hold` stays "holes"/"strap"; add a `strapBy` "slots"/"loops"), the slots' code is in `encStrapTray`.
2. **Arrange it for me and posts you put**: after arranging, move each custom post (`L.at`) that a board now covers to the
   nearest free spot on its plate (clear of boards + 4 mm, other posts 10 mm, the plate's edge 4 mm), and say how many moved.
   Today it only warns ("is under a post of level k"). `encArrange` ends where the dividers are moved; `postPlan` has the posts.
3. **Brackets on the front and back walls** for a level: `L.bracketWalls` "sides"/"frontback"; in `postPlan` the brackets are
   at `x = ±(iw/2 - BRK.in)` on the sides; front and back means `y = ±(id/2 - BRK.in)`, `x = ±(lvW/2 - px)` clear of the corner
   posts, and the D-shaped boss and its 45° wedge turned 90° (the build is after `if (holdOf[k] === "brackets") postAt.forEach`);
   the checks for a channel or a board under one, and `encArrange`'s `bands`, take the new places.
Each wants a test in `test:enclosure` like `tools-mounts-test.js`, the manual, CHANGELOG 0.55.0 and a Session 62 here.
Helper scripts: `tools-partshot.js` renders parts alone for the manual's pictures; `tools-boxdrag-check.js` drags a board
with the real mouse in Chromium.

## Unfinished (in priority order)

- **0.44: colour from a photo, with more AI, for the CR7 figure** (click to colour done in Session 50; the rest below is next) (the owner, Session 49: "fix the auto painter function from a pic,
  can we use the depth ai and maybe add another small model and combine all of them to get an even more accurate image and trace to
  apply paint ... I still want to paint the Cristiano Ronaldo from imagine without much extra manual painting"). The plan given:
  (1) the depth model (already loaded for reliefs) to line up each part (an arm in front of the body is a depth step, not an
  outline) and to find the camera angle better; (2) a small human-parsing model (hair, face, skin, upper and lower clothes, shoes),
  whose regions do not change with the light, so a shaded shirt stays the shirt's colour. **Not SegFormer B2 clothes**: its card
  says "other" and points at NVIDIA's SegFormer licence (non-commercial), so it cannot ship with an MIT app (checked in Session 49);
  look at MediaPipe's multiclass selfie segmenter (Apache-2.0; background, hair, body skin, face skin, clothes, other; 256 × 256,
  a TFLite file to convert to ONNX and host in `models/`); (3) **click to colour**: a small Segment Anything (SlimSAM-77,
  Apache-2.0; Xenova's int8 `vision_encoder_quantized.onnx` 8.9 MB + `prompt_encoder_mask_decoder_quantized.onnx` 4.9 MB) on the
  photo: click the shirt, it is outlined, pick a filament, it goes onto the model. Each model in `AI_FIGURE`'s `name:{ urls, sha256 }` form so the website hosts its own copy.

- **The next two builds** (the owner, 2026-11-05: "Mechanisms toolkit, model doctor, 3d relief from any photo, sign maker and fix it parts library should be done over the next two builds"; ideas 2, 3, 6, 8 and 10 of Session 36's list). Planned split:
  - **v0.31.0: parts that fit.** (Done in Session 37, but for pins on their own.) The mechanisms toolkit (threads, gears, hinges, snap-fits, pins, each with a fit-test coupon) and the fix-it parts library built on it (knobs, shelf pins, feet, battery covers, clips, caps from a few caliper measurements). They share the clearances and the fit tests. The keychain's surname line and credit on the back (asked for just before) ride along, being small.
  - **v0.32.0: models and pictures.** (Done in Session 38, but for the model doctor's split, hollowing and thickening: see Session 38's Not done.) The model doctor (repair with Manifold, thicken, hollow with drain holes, simplify, split for the bed with pins: this takes in Cutting next's split), the 3D relief from any photo (an AI depth model), and the sign maker (channel letters with LED channels, diffusers and mounts).
  - Watch for: the depth model is bigger than jsDelivr's 20 MB per-file limit (Depth Anything V2 Small is about 50 MB in fp16, 27 MB in int8), so it needs splitting into parts, or another host, before it can join `AI_FIGURE`; its licence (Apache-2.0 for Small only) goes in `models/LICENSE.md`; the owner's website hosts its own copy of every file in `AI_FIGURE`, so the new model must keep that `name:{ urls, sha256 }` form.

- **The road to v0.50** (the owner, Session 41: "Should we start adding modelling and more CAD features for imported models / Make it
  into the big 0.50 release and update the current sections in between"). The plan agreed (reorder if the owner asks):
  - (Numbers moved up by one when the project box split from the bench supply's session took 0.34.0: sharp paint edges are 0.35.0.)
  - **0.36-0.45, every section updated, about two a release:** 0.36 name keychain, double-sided tag, business cards; 0.37 signs,
    plaque, frame; 0.38 tracer, photo relief; 0.39 lithophane, jigsaw; 0.40 cookie cutter, circuit-board art; 0.41 lightbox, plastic
    canvas; 0.42 bobble head, tea light, turned shapes; 0.43 project box (the PSU box's 600 mm² of support, honeycomb roofs, snap-fit
    and hinged lids, a snap-on DIN clip); 0.44 phone case; 0.45 mechanisms, fix-it parts. Each: its audit, print-survey warnings, its
    Known bugs and Not done, and what it lacks against similar tools.
  - **0.46-0.49, the groundwork for modelling:** 0.46 move, rotate and scale handles in the 3D view with mm entry and snapping, the
    basic shapes as primitives; 0.47 a modelling list for an imported model (like the paint list: steps replayed on the original,
    saved, each editable and hideable); 0.48 the painter's leftovers (photo colour and curvature with exact edges, the preview),
    builds on the helper thread and the import pipeline (units, the doctor's repairs, split for the bed with pins, a keyring hole:
    Cutting next); 0.49 a shake-down (slicer checks, a browser pass, the bug list).
  - **0.50, the model workshop** for imported models (mesh modelling with Manifold, not parametric CAD): add, subtract or intersect
    boxes, cylinders, cones, spheres, text and other models; sketch on a face (lines, arcs, circles, rectangles, with sizes) and
    extrude or cut; holes (plain, countersunk, for heat inserts, threaded with `threadSolid`); hollow with drain holes, shell and
    thicken; mirror, align, measure (distance, angle, wall thickness). Rounded edges on a mesh are the hard part: chamfers, or an
    honest "rounded, roughly".
- **Asked for next** (the owner, during Session 44; ahead of the section plan where they fit):
  - **100 more components for project boxes**, the most common first, then the rest: boards, modules, Arduino shields and add-ons
    (with their mounting holes where the box holds them), **with a search** in the openings list ("add an opening: type its name").
    Other parts that take components (signs' wiring, the lightbox) use the same list where it helps.
  - **The picture beside the keychain's name needs much more work** (placement, size, outline, colours, how it joins the plate).
  - **An icon maker for project boxes**: a small built-in icon set (and, if allowed, icons from an open SVG library such as SVG
    Repo, fetched only when asked, with their licences kept), several icons combined into a new one, in several colours, for the
    lid or a label.
  - **More than the basics**: each section also gets medium-sized useful features, not only missing basics.
  - **Project boxes, "the one and be all"** (the owner, Session 45): many more components and boards (done in 0.39), missing
    features, the icon maker with AI help. Then: "Maybe a small local model too / Maybe a second floor for multipurpose boxes /
    ... if we use a 120mm fan inside a project box there will be a lot of empty space and we should have different levels and
    shapes inside the box too plus the ai to help design after specific needs and parts chosen / Add as many options as you can
    think of without being overwhelming / Is there a way to enhance the engine behind the box generator further?"
    Plan (0.40-0.43, reorder if asked):
    - **0.40, the inside of the box:** the parts shown inside as see-through blocks (boards with their port bodies, modules,
      fans, batteries), so you see what fits; checks in 3D (a port clear of the wall, a part under the lid, a fan's airflow).
      Levels: a second floor (or more) at a height, printed flat as its own plate, resting on 45° ledges on the walls or on
      posts, with its own boards, a cable pass-through and air holes. Dividers that slide into grooves (compartments, a
      battery bay with its own door). An internal fan wall for a 120 mm fan with a duct towards the vents. Cable channels,
      zip-tie anchors, standoff towers.
    - **0.41, lids, mounts and print fixes:** snap-fit and hinged lids, a snap-on DIN clip, pointed tops added by themselves
      to wall openings wider than a bridge (the PSU box's 600 mm², the 23 mm² of an Uno's USB-B), honeycomb roofs, artwork on
      walls.
    - **0.42, arrange it for me** (done in Session 48, but for levels added by themselves): a layout solver that packs the chosen parts (on levels when they do not fit one floor),
      keeps each board's ports on a wall, leaves cable room, and sizes the box; "make it smaller" and "make it printable on my
      bed" as goals.
    - **0.43, the icon maker and AI help** (done in Session 49, but for the in-browser model; the owner chose "Both": the owner's own API key in the browser now, the local
      agent later). Describe the project ("ESP32, a relay, 12 V supply, a 120 mm fan, an OLED, two buttons, on a wall"): the AI
      answers with a parts list and settings in the project's own format, every value checked by `sanitizeProject`, and the
      solver lays them out, so the AI never makes geometry. **A small local model too:** Ollama on the owner's PC (its
      OpenAI-style API on localhost; the site's address added to OLLAMA_ORIGINS), or, opt-in, a small model in the browser
      (WebGPU, a few hundred MB, checked by SHA-256 like the others). Without any model: recipes and keyword search.
    - **Options without overwhelm:** every new group closed until opened; recipes ("ESP32 sensor box", "bench supply",
      "fan-cooled amp") that fill in sensible choices; the AI and the solver choose, the person adjusts.
    - **The engine:** the box is now extrusions joined as overlapping closed shells. Next: (1) the parts catalogue with 3D
      bodies (above) so every check is in 3D; (2) the body built with Manifold (already loaded for cutting): one clean solid,
      exact volumes, rounded inside corners and edges by offsets, any inside shape unioned cleanly; (3) builds on the helper
      thread; (4) design rules applied by themselves (bridges, wall thickness, screw bosses near edges).
- **After 0.50: 1.0 and 2.0** (the owner, Session 43: "Let's keep manifold for now and use version 2.0 as a full 3d cad software
  we will find a way to keep it small fast and easy to use"; before that: "Should the version 1.0 be a fully parametric cad addon? The
  ability to connect to a local agent and get help with modelling").
  - **0.5x, the agent bridge.** A small, documented command set on the page (add or change a feature, set a size, measure, list
    parts, run the print check, take a screenshot), every command checked like a loaded project (`sanitizeProject`'s rules) and
    undoable. A local script (`maker-forge-mcp.js`, an MCP server) relays an agent (Claude Code, Claude Desktop, any MCP client)
    to the open page over localhost (a WebSocket the page connects to when asked; newer Chrome asks the user before a page reaches
    the local network). Nothing leaves the machine but what the agent sends.
  - **1.0, parametric modelling on Manifold** (mesh, not B-rep; still one file): the 0.47 modelling list grown into a feature
    history edited by numbers; sketches with sizes and simple constraints; holes, patterns, variables used across features
    ("wall = 2 mm"); the agent working through the same history. No true fillets or STEP: chamfers, or "rounded, roughly".
  - **2.0, full 3D CAD**: true solids (B-rep: fillets, shells, STEP in and out), kept small, fast and easy to use. How is open:
    OpenCascade (opencascade.js, LGPL, loaded separately like Manifold) is 10-15 MB and slow to start, so look for a slimmer
    build or another kernel first. Decide before starting 2.0, not now.
- **Basics missing** (asked for in Session 43: "improve basic things that are missing"; one or two each release from 0.38):
  several different objects on one plate (part of 0.46-0.49: modelling needs it); imported models kept by the autosave, the
  recent list and share links (now the file must be opened again: keep it in IndexedDB); move/rotate/scale handles with typed
  sizes (0.46); a proper icon set for the rail; a check in Firefox, Safari and on touch screens.
- **The next builds: expand and fix** (the owner, Session 39: "After 0.32 and all current features I think we need to work on
  expanding and fixing all the other current features and parts of the app, more accurate painting art placement and everything
  else"). Planned order, each a release:
  1. **Painting and art placement accuracy.** (Session 41: sharp paint edges for the brush, eraser, box and lasso, and pictures. Open
     from this item: a placement aid in mm for pictures on curved faces.)
     - The painter: brush edges follow triangle edges, so a stroke on a coarse model is jagged. Split the triangles under a stroke's
       edge (sub-triangle paint, which needs a slicer check of the export).
     - Pictures on objects: placement by the picture's real size on curved faces (`makeWrapProjector`), snapping to the face's middle,
       numeric placement in mm.
  2. **Every object, one by one** (P7 in this list): each generator's audit, print-survey warnings and its own Known bugs.
     - The PSU box's 600 mm² of support.
     - Honeycomb grilles' 30° roofs.
     - Lithophane and jigsaw defaults waiting on a print.
     - Fix what the audit and a real-browser pass find. The project box's own next steps (below) belong here too.
  3. **Speed** (below), then Cutting next and the model doctor's split for the bed.
- **Speed next** (Session 28; the size change and the photo steps were done in Session 30): getting a big model ready for paint (`meshEditor` and `meshTopology` in `applyPaint`, about 0.75 s once on the 373 k-triangle figure) could go to the helper thread too; then the builds themselves (Session 22's plan).
- **P4**: none outstanding beyond polish.
- **P5**: an actual 3D view cube widget; dimension lines drawn along the model; bed resize already follows the printer; more layout modes next to Explode (e.g. lay layered parts flat).
- **P6**: done in Session 19: example images for every start. Still open: picking several pictures for use in other sections (the `enabled` flag is the start of this); traceable pictures on keychains (silhouette mode exists via "Print it in its own colours" off).
- **P7**: all section improvements (Double-Sided Name rename and mirrored back plate, iron-on patch shapes and military badges and premade patches, Christmas ornaments, caricature bobble head, name/letter lightbox and more box styles, photo frame back panel and clear front and relief panel, tea light egg/round shapes and picture positioning and candle ring and wagon-lantern cover and separate walls, plastic canvas fitting, functional PCB with conductive filament and copper-sheet workflow and Gerber import, car badge shapes and two-sided car keychain).
- **P8**: done in Session 13 (phone cases). Next: button covers, camera guard ring, MagSafe recess, exact positions from the makers' design guidelines (ideas 16 to 23 above).
- Painter next steps: done in Session 18: box select (7), radial symmetry (8), the smart brush (9), curvature (10), the eyedropper and recolour (14), a wrapped picture (2), a layer preview with colour changes and waste (4, 5). AI-model textures (1) were done in Session 20. A BVH (12) came in Session 22; pauses for one-filament printers (6), named and hidden steps (11) and mirror-safe paint (13) in Session 30. Sub-triangle export (3) was done another way in Session 41: the mesh is cut along each stroke (Sharp edges). Opening painted exports in Bambu Studio, OrcaSlicer and PrusaSlicer is still to be done by hand.
- Asked for in Session 18, still next in line (the manual and the examples were done in Session 19; the AI cut-out, GLB and OBJ colours and the hand-fixed outline in Session 20; a BVH, drawing on change and a first helper thread in Session 22; close-up photos in Sessions 23 and 24; Manifold engraving, inlays and cutting flat in Session 32): moving the builds to the helper thread (see Session 22); sub-triangle paint export if it can be checked against a slicer.
- **Business cards next** (Session 33): see Session 33's Not done; and a real print to set the defaults (inlay depth, square size, NFC pocket clearance).
- **Cutting next** (Session 32): split a model in two at a height, with holes for filament pins (the top half laid beside the bottom; pictures and paint crossing the cut split too; the holes placed on the cut face by its distance field); a keyring hole through an imported model; cutting on the helper thread (the worker would need Manifold too: its code turned into a classic script, as a module cannot be loaded there everywhere); a relief carved in.
- Examples next steps: an example for Import a model (a small painted figure); the unused moonlit-forest relief could go on a lithophane-style tea light; examples in the dark theme's pictures (the Start pictures are rendered on a clear background, so they suit both).
- Lithophane next steps: the test strip exists (Session 12); use a printed one to calibrate the preview's transmission constant (1.3 per mm is a guess); colour lithophanes (a thin colour layer behind a white sheet, or filament-swap layers); a lithophane puzzle (joins the jigsaw's single-colour idea); for the lamp shade, *stretch once round* as an alternative to repeating copies, a base ring that sits on an LED tea light, and a lid; an engraved name on the border or foot; a separate slotted stand instead of one printed with the sheet; a *keep proportions* option for the heart (it is stretched to the picture's aspect, like the jigsaw's heart); decimating flat areas (border, blank gaps, smooth sky) so big sheets need not be coarsened.
- **Litho book** (an idea from the owner, after v0.30.0: "a lithophane book maker based on real books", like MeasureOnce's *Litho Books* on MakerWorld, e.g. https://makerworld.com/en/models/1041326-litho-books-onyx-storm; not started, "don't make it yet"). A closed book at a real book's size, standing up, lit from inside: the **front cover** is a lithophane of the cover art (title and all), and the **page edges** glow with their own picture over fine page lines (the special editions' sprayed edges: dragons on the fore-edge). From the owner's screenshots of that model in the slicer, it prints as three parts: (1) the book, standing: front cover lithophane, back cover and a rounded spine, open on the page side; (2) the page edges as one U-shaped wall (fore-edge, top and bottom), printed standing so the lithophane is upright, with a small slot in the top arm (a switch or cable?); (3) a holder with four round cups for the light. MeasureOnce's notes: hardback size for the A1/X1/P1 and paperback for the A1 Mini, a "book" filament for the cover (light ivory) and white for the pages, 0.16 mm layers, 7 walls, no supports, a light put inside. Possible with what is here; about two sessions:
  - The faces are lithophanes as now (`heightSheet` with a flat back, one per face, mapped into the book's frame, each from its own Art-tab picture: front, fore-edge, top, bottom, back and spine, each optional). The page lines as shallow grooves on the outside of the page faces (the back of the sheet following `map(u, v, 0)` with `back:"grid"`), so they glow as lines.
  - Real book sizes as presets (hardback 160 × 240, trade paperback 152 × 229, B-format 129 × 198, mass-market 106 × 175, A5, your own) with the thickness; the cover boards standing 3 mm proud of the page block at the top and fore-edge; a rounded or flat spine; the title raised or inlaid on the spine (the card's text and inlay).
  - Print as separate parts (two filaments without an AMS; the page edges slot into the book with a set clearance) or as one piece standing on its bottom (the top bridges the book's thickness); a light pocket or holder sized for an LED tea light, a puck light or a torch.
  - The app ships no real covers (copyright): the example is drawn here; users load their own pictures. More later: an open-book version (two curved pages from a spine), colour lithophane faces, a matching series for a shelf, a book lamp.
  - The fits (page edges into the book, the light holder) need a test print before they are defaults.
- Jigsaw next steps: a lithophane or relief puzzle for single-colour printers (the picture as thickness, backlit); whimsy pieces (a heart, a star or the picture's own subject cut out as one piece); knob shapes from a symbol; split a puzzle bigger than the bed into plates of whole pieces; an optional "print spread out" layout with wider spacing; two-sided puzzles (a second picture on the back); drop colour slivers narrower than the nozzle inside each piece; the heart outline is stretched to the picture's aspect ratio (a "keep proportions" option would crop instead).
- Printability follow-ups: fillets were in the original idea next to the brim and were not done. Optimize keeps the yaw the rotation gives; it does not yet turn the model on the bed to fit or to line up with the bed axes. (Session 12 fixed the vase profile and added the "Turned for printing" note.) A flat ceiling whose ends meet small rounded corners was not seen as anchored; fixed in Session 31 (corners up to about 4 mm radius now hold it).
- **P9**: retro emojis, pixel art, themes, more retro fonts, animations, printing instructions, performance work.
- Tracer next steps: credit-card and coin references for parts bigger than a sheet; fillets and chamfers; a second extrusion level (bosses, counterbores); lens-distortion correction for wide phone cameras; reading SVG paths as vectors instead of drawing them. (Back plates were done in Session 11; holes, loops, screws, colours and line thickening in Session 12.)
- Project box next steps: splitting a box bigger than the bed both ways, and dowels to line the parts up (Session 40); snap-fit and hinged lids (ideas 3 and 5), an end stop for the sliding lid, the board ghost with one-click port openings (idea 6), battery bays, a snap-on DIN clip with a spring (wall mounts, a slide-on DIN clip and strap loops were done in Session 39), cradles for boards without mounting holes (ESP32 dev kits, ESP32-CAM), a raised logo on a lid printed face up.
- Name plates from a list: every name is a part of one object; a slicer cannot move them one by one. Packing is simple rows; a bed-full list is flagged, not split onto several plates.

## Known bugs and issues

- Enclosure opening sizes are typical datasheet values: modules differ between makers, verify with calipers (Session 11).
- Enclosure: wall openings wider than the bridge limit (default 10 mm, e.g. USB-A, LCD bezels) are reported as needing support; the Openings page offers a pointed top or a notch for ports and rectangles (Session 12), but snap-in parts keep their flat tops. Since Session 47 the PSU box quick start reads about 184 mm² (the IEC inlet, rocker and voltmeter keep flat tops for their bezels); fan grilles default to slots and honeycomb in walls is flat-topped, both without support.
- Enclosure: artwork goes on every face since Session 54 (words, icons and the Art tab picture; engraved, inlaid or raised); this line said "the lid only" until Session 64.
- Enclosure, Session 40 not yet printed: the join flanges (an M3 insert in a 4.0 mm hole with a pointed top, M3 × 14 screws through 3.4 mm holes), the lid posts on them and the lid in parts. Print a small box in two parts first (**Always**, 2 parts).
- Cutting (Session 32) needs a closed model: one with gaps is refused, and the app does not repair it. Pieces of a model that overlap (eyes set into a head, the shell's floor inside its walls) are joined before a cut, so its volume reading drops by the overlap. On a 300 000-triangle model each change to engraved artwork takes about a second on the page. An inlay's pieces touch the object exactly; how each slicer takes that is still to be seen.
- Enclosure, Session 12 fits not yet printed: magnet pockets (+0.2 mm on diameter and depth), the sliding lid's 0.2 mm gap and 45° rails, foot recesses, 0.4 mm label depth and 0.6 mm label lines, the lid logo in its first layers. Print the fit test first.
- Enclosure, Session 13 not yet printed: the pilot-light jewel lens (the shank's corners have 0.15 mm of play a side plus the clearance, the LED pocket 0.1 mm a side, so a 5 mm LED's 5.8 mm base rim stays outside it). Print one lens and a scrap of wall with its hole before a whole box.
- Tracer hollow cover: strokes thinner than two walls stay solid (by design, noted in the panel).
- **AI figure finder** (Session 17): it marks the photo's most eye-catching object, not specifically the figure, and fills hollows: a bright object touching the figure, a stand, a hand or a shadow can be taken in, and the fit then comes out a few percent too big (the worst-case test: 2.9%). Nudge it, or add a second photo. The model loads from jsDelivr's copy of this repository's `main` branch; the repository is public and `models/u2netp.onnx` is on `main` (checked in Session 21), so that address should work. The live address has not been fetched from the test container, where jsDelivr is blocked; the browser check serves a local copy. A copy of `models/` next to `index.html` works too. The AI cut-out (Session 20) uses the same model and has the same limits: it keeps the most eye-catching object, which may not be the one you meant. Since Session 34 a picture on one plain colour is offered the colour cut-out first, and the AI falls back on it when it finds nothing there or cannot be loaded.
- **Colour from a photo** (Session 16): tested on rendered photos only. Since Session 23 the fit allows for a close camera (perspective, not lens distortion), so strong perspective (a phone held close) and a pose that differs from the model line up less well; white or pale parts on a pale background lower the outline match (the colours still come from inside the model's outline). On a model of several parts made here, each part's depth test sees only that part (imported models are one part). Parts no photo shows are a guess (since Session 35 from the other side of the same part, or the nearest colour): add a photo of the back. Changing the model's shape (not only its size) after lining up needs "Line it up again".

- **Bambu 3mf in Bambu Studio** (tested by the user, Sessions 10 and 26): geometry and colours load, with the standard notice for third-party files (*not from Bambu Lab, load geometry data and color data only*) when opened as a project; **Import geometry only** loads the same without it (Session 26). See Session 10 for why the notice cannot be removed safely. The filament colours themselves come from the user's Bambu Studio setup, not from the file.
- Everything is tested headlessly: in jsdom with a canvas stub (letters are boxes, `ctx.filter` ignored), and since Session 12 also in headless Chromium with software WebGL (`tools-browser-check.js`: real fonts, real canvas, the 3D view, screenshots). Firefox, Safari, real GPUs, touch input and slicers are still unchecked. Emoji charms in Chromium on Linux use Noto Color Emoji.
- The name plate default mesh grew to about 20k triangles after smoothing (charms and plate). Fine for slicers, but could be decimated further.
- Emoji charms depend on the system emoji font; results differ between Windows, macOS and Linux.
- The audit lists expected "unchanged" controls separately with the reason (see Session 6); anything under FINDINGS is new.
- The icon glyphs in the rail are text symbols chosen by regex on the page title; some pages fall back to their first letter. A proper SVG icon set would look better.
- Background separation assumes the part does not share its colour with the background; the hand brush is the workaround.
- Paper mode is accurate (area within 0.06%, edge-to-edge size within 0.06 mm on the angled A4 test, see Session 6).
- Since Session 12 `traceField(…, closeEdges)` closes a region that reaches the grid's edge along that edge; the tracer and the name plate ask for it. Everything else keeps the old behaviour: open chains closed by straight chords, and a region covering the whole border (a picture's background) traced to no outline, which the picture decals rely on. Since Session 34 the picture decals ask for it too: their background is left out in the cell map instead (`dropCellBackground`), so other colours reach the edge. The tracer still refuses a mask that covers over half the picture's border, as "the background was picked".
- `fitDimensions` treats a very gently bowed side (bow under about half a photo pixel) as flat, so its "edge to edge" size is the mean of the bow, not the peak.
- The tracer test photos are hard-edged renders; real camera photos have soft edges, so real-world numbers still need a check against calipers.
- The keychain's "picture beside the name" uses `cutoutCanvas`, which since Session 34 is `cutoutByColour` (the colour cut-out), not a flood fill (checked in Session 41).
- `jsdom` cannot run JSZip's async zip generation in-realm, so zip contents are verified separately in Node.
- Printability is a heuristic, not a slicer: the overhang limit is one angle for the whole model, bridges are judged by anchors on two sides (not by bridge direction or cooling), thin walls are found in up to 7 slices per part at a resolution of `max(nozzle/4, extent/1200)` (coarser than nozzle/2.5 on parts over about 130 mm), and support area is the area of the faces, not the support volume. Models over 800k triangles are not checked.
- The problem-area overlay and the brim preview are hidden while Explode or Layout moves parts away from their print positions.
- Fixed in Session 29: the "Bigger than the print bed" check now measures the parts where they print (laid out, turned), not where the view shows them. The layered lightbox's row of layers is still wider than most beds with many layers, and now says so.
- The Optimize turn and the brim have been checked on exported geometry (closed, outward, on the bed, same volume) but not yet in a real slicer.
- **Jigsaw: not yet printed.** The gap is exact in the geometry (within 0.02 mm), but the right default for real printers (0.25 mm) needs a test print on at least one printer; so does the engraved-label depth and whether the first-layer squish fuses pieces with the slicer's own elephant-foot compensation.
- Jigsaw: all pieces are one object with one part per filament in the 3mf, so a slicer cannot arrange pieces separately; a puzzle bigger than the bed is flagged but not split.
- Jigsaw face down ignores the extra first-layer gap (the first layers are the picture there), and the preview then shows the back.
- **Lithophanes: not yet printed.** The geometry is exact (see Session 9), but the default thicknesses (0.8 / 3 mm), the backlit preview's look and the 0.3 mm default detail need a test print in white PLA at 100% infill, standing and lying flat.
- The lithophane's upright slope limit changes the picture slightly under dark areas (2.9% of points on the photo-like test picture; a hard black-over-white edge gets a 2.4 mm soft band). Lying flat keeps every edge sharp, at the cost of visible layer steps in the relief.
- A standing heart lithophane needs a 40 mm cradle (its underside stays gentler than 45° almost to the lobes); the panel suggests lying flat. A standing oval needs 16 mm.
- The grid cap (380k points, 190k curved) coarsens big lithophanes: 250 mm flat at 0.36 mm, 250 mm curved at 0.50 mm, a 200 × 250 mm lamp shade at 0.65 mm (coarser than a 0.4 mm nozzle). The Detail page says so.
- Other artwork is not stamped onto a lithophane (by design, as with the jigsaw).

## Suggested plan

1. Test one export in PrusaSlicer, OrcaSlicer and Bambu Studio (PrusaSlicer 2.7 installs from apt in a Linux container and can slice from the command line: a low priority for the user). Print the Session 12 box fit test, a small jigsaw (12 pieces, 0.25 mm gap), the lithophane test strip and a 60 mm standing lithophane, and adjust the defaults from the results. Open the app in Firefox and Safari once. (Chromium is covered by `tools-browser-check.js` since Session 12.)
2. Tracer v3: reference objects (credit card, coin), bosses/counterbores, lens-distortion correction. (Done: paper scaling with perspective correction, sub-pixel corners, hand brush, SVG/DXF, fitted-edge sizes and fitted-edge scaling in measurement mode.) Test with a real phone photo of a part on paper and compare the step-6 table with calipers.
3. ~~Printability checker~~ (done, Session 7). In a real browser: check the red/blue overlay draws on top of the faces and Optimize's busy indicator; import a turned model and a brim into a slicer.
4. ~~Lithophane generator~~ (done, Session 9). In a real browser: check the backlit preview and print one flat and one lamp shade; adjust the default thicknesses and the preview constant from the result.
5. P7 section improvements, one generator at a time, each followed by `tools-audit.js` for that generator.
6. ~~Phone case generator~~ (done, Session 13). Print the fit test rim for a phone you have and check the button and camera positions; correct `PHONES`/`PHONE_FAMILY` from the result.
7. Open a painted 3mf (the vase with height bands, and a brushed import) in Bambu Studio, OrcaSlicer and PrusaSlicer and check that the colours show as painted.
8. Colour the owner's real figurine from a real photo (front and back), print it, and note where the fit or the colours went wrong: that decides between a lasso for busy backgrounds, a perspective fit and per-part fitting.
9. Linux desktop packaging (Tauri is lighter than Electron; the app is already a single HTML file).

Always run after changes: `python3 build.py && node tools-smoke-test.js index.html && node tools-audit.js index.html <generator>`, and `npm run check:browser` for anything visual or text-related (plus `npm run test:jigsaw` for jigsaw work or anything touching `traceField`/`fieldToPolys`, `npm run test:litho` for lithophane work or anything touching `heightSheet`, `ringField` or `checkMesh`, `npm run test:tracer` for tracer work, `npm run test:print` for anything touching geometry or export, and `node tools-print-survey.js index.html` after a generator change to see whether it introduced new printability warnings; in the chat sandbox, split the smoke test with `ONLY=` as described in Session 6).
