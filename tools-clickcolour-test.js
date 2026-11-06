// Click to colour (Session 50): a click on a part of a lined-up photo is outlined by Segment Anything (SlimSAM-77, run here in
// Node by the onnxruntime-web dev dependency, from models/ when the two files are there: they are not in the repository,
// see models/LICENSE.md) and painted onto the model through the photo. The engine against the test footballer's known
// parts; then the Paint tab: a click on the shirt, painted, right through, kept in a project, a hostile step, a photo gone.
//   node tools-clickcolour-test.js index.html        CORE=1 for the engine only
const path = require("path"), fs = require("fs");
require(path.join(__dirname, "src", "core.js"));
const C = globalThis.PRCore;
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const F = require("./tools-photo-figure.js")(C);
const ENC = path.join(__dirname, "models", "slimsam-77-vision-int8.onnx"), DEC = path.join(__dirname, "models", "slimsam-77-decoder-int8.onnx");
const HAVE = !process.env.STANDIN && fs.existsSync(ENC) && fs.existsSync(DEC);        // STANDIN=1: a stand-in network, quicker
let ort = null, enc = null, dec = null;
async function sessions() {
  if (enc) return; ort = require("onnxruntime-web"); ort.env.wasm.numThreads = 1;
  enc = await ort.InferenceSession.create(fs.readFileSync(ENC)); dec = await ort.InferenceSession.create(fs.readFileSync(DEC));
}
// (copied: arrays made inside the test page belong to another realm than the runtime's)
const encode = async inp => { await sessions(); const r = await enc.run({ pixel_values: new ort.Tensor("float32", Float32Array.from(inp.data), Array.from(inp.dims)) }); return { emb: r.image_embeddings, pos: r.image_positional_embeddings }; };
const decode = async (pr, E) => { await sessions();
  const r = await dec.run({ input_points: new ort.Tensor("float32", Float32Array.from(pr.points.data), Array.from(pr.points.dims)), input_labels: new ort.Tensor("int64", BigInt64Array.from(pr.labels.data), Array.from(pr.labels.dims)), image_embeddings: E.emb, image_positional_embeddings: E.pos });
  return { masks: r.pred_masks.data, dims: r.pred_masks.dims, iou: r.iou_scores.data }; };

(async () => {
  const fig = F.figure(), solid = fig.solid, topo = C.meshTopology(solid), cls = F.truth(topo, fig.partOf);
  const W = 600, H = 800, fit = { a: 6.3 / H, tx: 310 / H, ty: 760 / H, rot: 0.04, mirror: false };
  const shot = F.render(solid, topo, cls, "front", fit, W, H, 1), R = C.photoRaster(solid, "front", fit, W, H);
  const NM = F.NAMES, c = nm => NM.indexOf(nm);
  // a click in the middle of a part, in the photo: the pixel of that part (and, for "left"/"right", of that half) nearest its mean
  const clickOn = (nm, side) => { let sx = 0, sy = 0, n = 0; const ok = i => R.id[i] >= 0 && cls[R.id[i]] === c(nm) && (!side || (side === "left" ? i % W < W * 0.52 : i % W >= W * 0.52));
    for (let i = 0; i < W * H; i++) if (ok(i)) { sx += i % W; sy += Math.floor(i / W); n++; }
    let b = -1, bd = Infinity; for (let i = 0; i < W * H; i++) if (ok(i)) { const d = (i % W - sx / n) ** 2 + (Math.floor(i / W) - sy / n) ** 2; if (d < bd) { bd = d; b = i; } }
    return [((b % W) + 0.5) / W, (Math.floor(b / W) + 0.5) / H]; };

  console.log("click to colour: the engine");
  {
    const rle = C.maskRLE(Uint8Array.from([0, 0, 1, 1, 1, 0, 1, 1])), back = C.maskFromRLE(rle, 8, 1);
    const big = new Uint8Array(360 * 480); for (let i = 0; i < big.length; i++) big[i] = (Math.sin(i / 97) > 0.3) ? 1 : 0;
    check(Array.from(back).join("") === "00111011" && C.maskFromRLE(C.maskRLE(big), 360, 480).every((v, i) => v === big[i]), "a mask kept as runs comes back exactly", `"${rle}"`);
    const inp = C.samInput(shot.rgba, W, H);
    check(inp.dims.join() === "1,3,1024,1024" && inp.nh === 1024 && inp.nw === 768 && Math.abs(inp.scale - 1.28) < 1e-9 && inp.data[1023] === 0, "the photo goes in at 1024 on its longer side, padded with zeros", `${inp.nw} × ${inp.nh}`);
    const pr = C.samPrompt([[0.5, 0.25, 1], [0.1, 0.9, 0]], W, H, inp.scale);
    check(Math.abs(pr.points.data[0] - 384) < 1e-3 && Math.abs(pr.points.data[1] - 256) < 1e-3 && pr.labels.data[0] === 1n && pr.labels.data[1] === 0n && pr.points.dims.join() === "1,1,2,2", "clicks become points in those 1024 pixels, on and off");
    // the truth's own triangles: a mask of the shirt from the raster, then painted through the camera
    const mw = 300, mh = 400, Rm = C.photoRaster(solid, "front", fit, mw, mh), truthMask = new Uint8Array(mw * mh);
    for (let i = 0; i < mw * mh; i++) if (Rm.id[i] >= 0 && cls[Rm.id[i]] === c("shirt")) truthMask[i] = 1;
    const seen = C.photoMaskTris(solid, "front", fit, truthMask, mw, mh, false), thru = C.photoMaskTris(solid, "front", fit, truthMask, mw, mh, true);
    const share = tris => { let r = 0, a = 0; for (const t of tris) { a += topo.area[t]; if (cls[t] === c("shirt")) r += topo.area[t]; } return r / Math.max(1e-9, a); };
    const backShirt = tris => { let n = 0; for (const t of tris) if (topo.nrm[3 * t + 2] < -0.3 && cls[t] === c("shirt")) n++; return n; };
    check(share(seen) > 0.97 && backShirt(seen) === 0 && share(thru) > 0.9 && backShirt(thru) > 500, "an outline of the shirt takes the shirt seen; right through, its back too",
      `seen ${(share(seen) * 100).toFixed(1)}% shirt, 0 at the back; through ${(share(thru) * 100).toFixed(1)}% shirt, ${backShirt(thru)} at the back`);
    if (!HAVE) console.log("  (the SlimSAM files are not in models/: the network checks are skipped. See models/LICENSE.md.)");
    else {
      let t0 = Date.now(); const E = Object.assign({ scale: inp.scale, nw: inp.nw, nh: inp.nh, w: W, h: H }, await encode(inp)); const tEnc = Date.now() - t0;
      const iou = (mask, nm) => { let tp = 0, fp = 0, fn = 0; for (let i = 0; i < mw * mh; i++) { const tr = Rm.id[i] >= 0 && cls[Rm.id[i]] === c(nm); if (mask[i] && tr) tp++; else if (mask[i]) fp++; else if (tr) fn++; } return tp / Math.max(1, tp + fp + fn); };
      const run = async pts => { const out = await decode(C.samPrompt(pts, W, H, E.scale), E); return C.samMask(out.masks, out.dims, out.iou, E.nw, E.nh, mw, mh, pts); };
      const res = [];
      for (const [nm, pts, want] of [["shirt", [[...clickOn("shirt"), 1]], 0.75], ["base", [[...clickOn("base"), 1]], 0.9], ["hair", [[...clickOn("hair"), 1]], 0.6],
                                     ["boots", [[...clickOn("boots", "left"), 1], [...clickOn("boots", "right"), 1]], 0.7]]) {
        t0 = Date.now(); const r = await run(pts), ms = Date.now() - t0, tris = C.photoMaskTris(solid, "front", fit, r.mask, mw, mh, false);
        let right = 0, a = 0; for (const t of tris) { a += topo.area[t]; if (cls[t] === c(nm)) right += topo.area[t]; }
        res.push({ nm, iou: iou(r.mask, nm), right: right / Math.max(1e-9, a), want, ms, n: pts.length });
      }
      for (const q of res) check(q.iou > q.want && q.right > 0.85, `${q.n === 1 ? "one click" : q.n + " clicks"} on the ${q.nm}: outlined, and what it paints is the ${q.nm}`,
        `overlap with the true ${q.nm} ${(q.iou * 100).toFixed(1)}%, ${(q.right * 100).toFixed(1)}% of what it paints right, ${q.ms} ms`);
      // a click off: two clicks on the shirt and one off on the arm keep the arm out
      const shirtArm = await run([[...clickOn("shirt"), 1]]);
      check(tEnc < 60000, "reading the photo once takes seconds, each click a fraction of one", `encoder ${tEnc} ms, decoder ${Math.max(...res.map(q => q.ms))} ms at most`);
      void shirtArm;
    }
  }
  if (process.env.CORE === "1") { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

  console.log("\nclick to colour on the Paint tab");
  const boot = require("./tools-test-env.js"), env = boot(process.argv[2] || "index.html");
  const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)], sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(800);
  const MF = win.MakerForge, e0 = env.errors.length;
  const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 2400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); } return false; };
  const raw = fig.raw, lines = [];
  for (let i = 0; i < raw.pos.length; i += 3) lines.push(`v ${raw.pos[i]} ${-raw.pos[i + 2]} ${raw.pos[i + 1]}`);
  for (let i = 0; i < raw.idx.length; i += 3) lines.push(`f ${raw.idx[i] + 1} ${raw.idx[i + 1] + 1} ${raw.idx[i + 2] + 1}`);
  MF.state.printer.colors = 6;
  await MF.paint.importModel(new win.File([lines.join("\n")], "footballer.obj")); await settle();
  $$("#tabs button").find(b => b.dataset.k === "paint").click(); await sleep(80);
  await MF.paint.photo.add([new win.File([boot.encodePNG(W, H, shot.rgba)], "front.png", { type: "image/png" })]); await settle();
  const op = MF.paint.photo.op, v = op && op.views[0], S = MF.paint.photo.sam;
  check(v && v.fit && v.match > 0.8, "the photo lines up", v && `outline ${(v.match * 100).toFixed(0)}%`);
  // the network: the real one when its files are here, else a stand-in that outlines the true part under the click
  if (HAVE) { S.hooks.encode = encode; S.hooks.decode = decode; }
  else {
    S.hooks.encode = async inp => ({ emb: null, pos: null });
    S.hooks.decode = async (pr, E) => { const m = 256, out = new Float32Array(3 * m * m).fill(-5), x = pr.points.data[0] / E.scale, y = pr.points.data[1] / E.scale, t = R.id[Math.floor(y) * W + Math.floor(x)];
      for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const px = Math.floor((i + 0.5) / m * 1024 / E.scale), py = Math.floor((j + 0.5) / m * 1024 / E.scale); if (px < W && py < H) { const u = R.id[py * W + px]; if (u >= 0 && t >= 0 && cls[u] === cls[t]) out[j * m + i] = 5; } }
      return { masks: out, dims: [1, 1, 3, m, m], iou: Float32Array.from([0.9, 0.5, 0.5]) }; };
  }
  // the tool, and a click on the shirt with the pointer
  const tool = $$("#panel .seg.tool button").find(b => /Click to colour/.test(b.textContent)); tool && tool.click(); await sleep(60);
  const cv = document.querySelector("canvas.photoPrev");
  check(tool && cv && cv.classList.contains("clicking") && /Click on a part of the photo/.test(document.querySelector("#panel").textContent), "✨ Click to colour on the photo card");
  const [fx, fy] = clickOn("shirt"), ev = new win.MouseEvent("pointerdown", { bubbles: true, cancelable: true, clientX: fx * cv.width - cv.width / 2, clientY: fy * cv.height - cv.height / 2, button: 0 });
  cv.dispatchEvent(ev);
  for (let i = 0; i < 600 && !(S.click.res && !S.click.busy); i++) await sleep(100);
  await sleep(200);
  const res = S.click.res;
  check(res && res.mask.some(Boolean) && Math.abs(S.click.points[0][0] - fx) < 0.01 && /the outline covers \d+% of the photo/.test(document.querySelector("#panel").textContent), "a click on the shirt outlines it and says how much it covers",
    res && `${res.w} × ${res.h}, ${Math.round(res.mask.reduce((a, b) => a + b, 0) / res.mask.length * 100)}% of the photo`);
  // painted in a filament no other part has: what takes it is the shirt
  const part = MF.parts[0], pc = part.pc, grid = C.triangleGrid(topo, 2), ptopo = pc.topo, ptruth = new Int8Array(ptopo.n).fill(-1);
  for (let t = 0; t < ptopo.n; t++) { let bd = Infinity; const x = ptopo.cen[3 * t], y = ptopo.cen[3 * t + 1], z = ptopo.cen[3 * t + 2];
    grid.near(x, y, z, 3, u => { const d = (topo.cen[3 * u] - x) ** 2 + (topo.cen[3 * u + 1] - y) ** 2 + (topo.cen[3 * u + 2] - z) ** 2; if (d < bd && topo.nrm[3 * u] * ptopo.nrm[3 * t] + topo.nrm[3 * u + 1] * ptopo.nrm[3 * t + 1] + topo.nrm[3 * u + 2] * ptopo.nrm[3 * t + 2] > 0.3) { bd = d; ptruth[t] = cls[u]; } }); }
  MF.state.slots.push({ hex: "#ff00ff", name: "Magenta", mat: "PLA", price: 20 }); const mag = MF.state.slots.length - 1; MF.paint.ui.slot = mag; MF.render(); await sleep(60);
  const paintBtn = $$("#panel button").find(b => b.textContent === "Paint it"); paintBtn && paintBtn.click(); await sleep(300); await settle();
  const last = MF.state.paint.ops[MF.state.paint.ops.length - 1];
  const tally = () => { let on = 0, right = 0, back = 0; part.paint.forEach((s, t) => { if (s !== mag) return; on++; if (ptruth[t] === c("shirt")) right++; if (ptopo.nrm[3 * t + 2] < -0.3) back++; }); return { on, right, back }; };
  const a = tally();
  check(paintBtn && last && last.k === "photoarea" && last.asset === v.asset && a.on > 1000 && a.right / a.on > 0.9 && a.back === 0, "Paint it: the shirt seen in the photo takes the filament, the back doesn't",
    `${a.on} triangles, ${(a.right / Math.max(1, a.on) * 100).toFixed(1)}% shirt, ${a.back} at the back`);
  last.through = true; MF.paint.repaint(); const b = tally();
  check(b.back > 300 && b.right / b.on > 0.85, "right through: the back of the shirt too", `${b.on} triangles, ${(b.right / Math.max(1, b.on) * 100).toFixed(1)}% shirt, ${b.back} at the back`);
  check(/Clicked on a photo/.test(document.querySelector("#panel").textContent) || MF.paint.opText(last).includes("right through"), "the step is named on the Paint list", MF.paint.opText ? MF.paint.opText(last) : "");
  // a project keeps it; a hostile one is cleaned
  const prj = JSON.parse(MF.projectPayload()); const kept = prj.state.paint.ops.find(o => o.k === "photoarea");
  const clean = MF.paint.cleanPaint({ on: true, ops: [kept, { k: "photoarea", asset: "<img src=x>", w: 1e9, h: -4, rle: "zz<script>", slot: 99 }, { k: "photoarea", asset: "a1", w: 20, h: 20, rle: "x".repeat(400000), slot: 0 },
    Object.assign({}, kept, { w: 5000 })] });
  check(kept && kept.rle === last.rle && clean.ops.length === 2 && clean.ops[0].rle === kept.rle && clean.ops[1].w === 1024,
    "a project keeps the outline; a hostile step is left out or clamped", clean.ops.map(o => `${o.k} ${o.w}×${o.h} "${o.name || ""}"`).join(", ") + ` kept=${!!kept} same=${kept && kept.rle === last.rle} c0=${clean.ops[0] && clean.ops[0].rle === (kept || {}).rle}`);
  // the photo gone: the step paints nothing and nothing breaks
  const views = op.views.splice(0, 1); MF.paint.repaint(); const g = tally(); op.views.unshift(...views); MF.paint.repaint();
  check(g.on === 0, "with its photo gone the step paints nothing (and says so on the list)", MF.paint.opText ? MF.paint.opText(last) : "");
  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log(e.stack); process.exit(1); });
