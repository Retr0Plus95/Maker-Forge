// The test figure for colour from a photo (Session 16): a footballer on a round base, with known colours,
// and a renderer that draws it into lit, noisy "photos". Used by tools-photo-test.js and by
// tools-browser-check.js.   const F = require("./tools-photo-figure.js")(PRCore);
module.exports = C => {
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
    const raw = C.mergeSolids(parts), ed = C.meshEditor(raw); ed.refine(1.0, 900000);
    const src = ed.source();
    return { solid: ed.solid(), partOf: Array.from(src, t => partOf[t]), raw };
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

  // the same photo on a busy background (Session 17): a wall with coloured circles, one red behind the
  // head and one pink behind the shorts, over a wooden desk; the figure itself is left as it was
  function onBusyBackground(img, W, H, seed) {
    const rnd = C.seededRandom(seed || 7), rgba = new Uint8ClampedArray(img.rgba);
    const blobs = Array.from({ length: 14 }, () => [rnd() * W, rnd() * H, 30 + rnd() * 120, [rnd() * 255, rnd() * 255, rnd() * 255]]);
    const desk = Math.round(H * 0.775);
    for (let i = 0; i < W * H; i++) {
      if (img.mask[i]) continue;
      const x = i % W, y = (i - x) / W;
      let col = y > desk ? [150 + 30 * Math.sin(x / 9), 100 + 20 * Math.sin(x / 9), 60] : [200 - y * 0.1, 190 - y * 0.08, 170];
      for (const [bx, by, br, bc] of blobs) if (y < desk && Math.hypot(x - bx, y - by) < br) { col = bc; break; }
      for (let k = 0; k < 3; k++) rgba[4 * i + k] = col[k] + (rnd() - 0.5) * 10;
    }
    return { rgba, mask: img.mask };
  }
  // a more everyday busy background: a bookshelf of coloured books behind the figure, standing on a desk
  function onShelfBackground(img, W, H, seed) {
    const rnd = C.seededRandom(seed || 11), rgba = new Uint8ClampedArray(img.rgba), desk = Math.round(H * 0.8), books = [];
    for (let row = 0; row < 3; row++) {
      const y1 = Math.round(H * (0.26 + 0.27 * row)), y0 = y1 - Math.round(H * (0.14 + rnd() * 0.06));
      for (let x = 0; x < W;) { const w = 14 + Math.round(rnd() * 26), top = y0 + Math.round(rnd() * H * 0.05); books.push([x, x + w - 2, top, y1, [40 + rnd() * 200, 40 + rnd() * 200, 40 + rnd() * 200]]); x += w; }
    }
    for (let i = 0; i < W * H; i++) {
      if (img.mask[i]) continue;
      const x = i % W, y = (i - x) / W;
      let col = y > desk ? [160 + 25 * Math.sin(x / 7 + y / 40), 110 + 18 * Math.sin(x / 7 + y / 40), 70] : [120, 90, 60];   // desk, shelf wood
      if (y <= desk) for (const [a, b, t, bt, c] of books) if (x >= a && x <= b && y >= t && y <= bt) { const sh = 0.8 + 0.2 * Math.cos((x - a) / (b - a + 1) * Math.PI - Math.PI / 2); col = c.map(v => v * sh); break; }
      for (let k = 0; k < 3; k++) rgba[4 * i + k] = col[k] + (rnd() - 0.5) * 10;
    }
    return { rgba, mask: img.mask };
  }
  return { PART_NAMES, PAL, NAMES, figure, truth, outside, render, score, onBusyBackground, onShelfBackground };
};
