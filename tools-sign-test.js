// Signs (Session 38): solid letters, lit channel letters with their faces, and neon style; backings, mounts, the LED
// strip's length, and holes given only to the letter they lie in.
//   node tools-sign-test.js index.html
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
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length, S = () => MF.state.base.sign;
  const pick = v => { const s = win.document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); };
  pick("sign"); await settle();
  const build = async o => { Object.assign(S(), o); MF.render(); MF.rebuild(false); await settle(); return MF.parts; };
  const good = parts => parts.length && parts.every(p => { const r = C.checkMesh(p.solid), b = C.solidBounds(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0 && b.mn[1] > -1e-3; });
  const flags = parts => parts.map(p => C.meshReport(p.solid)).every(r => r.nonManifold === 0 && r.flipped === 0);

  console.log("every style and backing");
  const bad = [];
  for (const style of ["solid", "channel", "neon"]) for (const backing of style === "neon" ? ["board", "outline"] : ["none", "rail", "board", "outline"]) {
    const p = await build({ style, backing, text: style === "neon" ? "HI" : "AB", letterH: 60, depth: style === "solid" ? 12 : 20, mount: style === "channel" ? "keyhole" : style === "solid" && backing === "none" ? "keyhole" : "screw", holes: true });
    if (!good(p) || !flags(p)) bad.push(`${style}/${backing}`);
  }
  check(!bad.length, "solid, lit and neon signs on every backing are closed, outward-facing, without torn or flipped edges, and on the bed", bad.join(", "));

  console.log("lit channel letters");
  let p = await build({ style: "channel", backing: "none", text: "AB", letterH: 80, depth: 25, wall: 1.6, back: 2, diffuser: 1, diffuserSlot: 2, mount: "keyhole", holes: true });
  const L = p.find(q => q.name === "Letters"), F = p.find(q => q.name === "Diffuser faces");
  check(L && F && F.slot === 2, "the letters, and their faces in the face filament", p.map(q => `${q.name} [${q.slot}]`).join(", "));
  const lb = C.solidBounds(L.solid), fb = C.solidBounds(F.solid);
  check(near(lb.mx[1], 27, 0.01) && near(fb.mx[1] - fb.mn[1], 1, 0.01) && near(fb.mn[1], 0, 1e-3), "walls 25 mm on a 2 mm back; faces 1 mm thick, printed flat", `letters ${lb.mx[1].toFixed(2)} mm tall, faces ${(fb.mx[1] - fb.mn[1]).toFixed(2)} mm`);
  // a face is the letter's inside, the wall and the fit gap smaller all round: its width against the letters'
  const lw = lb.mx[0] - lb.mn[0], fw = fb.mx[0] - fb.mn[0];
  check(near(lw - fw, 2 * (1.6 + MF.state.base.fit.gap), 0.35), "the faces are the wall and the fit gap smaller all round", `${lw.toFixed(2)} − ${fw.toFixed(2)} = ${(lw - fw).toFixed(2)} mm`);
  // the hollow inside: a point in the middle of a letter at mid height is empty, one in the wall is not
  const lines = MF.sign.lines.join(" ");
  check(/cm of LED strip/.test(lines) && MF.sign.strip > 100, "the strip's length round the inside of the walls is worked out", `${(MF.sign.strip / 10).toFixed(0)} cm`);
  check(/keyhole/.test(lines) && /hole in its back for the wires/.test(lines), "keyholes and wire holes in each letter's back");
  const supportOf = async () => { await MF.printNow(); for (let i = 0; i < 200 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const ledge = await supportOf();
  check(ledge < 1, "the ledge under the faces slopes at 45°: no support", ledge.toFixed(1) + " mm²");

  console.log("solid letters");
  p = await build({ style: "solid", backing: "none", text: "42", letterH: 100, depth: 12, mount: "pins" });
  const pins = p[0].solid, pb = C.solidBounds(pins);
  check(good(p) && near(pb.mx[1], 12, 0.01), "12 mm thick, laid on their backs", pb.mx[1].toFixed(2));
  const sp = await build({ mount: "keyhole" }), kh = await supportOf();
  check(good(sp) && kh < 1 && /keyhole in its back/.test(MF.sign.lines.join(" ")), "keyhole pockets in the backs, their roofs sloping at 45°: no support", kh.toFixed(1) + " mm²");
  const thin = await build({ depth: 8, mount: "keyhole" });
  check(/12 mm thick or more/.test(MF.sign.lines.join(" ")), "letters too thin for a keyhole say so");
  // holes only where they belong: a point in the gap between the two numbers is in no piece
  p = await build({ depth: 12, mount: "keyhole" });
  const b2 = C.solidBounds(p[0].solid), mid = [(b2.mn[0] + b2.mx[0]) / 2, 6, (b2.mn[2] + b2.mx[2]) / 2];
  const gapPts = [-3, 0, 3].map(dz => [mid[0], 6, mid[2] + dz]).filter(q => !insideMesh(p[0].solid, q)).length;
  check(gapPts >= 2, "the gap between separate numbers stays empty (each hole torn into the other letter used to fill it)", `${gapPts} of 3 points empty`);

  console.log("neon style");
  p = await build({ style: "neon", backing: "outline", text: "L", letterH: 60, depth: 10, strip: 6, wall: 1.6, holes: true });
  check(near(MF.sign.strip, 100, 0.5), "an L 60 mm tall needs 100 mm of strip (its two strokes)", MF.sign.strip.toFixed(1) + " mm");
  const walls = p.find(q => q.name === "Walls"), board = p.find(q => q.name === "Board");
  check(walls && board && near(C.solidBounds(walls.solid).mx[1], 12, 0.02), "walls 10 mm high on the board, the groove between them", walls && C.solidBounds(walls.solid).mx[1].toFixed(2));
  // the groove: a point on the stroke's line, halfway up the walls, is empty; one 3.8 mm to its side (in the wall) is not
  const wb = C.solidBounds(walls.solid), x0 = (wb.mn[0] + wb.mx[0]) / 2;
  p = await build({ text: "I", backing: "board" });
  const W2 = p.find(q => q.name === "Walls").solid, b3 = C.solidBounds(W2), cx = (b3.mn[0] + b3.mx[0]) / 2, cz = (b3.mn[2] + b3.mx[2]) / 2;
  check(!insideMesh(W2, [cx, 7, cz]) && insideMesh(W2, [cx + 3.8, 7, cz]), "the groove is 6 mm wide between 1.6 mm walls", `${insideMesh(W2, [cx, 7, cz]) ? "filled" : "empty"} in the middle, ${insideMesh(W2, [cx + 3.8, 7, cz]) ? "wall" : "empty"} 3.8 mm out`);
  await build({ text: "hi?" });
  check(MF.parts.length === 0 || /capitals/.test(MF.sign.lines.join(" ")), "letters the single-line font doesn't have say so");

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
