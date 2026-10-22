// Test pictures for cutting a picture's background away (Session 34), drawn in code with known truth: what is
// the subject (mask) and what colour each subject pixel is (before its edge was blended with the background).
// Every picture is drawn 4 x 4 times finer and averaged, so its edges are smooth like a real logo or photo, and
// gets a little noise like a JPEG.
//   const P = require("./tools-cutout-pictures.js")(PRCore); P.all() → [{ name, rgba, W, H, mask, kind, holes }]
module.exports = function (C) {
  const SS = 4;
  // a picture from a function giving each point's colour ([r, g, b]) and whether it is the subject
  function draw(W, H, at, o) {
    o = o || {};
    const rgba = new Uint8ClampedArray(W * H * 4), mask = new Uint8Array(W * H), cover = new Float32Array(W * H), rnd = C.seededRandom(o.seed || 5);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, on = 0;
      for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
        const p = at(x + (i + 0.5) / SS, y + (j + 0.5) / SS);
        r += p[0]; g += p[1]; b += p[2]; if (p[3]) on++;
      }
      const n = SS * SS, k = y * W + x, nz = o.noise == null ? 4 : o.noise;
      rgba[4 * k] = r / n + (rnd() - 0.5) * nz; rgba[4 * k + 1] = g / n + (rnd() - 0.5) * nz; rgba[4 * k + 2] = b / n + (rnd() - 0.5) * nz; rgba[4 * k + 3] = 255;
      mask[k] = on * 2 > n ? 1 : 0; cover[k] = on / n;
    }
    return { rgba, W, H, mask, cover };
  }
  const ring = (x, y, cx, cy, r0, r1) => { const d = Math.hypot(x - cx, y - cy); return d >= r0 && d <= r1; };
  const box = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  // block letters on a 5 x 7 grid, enough for the test words
  const GLYPH = {
    S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"], T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"], R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"], K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"], D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"], B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"], " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"]
  };
  function word(x, y, text, x0, y0, cell) {
    const cx = Math.floor((x - x0) / cell), cy = Math.floor((y - y0) / cell);
    if (cy < 0 || cy >= 7 || cx < 0) return false;
    const ch = Math.floor(cx / 6), col = cx % 6; if (ch >= text.length || col === 5) return false;
    return (GLYPH[text[ch]] || GLYPH[" "])[cy][col] === "1";
  }
  // the owner's case (v0.28.1): a white S and a name on a plain green square, the whole picture green to its edges
  function logoOnGreen() {
    const W = 520, H = 520, G = [40, 122, 62], Wh = [250, 250, 248];
    const p = draw(W, H, (x, y) => {
      // an S of two thick open rings, the top one open to the right, the bottom one to the left
      const top = ring(x, y, 260, 170, 52, 92) && !(x > 260 && y > 140 && y < 205), bot = ring(x, y, 260, 300, 52, 92) && !(x < 260 && y > 265 && y < 330);
      const s = (top && !(y > 170 && x < 260 && false)) || bot;
      const t = word(x, y, "STORA SKONDAL", 50, 425, 6.2);
      return s || t ? [...Wh, 1] : [...G, 0];
    });
    return Object.assign(p, { name: "logo on green", kind: "graphic", holes: true, bg: G });
  }
  // a badge: the same green square with a white margin round it (the green is part of the design)
  function badgeOnWhite() {
    const W = 520, H = 520, G = [40, 122, 62], Wh = [252, 252, 252];
    const p = draw(W, H, (x, y) => {
      const inSq = box(x, y, 60, 60, 460, 460), s = ring(x, y, 260, 200, 50, 90) && !(x > 260 && y > 170 && y < 235);
      const t = word(x, y, "SKONDAL", 135, 345, 7);
      if (!inSq) return [...Wh, 0];
      return s || t ? [...Wh, 1] : [...G, 1];
    });
    return Object.assign(p, { name: "badge on white", kind: "graphic", holes: true, bg: Wh });
  }
  // black lettering on white paper, its O, A, R, B and D with holes to come out clear
  function textOnWhite() {
    const W = 600, H = 200, K = [20, 20, 24], Wh = [255, 255, 255];
    const p = draw(W, H, (x, y) => word(x, y, "BOARD ROSA", 30, 55, 9.5) ? [...K, 1] : [...Wh, 0], { noise: 6 });
    return Object.assign(p, { name: "text on white", kind: "graphic", holes: true, bg: Wh });
  }
  // a coloured logo on a light grey background: a red ring with a blue dot and a gold bar
  function ringLogo() {
    const W = 400, H = 400, Bg = [230, 232, 236];
    const p = draw(W, H, (x, y) => {
      if (ring(x, y, 200, 180, 0, 40)) return [30, 70, 200, 1];
      if (ring(x, y, 200, 180, 90, 130)) return [205, 30, 40, 1];
      if (box(x, y, 90, 330, 310, 360)) return [220, 170, 40, 1];
      return [...Bg, 0];
    });
    return Object.assign(p, { name: "ring logo on grey", kind: "graphic", holes: true, bg: Bg });
  }
  // a sticker-like drawing: a black outline with a white face inside, on white (the white inside is the subject)
  function cartoonOnWhite() {
    const W = 400, H = 400, Wh = [255, 255, 255];
    const p = draw(W, H, (x, y) => {
      const d = Math.hypot(x - 200, y - 200);
      if (d > 150) return [...Wh, 0];
      if (d > 138) return [15, 15, 15, 1];
      if (ring(x, y, 150, 170, 0, 16) || ring(x, y, 250, 170, 0, 16)) return [15, 15, 15, 1];
      if (ring(x, y, 200, 225, 55, 66) && y > 225) return [200, 40, 40, 1];
      return [...Wh, 1];
    });
    return Object.assign(p, { name: "cartoon on white", kind: "graphic", holes: false, bg: Wh });
  }
  // a photo-like picture: a shaded ball and a box on a table lit from the left (the table brighter to the left)
  function photoOnTable() {
    const W = 480, H = 360;
    const p = draw(W, H, (x, y) => {
      const bgc = 200 - x * 0.08 + y * 0.03, bg = [bgc + 8, bgc, bgc - 10, 0];
      const dx = x - 170, dy = y - 170, d = Math.hypot(dx, dy);
      if (d < 90) { const z = Math.sqrt(Math.max(0, 1 - (d / 90) ** 2)), sh = 0.35 + 0.65 * Math.max(0, (-dx * 0.5 - dy * 0.4) / 90 + z * 0.6); return [210 * sh + 20, 60 * sh + 10, 40 * sh + 10, 1]; }
      if (box(x, y, 300, 150, 420, 270)) { const sh = 0.7 + 0.3 * (420 - x) / 120; return [60 * sh, 110 * sh, 170 * sh, 1]; }
      // a soft shadow on the table to the right of the ball
      const sd = Math.hypot(x - 215, (y - 255) * 2.4); if (sd < 90) { const k = 0.82 + 0.18 * sd / 90; return [bg[0] * k, bg[1] * k, bg[2] * k, 0]; }
      return bg;
    }, { noise: 10, seed: 9 });
    return Object.assign(p, { name: "photo on a table", kind: "photo", holes: false });
  }
  // a busy picture: coloured blobs everywhere (no plain background, so the colours must not be used)
  function busyPhoto() {
    const W = 400, H = 300, rnd = C.seededRandom(21), blobs = Array.from({ length: 40 }, () => [rnd() * W, rnd() * H, 15 + rnd() * 60, [rnd() * 255, rnd() * 255, rnd() * 255]]);
    const p = draw(W, H, (x, y) => {
      for (const [bx, by, br, c] of blobs) if (Math.hypot(x - bx, y - by) < br) return [...c, 0];
      return [90 + 0.2 * x, 120, 80 + 0.3 * y, 0];
    }, { noise: 12 });
    return Object.assign(p, { name: "busy picture", kind: "photo", holes: false });
  }
  function all() { return [logoOnGreen(), badgeOnWhite(), textOnWhite(), ringLogo(), cartoonOnWhite(), photoOnTable(), busyPhoto()]; }
  // how well a cut-out matches the truth: the overlap with the subject (alpha over half against more than half
  // covered), the pixels kept that should not be and missing that should be, and how far the see-through edge is
  // from the truth: the mean difference between alpha and how much of each edge pixel the subject covers
  function score(p, rgba) {
    let tp = 0, fp = 0, fn = 0, ed = 0, en = 0;
    for (let i = 0; i < p.W * p.H; i++) {
      const on = rgba[4 * i + 3] > 127, t = p.mask[i]; if (on && t) tp++; else if (on) fp++; else if (t) fn++;
      if (p.cover[i] > 0 && p.cover[i] < 1) { ed += Math.abs(rgba[4 * i + 3] / 255 - p.cover[i]); en++; }
    }
    return { iou: tp / Math.max(1, tp + fp + fn), extra: fp, missing: fn, edge: en ? ed / en : 0 };
  }
  return { all, score, logoOnGreen, badgeOnWhite, textOnWhite, ringLogo, cartoonOnWhite, photoOnTable, busyPhoto };
};
