// Speed (Session 22): picking with a bounding volume hierarchy, checked ray by ray against testing every
// triangle, on the photo test's figure (568 680 triangles), a sphere and a heap of random triangles.
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
