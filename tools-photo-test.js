// Colour from a photo (Session 16). A football-player figure with known colours is drawn into lit,
// noisy "photos" from the front and the back (a little shifted, scaled and turned, like a real photo);
// the colour is then taken off and put back from the photos: the outline, the fit, the colours and how
// much of the surface comes back right, with and without the back photo, hidden sides and small details.
//   node tools-photo-test.js [index.html]      CORE=1 for the geometry part only
const path = require("path");
require(path.join(__dirname, "src", "core.js"));
const C = globalThis.PRCore;
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };

// ---- the figure: base, legs, body, arms, neck and head, standing on y = 0, facing +z ----
const cyl = (r, y0, y1, seg = 48) => C.revolveLoop([[0, y0], [r, y0], [r, y1], [0, y1]], seg);
const ball = (r, cy, seg = 64) => { const pr = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + i / 24 * Math.PI; pr.push([Math.cos(a) * r, cy + Math.sin(a) * r]); } pr[0][0] = 0; pr[24][0] = 0; return C.revolveLoop(pr, seg); };
const PART_NAMES = ["base", "leg", "leg", "body", "arm", "arm", "neck", "head"];
function figure() {
  const parts = [
    cyl(18, 0, 4, 64),
    C.transformSolid(cyl(4, 3, 41), 1, -6, 0, 0), C.transformSolid(cyl(4, 3, 41), 1, 6, 0, 0),
    C.revolveLoop([[0, 38], [11, 38], [12.5, 50], [13, 66], [11.5, 80], [0, 80]], 64),
    C.transformSolid(cyl(3.5, 50, 79), 1, -15.5, 0, 0), C.transformSolid(cyl(3.5, 50, 79), 1, 15.5, 0, 0),
    cyl(4, 78, 85), ball(10, 92),
  ];
  // refined to about 1 mm, as the painter does before it paints (a colour edge needs triangles to fall on)
  const partOf = []; parts.forEach((q, i) => { for (let t = 0; t < q.idx.length / 3; t++) partOf.push(i); });
  const ed = C.meshEditor(C.mergeSolids(parts)); ed.refine(1.0, 900000);
  const src = ed.source();
  return { solid: ed.solid(), partOf: Array.from(src, t => partOf[t]) };
}
const PAL = { skin: [230, 180, 140], hair: [45, 30, 20], shirt: [205, 25, 35], white: [240, 240, 240], boots: [20, 90, 200], base: [70, 80, 110] };
const NAMES = Object.keys(PAL);
// the true colour of every triangle, part by part
function truth(topo, partOf) {
  const cls = new Int8Array(topo.n);
  for (let t = 0; t < topo.n; t++) {
    const x = topo.cen[3 * t], y = topo.cen[3 * t + 1], z = topo.cen[3 * t + 2], ax = Math.abs(x), part = PART_NAMES[partOf[t]];
    let c;
    if (part === "base") c = "base";
    else if (part === "leg") c = y < 9 ? "boots" : y < 29 ? "skin" : "white";
    else if (part === "body") c = y < 50 ? "white" : (z < -6 && ax < 5 && y > 58 && y < 72 ? "white" : "shirt");   // shorts, shirt, a white number on the back
    else if (part === "arm") c = y > 67 ? "shirt" : "skin";
    else if (part === "neck") c = "skin";
    else c = (Math.hypot(ax - 3.5, y - 93) < 1.4 && z > 7) || y > 95.5 || z < -2.5 ? "hair" : "skin";   // eyes, hair
    cls[t] = NAMES.indexOf(c);
  }
  return cls;
}
// the outside of the model: triangles some camera round it can see (the joins inside other parts never print)
function outside(solid, topo) {
  const cams = Object.assign({}, C.PHOTO_CAMS), s2 = Math.SQRT1_2;
  cams.bottom = { r: [1, 0, 0], up: [0, 0, 1], c: [0, -1, 0] };
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b], i) => { cams["d" + i] = { r: [b * s2, 0, -a * s2], up: [0, 1, 0], c: [a * s2, 0, b * s2] }; });
  const out = new Uint8Array(topo.n), fit = { a: 1 / 130, tx: 0.5, ty: 0.9, rot: 0, mirror: false };
  for (const k of Object.keys(cams)) {
    C.PHOTO_CAMS["_t"] = cams[k];
    const f = k === "top" || k === "bottom" ? Object.assign({}, fit, { ty: 0.5 }) : fit, R = C.photoRaster(solid, "_t", f, 1400, 1400);
    for (const t of R.id) if (t >= 0) out[t] = 1;
  }
  delete C.PHOTO_CAMS["_t"];
  return out;
}
// a lit, noisy picture of the coloured figure, with a light grey background
function render(solid, topo, cls, cam, fit, W, H, seed) {
  const R = C.photoRaster(solid, cam, fit, W, H), rgba = new Uint8ClampedArray(W * H * 4), rnd = C.seededRandom(seed);
  const L = [0.35, 0.6, 0.72], ln = Math.hypot(...L);
  for (let i = 0; i < W * H; i++) {
    const t = R.id[i], o = 4 * i;
    let col;
    if (t < 0) { const g = 238 + (i / W / H) * 12; col = [g, g, g + 2]; }
    else {
      const nd = (topo.nrm[3 * t] * L[0] + topo.nrm[3 * t + 1] * L[1] + topo.nrm[3 * t + 2] * L[2]) / ln;
      const sh = 0.62 + 0.38 * Math.max(0, cam === "back" ? -nd * 0.3 + 0.7 : nd);
      col = PAL[NAMES[cls[t]]].map(v => v * sh);
    }
    for (let k = 0; k < 3; k++) rgba[o + k] = col[k] + (rnd() - 0.5) * 12;
    rgba[o + 3] = 255;
  }
  return { rgba, mask: R.id.map(v => v >= 0 ? 1 : 0) };
}
// how much of the surface (by area) got its true colour, each found colour counted as the truth colour it overlaps most
function score(topo, pred, cls, out) {
  const over = new Map();
  for (let t = 0; t < topo.n; t++) if (out[t]) { const k = pred[t] + "," + cls[t]; over.set(k, (over.get(k) || 0) + topo.area[t]); }
  const to = new Map();
  for (const [k, a] of over) { const [p] = k.split(","); if (!to.has(p) || to.get(p)[1] < a) to.set(p, [+k.split(",")[1], a]); }
  let good = 0, all = 0; for (let t = 0; t < topo.n; t++) if (out[t]) { all += topo.area[t]; if (to.get(String(pred[t]))[0] === cls[t]) good += topo.area[t]; }
  return good / all;
}

(async () => {
  console.log("colour from a photo: the engine");
  const fig = figure(), solid = fig.solid, topo = C.meshTopology(solid), cls = truth(topo, fig.partOf), out = outside(solid, topo);
  const shares = NAMES.map((nm, c) => { let a = 0; for (let t = 0; t < topo.n; t++) if (cls[t] === c) a += topo.area[t]; return `${nm} ${(100 * a / topo.total).toFixed(1)}%`; });
  console.log(`  a figure of ${topo.n} triangles (${out.reduce((a, b) => a + b, 0)} on the outside): ${shares.join(", ")}`);
  const W = 600, H = 800;
  const trueFront = { a: 6.3 / H, tx: 310 / H, ty: 760 / H, rot: 0.04, mirror: false }, trueBack = { a: 5.8 / H, tx: 290 / H, ty: 745 / H, rot: -0.03, mirror: false };
  const front = render(solid, topo, cls, "front", trueFront, W, H, 1), back = render(solid, topo, cls, "back", trueBack, W, H, 2);

  // 1. the figure's outline in the photo
  const m = C.photoMask(front.rgba, W, H, 35);
  let inter = 0, uni = 0; for (let i = 0; i < W * H; i++) { if (m[i] && front.mask[i]) inter++; if (m[i] || front.mask[i]) uni++; }
  check(inter / uni > 0.9, "the figure is told apart from the background (white shorts on a light background are the hard part)", `overlap ${(inter / uni * 100).toFixed(1)}%`);

  // 2. the fit
  let t0 = Date.now();
  const F = C.photoFit(solid, "front", m, W, H, "auto"), fitMs = Date.now() - t0;
  const errA = Math.abs(F.fit.a / trueFront.a - 1), errT = Math.hypot(F.fit.tx - trueFront.tx, F.fit.ty - trueFront.ty), errR = Math.abs(F.fit.rot - trueFront.rot) * 180 / Math.PI;
  check(F.iou > 0.85 && errA < 0.03 && errT < 0.012 && errR < 1.5 && !F.fit.mirror, "the photo lines up with the model by itself (size, place, turn)",
    `outlines overlap ${(F.iou * 100).toFixed(1)}%, size off ${(errA * 100).toFixed(1)}%, place off ${(errT * 100).toFixed(2)}% of the height, turn off ${errR.toFixed(2)}°, ${fitMs} ms`);
  const mirrored = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mirrored[y * W + x] = m[y * W + (W - 1 - x)];
  const Fm = C.photoFit(solid, "front", mirrored, W, H, "auto");
  check(Fm.iou > 0.85 && Math.abs(Fm.fit.a / trueFront.a - 1) < 0.03, "a mirrored photo still lines up", `overlap ${(Fm.iou * 100).toFixed(1)}%, mirrored ${Fm.fit.mirror}`);

  // 3. the colours, taken inside the lined-up model's outline (a white shirt on a white background too)
  const inF = C.photoModelMask(solid, "front", F.fit, W, H, 0), coreF = C.photoModelMask(solid, "front", F.fit, W, H, 2);
  const pal = C.photoPalette(front.rgba, coreF, W, H, 6);
  const dE = (p, q) => { const a = C.srgbToLab(...p), b = C.srgbToLab(...q); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
  const seenNames = ["skin", "hair", "shirt", "white", "boots", "base"];
  const matches = seenNames.map(nm => Math.min(...pal.map(p => dE(p.rgb, PAL[nm]))));
  check(pal.length === 6 && matches.every(d => d < 22), "the six colours are found, in light and shade, close to the real ones",
    seenNames.map((nm, i) => `${nm} ΔE ${matches[i].toFixed(0)}`).join(", "));

  // 4. colouring, front only and front + back
  const vF = C.photoView(front.rgba, W, H, solid, "front", F.fit, pal, m), clsF = vF.cls;
  const mb = C.photoMask(back.rgba, W, H, 35), Fb = C.photoFit(solid, "back", mb, W, H, "auto"), clsB = C.photoView(back.rgba, W, H, solid, "back", Fb.fit, pal, mb).cls;
  const slots = pal.map((_, i) => i);
  t0 = Date.now();
  const p1 = new Uint8Array(topo.n).fill(255), r1 = C.paintFromPhotos(solid, topo, p1, [{ cam: "front", fit: F.fit, cls: clsF }], { slots, fill: true, speck: 1 });
  const ms1 = Date.now() - t0, acc1 = score(topo, p1, cls, out);
  check(acc1 > 0.85 && r1.painted === topo.n, "from the front photo alone: most of the figure right, and every part coloured (the back from the nearest colour)",
    `${(acc1 * 100).toFixed(1)}% of the surface, ${r1.seen} of ${r1.n} triangles seen, ${ms1} ms`);
  t0 = Date.now();
  const p2 = new Uint8Array(topo.n).fill(255), r2 = C.paintFromPhotos(solid, topo, p2, [{ cam: "front", fit: F.fit, cls: clsF }, { cam: "back", fit: Fb.fit, cls: clsB }], { slots, fill: true, speck: 1 });
  const ms2 = Date.now() - t0, acc2 = score(topo, p2, cls, out);
  check(acc2 > 0.95 && acc2 > acc1, "with the back photo too: nearly all of it right", `${(acc2 * 100).toFixed(1)}% of the surface, ${r2.seen} of ${r2.n} seen, ${ms2} ms`);
  // the number on the back only shows in the back photo
  const num = []; for (let t = 0; t < topo.n; t++) { const x = topo.cen[3 * t], y = topo.cen[3 * t + 1], z = topo.cen[3 * t + 2]; if (z < -8 && Math.abs(x) < 3.5 && y > 60 && y < 70) num.push(t); }
  const whiteSlot = slots[pal.map(p => dE(p.rgb, PAL.white)).indexOf(Math.min(...pal.map(p => dE(p.rgb, PAL.white))))];
  const numF = num.filter(t => p1[t] === whiteSlot).length / num.length, numB = num.filter(t => p2[t] === whiteSlot).length / num.length;
  check(numB > 0.9 && numF < 0.5, "the white number on the back comes from the back photo, not from the front", `front only ${(numF * 100).toFixed(0)}%, with the back ${(numB * 100).toFixed(0)}%`);
  // nothing straight through: without the fill, a front photo colours nothing on the back of the head
  const backHead = []; for (let t = 0; t < topo.n; t++) if (fig.partOf[t] === 7 && topo.cen[3 * t + 2] < -3) backHead.push(t);
  const p0 = new Uint8Array(topo.n).fill(255); C.paintFromPhotos(solid, topo, p0, [{ cam: "front", fit: F.fit, cls: clsF }], { slots, fill: false, speck: 0 });
  check(backHead.every(t => p0[t] === 255), "the face does not go through to the back of the head (a depth test, not straight through)",
    `${backHead.filter(t => p0[t] !== 255).length} of ${backHead.length} back-of-head triangles coloured by the front photo`);
  if (process.env.VERBOSE) {                          // where the mistakes are, part by part
    for (const [lbl, p] of [["front", p1], ["front+back", p2]]) {
      const over = new Map(); for (let t = 0; t < topo.n; t++) if (out[t]) { const k = p[t] + "," + cls[t]; over.set(k, (over.get(k) || 0) + topo.area[t]); }
      const to = new Map(); for (const [k, a] of over) { const [q, c] = k.split(",").map(Number); if (!to.has(q) || to.get(q)[1] < a) to.set(q, [c, a]); }
      const err = {}; for (let t = 0; t < topo.n; t++) if (out[t] && to.get(p[t])[0] !== cls[t]) { const k = PART_NAMES[fig.partOf[t]] + " " + NAMES[cls[t]] + "→" + NAMES[to.get(p[t])[0]] + (p0[t] === 255 ? " (hidden)" : ""); err[k] = (err[k] || 0) + topo.area[t]; }
      console.log(`    ${lbl} mistakes: ` + Object.entries(err).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, a]) => `${k} ${a.toFixed(0)} mm²`).join(", "));
    }
  }

  // a three-quarter photo (35° round, 10° up): the angle is found too
  const q34 = { yaw: 35, pitch: 10 }, fit34 = { a: 6.0 / H, tx: 300 / H, ty: 740 / H, rot: 0.02, mirror: false };
  const three = render(solid, topo, cls, q34, fit34, W, H, 3), m3 = C.photoMask(three.rgba, W, H, 35);
  t0 = Date.now();
  const F3 = C.photoFit(solid, "front", m3, W, H, false, { yaw: 60, pitch: 20 }), ms3 = Date.now() - t0;
  check(F3 && Math.abs(F3.cam.yaw - 35) <= 5 && Math.abs(F3.cam.pitch - 10) <= 6 && F3.iou > 0.85, "a three-quarter photo: the camera angle is found as well",
    F3 && `${F3.cam.yaw}° round, ${F3.cam.pitch}° up (really 35° and 10°), outlines overlap ${(F3.iou * 100).toFixed(1)}%, ${ms3} ms`);
  const v3 = C.photoView(three.rgba, W, H, solid, F3.cam, F3.fit, pal, m3);
  const p5 = new Uint8Array(topo.n).fill(255); C.paintFromPhotos(solid, topo, p5, [v3, { cam: "back", fit: Fb.fit, cls: clsB }], { slots, fill: true, speck: 1 });
  const acc5 = score(topo, p5, cls, out);
  check(acc5 > 0.93, "coloured from the three-quarter photo and the back one", `${(acc5 * 100).toFixed(1)}% of the surface`);

  // 5. small details and specks
  const eyes = []; for (let t = 0; t < topo.n; t++) { const x = Math.abs(topo.cen[3 * t]), y = topo.cen[3 * t + 1], z = topo.cen[3 * t + 2]; if (Math.hypot(x - 3.5, y - 93) < 1.0 && z > 7.5) eyes.push(t); }
  const hairSlot = slots[pal.map(p => dE(p.rgb, PAL.hair)).indexOf(Math.min(...pal.map(p => dE(p.rgb, PAL.hair))))];
  const p3 = new Uint8Array(topo.n).fill(255); C.paintFromPhotos(solid, topo, p3, [{ cam: "front", fit: F.fit, cls: clsF }], { slots, fill: true, speck: 40 });
  const eyesKept = eyes.filter(t => p2[t] === hairSlot).length / eyes.length, eyesGone = eyes.filter(t => p3[t] === hairSlot).length / eyes.length;
  check(eyes.length > 0 && eyesKept > 0.6 && eyesGone < 0.2, "small details (the eyes) are kept with a small speck size and cleaned away with a big one",
    `${eyes.length} eye triangles: ${(eyesKept * 100).toFixed(0)}% kept at 1 mm², ${(eyesGone * 100).toFixed(0)}% at 40 mm²`);

  // 6. a denser model: time
  const ed = C.meshEditor(solid); ed.refine(0.9, 900000);
  const dense = ed.solid(), dtopo = C.meshTopology(dense);
  t0 = Date.now();
  const p4 = new Uint8Array(dtopo.n).fill(255); C.paintFromPhotos(dense, dtopo, p4, [{ cam: "front", fit: F.fit, cls: clsF }, { cam: "back", fit: Fb.fit, cls: clsB }], { slots, fill: true, speck: 1 });
  const ms4 = Date.now() - t0;
  check(ms4 < 15000, "a model of a few hundred thousand triangles colours in seconds", `${dtopo.n} triangles, ${ms4} ms`);

  if (process.env.CORE || !process.argv[2]) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
