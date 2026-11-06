// A relief from a photo (Session 38): the AI depth model (when models/depth-anything-v2-small-int8.onnx is there, run
// in Node by the onnxruntime-web dev dependency) on a scene whose depth is known; then the relief object with a
// stand-in for the model: heights following the depth, the background kept flat, the border, the hole, brightness,
// and the depth kept with the picture in a saved project.
//   node tools-relief-test.js index.html          (CORE=1: the model only)
const fs = require("fs"), path = require("path");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const MODEL = path.join(__dirname, "models/depth-anything-v2-small-int8.onnx");
const SHA = "01aa7a23de3f4a0ee1a2bb9997e6918104c85a9f95dea46d27b9b3fb0c6b9001";

// a scene: a lit ball in front of a wall, a box to its left and a floor; its true depth per pixel (smaller is nearer)
function scene(S) {
  const rgb = new Float32Array(3 * S * S), depth = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S * 518, v = y / S * 518;
    let d = 10, c = [0.75 - 0.0003 * v, 0.72 - 0.0003 * v, 0.68 - 0.0002 * v];
    const dx = (u - 300) / 120, dy = (v - 260) / 120, rr = dx * dx + dy * dy;
    if (rr < 1) { const z = Math.sqrt(1 - rr); d = 6 - z * 1.2; const sh = Math.max(0.15, 0.3 + 0.7 * (-0.5 * dx - 0.5 * dy + 0.7 * z)); c = [0.8 * sh, 0.25 * sh, 0.2 * sh]; }
    else if (u > 60 && u < 180 && v > 200 && v < 420) { d = 7.5; const f = u < 80 ? 0.5 : 0.85; c = [0.2 * f, 0.4 * f, 0.75 * f]; }
    else if (v > 420) { d = 10 - (v - 420) * 0.03; c = [0.55, 0.45, 0.35]; }
    depth[y * S + x] = d; for (let k = 0; k < 3; k++) rgb[k * S * S + y * S + x] = c[k];
  }
  return { rgb, depth };
}

async function modelTests() {
  console.log("the AI depth model");
  if (!fs.existsSync(MODEL)) { console.log("  (skipped: models/depth-anything-v2-small-int8.onnx is not here; it is downloaded from Hugging Face by the page)"); return; }
  const bytes = fs.readFileSync(MODEL), sha = require("crypto").createHash("sha256").update(bytes).digest("hex");
  check(sha === SHA, "the model is the file AI_FIGURE checks for", sha.slice(0, 16));
  const ort = require("onnxruntime-web"); ort.env.wasm.numThreads = 1;
  const sess = await ort.InferenceSession.create(bytes), S = 518, { rgb, depth } = scene(S), mean = [0.485, 0.456, 0.406], sd = [0.229, 0.224, 0.225];
  const input = rgb.map((v, i) => (v - mean[Math.floor(i / (S * S))]) / sd[Math.floor(i / (S * S))]);
  const t0 = Date.now(), out = (await sess.run({ pixel_values: new ort.Tensor("float32", input, [1, 3, S, S]) })).predicted_depth.data;
  let n = out.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { const a = out[i], b = 1 / depth[i]; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; }
  const r = (sxy - sx * sy / n) / Math.sqrt((sxx - sx * sx / n) * (syy - sy * sy / n)), at = (x, y) => out[y * S + x];
  check(r > 0.85, "its depth follows the scene's true depth", `correlation ${r.toFixed(3)}, ${Date.now() - t0} ms`);
  check(at(300, 260) > at(300 + 110, 260) && at(300 + 110, 260) > at(450, 100) && at(120, 300) > at(450, 100), "the ball's middle nearer than its edge, and both, and the box, nearer than the wall",
    `${at(300, 260).toFixed(2)} > ${at(410, 260).toFixed(2)} > ${at(450, 100).toFixed(2)}; box ${at(120, 300).toFixed(2)}`);
  const out2 = (await sess.run({ pixel_values: new ort.Tensor("float32", new Float32Array(3 * 364 * 518).fill(0.1), [1, 3, 364, 518]) })).predicted_depth;
  check(out2.dims.join("x") === "1x364x518", "a picture not square, both sides multiples of 14, comes back at its own size", out2.dims.join("x"));
}

function coreTests(C) {
  console.log("a bas-relief from a depth map");
  // a ball standing in front of a far wall: its rim is a jump from 0 to 0.6
  const w = 200, h = 200, f = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const r = Math.hypot(x - 100, y - 100) / 60; f[y * w + x] = r < 1 ? 0.6 + 0.4 * Math.sqrt(1 - r * r) : 0; }
  const t0 = Date.now(), b = C.basRelief(f, w, h, 1), at = (x, y) => b[y * w + x];
  check(at(100, 100) > 0.95 && at(130, 100) > 0.75 && at(158, 100) < 0.35 && at(5, 5) < 0.1, "the ball's own dome takes most of the height; the jump at its rim is tamed",
    `top ${at(100, 100).toFixed(2)}, halfway ${at(130, 100).toFixed(2)}, just inside the rim ${at(158, 100).toFixed(2)}, the wall ${at(5, 5).toFixed(2)}, ${Date.now() - t0} ms`);
  const asIs = (f[130 + 100 * w] - f[158 + 100 * w]) / (f[100 * w + 100] - f[5]);
  check(at(130, 100) - at(158, 100) > 2 * asIs, "the dome's rise from rim to halfway is over twice what it was in the depth as it is", `${(at(130, 100) - at(158, 100)).toFixed(2)} against ${asIs.toFixed(2)}`);
}

async function appTests() {
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
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length, R = () => MF.state.base.relief;
  console.log("the relief, with a stand-in for the model");
  // the stand-in: nearest in the middle, falling to the edges (a dome), so heights are known
  let runs = 0, asked = null;
  MF.depth.hooks.run = async (input, w, h) => { runs++; asked = [w, h]; const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = Math.max(0, 1 - Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2))); return o; };
  const s = win.document.querySelector("#objectSel"); s.value = "relief"; s.dispatchEvent(new win.Event("change")); await settle();
  const d = MF.state.items[0];
  check(!!d && MF.parts.length === 1 && /brightness/.test(MF.relief.lines.join(" ")), "before the depth is worked out, it rises with brightness and says so", MF.relief.lines[0]);
  await MF.depth.of(d); MF.rebuild(false); await settle();
  const a = d.aspect || 1, want = a >= 1 ? [518, Math.max(140, Math.round(518 / a / 14) * 14)] : [Math.max(140, Math.round(518 * a / 14) * 14), 518];
  check(runs === 1 && asked[0] === want[0] && asked[1] === want[1] && asked.every(v => v % 14 === 0), "the picture goes in with its longer side 518 pixels, both sides multiples of 14", asked.join(" × "));
  check(typeof d.depthMap === "string" && /AI's depth/.test(MF.relief.lines.join(" ")), "the depth is kept with the picture, and the relief now rises with it", d.depthMap);
  Object.assign(R(), { width: 100, base: 2, height: 5, flatten: 0, contrast: 1, smooth: 0, border: 0, hole: false, invert: false, boost: 0, subject: false });
  MF.rebuild(false); await settle();
  const sol = MF.parts[0].solid, b = C.solidBounds(sol), cm = C.checkMesh(sol);
  // the height at a point: the highest vertex near it
  const hAt = (x, z, r = 1.2) => { let h = -1; for (let i = 0; i < sol.pos.length; i += 3) if (Math.abs(sol.pos[i] - x) < r && Math.abs(sol.pos[i + 2] - z) < r) h = Math.max(h, sol.pos[i + 1]); return h; };
  const cx = (b.mn[0] + b.mx[0]) / 2, cz = (b.mn[2] + b.mx[2]) / 2;
  check(cm.open === 0 && C.signedVolume(sol) > 0 && near(b.mn[1], 0, 1e-3) && near(b.mx[0] - b.mn[0], 100, 0.5), "a closed solid, 100 mm wide, flat on the bed", `${(b.mx[0] - b.mn[0]).toFixed(1)} mm, open ${cm.open}`);
  check(near(hAt(cx, cz), 7, 0.25) && near(hAt(b.mn[0] + 1.5, cz), 2, 0.6), "the nearest point (the middle) stands base + relief, 7 mm; the far edge stays near the 2 mm base", `${hAt(cx, cz).toFixed(2)} and ${hAt(b.mn[0] + 1.5, cz).toFixed(2)} mm`);
  const quarter = hAt(cx + 25, cz);
  // the depth is spread between its 1st and 99th percentiles: the dome's 99th is 0.887, so halfway out (0.5) is 0.56
  check(near(quarter, 2 + 5 * 0.5 / 0.887, 0.25), "halfway out, the dome's 0.5 spread to 0.56 by the percentiles: 4.8 mm", quarter.toFixed(2) + " mm");
  Object.assign(R(), { flatten: 0.6 }); MF.rebuild(false); await settle();
  const sol2 = MF.parts[0].solid; let flatAt = -1; for (let i = 0; i < sol2.pos.length; i += 3) if (Math.abs(sol2.pos[i] - (cx + 25)) < 1.2 && Math.abs(sol2.pos[i + 2] - cz) < 1.2) flatAt = Math.max(flatAt, sol2.pos[i + 1]);
  check(near(flatAt, 2, 0.2), "keeping the farthest 60% flat leaves halfway out at the base", flatAt.toFixed(2) + " mm");
  Object.assign(R(), { flatten: 0, border: 4, rim: 1, hole: true, holeDia: 5, shape: "round" }); MF.rebuild(false); await settle();
  const sol3 = MF.parts[0].solid, b3 = C.solidBounds(sol3);
  check(C.checkMesh(sol3).open === 0 && near(b3.mx[0] - b3.mn[0], 100, 0.6) && MF.relief.hole, "round, with a border at the full height and a hole to hang it: still closed", `${(b3.mx[0] - b3.mn[0]).toFixed(1)} × ${(b3.mx[2] - b3.mn[2]).toFixed(1)} mm`);
  Object.assign(R(), { source: "light", border: 0, hole: false, shape: "rect" }); MF.rebuild(false); await settle();
  check(/brightness/.test(MF.relief.lines.join(" ")) && C.checkMesh(MF.parts[0].solid).open === 0, "Brightness instead: built from the picture's light and dark");
  Object.assign(R(), { source: "ai", boost: 1, subject: true }); MF.rebuild(false); await settle();
  check(C.checkMesh(MF.parts[0].solid).open === 0 && MF.relief.usingAI, "carved (the jumps tamed) and with the subject given the whole height: still closed");
  // the photo's colours (Session 43): the face painted with the filaments nearest the photo, the border, sides and back
  // left in the relief's own; and a stand whose slot takes the bottom edge
  Object.assign(R(), { colour: "photo", stand: true, border: 3, rim: 0.6, shape: "rect" }); MF.rebuild(false); await settle();
  { const rp = MF.parts.find(p => p.name === "Relief"), st = MF.parts.find(p => p.name === "Stand"), ip = rp && rp.importPaint;
    const used = ip ? new Set([...ip].filter(v => v > 0)) : new Set(), sp = rp.solid.pos, si = rp.solid.idx, rb = C.solidBounds(rp.solid);
    let edgePainted = 0, backPainted = 0;
    for (let t = 0; t < si.length / 3; t++) {
      const a = si[3 * t] * 3, b = si[3 * t + 1] * 3, c = si[3 * t + 2] * 3, x = (sp[a] + sp[b] + sp[c]) / 3, y = (sp[a + 1] + sp[b + 1] + sp[c + 1]) / 3, z = (sp[a + 2] + sp[b + 2] + sp[c + 2]) / 3;
      if (ip[t] && (x < rb.mn[0] + 2 || x > rb.mx[0] - 2 || z < rb.mn[2] + 2 || z > rb.mx[2] - 2)) edgePainted++;
      if (ip[t] && y < 0.01) backPainted++;
    }
    check(used.size >= 2 && MF.relief.colours.length === used.size && !edgePainted && !backPainted && /photo's colours/.test(MF.relief.lines.join(" ")),
      "in the photo's colours: the face takes the nearest filaments; the border and the back stay in the relief's own", `${used.size} filaments, ${[...ip].filter(v => v > 0).length} of ${ip.length} triangles`);
    const sb = st && C.solidBounds(st.solid);
    check(st && C.checkMesh(st.solid).open === 0 && near(sb.mn[1], 0, 1e-3) && near(MF.relief.standFor, 2 + 5 * 0.6, 0.6), "a stand whose slot takes the relief's bottom edge (the border, 2 + 0.6 × 5 mm)", MF.relief.standFor && MF.relief.standFor.toFixed(2) + " mm");
    MF.state.items[0].skip = MF.state.slots.map((_, i) => i); MF.rebuild(false); await settle();
    const ip2 = MF.parts.find(p => p.name === "Relief").importPaint;
    check(ip2 && ip2.every(v => v === 0) && /None of the photo's colours/.test(MF.relief.lines.join(" ")), "every colour turned off on the Art tab: all in the relief's own filament, and it says so");
    MF.state.items[0].skip = []; }
  Object.assign(R(), { colour: "one", stand: false }); MF.rebuild(false); await settle();
  check(!MF.parts[0].importPaint && MF.parts.length === 1, "one colour and no stand: the relief alone, unpainted");
  // saved and opened again, the depth comes back from the project, not from the model
  Object.assign(R(), { source: "ai" });
  const payload = MF.projectPayload(true), parsed = JSON.parse(payload);
  check(parsed.assets[d.depthMap] && /^data:image\/png/.test(parsed.assets[d.depthMap]), "a saved project carries the depth as a picture of its own");
  MF.depth.hooks.run = async () => { throw new Error("the model should not run again"); };
  const inp = win.document.querySelector("#projInput"), f = new win.File([payload], "p.json", { type: "application/json" }), r0 = MF.rev;
  Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
  check(MF.relief && MF.relief.usingAI && C.checkMesh(MF.parts[0].solid).open === 0, "opened again, it rises with the kept depth without running the model");
  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement|should not run/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
}

(async () => {
  global.earcut = require("earcut");
  require(path.resolve(__dirname, "src/core.js"));
  coreTests(globalThis.PRCore);
  await modelTests();
  if (!process.env.CORE) await appTests();
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
