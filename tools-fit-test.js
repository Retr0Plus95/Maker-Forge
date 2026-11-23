// Parts that fit (Session 37): gears, screw threads, the print-in-place hinge, the snap-fit clip and the fit test,
// the fix-it parts, the keychain's second line and credit on the back, and the print check on parts made of layers
// that overlap.
//   node tools-fit-test.js index.html          (CORE=1: gears and threads only, no app)
const path = require("path");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const insidePoly = (pt, L) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const [xi, yi] = L[i], [xj, yj] = L[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
// is a point inside a closed mesh? (a ray along +x, slightly tilted, crossing its triangles)
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

function coreTests(C) {
  console.log("gears");
  let bad = [];
  for (const [z1, z2, m] of [[24, 12, 1.5], [20, 20, 2], [40, 9, 1], [13, 31, 2.5]]) {
    const g1 = C.gearOutline(z1, m, 20, 0.1), g2 = C.gearOutline(z2, m, 20, 0.1), a = m * (z1 + z2) / 2, turn = Math.PI - Math.PI / z2;
    let hits = 0;
    for (let k = 0; k < 120; k++) {
      const ang = k / 120 * 2 * Math.PI / z1, ang2 = -ang * z1 / z2, c = Math.cos(ang), s = Math.sin(ang), c2 = Math.cos(turn + ang2), s2 = Math.sin(turn + ang2);
      const A = g1.outline.map(([x, y]) => [x * c - y * s, x * s + y * c]), B = g2.outline.map(([x, y]) => [x * c2 - y * s2 + a, x * s2 + y * c2]);
      if (B.some(p => insidePoly(p, A)) || A.some(p => insidePoly(p, B))) hits++;
    }
    // the teeth must also reach into each other: the tips cross the other's pitch circle
    const reach = g1.tipR + g2.tipR > a + m * 1.5;
    if (hits || !reach) bad.push(`${z1}/${z2} m${m}: ${hits} overlaps${reach ? "" : ", teeth do not reach"}`);
  }
  check(!bad.length, "four pairs turn through a whole tooth at the right centre distance without touching, their teeth reaching into each other", bad.join("; "));
  const g = C.gearOutline(24, 1.5, 20, 0);
  check(near(g.pitchR, 18, 1e-9) && near(g.tipR, 19.5, 1e-9) && near(g.rootR, 16.125, 1e-9), "pitch, tip and root as the standard has them (module 1.5, 24 teeth: 36, 39 and 32.25 mm across)", `${g.pitchR}, ${g.tipR}, ${g.rootR}`);
  // the tooth at the pitch circle: half the circular pitch, less the backlash
  const tooth = (o, bl) => { const r = o.pitchR; let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < o.outline.length; i++) { const [x0, y0] = o.outline[i], [x1, y1] = o.outline[(i + 1) % o.outline.length], r0 = Math.hypot(x0, y0), r1 = Math.hypot(x1, y1);
      if ((r0 - r) * (r1 - r) <= 0 && r0 !== r1) { const t = (r - r0) / (r1 - r0), a = Math.atan2(y0 + t * (y1 - y0), x0 + t * (x1 - x0)); if (Math.abs(a) < Math.PI / 24) { lo = Math.min(lo, a); hi = Math.max(hi, a); } } }
    return (hi - lo) * r; };
  const t0 = tooth(C.gearOutline(24, 1.5, 20, 0)), t1 = tooth(C.gearOutline(24, 1.5, 20, 0.2));
  check(near(t0, Math.PI * 1.5 / 2, 0.02) && near(t0 - t1, 0.2, 0.02), "a tooth is half the circular pitch thick at the pitch circle, and the backlash comes off it", `${t0.toFixed(3)} mm, ${(t0 - t1).toFixed(3)} thinner`);
  const solid = C.extrudePolysAt([{ outer: g.outline, holes: [C.ringCircle(3, 32, true)] }], 0, 6), cm = C.checkMesh(solid);
  check(cm.open === 0 && C.signedVolume(solid) > 0, "a gear with its shaft hole is a closed solid");

  console.log("screw threads");
  const rod = C.threadSolid({ rMajor: 4, pitch: 1.25, y0: 0, y1: 10, segs: 72 }), nut = C.threadSolid({ rMajor: 4, pitch: 1.25, y0: 0, y1: 10, inside: true, gap: 0.2, outside: C.hexRadius(13), segs: 72 });
  const r1 = C.checkMesh(rod), r2 = C.checkMesh(nut);
  check(r1.open === 0 && r2.open === 0 && C.signedVolume(rod) > 0 && C.signedVolume(nut) > 0, "a screw and a nut are closed, outward-facing solids", `${r1.tris} and ${r2.tris} triangles`);
  // the same grid: every point of the nut's hole away from its countersinks is 0.2 mm further out than the screw
  const R = (s, k) => Math.hypot(s.pos[k * 3], s.pos[k * 3 + 2]);
  let worst = 0, n = 0, crestR = 0, rootR = Infinity;
  const rows = Math.round(rod.pos.length / 3 / 72) - 1;
  for (let k = 0; k < (rows + 1) * 72; k++) { const y = rod.pos[k * 3 + 1]; if (y < 2 || y > 8) continue; worst = Math.max(worst, Math.abs(R(nut, k) - R(rod, k) - 0.2)); n++; crestR = Math.max(crestR, R(rod, k)); rootR = Math.min(rootR, R(rod, k)); }
  check(n > 1000 && worst < 1e-4, "the nut's thread is the screw's, 0.2 mm (the fit gap) further out at every point", `${n} points, worst ${worst.toExponential(1)} mm`);
  check(near(crestR, 4, 1e-3) && near(4 - rootR, 0.6134 * 1.25, 1e-3), "the ISO form: crest at the screw's size, the thread 0.6134 pitches deep", `crest ${crestR.toFixed(3)}, depth ${(4 - rootR).toFixed(3)}`);
  // right-handed: going round anticlockwise seen from above, the crest climbs one pitch per turn
  const crestAt = a => { let best = -1, by = 0; for (let y = 3; y < 4.25; y += 0.005) { const u = y / 1.25 - a / (2 * Math.PI); const f = C.threadForm(u); if (f > best) { best = f; by = y; } } return by; };
  const climb = crestAt(Math.PI / 2) - crestAt(0);
  check(near(climb, 1.25 / 4, 0.05), "right-handed: a quarter turn anticlockwise (seen from above) climbs a quarter of the pitch", climb.toFixed(3));
  // Session 67: a threaded tube (a fuse holder's neck): the same thread with a plain hole along it
  const tube = C.threadSolid({ rMajor: 4, pitch: 1.25, y0: 0, y1: 10, hole: 1.5, segs: 72 }), rt = C.meshReport(tube);
  let holeLo = Infinity, holeHi = 0; for (let k = 0; k < tube.pos.length / 3; k++) { const r = R(tube, k); if (r < 2.5) { holeLo = Math.min(holeLo, r); holeHi = Math.max(holeHi, r); } }
  const ring = 0.5 * 72 * 1.5 * 1.5 * Math.sin(2 * Math.PI / 72) * 10;            // the 72-sided hole's volume
  check(rt.ok && rt.shells === 1 && near(holeLo, 1.5, 1e-6) && near(holeHi, 1.5, 1e-6) && near(C.signedVolume(rod) - C.signedVolume(tube), ring, 1e-3),
    "with a hole, a screw is a closed tube: the hole 1.5 mm round all along, the rest of the thread unchanged", `${rt.tris} triangles, ${(C.signedVolume(rod) - C.signedVolume(tube)).toFixed(3)} mm³ taken out (${ring.toFixed(3)})`);
  const h = C.hexRadius(13);
  check(near(h(Math.PI / 6), 6.5, 1e-9) && near(h(0), 13 / Math.sqrt(3), 1e-9), "a hexagon 13 mm across flats: 6.5 mm to a flat, 7.51 mm to a corner");
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
  const MF = win.MakerForge, C = MF.core, st = () => MF.state;
  const e0 = env.errors.length;
  const pick = v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); };
  const build = async (type, edit) => { const b = st().base; if (b.type !== type) { pick(type); await settle(); } if (edit) edit(b); MF.render(); MF.rebuild(false); await settle(); return MF.parts; };
  const good = parts => parts.length && parts.every(p => { const r = C.checkMesh(p.solid), b = C.solidBounds(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0 && b.mn[1] > -1e-3; });
  const lowest = parts => Math.min(...parts.map(p => C.solidBounds(p.solid).mn[1]));

  console.log("every mechanism and fix-it part");
  const mk = ["gears", "bolt", "hinge", "snap", "coupon"], fk = ["knob", "foot", "shelfpin", "cover", "clip", "spacer", "fuse"], badKinds = [];
  for (const k of mk) { const p = await build("mech", b => b.mech.kind = k); if (!good(p) || Math.abs(lowest(p)) > 1e-3) badKinds.push("mech " + k); }
  for (const k of fk) { const p = await build("fixit", b => b.fixit.kind = k); if (!good(p) || Math.abs(lowest(p)) > 1e-3) badKinds.push("fixit " + k); }
  check(!badKinds.length, `all ${mk.length + fk.length} are closed, outward-facing and sit on the bed`, badKinds.join(", "));
  const variants = [["mech", b => { b.mech.kind = "gears"; b.mech.gears.boreShape = "hex"; b.mech.gears.hub = false; }], ["mech", b => { b.mech.kind = "bolt"; b.mech.bolt.size = "custom"; b.mech.bolt.dia = 30; b.mech.bolt.pitch = 3; b.mech.bolt.head = "knob"; }],
    ["mech", b => { b.mech.kind = "bolt"; b.mech.bolt.size = "M3"; b.mech.bolt.head = "none"; }], ["mech", b => { b.mech.kind = "coupon"; b.mech.coupon.thread = true; }],
    ["fixit", b => { b.fixit.kind = "knob"; b.fixit.knob.grip = "knurled"; b.fixit.knob.shaftShape = "hex"; }], ["fixit", b => { b.fixit.kind = "knob"; b.fixit.knob.grip = "lobed"; b.fixit.knob.pointer = false; }],
    ["fixit", b => { b.fixit.kind = "foot"; b.fixit.foot.style = "plug"; b.fixit.foot.shape = "square"; }], ["fixit", b => { b.fixit.kind = "foot"; b.fixit.foot.style = "cap"; b.fixit.foot.shape = "square"; }],
    ["fixit", b => { b.fixit.kind = "clip"; b.fixit.clip.count = 4; b.fixit.clip.style = "adhesive"; }], ["fixit", b => { b.fixit.kind = "spacer"; b.fixit.spacer.hex = true; b.fixit.count = 6; }],
    ["fixit", b => { b.fixit.kind = "fuse"; b.fixit.fuse.size = "6x32"; b.fixit.fuse.grip = "hex"; b.fixit.count = 1; }],
    ["fixit", b => { b.fixit.kind = "fuse"; b.fixit.fuse = { size: "custom", dia: 12, len: 10, wire: 6, coil: 3, grip: "fluted", od: 10 }; b.fixit.count = 2; }]];
  const badV = [];
  for (const [t, e] of variants) { const p = await build(t, e); if (!good(p)) badV.push(t + " " + JSON.stringify(st().base[t]).slice(0, 60)); }
  check(!badV.length, `${variants.length} other choices (hex bore, big and small threads, knurls, square plugs, four cables, six spacers, big and small fuse holders) all build closed`, badV.join("; "));

  console.log("fits");
  st().base.fit.gap = 0.25;
  let p = await build("mech", b => { b.mech.kind = "bolt"; b.mech.bolt.size = "M10"; b.mech.bolt.nut = true; b.mech.bolt.head = "hex"; });
  const nutP = p.find(q => q.name === "Nut"), boltP = p.find(q => q.name === "Bolt");
  // the narrowest the nut's hole gets, against the screw's crest and root
  const radial = (s, y0, y1) => { const b = C.solidBounds(s), cx = (b.mn[0] + b.mx[0]) / 2, cz = (b.mn[2] + b.mx[2]) / 2; let lo = Infinity, hi = 0;
    for (let i = 0; i < s.pos.length; i += 3) { const y = s.pos[i + 1]; if (y < y0 || y > y1) continue; const r = Math.hypot(s.pos[i] - cx, s.pos[i + 2] - cz); if (r < 9) { lo = Math.min(lo, r); hi = Math.max(hi, r); } } return [lo, hi]; };
  const [nLo] = radial(nutP.solid, 2, 6), [bLo, bHi] = radial(boltP.solid, 12, 20);
  check(near(nLo - bLo, 0.25, 0.01) && near(bHi, 5, 0.01), "an M10 nut's hole is 0.25 mm (the fit gap) bigger all round than the bolt's thread", `bolt ${(2 * bLo).toFixed(2)}–${(2 * bHi).toFixed(2)} mm, nut's narrowest ${(2 * nLo).toFixed(2)} mm`);
  p = await build("mech", b => { b.mech.kind = "hinge"; });
  const [A, B] = p.map(q => q.solid), sample = (s, every) => { const out = []; for (let i = 0; i < s.pos.length; i += 3 * every) out.push([s.pos[i], s.pos[i + 1], s.pos[i + 2]]); return out; };
  const clash = sample(B, 3).filter(q => insideMesh(A, q)).length + sample(A, 3).filter(q => insideMesh(B, q)).length;
  check(p.length === 2 && clash === 0, "the hinge's two leaves never touch: no corner of one is inside the other", `${clash} inside`);
  const pinGap = (() => { let lo = Infinity; for (let i = 0; i < B.pos.length; i += 3) { const x = B.pos[i], y = B.pos[i + 1], z = B.pos[i + 2]; const d = Math.hypot(y - 0.8 * 3.5, z - 0); if (d < 2.5) lo = Math.min(lo, d); } return lo; })();
  check(near(pinGap, 1.6 + 0.25, 0.02), "round the pin, the other leaf's knuckle is the pin's radius plus the fit gap away", `${pinGap.toFixed(3)} mm`);
  p = await build("mech", b => { b.mech.kind = "gears"; b.mech.gears.teeth1 = 30; b.mech.gears.teeth2 = 15; b.mech.gears.module = 2; b.mech.gears.layout = "meshed"; });
  const gb = p.map(q => C.solidBounds(q.solid)), cd = ((gb[1].mn[0] + gb[1].mx[0]) - (gb[0].mn[0] + gb[0].mx[0])) / 2;
  check(near(cd, 45, 0.6) && /45\.00 mm apart/.test(MF.fit.lines.join(" ")), "meshed gears sit at the centre distance the panel gives (30 and 15 teeth, module 2: 45 mm)", `${cd.toFixed(2)} mm; "${MF.fit.lines.find(l => /apart/.test(l))}"`);
  p = await build("mech", b => { b.mech.gears.layout = "apart"; });
  check(p.length === 2 && C.solidBounds(p[1].solid).mn[0] > C.solidBounds(p[0].solid).mx[0] + 3, "laid apart to print, the gears are 4 mm clear of each other");
  p = await build("fixit", b => { b.fixit.kind = "knob"; b.fixit.knob.shaftShape = "round"; b.fixit.knob.shaft = 6; b.fixit.count = 1; });
  const [kLo] = radial(p[0].solid, 4, 18.5);
  check(near(2 * kLo, 6.25, 0.03), "a knob's hole for a 6 mm shaft is 6.25 mm with a 0.25 mm fit gap", (2 * kLo).toFixed(3));
  st().base.fit.gap = 0.5; p = await build("fixit");
  const [kLo2] = radial(p[0].solid, 4, 18.5);
  check(near(2 * kLo2, 6.5, 0.03), "raising the fit gap to 0.5 mm makes it 6.5 mm", (2 * kLo2).toFixed(3));
  st().base.fit.gap = 0.25;
  p = await build("fixit", b => { b.fixit.kind = "spacer"; b.fixit.spacer.hex = false; b.fixit.count = 4; });
  check(p.length === 1 && C.checkMesh(p[0].solid).tris > 0 && near(C.signedVolume(p[0].solid) / 4, Math.PI * (36 - 2.625 ** 2) * 6, 25), "four spacers, each the volume of a 12 mm ring with a 5.25 mm hole, 6 mm tall", (C.signedVolume(p[0].solid) / 4).toFixed(0) + " mm³ each");
  // Session 67: the inline fuse holder (5 × 20 mm fuse, 2.6 mm wire, 1 mm coils, 18 mm fluted)
  p = await build("fixit", b => { b.fixit.kind = "fuse"; b.fixit.fuse = { size: "5x20", dia: 5.2, len: 20, wire: 2.6, coil: 1, grip: "fluted", od: 18 }; b.fixit.count = 1; });
  { const bodyP = p.find(q => q.name === "Fuse holder body"), capP = p.find(q => q.name === "Fuse holder cap");
    check(p.length === 2 && bodyP && capP, "a fuse holder is two parts: the body and the cap", p.map(q => q.name).join(", "));
    // every vertex as [radius from the part's axis, height]
    // the axis: the middle of the wire hole's ring on the bed (the fluted outside is not quite symmetric)
    const rv = s => { const b = C.solidBounds(s), P = s.pos; let cx = (b.mn[0] + b.mx[0]) / 2, cz = (b.mn[2] + b.mx[2]) / 2; const mn = [Infinity, Infinity], mx = [-Infinity, -Infinity];
      for (let i = 0; i < P.length; i += 3) if (P[i + 1] < 1e-3 && Math.hypot(P[i] - cx, P[i + 2] - cz) < 3) { mn[0] = Math.min(mn[0], P[i]); mx[0] = Math.max(mx[0], P[i]); mn[1] = Math.min(mn[1], P[i + 2]); mx[1] = Math.max(mx[1], P[i + 2]); }
      cx = (mn[0] + mx[0]) / 2; cz = (mn[1] + mx[1]) / 2; const out = [];
      for (let i = 0; i < P.length; i += 3) out.push([Math.hypot(P[i] - cx, P[i + 2] - cz), P[i + 1]]); return out; };
    const B = rv(bodyP.solid), K = rv(capP.solid), at = (L, r) => L.filter(q => Math.abs(q[0] - r) < 0.01).map(q => q[1]);
    const top = C.solidBounds(bodyP.solid).mx[1], wire = Math.min(...B.filter(q => q[1] < 1e-3).map(q => q[0])), bore = Math.min(...B.filter(q => q[1] > top - 1e-3).map(q => q[0]));
    check(near(2 * wire, 2.85, 0.02) && near(2 * bore, 5.75, 0.02), "its wire holes are the wire plus the fit gap (2.85 mm), the fuse's bore 5.2 + 0.3 mm + the fit gap (5.75 mm)", `${(2 * wire).toFixed(2)} and ${(2 * bore).toFixed(2)} mm`);
    const hb = C.solidBounds(bodyP.solid).mx[1], seatB = Math.min(...at(B, bore)), seatK = Math.min(...at(K, bore)), faceK = Math.max(...at(K, bore)) - 0.01;
    const room = hb - seatB + faceK - seatK;
    check(near(room, 20 + 2 * 0.8, 0.02), "screwed shut (the cap stops on the neck), there is room for the fuse and two coils pressed from 1 to 0.8 mm", `${room.toFixed(2)} mm between the two seats`);
    // the cap's thread against the neck's: the narrowest the cap's hole gets above its stop face, the neck's root and crest
    const neckR = B.filter(q => q[1] > hb - 6 && q[1] < hb - 2 && q[0] > bore + 0.5).map(q => q[0]), capR = K.filter(q => q[1] > faceK + 2 && q[1] < faceK + 6 && q[0] > bore + 0.5 && q[0] < 8).map(q => q[0]);
    const nLo = Math.min(...neckR), nHi = Math.max(...neckR), cLo = Math.min(...capR);
    check(near(cLo - nLo, 0.25, 0.01) && near(nHi, 6, 0.01), "the cap's thread is 0.25 mm (the fit gap) bigger all round than the neck's (12 mm, 2.5 mm pitch)", `neck ${(2 * nLo).toFixed(2)}–${(2 * nHi).toFixed(2)} mm, cap's narrowest ${(2 * cLo).toFixed(2)} mm`);
    const shoulder = Math.max(...B.filter(q => q[0] > 7).map(q => q[1])) - 0.01, rim = hb - (C.solidBounds(capP.solid).mx[1] - faceK);
    check(near(rim - shoulder, 0.6, 0.02), "shut, the cap's rim stays 0.6 mm clear of the body's shoulder, so it stops on the neck's top", `${(rim - shoulder).toFixed(2)} mm`);
    check(/250 V/.test(MF.fit.lines.join(" ")) && /coil/.test(MF.fit.lines.join(" ")), "the panel says how to make the coils and to use a 250 V fuse on mains", MF.fit.lines.join(" | ").slice(0, 120));
  }

  console.log("the print check");
  const supportOf = async () => { await MF.printNow(); for (let i = 0; i < 200 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const knobSupport = (await build("fixit", b => { b.fixit.kind = "knob"; b.fixit.knob.pointer = true; }), await supportOf());
  check(knobSupport === 0, "a knob printed on its top, built from layers that overlap, needs no support (it read 698 mm² before)", knobSupport.toFixed(1) + " mm²");
  const clipSupport = (await build("fixit", b => { b.fixit.kind = "clip"; b.fixit.count = 1; b.fixit.clip.count = 1; }), await supportOf());
  check(clipSupport === 0, "a cable clip's arch, drawn in at 45° to a short flat, needs no support", clipSupport.toFixed(1) + " mm²");
  // two shells of one part stacked 0.01 mm into each other, the upper one wider: only its overhang counts
  const stack = C.mergeSolids([C.extrudePolysAt([{ outer: C.ringRect(20, 20, 0, 1), holes: [] }], 0, 2.01), C.extrudePolysAt([{ outer: C.ringRect(20, 20, 0, 1), holes: [] }], 2, 5),
    C.extrudePolysAt([{ outer: C.ringRect(40, 20, 0, 1), holes: [] }], 4.99, 6)]);
  const sa = C.analyzePrint([stack], { angle: 45, tol: 0.2, nozzle: 0.4, layer: 0.2, bed: [256, 256, 256] }).overhang.area;
  check(near(sa, 400, 15), "three overlapping shells in one part: the 20 × 20 mm shelf hanging out at the top is all that needs support", sa.toFixed(1) + " mm²");
  // Session 41: a part that reaches below the bed is checked from its lowest point, as a slicer drops the print onto it
  { const pl = C.extrudePolysAt([{ outer: C.ringRect(40, 20, 0, 1), holes: [] }], 0, 3), post = C.extrudePolysAt([{ outer: C.ringRect(6, 6, 0, 1), holes: [] }], -0.8, 0.01);
    const r = C.analyzePrint([pl, post], { angle: 45, nozzle: 0.4, layer: 0.2, bed: [256, 256, 256] });
    check(r.sunk > 0.79 && r.overhang.area > 700, "a plate on a post that reaches 0.8 mm below the bed: the plate is in the air round the post (it read as lying on the bed)", `${r.overhang.area.toFixed(0)} mm²`); }

  console.log("the keychain: a second line and a credit on the back");
  let q = await build("nameplate", b => { const np = b.nameplate; np.batch = false; np.text = "Emma"; np.line2 = ""; np.credit.on = false; np.doubleSided = false; np.engrave = false; });
  const depth0 = C.solidBounds(q[0].solid), plateVol0 = C.signedVolume(q[0].solid);
  q = await build("nameplate", b => { b.nameplate.line2 = "Svensson"; });
  const depth1 = C.solidBounds(q[0].solid);
  check((depth1.mx[2] - depth1.mn[2]) > (depth0.mx[2] - depth0.mn[2]) + 5 && good(q), "a surname makes the plate deeper, under the name, and it stays one closed plate", `${(depth0.mx[2] - depth0.mn[2]).toFixed(1)} → ${(depth1.mx[2] - depth1.mn[2]).toFixed(1)} mm`);
  const d2 = depth1.mx[2] - depth1.mn[2];
  q = await build("nameplate", b => { b.nameplate.line2Gap = 8; });
  const d3 = C.solidBounds(q[0].solid);
  check((d3.mx[2] - d3.mn[2]) > d2 + 4, "a wider gap between the lines makes it deeper still", `${d2.toFixed(1)} → ${(d3.mx[2] - d3.mn[2]).toFixed(1)} mm`);
  q = await build("nameplate", b => { b.nameplate.line2Gap = 2.5; b.nameplate.credit.on = true; b.nameplate.credit.text = "forge.example"; b.nameplate.credit.inlay = true; b.nameplate.credit.slot = 2; });
  const cr = q.find(r => r.name === "Credit (back)"), crB = cr && C.solidBounds(cr.solid);
  check(cr && cr.slot === 2 && near(crB.mn[1], 0, 1e-3) && near(crB.mx[1], 0.4, 1e-3) && good(q), "the credit is inlaid in its own filament in the first 0.4 mm, flush with the back", cr ? `${crB.mn[1].toFixed(2)}–${crB.mx[1].toFixed(2)} mm, filament ${cr.slot + 1}` : "missing");
  const plate = q.find(r => r.name === "Plate"), pB = C.solidBounds(plate.solid);
  check(crB && crB.mn[0] > pB.mn[0] + 0.7 && crB.mx[0] < pB.mx[0] - 0.7 && MF.plate.credit && MF.plate.credit.size > 1.4, "it sits inside the plate's outline, clear of the edge", `credit ${crB && (crB.mx[0] - crB.mn[0]).toFixed(1)} mm wide, ${MF.plate.credit && MF.plate.credit.size.toFixed(1)} mm tall`);
  // mirrored: the credit's letters run right to left seen from above. In the test page letters are boxes, so check
  // the drawing: a mirrored credit puts its first letter's box at the right
  // points in the middle of the credit's letters, 0.2 mm up: inside the credit, not inside the plate
  const inLetters = []; { const S = cr.solid, P = S.pos, I = S.idx;
    for (let t = 0; t < I.length && inLetters.length < 40; t += 3) { const ys = [P[I[t]*3+1], P[I[t+1]*3+1], P[I[t+2]*3+1]]; if (ys.every(y => Math.abs(y - 0.4) < 1e-4))
      inLetters.push([(P[I[t]*3] + P[I[t+1]*3] + P[I[t+2]*3]) / 3, 0.2, (P[I[t]*3+2] + P[I[t+1]*3+2] + P[I[t+2]*3+2]) / 3]); } }
  const inPlate = pts => pts.filter(pt => insideMesh(plate.solid, pt)).length;
  check(inLetters.length >= 4 && inLetters.every(pt => insideMesh(cr.solid, pt)) && inPlate(inLetters) === 0, "inlaid, the plate is cut away under the letters and the credit fills the cut", `${inLetters.length} points, ${inPlate(inLetters)} also in the plate`);
  q = await build("nameplate", b => { b.nameplate.credit.inlay = false; });
  const eng = q.find(r => r.name === "Plate");
  check(!q.some(r => r.name === "Credit (back)") && inLetters.filter(pt => insideMesh(eng.solid, pt)).length === 0 && insideMesh(eng.solid, [inLetters[0][0], 1.5, inLetters[0][2]]),
    "engraved instead, the letters are cut into the bottom 0.4 mm and left empty, with plate above them", `${inLetters.filter(pt => insideMesh(eng.solid, pt)).length} filled`);
  q = await build("nameplate", b => { b.nameplate.credit.text = "x".repeat(40); b.nameplate.credit.size = 8; b.nameplate.credit.inlay = true; });
  check(MF.plate.credit && (MF.plate.credit.smaller || MF.plate.credit.size === 0), "a credit too big for the back is made smaller to fit (or left out, and the panel says so)", JSON.stringify(MF.plate.credit));
  q = await build("nameplate", b => { b.nameplate.credit.text = "forge.example"; b.nameplate.credit.size = 3.5; b.nameplate.doubleSided = true; });
  check(!q.some(r => r.name === "Credit (back)") && q.some(r => r.name === "Name (back)"), "with the mirrored name on the back, the back is the name's: no credit");
  // Session 41: the back name is flush in the bottom, like the credit (it stood 0.8 mm below the plate, which then
  // printed in the air round the letters)
  { const nb = q.find(r => r.name === "Name (back)"), b2 = nb && C.solidBounds(nb.solid), pl = q.find(r => r.name === "Plate");
    check(good(q) && b2 && near(b2.mn[1], 0, 1e-3) && near(b2.mx[1], 0.8, 1e-3), "a double-sided tag: the back name flush in the first 0.8 mm, everything on the bed", b2 && `${b2.mn[1].toFixed(2)}–${b2.mx[1].toFixed(2)} mm`);
    const mid = []; { const S = nb.solid, P = S.pos, I = S.idx; for (let t = 0; t < I.length && mid.length < 30; t += 3) { const ys = [P[I[t]*3+1], P[I[t+1]*3+1], P[I[t+2]*3+1]];
      if (ys.every(y => Math.abs(y - 0.8) < 1e-4)) mid.push([(P[I[t]*3] + P[I[t+1]*3] + P[I[t+2]*3]) / 3, 0.4, (P[I[t]*3+2] + P[I[t+1]*3+2] + P[I[t+2]*3+2]) / 3]); } }
    check(mid.length >= 4 && mid.filter(pt => insideMesh(pl.solid, pt)).length === 0, "the plate is cut away where the back name is", `${mid.length} points, ${mid.filter(pt => insideMesh(pl.solid, pt)).length} in the plate`);
    const ds = await supportOf();
    check(ds >= 0 && ds < 3, "and the tag needs no support", ds.toFixed(1) + " mm²");
    // Session 77: the keyring hole sat 0.2 mm from a straight-sided first letter, leaving a sliver of plate between the
    // hole and the back name too thin to print. At 0.4 mm up, the nearest empty spot (the hole, or the plate's edge
    // 3.2 mm out) to the back name, on a 0.05 mm grid over the hole's end of the tag
    const sl = s => { const P = s.pos, I = s.idx, out = []; for (let t = 0; t < I.length; t += 3) { const pts = [];
      for (let e = 0; e < 3; e++) { const a = I[t + e] * 3, b = I[t + (e + 1) % 3] * 3; if ((P[a + 1] >= 0.4) === (P[b + 1] >= 0.4)) continue;
        const f = (0.4 - P[a + 1]) / (P[b + 1] - P[a + 1]); pts.push(P[a] + (P[b] - P[a]) * f, P[a + 2] + (P[b + 2] - P[a + 2]) * f); }
      if (pts.length === 4) out.push(pts); } return out; };
    const inS = (S, x, z) => { let k = 0; for (const [xa, za, xb, zb] of S) if ((za <= z) !== (zb <= z) && xa + (xb - xa) * (z - za) / (zb - za) > x) k++; return k & 1; };
    const q2 = await build("nameplate", b => { b.nameplate.sym.side = "none"; b.nameplate.pic.on = false; b.nameplate.hole = "left"; b.nameplate.line2 = ""; });
    const pl2 = q2.find(r => r.name === "Plate"), nb2 = q2.find(r => r.name === "Name (back)"), b3 = C.solidBounds(nb2.solid);
    const SP = sl(pl2.solid), SN = sl(nb2.solid), pB2 = C.solidBounds(pl2.solid), g = 0.05, x0 = pB2.mn[0] - 0.5, z0 = pB2.mn[2] - 0.5;
    const gw = Math.ceil((b3.mn[0] + 6 - x0) / g), gh = Math.ceil((pB2.mx[2] + 0.5 - z0) / g), cell = new Uint8Array(gw * gh);   // 1 letter, 2 empty
    for (let i = 0; i < gw; i++) for (let j = 0; j < gh; j++) { const x = x0 + i * g, z = z0 + j * g; cell[j * gw + i] = inS(SN, x, z) ? 1 : inS(SP, x, z) ? 0 : 2; }
    const edge = k => { const out = []; for (let i = 1; i < gw - 1; i++) for (let j = 1; j < gh - 1; j++) { const n = j * gw + i;
      if (cell[n] === k && (cell[n - 1] !== k || cell[n + 1] !== k || cell[n - gw] !== k || cell[n + gw] !== k)) out.push([i * g, j * g]); } return out; };
    const ink = edge(1), gap = edge(2);
    let near0 = Infinity; for (const [x, z] of ink) for (const [u, v] of gap) { const d = Math.hypot(x - u, z - v); if (d < near0) near0 = d; }
    check(good(q2) && near0 > 0.5 && near0 < 3, "the keyring hole keeps clear of the name set into the back: no sliver of plate between them", `${near0.toFixed(2)} mm of plate at the narrowest`);
    st().base.nameplate.sym.side = "both"; }
  // Session 42: the credit goes where it fits, nearest the middle (it was only tried at the middle of the name's outline:
  // on a script name that is often a narrow neck or a gap, and in a browser it was always left out)
  q = await build("nameplate", b => { const np = b.nameplate; np.doubleSided = false; np.text = "Ab          Cd"; np.style = "traced"; np.join = 0; np.line2 = "";
    np.credit.on = true; np.credit.text = "forge"; np.credit.size = 3; np.credit.inlay = true; });
  check(good(q) && MF.plate.credit && MF.plate.credit.size >= 2.9 && MF.plate.credit.moved > 2 && q.some(r => r.name === "Credit (back)"),
    "a name with a gap in its middle: the credit moves aside to fit, at its full size", JSON.stringify(MF.plate.credit));
  Object.assign(st().base.nameplate, { text:"Emma", join:0.6 }); st().base.nameplate.credit.on = false;
  // Session 42: its own text on the back of a double-sided tag
  q = await build("nameplate", b => { b.nameplate.doubleSided = true; b.nameplate.backText = "Call 070-123 45 67"; });
  { const nb = q.find(r => r.name === "Name (back)"), b2 = nb && C.solidBounds(nb.solid), w0 = b2 ? b2.mx[0] - b2.mn[0] : 0;
    check(good(q) && nb && near(b2.mn[1], 0, 1e-3) && MF.plate.back && MF.plate.back.size > 2, "its own text on the back instead of the name, flush and fitted inside the plate", MF.plate.back && `${MF.plate.back.size.toFixed(1)} mm tall, ${w0.toFixed(1)} mm wide`);
    const pl = C.solidBounds(q.find(r => r.name === "Plate").solid);
    check(b2.mn[0] > pl.mn[0] + 1.1 && b2.mx[0] < pl.mx[0] - 1.1, "1.2 mm inside the plate's edge"); }
  q = await build("nameplate", b => { b.nameplate.backText = "x".repeat(40); b.nameplate.letterHeight = 10; });
  check(MF.plate.back && (MF.plate.back.size === 0 || MF.plate.back.size < 4) && good(q), "a back text too long is made smaller, or left out and the panel says so", JSON.stringify(MF.plate.back));
  // Session 42: a magnet pocket in the back
  q = await build("nameplate", b => { const np = b.nameplate; np.backText = ""; np.doubleSided = false; np.letterHeight = 22; np.thick = 3.5; np.magnet = "8x2"; np.magnets = 1; });
  { const pl = q.find(r => r.name === "Plate"), mi = MF.plate.magnet;
    check(good(q) && mi && mi.ok && mi.n === 1, "an 8 × 2 mm magnet pocket in a 3.5 mm plate", JSON.stringify(mi));
    // at the pocket's middle: empty from the bed up to 2.2 mm, plate above; 3.6 mm to the side (past its 4.15 mm radius
    // less a little) still empty, 4.6 mm to the side plate
    const [cx, cz] = mi.at[0];
    check(!insideMesh(pl.solid, [cx, 1.1, cz]) && !insideMesh(pl.solid, [cx, 2.1, cz]) && insideMesh(pl.solid, [cx, 2.8, cz]) && !insideMesh(pl.solid, [cx + 3.6, 1.1, cz]) && insideMesh(pl.solid, [cx + 4.6, 1.1, cz]),
      "the pocket is open to the bed, 8.3 mm across and 2.2 mm deep, with plate over it", `at ${cx}, ${cz}`); }
  q = await build("nameplate", b => { b.nameplate.magnets = 2; b.nameplate.text = "Sebastian"; });
  check(good(q) && MF.plate.magnet && MF.plate.magnet.ok && MF.plate.magnet.n === 2, "two pockets on a long name", JSON.stringify(MF.plate.magnet));
  q = await build("nameplate", b => { b.nameplate.thick = 2; b.nameplate.magnet = "6x3"; b.nameplate.magnets = 1; });
  check(MF.plate.magnet && !MF.plate.magnet.ok && MF.plate.magnet.why === "thick" && good(q), "a plate too thin for the magnet says how thick it must be", JSON.stringify(MF.plate.magnet));
  q = await build("nameplate", b => { const np = b.nameplate; np.thick = 4.5; np.magnet = "12x3"; np.letterHeight = 8; np.text = "Li"; np.line2 = ""; np.sym.side = "none"; np.pic.on = false; np.border = 2; np.style = "traced"; });
  check(MF.plate.magnet && !MF.plate.magnet.ok && MF.plate.magnet.why === "small" && good(q), "no room for a 12 mm magnet behind small letters: said, and left out", JSON.stringify(MF.plate.magnet));
  // (the test page's letters are solid boxes, so a mirrored name fills the back: a short text leaves room)
  q = await build("nameplate", b => { const np = b.nameplate; np.magnet = "8x2"; np.thick = 3.5; np.letterHeight = 22; np.text = "Emma"; np.doubleSided = true; np.backText = "No 7"; np.sym.side = "both"; np.border = 3.2; });
  { const nb = q.find(r => r.name === "Name (back)"), at = MF.plate.magnet.at && MF.plate.magnet.at[0];
    const clear = at && [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]].every(([dx, dz]) => !insideMesh(nb.solid, [at[0] + dx, 0.4, at[1] + dz]));
    check(good(q) && nb && MF.plate.magnet.ok && clear, "a magnet and text on the back together: the pocket keeps clear of the letters", JSON.stringify(MF.plate.magnet)); }
  Object.assign(st().base.nameplate, { magnet:"none", doubleSided:false, backText:"", thick:2.4, border:3.2 }); st().base.nameplate.sym.side = "both";
  q = await build("nameplate", b => { b.nameplate.doubleSided = false; b.nameplate.batch = true; b.nameplate.names = "Emma | Svensson\nNoah"; b.nameplate.credit.on = false; });
  check(good(q) && MF.plate.count === 2, "a list of names: \"Emma | Svensson\" puts the surname on a second line", `${MF.plate.count} plates`);
  st().base.nameplate.batch = false;
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
