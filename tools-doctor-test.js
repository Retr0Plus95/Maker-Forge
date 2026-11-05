// The model doctor (Session 38): what is wrong with a mesh, repairing it and simplifying it, in the core and on an
// imported model in the app (its paint and own colours kept triangle by triangle, Back to the original).
//   node tools-doctor-test.js index.html          (CORE=1: the core only)
const path = require("path");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// a ball (or a bumpy one) to break
const ball = (C, rings, segs, bump) => C.revolve(Array.from({ length: rings + 1 }, (_, i) => { const a = -Math.PI / 2 + Math.PI * i / rings; return [20 * Math.cos(a) * (1 + (bump || 0) * Math.sin(9 * a)), 20 + 20 * Math.sin(a)]; }), segs);
function damage(s, o) {
  const I = s.idx, P = s.pos, out = [];
  for (let t = 0; t < I.length / 3; t++) {
    const v = [I[t * 3], I[t * 3 + 1], I[t * 3 + 2]], yc = (P[v[0] * 3 + 1] + P[v[1] * 3 + 1] + P[v[2] * 3 + 1]) / 3;
    if (o.flip && t >= o.flip[0] && t < o.flip[1]) v.reverse();
    if (o.cut && yc > o.cut) continue;
    if (o.cut2 && yc < o.cut2) continue;
    out.push(...v);
  }
  if (o.dup) out.push(out[0], out[1], out[2]);
  return { pos: Float32Array.from(P), idx: Uint32Array.from(out) };
}

function coreTests(C) {
  console.log("what is wrong with a mesh");
  const good = ball(C, 40, 96);
  const r0 = C.meshReport(good);
  check(r0.ok && r0.open === 0 && r0.flipped === 0 && r0.shells === 1, "a closed ball: nothing wrong, one shell", JSON.stringify({ tris: r0.tris, ok: r0.ok }));
  const bad = damage(good, { flip: [3000, 3060], cut: 38.5, cut2: 1.5, dup: true });
  const r1 = C.meshReport(bad);
  check(r1.holes === 2 && r1.open > 0 && r1.flipped > 40 && r1.duplicates === 1, "a broken one: two holes, its flipped triangles and the doubled one found", JSON.stringify({ holes: r1.holes, open: r1.open, flipped: r1.flipped, dup: r1.duplicates }));
  const two = C.mergeSolids([good, C.transformSolid(good, 1, 50, 0, 0)]);
  check(C.meshReport(two).shells === 2, "two balls: two shells");

  console.log("repairing");
  const rp = C.repairMesh(bad), after = C.meshReport(rp.solid);
  check(after.ok && rp.report.holesFilled === 2 && rp.report.duplicates === 1 && rp.report.flipped >= 50, "it comes back a closed, outward-facing solid: both holes filled, the flipped triangles turned, the doubled one gone", JSON.stringify(rp.report));
  check(near(C.signedVolume(rp.solid), C.signedVolume(good), C.signedVolume(good) * 0.02) && C.signedVolume(rp.solid) > 0, "its volume within 2% of the whole ball (the holes are filled flat)", `${C.signedVolume(rp.solid).toFixed(0)} against ${C.signedVolume(good).toFixed(0)} mm³`);
  const kept = [...rp.src].filter(t => t >= 0).length, fills = [...rp.src].filter(t => t < 0).length;
  check(kept === bad.idx.length / 3 - 1 && fills > 0, "every triangle left says which one it came from; the fills say none", `${kept} kept, ${fills} new`);
  const inside = { pos: good.pos, idx: Uint32Array.from(good.idx).map((v, i, a) => i % 3 === 1 ? a[i + 1] : i % 3 === 2 ? a[i - 1] : v) };
  const rpi = C.repairMesh(inside);
  check(rpi.report.inverted === 1 && C.signedVolume(rpi.solid) > 0, "an inside-out ball is turned the right way out", rpi.report.inverted);
  // points a hair apart (as an exported file often has) are joined
  const split = { pos: Float32Array.from(good.pos), idx: Uint32Array.from(good.idx) }, P2 = Array.from(split.pos), I2 = Array.from(split.idx);
  for (let t = 0; t < 50; t++) { const v = I2[t * 3]; I2[t * 3] = P2.length / 3; P2.push(split.pos[v * 3] + 0.0002, split.pos[v * 3 + 1], split.pos[v * 3 + 2]); }
  const rs = C.repairMesh({ pos: Float32Array.from(P2), idx: Uint32Array.from(I2) });
  check(C.meshReport({ pos: Float32Array.from(P2), idx: Uint32Array.from(I2) }).open > 0 && C.meshReport(rs.solid).ok && rs.report.welded >= 50, "points 0.0002 mm apart are joined and the model closes", rs.report.welded);

  console.log("simplifying");
  const fine = ball(C, 120, 240, 0.1), n0 = fine.idx.length / 3;
  for (const f of [0.5, 0.1, 0.02]) {
    const s = C.simplifyMesh(fine, Math.round(n0 * f)), r = C.meshReport(s.solid), v = C.signedVolume(s.solid) / C.signedVolume(fine);
    check(r.ok && Math.abs(s.solid.idx.length / 3 - n0 * f) <= n0 * f * 0.02 + 4 && near(v, 1, f >= 0.1 ? 0.005 : 0.02), `to ${f * 100}% of ${n0} triangles: closed, the volume kept`, `${s.solid.idx.length / 3} triangles, volume ×${v.toFixed(4)}`);
  }
  const s2 = C.simplifyMesh(fine, Math.round(n0 / 10));
  check([...s2.src].every(t => t >= 0 && t < n0) && new Set(s2.src).size === s2.src.length, "each triangle left is one of the originals, once");
  // the bumps stay where they were: the furthest point from the axis at each height still follows the shape
  const P = s2.solid.pos; let worst = 0;
  for (let i = 0; i < P.length; i += 3) { const y = P[i + 1], a = Math.asin(Math.max(-1, Math.min(1, (y - 20) / 20))), r = Math.hypot(P[i], P[i + 2]), want = 20 * Math.cos(a) * (1 + 0.1 * Math.sin(9 * a)); worst = Math.max(worst, Math.abs(r - want)); }
  check(worst < 0.6, "at a tenth, every point stays within 0.6 mm of the true bumpy surface", worst.toFixed(3) + " mm");
  const open = damage(fine, { cut: 39 }), so = C.simplifyMesh(open, Math.round(open.idx.length / 3 / 4)), ro = C.meshReport(so.solid);
  check(ro.holes === 1 && ro.nonManifold === 0 && ro.flipped === 0, "an open model keeps its hole's edge as it was (open edges never collapse)", JSON.stringify({ holes: ro.holes, open: ro.open }));
}

async function appTests() {
  const boot = require("./tools-test-env.js");
  const env = boot(process.argv[2] || "index.html");
  const win = env.window;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length;
  console.log("the model doctor on an imported model");
  // a broken ball as a binary STL (Z up)
  const good = ball(C, 60, 200), bad = damage(good, { flip: [500, 700], cut: 39 }), I = bad.idx, P = bad.pos, n = I.length / 3;
  const buf = Buffer.alloc(84 + n * 50); buf.writeUInt32LE(n, 80);
  for (let t = 0; t < n; t++) for (let j = 0; j < 3; j++) { const v = I[t * 3 + j], o = 84 + t * 50 + 12 + j * 12; buf.writeFloatLE(P[v * 3], o); buf.writeFloatLE(-P[v * 3 + 2], o + 4); buf.writeFloatLE(P[v * 3 + 1], o + 8); }
  await MF.paint.importModel(new win.File([buf], "broken-ball.stl", { type: "model/stl" })); await settle();
  const before = MF.doctor.check();
  check(before && before.holes === 1 && before.flipped > 100 && !before.ok, "the Model doctor finds the hole and the flipped triangles", before && JSON.stringify({ holes: before.holes, flipped: before.flipped }));
  await MF.doctor.run("repair"); await settle();
  const r = MF.doctor.check();
  check(r && r.ok && /repaired/.test(MF.state.base.stl.name) && MF.parts.every(p => C.checkMesh(p.solid).open === 0), "Repair: a closed solid, opened in place of the broken one", MF.state.base.stl.name);
  await MF.doctor.run("simplify", 0.25); await settle();
  const s = MF.doctor.check();
  check(s && s.ok && Math.abs(s.tris - r.tris / 4) < r.tris * 0.02, "A quarter: a quarter of the triangles, still closed", s && s.tris);
  MF.doctor.back(); await settle();
  const b = MF.doctor.check();
  check(b && b.tris === before.tris && b.holes === 1, "Back to the original brings the broken one back", b && b.tris);
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
