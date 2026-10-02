// Speed (Session 22): picking with a bounding volume hierarchy, checked ray by ray against testing every
// triangle, on the photo test's figure (568 680 triangles), a sphere and a heap of random triangles.
// Session 27: distance fields and the closed-mesh check, each checked number by number against the old way, and
// a plastic canvas's panel triangulated in strips.
//   node tools-speed-test.js [index.html]      CORE=1 for the core only
"use strict";
const path = require("path");
globalThis.earcut = require("earcut");
require(path.join(__dirname, "src", "core.js"));
const C = globalThis.PRCore;
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const { figure } = require("./tools-photo-figure.js")(C);

// every triangle, the plain way (the same test three.js makes)
function brute(pos, idx, o, d, cull) {
  const n = idx ? idx.length / 3 : pos.length / 9; let best = Infinity, bt = -1;
  for (let t = 0; t < n; t++) {
    const A = 3 * (idx ? idx[3 * t] : 3 * t), B = 3 * (idx ? idx[3 * t + 1] : 3 * t + 1), Cc = 3 * (idx ? idx[3 * t + 2] : 3 * t + 2);
    const e1 = [pos[B] - pos[A], pos[B + 1] - pos[A + 1], pos[B + 2] - pos[A + 2]], e2 = [pos[Cc] - pos[A], pos[Cc + 1] - pos[A + 1], pos[Cc + 2] - pos[A + 2]];
    const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], ddn = d[0] * nx + d[1] * ny + d[2] * nz;
    if (Math.abs(ddn) < 1e-12 || (cull && ddn > 0)) continue;              // three.js: DdN > 0 is the back
    const s = [o[0] - pos[A], o[1] - pos[A + 1], o[2] - pos[A + 2]];
    const t0 = -(s[0] * nx + s[1] * ny + s[2] * nz) / ddn; if (t0 < 0 || t0 >= best) continue;
    const p = [s[0] + d[0] * t0, s[1] + d[1] * t0, s[2] + d[2] * t0];
    // barycentric inside test
    const d00 = e1[0] * e1[0] + e1[1] * e1[1] + e1[2] * e1[2], d01 = e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2], d11 = e2[0] * e2[0] + e2[1] * e2[1] + e2[2] * e2[2];
    const d20 = p[0] * e1[0] + p[1] * e1[1] + p[2] * e1[2], d21 = p[0] * e2[0] + p[1] * e2[1] + p[2] * e2[2], den = d00 * d11 - d01 * d01;
    const v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
    if (v < -1e-9 || w < -1e-9 || v + w > 1 + 1e-9) continue;
    best = t0; bt = t;
  }
  return bt < 0 ? null : { t: best, tri: bt };
}
function rays(pos, count, seed) {
  const r = C.seededRandom(seed), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], pos[i + a]); mx[a] = Math.max(mx[a], pos[i + a]); }
  const c = mn.map((v, a) => (v + mx[a]) / 2), R = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
  return Array.from({ length: count }, () => {
    const th = r() * 2 * Math.PI, ph = Math.acos(2 * r() - 1), o = [c[0] + R * Math.sin(ph) * Math.cos(th), c[1] + R * Math.cos(ph), c[2] + R * Math.sin(ph) * Math.sin(th)];
    const aim = mn.map((v, a) => v + r() * (mx[a] - v)), d = aim.map((v, a) => v - o[a]);
    // now and then a ray straight along an axis, which has zeros in its direction
    if (r() < 0.1) { const a = Math.floor(r() * 3); for (let k = 0; k < 3; k++) if (k !== a) { d[k] = 0; o[k] = aim[k]; } }
    return { o, d };
  });
}
function compare(name, pos, idx, count) {
  let t0 = Date.now(); const B = C.meshBVH(pos, idx), buildMs = Date.now() - t0;
  const rs = rays(pos, count, 5);
  let same = 0, hits = 0, bvhMs = 0, bruteMs = 0, worst = 0;
  for (const cull of [1, 0]) for (const { o, d } of rs) {
    let a = Date.now(); const h = C.bvhRaycast(B, pos, idx, o, d, null, cull); bvhMs += Date.now() - a;
    a = Date.now(); const g = brute(pos, idx, o, d, cull); bruteMs += Date.now() - a;
    const ok = (!h && !g) || (h && g && Math.abs(h.t - g.t) <= 1e-6 * Math.max(1, g.t));
    if (ok) same++; else worst = Math.max(worst, h && g ? Math.abs(h.t - g.t) : Infinity);
    if (g) hits++;
  }
  check(same === 2 * count, `${name}: the same nearest hit as testing every triangle, front faces only and both sides`,
    `${same} of ${2 * count} rays, ${hits} hits; built in ${buildMs} ms, ${B.nodes} boxes; ${(bvhMs / (2 * count)).toFixed(3)} ms a ray against ${(bruteMs / (2 * count)).toFixed(1)} ms${worst ? ", worst " + worst : ""}`);
  return { B, buildMs, perRay: bvhMs / (2 * count) };
}

console.log("picking with a bounding volume hierarchy");
const fig = figure(), solid = fig.solid;
const big = compare("the figure, 568 680 triangles", solid.pos, solid.idx, 300);
check(big.buildMs < 2000 && big.perRay < 1, "fast enough to build when a model appears and to pick on every brush move", `${big.buildMs} ms to build, ${big.perRay.toFixed(3)} ms a ray`);
const sphere = C.revolveLoop(Array.from({ length: 33 }, (_, i) => { const a = -Math.PI / 2 + i / 32 * Math.PI; return [i === 0 || i === 32 ? 0 : Math.cos(a) * 20, Math.sin(a) * 20]; }), 64);
compare("a sphere", sphere.pos, sphere.idx, 400);
// a plain list (no index), as the painted models are drawn, with degenerate and overlapping triangles
const r = C.seededRandom(9), soup = new Float32Array(9 * 3000);
for (let i = 0; i < soup.length; i += 9) { const b = [r() * 100, r() * 100, r() * 100]; for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) soup[i + 3 * k + a] = b[a] + (r() - 0.5) * 12; }
for (let i = 0; i < 90; i += 9) for (let a = 0; a < 3; a++) { soup[i + 3 + a] = soup[i + a]; }          // ten degenerate ones
compare("3000 random triangles as a plain list", soup, null, 400);
// odd cases
const empty = C.meshBVH(new Float32Array(0), new Uint32Array(0));
const one = C.meshBVH(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), null);
const h1 = C.bvhRaycast(one, new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), null, [0.2, 0.2, 5], [0, 0, -1], null, 1);
const same = new Float32Array(9 * 50).fill(1);                                                        // fifty triangles in one point
check(C.bvhRaycast(empty, new Float32Array(0), new Uint32Array(0), [0, 0, 5], [0, 0, -1], null, 1) === null && h1 && h1.tri === 0 && Math.abs(h1.t - 5) < 1e-9 &&
  C.bvhRaycast(one, new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), null, [0.2, 0.2, -5], [0, 0, 1], null, 1) === null && C.meshBVH(same, null).nodes >= 1,
  "odd cases: no triangles, one triangle seen from the front and from behind, fifty triangles in one point");

// distance fields (Session 27): the passes down the columns now read the rows in memory order. Every distance must
// come out exactly as the general method (kept here as it was) gave it, or outlines built from them would move.
console.log("\ndistance fields");
{
  const edt1d = (f, n, d, v, z) => {
    let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  };
  const general = (mask, w, h) => {
    const m = Math.max(w, h), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1), out = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = mask[i] ? 0 : 1e20;
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = out[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) out[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = out[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) out[y * w + x] = Math.sqrt(d[x]); }
    return out;
  };
  const rr = C.seededRandom(27), cases = [];
  for (let t = 0; t < 300; t++) {
    const w = 1 + Math.floor(rr() * 60), h = 1 + Math.floor(rr() * 60), p = rr() * rr(), m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = rr() < p ? 1 : 0;
    cases.push([m, w, h]);
  }
  { const w = 700, h = 260, m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - 200) ** 2 + (y - 130) ** 2 < 80 ** 2 || (x > 380 && x < 650 && Math.abs(y - 130 - (x - 380) * 0.3) < 6)) m[y * w + x] = 1;
    cases.push([m, w, h]); }
  cases.push([new Uint8Array(40 * 30), 40, 30], [new Uint8Array(40 * 30).fill(1), 40, 30], [new Float32Array(30 * 30).map((_, i) => i % 7 ? 0 : 0.5), 30, 30]);
  let same = 0;
  for (const [m, w, h] of cases) { const a = general(m, w, h), b = C.edt(m, w, h); let ok = a.length === b.length; for (let i = 0; ok && i < a.length; i++) ok = a[i] === b[i]; if (ok) same++; }
  check(same === cases.length, "every distance exactly as the general method gives it: random masks, shapes, an empty and a full one, a mask of fractions",
    `${same} of ${cases.length}`);
  const W = 2702, H = 730, M = new Uint8Array(W * H);                                                   // a long name plate's grid
  for (let y = 150; y < 580; y++) for (let x = 200; x < 2500; x++) if (Math.sin(x / 40) * Math.cos(y / 30) > 0.3) M[y * W + x] = 1;
  let t0 = Date.now(); general(M, W, H); const tg = Date.now() - t0; t0 = Date.now(); C.edt(M, W, H); const tn = Date.now() - t0;
  check(true, "a long name plate's grid (2702 × 730)", `${tn} ms, the general method ${tg} ms`);
}

// the closed-mesh check (Session 27): edges paired up under their lower corner instead of one big sort. The open
// edge count and the volume must come out exactly as the sorted way (kept here as it was) gave them.
console.log("\nthe closed-mesh check");
{
  const sorted = solid => {
    const I = solid.idx, P = solid.pos, E = I.length; let vol = 0, nv = P.length / 3;
    for (let t = 0; t < E; t++) if (I[t] >= nv) nv = I[t] + 1;
    const keys = new Float64Array(E);
    for (let t = 0; t < E; t += 3) {
      for (let k = 0; k < 3; k++) keys[t + k] = I[t + k] * nv + I[t + (k + 1) % 3];
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      vol += (P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c])) / 6;
    }
    keys.sort();
    const count = key => { let lo = 0, hi = E; while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] < key) lo = m + 1; else hi = m; } let n = 0; while (lo + n < E && keys[lo + n] === key) n++; return n; };
    let open = 0;
    for (let i = 0; i < E;) { let j = i; while (j < E && keys[j] === keys[i]) j++; const k = keys[i], b = k % nv, a = (k - b) / nv; open += Math.abs(j - i - count(b * nv + a)); i = j; }
    return { tris: E / 3, open, volume: Math.abs(vol) };
  };
  const rr = C.seededRandom(4), meshes = [];
  for (let t = 0; t < 400; t++) {                       // random triangles: open, doubled, flipped, degenerate
    const nv = 3 + Math.floor(rr() * 30), nt = Math.floor(rr() * 60), pos = new Float32Array(nv * 3).map(() => rr() * 10), idx = new Uint32Array(nt * 3);
    for (let i = 0; i < idx.length; i++) idx[i] = Math.floor(rr() * nv);
    if (rr() < 0.3) for (let i = 0; i + 5 < idx.length; i += 6) { idx[i + 3] = idx[i]; idx[i + 4] = idx[i + 2]; idx[i + 5] = idx[i + 1]; }
    if (rr() < 0.2 && idx.length) idx[0] = nv + 2;                                                     // past the last corner
    meshes.push({ pos, idx });
  }
  const fan = { pos: new Float32Array(3 * 2002).map(() => rr()), idx: new Uint32Array(3 * 2000) };
  for (let i = 0; i < 2000; i++) fan.idx.set([0, 1 + i, 2 + i], 3 * i);                                 // 2000 edges on one corner
  meshes.push(sphere, fan, solid);
  let same = 0;
  for (const m of meshes) { const a = sorted(m), b = C.checkMesh(m); if (a.open === b.open && a.tris === b.tris && Object.is(a.volume, b.volume)) same++; }
  check(same === meshes.length, "open edges and volume exactly as the sorted way counts them: random, doubled and flipped triangles, a fan, a sphere, the figure",
    `${same} of ${meshes.length}`);
  let t0 = Date.now(); sorted(solid); const ts = Date.now() - t0; t0 = Date.now(); C.checkMesh(solid); const tn = Date.now() - t0;
  check(true, "the figure (568 680 triangles)", `${tn} ms, the sorted way ${ts} ms`);
}

// many holes (Session 27): a convex outline with a grid of holes is triangulated in strips between columns of holes,
// and overlapping square openings are joined first (rectUnion). The same region must come out (area, volume, every
// opening open, nothing outside), and the walls must close up.
console.log("\nmany holes");
{
  const inRing = (x, y, L) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const a = L[i], b = L[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const inTri = (x, y, p, q, r) => { const d1 = (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]), d2 = (x - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (y - r[1]), d3 = (x - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (y - p[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  // a plastic canvas's panel as buildCanvasPanel makes it: corner holes, hanging holes, open squares where open(i, j)
  const panel = (cells, hang, open, holeSize) => {
    const pitch = 4.5, gap = 0.7, W = cells * pitch, hs = holeSize / 2, os = (pitch - gap) / 2, rects = [];
    const hangs = hang ? [[-W / 2 + 4, W / 2 + 2], [W / 2 - 4, W / 2 + 2]] : [];
    const near = (x, y) => hangs.some(([hx, hy]) => Math.hypot(Math.max(0, Math.abs(hx - x) - hs), Math.max(0, Math.abs(hy - y) - hs)) < 2.4);
    const op = (i, j) => i >= 0 && j >= 0 && i < cells && j < cells && open(i, j);
    for (let j = 0; j <= cells; j++) for (let i = 0; i <= cells; i++) {
      const x = (i - cells / 2) * pitch, y = (cells / 2 - j) * pitch;
      if (!near(x, y) && !op(i - 1, j - 1) && !op(i, j - 1) && !op(i - 1, j) && !op(i, j)) rects.push([x - hs, y - hs, x + hs, y + hs]);
    }
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) if (op(i, j)) { const x = (i + 0.5 - cells / 2) * pitch, y = (cells / 2 - j - 0.5) * pitch; rects.push([x - os, y - os, x + os, y + os]); }
    const circles = hangs.map(([hx, hy]) => C.ringCircle(2, 32, true).map(p => [p[0] + hx, p[1] + hy]));
    const outer = C.ringRect(W + 8, W + 8, 3, 8);
    return { polys: C.groupLoops([outer, ...C.rectUnion(rects), ...circles]), outer, rects, circles };
  };
  const cases = [["a 34-cell canvas with hanging holes", 34, true, () => false, 1.4], ["a 90-cell canvas", 90, false, () => false, 1.4],
    ["a 24-cell canvas with its background open", 24, true, (i, j) => (i - 12) ** 2 + (j - 12) ** 2 > 30, 1.4],
    ["corner holes wider than the squares between them, so the middle is all open", 16, false, (i, j) => (i + j) % 5 === 0, 5]];
  const sig = rs => C.rectUnion(rs).map(L => C.area2(L)).sort((a, b) => a - b).join(" ");
  check(sig([[0, 0, 2, 2], [1, 1, 3, 3]]) === "-7" && sig([[0, 0, 3, 1], [0, 2, 3, 3], [0, 0, 1, 3], [2, 0, 3, 3]]) === "-9 1" && sig([[0, 0, 1, 1], [1, 1, 2, 2]]) === "-1 -1",
    "joining squares: two overlapping make one opening, a ring keeps its middle as a loose piece, two touching at a corner stay two",
    `${sig([[0, 0, 2, 2], [1, 1, 3, 3]])} / ${sig([[0, 0, 3, 1], [0, 2, 3, 3], [0, 0, 1, 3], [2, 0, 3, 3]])} / ${sig([[0, 0, 1, 1], [1, 1, 2, 2]])}`);
  for (const [what, cells, hang, open, holeSize] of cases) {
    const P = panel(cells, hang, open, holeSize);
    let t0 = Date.now(); const { pts, tris } = C.triangulate(P.polys, 0); const ms = Date.now() - t0;
    const sol = C.extrudePolys(P.polys, 1.6), m = C.checkMesh(sol);
    let area = 0; for (let i = 0; i < tris.length; i += 3) { const p = pts[tris[i]], q = pts[tris[i + 1]], r = pts[tris[i + 2]]; area += ((q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1])) / 2; }
    const want = P.polys.reduce((a, q) => a + Math.abs(C.area2(q.outer)) - q.holes.reduce((b, h) => b + Math.abs(C.area2(h)), 0), 0);
    const rr = C.seededRandom(cells), R = (cells * 4.5 + 8) / 2; let wrong = 0;
    for (let k = 0; k < 3000; k++) {
      const x = (rr() * 2 - 1) * R, y = (rr() * 2 - 1) * R;
      const inside = inRing(x, y, P.outer) && !P.rects.some(r => x > r[0] && x < r[2] && y > r[1] && y < r[3]) && !P.circles.some(c => inRing(x, y, c));
      let n = 0; for (let i = 0; i < tris.length && n < 2; i += 3) if (inTri(x, y, pts[tris[i]], pts[tris[i + 1]], pts[tris[i + 2]])) n++;
      if (n !== (inside ? 1 : 0)) wrong++;
    }
    check(Math.abs(area - want) < want * 1e-9 && m.open === 0 && Math.abs(m.volume - want * 1.6) < want * 1.6 * 1e-6 && wrong === 0,
      `${what}: the right area and volume, closed, 3000 random points in the right place`,
      `${P.rects.length} openings in ${P.polys.length} piece${P.polys.length === 1 ? "" : "s"}, ${ms} ms, ${m.open} open edges, ${wrong} points wrong`);
  }
}

(async () => {
  if (process.env.CORE || !process.argv[2]) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }
  // ---- the app, in jsdom: no Web Worker here, so everything takes the page's own way ----
  console.log("\nthe app without a helper thread");
  const boot = require("./tools-test-env.js"), env = boot(process.argv[2]), win = env.window;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const settle = async () => { await sleep(100); for (let i = 0; i < 2400 && win.MakerForge.busy; i++) await sleep(25); await sleep(300); };
  await sleep(800); await settle();
  const MF = win.MakerForge, THREE = win.THREE;
  // painted vase: 359 thousand triangles
  const sel = win.document.querySelector("#objectSel"); sel.value = "turned"; sel.dispatchEvent(new win.Event("change")); await settle();
  MF.printNow(); for (let i = 0; i < 600 && !MF.print; i++) await sleep(30);
  const pr = MF.print;
  check(MF.helper.failed && !MF.helper.ready && pr && pr.overhang, "no Web Worker (jsdom): the printability check still runs on the page", pr && `overhang ${pr.overhang.area.toFixed(1)} mm²`);
  // picking: the boxes against three.js's test of every triangle, for rays from the camera over the view
  const meshes = []; MF.scene.traverse(o => { if (o.isMesh && o.userData.part != null) meshes.push(o); });
  const stock = THREE.Mesh.prototype.raycast, ray = new THREE.Raycaster(), rr = C.seededRandom(3);
  let same = 0, hits = 0, n = 300; const tris = meshes.reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
  let tb = 0, tp = 0;
  for (let i = 0; i < n; i++) {
    // from the camera to a point inside the model's box (jsdom lays nothing out, so aim at the model itself)
    const bb = new THREE.Box3(); meshes.forEach(m => bb.expandByObject(m));
    const aim = new THREE.Vector3(bb.min.x + rr() * (bb.max.x - bb.min.x), bb.min.y + rr() * (bb.max.y - bb.min.y), bb.min.z + rr() * (bb.max.z - bb.min.z));
    ray.set(MF.camera.position, aim.sub(MF.camera.position).normalize());
    let t0 = Date.now(); const a = ray.intersectObjects(meshes, false)[0]; tb += Date.now() - t0;
    const own = meshes.map(m => m.raycast); meshes.forEach(m => m.raycast = stock);
    t0 = Date.now(); const b = ray.intersectObjects(meshes, false)[0]; tp += Date.now() - t0;
    meshes.forEach((m, k) => m.raycast = own[k]);
    if ((!a && !b) || (a && b && a.object === b.object && a.faceIndex === b.faceIndex && Math.abs(a.distance - b.distance) < 1e-4 && a.point.distanceTo(b.point) < 1e-4 && a.face.normal.distanceTo(b.face.normal) < 1e-6)) same++;
    if (b) hits++;
  }
  check(same === n && hits > 30, "picking the painted vase with the boxes: every ray finds the same triangle, point and normal as three.js",
    `${same} of ${n} rays, ${hits} hits on ${tris} triangles; ${(tb / n).toFixed(2)} ms a ray against ${(tp / n).toFixed(2)} ms`);
  // the mesh check once per part: a rebuild used to run it twice (after the build and after printability)
  const core = MF.core, orig = core.checkMesh; let calls = 0; core.checkMesh = s => { calls++; return orig(s); };
  sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); await MF.printNow(); await settle();
  const partsN = MF.parts.length; core.checkMesh = orig;
  check(calls > 0 && calls <= partsN + 1, "the mesh check runs once per part, however often the checks are refreshed", `${calls} checks for ${partsN} parts`);
  // drawing: only when something changes
  const d0 = MF.draws; await sleep(1500); const d1 = MF.draws;
  MF.camera.position.x += 5; await sleep(200); const d2 = MF.draws;
  check(d1 - d0 <= 1 && d2 > d1, "the view is drawn when something moves, not over and over while nothing does", `${d1 - d0} drawings in 1.5 s of nothing, ${d2 - d1} after the camera moved`);
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
