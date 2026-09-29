# Maker Forge

Browser-based, MIT-licensed studio for multi-colour 3D printing (keychains, name plates, photo tracing,
jigsaw puzzles, lithophanes, enclosures, and more). Runs entirely client-side as one HTML file.

**Full history, architecture notes, known bugs and the roadmap are in `HANDOFF.md`.** Read its
"Project overview", "Unfinished", "Known bugs and issues" and "Suggested plan" sections before starting
new work, and read the relevant "Session N" section before touching that feature.

## Layout

- `src/core.js` – geometry library, no DOM, exposed as `window.PRCore`. Runs in Node for tests.
- `src/app.html` – UI, state, generators, export. Contains the placeholders `/*CORE*/` and `/*FONTS*/{}`.
- `build.py` – inlines `src/core.js`, `src/examples.js`, the Start pictures (`examples/start-thumbs.json`), the manual
  (`MANUAL.md`, as HTML) and the fonts in `fonts/` (with their licences) into `src/app.html` → `index.html`.
- `src/examples.js` – the example pictures (drawn in code) and which Start button opens which (Session 19).
- `MANUAL.md` – the user manual, also shown inside the app; `CHANGELOG.md` – what's new, for users.
- `fonts/` – the built-in fonts as WOFF2 files and `LICENSES.md`, copied from the @fontsource packages by
  `npm run fonts` (`tools-fonts.js`). Run it after adding a font to `FONTS`.
- `index.html` – the built single-file app. **Generated: edit `src/`, never `index.html` directly.**
- `tools-*.js` – headless tests (jsdom + a software canvas stub in `tools-test-env.js`), plus
  `tools-browser-check.js`, which runs the app in real Chromium.

## Setup

```
npm install          # dev deps only: jsdom, three@0.128.0, earcut@2.2.4, jszip@3.10.1, onnxruntime-web@1.30.0 (tests), @fontsource/* (npm run fonts)
python3 build.py
```

## Always run after changes

```
python3 build.py && node tools-smoke-test.js index.html && node tools-audit.js index.html <generator>
```

Plus, depending on what changed:

- tracer work → `npm run test:tracer`
- anything touching geometry or export → `npm run test:print`
- jigsaw work, or `traceField` / `fieldToPolys` → `npm run test:jigsaw`
- lithophane work, or `heightSheet` / `ringField` / `checkMesh` → `npm run test:litho`
- enclosure work → `npm run test:enclosure`
- painter work, or `meshEditor` / the paint steps / 3mf or OBJ reading and writing → `npm run test:paint`
- phone case work, or `PHONES` / `heightSheet` → `npm run test:phonecase`
- pictures on objects (placement, the Art tab), or the keys that move artwork → `npm run test:art`
- colour from a photo (the `photo*` functions in `src/core.js`, the Paint tab's photo step) or the AI figure finder
  (`AI_FIGURE`, `models/`) → `npm run test:photo` (`CORE=1` for the engine only; the test figure and its photos are in
  `tools-photo-figure.js`; the model runs in Node through the `onnxruntime-web` dev dependency)
- opening models with their own colours (GLB/glTF, OBJ with vertex colours or an MTL picture: `parseGLB`, `parseGLTF`,
  `parseOBJColours`, `modelTriColours`, the Paint tab's "model" step) or the AI cut-out → `npm run test:aimodel` for
  the models (`CORE=1` for the readers only) and `npm run test:photo` for the cut-out
- picking (`meshBVH`, `bvhRaycast`, `boxedRaycast`), the helper thread (`onHelper`, the `prcore` script) or the draw loop
  (`viewSnapshot`) → `npm run test:speed` (`CORE=1` for the boxes only) and `npm run check:browser` (the only place
  with a real Web Worker)
- new settings, `sanitizeProject`, `LIMITS` / `LIMITS_AT`, or `DEFAULTS` → `npm run test:project` (every quick start and object
  must come back unchanged from a saved project, and out-of-range values must not make a build run away)
- after any generator change → `node tools-print-survey.js index.html` (look for new warnings)
- anything visual, text or fonts, the 3D view or view tools → `npm run check:browser` (Chromium via Playwright;
  screenshots and `report.html` land in `browser-check/`, which is git-ignored)
- an example (`src/examples.js`) or anything that changes how an example looks → `npm run thumbs` (then build again)
  and, if the README or manual shows it, `npm run screenshots`
- a change a user would notice → update `MANUAL.md` and `CHANGELOG.md`

Smoke test options: `QUICK=1`, `ONLY=tracer,board`, `PAGES=0-3`, `VERBOSE=1`. Lithophane and jigsaw
tests accept `CORE=1` for the fast geometry-only part.

## Conventions

- Keep the app a single self-contained file with no build toolchain beyond `build.py`.
  Runtime libraries load from CDNs (three.js r128, OrbitControls, earcut 2.2.4, JSZip 3.10.1; ONNX Runtime Web 1.30.0
  only when the AI figure finder is asked for, checked by SHA-256 in `AI_FIGURE`). The fonts are
  built in (`fonts/`, packed by `build.py`, used by `fontFaceCSS` in `src/app.html`); the page never downloads a font.
- Every new generator control must actually change the model (the audit flags "dead controls").
- Every loaded project goes through `sanitizeProject`: clamp numbers, never inject markup.
  New settings need clamping and a hostile-project test like the existing ones.
- Exported meshes must be closed, outward-facing, NaN-free and sitting on the bed.
- UI text is plain and friendly, written for makers rather than engineers.
- Bump `version` in `package.json` for each release and add a "Session N" section to `HANDOFF.md`
  describing what changed, what was tested and anything left unfinished.
- Open a new pull request for every version release (the owner asked for this in Session 20).
- Every release note, the `CHANGELOG.md` entry and the pull request description alike, lists that release's bug fixes
  under **Fixed**, one line each, as a user would notice them (asked for in Session 21).
- Updating ONNX Runtime Web or the model means new SHA-256 values in `AI_FIGURE` (`src/app.html`) and in `models/LICENSE.md`.
- Tests run headlessly only; say clearly when something still needs checking in a real browser,
  slicer or on a real print.
