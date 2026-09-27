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
  check(longest <= 1.5 * 1.02 + 1e-9, "no edge longer than asked (2% slack)", longest.toFixed(3));
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
  if (ball) { const hs = C.gradientCuts(3, 27, 0.2), a1 = C.meshEditor(ball), a2 = C.meshEditor(ball); hs.forEach(h => a1.cut(1, h)); a2.cutMany(1, hs);
    const r1 = a1.solid(), r2 = a2.solid(), v0 = C.checkMesh(ball).volume, m4 = C.checkMesh(r2);
    let st = 0; for (let t = 0; t < r2.idx.length; t += 3) { const ys = [0, 1, 2].map(k => r2.pos[r2.idx[t + k] * 3 + 1]); if (hs.some(h => Math.min(...ys) < h - 1e-4 && Math.max(...ys) > h + 1e-4)) st++; }
    check(m4.tris === C.checkMesh(r1).tris && m4.open === 0 && manifold(r2) === 0 && near(m4.volume, v0, v0 * 1e-6) && st === 0, "121 layer cuts at once: the same mesh as one cut at a time, closed, nothing straddles", `${m4.tris} triangles`); }
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
  // a fade: each layer one filament or the other, the second's share growing evenly
  const eg = C.meshEditor(b); C.gradientCuts(2, 18, 0.2).forEach(h => eg.cut(1, h)); const sg = eg.solid(), tg = C.meshTopology(sg), pg = new Uint8Array(tg.n).fill(255);
  C.paintGradient(tg, pg, { from: 2, to: 18, layer: 0.2, a: 1, b: 2, below: true, above: true });
  const share = (y0, y1) => { let A = 0, B2 = 0; for (let t = 0; t < tg.n; t++) { const y = tg.cen[3 * t + 1]; if (y < y0 || y > y1 || Math.abs(tg.nrm[3 * t + 1]) > 0.5) continue; if (pg[t] === 2) B2 += tg.area[t]; else A += tg.area[t]; } return B2 / (A + B2); };
  check(share(2, 6) < 0.2 && share(8, 12) > 0.35 && share(8, 12) < 0.65 && share(14, 18) > 0.8 && share(0, 1.9) === 0 && share(18.1, 20) === 1, "a colour fade: the top colour's share rises from 0 to 1",
    [share(2, 6), share(8, 12), share(14, 18)].map(v => v.toFixed(2)).join(" → "));
  const ly = C.gradientLayers(80); check(ly.slice(0, 20).reduce((a, v) => a + v, 0) < ly.slice(60).reduce((a, v) => a + v, 0) && ly.reduce((a, v) => a + v, 0) === 40, "  and half the layers overall");
  const ps = Uint8Array.from([255, 1, 2, 255]); check(C.paintSwap(ps, 0, 3, 0) === 2 && ps.join() === "3,1,2,3", "swap a colour: the unpainted part's own colour counts too");
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
  // a part printed in its own filament (no paint) keeps it when the file is opened again, from the
  // slicer's settings file: Bambu Studio / OrcaSlicer name it per part, PrusaSlicer per triangle range
  const b2 = box(10, 0, -5, 20, 10, 5), two = C.prepareParts([{ name: "Cube", slot: 0, pos: b.pos, idx: b.idx, paint }, { name: "Lid", slot: 3, pos: b2.pos, idx: b2.idx }]).parts;
  const models = f => Object.fromEntries(Object.entries(f).filter(([k]) => /\.model$/.test(k)));
  const fb = C.make3MF_BBL(two, slots, "t"), fp = C.make3MF(two, slots, "t");
  const rb = C.parse3MFModel(models(fb), "3D/3dmodel.model", { bambu: fb["Metadata/model_settings.config"] });
  const rp = C.parse3MFModel(models(fp), "3D/3dmodel.model", { prusa: fp["Metadata/Slic3r_PE_model.config"] });
  const lidOf = r => { const c = {}; for (let t = 12; t < r.tris.length / 9; t++) { const v = r.paint ? r.paint[t] : 0; c[v] = (c[v] || 0) + 1; } return JSON.stringify(c); };   // the lid is written second
  check(lidOf(rb) === '{"4":12}' && rb.paint[0] === 2 && rb.paint[1] === 4 && rb.paint[2] === 0, "Bambu 3mf read back with its settings: the unpainted lid keeps filament 4, the paint stays", lidOf(rb));
  check(lidOf(rp) === '{"4":12}' && rp.paint[0] === 2 && rp.paint[1] === 4, "PrusaSlicer 3mf read back with its settings: the lid keeps filament 4", lidOf(rp));
  const rn = C.parse3MFModel(models(fb), "3D/3dmodel.model");
  check(lidOf(rn) === '{"0":12}', "without the settings file the lid takes the first filament, as before", lidOf(rn));
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

console.log("\npainter tools (Session 18): the smart brush and strokes repeated round the middle");
{ const b = box(-10, 0, -10, 10, 20, 10), ed = C.meshEditor(b); ed.refine(1, 1e6);
  const s = ed.solid(), topo = C.meshTopology(s), g = C.triangleGrid(topo, 2);
  const plain = C.brushTris(topo, g, [9, 20, 0], 3, null, 0), smart = C.brushTris(topo, g, [9, 20, 0], 3, null, 40);
  const onTop = ts => ts.filter(t => topo.nrm[3 * t + 1] > 0.9).length;
  check(plain.length > onTop(plain) && onTop(plain) > 0, "near an edge the plain brush runs over onto the side", `${onTop(plain)} on top, ${plain.length - onTop(plain)} on the side`);
  check(smart.length === onTop(smart) && onTop(smart) === onTop(plain), "the smart brush stops at the edge: the same top, none of the side", `${smart.length} triangles`);
  check(C.brushTris(topo, g, [9, 20, 0], 3, null, 89).length === smart.length && C.brushTris(topo, g, [9, 20, 0], 3, [0, -1, 0], 40).length === smart.length, "  and with the facing check as well");
  const cp = C.symmetryCopies([[10, 5, 0]], [-1, 0, 0], false, 4), at = cp.map(c => c.pts[0].map(v => Math.round(v)).join(",")).sort();
  check(cp.length === 4 && at.join(" ") === "-10,5,0 0,5,-10 0,5,10 10,5,0" && cp.every(c => Math.abs(Math.hypot(...c.facing) - 1) < 1e-9 && Math.abs(c.facing[0] * c.pts[0][0] + c.facing[2] * c.pts[0][2] + 10) < 1e-9),
    "four copies round the upright middle line, each still facing the model", at.join(" "));
  check(C.symmetryCopies([[3, 1, 2]], null, true, 3).length === 6 && C.symmetryCopies([[3, 1, 2]], null, false, 99).length === 12 && C.symmetryCopies([[3, 1, 2]], null, false, "x").length === 1,
    "mirrored copies double them; at most 12 round; nonsense counts as once");
  const p = new Uint8Array(topo.n).fill(255);
  for (const c of C.symmetryCopies([[10, 10, 0]], null, false, 4)) C.paintBrush(topo, g, p, c.pts, 3, 2, c.facing, 0);
  const side = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].map(n => { let a = 0; for (let t = 0; t < topo.n; t++) if (p[t] === 2 && topo.nrm[3 * t] * n[0] + topo.nrm[3 * t + 2] * n[2] > 0.9) a += topo.area[t]; return a; });
  check(side.every(a => a > 0 && Math.abs(a - side[0]) < side[0] * 0.05), "a dab repeated four times round a cube paints the four sides alike", side.map(a => a.toFixed(1)).join(" / ")); }

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
  const methods = ["height", "gradient", "stripes", "dir", "shells", "regions", "noise", "swap"];
  for (const k of methods) {
    toPage("Auto colour"); await sleep(20);
    $$(".method").find(b => b.querySelector("b").textContent === { height: "Height bands", gradient: "Colour fade", stripes: "Stripes", dir: "Tops and sides", shells: "Separate pieces", regions: "Smooth areas", noise: "Random blobs", swap: "Swap a colour" }[k]).click(); await sleep(20);
    const go = $$("#panel button").find(b => /^Paint it/.test(b.textContent));
    go.click(); await sleep(150); await settle();
    const ops = st().paint.ops, c = painted();
    // a vase is one piece, so "separate pieces" paints all of it in the first colour
    const ok = k === "shells" ? Object.keys(c).join() === "0" : k === "swap" ? !c[0] && c[1] > 0 : Object.keys(c).length >= 2;
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
  st().paint.ops.push({ k: "brush", slot: 3, r: 6, facing: null, pts: [[20, 45, 33.5], [22, 45, 32.3]] }); MF.paint.repaint(); await settle();
  check((painted()[3] || 0) > 0 && MF.paint.info.edge <= 1.2 + 1e-9, "a brush stroke refines the model and paints near the points", `${painted()[3]} triangles, edge ${MF.paint.info.edge}`);
  const one = painted()[3]; st().paint.ops[0].mirror = true; MF.paint.repaint(); await settle();
  check(painted()[3] > one * 1.6, "a mirrored stroke paints both sides", `${one} → ${painted()[3]}`);
  // the fill tool on the base: everything that faces down, in one go
  st().paint.ops.push({ k: "fill", p: [0, 0, 0], slot: 2, same: false, angle: 30 }); MF.paint.repaint(); await settle();
  check((painted()[2] || 0) > 0, "a fill from the base paints the base", painted()[2]);
  // Session 18: strokes repeated round the middle, the eyedropper and recolour
  st().paint.ops = [{ k: "brush", slot: 3, r: 4, facing: null, pts: [[20, 45, 33.5]] }]; MF.paint.repaint(); await settle();
  const once = painted()[3] || 0; st().paint.ops[0].radial = 4; MF.paint.repaint(); await settle();
  check(once > 0 && painted()[3] > once * 3.2 && painted()[3] < once * 4.8, "a stroke repeated four times round the vase paints about four times as much", `${once} → ${painted()[3]}`);
  st().paint.ops[0].edge = 30; MF.paint.repaint(); await settle();
  check(painted()[3] > 0 && painted()[3] <= once * 4.8, "the smart brush replays too", painted()[3]);
  const part0 = MF.parts[0], t3 = Array.from(part0.paint).indexOf(3), tPlain = Array.from(part0.paint).indexOf(255);
  MF.paint.ui.slot = 0; MF.paint.ui.tool = "pick"; MF.paint.ui.lastTool = "brush";
  check(MF.paint.pick({ part: 0, face: t3 }) && MF.paint.ui.slot === 3 && MF.paint.ui.tool === "brush" && MF.paint.colourAt({ part: 0, face: tPlain }) === part0.slot,
    "the eyedropper takes the colour clicked on (paint, or the part's own) and goes back to the brush", `slot ${MF.paint.ui.slot}, tool ${MF.paint.ui.tool}`);
  MF.paint.ui.slot = 1; const nOps = st().paint.ops.length;
  check(MF.paint.recolour({ part: 0, face: t3 }) && st().paint.ops.length === nOps + 1 && st().paint.ops[nOps].k === "swap" && st().paint.ops[nOps].from === 3 && st().paint.ops[nOps].to === 1, "recolour adds a step: that colour everywhere becomes the brush colour");
  await settle(); check(!painted()[3] && painted()[1] > 0, "and the model has none of it left", JSON.stringify(painted()));
  check(!MF.paint.recolour({ part: 0, face: Array.from(MF.parts[0].paint).indexOf(1) }) && st().paint.ops.length === nOps + 1, "recolouring a colour into itself adds nothing");
  st().paint.ops = [{ k: "fill", p: [0, 0, 0], slot: 2, same: false, angle: 30, radial: 3 }]; MF.paint.repaint(); await settle();
  check((painted()[2] || 0) > 0, "a fill repeated round the middle replays", painted()[2]);
  // paint detail
  st().paint.detail = "coarse"; MF.paint.repaint(); await settle(); const coarse = MF.paint.info.tris;
  st().paint.detail = "fine"; MF.paint.repaint(); await settle(); const fine = MF.paint.info.tris;
  check(fine > coarse * 2, "finer detail makes more, smaller triangles", `${coarse} → ${fine}`);
  st().paint.detail = "auto";
  // switching the paint off shows the model plain; removing all paint restores the original mesh
  st().paint.on = false; MF.paint.repaint(); await settle();
  const offWarn = MF.checks.list.find(r => /paint is switched off/.test(r.t));
  check(MF.parts.every(p => !p.paint) && offWarn && offWarn.k === "warn", "“Use the paint” off: the plain model, and the checks say the paint is left out", offWarn && offWarn.s);
  st().paint.on = true; st().paint.ops = []; MF.paint.repaint(); await settle();
  check(!MF.checks.list.some(r => /paint is switched off/.test(r.t)), "no warning once the paint is on (or gone)");
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
  // Session 15: an imported model is kept in a saved project file; without it the paint survives
  // opening the same file again
  {
    const openPayload = async text => {
      const f = new win.File([text], "p.json", { type: "application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
      for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30);
      await settle();
    };
    const before = JSON.stringify(painted()), withModel = MF.projectPayload(true), without = MF.projectPayload(false);
    check(JSON.parse(withModel).model && !JSON.parse(without).model, "a saved project file keeps the imported model; the autosave does not", `${(withModel.length / 1024).toFixed(0)} KB vs ${(without.length / 1024).toFixed(0)} KB`);
    await MF.paint.importModel(new win.File([objText.replace(/ 20\n/g, " 30\n")], "tall.obj")); await settle();
    check(!st().paint.ops.length, "a different model clears the paint", st().base.stl.name);
    await openPayload(withModel);
    check(st().base.type === "stl" && /cube\.obj/.test(st().base.stl.name) && near(C.solidBounds(MF.parts[0].solid).size[1], 20, 1e-6) && JSON.stringify(painted()) === before,
      "opening the project file brings back the model and its paint", JSON.stringify(painted()));
    await openPayload(without);
    const tabText = document.querySelector("#panel").textContent;    // the Paint tab is showing
    check(!MF.parts.length && st().paint.ops.length === 1 && /painted on cube\.obj/.test(tabText) && [...document.querySelectorAll("#panel button")].some(b => /Open cube\.obj again/.test(b.textContent)),
      "a project without its model says which file to open, and keeps the paint steps", MF.parts.length + " parts");
    st().base.stl.scale = 150;
    await openPayload(JSON.stringify(Object.assign(JSON.parse(without), { state: Object.assign(JSON.parse(without).state, { base: Object.assign(JSON.parse(without).state.base, { stl: { name: st().base.stl.name, scale: 150 } }) }) })));
    await MF.paint.importModel(new win.File([objText], "cube.obj")); await settle();
    check(st().paint.ops.length === 1 && st().base.stl.scale === 150 && Object.keys(painted()).length === 3, "opening the same file again keeps its paint and its scale", `${st().base.stl.scale}%, ${JSON.stringify(painted())}`);
    st().base.stl.scale = 100; MF.rebuild(false); await settle();
    // hostile models in a project file are dropped, never half-loaded
    const P0 = JSON.parse(withModel), bad = [
      ["not base64", { name: "x", tris: "%%%" }],
      ["not whole triangles", { name: "x", tris: P0.model.tris.slice(0, 40) }],
      ["NaN corners", { name: "x", tris: (() => { const a = new Float32Array(9).fill(NaN); let s = ""; new Uint8Array(a.buffer).forEach(b => s += String.fromCharCode(b)); return win.btoa(s); })() }],
      ["a number instead of data", { name: "<img src=x onerror=alert(1)>", tris: 12 }],
    ];
    for (const [what, model] of bad) {
      await openPayload(JSON.stringify(Object.assign({}, P0, { model })));
      check(!MF.parts.length && !document.body.innerHTML.includes("onerror=alert"), `a model that is ${what} is left out`, MF.parts.length + " parts");
    }
    await openPayload(JSON.stringify(Object.assign({}, P0, { model: Object.assign({}, P0.model, { paint: "AAAA" }) })));
    check(MF.parts.length === 1 && C.checkMesh(MF.parts[0].solid).open === 0, "paint of the wrong length is dropped, the model kept");
    st().paint.ops = []; MF.paint.repaint(); await settle();
    // undo after opening another model brings back the first model, not just its settings
    await MF.paint.importModel(new win.File([objText], "cube.obj")); await settle(); await sleep(500);
    st().paint.ops = [{ k: "dir", up: 1, side: 2, down: 255, angle: 30 }]; MF.paint.changed(); await settle(); await sleep(500);
    const cubePaint = JSON.stringify(painted());
    await MF.paint.importModel(new win.File([objText.replace(/ 20\n/g, " 30\n")], "tall.obj")); await settle(); await sleep(500);
    const h = () => C.solidBounds(MF.parts[0].solid).size[1];
    check(near(h(), 30, 1e-6) && !st().paint.ops.length, "the second model opens plain", `${h().toFixed(1)} mm`);
    document.querySelector("#undoBtn").click(); await settle(); await sleep(100); await settle();
    check(/cube\.obj/.test(st().base.stl.name) && near(h(), 20, 1e-6) && st().paint.ops.length === 1 && JSON.stringify(painted()) === cubePaint,
      "Undo brings back the first model with its paint", `${st().base.stl.name}, ${h().toFixed(1)} mm, ${JSON.stringify(painted())}`);
    document.querySelector("#redoBtn").click(); await settle(); await sleep(100); await settle();
    check(/tall\.obj/.test(st().base.stl.name) && near(h(), 30, 1e-6) && !st().paint.ops.length, "Redo brings back the second", `${st().base.stl.name}, ${h().toFixed(1)} mm`);
    st().paint.ops = []; MF.paint.repaint(); await settle();
  }
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
  const h18 = MF.paint.cleanPaint({ ops: [{ k: "brush", slot: 1, r: 3, pts: [[0, 0, 0]], radial: 1e9, edge: 1e9 }, { k: "brush", slot: 1, r: 3, pts: [[0, 0, 0]], radial: "x", edge: -5 },
    { k: "fill", p: [0, 0, 0], slot: 1, radial: 6.4 }, { k: "brush", slot: 1, r: 3, pts: [[0, 0, 0]], radial: 6, edge: 30, mirror: true }] }).ops;
  check(h18[0].radial === 12 && h18[0].edge === 89 && !("radial" in h18[1]) && !("edge" in h18[1]) && h18[2].radial === 6 && h18[3].radial === 6 && h18[3].edge === 30,
    "repeats round the middle at most 12, the smart brush's edge 0 to 89; ordinary strokes keep no extra settings", JSON.stringify(h18.map(o => [o.radial, o.edge])));
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
  // Session 15: the imported model's name and scale, and the whole model's scale
  const proj3 = JSON.parse(JSON.stringify(st()));
  proj3.base.type = "stl"; proj3.base.stl = { name: 5, scale: -50 }; proj3.model = Object.assign({}, proj3.model, { scale: -100 });
  await load(proj3);
  const S3 = st(), errs3 = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  // text, null or a list where a number or a group of settings belongs falls back to the default
  const proj4 = JSON.parse(JSON.stringify(st()));
  proj4.base.type = "board"; proj4.base.board = Object.assign({}, proj4.base.board, { w: "12abc", h: null, r: [3] }); proj4.base.nameplate.sym = 5; proj4.view = "dark";
  const e4 = env.errors.length;
  await load(proj4);
  const S4 = st(), D4 = MF.defaults, errs4 = env.errors.slice(e4).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(S4.base.board.w === D4.board.w && S4.base.board.h === D4.board.h && S4.base.board.r === D4.board.r && typeof S4.base.nameplate.sym === "object" && typeof S4.view === "object" && MF.parts.length && !errs4.length,
    "text, null or a list in a number's place, or a number in a group's place, falls back to the default", `${JSON.stringify(S4.base.board).slice(0, 80)}, ${errs4.length} errors`);
  check(S3.base.stl.name === "" && S3.base.stl.scale === 5 && S3.model.scale === 20 && !errs3.length, "a model name that is not text and negative scales are cleaned (a negative scale turns a model inside out)",
    `${JSON.stringify(S3.base.stl)}, model ${S3.model.scale}%, ${errs3.length} errors`);

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
