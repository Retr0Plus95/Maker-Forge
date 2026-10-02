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
| `tools-enclosure-test.js` | Project boxes (Sessions 11 and 12): sizes and volumes, 30 opening kinds on 4 faces, placement messages, screws, lids and heads, boards, labels, magnets, feet, pointed tops, notches, the sliding lid, the lid logo, the fit test, the presets, the rulers, hostile project files. |
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

**Project box**
1. Logo on the lid: pick an artwork and emboss, engrave or inlay it (reuse the tracer's flush-inlay code) in a second colour. (done, Session 12: inlay or engraved; not embossed, the lid prints face down)
2. Text labels next to openings ("USB-C", "ON/OFF", "12V") engraved 0.4 mm into the wall, one field per opening. (done, Session 12)
3. Snap-fit lid: flexible cantilever hooks on the lip and matching windows in the walls, no screws.
4. Sliding lid: grooves in two walls, a lid that slides in, optional finger notch and end stop. (done, Session 12; no end stop yet)
5. Hinged lid: print-in-place pin hinge along the back edge, printed as one piece with clearance.
6. Board ghost: draw the chosen board (and its USB, HDMI, header positions) as a see-through preview in the box, and one-click "add openings for this board's ports" that lines them up automatically.
7. Import a board outline and mounting holes from a KiCad `.kicad_pcb` or a Gerber edge-cuts file.
8. Battery bays: 18650 / 21700 / AA / 9V holders with spring slots and wire channels, as a floor insert.
9. Magnet pockets in the corners of the lid and box (6 × 3, 8 × 2 …), sized for press-fit with a glue gap. (done, Session 12: magnet lid)
10. Gasket groove for a TPU seal and a separate printable TPU gasket: splash-proof boxes.
11. Wall-mount tabs and DIN-rail clips on the back; a VESA 75/100 pattern for screens.
12. Feet: rubber-foot recesses in the floor, or printed feet with a chamfer, and cable exit notches in the wall top edge. (done, Session 12: foot recesses and notches to the top edge; printed feet not done)
13. Split tall boxes into rings that stack and screw together when the box is taller than the printer.
14. Ribs and bosses anywhere: click on a wall to add an M3 boss or a PCB guide rail (card-guide slots for boards that slide in).
15. Knob generator: printed knobs for 6 mm D-shaft and 18T knurled pots, with a pointer line, in the second colour.

**Tracer**
16. Hanging hole, keychain loop or bail on the back plate, placed automatically where there's room. (done, Session 12: hole and loop; no bail)
17. Screw bosses and counterbored mounting holes on the back plate (reuse the enclosure's SCREWS table). (done, Session 12: 2 or 4 countersunk holes; no bosses yet)
18. Reference object scaling: a coin or credit card in the photo sets the scale (known sizes built in).
19. Multi-level tracing: several brightness bands become stacked layers, each its own height and colour.
20. SVG import: skip the photo and trace a real vector logo exactly. (partly, Session 12: drawn sharp at 2000 px with its real size; still rasterised, not read as paths)
21. Stand for the traced shape: a slot base so a logo stands on a desk.
22. Mirror-pair export: part and its mirror image side by side (left and right brackets).
23. Stroke-thicken for logos with hairlines: minimum line width so nothing prints thinner than two perimeters. (done, Session 12)
24. Cookie-stamp mode: the traced logo as a raised stamp with a handle on the back.
25. Hollow cover with a lip or snap ring so it clicks onto the thing it covers; "fits over an object of W × D" mode where the inside, not the outside, gets the typed size.
26. Keep the colours: trace each colour of a multi-colour logo to its own part and filament slot. (done, Session 12: a coloured face on a body)
27. Live caliper overlay: show the measured dimensions on the picture as you hover edges.

**Rulers and measuring**
28. A measuring tape tool: click two points on the model, get the distance (and angle). (done, Session 12; no angle yet)
29. Section view: a slider that cuts the model at a height to show wall thickness and internal posts. (done, Session 12)
30. Ghost of a reference object on the bed (a credit card, an AA battery, a hand) for instant scale.
31. Grid snapping in the enclosure: drag openings on a 2D face view with snapping to 0.5 mm and to other openings' centres.
32. An inch ruler when the units setting is inches. (done, Session 12)

**Lithophane**
33. Colour lithophane (CMYK-style layered filament swap) for printers with an AMS.
34. Heart, circle and hexagon night-light boxes with a built-in LED tea-light holder.
35. Moon and globe lithophanes (sphere mapping) with a stand.
36. Frame for a flat lithophane with a slot for an LED strip and a USB-C opening (reuse the enclosure openings).

**Jigsaw, name plates, flat shapes**
37. Jigsaw puzzle box: a lid with the picture on it and a tray (reuse the enclosure lid).
38. "Missing piece" gift puzzle: one piece with a personal message on the back in a second colour.
39. Name plate with a USB-C cable holder or a magnet pocket for the fridge.
40. Door sign with screw holes and a keyhole on the back.
41. Coaster set generator: flat shape + artwork + cork recess on the bottom.
42. Batch name plates from a CSV (a class, a wedding): one plate per name, packed onto the bed. (done, Session 12)

**Printability and export**
43. Auto-orient for boxes: choose the face that needs the least bridging for each lid and panel.
44. Bridge-aware openings: when a wall opening is wider than the bridge limit, offer a pointed or arched top automatically. (done, Session 12: pointed tops, square-top port holes, notches)
45. Per-part print settings in the 3MF (for example 100 % infill on screw posts, a modifier volume for insert bosses).
46. Print a test coupon: a small plate with the chosen insert hole, a USB-C cutout and a lid-lip sample, to dial in fits before printing the box. (done, Session 12: the fit-test box)
47. Export a PDF assembly sheet: dimensions, screw list (4 × M3 × 8 countersunk, 4 inserts), and a picture of each face.
48. Bambu colour mapping: try `m:colorgroup` in the 3MF so Bambu's filament mapping dialog appears.
49. Share link: pack the project into a URL so a friend can open the same box. (done, Session 12: pictures left out)
50. A community parts library: the CUTOUTS table as a JSON file users can extend (their own modules, with photos), imported and exported from the Project tab.


### 50 more ideas (Session 13)

Painter
1. Colour AI-generated models: read OBJ vertex colours and GLB/glTF textures, then quantise to the loaded filaments.
2. Wrap a picture round a model (cylindrical and spherical projection), not only straight through it.
3. Export sub-triangle paint (TriangleSelector split trees) so edges are exact without refining the mesh: smaller files.
4. A layer preview: slide through the heights and see each layer's colours, with the number of colour changes.
5. A purge and waste estimate per printer type (AMS, CFS, tool changer), and a "fewer changes" option that merges thin bands.
6. Height bands as colour-change pauses (M600) for single-nozzle printers without an AMS, exported per slicer.
7. A box select: drag a rectangle on the view to paint everything inside it (front faces or all the way through).
8. Radial symmetry (4, 6, 8 ways) for mandalas and vases, and front / back mirroring.
9. A brush that stops at sharp edges ("magnetic"), and a soft brush that paints only faces within an angle of the first.
10. Colour by curvature (edges and hollows darker) for weathered, stone and wood looks.
11. Named paint layers that can be hidden and shown, and strokes grouped per layer.
12. A BVH for raycasting, so brushing a million-triangle model stays smooth.
13. Keep paint when the imported model is scaled or mirrored (paint in model space: it already follows scale; check mirror).
14. Paint by picking a colour on the model (eyedropper) and "select all of this colour".
15. Save the imported model inside the project file (compressed), so a painted import reopens without the original file.

Phone cases
16. Flexible button covers (raised TPU bumps) instead of holes.
17. A raised camera guard ring printed with a 45° inside chamfer.
18. A MagSafe ring recess in the back, and a strap loop or lanyard holes at the bottom corners.
19. A card pocket on the back, and a print-in-place kickstand.
20. Measure a phone that is not in the list from a photo on paper (the tracer's paper scaling), camera included.
21. Exact camera and button positions from Apple's and Samsung's accessory design guidelines, checked with real phones.
22. Tablets (iPad, Galaxy Tab), e-readers and game controllers.
23. Grip textures on the sides and a name engraved or painted on the back.

Printers and slicing
24. Dual-nozzle beds: narrow the bed automatically when both nozzles are used (X2D, H2D, H2C), and show exclusion zones (the A1's purge area).
25. Put the printer and plate settings into the 3mf, so Bambu Studio and PrusaSlicer open with the right printer.
26. A "my spools" library: brand, colour code, material and price, used for the palette and cost.
27. Material presets that set fit clearances (TPU cases, PETG boxes, PLA snap fits).
28. Test one painted export in each slicer from the command line (PrusaSlicer and OrcaSlicer both have a CLI) in the test suite.

Easy to use
29. A guided mode: a few big questions (what, for whom, which colours) that set everything up.
30. Describe the model in words for screen readers (size, parts, colours, warnings) and announce each finished build.
31. Keyboard control of the 3D view (arrows turn, + and − zoom) with a visible focus ring on the view.
32. A search box for settings.
33. Colour-blind friendly palettes and a pattern overlay in the view to tell filaments apart.
34. A tablet layout with bottom sheets and bigger touch targets.
35. An undo list with named steps.
36. Every warning with a small picture of the problem and the fix.
37. Translations, with right-to-left layout for Arabic and Hebrew.
38. Remember the last page per object between visits, and a "recently made" row.

Speed and reliability
39. Move tracing, refining, painting and the printability check into a Web Worker, so the page never freezes.
40. Save to IndexedDB with the last five versions, instead of one localStorage entry with a size limit.
41. Work offline as an installable app (service worker, fonts and libraries cached).
42. A memory guard: warn before an import or a paint detail would use more than the browser can give.
43. Run the real-browser check in CI on every push, with screenshots attached to the pull request.

New tools
44. Gridfinity bins with labels in a second colour.
45. Cable clips, cable tags and wall hooks from a diameter and a screw size.
46. Plant pots with saucers and drainage, painted with the fade or stripes.
47. Knobs and keycaps with inlaid text or symbols.
48. Colour lithophanes (a CMY layer stack behind white).
49. Stencils and cookie stamps from the tracer, with bridges added automatically.
50. Topographic relief maps from an elevation picture, painted by height.

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

## Unfinished (in priority order)

- **P4**: none outstanding beyond polish.
- **P5**: an actual 3D view cube widget; dimension lines drawn along the model; bed resize already follows the printer; more layout modes next to Explode (e.g. lay layered parts flat).
- **P6**: done in Session 19: example images for every start. Still open: picking several pictures for use in other sections (the `enabled` flag is the start of this); traceable pictures on keychains (silhouette mode exists via "Print it in its own colours" off).
- **P7**: all section improvements (Double-Sided Name rename and mirrored back plate, iron-on patch shapes and military badges and premade patches, Christmas ornaments, caricature bobble head, name/letter lightbox and more box styles, photo frame back panel and clear front and relief panel, tea light egg/round shapes and picture positioning and candle ring and wagon-lantern cover and separate walls, plastic canvas fitting, functional PCB with conductive filament and copper-sheet workflow and Gerber import, car badge shapes and two-sided car keychain).
- **P8**: done in Session 13 (phone cases). Next: button covers, camera guard ring, MagSafe recess, exact positions from the makers' design guidelines (ideas 16 to 23 above).
- Painter next steps: done in Session 18: box select (7), radial symmetry (8), the smart brush (9), curvature (10), the eyedropper and recolour (14), a wrapped picture (2), a layer preview with colour changes and waste (4, 5). AI-model textures (1) were done in Session 20. Still open: sub-triangle export (3), height bands as M600 pauses (6), named layers (11), a BVH (12), mirror-safe paint (13). Opening painted exports in Bambu Studio, OrcaSlicer and PrusaSlicer is still to be done by hand.
- Asked for in Session 18, still next in line (the manual and the examples were done in Session 19; the AI cut-out, GLB and OBJ colours and the hand-fixed outline in Session 20; a BVH, drawing on change and a first helper thread in Session 22; close-up photos in Sessions 23 and 24): moving the builds to the helper thread (see Session 22); Manifold cutting and engraving; sub-triangle paint export if it can be checked against a slicer.
- Examples next steps: an example for Import a model (a small painted figure); the unused moonlit-forest relief could go on a lithophane-style tea light; examples in the dark theme's pictures (the Start pictures are rendered on a clear background, so they suit both).
- Lithophane next steps: the test strip exists (Session 12); use a printed one to calibrate the preview's transmission constant (1.3 per mm is a guess); colour lithophanes (a thin colour layer behind a white sheet, or filament-swap layers); a lithophane puzzle (joins the jigsaw's single-colour idea); for the lamp shade, *stretch once round* as an alternative to repeating copies, a base ring that sits on an LED tea light, and a lid; an engraved name on the border or foot; a separate slotted stand instead of one printed with the sheet; a *keep proportions* option for the heart (it is stretched to the picture's aspect, like the jigsaw's heart); decimating flat areas (border, blank gaps, smooth sky) so big sheets need not be coarsened.
- Jigsaw next steps: a lithophane or relief puzzle for single-colour printers (the picture as thickness, backlit); whimsy pieces (a heart, a star or the picture's own subject cut out as one piece); knob shapes from a symbol; split a puzzle bigger than the bed into plates of whole pieces; an optional "print spread out" layout with wider spacing; two-sided puzzles (a second picture on the back); drop colour slivers narrower than the nozzle inside each piece; the heart outline is stretched to the picture's aspect ratio (a "keep proportions" option would crop instead).
- Printability follow-ups: fillets were in the original idea next to the brim and were not done. Optimize keeps the yaw the rotation gives; it does not yet turn the model on the bed to fit or to line up with the bed axes. (Session 12 fixed the vase profile and added the "Turned for printing" note.) A flat ceiling whose ends meet small rounded corners is not seen as anchored (the rounded corner has no material right beside the ceiling), so it reads as support; the box generator avoids it with square-top port holes, but the checker could count small steep corners as anchors.
- **P9**: retro emojis, pixel art, themes, more retro fonts, animations, printing instructions, performance work.
- Tracer next steps: credit-card and coin references for parts bigger than a sheet; fillets and chamfers; a second extrusion level (bosses, counterbores); lens-distortion correction for wide phone cameras; reading SVG paths as vectors instead of drawing them. (Back plates were done in Session 11; holes, loops, screws, colours and line thickening in Session 12.)
- Project box next steps: snap-fit and hinged lids (ideas 3 and 5), an end stop for the sliding lid, the board ghost with one-click port openings (idea 6), battery bays, wall mounts, a raised logo on a lid printed face up.
- Name plates from a list: every name is a part of one object; a slicer cannot move them one by one. Packing is simple rows; a bed-full list is flagged, not split onto several plates.

## Known bugs and issues

- Enclosure opening sizes are typical datasheet values: modules differ between makers, verify with calipers (Session 11).
- Enclosure: wall openings wider than the bridge limit (default 10 mm, e.g. USB-A, LCD bezels) are reported as needing support; the Openings page offers a pointed top or a notch for ports and rectangles (Session 12), but snap-in parts keep their flat tops. The PSU box preset still reads about 600 mm² (fan rings, IEC inlet, rocker, voltmeter). Honeycomb fan grilles are worse (their pointy-top hexagons have 30° roofs).
- Enclosure: artwork goes on the lid only (inlay or engraved), not on the walls.
- Enclosure, Session 12 fits not yet printed: magnet pockets (+0.2 mm on diameter and depth), the sliding lid's 0.2 mm gap and 45° rails, foot recesses, 0.4 mm label depth and 0.6 mm label lines, the lid logo in its first layers. Print the fit test first.
- Enclosure, Session 13 not yet printed: the pilot-light jewel lens (the shank's corners have 0.15 mm of play a side plus the clearance, the LED pocket 0.1 mm a side, so a 5 mm LED's 5.8 mm base rim stays outside it). Print one lens and a scrap of wall with its hole before a whole box.
- Tracer hollow cover: strokes thinner than two walls stay solid (by design, noted in the panel).
- **AI figure finder** (Session 17): it marks the photo's most eye-catching object, not specifically the figure, and fills hollows: a bright object touching the figure, a stand, a hand or a shadow can be taken in, and the fit then comes out a few percent too big (the worst-case test: 2.9%). Nudge it, or add a second photo. The model loads from jsDelivr's copy of this repository's `main` branch; the repository is public and `models/u2netp.onnx` is on `main` (checked in Session 21), so that address should work. The live address has not been fetched from the test container, where jsDelivr is blocked; the browser check serves a local copy. A copy of `models/` next to `index.html` works too. The AI cut-out (Session 20) uses the same model and has the same limits: it keeps the most eye-catching object, which may not be the one you meant.
- **Colour from a photo** (Session 16): tested on rendered photos only. Since Session 23 the fit allows for a close camera (perspective, not lens distortion), so strong perspective (a phone held close) and a pose that differs from the model line up less well; white or pale parts on a pale background lower the outline match (the colours still come from inside the model's outline). On a model of several parts made here, each part's depth test sees only that part (imported models are one part). Parts no photo shows are a guess from the nearest colour: add a photo of the back. Changing the model's shape (not only its size) after lining up needs "Line it up again".

- **Bambu 3mf in Bambu Studio** (tested by the user, Session 10): geometry and colours load, with the standard notice for third-party files (*not from Bambu Lab, load geometry data and color data only*); see Session 10 for why that notice cannot be removed safely. The filament colours themselves come from the user's Bambu Studio setup, not from the file.
- Everything is tested headlessly: in jsdom with a canvas stub (letters are boxes, `ctx.filter` ignored), and since Session 12 also in headless Chromium with software WebGL (`tools-browser-check.js`: real fonts, real canvas, the 3D view, screenshots). Firefox, Safari, real GPUs, touch input and slicers are still unchecked. Emoji charms in Chromium on Linux use Noto Color Emoji.
- The name plate default mesh grew to about 20k triangles after smoothing (charms and plate). Fine for slicers, but could be decimated further.
- Emoji charms depend on the system emoji font; results differ between Windows, macOS and Linux.
- The audit lists expected "unchanged" controls separately with the reason (see Session 6); anything under FINDINGS is new.
- The icon glyphs in the rail are text symbols chosen by regex on the page title; some pages fall back to their first letter. A proper SVG icon set would look better.
- Background separation assumes the part does not share its colour with the background; the hand brush is the workaround.
- Paper mode is accurate (area within 0.06%, edge-to-edge size within 0.06 mm on the angled A4 test, see Session 6).
- Since Session 12 `traceField(…, closeEdges)` closes a region that reaches the grid's edge along that edge; the tracer and the name plate ask for it. Everything else keeps the old behaviour: open chains closed by straight chords, and a region covering the whole border (a picture's background) traced to no outline, which the picture decals rely on. The tracer still refuses a mask that covers over half the picture's border, as "the background was picked".
- `fitDimensions` treats a very gently bowed side (bow under about half a photo pixel) as flat, so its "edge to edge" size is the mean of the bow, not the peak.
- The tracer test photos are hard-edged renders; real camera photos have soft edges, so real-world numbers still need a check against calipers.
- The keychain's "picture beside the name" still uses the flood-fill `cutoutCanvas`, which can leak into photos with noisy, low-contrast subjects. The tracer's colour key is a candidate replacement.
- `jsdom` cannot run JSZip's async zip generation in-realm, so zip contents are verified separately in Node.
- Printability is a heuristic, not a slicer: the overhang limit is one angle for the whole model, bridges are judged by anchors on two sides (not by bridge direction or cooling), thin walls are found in up to 7 slices per part at a resolution of `max(nozzle/4, extent/1200)` (coarser than nozzle/2.5 on parts over about 130 mm), and support area is the area of the faces, not the support volume. Models over 800k triangles are not checked.
- The problem-area overlay and the brim preview are hidden while Explode or Layout moves parts away from their print positions.
- The "Bigger than the print bed" check measures the parts where the view shows them (`partOffset`), but the files always use the laid-out positions (`p.layout`): with Layout off, a model whose parts are laid out wider than the bed passes the check and exports too big. Seen on the lightbox (fixed by a tighter layout in Session 19); the layered lightbox's row of layers is still wider than most beds. The check should use the layout positions.
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
