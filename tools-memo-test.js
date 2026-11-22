// Steps worked out once (Session 69, the engine's second step): the core's heavy raster steps are kept by what went
// into them, and a painted model's mesh by what the solid holds.
// Core: the same input gives the kept result, equal to working it out; a copy each time (changing one changes nothing
// kept, nor the next answer); a changed pixel or setting is worked out afresh; small inputs and arguments that are
// functions are not kept; a picture's bytes count (ImageData-like objects), not its getters; the store keeps to its
// budget and forgets the oldest first; quick steps are not kept; the hash tells near-identical grids apart and reads
// arrays that do not start on a 4-byte boundary.
// App: a second build of a name plate, a sign and a relief takes every heavy step from the store and comes out the same
// to the last number; a painted model (the vase) keeps its painted mesh across a rebuild; with the store off nothing
// changes either; every object's fingerprint is checked by tools-fingerprint.js.
//   node tools-memo-test.js index.html        (CORE=1 for the core part only)
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const envMod = require("./tools-test-env.js"), env = envMod(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, S = C.memo.stats;
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i] || (Number.isNaN(v) && Number.isNaN(b[i])));
  const disc = (w, h, cx, cy, r) => { const m = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) m[y * w + x] = 1; return m; };

  console.log("the core: steps kept by what went into them");
  {
    C.memo.clear(); S.on = true;
    const w = 400, h = 300, m = disc(w, h, 200, 150, 90);
    S.on = false; const plain = C.signedDistanceField(m, w, h); S.on = true;
    const a = C.signedDistanceField(m, w, h), h0 = S.hits, b = C.signedDistanceField(m, w, h);
    check(S.hits === h0 + 1 && same(a, plain) && same(b, plain), "the second call is taken from the store, and both equal working it out", `${S.hits} hits, ${S.misses} worked out`);
    check(a !== b && a.buffer !== b.buffer, "each answer is its own copy");
    b[0] = 12345; a[1] = -1;
    const c = C.signedDistanceField(m, w, h);
    check(c[0] === plain[0] && c[1] === plain[1], "changing an answer changes nothing kept, nor the next answer");
    const m2 = Uint8Array.from(m); m2[150 * w + 300] = 1;
    const h1 = S.hits, d = C.signedDistanceField(m2, w, h);
    check(S.hits === h1 && d[150 * w + 300] !== plain[150 * w + 300], "one pixel changed: worked out afresh", `${S.misses} worked out`);
    const h2 = S.hits; C.dilateMask(m, w, h, 3); C.dilateMask(m, w, h, 4);
    check(S.hits === h2, "the same picture with another setting (a dilation of 3 then 4 px) is worked out each time");
    const small = disc(60, 60, 30, 30, 20), hs = S.hits, ms = S.misses; C.edt(small, 60, 60); C.edt(small, 60, 60);
    check(S.hits === hs && S.misses === ms, "a small grid (3,600 pixels) is worked out as before, never kept");
    const f = C.blurMask(m, w, h, 2), polys1 = C.fieldToPolys(f, w, h, { mmPerPx: 0.1 }), polys2 = C.fieldToPolys(f, w, h, { mmPerPx: 0.1 });
    polys2[0].outer[0][0] = 999;
    const polys3 = C.fieldToPolys(f, w, h, { mmPerPx: 0.1 });
    check(polys3[0].outer[0][0] === polys1[0].outer[0][0] && JSON.stringify(polys3) === JSON.stringify(polys1), "outlines too: kept, and handed out as copies");
    const hf = S.hits; C.fieldToPolys(f, w, h, { mmPerPx: 0.1, iso: 0.4 });
    check(S.hits === hf, "an option changed (the outline's level): worked out afresh");
  }
  {
    // a picture: ImageData's width, height and data are getters, not its own keys
    const w = 320, h = 240, data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) { data[4 * i] = (i * 7) % 255; data[4 * i + 1] = (i >> 3) % 255; data[4 * i + 2] = 90; data[4 * i + 3] = 255; }
    class Img { constructor(d) { this._d = d; } get width() { return w; } get height() { return h; } get data() { return this._d; } }
    const slots = [[255, 0, 0], [0, 0, 255], [240, 240, 240]], skip = [false, false, false];
    const A = C.buildCellMap(new Img(data), slots, skip, 1), h0 = S.hits, B = C.buildCellMap(new Img(data), slots, skip, 1);
    const d2 = Uint8ClampedArray.from(data); d2[4 * 1000] = 0; const D = C.buildCellMap(new Img(d2), slots, skip, 1);
    check(S.hits === h0 + 1 && same(A.idx, B.idx), "a picture is known by its bytes: the same picture again is taken from the store");
    check(S.hits === h0 + 1 && D.idx.length === A.idx.length, "one byte of the picture changed: worked out afresh");
    const h1 = S.hits; C.buildCellMap(new Img(data), [[255, 0, 0], [0, 0, 255], [10, 10, 10]], skip, 1);
    check(S.hits === h1, "the same picture with another filament colour: worked out afresh");
  }
  {
    // the hash: grids that differ in one bit, in where they start, or in their type, are told apart
    const a = new Uint8Array(100001), b = Uint8Array.from(a); b[50000] = 1;
    const off = new Uint8Array(new ArrayBuffer(100004), 1, 100001);
    check(C.memo.hash(a) !== C.memo.hash(b), "one bit in 100,001 bytes changes the hash");
    check(C.memo.hash(off) === C.memo.hash(a), "an array that starts off a 4-byte boundary hashes by its bytes (the same bytes, the same hash)");
    // grids that differ in a byte or two (only the distinct ones count: some of the 20,000 come out alike)
    const byBytes = new Map(); let clash = 0;
    for (let i = 0; i < 20000; i++) { const g = new Uint8Array(64); g[i % 64] = 1 + (i >> 6) % 255; g[(i * 7) % 64] ^= i & 255; byBytes.set(g.join(","), C.memo.hash(g)); }
    const hashes = new Set(byBytes.values()); clash = byBytes.size - hashes.size;
    check(clash === 0, `${byBytes.size.toLocaleString()} different near-identical grids: no two share a hash`, `${clash} shared`);
  }
  {
    // the budget: the oldest results go first, and nothing past it is kept
    C.memo.clear(); const keepMax = S.max, keepMs = S.minMs, keepRate = S.msPerMB; S.max = 9e6; S.minMs = 0; S.msPerMB = 0;
    const w = 500, h = 500, masks = [0, 1, 2, 3, 4].map(k => disc(w, h, 250, 250, 60 + 20 * k));
    masks.forEach(m => C.edt(m, w, h));                     // 2 MB each (8-byte numbers)
    check(S.bytes <= S.max && S.store.size === 4, "five 2 MB results in a 9 MB store: four kept, within the budget", `${S.store.size} kept, ${(S.bytes / 1e6).toFixed(1)} MB`);
    const h0 = S.hits; C.edt(masks[4], w, h); C.edt(masks[0], w, h);
    check(S.hits === h0 + 1, "the newest is still there, the oldest is gone");
    S.max = keepMax; S.minMs = keepMs; S.msPerMB = keepRate; C.memo.clear();
  }
  console.log("\ncurves divided by how far they may stray (Session 71): C.segsFor");
  {
    // the most a circle of radius r with n straight sides strays from it, between two corners
    const off = (r, n) => r*(1 - Math.cos(Math.PI/n));
    let worst = 0, coarser = 0;
    for (let r = 0.3; r <= 250; r *= 1.07) for (const min of [16, 24, 32, 40, 48, 64, 96]) {
      const n = C.segsFor(r, min); worst = Math.max(worst, n < 720 ? off(r, n) : 0); if (n < min) coarser++;
    }
    check(worst <= 0.025 + 1e-9 && coarser === 0, "from 0.3 to 250 mm, every circle is within 0.025 mm of the true curve, and never has fewer sides than before", `worst ${worst.toFixed(4)} mm`);
    check(C.segsFor(1.5, 32) === 32 && C.segsFor(2, 24) === 24, "a small hole keeps its count (a 3 mm hole: 32 sides; a 4 mm one: 24)");
    const fan = C.segsFor(60, 48);
    check(fan >= 108 && fan <= 112 && off(60, 48) > 0.12, "a 120 mm fan opening: about 110 sides where it had 48 (0.13 mm off the circle)", `${fan} sides`);
    check(C.segsFor(5000, 16) === 720 && C.segsFor(0, 32) === 32 && C.segsFor(NaN, 16) === 16, "at most 720 sides; a zero or bad radius keeps the count asked for");
  }
  if (process.env.CORE) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

  async function settle() {
    const r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  const pick = async (kind, v) => {
    if (kind === "object") { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); }
    else [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === v).click();
    await settle();
  };
  const sig = () => MF.parts.map(p => p.name + ":" + p.solid.idx.length + ":" + C.memo.hash(p.solid.pos) + ":" + C.memo.hash(p.solid.idx)).join(" ");

  console.log("\nthe app: a second build takes its heavy steps from the store, and comes out the same");
  for (const [kind, v, key, vals] of [["object", "nameplate", "thick", [2.4, 3.0]], ["object", "sign", "depth", [10, 14]], ["object", "relief", "base", [2, 3]]]) {
    await pick(kind, v);
    const o = MF.state.base[v];
    S.on = false; o[key] = vals[1]; await MF.rebuild(false); const plain = sig(); o[key] = vals[0]; await MF.rebuild(false); S.on = true;
    C.memo.clear(); await MF.rebuild(false);
    const m0 = S.misses, h0 = S.hits; o[key] = vals[1]; await MF.rebuild(false);
    // (a quick step is never kept, so it is worked out every time: the heavy ones are what come from the store)
    check(S.hits - h0 > S.misses - m0 && S.hits > h0, `${v}: with its ${key} changed, the heavy steps that do not depend on it come from the store`, `${S.hits - h0} from the store, ${S.misses - m0} worked out`);
    check(sig() === plain, `${v}: and every part is the same, number for number, as built without the store`);
  }
  {
    await pick("object", "turned");
    const p0 = MF.parts[0], pc0 = p0.pc, s0 = sig();
    await MF.rebuild(false);
    const p1 = MF.parts[0];
    check(p1 !== p0 && p1.solid0 !== p0.solid0 && p1.pc === pc0, "the painted vase, built again: its painted mesh is the one kept, not made again");
    check(sig() === s0 && p1.paint && p0.paint && same(p1.paint, p0.paint), "and its parts and paint are the same");
  }
  check(env.errors.length === 0, "no page errors", env.errors.join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
