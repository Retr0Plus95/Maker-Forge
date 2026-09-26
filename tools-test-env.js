/*
 * Headless test environment for Maker Forge.
 *   const boot = require("./tools-test-env.js");
 *   const { window, errors } = boot("index.html");
 *
 * - CDN <script> tags are replaced by the matching files from node_modules
 *   (npm i jsdom three@0.128.0 earcut@2.2.4 jszip@3.10.1).
 * - A software 2D canvas: paths (lines, arcs, curves), fill (nonzero / evenodd), stroke,
 *   affine transforms, drawImage (box-filtered downscaling and bilinear upscaling like a browser;
 *   nearest neighbour when imageSmoothingEnabled is false), get/putImageData,
 *   source-over and destination-out compositing, box glyphs for fillText, real PNG encode/decode
 *   for toDataURL / Image. ctx.filter is ignored. Hard edges: no anti-aliasing.
 *   ctx._ensure() allocates the pixel buffer; ctx.data is the live RGBA buffer.
 * - WebGLRenderer is replaced by a no-op renderer; ResizeObserver, matchMedia,
 *   document.fonts and URL.createObjectURL are stubbed.
 */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const { JSDOM, VirtualConsole } = require("jsdom");

const NM = path.join(__dirname, "node_modules");
const LIBS = [
  [/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"],
  [/three@[\d.]+\/examples\/js\/controls\/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"],
  [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"],
];

/* ---------------- PNG ---------------- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length), t = Buffer.from(type, "ascii");
  out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length); return out;
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let p = 8, w, h, depth, type, inter, plte = null, trns = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), t = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; type = d[9]; inter = d[12]; }
    else if (t === "PLTE") plte = d; else if (t === "tRNS") trns = d; else if (t === "IDAT") idat.push(d);
    p += 12 + len;
  }
  if (depth !== 8 || inter) throw new Error("PNG: only 8-bit non-interlaced images are supported by the test stub");
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], bpr = w * ch, raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(bpr * h), out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (bpr + 1)], src = y * (bpr + 1) + 1, row = y * bpr;
    for (let i = 0; i < bpr; i++) {
      const a = i >= ch ? px[row + i - ch] : 0, b = y ? px[row - bpr + i] : 0, c = i >= ch && y ? px[row - bpr + i - ch] : 0;
      let v = raw[src + i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + i] = v & 255;
    }
  }
  for (let i = 0; i < w * h; i++) {
    const o = i * 4, s = i * ch;
    if (type === 6) { out[o] = px[s]; out[o + 1] = px[s + 1]; out[o + 2] = px[s + 2]; out[o + 3] = px[s + 3]; }
    else if (type === 2) { out[o] = px[s]; out[o + 1] = px[s + 1]; out[o + 2] = px[s + 2]; out[o + 3] = 255; }
    else if (type === 0) { out[o] = out[o + 1] = out[o + 2] = px[s]; out[o + 3] = 255; }
    else if (type === 4) { out[o] = out[o + 1] = out[o + 2] = px[s]; out[o + 3] = px[s + 1]; }
    else { const k = px[s]; out[o] = plte[k * 3]; out[o + 1] = plte[k * 3 + 1]; out[o + 2] = plte[k * 3 + 2]; out[o + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { width: w, height: h, data: out };
}

/* ---------------- colours ---------------- */
const NAMED = { black: "#000000", white: "#ffffff", red: "#ff0000", green: "#008000", blue: "#0000ff", gray: "#808080", grey: "#808080", transparent: "#00000000" };
function parseColor(s) {
  if (s && typeof s === "object" && s._color) return s._color;
  s = String(s || "#000").trim().toLowerCase(); if (NAMED[s]) s = NAMED[s];
  let m;
  if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1]; if (h.length <= 4) h = [...h].map(c => c + c).join("");
    const n = [0, 2, 4, 6].map(i => i < h.length ? parseInt(h.slice(i, i + 2), 16) : 255); n[3] /= 255; return n;
  }
  if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map(x => x.endsWith("%") ? parseFloat(x) * 2.55 : parseFloat(x));
    return [v[0], v[1], v[2], v.length > 3 ? (m[1].includes("%") && String(v[3]).includes("%") ? v[3] / 255 : v[3]) : 1];
  }
  return [0, 0, 0, 1];
}

/* ---------------- 2D context ---------------- */
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const inv = m => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const STATE_KEYS = ["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha", "globalCompositeOperation", "font", "textAlign", "textBaseline", "letterSpacing", "filter", "imageSmoothingEnabled", "imageSmoothingQuality"];

class Ctx2D {
  constructor(canvas) {
    this.canvas = canvas; this.data = null; this._w = 0; this._h = 0;
    this.fillStyle = "#000000"; this.strokeStyle = "#000000"; this.lineWidth = 1; this.lineCap = "butt"; this.lineJoin = "miter";
    this.globalAlpha = 1; this.globalCompositeOperation = "source-over"; this.font = "10px sans-serif";
    this.textAlign = "start"; this.textBaseline = "alphabetic"; this.letterSpacing = "0px"; this.filter = "none";
    this.imageSmoothingEnabled = true; this.imageSmoothingQuality = "low";
    this._m = [1, 0, 0, 1, 0, 0]; this._stack = []; this._paths = []; this._cur = null;
  }
  _ensure() {
    const w = Math.max(0, this.canvas.width | 0), h = Math.max(0, this.canvas.height | 0);
    if (!this.data || w !== this._w || h !== this._h) { this._w = w; this._h = h; this.data = new Uint8ClampedArray(w * h * 4); this._m = [1, 0, 0, 1, 0, 0]; }
    return this.data;
  }
  _reset() { this.data = null; this._ensure(); }
  // state and transforms
  save() { const s = { m: this._m.slice() }; for (const k of STATE_KEYS) s[k] = this[k]; this._stack.push(s); }
  restore() { const s = this._stack.pop(); if (!s) return; this._m = s.m; for (const k of STATE_KEYS) this[k] = s[k]; }
  transform(a, b, c, d, e, f) { this._m = mul(this._m, [a, b, c, d, e, f]); }
  setTransform(a, b, c, d, e, f) { if (a && typeof a === "object") ({ a, b, c, d, e, f } = a); this._m = [a, b, c, d, e, f]; }
  resetTransform() { this._m = [1, 0, 0, 1, 0, 0]; }
  getTransform() { const [a, b, c, d, e, f] = this._m; return { a, b, c, d, e, f, is2D: true }; }
  translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
  scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
  rotate(t) { const c = Math.cos(t), s = Math.sin(t); this.transform(c, s, -s, c, 0, 0); }
  // paths (points stored in device space)
  beginPath() { this._paths = []; this._cur = null; }
  moveTo(x, y) { this._cur = [ap(this._m, x, y)]; this._paths.push(this._cur); }
  lineTo(x, y) { if (!this._cur) return this.moveTo(x, y); this._cur.push(ap(this._m, x, y)); }
  closePath() { if (this._cur && this._cur.length) { const p = this._cur[0]; this._cur.closed = true; this._cur = [p.slice()]; this._paths.push(this._cur); } }
  _last() { if (!this._cur || !this._cur.length) return null; return ap(inv(this._m), ...this._cur[this._cur.length - 1]); }
  rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
  roundRect(x, y, w, h) { this.rect(x, y, w, h); }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
    let sweep = a1 - a0; const TAU = Math.PI * 2;
    if (!ccw && sweep >= TAU) sweep = TAU; else if (ccw && -sweep >= TAU) sweep = -TAU;
    else { if (!ccw) { sweep = ((sweep % TAU) + TAU) % TAU; } else { sweep = -((((-sweep) % TAU) + TAU) % TAU); } }
    const n = Math.max(8, Math.ceil(Math.abs(sweep) / TAU * 96 * Math.max(1, Math.sqrt(Math.max(rx, ry) / 20))));
    const cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    for (let i = 0; i <= n; i++) {
      const t = a0 + sweep * i / n, ex = Math.cos(t) * rx, ey = Math.sin(t) * ry, px = x + ex * cr - ey * sr, py = y + ex * sr + ey * cr;
      if (i === 0 && this._cur) this.lineTo(px, py); else if (i === 0) this.moveTo(px, py); else this.lineTo(px, py);
    }
  }
  arc(x, y, r, a0, a1, ccw) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
  quadraticCurveTo(cx, cy, x, y) { const p = this._last() || [cx, cy]; for (let i = 1; i <= 16; i++) { const t = i / 16, u = 1 - t; this.lineTo(u * u * p[0] + 2 * u * t * cx + t * t * x, u * u * p[1] + 2 * u * t * cy + t * t * y); } }
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { const p = this._last() || [c1x, c1y]; for (let i = 1; i <= 24; i++) { const t = i / 24, u = 1 - t; this.lineTo(u * u * u * p[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x, u * u * u * p[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y); } }
  arcTo(x1, y1, x2, y2) { this.lineTo(x1, y1); this.lineTo(x2, y2); }
  clip() {} isPointInPath() { return false; }
  // rasterising: coverage mask at pixel centres
  _cover(polys, rule) {
    const w = this._w, h = this._h, m = new Uint8Array(w * h), edges = [];
    for (const pl of polys) { const n = pl.length; if (n < 2) continue; for (let i = 0; i < n; i++) { const a = pl[i], b = pl[(i + 1) % n]; if (a[1] !== b[1]) edges.push(a[1] < b[1] ? [a[0], a[1], b[0], b[1], 1] : [b[0], b[1], a[0], a[1], -1]); } }
    if (!edges.length) return m;
    let y0 = h, y1 = -1; for (const e of edges) { y0 = Math.min(y0, Math.floor(e[1])); y1 = Math.max(y1, Math.ceil(e[3])); }
    y0 = Math.max(0, y0); y1 = Math.min(h - 1, y1);
    for (let y = y0; y <= y1; y++) {
      const yc = y + 0.5, xs = [];
      for (const e of edges) if (yc >= e[1] && yc < e[3]) xs.push([e[0] + (yc - e[1]) / (e[3] - e[1]) * (e[2] - e[0]), e[4]]);
      if (!xs.length) continue; xs.sort((a, b) => a[0] - b[0]);
      let wn = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        wn = rule === "evenodd" ? wn ^ 1 : wn + xs[i][1];
        if (wn === 0) continue;
        const xa = Math.max(0, Math.ceil(xs[i][0] - 0.5)), xb = Math.min(w - 1, Math.ceil(xs[i + 1][0] - 0.5) - 1);
        for (let x = xa; x <= xb; x++) m[y * w + x] = 1;
      }
    }
    return m;
  }
  _paint(mask, color) {
    const d = this._ensure(), c = parseColor(color), a = c[3] * this.globalAlpha;
    const out = this.globalCompositeOperation === "destination-out", copy = this.globalCompositeOperation === "copy";
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) { if (copy) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = d[i * 4 + 3] = 0; } continue; }
      const o = i * 4;
      if (out) { d[o + 3] = d[o + 3] * (1 - a); continue; }
      if (copy || a >= 1) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a * 255; continue; }
      const da = d[o + 3] / 255, oa = a + da * (1 - a); if (oa <= 0) continue;
      for (let k = 0; k < 3; k++) d[o + k] = (c[k] * a + d[o + k] * da * (1 - a)) / oa;
      d[o + 3] = oa * 255;
    }
  }
  _polys() { return this._paths.filter(p => p.length > 1); }
  fill(a, b) { this._ensure(); const rule = typeof a === "string" ? a : b; this._paint(this._cover(this._polys(), rule || "nonzero"), this.fillStyle); }
  stroke() {
    this._ensure();
    // each segment is a band of half-width r with a round cap at its end, rasterised only inside
    // its own bounding box (a full-canvas mask per segment made long paths take minutes)
    const sc = Math.sqrt(Math.abs(this._m[0] * this._m[3] - this._m[1] * this._m[2])) || 1, r = Math.max(0.5, this.lineWidth * sc / 2);
    const w = this._w, h = this._h, mask = new Uint8Array(w * h), r2 = r * r;
    for (const p of this._polys()) {
      const pts = p.closed ? p.concat([p[0]]) : p;
      for (let i = 0; i + 1 < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1)), x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + r + 1));
        const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1)), y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + r + 1));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5 - ax, py = y + 0.5 - ay, t = L2 > 0 ? (px * dx + py * dy) / L2 : 1;
          let on = false;
          if (t >= 0 && t <= 1) { const c = px * dy - py * dx; on = c * c <= r2 * L2; }
          if (!on) { const ex = x + 0.5 - bx, ey = y + 0.5 - by; on = ex * ex + ey * ey <= r2; }
          if (on) mask[y * w + x] = 1;
        }
      }
    }
    this._paint(mask, this.strokeStyle);
  }
  _rectPoly(x, y, w, h) { return [ap(this._m, x, y), ap(this._m, x + w, y), ap(this._m, x + w, y + h), ap(this._m, x, y + h)]; }
  fillRect(x, y, w, h) { this._ensure(); this._paint(this._cover([this._rectPoly(x, y, w, h)], "nonzero"), this.fillStyle); }
  strokeRect(x, y, w, h) { const p = this._paths, c = this._cur; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this._paths = p; this._cur = c; }
  clearRect(x, y, w, h) {
    this._ensure(); const m = this._cover([this._rectPoly(x, y, w, h)], "nonzero"), d = this.data;
    for (let i = 0; i < m.length; i++) if (m[i]) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = d[i * 4 + 3] = 0;
  }
  // text: every non-space character is a box 0.6em wide, cap height 0.72em
  _fontPx() { const m = String(this.font).match(/([\d.]+)px/); return m ? parseFloat(m[1]) : 10; }
  _spacing() { const m = String(this.letterSpacing || "0").match(/-?[\d.]+/); return m ? parseFloat(m[0]) : 0; }
  measureText(t) {
    const s = this._fontPx(), n = [...String(t)].length, w = n * s * 0.6 + Math.max(0, n) * this._spacing();
    const al = this.textAlign, left = al === "center" ? w / 2 : al === "right" || al === "end" ? w : 0;
    return { width: w, actualBoundingBoxLeft: left, actualBoundingBoxRight: w - left, actualBoundingBoxAscent: s * 0.72, actualBoundingBoxDescent: 0,
      fontBoundingBoxAscent: s * 0.9, fontBoundingBoxDescent: s * 0.25 };
  }
  fillText(t, x, y) {
    this._ensure(); const s = this._fontPx(), m = this.measureText(t), sp = this._spacing();
    let x0 = x - m.actualBoundingBoxLeft;
    const bl = this.textBaseline, top = bl === "top" || bl === "hanging" ? y : bl === "middle" ? y - s * 0.36 : bl === "bottom" || bl === "ideographic" ? y - s * 0.72 : y - s * 0.72;
    const polys = [];
    for (const ch of String(t)) { if (ch.trim()) polys.push(this._rectPoly(x0 + s * 0.06, top, s * 0.48, s * 0.72)); x0 += s * 0.6 + sp; }
    this._paint(this._cover(polys, "nonzero"), this.fillStyle);
  }
  strokeText(t, x, y) { const f = this.fillStyle; this.fillStyle = this.strokeStyle; this.fillText(t, x, y); this.fillStyle = f; }
  createLinearGradient() { return { _color: null, addColorStop(o, c) { if (!this._color) this._color = parseColor(c); } }; }
  createRadialGradient() { return this.createLinearGradient(); }
  createPattern() { return "#808080"; }
  // pixels
  createImageData(w, h) { if (w && typeof w === "object") ({ width: w, height: h } = w); return new StubImageData(new Uint8ClampedArray(w * h * 4), w, h); }
  getImageData(x, y, w, h) {
    const d = this._ensure(), out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) { const sy = y + j; if (sy < 0 || sy >= this._h) continue;
      for (let i = 0; i < w; i++) { const sx = x + i; if (sx < 0 || sx >= this._w) continue; const s = (sy * this._w + sx) * 4, o = (j * w + i) * 4; out[o] = d[s]; out[o + 1] = d[s + 1]; out[o + 2] = d[s + 2]; out[o + 3] = d[s + 3]; } }
    return new StubImageData(out, w, h);
  }
  putImageData(img, x, y) {
    const d = this._ensure(), s = img.data, w = img.width, h = img.height; x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) { const dy = y + j; if (dy < 0 || dy >= this._h) continue;
      for (let i = 0; i < w; i++) { const dx = x + i; if (dx < 0 || dx >= this._w) continue; const o = (dy * this._w + dx) * 4, k = (j * w + i) * 4; d[o] = s[k]; d[o + 1] = s[k + 1]; d[o + 2] = s[k + 2]; d[o + 3] = s[k + 3]; } }
  }
  drawImage(img, ...a) {
    const src = pixelsOf(img); if (!src) return;
    let sx = 0, sy = 0, sw = src.width, sh = src.height, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; } else if (a.length === 4) { [dx, dy, dw, dh] = a; } else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    if (!dw || !dh || !sw || !sh) return;
    const d = this._ensure(), poly = this._rectPoly(dx, dy, dw, dh), cov = this._cover([poly], "nonzero"), im = inv(this._m);
    const out = this.globalCompositeOperation === "destination-out", ga = this.globalAlpha, S = src.data, SW = src.width, SH = src.height;
    // like a browser: with smoothing on, downscaling averages the source area under each pixel
    // (box filter, premultiplied alpha) and upscaling is bilinear; smoothing off is nearest neighbour
    const kx = sw / dw * Math.hypot(im[0], im[1]), ky = sh / dh * Math.hypot(im[2], im[3]);
    const smooth = this.imageSmoothingEnabled !== false, nx = smooth ? Math.min(8, Math.max(1, Math.ceil(kx * 2 - 0.001))) : 1, ny = smooth ? Math.min(8, Math.max(1, Math.ceil(ky * 2 - 0.001))) : 1;
    const up = smooth && kx < 1 && ky < 1, px4 = [0, 0, 0, 0];
    const tap = (fx, fy, wt) => {                     // premultiplied sample at source coords (pixel units)
      if (up) {
        const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5), tx = fx - 0.5 - x0, ty = fy - 0.5 - y0;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
          const X = Math.min(SW - 1, Math.max(0, x0 + i)), Y = Math.min(SH - 1, Math.max(0, y0 + j)), q = (Y * SW + X) * 4;
          const w2 = wt * (i ? tx : 1 - tx) * (j ? ty : 1 - ty), al = S[q + 3] / 255;
          px4[0] += S[q] * al * w2; px4[1] += S[q + 1] * al * w2; px4[2] += S[q + 2] * al * w2; px4[3] += al * w2;
        }
        return;
      }
      const X = Math.floor(fx), Y = Math.floor(fy);
      if (X < 0 || Y < 0 || X >= SW || Y >= SH) return;
      const q = (Y * SW + X) * 4, al = S[q + 3] / 255;
      px4[0] += S[q] * al * wt; px4[1] += S[q + 1] * al * wt; px4[2] += S[q + 2] * al * wt; px4[3] += al * wt;
    };
    for (let i = 0; i < cov.length; i++) {
      if (!cov[i]) continue;
      const px = i % this._w, py = (i / this._w) | 0;
      px4[0] = px4[1] = px4[2] = px4[3] = 0;
      const wt = 1 / (nx * ny);
      for (let b = 0; b < ny; b++) for (let c = 0; c < nx; c++) {
        const [ux, uy] = ap(im, px + (c + 0.5) / nx, py + (b + 0.5) / ny);
        tap(sx + (ux - dx) / dw * sw, sy + (uy - dy) / dh * sh, wt);
      }
      const o = i * 4, a2 = px4[3] * ga;
      if (out) { d[o + 3] *= 1 - a2; continue; }
      if (a2 <= 0) continue;
      const cr = px4[0] / px4[3], cg = px4[1] / px4[3], cb = px4[2] / px4[3];
      if (a2 >= 0.999) { d[o] = cr; d[o + 1] = cg; d[o + 2] = cb; d[o + 3] = 255; continue; }
      const da = d[o + 3] / 255, oa = a2 + da * (1 - a2);
      d[o] = (cr * a2 + d[o] * da * (1 - a2)) / oa; d[o + 1] = (cg * a2 + d[o + 1] * da * (1 - a2)) / oa; d[o + 2] = (cb * a2 + d[o + 2] * da * (1 - a2)) / oa;
      d[o + 3] = oa * 255;
    }
  }
}
class StubImageData { constructor(data, w, h) { if (typeof data === "number") { h = w; w = data; data = new Uint8ClampedArray(w * h * 4); } this.data = data; this.width = w; this.height = h; } }
function pixelsOf(img) {
  if (!img) return null;
  if (img._px) return img._px;                                   // decoded <img>
  if (img.data && img.width) return img;                         // ImageData
  if (img.getContext) { const c = img.getContext("2d"); c._ensure(); return { width: c._w, height: c._h, data: c.data }; }
  return null;
}

/* ---------------- boot ---------------- */
function boot(file, opts = {}) {
  let html = fs.readFileSync(path.resolve(file), "utf8");
  html = html.replace(/<script\s+src="([^"]+)"[^>]*><\/script>/g, (tag, url) => {
    const lib = LIBS.find(([re]) => re.test(url));
    if (!lib) return tag;
    let code = fs.readFileSync(path.join(NM, lib[1]), "utf8").replace(/<\/script/gi, "<\\/script");
    if (/three\.min\.js/.test(lib[1])) code += "\n;THREE.WebGLRenderer = window.__StubRenderer;";
    return "<script>" + code + "</script>";
  });
  const errors = [], vc = new VirtualConsole();
  vc.on("jsdomError", e => errors.push(String(e && (e.stack || e.message) || e)));
  vc.on("error", (...a) => errors.push(a.map(String).join(" ")));
  if (opts.log) vc.on("log", (...a) => console.log("[page]", ...a));
  vc.on("warn", () => {});
  const blobs = new Map(); let blobN = 0;
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://localhost/", virtualConsole: vc,
    beforeParse(win) {
      win.addEventListener("error", e => errors.push(String(e.error && e.error.stack || e.message)));
      win.addEventListener("unhandledrejection", e => errors.push("unhandled rejection: " + String(e.reason && e.reason.stack || e.reason)));
      const CP = win.HTMLCanvasElement.prototype;
      const wdesc = Object.getOwnPropertyDescriptor(CP, "width"), hdesc = Object.getOwnPropertyDescriptor(CP, "height");
      Object.defineProperty(CP, "width", { get() { return wdesc.get.call(this); }, set(v) { wdesc.set.call(this, v); if (this.__ctx) this.__ctx._reset(); }, configurable: true });
      Object.defineProperty(CP, "height", { get() { return hdesc.get.call(this); }, set(v) { hdesc.set.call(this, v); if (this.__ctx) this.__ctx._reset(); }, configurable: true });
      CP.getContext = function (type) { if (type !== "2d") return null; if (!this.__ctx) { this.__ctx = new Ctx2D(this); this.__ctx._ensure(); } return this.__ctx; };
      const png = cv => { const c = cv.getContext("2d"); c._ensure(); return encodePNG(c._w || 1, c._h || 1, c._w ? c.data : new Uint8ClampedArray(4)); };
      CP.toDataURL = function () { return "data:image/png;base64," + png(this).toString("base64"); };
      CP.toBlob = function (cb, type) { const b = new win.Blob([png(this)], { type: type || "image/png" }); setTimeout(() => cb(b), 0); };
      win.ImageData = StubImageData;
      // <img>: decode PNG data URLs and blob URLs made from PNG bytes
      const IP = win.HTMLImageElement.prototype, sdesc = Object.getOwnPropertyDescriptor(IP, "src");
      Object.defineProperty(IP, "src", { get() { return sdesc.get.call(this); }, configurable: true, set(v) {
        sdesc.set.call(this, v); const img = this;
        const done = (err, bytes) => setTimeout(() => {
          try { if (err) throw err; img._px = decodePNG(bytes); img._w = img._px.width; img._h = img._px.height; img.dispatchEvent(new win.Event("load")); }
          catch (e) { img.dispatchEvent(new win.Event("error")); }
        }, 0);
        const s = String(v);
        if (s.startsWith("data:")) { const m = s.match(/^data:[^;,]*;base64,(.*)$/); done(m ? null : new Error("bad data url"), m && Buffer.from(m[1], "base64")); }
        else if (blobs.has(s)) blobs.get(s).arrayBuffer().then(ab => done(null, Buffer.from(ab)), e => done(e));
        else done(new Error("unsupported image url"));
      } });
      for (const k of ["width", "naturalWidth"]) Object.defineProperty(IP, k, { get() { return this._w || 0; }, set() {}, configurable: true });
      for (const k of ["height", "naturalHeight"]) Object.defineProperty(IP, k, { get() { return this._h || 0; }, set() {}, configurable: true });
      win.URL.createObjectURL = b => { const u = "blob:https://localhost/" + (++blobN); blobs.set(u, b); return u; };
      win.URL.revokeObjectURL = u => { blobs.delete(u); };
      win.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() {} unobserve() {} disconnect() {} };
      win.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      Object.defineProperty(win.document, "fonts", { value: { load: async () => [], check: () => true, ready: Promise.resolve(), addEventListener() {} } });
      win.__StubRenderer = function () {
        this.domElement = win.document.createElement("canvas"); this.shadowMap = {}; this.capabilities = {}; this.info = { render: {} };
        this.setSize = (w, h) => { this.domElement.width = Math.max(1, w | 0); this.domElement.height = Math.max(1, h | 0); };
        for (const k of ["setPixelRatio", "render", "setClearColor", "dispose", "setAnimationLoop", "clear"]) this[k] = () => {};
        this.getPixelRatio = () => 1; this.getSize = v => v;
      };
    },
  });
  return { window: dom.window, dom, errors };
}
module.exports = boot;
module.exports.Ctx2D = Ctx2D; module.exports.encodePNG = encodePNG; module.exports.decodePNG = decodePNG;
