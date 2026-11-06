// Project box / enclosure (Session 11): the box and lid are closed meshes of the right size, every
// kind of opening cuts a hole on every face it may go on, overlaps and misfits are left out with a
// message, screws, lids and board standoffs, the presets, the rulers, and a hostile project file.
// Session 12: engraved labels, magnet lids, foot recesses, notches, the sliding lid and the fit test.
// Session 40: a box bigger than the bed, split into parts that screw together.
//   node tools-enclosure-test.js index.html          ONLY=split for the split parts only
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
(async () => {
  if (process.env.ONLY === "split") return;
  await sleep(800);
  const MF = win.MakerForge, C = MF.core, st = MF.state;
  const fresh = over => { st.base.type = "enclosure"; st.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), over || {}); };
  const build = async over => { fresh(over); MF.rebuild(false); await settle(); return MF.parts; };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const vol = p => C.checkMesh(p.solid).volume, bnd = p => C.solidBounds(p.solid);
  const direct = over => { fresh(over); return MF.buildEnclosure(); };          // the generator alone, no rebuild

  console.log("default box 100 × 64 × 36");
  let P = await build();
  check(P.length === 3 && closed(P) && /Pilot light lenses/.test(P[2].name), "box, lid and the pilot light's lens, all closed and outward", P.map(p => `${p.name} ${C.checkMesh(p.solid).tris}`).join(", "));
  let b = bnd(P[0]);
  check(Math.abs(b.size[0] - 100) < 1e-3 && Math.abs(b.size[2] - 64) < 1e-3 && Math.abs(b.size[1] - 36) < 1e-3 && Math.abs(b.mn[1]) < 1e-6, "box is exactly 100 × 64 × 36 on the bed", b.size.map(v => v.toFixed(3)).join(" × "));
  const L = bnd(P[1]);
  check(Math.abs(L.size[0] - 100) < 1e-3 && Math.abs(L.size[1] - (2.4 + 3)) < 1e-3 && L.mn[0] > b.mx[0] + 5, "lid beside it, 2.4 mm plate + 3 mm lip", L.size.map(v => v.toFixed(2)).join(" × "));
  check(!MF.enclosure.warn.length && MF.enclosure.count === 3, "three openings, no warnings", MF.enclosure.warn.map(w => w.t).join(" / "));
  const full = await build({ cut: [] }), vFull = vol(full[0]);
  check(vFull < 100 * 64 * 36 * 0.4, "it is hollow", `${vFull.toFixed(0)} mm³`);
  // walls measured: a ray-free check on the volume of a box with no posts and square corners
  const plain = await build({ cut: [], radius: 0, fasten: "none", lid: "none" }), vPlain = vol(plain[0]);
  const want = 100 * 64 * 36 - 96 * 60 * 34;
  check(plain.length === 1 && Math.abs(vPlain - want) < 0.5, "square open box: exactly walls plus floor", `${vPlain.toFixed(1)} vs ${want}`);

  console.log("\nevery opening, on every face it can go on");
  const kinds = Object.keys(MF.cutouts);
  let bad = []; const refs = [];
  for (const k of kinds) for (const face of ["front", "right", "top", "bottom"]) {
    if (k === "lcd2004" && face === "right") continue;            // wider than the side
    const wall = face === "front" || face === "right";
    const c = Object.assign(MF.newOpening(k, face), { u: 0, v: wall ? 70 : 0 });
    const big = { w: 180, d: 140, h: 140, cut: [c] };
    const idx = face === "top" ? 1 : 0, ref = refs[idx] ?? (refs[idx] = vol(direct({ w: 180, d: 140, h: 140, cut: [] })[idx]));
    const Q2 = direct(big), v = vol(Q2[idx]);
    if (!closed(Q2) || !(v < ref - 0.5) || MF.enclosure.warn.length) bad.push(`${k}@${face}: ${closed(Q2) ? "" : "OPEN "}${(ref - v).toFixed(1)} mm³ ${MF.enclosure.warn.map(w => w.t).join(";")}`);
  }
  check(!bad.length, `${kinds.length} kinds × 4 faces cut closed holes with no warnings`, bad.slice(0, 6).join(" | "));

  console.log("\nSession 39: the new shapes (motion sensor, distance sensor, camera, grilles) and the grouped list");
  const E0 = { clear: 0.2, teardrop: false }, ctr = L => { let x = 0, y = 0; L.forEach(p => { x += p[0]; y += p[1]; }); return [x / L.length, y / L.length]; };
  const span = L => { const xs = L.map(p => p[0]); return Math.max(...xs) - Math.min(...xs); };
  let R = MF.openingRings(MF.newOpening("pir501", "front"), true, E0);
  check(R.length === 3 && Math.abs(span(R[0]) - 23.4) < 0.05 && Math.abs(ctr(R[1])[0] + 14) < 0.01 && Math.abs(ctr(R[2])[0] - 14) < 0.01 && Math.abs(span(R[1]) - 2.4) < 0.05,
    "HC-SR501: a 23.2 mm dome and two 2.2 mm screw holes 28 mm apart (plus the clearance)", `${R.length} holes, dome ${span(R[0]).toFixed(2)} mm, screws at ${R.slice(1).map(L => ctr(L)[0].toFixed(1)).join(", ")}`);
  R = MF.openingRings(Object.assign(MF.newOpening("pir501", "front"), { hw: 20 }), true, E0);
  check(R.length === 1, "screw holes set so close they would break into the dome are left out", `${R.length} hole`);
  R = MF.openingRings(MF.newOpening("hcsr04", "front"), true, E0);
  check(R.length === 2 && Math.abs(ctr(R[1])[0] - ctr(R[0])[0] - 26) < 0.01 && Math.abs(span(R[0]) - 16.6) < 0.05, "HC-SR04: two 16.4 mm eyes, centres 26 mm apart", `${(ctr(R[1])[0] - ctr(R[0])[0]).toFixed(2)} mm`);
  R = MF.openingRings(Object.assign(MF.newOpening("hcsr04", "front"), { hw: 3 }), true, E0);
  check(ctr(R[1])[0] - ctr(R[0])[0] >= 16.6 + 1.2 - 0.01, "eyes set closer than their size stay apart", (ctr(R[1])[0] - ctr(R[0])[0]).toFixed(2));
  R = MF.openingRings(MF.newOpening("picam", "front"), true, E0);
  const scr = R.slice(1).map(ctr);
  check(R.length === 5 && Math.abs(Math.max(...scr.map(q => q[0])) - Math.min(...scr.map(q => q[0])) - 21) < 0.01 && Math.abs(Math.max(...scr.map(q => q[1])) - Math.min(...scr.map(q => q[1])) - 12.5) < 0.01
    && Math.abs(scr.reduce((a, q) => a + q[1], 0) / 4 - 1.2) < 0.01, "Pi camera: the lens, and four screws 21 × 12.5 mm apart, their middle 1.2 mm above the lens", scr.map(q => q.map(v => v.toFixed(1)).join("/")).join(" "));
  const holes = k => MF.openingRings(MF.newOpening(k, "top"), false, E0);
  const sp = holes("speaker"), bz = holes("buzzer");
  check(sp.length >= 50 && bz.length === 7 && sp.every(L => Math.hypot(...ctr(L)) + span(L) / 2 <= 14.01), "the speaker grille's holes stay inside its 28 mm circle; a buzzer gets seven", `${sp.length} and ${bz.length} holes`);
  const big = MF.openingRings(Object.assign(MF.newOpening("buzzer", "top"), { hd: 30 }), false, E0);
  check(big.length === 1, "a grille hole bigger than the grille is one hole, not none", big.length);
  [...win.document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); MF.render(); await sleep(50);
  const sel = [...win.document.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "pir501"));
  const groups = sel ? [...sel.querySelectorAll("optgroup")].map(g => g.label) : [];
  check(Object.values(MF.cutouts).every(v => v.g) && sel && sel.options.length === kinds.length && groups.length === 8,
    "every opening is in one of eight groups in the Add an opening list", groups.join(" / "));

  console.log("\nSession 39: mounting the box (screw ears, DIN rail clip, strap loops)");
  const insideMesh = (s, p) => {                     // a ray along +x with a slight tilt; odd crossings = inside
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
  };
  // inside the region of all the shells together (overlapping shells: inside any one of them)
  const solidAt = (part, p) => insideMesh(part.solid, p);
  const supportOf = async over => { await build(over); await MF.printNow(); for (let i = 0; i < 200 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  let M = direct({ cut: [], mount: "ears" });
  const eb = bnd(M[0]), lb2 = bnd(M[1]);
  check(closed(M) && Math.abs(eb.mx[0] - (50 + 13.5)) < 0.01 && Math.abs(eb.mn[0] + 63.5) < 0.01 && Math.abs(eb.mn[1]) < 1e-6 && !MF.enclosure.warn.length,
    "screw ears: 13.5 mm out on each side for a 4.5 mm hole, on the bed, closed", `x ${eb.mn[0].toFixed(1)} to ${eb.mx[0].toFixed(1)}`);
  check(lb2.mn[0] > eb.mx[0] + 5, "the lid moves over so it clears the ears", `lid from x ${lb2.mn[0].toFixed(1)}`);
  check(!solidAt(M[0], [56, 1.5, 0]) && solidAt(M[0], [56, 1.5, 6.5]) && solidAt(M[0], [51, 4, 6.5]) && !solidAt(M[0], [51, 4, 0]),
    "the ear's hole is open, the fins stand at its edges and the screw head has room between them");
  const v2 = vol(M[0]), v4 = vol(direct({ cut: [], mount: "ears", earN: 4 })[0]);
  check(v4 > v2 + 600 && !MF.enclosure.warn.length && /4 ears/.test(MF.enclosure.mount.join()), "four ears when asked for", `${(v4 - v2).toFixed(0)} mm³ more`);
  direct({ cut: [], mount: "ears", earN: 4, d: 40 });
  check(/two ears, not four/.test(MF.enclosure.warn.map(w => w.t).join()), "a box too short for four says so and keeps two", MF.enclosure.warn.map(w => w.t).join(" / "));
  const earSup = await supportOf({ cut: [], mount: "ears", lid: "none", fasten: "none" });
  check(earSup >= 0 && earSup < 3, "the ears need no support", earSup.toFixed(1) + " mm²");

  M = direct({ cut: [], mount: "din" });
  const clip = M.find(q => q.name === "DIN rail clip"), cb = clip && bnd(clip), cx0 = cb && (cb.mn[0] + cb.mx[0]) / 2;
  check(clip && closed([clip]) && Math.abs(cb.mn[1]) < 1e-6 && Math.abs(cb.mx[2] - cb.mn[2] - (35 + 2 * (0.25 + 2.5))) < 0.01 && cb.mx[0] < -50 - 5,
    "the DIN clip: closed, flat on the bed beside the box, 40.5 mm across the rail", cb && `${(cb.mx[0] - cb.mn[0]).toFixed(1)} × ${(cb.mx[2] - cb.mn[2]).toFixed(1)} × ${cb.mx[1].toFixed(2)} mm`);
  // across the rail at the clip's middle: the flange slot is empty, the lip over it solid, the plate under it solid
  check(clip && !solidAt(clip, [cx0, 5.5, 16.5]) && solidAt(clip, [cx0, 7.5, 17.0]) && solidAt(clip, [cx0, 2.5, 16.5]) && !solidAt(clip, [cx0, 7.5, 15.5]) && !solidAt(clip, [cx0, 7, 0]),
    "a 1 mm flange fits between the plate and the lip, 1.5 mm of lip holds it, and the rail's middle is clear");
  check(!solidAt(M[0], [9, 1, 0]) && !solidAt(M[0], [-9, 1, 0]) && solidAt(M[0], [0, 1, 0]), "two screw holes through the floor, 18 mm apart, to match the clip");
  const dinSup = await supportOf({ cut: [], mount: "din", lid: "none", fasten: "none" });
  check(dinSup >= 0 && dinSup < 3, "the clip's lips step in at 45°: no support", dinSup.toFixed(1) + " mm²");
  const dinSmall = direct({ cut: [], mount: "din", w: 30, d: 30 });
  check(/Too small for a DIN/.test(MF.enclosure.warn.map(w => w.t).join()) && dinSmall.every(q => q.name !== "DIN rail clip"), "a box too small for the clip says how big it must be", MF.enclosure.warn.map(w => w.t).join(" / "));
  await build({ mount: "din", cut: [{ ...MF.newOpening("round", "bottom"), u: 9, v: 0 }] });
  check(MF.enclosure.left.length === 1 && /DIN clip screw/.test(MF.enclosure.warn[0].s), "a floor opening on a clip screw is left out and says why", MF.enclosure.warn.map(w => w.s).join(" | "));

  M = direct({ cut: [], mount: "straps", strapW: 12, strapT: 2.5 });
  // the box is 36 mm tall: the loop's channel is centred, 12 mm high and 2.5 mm deep just behind the back wall
  check(closed(M) && !MF.enclosure.warn.length && !solidAt(M[0], [-25, 18.5, -33.2]) && solidAt(M[0], [-25, 18.5, -35.5]) && !solidAt(M[0], [0, 18.5, -33.2]),
    "strap across: a 12 × 2.5 mm channel behind the back wall in each loop, open between them", bnd(M[0]).mn[2].toFixed(2));
  const strapSup = await supportOf({ cut: [], mount: "straps", lid: "none", fasten: "none" });
  check(strapSup >= 0 && strapSup < 3, "the loops' undersides slope at 45° and their tops bridge only the strap's thickness: no support", strapSup.toFixed(1) + " mm²");
  M = direct({ cut: [], mount: "straps", strapDir: "up" });
  check(closed(M) && !MF.enclosure.warn.length && !solidAt(M[0], [-25, 5, -33.2]) && solidAt(M[0], [-25 + 7, 5, -33.2]), "strap up: a slot 12 mm wide in each loop");
  direct({ cut: [], mount: "straps", h: 15, strapW: 20 });
  check(/Too short for strap loops/.test(MF.enclosure.warn.map(w => w.t).join()), "a strap too wide for a short box says so");
  M = direct({ cut: [], mount: "tabs" });
  const tb = bnd(M[0]);
  // the lid is 2.4 mm on a 36 mm box: the slot (4.5 mm, 8 mm between its ends) sits above it, the tab's round top 20 mm up
  check(closed(M) && !MF.enclosure.warn.length && Math.abs(tb.mx[1] - (38.4 + 3 + 2.25 + 8 + 6.25)) < 0.05 && !solidAt(M[0], [25, 47.65, -33.5]) && solidAt(M[0], [29.5, 47.65, -33.5]) && !solidAt(M[0], [0, 47.65, -33.5]),
    "hanging tabs: two, rising above the lid, each with its slot clear of the lid", `top at ${tb.mx[1].toFixed(2)} mm`);
  check(direct({ cut: [], mount: "tabs", tabN: 1 }).length && !solidAt(MF.buildEnclosure()[0], [25, 47.65, -33.5]) && !solidAt(MF.buildEnclosure()[0], [0, 47.65, -33.5]) && solidAt(MF.buildEnclosure()[0], [0, 40, -33.5]), "or one in the middle");
  M = direct({ cut: [], mount: "skadis" });
  check(closed(M) && !MF.enclosure.warn.length && [-40, 40].every(x => solidAt(M[0], [x, 32, -40]) && !solidAt(M[0], [x, 27, -35])) && !solidAt(M[0], [0, 32, -40]),
    "SKÅDIS: two hooks 80 mm apart (two slots of the 40 mm grid), the board's 5 mm between the box and each tip");
  M = direct({ cut: [], mount: "pegboard" });
  check(closed(M) && !MF.enclosure.warn.length && [-38.1, 38.1].every(x => solidAt(M[0], [x, 31, -41.8])) && !solidAt(M[0], [0, 31, -41.8]) && !solidAt(M[0], [38.1, 31, -36]),
    "pegboard: two pegs 76.2 mm apart (3 inches), each turning up behind a 1/4-inch board");
  direct({ cut: [], mount: "skadis", w: 40 });
  check(/Only one hook/.test(MF.enclosure.warn.map(w => w.t).join()), "a box too narrow for two hooks says it hangs from one");
  const ft = direct({ mount: "ears", test: true });
  const ftw = bnd(ft[0]).mx[0] - bnd(ft[0]).mn[0], ft0 = direct({ test: true }), ftw0 = bnd(ft0[0]).mx[0] - bnd(ft0[0]).mn[0];
  check(ft.length && Math.abs(ftw - ftw0) < 1e-6, "the fit test leaves the mounts off (it tries the openings)", `${ftw.toFixed(1)} mm wide with ears asked for, ${ftw0.toFixed(1)} without`);
  for (const m of ["tabs", "skadis", "pegboard"]) {
    const a = await supportOf({ cut: [], mount: m, lid: "none", fasten: "none" });
    check(a >= 0 && a < 3, `${m}: no support (each slopes at 45° or rises from below)`, a.toFixed(1) + " mm²");
  }
  await build({ mount: "straps", cut: [{ ...MF.newOpening("round", "back"), u: 25, v: 18 }] });
  check(MF.enclosure.left.length === 1 && /strap loop/.test(MF.enclosure.warn[0].s), "an opening on the back behind a loop is left out and says why", MF.enclosure.warn.map(w => w.s).join(" | "));

  console.log("\nplacement problems are reported, not silently cut");
  await build({ cut: [{ face: "front", kind: "btn", u: 0, v: 18, dia: 12.2 }, { face: "front", kind: "btn", u: 5, v: 18, dia: 12.2 }] });
  check(MF.enclosure.left.join() === "1" && /overlaps opening 1/.test(MF.enclosure.warn[0].s), "an overlapping opening is left out and named", MF.enclosure.warn.map(w => w.s).join(" | "));
  await build({ cut: [{ face: "front", kind: "usba", u: 49, v: 18 }] });
  check(MF.enclosure.left.length === 1 && /does not fit/.test(MF.enclosure.warn[0].s), "one on the rounded corner is left out", MF.enclosure.warn.map(w => w.t).join(" | "));
  await build({ cut: [{ face: "front", kind: "usba", u: 0, v: 33 }] });
  check(/behind the lid's lip/.test(MF.enclosure.warn.map(w => w.t).join()), "one behind the lid's lip is flagged", MF.enclosure.warn.map(w => w.t).join(" | "));
  check(MF.checks.list.some(r => /behind the lid/.test(r.t)), "and the warning reaches the checks list");
  await build({ lid: "none", cut: [{ face: "top", kind: "btn", u: 0, v: 0 }] });
  check(MF.enclosure.left.length === 1 && MF.parts.length === 1, "an opening on a lid that does not exist is left out");

  console.log("\nscrews, lids and heads");
  for (const [tag, over] of [["heat inserts, countersunk", {}], ["self-tapping, counterbored, 4 mm lid", { fasten: "screw", head: "bore", lidThick: 4 }],
                             ["plain holes, M4", { head: "plain", screw: "M4" }], ["press-fit lid, no posts", { lid: "press" }], ["no lid", { lid: "none" }],
                             ["square corners", { radius: 0 }], ["round corners 20 mm", { radius: 20, cut: [] }], ["flat lid, no lip", { lipH: 0 }]]) {
    const Q = direct(over);
    check(closed(Q) && !MF.enclosure.warn.length, tag, `${Q.length} parts, ${Q.map(p => C.checkMesh(p.solid).tris).join("+")} tris`);
  }
  await build({ head: "bore", lidThick: 2 });
  check(/too thin for counterbored/.test(MF.enclosure.warn.map(w => w.t).join()), "a lid too thin for counterbores says how thick it should be", MF.enclosure.warn.map(w => w.s).join(" | "));
  // the countersink: M3 heads are 6 mm, holes 3.4 mm, so 1.3 mm deep at 45°
  const sink = direct({ cut: [] })[1], flat = direct({ cut: [], head: "plain" })[1];
  const cone = Math.PI / 3 * 1.3 * (3 * 3 + 3 * 1.7 + 1.7 * 1.7) - Math.PI * 1.7 * 1.7 * 1.3;
  check(Math.abs((vol(flat) - vol(sink)) - 4 * cone) < 4 * cone * 0.15, "four countersinks remove four 90° cones", `${(vol(flat) - vol(sink)).toFixed(1)} vs ${(4 * cone).toFixed(1)} mm³`);

  console.log("\nboards");
  for (const brd of ["uno", "mega", "pi", "pizero", "pico", "custom"]) {
    const Q = direct({ w: 140, d: 90, h: 40, board: brd, cut: [] });
    const I = MF.enclosure;
    check(closed(Q) && I.board && !I.warn.length, `${brd}: standoffs, board top at ${I.board && I.board.top.toFixed(1)} mm`, I.warn.map(w => w.t).join(" | "));
  }
  await build({ board: "mega", cut: [] });
  check(/does not fit/.test(MF.enclosure.warn.map(w => w.t).join()), "a Mega in the 100 mm box: does not fit", MF.enclosure.warn.map(w => w.s).join(" | "));

  console.log("\nSession 12: labels, magnets, feet, pointed tops, notches, sliding lid, logo, fit test");
  {
    const op = (kind, face, over) => Object.assign(MF.newOpening(kind, face), over);   // with the part's real size
    const none = vol(direct({ cut: [op("usbc", "front", { u: 0, v: 14 })] })[0]);
    const Q = direct({ cut: [op("usbc", "front", { u: 0, v: 14, label: "USB-C" })] });
    check(closed(Q) && !MF.enclosure.warn.length && none - vol(Q[0]) > 2, "a label is engraved into the wall", `${(none - vol(Q[0])).toFixed(1)} mm³ cut`);
    direct({ cut: [op("usbc", "front", { u: 0, v: 3, label: "USB-C" })] });
    check(/does not fit below/.test(MF.enclosure.warn.map(w => w.s).join()), "a label with no room below is left out and said so", MF.enclosure.warn.map(w => w.s).join(" | "));
    const Q2 = direct({ cut: [op("btn", "top", { u: 0, v: 5, label: "RESET" }), op("round", "bottom", { u: 0, v: 0, dia: 6, label: "SERIAL 01" })] });
    check(closed(Q2) && !MF.enclosure.warn.length, "labels on the lid and the floor", `${Q2.map(p => C.checkMesh(p.solid).tris).join("+")} tris`);
    const mag = direct({ cut: [], lid: "magnet", magnet: "6x2", lidThick: 3, lipH: 0 });
    const pocket = Math.PI * 3.1 * 3.1 * 2.2;
    check(closed(mag) && !MF.enclosure.warn.length && mag.length === 2, "magnet lid: posts and lid closed", MF.enclosure.fastenText);
    const flatLid = vol(direct({ cut: [], lid: "press", lidThick: 3, lipH: 0 })[1]);
    check(Math.abs((flatLid - vol(mag[1])) - 4 * pocket) < 4 * pocket * 0.05, "four magnet pockets in the lid", `${(flatLid - vol(mag[1])).toFixed(1)} vs ${(4 * pocket).toFixed(1)} mm³`);
    direct({ cut: [], lid: "magnet", magnet: "8x3", lidThick: 2.4 });
    check(/too thin for the magnets/.test(MF.enclosure.warn.map(w => w.t).join()), "a lid too thin for the magnets says so", MF.enclosure.warn.map(w => w.s).join(" | "));
    const v0 = vol(direct({ cut: [] })[0]), feet = direct({ cut: [], feet: "recess", footSize: "8", footDepth: 1 });
    const recess = Math.PI * 4.15 * 4.15 * 1;
    check(closed(feet) && Math.abs((v0 - vol(feet[0])) - 4 * recess) < 4 * recess * 0.03, "four foot recesses under the floor", `${(v0 - vol(feet[0])).toFixed(1)} vs ${(4 * recess).toFixed(1)} mm³`);
    direct({ cut: [op("round", "bottom", { u: 44, v: 26, dia: 6 })] });
    check(/corner post/.test(MF.enclosure.warn.map(w => w.s).join()), "a floor opening over a corner post is left out", MF.enclosure.warn.map(w => w.s).join(" | "));
    const sl = direct({ lid: "slide", cut: [op("usbc", "front", { u: 0, v: 12 }), op("vent", "top", { u: 0, v: 0, w: 30, h: 12, label: "AIR" })] });
    const Es = MF.state.base.enclosure, gr = Math.min(Math.max(Es.wall * 0.5, 0.6), Math.max(0.6, Es.wall - 0.6));
    let gap = Infinity; const lp = sl[1].solid.pos, off = -(Es.w + 10);
    for (let i = 0; i < lp.length; i += 3) gap = Math.min(gap, (Es.w / 2 - Es.wall + gr - lp[i + 1]) - Math.abs(lp[i] + off));
    check(closed(sl) && !MF.enclosure.warn.length && Math.abs(gap - Es.fit) < 1e-4, "sliding lid: closed, and it clears the 45° rails by the fit gap", `${gap.toFixed(4)} mm`);
    const pi0 = direct({ lipH: 3, cut: [op("rect", "right", { u: 0, v: 18, w: 40, h: 10, r: 1 })] }), pin = direct({ lipH: 3, cut: [op("rect", "right", { u: 0, v: 18, w: 40, h: 10, r: 1, notch: true })] });
    check(closed(pin) && !MF.enclosure.warn.length && vol(pin[0]) < vol(pi0[0]) - 100 && vol(pin[1]) < vol(pi0[1]) - 20, "a notch runs to the top edge, and the lid's lip has a gap there",
      `box −${(vol(pi0[0]) - vol(pin[0])).toFixed(0)} mm³, lid −${(vol(pi0[1]) - vol(pin[1])).toFixed(0)} mm³`);
    // a wide port prints its top as a bridge; a pointed top needs none
    const waitPrint = async () => { let q = null; for (let i = 0; i < 400 && !(q = MF.print); i++) await sleep(25); return q; };
    const usba = top => Object.assign(MF.newOpening("usba", "front"), { u: 0, v: 14, top });
    await build({ cut: [usba("flat")] }); const flatSup = (await waitPrint()).overhang.area;
    await build({ cut: [usba("pointed")] }); const ptSup = (await waitPrint()).overhang.area;
    check(closed(MF.parts) && flatSup > 5 && ptSup < 0.5, "a pointed top on a wide port removes its support", `${flatSup.toFixed(1)} -> ${ptSup.toFixed(1)} mm²`);
    // the logo on the lid: a picture dropped on the Art tab, inlaid in its own colours
    {
      const { encodePNG } = require("./tools-test-env.js"), W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, dx = x - 120, dy = y - 90, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const col = r < 40 * (0.62 + 0.38 * Math.cos(5 * a)) ? [240, 190, 30] : r < 75 ? [209, 73, 91] : [255, 255, 255];
        px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
      }
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "art").click(); await sleep(50);
      const ev = new win.Event("drop", { bubbles: true, cancelable: true }); ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
      document.querySelector("#drop").dispatchEvent(ev);
      for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge" && d.src); i++) await sleep(30);
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50);
      const lid0 = vol((await build({ cut: [] }))[1]);
      const Pl = await build({ cut: [], logo: { on: true, mode: "inlay", width: 40, x: 0, y: 0, depth: 0.6 } });
      const logos = Pl.filter(p => /Lid logo/.test(p.name)), lv = logos.reduce((a, p) => a + vol(p), 0);
      check(closed(Pl) && logos.length === 2 && Math.abs((lid0 - vol(Pl[1])) - lv) < lv * 0.01, "a logo inlaid into the lid in two colours, filling exactly what the lid lost",
        `${logos.map(p => p.name).join(", ")}: ${lv.toFixed(1)} mm³ vs ${(lid0 - vol(Pl[1])).toFixed(1)}`);
      const Pe = await build({ cut: [], logo: { on: true, mode: "engrave", width: 40, x: 0, y: 0, depth: 0.6 } });
      check(closed(Pe) && Pe.length === 2 && Math.abs((lid0 - vol(Pe[1])) - lv) < lv * 0.01, "or engraved into it", `${(lid0 - vol(Pe[1])).toFixed(1)} mm³ cut`);
      await build({ cut: [op("vent", "top", { u: 0, v: 0, w: 30, h: 12 })], logo: { on: true, mode: "inlay", width: 40, x: 0, y: 0, depth: 0.6 } });
      check(/overlaps opening 1/.test(MF.enclosure.warn.map(w => w.s).join()), "a logo over a lid opening is left off and said so", MF.enclosure.warn.map(w => w.s).join(" | "));
      const Ps = await build({ lid: "slide", cut: [], logo: { on: true, mode: "inlay", width: 30, x: 0, y: 0, depth: 0.6 } });
      check(closed(Ps) && Ps.filter(p => /Lid logo/.test(p.name)).length === 2, "and on a sliding lid, in its top face");
      MF.state.items.splice(0); MF.state.active = -1;
    }
    // put each lid back on its box: every point of its lip stays the fit gap inside the rounded walls
    const lipGap = over => { const Q = direct(over), Ex = MF.state.base.enclosure, lid = Q[1].solid, ri = Ex.radius - Ex.wall, iw = Ex.w - 2 * Ex.wall, id = Ex.d - 2 * Ex.wall; let g = Infinity;
      for (let i = 0; i < lid.pos.length; i += 3) { if (lid.pos[i + 1] < Ex.lidThick + 1e-6) continue;
        const x = lid.pos[i] - (Ex.w + 10), z = -lid.pos[i + 2], qx = Math.abs(x) - (iw / 2 - ri), qz = Math.abs(z) - (id / 2 - ri);
        g = Math.min(g, qx > 0 && qz > 0 ? ri - Math.hypot(qx, qz) : Math.min(iw / 2 - Math.abs(x), id / 2 - Math.abs(z))); }
      return g; };
    const gaps = [{ lid: "press" }, { lid: "press", cut: [op("rect", "right", { u: 0, v: 18, w: 30, h: 10, notch: true })] }, { lid: "screw", cut: [op("rect", "front", { u: 0, v: 18, w: 30, h: 10, notch: true })] }, { lid: "magnet", lidThick: 3 }].map(lipGap);
    check(gaps.every(g => Math.abs(g - 0.2) < 1e-3), "every lid's lip clears the rounded walls by the fit gap (press, press with a notch, screwed with a notch, magnet)", gaps.map(g => g.toFixed(3)).join(", "));
    const tb = direct({ test: true, cut: MF.defaults.enclosure.cut.concat([op("btn", "front", { u: 30, v: 18, dia: 12.2 })]) });
    const Ti = MF.enclosure;
    check(closed(tb) && !Ti.warn.length && Ti.test && Ti.count === 3 && Ti.size[0] < 100, "fit test: a smaller box with one of each opening", `${Ti.size.map(v => v.toFixed(0)).join(" × ")}, ${Ti.count} openings`);
  }

  console.log("\npresets");
  for (const k of ["Project box", "Power bank box", "PSU box", "Raspberry Pi case"]) {
    [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === k).click(); await settle(); await sleep(150); await settle();
    const I = MF.enclosure;
    check(MF.state.base.type === "enclosure" && closed(MF.parts) && I && !I.warn.length && I.count === MF.state.base.enclosure.cut.length,
      `${k}: ${I && I.count} openings, closed, no warnings`, I && I.warn.map(w => w.s).join(" | "));
    let p = null; for (let i = 0; i < 400 && !(p = MF.print); i++) await sleep(25);
    check(!!p, `  printability check ran`, p && `support ${p.overhang.area.toFixed(0)} mm², bridges ${p.flats.filter(f => f.kind === "bridge").length}, bed ${p.contact.area.toFixed(0)} mm²`);
  }

  console.log("\nrulers");
  const rulerOn = () => { let n = 0; MF.bedHelper.traverse(o => { if (o.isSprite) n++; }); return n; };
  const n1 = rulerOn();
  check(n1 > 10, "labels on the bed axes and the model", n1 + " labels");
  document.querySelector("#vRuler").click(); await sleep(50);
  check(rulerOn() === 0, "the ruler button hides them");
  document.querySelector("#vRuler").click(); await sleep(50);

  console.log("\nhostile project file");
  const bad2 = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state)) };
  bad2.state.items = [];
  bad2.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { lid: "<img src=x onerror=alert(1)>", screw: "M99", board: "__proto__",
    cut: [{ face: "<b>", kind: "<script>", u: 1e9, v: -1e9, dia: "12" }, "junk", null, { face: "top", kind: "fan", size: 33, style: "evil" }] });
  const f = new win.File([JSON.stringify(bad2)], "evil.json", { type: "application/json" });
  const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.state.base.enclosure.lid !== "screw"; i++) await sleep(30);
  await settle();
  const E = MF.state.base.enclosure;
  check(E.lid === "screw" && E.screw === "M3" && E.board === "none", "bad choices fall back to safe ones", `${E.lid}, ${E.screw}, ${E.board}`);
  check(E.cut.length === 2 && E.cut[0].kind === "round" && E.cut[0].face === "front" && E.cut[0].u === 400 && E.cut[0].v === -400, "bad openings are cleaned or dropped", JSON.stringify(E.cut[0]));
  check(E.cut[1].size === 40 && E.cut[1].style === "rings", "a fan with an unknown size gets the default", JSON.stringify(E.cut[1]));
  check(!document.querySelector("#panel img[src=x]") && !document.body.innerHTML.includes("onerror=alert"), "nothing injected into the page");
  // Session 12 settings in a hostile file
  const bad3 = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state)) };
  bad3.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { lid: "magnet", magnet: "__proto__", feet: "<x>", footSize: "999", test: "yes",
    logo: { on: "yes", width: 1e9, x: -1e9, mode: "<svg onload=alert(2)>", depth: -5 }, labelH: 1e6, labelDepth: -3, lensSlot: 1e9, grow: "no",
    cut: [{ face: "front", kind: "usbc", u: 0, v: 14, label: "<img src=x onerror=alert(3)>", labelPos: "sideways", top: "evil", notch: "yes" }] });
  const f3 = new win.File([JSON.stringify(bad3)], "evil2.json", { type: "application/json" });
  Object.defineProperty(inp, "files", { value: [f3], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.state.base.enclosure.lid !== "magnet"; i++) await sleep(30);
  await settle();
  const E3 = MF.state.base.enclosure, c3 = E3.cut[0];
  check(E3.magnet === "6x2" && E3.feet === "none" && E3.footSize === "8" && E3.test === false, "bad magnet, feet and fit-test values fall back", `${E3.magnet}, ${E3.feet}, ${E3.footSize}, ${E3.test}`);
  check(E3.logo.on === false && E3.logo.mode === "inlay" && E3.logo.width === 300 && E3.logo.x === -200 && E3.logo.depth === 0.2, "the lid logo's settings are clamped", JSON.stringify(E3.logo));
  check(E3.labelH === 15 && E3.labelDepth === 0.2, "label size and depth are clamped", `${E3.labelH}, ${E3.labelDepth}`);
  check(E3.lensSlot === 7 && E3.grow === true, "the pilot-light lens filament is clamped, and a bad grow switch stays on", `${E3.lensSlot}, ${E3.grow}`);
  check(/^[A-Z0-9\-+\/.:% ]*$/.test(c3.label) && c3.labelPos === "below" && c3.top === "flat" && c3.notch === false, "an opening's label keeps only letters it can engrave", JSON.stringify(c3.label));
  check(!document.body.innerHTML.includes("onerror=alert") && !document.body.innerHTML.includes("onload=alert"), "still nothing injected");
  // Session 39: mounting and the new openings in a hostile file
  const bad4 = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state)) };
  bad4.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { lid: "press", mount: "<img src=x onerror=alert(4)>", earN: 9, tabN: "x", earHole: -5, earT: 1e9,
    strapW: 1e9, strapT: "x", strapDir: "sideways", cut: [{ face: "front", kind: "pir501", u: 0, v: 18, dia: -9, hw: 1e9, hd: "big" }, { face: "top", kind: "speaker", u: 0, v: 0, dia: 1e9, hd: 0 }] });
  const f4 = new win.File([JSON.stringify(bad4)], "evil3.json", { type: "application/json" });
  Object.defineProperty(inp, "files", { value: [f4], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.state.base.enclosure.lid !== "press"; i++) await sleep(30);
  await settle();
  const E39 = MF.state.base.enclosure;
  check(E39.mount === "none" && E39.earN === 2 && E39.tabN === 2 && E39.earHole === 2 && E39.earT === 8 && E39.strapW === 30 && E39.strapT === 2.5 && E39.strapDir === "across",
    "bad mounting values fall back or are clamped", `${E39.mount}, ${E39.earN}, ${E39.earHole}, ${E39.earT}, ${E39.strapW}, ${E39.strapT}, ${E39.strapDir}`);
  check(E39.cut.length === 2 && E39.cut[0].kind === "pir501" && E39.cut[0].hw === 400 && E39.cut[1].dia === 400 && MF.parts.length > 0 && MF.parts.every(q => C.checkMesh(q.solid).open === 0),
    "a motion sensor and a speaker grille with silly sizes still build closed (each is clamped)", JSON.stringify([E39.cut[0].dia, E39.cut[0].hw, E39.cut[1].dia]));
  check(!document.body.innerHTML.includes("alert(4)"), "nothing injected by the mounting settings");

  console.log("\nSession 13: round holes, the box grows to fit, boards that do not fit");
  const $$ = q => [...document.querySelectorAll(q)];
  await settle(); await sleep(300); await settle();
  const near = (a, c, tol) => Math.abs(a - c) <= tol;
  // projects were loaded above, so the state object is a new one: always go through MF.state
  const freshNow = over => { MF.state.base.type = "enclosure"; MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), over || {}); };
  const directNow = over => { freshNow(over); return MF.buildEnclosure(); };
  const buildNow = async over => { freshNow(over); MF.rebuild(false); await settle(); return MF.parts; };
  const holeVol = async over => { const v0 = vol(directNow({ cut: [], ...over })[0]); const v1 = vol(directNow({ cut: [{ ...MF.newOpening("round", "front"), dia: 20, v: 18 }], ...over })[0]); return v0 - v1; };
  const round = await holeVol({}), wantRound = Math.PI * 10.2 * 10.2 * 2, tear = await holeVol({ teardrop: true });
  check(Math.abs(round - wantRound) / wantRound < 0.03, "a 20 mm hole in a wall is round by default", `${round.toFixed(0)} mm³ removed, a round one ${wantRound.toFixed(0)}`);
  check(tear > round * 1.05, "pointed tops are still there when asked for", `${tear.toFixed(0)} mm³`);
  const load = async (v, teardrop) => {
    const st = JSON.parse(JSON.stringify(Object.assign({}, MF.state, { items: [] }))); st.base.type = "enclosure"; st.base.enclosure.teardrop = teardrop; st.base.enclosure.w = 101 + (v === 5 ? 1 : 0);
    const f = new win.File([JSON.stringify({ app: "Maker Forge", v, state: st })], "p.json", { type: "application/json" });
    const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.state.base.enclosure.w !== st.base.enclosure.w; i++) await sleep(30); await settle();
    return MF.state.base.enclosure.teardrop;
  };
  check(await load(4, true) === false && await load(5, true) === true, "older projects open with round holes; a newer one keeps pointed tops when it asked for them");
  // the PSU box's 60 mm fan made 120 mm through its own menu
  $$("#presetGallery button").find(b => b.dataset.k === "PSU box").click(); await settle();
  MF.state.base.enclosure.teardrop = false;
  $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40);
  $$("#secrail button").find(b => b.dataset.title === "Openings").click(); await sleep(40);
  let fanSel = $$("#panel select").find(x => [...x.options].some(o => /120 mm fan/.test(o.textContent)));
  fanSel.value = "120"; fanSel.dispatchEvent(new win.Event("change")); await settle();
  let E4 = MF.state.base.enclosure, fanIdx = E4.cut.findIndex(c => c.kind === "fan");
  check(!MF.enclosure.left.length && E4.d >= 120 && E4.h >= 115 && /box grew/.test(document.querySelector("#notice").textContent), "a 120 mm fan on a 110 × 75 mm side: the box grows and the fan moves up so it fits",
    `${E4.w} × ${E4.d} × ${E4.h}, fan at ${E4.cut[fanIdx].v} mm: "${document.querySelector("#notice").textContent.slice(0, 70)}"`);
  check(closed(MF.parts), "and it is still a closed box");
  E4.grow = false; fanSel = $$("#panel select").find(x => [...x.options].some(o => /140 mm fan/.test(o.textContent)));
  fanSel.value = "140"; fanSel.dispatchEvent(new win.Event("change")); await settle(); await sleep(50);
  check(MF.enclosure.left.includes(fanIdx) && MF.checks.list.some(l => /left out/.test(l.t)) && $$("#panel .result.warn b").some(b => /Not in the box yet/.test(b.textContent)),
    "with growing switched off, a 140 mm fan is left out, said on its card and in the checks");
  $$("#panel button").find(b => /Make it fit/.test(b.textContent)).click(); await settle();
  check(!MF.enclosure.left.length && MF.state.base.enclosure.d >= 140 && MF.state.base.enclosure.h >= 130, "Make it fit grows the box for it", `${E4.w} × ${E4.d} × ${E4.h}`);
  // a board bigger than the box: no standoffs outside it; picking it grows the box
  P = await buildNow({ w: 50, d: 40, h: 30, board: "pi", cut: [] });
  b = bnd(P[0]);
  check(near(b.size[0], 50, 1e-3) && near(b.size[2], 40, 1e-3) && MF.enclosure.warn.some(w => /does not fit/.test(w.t) && /left out/.test(w.s)), "a Raspberry Pi in a 50 × 40 mm box: warned, and no standoffs outside the box", b.size.map(v => v.toFixed(1)).join(" x "));
  await buildNow({ w: 50, d: 40, h: 30, board: "none", cut: [] }); MF.render(); await sleep(40);
  $$("#secrail button").find(x => /board/i.test(x.dataset.title || "")).click(); await sleep(40);
  const boardSel = $$("#panel select").find(x => [...x.options].some(o => o.value === "pi"));
  boardSel.value = "pi"; boardSel.dispatchEvent(new win.Event("change")); await settle();
  const E5 = MF.state.base.enclosure;
  check(E5.w >= 90 && E5.d >= 60 && !MF.enclosure.warn.some(w => /does not fit/.test(w.t)) && MF.enclosure.board && MF.enclosure.board.fits !== false, "picking the Pi for that box grows it round the board", `${E5.w} × ${E5.d} × ${E5.h}`);

  console.log("\npilot lights (Session 13)");
  P = await buildNow({ cut: [{ ...MF.newOpening("pilotp5", "front"), u: -20, v: 18 }, { ...MF.newOpening("pilotp3", "front"), u: 10, v: 18 }, { ...MF.newOpening("pilot22", "back"), u: 0, v: 18 }], lensSlot: 2 });
  const lensPart = P.find(p => /Pilot light lenses/.test(p.name));
  check(lensPart && /\(2\)/.test(lensPart.name) && lensPart.slot === 2 && closed([lensPart]), "two printed jewel lenses (none for the bought 22 mm lamp), in the lens filament", lensPart && lensPart.name);
  const lb = lensPart && C.solidBounds(lensPart.solid);
  check(lb && near(lb.mn[1], 0, 1e-6) && lb.mn[2] > 32, "printed flat side down, in front of the box", lb && `from z ${lb.mn[2].toFixed(1)}`);
  // each lens: the shank passes the hole (8 mm + 0.2 clearance), the flange does not
  const first = []; for (let i = 0; i < lensPart.solid.pos.length; i += 3) if (lensPart.solid.pos[i] < -36) first.push([lensPart.solid.pos[i], lensPart.solid.pos[i + 1], lensPart.solid.pos[i + 2]]);
  const cx = (Math.min(...first.map(q => q[0])) + Math.max(...first.map(q => q[0]))) / 2, zc = (Math.min(...first.map(q => q[2])) + Math.max(...first.map(q => q[2]))) / 2;
  const rad = q => Math.hypot(q[0] - cx, q[2] - zc);
  const shank = Math.max(...first.filter(q => q[1] > 1.2 + 1e-6).map(rad)), flange = Math.max(...first.filter(q => q[1] <= 1.2 + 1e-6).map(rad));
  check(shank * 2 < 8.2 && flange * 2 > 8.2 + 3, "the 5 mm lens's shank passes the 8.2 mm hole and its flange stops it", `shank ${(shank * 2).toFixed(2)} mm, flange ${(flange * 2).toFixed(2)} mm`);
  check(MF.enclosure.lenses === 2 && !MF.enclosure.left.length, "all three pilot lights fit", `${MF.enclosure.lenses} lenses`);
  // the LED pocket must stay inside every lens with real wall round it (it once broke out through the side
  // of the narrowing dome): horizontal rays from each lens's axis must enter and leave the plastic in turn,
  // end outside, and cross at least 0.75 mm of plastic each time they enter
  const lensPieces = S => {                                // the separate lenses: triangles joined by shared corners
    const I = S.idx, Q = S.pos, up = new Int32Array(Q.length / 3).map((_, i) => i), find = i => { while (up[i] !== i) i = up[i] = up[up[i]]; return i; };
    for (let t = 0; t < I.length; t += 3) { up[find(I[t + 1])] = find(I[t]); up[find(I[t + 2])] = find(I[t]); }
    const by = new Map();
    for (let t = 0; t < I.length; t += 3) { const r = find(I[t]); if (!by.has(r)) by.set(r, []); by.get(r).push([I[t], I[t + 1], I[t + 2]].map(k => [Q[k * 3], Q[k * 3 + 1], Q[k * 3 + 2]])); }
    return [...by.values()].sort((m, n) => m[0][0][0] - n[0][0][0]);
  };
  const lensWalls = tri => {
    const xs = tri.flat().map(q => q[0]), zs = tri.flat().map(q => q[2]), ys = tri.flat().map(q => q[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2, top = Math.max(...ys);
    let thin = Infinity, bad = 0, rays = 0;
    for (let y = 0.013; y < top - 0.02; y += 0.05) for (let a = 7; a < 360; a += 22.5) {
      const d = [Math.cos(a * Math.PI / 180), 0, Math.sin(a * Math.PI / 180)], o = [cx, y, cz], hits = [];
      for (const [A, B, Cc] of tri) {
        const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [Cc[0] - A[0], Cc[1] - A[1], Cc[2] - A[2]];
        const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
        if (Math.abs(det) < 1e-12) continue;
        const s = [o[0] - A[0], o[1] - A[1], o[2] - A[2]], u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) / det; if (u < 0 || u > 1) continue;
        const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]], v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det; if (v < 0 || u + v > 1) continue;
        const tt = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det; if (tt <= 0) continue;
        const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        hits.push([tt, Math.sign(n[0] * d[0] + n[2] * d[2])]);
      }
      hits.sort((m, n) => m[0] - n[0]); rays++;
      if (!hits.length || hits[hits.length - 1][1] < 0 || hits.some((h, i) => i && h[1] === hits[i - 1][1])) { bad++; continue; }
      for (let i = 0; i < hits.length - 1; i++) if (hits[i][1] < 0) thin = Math.min(thin, hits[i + 1][0] - hits[i][0]);
    }
    return { thin, bad, rays };
  };
  const pieces = lensPieces(lensPart.solid), walls = pieces.map(lensWalls);
  check(pieces.length === 2 && walls.every(w => w.rays > 1000 && !w.bad && w.thin >= 0.75), "the LED pockets stay inside both lenses with at least 0.75 mm of wall",
    walls.map((w, i) => `${i ? "3" : "5"} mm lens: ${w.rays} rays, ${w.bad} bad, thinnest ${w.thin.toFixed(2)} mm`).join("; "));
  // a hole set smaller than the lens grows to the lens, so the lens still goes through
  P = await buildNow({ cut: [{ ...MF.newOpening("pilotp5", "front"), u: 0, v: 18, dia: 5.5 }] });
  const small = P.find(p => /Pilot light lenses/.test(p.name)), sb = small && C.solidBounds(small.solid);
  const ring = MF.openingRings({ ...MF.newOpening("pilotp5", "front"), dia: 5.5 }, true, MF.state.base.enclosure)[0], ringW = Math.max(...ring.map(q => q[0])) - Math.min(...ring.map(q => q[0]));
  const shank5 = Math.max(...small.solid.pos.filter((_, i) => i % 3 === 1).map((y, i) => y > 1.2 + 1e-6 ? 1 : 0)) && (() => {
    const Q = small.solid.pos, pts = []; for (let i = 0; i < Q.length; i += 3) pts.push([Q[i], Q[i + 1], Q[i + 2]]);
    const cx = (Math.min(...pts.map(q => q[0])) + Math.max(...pts.map(q => q[0]))) / 2, cz = (Math.min(...pts.map(q => q[2])) + Math.max(...pts.map(q => q[2]))) / 2;
    return 2 * Math.max(...pts.filter(q => q[1] > 1.2 + 1e-6).map(q => Math.hypot(q[0] - cx, q[2] - cz)));
  })();
  check(small && sb && closed([small]) && ringW >= MF.lensMinHole(5) - 1e-6 && shank5 < ringW, "a hole set to 5.5 mm for a 5 mm pilot light grows to fit its lens",
    `hole ${ringW.toFixed(2)} mm (the lens needs ${MF.lensMinHole(5)}), shank ${shank5.toFixed(2)} mm`);
  P = await buildNow({ test: true, cut: [{ ...MF.newOpening("pilotp5", "front"), u: 0, v: 18 }] });
  check(!P.some(p => /lenses/.test(p.name)), "the fit test prints no lenses");
  const PB = MF.defaults ? null : null;
  $$("#presetGallery button").find(b => b.dataset.k === "Power bank box").click(); await settle();
  check(MF.parts.some(p => /Pilot light lenses \(4\)/.test(p.name)) && !MF.enclosure.left.length, "the Power bank box's four charge lights are pilot lights with lenses", MF.parts.map(p => p.name).join(", "));

  await splitTests(MF, C);
  finish();
})();
function finish() {
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
}

// Session 40: a box bigger than the bed, split into parts that screw together (ONLY=split runs just this)
async function splitTests(MF, C) {
  console.log("\nSession 40: a box bigger than the bed, split into parts that screw together");
  const $$ = q => [...document.querySelectorAll(q)], near = (a, c, tol) => Math.abs(a - c) <= tol, inp = document.querySelector("#projInput");
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const vol = p => C.checkMesh(p.solid).volume, bnd = p => C.solidBounds(p.solid);
  const buildNow = async over => { MF.state.base.type = "enclosure"; MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), over || {}); MF.rebuild(false); await settle(); return MF.parts; };
  const openFile = async (data, name, done) => {
    const f = new win.File([JSON.stringify(data)], name, { type: "application/json" });
    Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && !done(); i++) await sleep(30); await settle();
  };
  // a point inside a solid: crossings of a ray (slightly skewed, so it misses edges) with its triangles
  const inside = (S, p) => {
    const d = [0.0123, 1, 0.0347], Q = S.pos, I = S.idx; let n = 0;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const e1 = [Q[b] - Q[a], Q[b + 1] - Q[a + 1], Q[b + 2] - Q[a + 2]], e2 = [Q[c] - Q[a], Q[c + 1] - Q[a + 1], Q[c + 2] - Q[a + 2]];
      const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
      if (Math.abs(det) < 1e-12) continue;
      const s = [p[0] - Q[a], p[1] - Q[a + 1], p[2] - Q[a + 2]], u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det; if (u < 0 || u > 1) continue;
      const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]], v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det; if (v < 0 || u + v > 1) continue;
      if ((e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det > 0) n++;
    }
    return n % 2 === 1;
  };
  const keepPrinter = JSON.parse(JSON.stringify(MF.state.printer)), bed = [256, 256, 260];
  Object.assign(MF.state.printer, { model: "Bambu X2D", bed: bed.slice() });
  const op = (kind, face, over) => Object.assign(MF.newOpening(kind, face), over);
  // a 300 mm box with openings on all six faces, like the bench supply's case
  const allFaces = () => [op("lcd1602", "front", { u: -70, v: 70 }), op("pot", "front", { u: 40, v: 60, label: "SET" }), op("banana", "front", { u: 90, v: 30 }), op("pilotp5", "front", { u: 110, v: 60 }),
    op("iec", "back", { u: 90, v: 70 }), op("fan", "back", { u: -50, v: 45, size: 60 }), op("rocker", "back", { u: 40, v: 70 }), op("vent", "left", { u: 0, v: 60, w: 70, h: 30 }),
    op("vent", "right", { u: 0, v: 60, w: 70, h: 30 }), op("vent", "top", { u: -90, v: 0, w: 60, h: 40 }), op("round", "bottom", { u: 80, v: 0, dia: 8 })];
  let P = await buildNow({ w: 300, d: 160, h: 110, cut: allFaces() });
  const I = MF.enclosure, S = I.split, E6 = MF.state.base.enclosure;
  check(S && S.n === 2 && S.axis === 0 && P.filter(p => /^Box part/.test(p.name)).length === 2 && P.filter(p => /^Lid part/.test(p.name)).length === 2,
    "300 × 160 × 110 on a 256 mm bed: two box parts and two lid parts", P.map(p => p.name).join(", "));
  check(closed(P), "every part is a closed, outward solid", P.map(p => `${p.name} ${C.checkMesh(p.solid).open}`).join(", "));
  check(!I.warn.length && I.count === E6.cut.length, `all ${E6.cut.length} openings in, on all six faces, no warnings`, I.warn.map(w => w.t).join(" | "));
  const sizes = P.map(p => bnd(p).size);
  check(sizes.every(z => z[0] <= bed[0] && z[2] <= bed[1] && z[1] <= bed[2]), "each part fits the bed", sizes.map(z => z.map(v => v.toFixed(0)).join("×")).join(", "));
  // nothing lost or doubled: the parts are the whole box plus the flanges
  E6.split = "off"; const whole = MF.buildEnclosure(); E6.split = "bed"; MF.buildEnclosure();
  const boxParts = P.filter(p => p.role === "box"), sum = boxParts.reduce((a, p) => a + vol(p), 0);
  check(Math.abs(sum - S.flangeVolume - vol(whole[0])) < 0.01, "the box parts are exactly the whole box plus the join flanges", `${sum.toFixed(2)} = ${vol(whole[0]).toFixed(2)} + ${S.flangeVolume.toFixed(2)} mm³`);
  const s = S.seams[0], b1 = bnd(boxParts[0]), b2 = bnd(boxParts[1]);
  check(near(b1.mx[0], s, 1e-4) && near(b2.mn[0], s, 1e-4) && near(b1.mn[0], -150, 1e-3) && near(b2.mx[0], 150, 1e-3), "they meet face to face at the join", `join at ${s.toFixed(3)} mm`);
  // the screws: insert holes in part 1's flange, clearance holes counterbored for the heads in part 2's, lined up
  const Sc = S.S, at = (along, p, q) => [along, q, p];
  let bad = [];
  S.holes.forEach(([p, q], i) => {
    const ring = (part, along, r, want) => [[r, 0], [-r, 0], [0, -r]].forEach(([dp, dq]) => { if (inside(part.solid, at(along, p + dp, q + dq)) !== want) bad.push(`hole ${i} r ${r} in ${part.name}`); });
    if (inside(boxParts[0].solid, at(s - S.tf / 2, p, q)) || inside(boxParts[1].solid, at(s + S.tf / 2, p, q))) bad.push(`hole ${i} blocked`);
    ring(boxParts[0], s - S.tf / 2, Sc.insert / 2 - 0.25, false); ring(boxParts[0], s - S.tf / 2, Sc.insert / 2 + 0.5, true);
    ring(boxParts[1], s + S.tf / 2, Sc.clear / 2 - 0.25, false); ring(boxParts[1], s + S.tf / 2, Sc.clear / 2 + 0.4, true);
  });
  check(S.holes.length >= 6 && !bad.length, `${S.holes.length} M3 screws through the join: ${Sc.insert} mm insert holes in part 1, ${Sc.clear} mm clearance holes in part 2, lined up`, bad.slice(0, 4).join("; "));
  check(S.holes.every(([p, q]) => Math.abs(p) < S.A && q > E6.floor && q < E6.h), "every join screw is inside the box");
  // the lid: each part screws down on its own, two more screws each side of the join, into the tops of the flanges
  const lidParts = P.filter(p => p.role === "lid"), shift = [E6.w + 10, 0, 0];
  bad = [];
  S.pins.forEach(([x, z], i) => {
    const k = x < s ? 0 : 1, post = boxParts[k], lid = lidParts[k], r0 = Sc && MF.state.base.enclosure.fasten === "insert" ? 2 : 1.25;
    if (inside(post.solid, [x, E6.h - 1, z]) || !inside(post.solid, [x + r0 + 0.6, E6.h - 1, z]) || !inside(post.solid, [x, E6.h - 1, z + r0 + 0.6])) bad.push(`post ${i}`);
    const lp = [x + shift[0], E6.lidThick - 0.3, -z + shift[2]];
    if (inside(lid.solid, lp) || !inside(lid.solid, [lp[0] + 3.4 / 2 + 0.6, lp[1], lp[2]])) bad.push(`lid hole ${i}`);
  });
  check(S.pins.length === 4 && !bad.length, "the lid's four extra screws: insert holes in the flange tops, holes in the lid parts above them", bad.join("; "));
  // laid out: every plate fits the bed, and nothing on a plate overlaps
  const printed = MF.printParts(), byPlate = new Map();
  printed.forEach(q => { if (!byPlate.has(q.plate)) byPlate.set(q.plate, []); byPlate.get(q.plate).push(Object.assign({ b: C.solidBounds(q) }, q)); });
  let worst = -Infinity; const overlap = [];
  byPlate.forEach(list => {
    const mn = [0, 2].map(k => Math.min(...list.map(q => q.b.mn[k]))), mx = [0, 2].map(k => Math.max(...list.map(q => q.b.mx[k])));
    worst = Math.max(worst, mx[0] - mn[0] - bed[0], mx[1] - mn[1] - bed[1]);
    list.forEach((a, i) => list.slice(i + 1).forEach(c => { if (/logo/.test(a.name + c.name)) return; if (a.b.mn[0] < c.b.mx[0] && c.b.mn[0] < a.b.mx[0] && a.b.mn[2] < c.b.mx[2] && c.b.mn[2] < a.b.mx[2]) overlap.push(`${a.name}/${c.name}`); }));
  });
  check(byPlate.size === S.plates.length && worst <= 0 && !overlap.length && printed.every(q => near(C.solidBounds(q).mn[1], 0, 1e-4)), `laid out on ${byPlate.size} plates, each within the bed, on the bed, nothing overlapping`,
    `${worst.toFixed(1)} mm to spare at the tightest; ${overlap.join(", ")}`);
  check(MF.checks.list.some(r => r.t === "Fits the bed" && /plates/.test(r.s)) && !MF.checks.list.some(r => /Bigger than the print bed/.test(r.t)), "the checks say every plate fits the bed",
    (MF.checks.list.find(r => /bed/i.test(r.t)) || {}).s);
  check(/2 parts across its width/.test(S.parts) && new RegExp(`press ${S.holes.length} M3 heat inserts`).test(S.join) && /M3 × 14/.test(S.join) && S.plates.length === byPlate.size,
    "it says how they go together", `${S.parts} ${S.join.slice(0, 110)}…`);
  // nothing in the joins needs support or makes thin walls: the parts need what the one-piece box needs (its openings')
  const pa = q => C.analyzePrint([{ name: "x", slot: 0, pos: q.pos, idx: q.idx }], { nozzle: 0.4, layer: 0.2, angle: 45, bridge: 10 });
  const sup = P.filter(p => p.role).map(p => [p.name, pa(p.solid)]), one = [whole[0], whole.find(p => p.name === "Lid")].map(p => pa(p.solid));
  const partsSup = sup.reduce((a, [, r]) => a + r.overhang.area, 0), oneSup = one.reduce((a, r) => a + r.overhang.area, 0);
  // (the parts can read a little less: the check slices smaller parts more finely)
  let nearJoin = 0;
  sup.forEach(([, r]) => { const m = r.marks.support; for (let i = 0; i < m.length; i += 3) if (Math.abs(m[i] - s) < S.tf + 1) nearJoin++; });
  check(partsSup <= oneSup + 1 && !nearJoin && sup.every(([, r]) => !r.thin.length), "nothing at the join needs support or is thin: the parts need no more than the one-piece box",
    `${partsSup.toFixed(1)} vs ${oneSup.toFixed(1)} mm², all of it the openings'`);
  // the Make tab shows it; the screw size changes the holes
  $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40);
  const page = $$("#secrail button").find(b => b.dataset.title === "Split into parts");
  if (page) { page.click(); await sleep(40); }
  check(!!page && document.querySelector("#panel").textContent.includes("Made in 2 parts across its width") && /Plate 1: Box part 1/.test(document.querySelector("#panel").textContent),
    "the Make tab's Split into parts page says how it is made and what each plate holds");
  E6.splitScrew = "M4"; const m4 = MF.buildEnclosure(), m4i = MF.enclosure.split;
  check(m4i.key === "M4" && m4i.S.insert === 5.6 && m4.filter(p => p.role === "box").reduce((a, p) => a + vol(p), 0) !== sum, "M4 screws for the joins: bigger holes", `${m4i.S.insert} mm inserts, ${m4i.key} × ${m4i.screwLen}`);
  E6.splitScrew = "M3";

  // a join moves round an opening where it would have gone, and says so when it can't
  P = await buildNow({ w: 300, d: 160, h: 110, cut: [op("usba", "front", { u: 0, v: 40 }), op("rect", "back", { u: -12, v: 40, w: 10, h: 10 })] });
  const s2 = MF.enclosure.split.seams[0], tf = MF.enclosure.split.tf;
  // (the back wall's "across" runs right to left seen from the front, so its opening is at x = +12)
  check(closed(P) && !MF.enclosure.warn.length && Math.abs(s2) >= tf + 1 + 6.7 && Math.abs(s2 - 12) >= tf + 1 + 5.1, "a join keeps clear of openings where it would have gone, front and back", `moved from 0 to ${s2} mm`);
  P = await buildNow({ w: 300, d: 160, h: 110, cut: [op("vent", "front", { u: 0, v: 50, w: 220, h: 30 })] });
  check(closed(P) && !MF.enclosure.warn.length && MF.enclosure.split.n === 3, "a long vent: three parts instead of two, so no join crosses it", MF.enclosure.split.lengths.map(v => v.toFixed(1)).join(" + "));
  P = await buildNow({ w: 300, d: 160, h: 110, cut: [op("vent", "front", { u: 0, v: 50, w: 270, h: 30 })] });
  check(closed(P) && MF.enclosure.warn.some(w => /Opening 1 crosses a join/.test(w.t) && /parts 1 and 2/.test(w.s)) && MF.checks.list.some(r => /crosses a join/.test(r.t)),
    "an opening a join can't avoid is said, on the box and in the checks", MF.enclosure.warn.map(w => w.s).join(" | "));
  // on request, for a box that fits; a box long from front to back; magnets; a press-fit lid
  P = await buildNow({ w: 200, d: 120, h: 60, cut: [], split: "parts", splitParts: 3 });
  check(closed(P) && MF.enclosure.split.n === 3 && P.filter(p => p.role === "box").length === 3 && P.filter(p => p.role === "lid").length === 3, "split into three on request, though it fits",
    MF.enclosure.split.lengths.map(v => v.toFixed(1)).join(" + "));
  P = await buildNow({ w: 140, d: 300, h: 80, cut: [op("usbc", "right", { u: 30, v: 20 })] });
  check(closed(P) && MF.enclosure.split.axis === 2 && P.every(p => bnd(p).size[2] <= bed[1]) && /across its depth/.test(MF.enclosure.split.parts) && !MF.enclosure.warn.length,
    "a box long from front to back is split front to back", MF.enclosure.split.parts);
  P = await buildNow({ w: 300, d: 140, h: 80, cut: [], lid: "magnet", lidThick: 3 });
  check(closed(P) && MF.enclosure.split.pins.length === 4 && /magnets/.test(MF.enclosure.split.join) && !MF.enclosure.warn.length, "a magnet lid: magnet pockets each side of the join too");
  P = await buildNow({ w: 300, d: 140, h: 80, cut: [], lid: "press" });
  check(closed(P) && !MF.enclosure.split.pins.length && /presses in/.test(MF.enclosure.split.join), "a press-fit lid: each part of it presses in");
  // mounts (v0.33.0): ears that take a box past the bed's width split it, with the ears on the end parts within the bed;
  // a join keeps clear of the hanging tabs on the back
  P = await buildNow({ w: 240, d: 120, h: 60, cut: [], mount: "ears", earN: 2 });
  check(closed(P) && MF.enclosure.split && MF.enclosure.split.n === 2 && P.every(p => bnd(p).size[0] <= bed[0] && bnd(p).size[2] <= bed[1]) && !MF.enclosure.warn.length,
    "a 240 mm box whose ears make it 267 mm wide is split, the ears on the end parts, each part within the bed", P.filter(p => p.role === "box").map(p => bnd(p).size[0].toFixed(0)).join(" + ") + " mm with the ears");
  P = await buildNow({ w: 240, d: 250, h: 60, cut: [], mount: "ears", earN: 2 });
  check(closed(P) && MF.enclosure.split && MF.enclosure.split.axis === 0 && P.every(p => bnd(p).size[0] <= bed[0] && bnd(p).size[2] <= bed[1]) && !MF.enclosure.warn.length,
    "240 × 250 mm with ears (267 mm wide): cut across its width, the way that is too long for the bed, though its depth is longer", MF.enclosure.split && MF.enclosure.split.parts);
  P = await buildNow({ w: 300, d: 120, h: 70, cut: [], mount: "tabs", tabN: 1 });
  const sT = MF.enclosure.split && MF.enclosure.split.seams[0], tfT = MF.enclosure.split && MF.enclosure.split.tf;
  // the tab is the only thing behind the back wall (z < -60): it must lie whole in one part, away from the join
  const behind = MF.parts.filter(p => p.role === "box").map(p => { let lo = Infinity, hi = -Infinity; const Q = p.solid.pos; for (let i = 0; i < Q.length; i += 3) if (Q[i + 2] < -60.5) { lo = Math.min(lo, Q[i]); hi = Math.max(hi, Q[i]); } return [lo, hi]; });
  check(closed(P) && MF.enclosure.split && !MF.enclosure.warn.length && behind.filter(([lo]) => isFinite(lo)).length === 1 && behind.every(([lo, hi]) => !isFinite(lo) || hi < sT - tfT || lo > sT + tfT),
    "a hanging tab in the middle of the back: the join moves off it, and the tab stays whole on one part", `join at ${sT} mm; tab from ${behind.filter(([lo]) => isFinite(lo)).map(([lo, hi]) => lo.toFixed(0) + " to " + hi.toFixed(0)).join(", ")} mm`);
  // found by a sweep of random boxes: a join that can't avoid a floor grille and its label cuts the floor's first layers
  // where two of its edges cross the plane a hair apart; the cut face once came out with open edges there
  Object.assign(MF.state.printer, { bed: [220, 220, 250] });
  P = await buildNow(Object.assign({"w": 179, "d": 144, "h": 32, "lid": "screw", "radius": 4, "wall": 3, "fasten": "screw", "head": "bore", "lidThick": 3, "lipH": 6, "split": "parts", "splitParts": 4, "splitScrew": "M2.5", "feet": "recess", "board": "pi", "labelH": 4, "mount": "ears", "earN": 2}, { cut: [{"face": "front", "kind": "seg056", "u": 58, "v": 16, "rot": false, "label": "AB 12", "labelPos": "below", "top": "flat", "notch": false, "w": 50.6, "h": 19.2, "r": 0.3}, {"face": "front", "kind": "hole", "u": -25, "v": 16, "rot": false, "label": "AB 12", "labelPos": "below", "top": "flat", "notch": false, "dia": 3.4}, {"face": "bottom", "kind": "speaker", "u": -64, "v": -9, "rot": false, "label": "AB 12", "labelPos": "below", "top": "flat", "notch": false, "dia": 28, "hd": 2}, {"face": "front", "kind": "pirmini", "u": 44, "v": 18, "rot": false, "label": "", "labelPos": "below", "top": "flat", "notch": false, "dia": 10.4}] }));
  check(closed(P) && MF.enclosure.split && MF.enclosure.split.n === 4 && MF.enclosure.warn.some(w => /crosses a join/.test(w.t)), "a join forced through a floor grille and its label: every part still closed",
    P.filter(p => C.checkMesh(p.solid).open).map(p => `${p.name} ${C.checkMesh(p.solid).open}`).join(", "));
  Object.assign(MF.state.printer, { bed: bed.slice() });
  // what can't be split says why
  P = await buildNow({ w: 300, d: 140, h: 80, cut: [], lid: "slide" });
  check(!MF.enclosure.split && MF.enclosure.warn.some(w => /sliding lid is not split/.test(w.t)) && MF.checks.list.some(r => /Bigger than the print bed/.test(r.t)), "a sliding lid is not split, and says so");
  P = await buildNow({ w: 300, d: 300, h: 80, cut: [] });
  check(!MF.enclosure.split && MF.enclosure.warn.some(w => /even in parts/.test(w.t)), "too big both ways: says how deep it may be", (MF.enclosure.warn[0] || {}).s);
  P = await buildNow({ w: 300, d: 140, h: 80, cut: [], split: "off" });
  check(!MF.enclosure.split && P.length === 2 && MF.checks.list.some(r => /Bigger than the print bed/.test(r.t) && /Split into parts/.test(r.s)), "never split: one piece, and the check says it could be made in parts");
  P = await buildNow({ w: 300, d: 140, h: 80, test: true });
  check(!MF.enclosure.split && MF.enclosure.test, "the fit test is never split");
  P = await buildNow({ cut: [] });
  check(!MF.enclosure.split && P.length === 2 && P[0].name === "Box", "a box that fits the bed is still one piece");
  // project files: a hostile file is cleaned, too few parts become two, an older file splits only when it must
  const saved = JSON.parse(MF.projectPayload(false));
  saved.state.items = [];
  saved.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { split: "<img src=x onerror=alert(5)>", splitParts: 1e9, splitScrew: "__proto__", w: 121 });
  await openFile(saved, "evil-split.json", () => MF.state.base.enclosure.w === 121);
  const EH = MF.state.base.enclosure;
  check(EH.split === "bed" && EH.splitParts === 8 && EH.splitScrew === "M3" && !document.body.innerHTML.includes("onerror=alert(5)"), "hostile split settings fall back: when it's bigger than the bed, 8 parts at most, M3",
    `${EH.split}, ${EH.splitParts}, ${EH.splitScrew}`);
  saved.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { split: "parts", splitParts: -4, w: 123 });
  delete saved.state.base.enclosure.splitScrew;
  await openFile(saved, "low.json", () => MF.state.base.enclosure.w === 123);
  check(MF.state.base.enclosure.split === "parts" && MF.state.base.enclosure.splitParts === 2 && MF.state.base.enclosure.splitScrew === "M3", "too few parts become two; a missing screw size is M3");
  saved.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { w: 290 });
  ["split", "splitParts", "splitScrew"].forEach(k => delete saved.state.base.enclosure[k]);
  await openFile(saved, "old.json", () => MF.state.base.enclosure.w === 290);
  check(MF.state.base.enclosure.split === "bed" && MF.enclosure.split && MF.enclosure.split.n === 2, "a project from before splits a box only when it is bigger than the bed");
  Object.assign(MF.state.printer, keepPrinter);
}
if (process.env.ONLY === "split") (async () => { await sleep(800); await splitTests(win.MakerForge, win.MakerForge.core); finish(); })();
