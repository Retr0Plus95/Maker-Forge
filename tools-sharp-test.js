// Sharp paint edges (Session 40): the mesh cut along each brush stroke's edge and each painted picture's colour
// edges, so a colour ends where it was painted instead of at the nearest triangle edge.
//   node tools-sharp-test.js index.html          (CORE=1: the core only)
const path = require("path");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const plate = C => C.extrudePolysAt([{ outer: [[-20, -20], [20, -20], [20, 20], [-20, 20]], holes: [] }], 0, 2);   // 40 × 40 × 2, top at y = 2

// how far the painted region's edge (on the top face) is from where it should be: f is 0 on the true edge
function edgeOff(C, solid, topo, set, f) {
  const I = solid.idx, P = solid.pos; let worst = 0, sum = 0, n = 0;
  for (const t of set) for (let e = 0; e < 3; e++) {
    const u = topo.nbr[3 * t + e]; if (u < 0 || set.has(u) || Math.abs(topo.nrm[3 * u + 1]) < 0.9) continue;
    for (const v of [I[3 * t + e], I[3 * t + (e + 1) % 3]]) { const d = Math.abs(f(P[3 * v], P[3 * v + 1], P[3 * v + 2])); worst = Math.max(worst, d); sum += d; n++; }
  }
  return { worst, avg: n ? sum / n : 0 };
}

function coreTests(C) {
  console.log("a stroke as a shape");
  const sf = C.strokeField([[-10, 2, 0], [10, 2, 0]], 5);
  check(near(sf.f(0, 2, 0), -5, 1e-9) && near(sf.f(0, 2, 5), 0, 1e-9) && near(sf.f(13, 2, 0), -2, 1e-9) && near(sf.f(0, 2, 9), 4, 1e-9) && sf.f(0, 2, 30) > 0,
    "the distance to the stroke's line less its radius: −5 on the line, 0 at its edge, beyond the ends round", [sf.f(0, 2, 0), sf.f(0, 2, 5), sf.f(13, 2, 0), sf.f(0, 2, 9)].map(v => v.toFixed(2)).join(", "));

  console.log("\nthe brush, cut into the model");
  const S = plate(C), path3 = [[-10, 2, 0], [3, 2, 6], [10, 2, -4]], r = 4, want = { cut: null, plain: null };
  for (const cut of [false, true]) {
    const ed = C.meshEditor(S); ed.refine(1.2, 1e6);
    const f = C.strokeField(path3, r);
    const n = cut ? ed.cutField(f.f, f.box) : 0;
    const so = ed.solid(), topo = C.meshTopology(so), set = new Set(C.strokeTris(topo, C.triangleGrid(topo, 3), f, [0, -1, 0], 0)), m = C.checkMesh(so);
    want[cut ? "cut" : "plain"] = { off: edgeOff(C, so, topo, set, f.f), closed: m.open === 0 && near(m.volume, 3200, 1e-3), n, tris: topo.n };
  }
  check(want.cut.closed && want.cut.n > 50, "cut along the stroke's edge, the plate stays closed and keeps its volume", `${want.cut.n} edges split, ${want.cut.tris - want.plain.tris} more triangles`);
  check(want.cut.off.avg < 0.03 && want.plain.off.avg > 0.15, "the paint's edge follows the stroke: on average 0.03 mm or less from it, against the triangles' 0.2 mm",
    `${want.cut.off.avg.toFixed(3)} against ${want.plain.off.avg.toFixed(3)} mm (worst ${want.cut.off.worst.toFixed(2)} and ${want.plain.off.worst.toFixed(2)})`);
  // a single dab is a disc: its area on the top face against π r²
  {
    const ed = C.meshEditor(S); ed.refine(2.5, 1e6); const f = C.strokeField([[0, 2, 0]], 6); ed.cutField(f.f, f.box);
    const so = ed.solid(), topo = C.meshTopology(so); let a = 0;
    for (const t of C.strokeTris(topo, C.triangleGrid(topo, 3), f, [0, -1, 0], 0)) a += topo.area[t];
    check(near(a, Math.PI * 36, Math.PI * 36 * 0.01), "a dab 12 mm across on coarse triangles (2.5 mm) covers its disc within 1%", `${a.toFixed(1)} against ${(Math.PI * 36).toFixed(1)} mm²`);
  }
  // a stroke only looks at the edges near it
  {
    const ed = C.meshEditor(S); ed.refine(1.2, 1e6); const before = ed.tris(), f = C.strokeField([[15, 2, 15]], 2);
    ed.cutField(f.f, f.box); const so = ed.solid(), P = so.pos; let far = 0;
    for (let i = before * 3; i < so.idx.length; i++) { const v = so.idx[i]; if (Math.hypot(P[3 * v] - 15, P[3 * v + 2] - 15) > 4) far++; }
    check(ed.tris() > before && far === 0, "a cut in a corner changes nothing away from it", `${ed.tris() - before} new triangles, ${far} far away`);
  }
  // speed: a stroke across a 488 000-triangle ball
  {
    const ball = C.revolve(Array.from({ length: 351 }, (_, i) => { const a = -Math.PI / 2 + Math.PI * i / 350; return [30 * Math.cos(a), 30 + 30 * Math.sin(a)]; }), 700);
    const ed = C.meshEditor(ball), f = C.strokeField(Array.from({ length: 30 }, (_, i) => { const a = -0.6 + i * 0.04; return [30 * Math.sin(a), 30, 30 * Math.cos(a)]; }), 3);
    const t0 = Date.now(); const n = ed.cutField(f.f, f.box), ms = Date.now() - t0;
    check(n > 100 && ms < 1500, "a stroke across a 488 000-triangle ball is cut quickly (only the edges near it are looked at)", `${n} edges split in ${ms} ms`);
  }

  console.log("\nthe box and lasso tool, cut into the model");
  {
    // looking straight down at the plate: screen x = world x / 20, screen y = −z / 20 (-1..1 over the 40 mm plate)
    const M = [0.05, 0, 0, 0, 0, 0, -0.01, 0, 0, -0.05, 0, 0, 0, 0, 0, 1];
    const loop = Array.from({ length: 7 }, (_, i) => { const a = i / 7 * 2 * Math.PI + 0.3; return [0.45 * Math.cos(a), 0.45 * Math.sin(a)]; });   // a 7-sided lasso
    let pa = 0; for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) pa += (loop[j][0] + loop[i][0]) * (loop[j][1] - loop[i][1]) / 2;
    const want = Math.abs(pa) * 400, af = C.areaField(M, loop), res = {};
    for (const cut of [false, true]) {
      const ed = C.meshEditor(S); ed.refine(2, 1e6); if (cut) ed.cutField(af);
      const so = ed.solid(), topo = C.meshTopology(so), set = new Set(C.areaTris(so, M, loop, false));
      let a = 0; for (const t of set) a += topo.area[t];
      res[cut] = { a, off: edgeOff(C, so, topo, set, (x, y, z) => af(x, y, z) * 20), closed: C.checkMesh(so).open === 0, top: [...set].every(t => topo.nrm[3 * t + 1] > 0.9) };
    }
    check(res[true].closed && res[true].top && Math.abs(res[true].a - want) / want < 0.005, "a lasso on the plate's top takes its outline's area within 0.5%, only on the top face", `${res[true].a.toFixed(1)} against ${want.toFixed(1)} mm² (triangles alone ${res[false].a.toFixed(1)})`);
    check(res[true].off.avg < 0.03 && res[true].off.avg < res[false].off.avg / 4, "and its edge follows the outline", `${res[true].off.avg.toFixed(3)} against ${res[false].off.avg.toFixed(3)} mm`);
  }

  console.log("\na picture's colours, cut into the model");
  // a 40 × 40 picture: the left half colour 1, the right half colour 2, a disc of colour 3 in the middle
  const W = 40, H = 40, pix = new Int16Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) pix[j * W + i] = Math.hypot(i + 0.5 - 20, j + 0.5 - 20) < 10 ? 3 : i < 20 ? 1 : 2;
  const pic = { w: W, h: H, pix, aspect: 1 }, F = C.pictureFields(pic);
  check(F.labels.join() === "-1,1,2,3" && F.which(0.1, 0.1) === 1 && F.which(0.9, 0.1) === 2 && F.which(0.5, 0.5) === 3 && F.which(1.3, 0.5) === -1, "each colour (and off the picture) has a shape", F.labels.join());
  const box = [-16, -14, 16, 18];                     // front: u = x, v = y; the picture 32 × 32 mm on the plate's front face... on its top (dir "top")
  const tall = C.extrudePolysAt([{ outer: [[-20, -2], [20, -2], [20, 2], [-20, 2]], holes: [] }], -20, 20);   // a wall 40 wide, 40 high, 4 thick: front face at z = 2
  let offPlain = [0, 0];
  for (const cut of [false, true]) {
    const ed = C.meshEditor(tall); ed.refine(1.5, 1e6);
    const uv = C.pictureUV("front", box);
    if (cut) for (const k of F.labels) if (k !== -1) ed.cutField((x, y, z) => { const q = uv(x, y, z); return F.at(k, q[0], q[1]); });
    const so = ed.solid(), topo = C.meshTopology(so), paint = new Uint8Array(topo.n).fill(255);
    C.paintPicture(topo, paint, pic, "front", box, true, cut ? F : null);
    const area = {}; for (let t = 0; t < topo.n; t++) if (paint[t] !== 255) area[paint[t]] = (area[paint[t]] || 0) + topo.area[t];
    const disc = Math.PI * 64, half = (32 * 32 - disc) / 2;   // the disc is 10 of 40 pixels in radius: 8 mm
    // the colour edges on the front face: how far each corner on one is from the true edge (the disc's circle,
    // radius 8 mm round (0, 2), or the halves' line x = 0)
    // (the circle is drawn in 0.8 mm pixels, so even a perfect cut is a little off a true circle)
    const I = so.idx, P = so.pos, line = [0, 0], ring = [0, 0];
    for (let t = 0; t < topo.n; t++) for (let e = 0; e < 3; e++) {
      const u = topo.nbr[3 * t + e]; if (u < 0 || paint[u] === paint[t] || paint[u] === 255 || paint[t] === 255 || topo.nrm[3 * t + 2] < 0.9) continue;
      for (const v of [I[3 * t + e], I[3 * t + (e + 1) % 3]]) {
        const x = P[3 * v], yy = P[3 * v + 1];
        if (paint[t] === 3 || paint[u] === 3) { ring[0] += Math.abs(Math.hypot(x, yy - 2) - 8); ring[1]++; } else { line[0] += Math.abs(x); line[1]++; }
      }
    }
    const offL = line[0] / line[1], offR = ring[0] / ring[1];
    if (cut) {
      check(offL < 0.02 && offL < offPlain[0] / 5, "the straight edge between the halves: on average under 0.02 mm off", `${offL.toFixed(3)} against ${offPlain[0].toFixed(3)} mm on the triangles`);
      check(offR < 0.2 && offR < offPlain[1] * 0.6, "the circle: within a quarter pixel on average, and closer than the triangles", `${offR.toFixed(3)} against ${offPlain[1].toFixed(3)} mm`);
    } else offPlain = [offL, offR];
    const err = Math.max(Math.abs(area[3] - disc) / disc, Math.abs(area[1] - half) / half, Math.abs(area[2] - half) / half);
    if (cut) check(C.checkMesh(so).open === 0 && err < 0.02, "cut along its colours: each colour's area within 2% of the picture's (the disc 201 mm², each half 412 mm²)",
      `${[3, 1, 2].map(k => (area[k] || 0).toFixed(1)).join(", ")} mm², worst ${(err * 100).toFixed(2)}%`);
    else check(true, "on the triangles alone", `${[3, 1, 2].map(k => (area[k] || 0).toFixed(1)).join(", ")} mm², worst ${(err * 100).toFixed(2)}%`);
  }
}

async function appTests() {
  const boot = require("./tools-test-env.js");
  const env = boot(process.argv[2] || "index.html");
  const win = env.window, document = win.document;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, st = () => MF.state, e0 = env.errors.length;
  const s = document.querySelector("#objectSel"); s.value = "turned"; s.dispatchEvent(new win.Event("change")); await settle();
  MF.examples.drop(); st().paint.ops = []; MF.rebuild(false); await settle();
  const areaOf = slot => { let a = 0; MF.parts.forEach(p => { if (!p.paint) return; const T = C.meshTopology(p.solid); for (let t = 0; t < T.n; t++) if (p.paint[t] === slot) a += T.area[t]; }); return a; };
  console.log("\nin the app: a dab on the vase");
  // the vase's side at its widest, seen from the front: a dab 8 mm across, facing the camera
  const B = C.solidBounds(MF.parts[0].solid0 || MF.parts[0].solid), y = (B.mn[1] + B.mx[1]) / 2;
  let zf = 0; { const P = MF.parts[0].solid.pos; for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i]) < 2 && Math.abs(P[i + 1] - y) < 2) zf = Math.max(zf, P[i + 2]); }
  const dab = { k: "brush", slot: 3, r: 4, facing: [0, 0, -1], pts: [[0, y, zf]] };
  st().paint.sharp = false; st().paint.ops = [JSON.parse(JSON.stringify(dab))]; MF.paint.repaint(); await settle();
  const plainArea = areaOf(3), plainTris = MF.parts[0].solid.idx.length / 3;
  st().paint.sharp = true; MF.paint.repaint(); await settle(); MF.paint.flushSharpen();
  const sharpArea = areaOf(3), sharpTris = MF.parts[0].solid.idx.length / 3, disc = Math.PI * 16;
  check(MF.parts.every(p => C.checkMesh(p.solid).open === 0) && sharpTris > plainTris, "Sharp edges cut the dab into the vase, which stays closed", `${sharpTris - plainTris} more triangles`);
  check(Math.abs(sharpArea - disc) / disc < 0.06, "its area is the dab's disc (on the curved side) within 6%", `${sharpArea.toFixed(1)} mm² (triangles alone: ${plainArea.toFixed(1)}) against ${disc.toFixed(1)}`);
  // the export carries the cut mesh and its paint
  const ex = MF.exportParts ? MF.exportParts() : null;
  check(!ex || ex.some(q => q.idx.length / 3 >= sharpTris - 10), "the download has the cut model", ex && ex.map(q => q.idx.length / 3).join(", "));
  // erasing part of it is cut too: the dab less a smaller one beside it
  st().paint.ops.push({ k: "brush", slot: 255, r: 2, facing: [0, 0, -1], pts: [[3, y, zf]] }); MF.paint.repaint(); await settle(); MF.paint.flushSharpen();
  const after = areaOf(3);
  check(after < sharpArea - 5 && after > sharpArea - 4 * Math.PI - 2, "the eraser's edge is cut as well", `${sharpArea.toFixed(1)} → ${after.toFixed(1)} mm²`);
  // on a big model (the vase is 209 000 triangles) a new stroke shows on the triangles at once, and is cut a
  // moment after painting stops
  st().paint.ops.push({ k: "brush", slot: 2, r: 3, facing: [0, 0, -1], pts: [[-6, y + 8, zf - 0.5]] }); MF.paint.repaint();
  const waiting = MF.paint.sharpPending, nWait = MF.parts[0].solid.idx.length / 3;
  for (let i = 0; i < 100 && MF.paint.sharpPending; i++) await sleep(50);
  await settle();
  check(waiting && !MF.paint.sharpPending && MF.parts[0].solid.idx.length / 3 > nWait && MF.parts.every(p => C.checkMesh(p.solid).open === 0),
    "a new stroke on a big model waits a moment, then is cut by itself", `${nWait} → ${MF.parts[0].solid.idx.length / 3} triangles`);
  // turning it off puts the plain triangles back
  st().paint.sharp = false; MF.paint.repaint(); await settle();
  check(MF.parts[0].solid.idx.length / 3 < sharpTris, "Sharp edges off: the plain triangles again", MF.parts[0].solid.idx.length / 3);
  st().paint.sharp = true;

  console.log("\na saved project");
  const proj = JSON.parse(JSON.stringify({ app: "maker-forge", state: st() })); delete proj.state.paint.sharp;
  const f = new win.File([JSON.stringify(proj)], "old.json", { type: "application/json" }), inp = document.querySelector("#projInput");
  Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && st().paint.sharp !== true; i++) await sleep(30); await settle();
  check(st().paint.sharp === true, "a project saved before Sharp edges opens with them on");
  const bad = JSON.parse(JSON.stringify({ app: "maker-forge", state: st() })); bad.state.paint.sharp = "<img src=x onerror=alert(9)>";
  const f2 = new win.File([JSON.stringify(bad)], "bad.json", { type: "application/json" });
  Object.defineProperty(inp, "files", { value: [f2], configurable: true }); inp.dispatchEvent(new win.Event("change")); await sleep(300); await settle();
  check(st().paint.sharp === true && !document.body.innerHTML.includes("alert(9)"), "a bad value is read as on, and nothing is injected");
  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
}

(async () => {
  global.earcut = require("earcut");
  require(path.resolve(__dirname, "src/core.js"));
  coreTests(globalThis.PRCore);
  if (!process.env.CORE) await appTests();
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
