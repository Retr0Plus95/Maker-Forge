// Jigsaw puzzles: the cut on its own (exact tiling, the same seed gives the same puzzle, the gap
// measured on the finished pieces, shaped outlines, labels, the SVG), then the generator in the app
// (parts, Shuffle, frame and tray, face down, export, a hostile project file).
//   node tools-jigsaw-test.js index.html          (CORE=1 runs only the geometry part)
const fs = require("fs");
const file = process.argv[2] || "index.html";
let src = fs.readFileSync(file, "utf8");
if (/\.html?$/.test(file)) { const s = src.indexOf("(function (global) {"); src = src.slice(s, src.indexOf("</script>", s)); }
globalThis.earcut = require("earcut");
new Function(src)();
const C = globalThis.PRCore;
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const inRing = (R, x, y) => { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const a = R[i], b = R[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const inPolys = (polys, x, y) => polys.some(p => inRing(p.outer, x, y) && !p.holes.some(h => inRing(h, x, y)));
const polyArea = polys => polys.reduce((a, p) => a + Math.abs(C.area2(p.outer)) - p.holes.reduce((b, h) => b + Math.abs(C.area2(h)), 0), 0);
const cutLength = cut => cut.cuts.reduce((a, L) => { let l = 0; for (let k = 1; k < L.length; k++) l += Math.hypot(L[k][0] - L[k - 1][0], L[k][1] - L[k - 1][1]); return a + l; }, 0);
let seed = 12345; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const make = o => { const g = C.jigsawGrid(o.count || 24, o.w, o.h); return C.jigsawCut(Object.assign({ nx: g.nx, ny: g.ny, seed: 7, vary: 0.6, knob: 1, style: "classic", gap: 0.25 }, o)); };

console.log("grid");
for (const [n, w, h, want] of [[48, 150, 100, "8x6"], [12, 120, 90, "4x3"], [4, 100, 100, "2x2"], [100, 150, 100, "12x8"]]) {
  const g = C.jigsawGrid(n, w, h);
  check(`${g.nx}x${g.ny}` === want, `${n} pieces on ${w} x ${h} mm`, `${g.nx}x${g.ny}`);
}
{ let worst = 0; for (let n = 12; n <= 400; n += 7) { const g = C.jigsawGrid(n, 160, 90), r = (160 / g.nx) / (90 / g.ny); worst = Math.max(worst, Math.abs(Math.log(r))); }
  check(worst < Math.log(1.4), "pieces stay near square for every count from 12 to 400", `worst aspect ${Math.exp(worst).toFixed(2)}`); }

console.log("\nthe cut tiles the rectangle exactly");
for (const style of ["classic", "round", "square"]) for (const vary of [0, 0.6, 1]) {
  const cut = make({ w: 150, h: 100, count: 48, style, vary, seed: 3 + vary * 10 });
  const area = cut.pieces.reduce((a, p) => a + p.rings.reduce((b, r) => b + C.area2(r), 0), 0);
  let bad = 0;
  for (let k = 0; k < 3000; k++) {
    const x = (rnd() - 0.5) * 149.9, y = (rnd() - 0.5) * 99.9;
    if (cut.pieces.filter(p => p.rings.some(r => inRing(r, x, y))).length !== 1) bad++;
  }
  check(near(area, 15000, 1e-6) && bad === 0 && cut.pieces.length === 48, `${style}, ${vary * 100}% variation: 48 pieces, areas sum to 15000 mm², every point in exactly one piece`, `${area.toFixed(4)} mm², ${bad} bad points`);
}

console.log("\nthe same seed gives the same puzzle");
{ const a = JSON.stringify(make({ w: 120, h: 80, seed: 99 }).pieces), b = JSON.stringify(make({ w: 120, h: 80, seed: 99 }).pieces), c = JSON.stringify(make({ w: 120, h: 80, seed: 100 }).pieces);
  check(a === b, "seed 99 twice: identical");
  check(a !== c, "seed 100: a different cut");
  const k1 = make({ w: 120, h: 80, seed: 5, style: "round" }), k2 = make({ w: 120, h: 80, seed: 5, style: "classic" });
  check(k1.cuts.length === k2.cuts.length && JSON.stringify(k1.pieces.map(p => p.label)) === JSON.stringify(k2.pieces.map(p => p.label)), "changing the knob style keeps the layout"); }
{ // knobs point both ways, roughly half and half
  const cut = make({ w: 300, h: 200, count: 150, seed: 11 });
  let out = 0, all = 0;
  cut.cuts.forEach(L => { const a = L[0], b = L[L.length - 1], m = L[Math.floor(L.length / 2)], side = (b[0] - a[0]) * (m[1] - a[1]) - (b[1] - a[1]) * (m[0] - a[0]); all++; if (side > 0) out++; });
  check(out / all > 0.35 && out / all < 0.65, "knobs face either way at random", `${out} of ${all} to the left`); }

console.log("\nthe finished pieces: shrunk by half the gap each");
for (const gap of [0.15, 0.25, 0.5]) {
  const cut = make({ w: 150, h: 100, count: 24, seed: 21, gap }), s = Math.min(0.15, cut.u / 180);
  const bodies = cut.pieces.map(p => C.jigsawPiece(p, { gap, s, outline: cut.clip }).body);
  const area = bodies.reduce((a, b) => a + polyArea(b), 0), want = 15000 - gap * cutLength(cut);
  check(bodies.every(b => b.length === 1 && b[0].holes.length === 0), `gap ${gap}: every piece is one solid island`, bodies.map(b => b.length).join(""));
  check(near(area, want, want * 0.0015), `gap ${gap}: area lost equals gap × cut length (the outer edge is not shrunk)`, `${area.toFixed(1)} vs ${want.toFixed(1)} mm²`);
  const bb = bodies.flat().reduce((a, p) => { p.outer.forEach(q => { a[0] = Math.min(a[0], q[0]); a[1] = Math.max(a[1], q[0]); a[2] = Math.min(a[2], q[1]); a[3] = Math.max(a[3], q[1]); }); return a; }, [Infinity, -Infinity, Infinity, -Infinity]);
  check(near(bb[1] - bb[0], 150, 0.002) && near(bb[3] - bb[2], 100, 0.002), `gap ${gap}: the finished puzzle is still exactly 150 × 100 mm`, `${(bb[1] - bb[0]).toFixed(4)} × ${(bb[3] - bb[2]).toFixed(4)}`);
  // walk along every cut: the point on the cut is in no piece, the pieces sit gap/2 either side of it
  let worst = 0, inside = 0, n = 0;
  cut.cuts.forEach(L => { for (let k = 6; k < L.length - 6; k += 5) {
    const p = L[k], q = L[k + 1], t = [q[0] - p[0], q[1] - p[1]], l = Math.hypot(t[0], t[1]) || 1, nrm = [-t[1] / l, t[0] / l];
    if (bodies.some(b => inPolys(b, p[0], p[1]))) inside++;
    for (const sg of [1, -1]) {                                   // step out until we hit plastic
      let d = 0; while (d < 2 && !bodies.some(b => inPolys(b, p[0] + sg * nrm[0] * d, p[1] + sg * nrm[1] * d))) d += 0.002;
      worst = Math.max(worst, Math.abs(d - gap / 2)); n++;
    }
  } });
  check(inside === 0 && worst < 0.03, `gap ${gap}: measured across the cut, ${gap / 2} mm to plastic on each side`, `${n} probes, worst error ${worst.toFixed(3)} mm`);
}

console.log("\nextremes stay in one piece");
for (const [knob, vary, style] of [[1.3, 1, "classic"], [1.3, 1, "round"], [0.7, 0, "square"], [1.3, 1, "square"]]) {
  let islands = 0, holes = 0;
  for (const sd of [1, 2, 3, 4]) {
    const cut = make({ w: 160, h: 90, count: 60, seed: sd, knob, vary, style });
    cut.pieces.forEach(p => { const b = C.jigsawPiece(p, { gap: 0.25, s: Math.min(0.15, cut.u / 180), outline: cut.clip }).body; if (b.length !== 1) islands++; b.forEach(q => holes += q.holes.length); });
  }
  check(islands === 0 && holes === 0, `knob ${knob}, ${vary * 100}% variation, ${style}: 240 pieces, each one island`, `${islands} split, ${holes} holes`);
}

console.log("\nshaped outlines");
const heart = (W, H) => { const r = C.ringHeart(1, 480); let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; r.forEach(p => { a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); }); return r.map(p => [(p[0] - (a + b) / 2) * W / (b - a), (p[1] - (c + d) / 2) * H / (d - c)]); };
for (const [name, ring] of [["oval", C.ringCircle(1, 360).map(p => [p[0] * 70, p[1] * 50])], ["heart", heart(140, 100)], ["hexagon", C.ringPoly(6, 1, 0).map(p => [p[0] * 70, p[1] * 50])]]) {
  for (const sd of [1, 2, 3]) {
    const cut = make({ w: 140, h: 100, count: 40, seed: sd, outline: ring }), s = Math.min(0.15, cut.u / 180);
    const bodies = cut.pieces.map(p => C.jigsawPiece(p, { gap: 0.25, s, outline: ring }).body);
    const area = bodies.reduce((a, b) => a + polyArea(b), 0), want = Math.abs(C.area2(ring)) - 0.25 * cutLength(cut);
    let outside = 0, missed = 0, twice = 0;
    for (let k = 0; k < 4000; k++) {
      const x = (rnd() - 0.5) * 140, y = (rnd() - 0.5) * 100, inO = inRing(ring, x, y);
      const hits = cut.pieces.filter(p => p.rings.some(r => inRing(r, x, y))).length;
      if (inO && hits === 0) missed++; if (hits > 1) twice++;
      if (!inO && C.ringDistance(ring, x, y) < -0.03 && bodies.some(b => inPolys(b, x, y))) outside++;
    }
    check(bodies.every(b => b.length === 1) && missed === 0 && twice === 0 && outside === 0 && near(area, want, want * 0.01),
      `${name}, seed ${sd}: ${cut.pieces.length} pieces cover it once, nothing outside, one island each`,
      `${missed} missed, ${twice} doubled, ${outside} outside, area ${area.toFixed(0)} vs ${want.toFixed(0)}, ${cut.pieces.filter(p => p.cells.length > 1).length} merged, ${cut.flattened} knobs flattened`);
  }
}
{ const ring = heart(140, 100), cut = make({ w: 140, h: 100, count: 40, seed: 2, outline: ring });
  const small = cut.pieces.map(p => { const b = C.jigsawPiece(p, { gap: 0.25, s: 0.12, outline: ring }).body; return polyArea(b) / (cut.px * cut.py); });
  check(Math.min(...small) > 0.3, "no sliver pieces along the outline", `smallest ${(Math.min(...small) * 100).toFixed(0)}% of a full piece`); }

console.log("\nlabels on the back");
{ const cut = make({ w: 150, h: 100, count: 48, seed: 4 });
  const labels = cut.pieces.map(p => p.label);
  check(labels[0] === "A1" && labels.includes("F8") && new Set(labels).size === 48 && !labels.some(l => /[IO]/.test(l)), "A1 to F8, all different, no I or O", labels.slice(0, 4).join(",") + "…" + labels[47]);
  let placed = 0, clear = Infinity;
  cut.pieces.forEach(p => {
    const r = C.jigsawPiece(p, { gap: 0.25, s: 0.12, outline: cut.clip, label: { text: p.label, height: 3, minHeight: 2.2, mirror: true, near: p.anchor } });
    if (!r.label) return; placed++;
    r.label.segs.forEach(q => { for (let t = 0; t <= 1; t += 0.1) { const x = q[0] + (q[2] - q[0]) * t, y = q[1] + (q[3] - q[1]) * t;
      if (!inPolys(r.body, x, y)) clear = -1; } });
  });
  check(placed >= 46 && clear > 0, "labels fit on (nearly) every piece and stay inside it", `${placed} of 48 placed`);
  const t = C.strokeText("A1", 0, 0, 6, false), m = C.strokeText("A1", 0, 0, 6, true);
  check(t.segs.length === m.segs.length && t.segs.every((q, k) => near(q[0], -m.segs[k][0], 1e-9) && near(q[1], m.segs[k][1], 1e-9)), "mirrored text is the exact mirror image"); }

console.log("\nmeshes and the cut-line SVG");
{ const cut = make({ w: 150, h: 100, count: 24, seed: 8 }), s = 0.12;
  const solids = cut.pieces.map(p => C.extrudePolysAt(C.jigsawPiece(p, { gap: 0.25, s, outline: cut.clip }).body, 0, 3));
  check(solids.every(m => { const r = C.checkMesh(m); return r.open === 0 && C.signedVolume(m) > 0; }), "every piece extrudes to a closed, outward mesh");
  const svg = C.jigsawSVG(cut, "Test <&>");
  check(/viewBox="0 0 160 110"/.test(svg) && (svg.match(/<path /g) || []).length === cut.cuts.length + 1 && !/NaN|undefined/.test(svg) && /Test &lt;&amp;&gt;/.test(svg),
    "SVG: true-scale mm, one path per cut plus the outline, title escaped", `${(svg.match(/<path /g) || []).length} paths`);
  const shaped = make({ w: 140, h: 100, count: 30, seed: 3, outline: C.ringCircle(1, 200).map(p => [p[0] * 70, p[1] * 50]) }), s2 = C.jigsawSVG(shaped, "oval");
  const nums = [...s2.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]);
  check(nums.every(([x, y]) => ((x - 75) / 70.02) ** 2 + ((y - 55) / 50.02) ** 2 <= 1.0001), "oval SVG: every cut is trimmed to the outline", `${nums.length} points`); }

console.log("\nhostile or odd input");
{ const cut = C.jigsawCut({ w: 50, h: 50, nx: 1, ny: 1, seed: -3, vary: NaN, knob: 99, style: "__proto__", gap: 0.2 });
  check(cut.pieces.length === 1 && cut.pieces[0].rings[0].every(p => isFinite(p[0]) && isFinite(p[1])), "one piece, style '__proto__', NaN variation: no NaN", cut.style);
  const c2 = C.jigsawCut({ w: 60, h: 40, nx: 3, ny: 2, seed: 1, style: "constructor" });
  check(c2.pieces.every(p => p.rings[0].every(q => isFinite(q[0]))), "style 'constructor' falls back to classic", c2.style); }

console.log("\ntiming");
{ const t0 = Date.now(), cut = make({ w: 200, h: 150, count: 100, seed: 5 }), t1 = Date.now(), s = Math.min(0.15, cut.u / 180);
  cut.pieces.forEach(p => C.jigsawPiece(p, { gap: 0.25, s, outline: cut.clip }));
  console.log(`  100 pieces: cut in ${t1 - t0} ms, pieces shrunk in ${Date.now() - t1} ms`); }

if (process.env.CORE) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

// ---------------------------------------------------------------- the app
const boot = require("./tools-test-env.js");
const env = boot(file);
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 600; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
async function setFile(input, name, bytes, type) {
  const f = new win.File([bytes], name, { type });
  Object.defineProperty(input, "files", { value: [f], configurable: true });
  input.dispatchEvent(new win.Event("change"));
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge;
  console.log("\nin the app");
  const choose = async v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); };
  await choose("jigsaw");
  check(MF.parts.length === 1 && MF.parts[0].name === "Pieces", "no picture yet: plain pieces", MF.parts.map(p => p.name).join(","));
  // a picture: blue disc with a yellow square on white
  const { encodePNG } = require("./tools-test-env.js"), W = 300, H = 200, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, disc = Math.hypot(x - 150, y - 100) < 80, sq = Math.abs(x - 150) < 30 && Math.abs(y - 100) < 30;
    const c = sq ? [240, 190, 30] : disc ? [30, 40, 60] : [245, 242, 235]; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
  }
  $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(50);
  const ev = new win.Event("drop", { bubbles: true, cancelable: true });
  ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "scene.png", { type: "image/png" })] };
  document.querySelector("#drop").dispatchEvent(ev);
  for (let i = 0; i < 100 && !MF.state.items.some(d => d.src); i++) await sleep(30);
  await settle();
  const C2 = MF.core, J = MF.state.base.jigsaw;
  const names = () => MF.parts.map(p => p.name).join(", ");
  check(MF.parts.length >= 3 && /Pieces/.test(names()) && /picture/.test(names()), "the picture prints in colour on the pieces", names());
  check(MF.parts.every(p => C2.checkMesh(p.solid).open === 0), "every part closed");
  const info = MF.jigsaw;
  check(info && info.count === 48 && Math.abs(info.W - 150) < 1e-6 && Math.abs(info.H - 100) < 1e-6, "48 pieces, 150 × 100 mm (longest side 150)", info && `${info.count}, ${info.W} × ${info.H}`);
  const byName = n => MF.parts.find(p => p.name === n), yr = p => { const b = C2.solidBounds(p.solid); return [b.mn[1], b.mx[1]]; };
  const pic = MF.parts.filter(p => /picture/.test(p.name));
  check(near(yr(byName("Pieces"))[0], 0, 1e-6) && near(yr(byName("Pieces"))[1], 2.4, 1e-6) && pic.every(p => near(yr(p)[0], 2.4, 1e-6) && near(yr(p)[1], 3, 1e-6)),
    "pieces 0 to 2.4 mm, picture layer 2.4 to 3 mm on top", pic.map(p => yr(p).map(v => v.toFixed(2)).join("..")).join(" "));
  const vol = MF.parts.reduce((a, p) => a + C2.checkMesh(p.solid).volume, 0), want = 3 * (15000 - 0.25 * cutLength(info.cut));
  check(near(vol, want, want * 0.004), "volume is the puzzle minus its gaps", `${vol.toFixed(0)} vs ${want.toFixed(0)} mm³`);
  check(MF.checks.list.some(r => r.t === "48 puzzle pieces"), "the checks list the pieces");
  const preview = document.querySelector("#jigsawPreview");
  $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(60);
  check(document.querySelector("#jigsawPreview") && document.querySelector("#jigsawPreview").width > 100, "the Make tab shows the cut over the picture");
  check(/48 pieces/.test((document.querySelector("#jigsawSummary") || {}).textContent || ""), "with a summary line", (document.querySelector("#jigsawSummary") || {}).textContent);

  // Shuffle: a new seed, a new cut, same count
  const before = JSON.stringify(info.cut.cuts[0]), seed0 = J.seed;
  const shuffle = $$("#panel button").find(b => /Shuffle the cut/.test(b.textContent));
  check(!!shuffle, "a Shuffle button");
  shuffle.click(); await settle();
  check(J.seed !== seed0 && JSON.stringify(MF.jigsaw.cut.cuts[0]) !== before && MF.jigsaw.count === 48, "Shuffle gives a new cut with the same count", `pattern ${seed0} -> ${J.seed}`);
  J.seed = seed0; MF.rebuild(false); await settle();
  check(JSON.stringify(MF.jigsaw.cut.cuts[0]) === before, "typing the old pattern number brings the old cut back");

  // the number of pieces, the outline, labels
  J.pieces = 12; MF.rebuild(false); await settle();
  check(MF.jigsaw.count === 12 && MF.jigsaw.nx === 4 && MF.jigsaw.ny === 3, "12 pieces: 4 × 3", `${MF.jigsaw.nx} × ${MF.jigsaw.ny}`);
  J.shape = "heart"; J.pieces = 30; MF.rebuild(false); await settle();
  check(MF.parts.every(p => C2.checkMesh(p.solid).open === 0) && MF.jigsaw.outline, "a heart-shaped puzzle builds closed", `${MF.jigsaw.count} pieces`);
  J.shape = "rect"; J.pieces = 48; J.labels = true; MF.rebuild(false); await settle();
  const body = byName("Pieces"), bb = C2.solidBounds(body.solid);
  check(MF.jigsaw.labels && MF.jigsaw.unlabelled <= 2 && C2.checkMesh(body.solid).open === 0 && near(bb.mn[1], 0, 1e-6), "labels engraved on the back, mesh closed", `${MF.jigsaw.unlabelled} without a label`);
  J.labels = false;

  // face down: the picture first, on the bed
  J.faceDown = true; MF.rebuild(false); await settle();
  const pd = MF.parts.filter(p => /picture/.test(p.name)), bd = byName("Pieces");
  check(pd.every(p => near(yr(p)[0], 0, 1e-6) && near(yr(p)[1], 0.6, 1e-6)) && near(yr(bd)[0], 0.6, 1e-6) && MF.parts.every(p => C2.checkMesh(p.solid).open === 0 && C2.signedVolume(p.solid) > 0),
    "face down: picture 0 to 0.6 mm on the bed, pieces above, meshes outward");
  J.faceDown = false;

  // frame and tray
  J.holder = "frame"; MF.rebuild(false); await settle();
  const fr = byName("Frame"), fb = fr && C2.solidBounds(fr.solid);
  check(fr && near(fb.size[0], 150 + 2 * (0.25 + J.border), 0.3) && C2.checkMesh(fr.solid).open === 0, "a frame round the puzzle, border 8 mm plus the gap", fb && fb.size.map(v => v.toFixed(1)).join(" x "));
  J.holder = "tray"; MF.rebuild(false); await settle();
  const tr = byName("Tray"), tb = tr && C2.solidBounds(tr.solid), pb = C2.solidBounds(byName("Pieces").solid);
  check(tr && C2.checkMesh(tr.solid).open === 0 && (tb.mn[2] > pb.mx[2] || tb.mn[0] > pb.mx[0]) && near(tb.mx[1], J.floor + J.thick, 1e-6), "a tray beside it, walls as tall as a piece", tb && tb.size.map(v => v.toFixed(1)).join(" x "));
  J.holder = "none";

  // the export
  MF.rebuild(false); await settle();
  const ex = MF.exportParts();
  check(ex.length === new Set(MF.parts.map(p => p.slot)).size && ex.every(q => C2.checkMesh(q).open === 0), "exported parts closed, one per filament", `${ex.length} files from ${MF.parts.length} parts`);
  check(C2.jigsawSVG(MF.jigsaw.cut, "x").length > 1000, "cut-line SVG for the zip");
  let dl = 0; const saved = win.URL.createObjectURL; win.URL.createObjectURL = () => { dl++; return "blob:x"; };
  $$("#panel button").find(b => /Cut lines \(SVG\)/.test(b.textContent)).click(); await sleep(60);
  $$("#panel button").find(b => /Box picture/.test(b.textContent)).click(); await sleep(300);
  win.URL.createObjectURL = saved;
  check(dl === 2, "the SVG and box-picture buttons each start a download", dl);

  // other artwork is never stamped across the pieces (it would glue them together)
  const runtime = new Set(["src", "thumb", "solids", "_img", "_imgKey", "_cm", "_raw", "_srcCv", "_srcSig"]);
  MF.state.items.push(Object.assign(JSON.parse(JSON.stringify(MF.state.items[0], (k, v) => runtime.has(k) ? undefined : v)), { id: 999, name: "second", src: MF.state.items[0].src, enabled: true }));
  MF.rebuild(false); await settle();
  check(!MF.parts.some(p => p.name === "Cream" || p.name === "Charcoal") && MF.parts.every(p => /Pieces|picture/.test(p.name)), "a second picture is not stamped over the puzzle", names());
  MF.state.items.pop();

  // a hostile project file
  const bad = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state, (k, v) => runtime.has(k) ? undefined : v)) };
  delete bad.state.items;
  Object.assign(bad.state.base.jigsaw, { pieces: 1e9, seed: -5, size: 1e6, style: "__proto__", shape: "<img src=x onerror=alert(1)>", holder: "constructor", gap: -4, thick: 1e9, knob: 1e9 });
  await setFile(document.querySelector("#projInput"), "evil.json", JSON.stringify(bad), "application/json");
  for (let i = 0; i < 100 && MF.state.base.jigsaw.pieces !== 500; i++) await sleep(30);
  await settle();
  const j2 = MF.state.base.jigsaw;
  check(j2.pieces === 500 && j2.seed === 1, "piece count and pattern number clamped", `${j2.pieces}, ${j2.seed}`);
  $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(80);
  check(!document.querySelector("[onerror]") && !document.querySelector("img[src='x']"), "a hostile outline name never reaches the page as markup");
  check(MF.parts.length > 0 && MF.parts.every(p => C2.checkMesh(p.solid).open === 0), "and the puzzle still builds", `${MF.jigsaw.count} pieces, ${MF.jigsaw.W.toFixed(0)} mm`);

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
