// Frames for a photo (Session 42): sizes from the photo, the pocket and its 45° bevel, the back panel's fit, the stand
// and its socket, the keyholes, no support, everything on the bed, and the old frame unchanged.
//   node tools-frame-test.js index.html
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
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length, F = () => MF.state.base.frame;
  const s = win.document.querySelector("#objectSel"); s.value = "frame"; s.dispatchEvent(new win.Event("change")); await settle();
  MF.examples.drop(); await settle();
  const build = async o => { MF.state.base.frame = Object.assign(JSON.parse(JSON.stringify(MF.defaults.frame)), o || {}); MF.rebuild(false); await settle(); return MF.parts; };
  const good = parts => parts.length && parts.every(p => { const r = C.checkMesh(p.solid), b = C.solidBounds(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0 && b.mn[1] > -1e-3; });
  const supportOf = async () => { await MF.printNow(); for (let i = 0; i < 200 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };

  console.log("the old frame");
  let q = await build({});
  const fb = C.solidBounds(q[0].solid);
  check(q.length === 1 && good(q) && near(fb.mx[0] - fb.mn[0], 120, 0.01) && near(fb.mx[2] - fb.mn[2], 160, 0.01) && near(fb.mx[1], 5, 1e-3) && near(C.signedVolume(q[0].solid), (120 * 160 - (4 - Math.PI) * 36 - (85 * 115 - (4 - Math.PI) * 16)) * 5, 40),
    "with no photo it is the frame it was: 120 × 160 × 5 mm with an 85 × 115 mm window", `${(fb.mx[0] - fb.mn[0]).toFixed(1)} × ${(fb.mx[2] - fb.mn[2]).toFixed(1)} × ${fb.mx[1].toFixed(2)}`);

  console.log("\na frame for a 10 × 15 cm photo");
  q = await build({ photo: "10x15", stand: "leg", hang: true });
  const fr = q.find(p => p.name === "Frame"), pan = q.find(p => p.name === "Back panel"), leg = q.find(p => p.name === "Stand");
  const b = C.solidBounds(fr.solid), D = MF.frame && MF.frame.dims;
  check(good(q) && fr && pan && leg, "three parts, all closed and on the bed: the frame, the back panel and the stand", q.map(p => p.name).join(", "));
  check(near(b.mx[0] - b.mn[0], 102.3 + 28, 0.01) && near(b.mx[2] - b.mn[2], 152.3 + 28, 0.01), "the frame is the photo's pocket (0.3 mm bigger) and 14 mm round it", `${(b.mx[0] - b.mn[0]).toFixed(1)} × ${(b.mx[2] - b.mn[2]).toFixed(1)} mm`);
  // through the window at the top: empty; through the photo's edge (2 mm in from it, behind the 4 mm overlap): the pocket
  // at the back, the frame in front of it
  check(D && near(D.winW, 94, 1e-6) && near(D.winH, 144, 1e-6) && !insideMesh(fr.solid, [0, D.thick - 0.3, 0]), "the window is the photo less 4 mm all round, open right through", D && `${D.winW} × ${D.winH} mm`);
  const edge = [102 / 2 - 2, 0, 0];
  check(!insideMesh(fr.solid, [edge[0], 1, 0]) && !insideMesh(fr.solid, [edge[0], D.zb - 0.2, 0]) && insideMesh(fr.solid, [edge[0], D.thick - 0.4, 0]),
    "behind the window's edge: the pocket for the photo, the sheet and the panel; the frame in front", `pocket ${D.zb.toFixed(1)} mm deep, frame ${D.thick.toFixed(2)} mm thick`);
  // the bevel: at height zb + k the pocket's wall is k mm further in (45°)
  const wallAt = y => { let lo = 0, hi = 60; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (insideMesh(fr.solid, [m, y, 0])) hi = m; else lo = m; } return (lo + hi) / 2; };
  const w1 = wallAt(D.zb + 1.1), w3 = wallAt(D.zb + 3.1);
  check(near(w1 - w3, 2, 0.25), "the window's edge is bevelled at 45° from the pocket in to the window", `${w1.toFixed(2)} → ${w3.toFixed(2)} mm over 2 mm up`);
  const pb = C.solidBounds(pan.solid);
  check(near(pb.mx[0] - pb.mn[0], 102.3 - 0.3, 0.02) && near(pb.mx[2] - pb.mn[2], 152.3 - 0.3, 0.02), "the back panel is 0.15 mm smaller all round than the pocket", `${(pb.mx[0] - pb.mn[0]).toFixed(2)} × ${(pb.mx[2] - pb.mn[2]).toFixed(2)} mm`);
  // the notch: a point 4 mm below the pocket's bottom edge in the middle, 0.5 mm up, is empty; 10 mm to its side it is frame
  check(!insideMesh(fr.solid, [0, 0.5, 152.3 / 2 + 4]) && insideMesh(fr.solid, [10, 0.5, 152.3 / 2 + 4]), "a notch below the pocket to lift the panel out with a fingernail");
  const lb = C.solidBounds(leg.solid);
  check(lb.mn[0] > b.mn[0] + 14 && lb.mx[0] < b.mx[0] - 14 && lb.mn[2] > b.mn[2] + 14 && lb.mx[2] < b.mx[2] - 14 && near(lb.mx[1], 2.9, 1e-3), "the stand prints in the frame's window, 2.9 mm thick", `${(lb.mx[0] - lb.mn[0]).toFixed(0)} × ${(lb.mx[2] - lb.mn[2]).toFixed(0)} mm`);
  const sup = await supportOf();
  check(sup >= 0 && sup < 3 && MF.checks.list.some(l => /Fits the bed/.test(l.t)), "nothing needs support (the bevel, the notch, the keyholes' lips all step in at 45°) and it fits the bed", sup.toFixed(1) + " mm²");

  console.log("\nother photos");
  const bad = [];
  for (const photo of ["6x9", "9x13", "13x18", "a6", "a5", "10x10"]) for (const landscape of [false, true]) {
    const p = await build({ photo, landscape, stand: "leg", hang: true });
    const fb2 = C.solidBounds(p[0].solid), wide = fb2.mx[0] - fb2.mn[0] > fb2.mx[2] - fb2.mn[2];
    if (!good(p) || (photo !== "10x10" && wide !== landscape)) bad.push(`${photo}${landscape ? " sideways" : ""}`);
  }
  check(!bad.length, "every photo size, upright and sideways: closed, on the bed, the right way round", bad.join(", "));
  q = await build({ photo: "custom", pw: 60, ph: 60, stand: "none", hang: false });
  check(good(q) && q.length === 2 && near(C.solidBounds(q[0].solid).mx[0] - C.solidBounds(q[0].solid).mn[0], 60.3 + 28, 0.01), "my own size, no stand and no keyholes: a frame and a plain panel");

  console.log("\nstands (Session 42)");
  q = await build({ standBase: true });
  { const st = q.find(p => p.name === "Stand"), sb = st && C.solidBounds(st.solid);
    // the slot: across the stand's middle, 1 mm under its top, is empty over the frame's thickness plus 0.3 mm (seen
    // at an angle: 5.3 / cos 10° wide), solid either side
    const midX = sb ? (sb.mn[0] + sb.mx[0]) / 2 : 0, depthAt = z => insideMesh(st.solid, [midX, 9, z]);
    // the longest empty run with solid on both sides (the chamfered corners are open to the outside)
    let empty = 0, run = 0, seenSolid = false; if (sb) for (let z = sb.mn[2] + 0.02; z <= sb.mx[2]; z += 0.05) { if (depthAt(z)) { if (seenSolid && run) empty = Math.max(empty, run); run = 0; seenSolid = true; } else if (seenSolid) run++; }
    check(good(q) && st && near(sb.mx[1], 10, 1e-3) && near(empty * 0.05, (5 + 0.3) / Math.cos(Math.PI / 18), 0.15), "a frame without a photo with a stand: a 10 mm base whose slot is the frame's 5 mm plus 0.3", sb && `slot ${(empty * 0.05).toFixed(2)} mm across at 9 mm up`); }
  const fsup = await supportOf();
  check(fsup >= 0 && fsup < 3, "the stand needs no support (its slot leans 10°, its top edges are chamfered)", fsup.toFixed(1) + " mm²");
  for (const [type, set, name] of [["board", b => { b.board.stand = true; b.board.thick = 3; }, "a plaque"], ["sign", b => { Object.assign(b.sign, { style: "solid", text: "OPEN", letterH: 40, depth: 4, backing: "board", mount: "none", stand: true }); }, "a sign on a board"]]) {
    const s2 = win.document.querySelector("#objectSel"); s2.value = type; s2.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
    set(MF.state.base); MF.rebuild(false); await settle();
    const sup2 = await supportOf();
    check(good(MF.parts) && MF.parts.some(p => p.name === "Stand") && sup2 >= 0 && sup2 < 3, `${name} with a stand: closed, on the bed, no support`, MF.parts.map(p => p.name).join(", "));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
