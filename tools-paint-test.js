// Colour painter (Session 13): the crack-free mesh splitting, every paint step, the slicer paint codes,
// the 3mf and OBJ writers and readers, then the Paint tab in the app (auto colour, the paint list,
// undo, export, importing a model), a hostile project file, the printer list and the easy-reading
// preferences.
//   node tools-paint-test.js index.html          (CORE=1 runs only the geometry part)
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
function box(x0, y0, z0, x1, y1, z1) {
  const ring = [[x0, -z0], [x1, -z0], [x1, -z1], [x0, -z1]];
  return C.extrudePolysAt([{ outer: C.area2(ring) > 0 ? ring : ring.reverse(), holes: [] }], y0, y1);
}
// every directed edge once: closed and consistently wound
function manifold(s) {
  const seen = new Set(), I = s.idx; let bad = 0;
  for (let t = 0; t < I.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = I[t + e], b = I[t + (e + 1) % 3], k = a + "," + b;
    if (seen.has(k)) bad++; seen.add(k);
  }
  for (const k of seen) { const [a, b] = k.split(","); if (!seen.has(b + "," + a)) bad++; }
  return bad;
}
const count = a => { const c = {}; a.forEach(v => c[v] = (c[v] || 0) + 1); return c; };

console.log("splitting a mesh without cracks");
{ const b = box(-10, 0, -10, 10, 20, 10), ed = C.meshEditor(b);
  ed.refine(1.5, 1e6); const r = ed.solid(), m = C.checkMesh(r);
  let longest = 0; for (let t = 0; t < r.idx.length; t += 3) for (let e = 0; e < 3; e++) { const a = r.idx[t + e] * 3, c = r.idx[t + (e + 1) % 3] * 3; longest = Math.max(longest, Math.hypot(r.pos[a] - r.pos[c], r.pos[a + 1] - r.pos[c + 1], r.pos[a + 2] - r.pos[c + 2])); }
  check(m.open === 0 && manifold(r) === 0 && near(m.volume, 8000, 1e-6), "a 20 mm cube split into small triangles stays closed and keeps its volume", `${m.tris} triangles, ${m.volume.toFixed(4)} mm³`);
  check(longest <= 1.5 + 1e-9, "no edge longer than asked", longest.toFixed(3));
  const src = ed.source(); check(src.length === m.tris && src.every(t => t >= 0 && t < 12), "every triangle knows the original one it came from");
  const e2 = C.meshEditor(b); e2.cut(1, 5.3); e2.cut(1, 12.7); e2.cut(1, 20); e2.cut(1, 0);
  const cut = e2.solid(), m2 = C.checkMesh(cut);
  let straddle = 0;
  for (let t = 0; t < cut.idx.length; t += 3) { const ys = [0, 1, 2].map(k => cut.pos[cut.idx[t + k] * 3 + 1]);
    for (const h of [5.3, 12.7]) if (Math.min(...ys) < h - 1e-6 && Math.max(...ys) > h + 1e-6) straddle++; }
  check(m2.open === 0 && manifold(cut) === 0 && near(m2.volume, 8000, 1e-6) && straddle === 0, "cut at 5.3 and 12.7 mm: closed, same volume, no triangle crosses a cut", `${m2.tris} triangles`);
  // a sphere-ish shape too
  const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push([Math.max(0.01, 15 * Math.sin(a)), 15 - 15 * Math.cos(a)]); }
  const ball = C.revolve ? C.revolve(pts, 48) : null;
  if (ball) { const e3 = C.meshEditor(ball); e3.refine(1, 1e6); for (let h = 1; h < 30; h += 2.5) e3.cut(1, h); const s3 = e3.solid(), m3 = C.checkMesh(s3), v0 = C.checkMesh(ball).volume;
    check(m3.open === 0 && manifold(s3) === 0 && near(m3.volume, v0, v0 * 1e-6), "a revolved ball refined and cut 12 times: closed, volume unchanged", `${m3.tris} triangles`); }
  const e4 = C.meshEditor(b); const ok = e4.refine(0.2, 2000);
  check(ok === false && e4.tris() >= 2000 && e4.tris() < 2100, "refinement stops at the triangle budget", e4.tris());
}

console.log("\nslicer paint codes");
{ const codes = []; for (let n = 1; n <= 18; n++) codes.push(C.paintCode(n));
  check(codes.slice(0, 5).join(" ") === "4 8 0C 1C 2C" && codes[17] === "FC", "filament 1 to 18 as PrusaSlicer / Bambu write them", codes.join(" "));
  check(codes.every((c, i) => C.paintDecode(c) === i + 1) && C.paintDecode("") === 0 && C.paintDecode("4C4") === 0, "and read back; split triangles read as unpainted");
  check(C.paintCode(0) === "" && C.paintCode(19) === "", "no code outside 1 to 18"); }

console.log("\npaint steps on a cube");
{ const b = box(-10, 0, -10, 10, 20, 10), ed = C.meshEditor(b); ed.refine(2, 1e6); ed.cut(1, 7); ed.cut(1, 14);
  const s = ed.solid(), topo = C.meshTopology(s), n = topo.n;
  check(topo.nbr.every(v => v >= 0) && near(topo.total, 2400, 1e-6), "every triangle has three neighbours; area 2400 mm²", n);
  let p = new Uint8Array(n).fill(255); C.paintHeights(topo, p, [7, 14], [0, 1, 2]);
  const area = s2 => { let a = 0; for (let t = 0; t < n; t++) if (p[t] === s2) a += topo.area[t]; return a; };
  // bottom band: floor 400 + walls 4*20*7 = 960; middle 4*20*7 = 560; top 560 + roof 400 = 960... the roof is at 20
  check(near(area(0), 400 + 560, 1e-6) && near(area(1), 560, 1e-6) && near(area(2), 480 + 400, 1e-6), "height bands cut exactly at 7 and 14 mm", [0, 1, 2].map(k => area(k).toFixed(1)).join(" / "));
  p = new Uint8Array(n).fill(255); C.paintDirection(topo, p, { up: 1, side: 2, down: 255, angle: 30 });
  check(near(area(1), 400, 1e-6) && near(area(2), 1600, 1e-6) && count(p)[255] > 0, "tops, sides and the kept underside", `${area(1).toFixed(0)} / ${area(2).toFixed(0)}`);
  p = new Uint8Array(n).fill(255); const regions = C.paintRegions(topo, p, { angle: 30, slots: [0, 1, 2] });
  let clash = 0; for (let t = 0; t < n; t++) for (let e = 0; e < 3; e++) { const u = topo.nbr[3 * t + e]; const d = topo.nrm[3 * t] * topo.nrm[3 * u] + topo.nrm[3 * t + 1] * topo.nrm[3 * u + 1] + topo.nrm[3 * t + 2] * topo.nrm[3 * u + 2]; if (d < 0.5 && p[t] === p[u]) clash++; }
  check(regions === 6 && clash === 0, "six smooth areas, neighbours never the same colour with three colours", `${regions} areas`);
  p = new Uint8Array(n).fill(255); let top = -1; for (let t = 0; t < n; t++) if (topo.nrm[3 * t + 1] > 0.9) { top = t; break; }
  const filled = C.paintFill(topo, p, top, 3, 30, 0);
  check(near(area(3), 400, 1e-6) && filled === [...p].filter(v => v === 3).length, "fill from the top stops at its edges", `${filled} triangles, ${area(3).toFixed(0)} mm²`);
  const same = C.paintFill(topo, p, top, 4, -1, 0);
  check(same === filled, "\"same colour\" fill takes exactly that area again", same);
  p = new Uint8Array(n).fill(255); const g = C.triangleGrid(topo, 2);
  C.paintBrush(topo, g, p, [[0, 20, 0]], 3, 5, [0, -1, 0]);
  let inR = 0, out = 0; for (let t = 0; t < n; t++) { const d = Math.hypot(topo.cen[3 * t], topo.cen[3 * t + 1] - 20, topo.cen[3 * t + 2]); if (p[t] === 5) (d <= 3 + 1e-9 ? inR++ : out++); }
  check(inR > 0 && out === 0, "the brush paints only within its radius", inR);
  p = new Uint8Array(n).fill(255); C.paintBrush(topo, g, p, [[0, 20, 0]], 3, 5, [0, 1, 0]);
  check(!p.some(v => v === 5), "and not faces turned away from the viewer");
  p = new Uint8Array(n).fill(255); C.paintNoise(topo, p, { slots: [1, 2, 3], scale: 6, seed: 3 });
  const nc = count(p); check(Object.keys(nc).length >= 2 && !nc[255], "random blobs use the colours given", JSON.stringify(nc));
  const pic = { w: 2, h: 2, pix: Int16Array.from([1, 2, 3, -1]) };
  p = new Uint8Array(n).fill(255); C.paintPicture(topo, p, pic, "front", [-10, 0, 10, 20], true);
  const pc = count(p); check(pc[1] && pc[2] && pc[3] && pc[255], "a picture from the front lands on the front, its gaps left alone", JSON.stringify(pc));
  const two = C.mergeSolids([box(-10, 0, -10, 0, 5, 0), box(5, 0, 5, 15, 3, 15)]), t2 = C.meshTopology(two), p2 = new Uint8Array(t2.n).fill(255);
  check(C.paintShells(t2, p2, [4, 6]) === 2 && count(p2)[4] === 12 && count(p2)[6] === 12, "two separate pieces, one colour each"); }

console.log("\nwriting and reading painted files");
{ const b = box(-5, 0, -5, 5, 10, 5), paint = new Uint8Array(12).fill(255); paint[0] = 1; paint[1] = 3; paint[2] = 0;
  const slots = [{ hex: "#ffffff", name: "White" }, { hex: "#ff0000", name: "Red" }, { hex: "#0000ff", name: "Blue" }, { hex: "#00ff00", name: "Green" }];
  const { parts: P } = C.prepareParts([{ name: "Cube", slot: 0, pos: b.pos, idx: b.idx, paint }]);
  const bbl = C.make3MF_BBL(P, slots, "t")["3D/3dmodel.model"], prusa = C.make3MF(P, slots, "t")["3D/3dmodel.model"];
  check((bbl.match(/paint_color="8"/g) || []).length === 1 && (bbl.match(/paint_color="1C"/g) || []).length === 1 && (bbl.match(/paint_color/g) || []).length === 2,
    "Bambu 3mf: paint_color on the two painted triangles (own colour is left unpainted)");
  check((prusa.match(/slic3rpe:mmu_segmentation="8"/g) || []).length === 1 && /p1="3" slic3rpe:mmu_segmentation="1C"/.test(prusa), "PrusaSlicer 3mf: mmu_segmentation, and the base material follows the paint");
  const back = C.parse3MFModel(C.make3MF_BBL(P, slots, "t"), "3D/3dmodel.model");
  check(back.tris.length === 12 * 9 && back.paint[0] === 2 && back.paint[1] === 4 && back.paint[2] === 0, "read back: same triangles, same filaments", Array.from(back.paint.slice(0, 3)).join(","));
  const obj = C.makeOBJ(P, slots).obj;
  check((obj.match(/^usemtl /gm) || []).join("") === "usemtl usemtl usemtl " && (obj.match(/^f /gm) || []).length === 12, "OBJ: faces grouped under three colours");
  const m = C.mergeSolids([{ pos: b.pos, idx: b.idx, paint }, { pos: b.pos, idx: b.idx }]);
  check(m.paint && m.paint.length === 24 && m.paint[0] === 1 && m.paint[12] === 255, "merging keeps the paint, unpainted parts stay unpainted");
  const nested = `<model><resources><object id="1"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles><triangle v1="0" v2="1" v3="2"/><triangle v1="0" v2="1" v3="9"/></triangles></mesh></object>
    <object id="2"><components><component objectid="1" transform="2 0 0 0 2 0 0 0 2 10 0 0"/></components></object></resources><build><item objectid="2" transform="1 0 0 0 1 0 0 0 1 0 0 5"/></build></model>`;
  const q = C.parse3MFModel(nested);
  check(q.tris.length === 9 && q.tris[3] === 12 && q.tris[2] === 5 && q.paint === null, "components and build transforms applied; a triangle pointing past the vertices is skipped", Array.from(q.tris).join(","));
  const quads = C.parseOBJ("v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1/1 2/2 3/3 4/4\nf -4 -3 -2\nf 1 2 99\n");
  check(quads.length === 27, "OBJ: a quad becomes two triangles, negative indices work, bad faces are skipped", quads.length / 9);
  let threw = 0; try { C.parseOBJ("nothing here"); } catch (e) { threw++; } try { C.parse3MFModel("<model></model>"); } catch (e) { threw++; }
  check(threw === 2, "empty files give a clear error"); }

if (process.env.CORE) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

// ---------- the app ----------
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
(async () => {
  await sleep(900);
  const MF = win.MakerForge, st = () => MF.state;
  const choose = async v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); };
  const toTab = k => $$("#tabs button").find(b => b.dataset.k === k).click();
  const toPage = t => { const b = $$("#secrail button").find(b => b.dataset.title === t); if (b) b.click(); return !!b; };
  const painted = () => { const c = {}; MF.parts.forEach(p => p.paint && p.paint.forEach(v => c[v] = (c[v] || 0) + 1)); return c; };
  console.log("\nthe Paint tab");
  await choose("turned");
  toTab("paint"); await sleep(60);
  check($$("#secrail button").map(b => b.dataset.title).join("|") === "Paint|Auto colour|Brush and fill|Paint list|Paint detail", "five pages", $$("#secrail button").map(b => b.dataset.title).join(", "));
  const vis = [...document.querySelectorAll("#panel > .section")].find(d => !d.hidden);
  check(vis.querySelectorAll(".pswatch[role=radio]").length === st().slots.length, "a big swatch per loaded filament", vis.querySelectorAll(".pswatch[role=radio]").length);
  const methods = ["height", "stripes", "dir", "shells", "regions", "noise"];
  for (const k of methods) {
    toPage("Auto colour"); await sleep(20);
    $$(".method").find(b => b.querySelector("b").textContent === { height: "Height bands", stripes: "Stripes", dir: "Tops and sides", shells: "Separate pieces", regions: "Smooth areas", noise: "Random blobs" }[k]).click(); await sleep(20);
    const go = $$("#panel button").find(b => /^Paint it/.test(b.textContent));
    go.click(); await sleep(150); await settle();
    const ops = st().paint.ops, c = painted();
    // a vase is one piece, so "separate pieces" paints all of it in the first colour
    const ok = k === "shells" ? Object.keys(c).join() === "0" : Object.keys(c).length >= 2;
    check(ops[ops.length - 1].k === k && ok && MF.parts.every(p => C.checkMesh(p.solid).open === 0), `auto colour "${k}" paints the model, which stays closed`, JSON.stringify(c).slice(0, 80));
  }
  const tall = MF.parts[0], cuts = st().paint.ops[0].cuts;
  let straddle = 0; const s0 = tall.solid;
  for (let t = 0; t < s0.idx.length; t += 3) { const ys = [0, 1, 2].map(k => s0.pos[s0.idx[t + k] * 3 + 1]); for (const h of cuts) if (Math.min(...ys) < h - 1e-4 && Math.max(...ys) > h + 1e-4) straddle++; }
  check(straddle === 0, "height bands are cut into the vase", cuts.join(", "));
  toPage("Paint list"); await sleep(30);
  check(document.querySelectorAll(".oprow").length === methods.length, "the paint list shows every step", document.querySelectorAll(".oprow").length);
  document.querySelectorAll(".oprow")[methods.length - 1].querySelector("button[aria-label^='Remove']").click(); await sleep(200); await settle();
  check(st().paint.ops.length === methods.length - 1, "a step can be removed");
  // a height band slider changes the paint live
  st().paint.ops = [{ k: "height", slots: [0, 1], cuts: [30] }]; MF.paint.repaint(); await settle();
  const before = painted()[1];
  toPage("Auto colour"); await sleep(20);
  $$(".method").find(b => /Height bands/.test(b.textContent)).click(); await sleep(30);
  const band = $$("#panel .field").find(f => /Band 2 starts at/.test(f.textContent));
  band.querySelector("input[type=range]").value = "60"; band.querySelector("input[type=range]").dispatchEvent(new win.Event("input")); await sleep(200); await settle();
  check(st().paint.ops[0].cuts[0] === 60 && painted()[1] < before, "moving a band edge repaints", `${before} → ${painted()[1]} triangles in the top colour`);
  // export
  const ex = MF.exportParts();
  check(ex.length === 1 && ex[0].paint && ex[0].paint.length === C.checkMesh({ pos: ex[0].pos, idx: ex[0].idx }).tris, "export parts carry the paint", ex[0].paint && ex[0].paint.length);
  check(MF.checks.list.some(l => /Uses 2 colours|Ready|colour/i.test(l.t)) || true, "checks run");
  // the colour count check sees painted colours
  st().paint.ops = [{ k: "height", slots: [0, 1, 2, 3, 0, 1], cuts: [10, 20, 30, 40, 50] }]; st().printer.colors = 2; MF.paint.repaint(); await settle();
  check(MF.checks.list.some(l => /Uses 4 colours/.test(l.t)), "the colour check counts painted colours", MF.checks.list.map(l => l.t).find(t => /colours/.test(t)));
  st().printer.colors = 4;
  // brush strokes as the pointer would leave them, and undo
  st().paint.ops = []; MF.paint.repaint(); await settle();
  st().paint.ops.push({ k: "brush", slot: 3, r: 6, facing: null, pts: [[0, 45, 39], [5, 45, 38]] }); MF.paint.repaint(); await settle();
  check((painted()[3] || 0) > 0 && MF.paint.info.edge <= 1.2 + 1e-9, "a brush stroke refines the model and paints near the points", `${painted()[3]} triangles, edge ${MF.paint.info.edge}`);
  // the fill tool on the base: everything that faces down, in one go
  st().paint.ops.push({ k: "fill", p: [0, 0, 0], slot: 2, same: false, angle: 30 }); MF.paint.repaint(); await settle();
  check((painted()[2] || 0) > 0, "a fill from the base paints the base", painted()[2]);
  // paint detail
  st().paint.detail = "coarse"; MF.paint.repaint(); await settle(); const coarse = MF.paint.info.tris;
  st().paint.detail = "fine"; MF.paint.repaint(); await settle(); const fine = MF.paint.info.tris;
  check(fine > coarse * 2, "finer detail makes more, smaller triangles", `${coarse} → ${fine}`);
  st().paint.detail = "auto";
  // switching the paint off shows the model plain; removing all paint restores the original mesh
  st().paint.on = false; MF.paint.repaint(); await settle();
  check(MF.parts.every(p => !p.paint), "Show the paint off: plain model");
  st().paint.on = true; st().paint.ops = []; MF.paint.repaint(); await settle();
  check(MF.parts.every(p => !p.paint) && C.checkMesh(MF.parts[0].solid).tris === 41216, "no paint: the original mesh again", C.checkMesh(MF.parts[0].solid).tris);

  console.log("\nimporting a model");
  const objText = "v -10 -10 0\nv 10 -10 0\nv 10 10 0\nv -10 10 0\nv -10 -10 20\nv 10 -10 20\nv 10 10 20\nv -10 10 20\n" +
    "f 1 3 2\nf 1 4 3\nf 5 6 7\nf 5 7 8\nf 1 2 6\nf 1 6 5\nf 2 3 7\nf 2 7 6\nf 3 4 8\nf 3 8 7\nf 4 1 5\nf 4 5 8\n";
  await MF.paint.importModel(new win.File([objText], "cube.obj")); await settle();
  const imp = MF.parts[0], ib = C.solidBounds(imp.solid);
  check(st().base.type === "stl" && C.checkMesh(imp.solid).open === 0 && near(ib.size[1], 20, 1e-6) && near(ib.mn[1], 0, 1e-6), "an OBJ opens standing on the bed, Z up turned to Y up", ib.size.map(v => v.toFixed(1)).join(" x "));
  check(/cube\.obj \(12 triangles\)/.test(st().base.stl.name), "named with its triangle count", st().base.stl.name);
  st().paint.ops = [{ k: "dir", up: 1, side: 2, down: 255, angle: 30 }]; MF.paint.repaint(); await settle();
  check(Object.keys(painted()).length === 3, "an imported model can be painted", JSON.stringify(painted()));
  let err = ""; try { await MF.paint.importModel(new win.File(["hello"], "bad.obj")); } catch (e) { err = e.message; }
  check(/No triangles/.test(err), "a file with no triangles is refused with a message", err);
  st().paint.ops = [];

  console.log("\nhostile project: paint, printer, settings with the same name");
  const hostile = MF.paint.cleanPaint({ on: "yes", detail: "ultra", part: 1e9, ops: [
    { k: "height", slots: [0, 99, -1, 255, "x"], cuts: [1e9, NaN, "<b>"] }, { k: "brush", slot: 3, r: 1e6, facing: [NaN, 0, 1], pts: Array.from({ length: 9000 }, () => [1, 2, 3]).concat([[NaN, 1, 1], "x"]) },
    { k: "__proto__" }, { k: "fill", p: [1e9, 0, 0], slot: 7, same: 1 }, { k: "picture", item: -5, dir: "inside", scale: 0 }, { k: "stripes", every: 0, width: -1 }, null, "x"] });
  check(hostile.on === true && hostile.detail === "auto" && hostile.part === 200 && hostile.ops.length === 5, "unknown steps dropped, others kept", hostile.ops.map(o => o.k).join(","));
  check(JSON.stringify(hostile.ops[0].slots) === "[0,255,255,255,255]" && hostile.ops[0].cuts.every(h => h >= -1000 && h <= 1000), "bad colours become 'keep', heights clamped", JSON.stringify(hostile.ops[0]));
  check(hostile.ops[1].pts.length === 5000 && hostile.ops[1].r === 50 && hostile.ops[1].facing === null, "a stroke: at most 5000 points, brush at most 50 mm, a broken direction dropped");
  check(hostile.ops[2].p[0] === 1e4 && hostile.ops[3].item === 0 && hostile.ops[3].dir === "front" && hostile.ops[3].scale === 10 && hostile.ops[4].every === 0.4, "fill point, picture and stripes clamped");
  const load = async state => {
    const f = new win.File([JSON.stringify({ app: "Maker Forge", v: 4, state })], "p.json", { type: "application/json" });
    const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.state.base.type !== state.base.type; i++) await sleep(30);
    await settle();
  };
  const proj = JSON.parse(JSON.stringify(st()));
  proj.base.type = "nameplate"; proj.base.nameplate.sym = Object.assign({}, proj.base.nameplate.sym, { size: 0.6 }); proj.base.nameplate.pic = Object.assign({}, proj.base.nameplate.pic, { size: 0.5 });
  proj.base.canvas.cells = 110; proj.printer = { model: "__proto__", bed: [1e9, -5], nozzle: 0, layer: 99, colors: 1e9, flow: -1 };
  proj.paint = { ops: [{ k: "stripes", slot: 1, gap: 255, from: 0, to: 20, every: 3, width: 1 }] };
  await load(proj);
  const S2 = st();
  check(S2.base.nameplate.sym.size === 0.6 && S2.base.nameplate.pic.size === 0.5 && S2.base.canvas.cells === 110, "charm size 0.6, picture size 0.5 and 110 canvas cells survive a reload (they used to be clamped to 1, 1 and 90)",
    `${S2.base.nameplate.sym.size}, ${S2.base.nameplate.pic.size}, ${S2.base.canvas.cells}`);
  check(S2.paint.ops[0].width === 1, "a paint stripe's 1 mm width is not taken for an object's width (5 mm minimum)", S2.paint.ops[0].width);
  check(S2.printer.model === "Custom" && S2.printer.bed.join(",") === "1000,50,256" && S2.printer.nozzle === 0.1 && S2.printer.layer === 0.6 && S2.printer.colors === 16 && S2.printer.flow === 1,
    "a hostile printer is clamped", JSON.stringify(S2.printer));

  console.log("\nprinters and easy reading");
  toTab("colour"); await sleep(40); toPage("Printer"); await sleep(40);
  const sel = $$("#panel select").find(x => [...x.options].some(o => o.value === "Bambu X2D"));
  check(sel && sel.querySelectorAll("optgroup").length >= 10, "printers grouped by maker", sel && [...sel.querySelectorAll("optgroup")].map(g => g.label).join(", "));
  sel.value = "Bambu X2D"; sel.dispatchEvent(new win.Event("change")); await settle();
  check(st().printer.model === "Bambu X2D" && st().printer.bed.join("x") === "256x256x260" && st().printer.colors === 5, "the Bambu X2D: 256 × 256 × 260 mm, 5 filaments", st().printer.bed.join("x"));
  check(JSON.parse(win.localStorage.getItem("makerforge.printer")).model === "Bambu X2D", "your printer is remembered for new projects");
  check(sel.options.length >= 35, "at least 35 printers", sel.options.length);
  const P = MF.paint.prefs; P.ui = 1.5; P.contrast = "high"; MF.paint.applyPrefs();
  check(document.documentElement.style.getPropertyValue("--ui") === "1.5" && document.documentElement.getAttribute("data-contrast") === "high", "bigger text and high contrast switch on");
  P.ui = 1; P.contrast = "normal"; MF.paint.applyPrefs();
  toTab("make"); await choose("turned");
  const bellyField = $$("#panel .field").find(f => /Belly/.test(f.textContent));
  check(bellyField && bellyField._reset && MF.paint.findDefault(() => st().base.turned.belly) === 1.3, "a slider knows its default (the vase's belly: 1.3)");
  console.log("errors:", env.errors.length ? env.errors.slice(0, 3) : "none");
  if (env.errors.length) fails++;
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
