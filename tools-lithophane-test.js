// Lithophanes (Session 9): the sheet builder alone on shapes with known answers (outline areas,
// holes, simplified backs, the cylinder seam), then the generator in the app: thickness follows the
// picture, mirror, the upright slope limit, every shape and outline closed and printable without
// support, the lamp shade's size and copies, the hanging hole, no picture, a hostile project.
//   node tools-lithophane-test.js index.html        CORE=1 for the geometry only (a few seconds)
const fs = require("fs");
const file = process.argv[2] || "index.html";
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---------- the core ----------
let src = fs.readFileSync(/\.html?$/.test(file) ? file : file, "utf8");
if (/\.html?$/.test(file)) { const s = src.indexOf("(function (global) {"); src = src.slice(s, src.indexOf("</script>", s)); }
globalThis.earcut = require("earcut");
new Function(src)();
const C = globalThis.PRCore;
function sheet(rings, W, H, c, thickFn, back) {
  const gx = Math.ceil((W + c) / c) + 1, gy = Math.ceil((H + c) / c) + 1, u0 = -W / 2 - 0.5 * c, v0 = -H / 2 - 0.5 * c;
  const g = { x0: u0, y1: v0 + (gy - 1) * c, s: c, w: gx, h: gy }, f = C.ringField(rings, g, 3 * c), sdf = new Float32Array(gx * gy), thick = new Float32Array(gx * gy);
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) { sdf[j * gx + i] = -f[(gy - 1 - j) * gx + i]; thick[j * gx + i] = thickFn(u0 + i * c, v0 + j * c); }
  return C.heightSheet({ gx, gy, u0, v0, c, thick, sdf, back, map: (u, v, w) => [u, v, w] });
}
const polyArea = r => Math.abs(C.area2(r));
console.log("sheet builder: flat sheets, 2 mm thick, 0.3 mm grid");
for (const [name, rings, area] of [
  ["100 x 75 rectangle", [C.ringRect(100, 75, 0, 1)], 7500],
  ["rounded corners r 8", [C.ringRect(100, 75, 8, 16)], polyArea(C.ringRect(100, 75, 8, 16))],
  ["circle r 30", [C.ringCircle(30, 256)], polyArea(C.ringCircle(30, 256))],
  ["heart", [C.ringHeart(40, 300)], polyArea(C.ringHeart(40, 300))],
  ["rectangle with two holes", [C.ringRect(100, 75, 4, 10), C.ringCircle(5, 64).map(p => [p[0] - 20, p[1]]), C.ringCircle(3, 64).map(p => [p[0] + 25, p[1] + 10])],
    polyArea(C.ringRect(100, 75, 4, 10)) - polyArea(C.ringCircle(5, 64)) - polyArea(C.ringCircle(3, 64))]]) {
  const s = sheet(rings, 100, 75, 0.3, () => 2), r = C.checkMesh(s), f = sheet(rings, 100, 75, 0.3, () => 2, "flat"), rf = C.checkMesh(f);
  check(r.open === 0 && C.signedVolume(s) > 0 && near(r.volume, 2 * area, 2 * area * 0.0005), `${name}: closed, outward, area within 0.05%`, `${(r.volume / 2).toFixed(1)} vs ${area.toFixed(1)} mm²`);
  check(rf.open === 0 && C.signedVolume(f) > 0 && near(rf.volume, r.volume, 1e-3 * r.volume) && rf.tris < r.tris * 0.55, "  flat back: same solid, half the triangles", `${r.tris} -> ${rf.tris}`);
}
{ const s = sheet([C.ringRect(100, 75, 0, 1)], 100, 75, 0.3, () => 2), b = C.solidBounds(s);
  check(near(b.size[0], 100, 1e-4) && near(b.size[1], 75, 1e-4) && near(b.size[2], 2, 1e-6), "a rectangle comes out exactly its size", b.size.map(v => v.toFixed(4)).join(" x ")); }
{ // thickness varies: the volume is the integral of the thickness over the outline
  const s = sheet([C.ringRect(60, 40, 0, 1)], 60, 40, 0.25, (u) => 1 + (u + 30) / 60 * 2, "flat"), r = C.checkMesh(s);
  check(r.open === 0 && near(r.volume, 60 * 40 * 2, 60 * 40 * 2 * 1e-4), "a 1 to 3 mm wedge holds 4800 mm³", r.volume.toFixed(2)); }
{ const gx = 700, gy = 241, R = 35, c = 2 * Math.PI * R / gx, cv = 80 / (gy - 1), thick = new Float32Array(gx * gy).fill(1.5);
  const map = (u, v, w) => { const a = u / R; return [(R + w) * Math.sin(a), v, (R + w) * Math.cos(a)]; };
  const want = 0.5 * gx * Math.sin(2 * Math.PI / gx) * ((R + 1.5) ** 2 - R ** 2) * 80;       // polygon rings, not circles
  for (const back of [undefined, "columns"]) {
    const s = C.heightSheet({ gx, gy, u0: 0, v0: 0, c, cv, thick, wrap: true, back, map }), r = C.checkMesh(s);
    check(r.open === 0 && C.signedVolume(s) > 0 && near(r.volume, want, want * 1e-5), `a cylinder closes at its seam (${back || "grid"} back)`, `${r.tris} tris, ${r.volume.toFixed(2)} vs ${want.toFixed(2)} mm³`);
  } }
{ const gx = 200, gy = 80, R = 60 / (Math.PI * 2 / 3), thick = new Float32Array(gx * gy).fill(2);
  const s = C.heightSheet({ gx, gy, u0: -30, v0: 0, c: 60 / (gx - 1), cv: 0.3, thick, map: (u, v, w) => { const a = u / R; return [(R + w) * Math.sin(a), v, (R + w) * Math.cos(a) - R]; } });
  const r = C.checkMesh(s), want = 120 / 360 * Math.PI * ((R + 2) ** 2 - R ** 2) * 0.3 * (gy - 1);
  check(r.open === 0 && near(r.volume, want, want * 1e-3), "a 120° curve is closed with the right volume", `${r.volume.toFixed(1)} vs ${want.toFixed(1)} mm³`); }
{ const t0 = Date.now(); sheet([C.ringRect(150, 110, 4, 10)], 150, 110, 0.3, (u, v) => 1 + Math.abs(Math.sin(u * v)), "flat"); console.log(`  150 x 110 mm at 0.3 mm built in ${Date.now() - t0} ms`); }

if (process.env.CORE) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

// ---------- the app ----------
const boot = require("./tools-test-env.js"), { encodePNG } = boot;
const env = boot(file), win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
async function analysed() { const MF = win.MakerForge; let p = null; for (let i = 0; i < 800 && !(p = MF.print); i++) await sleep(25); return p; }
const clickTab = async k => { const b = $$("#tabs button").find(b => b.dataset.k === k); if (b) { b.click(); await sleep(60); } };
async function dropPicture(name, W, H, fn) {
  const px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = Math.round(255 * fn(x, y)), o = (y * W + x) * 4; px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = 255; }
  await clickTab("art");
  const ev = new win.Event("drop", { bubbles: true, cancelable: true });
  ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], name + ".png", { type: "image/png" })] };
  document.querySelector("#drop").dispatchEvent(ev);
  for (let i = 0; i < 100 && !win.MakerForge.state.items.some(d => d.name === name && d.src); i++) await sleep(30);
  await settle();
}
const set = async (o) => { Object.assign(win.MakerForge.state.base.lithophane, o); win.MakerForge.rebuild(false); await settle(); };
const DEF = { shape: "flat", outline: "rect", radius: 4, width: 100, minT: 0.8, maxT: 3, border: 3, cell: 0.3, print: "stand", curve: 120, dia: 70, h: 80, hole: false, holeDia: 4 };
(async () => {
  await sleep(800);
  const MF = win.MakerForge;
  console.log("\nno picture yet");
  { const s = document.querySelector("#objectSel"); s.value = "lithophane"; s.dispatchEvent(new win.Event("change")); await settle(); }
  check(MF.state.items.some(d => d.example) && MF.parts.length === 1 && MF.core.checkMesh(MF.parts[0].solid).open === 0,
    "a new lithophane opens with its example picture, one closed sheet", MF.state.items.map(d => d.name).join(", "));
  MF.examples.drop(); MF.rebuild(false); await settle();
  check(!MF.parts.length && /lithophane is made from a picture/i.test(document.querySelector("#notice").textContent), "nothing built, and the app says why", document.querySelector("#notice").textContent);

  console.log("\na dark-to-light gradient, 200 x 150 px");
  await dropPicture("gradient", 200, 150, x => x / 199);
  { const s = document.querySelector("#objectSel"); s.value = "lithophane"; s.dispatchEvent(new win.Event("change")); await settle(); }
  await set(Object.assign({}, DEF, { print: "flat" }));
  let L = MF.lithophane;
  check(MF.parts.length === 1 && L, "one part", MF.parts.map(p => p.name).join(","));
  const size = () => C.solidBounds(MF.parts[0].solid).size;
  check(near(size()[0], 100, 0.01) && near(size()[2], 94 / (4 / 3) + 6, 0.01) && near(size()[1], 3, 1e-4), "lying flat: 100 × 76.5 mm (a 94 × 70.5 mm picture plus the border), 3 mm tall", size().map(v => v.toFixed(2)).join(" x "));
  const row = L => { const j = Math.floor(L.gy / 2), out = []; for (let i = 0; i < L.gx; i++) out.push(L.thick[j * L.gx + i]); return out; };
  const want = x => 3 - 2.2 * x;          // x across the picture, 0..1
  let worst = 0;
  row(L).forEach((t, i) => { const u = -50 - L.c / 2 + i * L.c, x = (u + 47) / 94; if (x > 0.02 && x < 0.98) worst = Math.max(worst, Math.abs(t - want(x))); });
  check(worst < 0.04, "thickness follows brightness: 3 mm at black, 0.8 mm at white", `worst ${worst.toFixed(3)} mm off`);
  check(near(row(L)[2], 3, 1e-6) && near(row(L)[L.gx - 3], 3, 1e-6), "the border is solid, as thick as the darkest part");
  { const r = C.checkMesh(MF.parts[0].solid), b = C.solidBounds(MF.parts[0].solid);
    check(r.open === 0 && C.signedVolume(MF.parts[0].solid) > 0 && near(b.mn[1], 0, 1e-5), "closed, outward, on the bed", `${r.tris} tris`); }
  const d = MF.state.items[MF.state.active];
  d.mirror = true; d._imgKey = ""; await set({});
  L = MF.lithophane; worst = 0;
  row(L).forEach((t, i) => { const u = -50 - L.c / 2 + i * L.c, x = (u + 47) / 94; if (x > 0.02 && x < 0.98) worst = Math.max(worst, Math.abs(t - want(1 - x))); });
  check(worst < 0.04, "Mirror on the Art tab flips it", `worst ${worst.toFixed(3)} mm off`);
  d.mirror = false; d._imgKey = "";
  await set({ minT: 0.4 });
  check(MF.checks.list.some(r => r.k === "warn" && /very thin/.test(r.t)), "0.4 mm light areas: warned", MF.checks.list.filter(r => r.k !== "ok").map(r => r.t).join(" / "));
  check(MF.checks.list.some(r => /100% infill/.test(r.t)), "and reminded of 100% infill");
  await set({ minT: 0.8 });

  console.log("\nprinted upright: a hard edge, black above white");
  await dropPicture("edge", 200, 150, (x, y) => y < 75 ? 0 : 1);
  await set(Object.assign({}, DEF, { print: "flat" }));
  const steps = L => { let up = 0; for (let i = 0; i < L.gx; i++) for (let j = 0; j + 1 < L.gy; j++) { const k = j * L.gx + i; if (L.sdf && (L.sdf[k] > 0 || L.sdf[k + L.gx] > 0)) continue; up = Math.max(up, (L.thick[k + L.gx] - L.thick[k]) / L.cv); } return up; };
  L = MF.lithophane;
  check(steps(L) > 2.5 && L.raised === 0, "lying flat the edge stays as sharp as the grid allows", `steepest rise ${steps(L).toFixed(1)} mm per mm`);
  await set({ print: "stand" });
  L = MF.lithophane;
  check(steps(L) <= 0.9 + 1e-6 && L.raised > 0, "standing, no rise is steeper than 0.9 mm per mm (about 42°)", `steepest ${steps(L).toFixed(3)}, ${(L.raised * 100).toFixed(1)}% thickened`);
  { // the black half keeps its thickness; only the white just below the edge gets thicker
    const i = Math.floor(L.gx / 2), col = []; for (let j = 0; j < L.gy; j++) col.push([L.cv * j - L.H / 2 - L.cv / 2, L.thick[j * L.gx + i]]);
    const dark = col.filter(([v]) => v > 1 && v < L.H / 2 - 4), light = col.filter(([v]) => v < -3.5 && v > -L.H / 2 + 4);
    check(dark.every(([, t]) => near(t, 3, 1e-4)) && light.every(([, t]) => near(t, 0.8, 1e-4)), "the dark half stays 3 mm, the white more than 2.4 mm below the edge stays 0.8 mm"); }
  let p = await analysed();
  check(p && p.overhang.area < 1, "no support needed", p && p.overhang.area.toFixed(1) + " mm²");
  await clickTab("make");
  { const el = document.querySelector("#lithoSummary"), cv = document.querySelector("#lithoPreview");
    check(el && /thickened a little/.test(el.textContent), "the summary on the Make tab says so", el && el.textContent.slice(0, 80) + "…");
    const px = cv && cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let lit = 0, dim = 0;
    if (px) for (let i = 0; i < px.length; i += 4) { if (px[i + 3] && px[i] > 200) lit++; else if (px[i + 3] && px[i] < 80) dim++; }
    check(lit > 1000 && dim > 1000, "the backlit preview shows the white half glowing and the black half dark", `${cv && cv.width} × ${cv && cv.height}, ${lit} lit, ${dim} dim`); }

  console.log("\nevery shape and outline (the dark-and-light edge picture)");
  for (const cfg of [{}, { print: "flat" }, { outline: "oval" }, { outline: "heart" }, { outline: "arch" }, { hole: true }, { hole: true, print: "flat" },
    { shape: "arc" }, { shape: "arc", outline: "arch", curve: 200 }, { shape: "cylinder" }]) {
    await set(Object.assign({}, DEF, cfg));
    const part = MF.parts[0], r = part && C.checkMesh(part.solid), b = part && C.solidBounds(part.solid);
    p = await analysed();
    check(part && r.open === 0 && C.signedVolume(part.solid) > 0 && near(b.mn[1], 0, 1e-4) && p && p.overhang.area < 1 && r.tris < 800000,
      `${JSON.stringify(cfg).padEnd(38)} closed, on the bed, no support`, part ? `${r.tris} tris, ${b.size.map(v => v.toFixed(1)).join(" x ")}, support ${p ? p.overhang.area.toFixed(1) : "?"} mm²` : "no part");
  }

  console.log("\nlamp shade");
  await dropPicture("wide", 240, 180, (x, y) => (x + y) % 40 < 20 ? 0.2 : 0.9);
  await set(Object.assign({}, DEF, { shape: "cylinder", dia: 70, h: 80 }));
  L = MF.lithophane;
  { const s = MF.parts[0].solid; let rmin = Infinity, rmax = 0; for (let i = 0; i < s.pos.length; i += 3) { const r = Math.hypot(s.pos[i], s.pos[i + 2]); rmin = Math.min(rmin, r); rmax = Math.max(rmax, r); }
    const b = C.solidBounds(s);
    check(near(rmin, 35, 0.01) && near(rmax, 38, 0.01) && near(b.size[1], 80, 1e-4), "70 mm inside, 3 mm wall at most, 80 mm tall", `r ${rmin.toFixed(3)}..${rmax.toFixed(3)}, ${b.size[1].toFixed(3)} tall`); }
  check(L.copies === 2 && near(L.ph, 74, 1e-6), "a 4:3 picture 74 mm tall goes round twice", `${L.copies} copies, ${L.pw.toFixed(1)} × ${L.ph.toFixed(1)} mm`);
  check(MF.checks.list.some(r => /Tall for its footprint/.test(r.t)), "the check suggests a brim for the thin tall wall");

  console.log("\nhanging hole");
  await set(Object.assign({}, DEF, { hole: true, holeDia: 5 }));
  L = MF.lithophane;
  check(L.hole && L.hole.teardrop && near(L.hole.r, 2.5, 1e-9), "standing: a teardrop, 5 mm across");
  { const k = (u, v) => Math.round((v - (-L.H / 2 - L.c / 2)) / L.cv) * L.gx + Math.round((u - (-L.W / 2 - L.c / 2)) / L.c);
    check(L.sdf[k(0, L.hole.y)] > 0 && L.sdf[k(0, L.hole.y + 3)] > 0 && L.sdf[k(0, L.hole.y - 3)] < 0, "open in the middle and at the pointed top, solid below");
    check(near(L.thick[k(4.2, L.hole.y)], 3, 1e-4), "a solid rim round it"); }
  await set({ print: "flat" });
  check(!MF.lithophane.hole.teardrop, "lying flat: a round hole");

  console.log("\nOptimize, and other artwork");
  await set(Object.assign({}, DEF));
  await analysed(); await MF.optimize(); await settle();
  check(!MF.state.model.orient && !MF.state.model.brim, "standing on its foot: Optimize leaves it as it is", JSON.stringify(MF.state.model));
  await set(Object.assign({}, DEF, { shape: "cylinder" }));
  await analysed(); await MF.optimize(); await settle();
  check(!MF.state.model.orient && MF.state.model.brim === 5, "the lamp shade stays upright and gets a brim", JSON.stringify(MF.state.model));
  { const ex = MF.exportParts(); check(ex.every(q => C.checkMesh(q).open === 0), "and exports closed", ex.map(q => C.checkMesh(q).tris).join(", ")); }
  MF.revertOptimize(); await settle();
  MF.state.items.forEach(it => it.enabled = true); await set({});
  check(MF.parts.length === 1, "pictures switched back on are not stamped onto it", MF.parts.map(q => q.name).join(", "));

  console.log("\nthe grid limit: 250 mm wide at 0.15 mm detail");
  for (const [cfg, cap] of [[{ print: "flat" }, 380000], [{ shape: "arc" }, 190000], [{ shape: "cylinder", dia: 200, h: 250 }, 380000]]) {
    await set(Object.assign({}, DEF, { width: 250, cell: 0.15 }, cfg));
    L = MF.lithophane; const r = MF.parts[0] && C.checkMesh(MF.parts[0].solid);
    check(L && L.coarsened && L.gx * L.gy <= cap && r && r.open === 0 && r.tris < 800000, `${JSON.stringify(cfg).padEnd(36)} coarsened to stay under ${cap / 1000}k points`,
      L ? `${L.gx} × ${L.gy} = ${(L.gx * L.gy / 1000).toFixed(0)}k points at ${L.c.toFixed(3)} mm, ${r ? r.tris : "?"} tris` : "nothing built");
  }
  await clickTab("make");
  check(/keep the model manageable/.test(document.querySelector("#panel").textContent), "and the Detail page says what spacing it used");

  console.log("\nhostile project");
  const bad = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state, (k, v) => k === "items" ? undefined : v)) };
  Object.assign(bad.state.base, { type: "lithophane" });
  bad.state.base.lithophane = { shape: "<img src=x onerror=alert(1)>", outline: "evil", cell: 1e-9, width: 1e9, minT: 50, maxT: -3, border: 1e6, h: 1e9, dia: -5, curve: 1e9, holeDia: 1e9, print: 7 };
  const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify(bad)], "evil.json", { type: "application/json" });
  Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.state.base.lithophane.cell !== 0.1; i++) await sleep(30);
  await settle();
  const Lt = MF.state.base.lithophane;
  check(Lt.cell === 0.1 && Lt.width === 400 && Lt.border === 40 && Lt.curve === 300 && Lt.holeDia === 20, "numbers clamped", `cell ${Lt.cell}, width ${Lt.width}, border ${Lt.border}, curve ${Lt.curve}, hole ${Lt.holeDia}`);
  check(!document.querySelector("img[src=x]"), "no markup injected");
  check(!MF.parts.length, "the project has no picture, so nothing is built (and nothing breaks)");

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
