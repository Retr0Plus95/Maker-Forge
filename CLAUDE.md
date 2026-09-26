# Maker Forge

Browser-based, MIT-licensed studio for multi-colour 3D printing (keychains, name plates, photo tracing,
jigsaw puzzles, lithophanes, enclosures, and more). Runs entirely client-side as one HTML file.

**Full history, architecture notes, known bugs and the roadmap are in `HANDOFF.md`.** Read its
"Project overview", "Unfinished", "Known bugs and issues" and "Suggested plan" sections before starting
new work, and read the relevant "Session N" section before touching that feature.

## Layout

- `src/core.js` – geometry library, no DOM, exposed as `window.PRCore`. Runs in Node for tests.
- `src/app.html` – UI, state, generators, export. Contains the placeholder `/*CORE*/`.
- `build.py` – inlines `src/core.js` into `src/app.html` → `index.html`.
- `index.html` – the built single-file app. **Generated: edit `src/`, never `index.html` directly.**
- `tools-*.js` – headless tests (jsdom + a software canvas stub in `tools-test-env.js`), plus
  `tools-browser-check.js`, which runs the app in real Chromium.

## Setup

```
npm install          # test deps only: jsdom, three@0.128.0, earcut@2.2.4, jszip@3.10.1, the @fontsource fonts
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
- after any generator change → `node tools-print-survey.js index.html` (look for new warnings)
- anything visual, text or fonts, the 3D view or view tools → `npm run check:browser` (Chromium via Playwright;
  screenshots and `report.html` land in `browser-check/`, which is git-ignored)

Smoke test options: `QUICK=1`, `ONLY=tracer,board`, `PAGES=0-3`, `VERBOSE=1`. Lithophane and jigsaw
tests accept `CORE=1` for the fast geometry-only part.

## Conventions

- Keep the app a single self-contained file with no build toolchain beyond `build.py`.
  Runtime libraries load from CDNs (three.js r128, OrbitControls, earcut 2.2.4, JSZip 3.10.1), and the fonts
  from the @fontsource 5.3.0 packages on jsDelivr (`fontFaceCSS` in `src/app.html`; no Google Fonts).
- Every new generator control must actually change the model (the audit flags "dead controls").
- Every loaded project goes through `sanitizeProject`: clamp numbers, never inject markup.
  New settings need clamping and a hostile-project test like the existing ones.
- Exported meshes must be closed, outward-facing, NaN-free and sitting on the bed.
- UI text is plain and friendly, written for makers rather than engineers.
- Bump `version` in `package.json` for each release and add a "Session N" section to `HANDOFF.md`
  describing what changed, what was tested and anything left unfinished.
- Tests run headlessly only; say clearly when something still needs checking in a real browser,
  slicer or on a real print.
