// The traced part's edges (Session 44): a chamfered or rounded top edge, a chamfer at the bottom against the first
// layer's squish, and countersunk round holes, each measured where it should be; closed, on the bed, no support.
//   node tools-tracer-edge-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
function insideMesh(s, p) {
  const P = s.pos, I = s.idx, d = [1, 1e-3, 2e-3]; let n = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const f = 1 / det, sv = [p[0] - P[a], p[1] - P[a + 1], p[2] - P[a + 2]], u = f * (sv[0] * h[0] + sv[1] * h[1] + sv[2] * h[2]);
    if (u < 0 || u > 1) continue;
    const q = [sv[1] * e1[2] - sv[2] * e1[1], sv[2] * e1[0] - sv[0] * e1[2], sv[0] * e1[1] - sv[1] * e1[0]], v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]);
    if (v < 0 || u + v > 1) continue;
    if (f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) > 1e-9) n++;
  }
  return n % 2 === 1;
}
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length, T = () => MF.state.base.tracer;
  const s = win.document.querySelector("#objectSel"); s.value = "tracer"; s.dispatchEvent(new win.Event("change")); await settle();
  const build = async o => { Object.assign(T(), { edgeTop: "square", edgeSize: 1, edgeBottom: 0, sink: false, thick: 5, extra: "none", colours: "one" }, o); MF.rebuild(false); await settle(); return MF.parts[0]; };
  const good = p => { const r = C.checkMesh(p.solid), b = C.solidBounds(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0 && near(b.mn[1], 0, 1e-3) && near(b.mx[1], 5, 1e-3); };
  const supportOf = async () => { await MF.printNow(); for (let i = 0; i < 200 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };

  // the outer wall's position at height y, coming in from the right along the line z = zc
  let plain = await build({});
  const pb = C.solidBounds(plain.solid), zc = (pb.mn[2] + pb.mx[2]) / 2;
  let xIn = null; for (let x = pb.mx[0]; x > pb.mn[0]; x -= 0.25) if (insideMesh(plain.solid, [x, 2.5, zc])) { xIn = x - 1.5; break; }
  const wallAt = (sol, y) => { let lo = xIn, hi = pb.mx[0] + 1; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (insideMesh(sol, [m, y, zc])) lo = m; else hi = m; } return (lo + hi) / 2; };
  const w0 = wallAt(plain.solid, 2.5);
  check(good(plain) && xIn !== null && MF.tracer.edges == null, "a square edge is the part as it was: no edge work done", `wall at x = ${w0.toFixed(2)} mm`);

  console.log("\na chamfered top edge");
  let p = await build({ edgeTop: "chamfer", edgeSize: 1 });
  const c1 = w0 - wallAt(p.solid, 4.5), c2 = w0 - wallAt(p.solid, 4.9), cm = w0 - wallAt(p.solid, 3.5);
  check(good(p) && near(cm, 0, 0.06) && near(c1, 0.5, 0.15) && near(c2, 0.9, 0.15), "1 mm at 45°: the wall in by 0.5 mm half way up the chamfer and 0.9 mm near the top, straight below it",
    `${cm.toFixed(2)} at 3.5 mm, ${c1.toFixed(2)} at 4.5, ${c2.toFixed(2)} at 4.9`);
  check((await supportOf()) < 3, "it needs no support");

  console.log("\na rounded top edge and a chamfer at the bottom");
  p = await build({ edgeTop: "round", edgeSize: 1.5, edgeBottom: 0.4 });
  const r1 = w0 - wallAt(p.solid, 4.2), r2 = w0 - wallAt(p.solid, 4.8), b1 = w0 - wallAt(p.solid, 0.05), b2 = w0 - wallAt(p.solid, 0.6);
  // 0.2 mm slabs from 3.5 mm up, each at its middle's inset: a quarter circle of 1.5 mm is in by 1.5 - √(1.5² - 0.7²) =
  // 0.17 at 4.2 mm and 1.5 - √(1.5² - 1.3²) = 0.75 at 4.8 mm
  check(good(p) && near(r1, 0.17, 0.08) && near(r2, 0.75, 0.1), "the rounded edge follows a quarter circle of 1.5 mm", `${r1.toFixed(2)} at 4.2 mm, ${r2.toFixed(2)} at 4.8`);
  check(near(b1, 0.35, 0.12) && near(b2, 0, 0.06), "the bottom edge steps in 0.4 mm at 45° (0.35 mm in at 0.05 mm up) and is straight above it", `${b1.toFixed(2)} at 0.05 mm, ${b2.toFixed(2)} at 0.6`);
  check((await supportOf()) < 3, "it needs no support (the bottom chamfer is 45°)");

  console.log("\ncountersunk holes");
  p = await build({ sink: true });
  const holes = (MF.tracer.holes || []).filter(q => q.round), sk = MF.tracer.edges && MF.tracer.edges.sinks;
  check(holes.length > 0 && sk && sk.length === holes.length, "every round hole is countersunk", sk && sk.map(q => `${q.dia} → ${q.head} mm, ${q.depth} deep`).join("; "));
  if (holes.length) {
    const q = holes[0], cx = q.x, cz = -q.y, rAt = y => { let lo = 0, hi = 20; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (insideMesh(p.solid, [cx + m, y, cz])) hi = m; else lo = m; } return (lo + hi) / 2; };
    const d = sk[0].depth, rb = rAt(1), rt = rAt(4.9), rm = rAt(5 - d / 2);
    check(!insideMesh(p.solid, [cx, 2.5, cz]) && near(rb, q.made / 2, 0.06) && near(rt, q.made / 2 + d - 0.1, 0.15) && near(rm, q.made / 2 + d / 2, 0.15),
      "the hole keeps its size below the countersink, which widens at 45° to the head at the top", `r ${rb.toFixed(2)} at 1 mm, ${rm.toFixed(2)} half way, ${rt.toFixed(2)} at 4.9 mm`);
  }
  check(good(p) && (await supportOf()) < 3, "closed, on the bed, no support");
  // a hole an M3 screw's clearance (3.4 mm) countersinks to M3's head, 6.0 + 0.4 mm
  p = await build({ sink: true, snap: 0, holeClear: 0 });
  check(good(p), "with the holes at their measured size: still closed");
  p = await build({ edgeTop: "chamfer", edgeSize: 4 });
  check(good(p) && near(MF.tracer.edges.eT, 2.25, 1e-6), "an edge bigger than half the part is kept to 45% of its thickness", MF.tracer.edges.eT + " mm");
  p = await build({ edgeTop: "chamfer", colours: "keep" });
  check(MF.tracer.edges == null, "not with the picture's colours kept (the colours are the top layer)");
  await build({});

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
