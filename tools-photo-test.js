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

const { PART_NAMES, PAL, NAMES, figure, truth, outside, render, score, onBusyBackground, onShelfBackground, KIT, KIT_NAMES, kitTruth, keyLight, productPhoto } = require("./tools-photo-figure.js")(C);
// the AI figure finder (Session 17): the small U²-Net run by ONNX Runtime (a dev dependency here; the app
// downloads it from jsDelivr when asked), with the same picture in and out as the app
const fs = require("fs"), MODEL = path.join(__dirname, "models", "u2netp.onnx");
let ortSession = null;
async function netRaw(input, S) {                    // the network itself: input 1 x 3 x S x S, its first output
  const ort = require("onnxruntime-web");
  if (!ortSession) { ort.env.wasm.numThreads = 1; ortSession = await ort.InferenceSession.create(fs.readFileSync(MODEL)); }
  const out = await ortSession.run({ [ortSession.inputNames[0]]: new ort.Tensor("float32", Float32Array.from(input), [1, 3, S, S]) });
  return out[ortSession.outputNames[0]].data;
}
async function figureNet(rgba, w, h) { return C.photoNetOutput(await netRaw(C.photoNetInput(rgba, w, h, 320), 320), 320); }

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
  if (process.env.VERBOSE) { let bi = 0, bu = 0; for (let i = 0; i < W * H; i++) { if (mb[i] && back.mask[i]) bi++; if (mb[i] || back.mask[i]) bu++; } console.log(`    back photo: figure found ${(bi / bu * 100).toFixed(1)}%, outlines overlap ${(Fb.iou * 100).toFixed(1)}%`); }
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

  // 5b. the AI figure finder: a plain background, then a busy one where the colour method gets lost
  {
    const overlap = (m, truthMask) => { let a = 0, b = 0; for (let i = 0; i < W * H; i++) { if (m[i] && truthMask[i]) a++; if (m[i] || truthMask[i]) b++; } return a / b; };
    t0 = Date.now(); const mapPlain = await figureNet(front.rgba, W, H), netMs = Date.now() - t0;
    const aiPlain = C.photoMaskFromMap(mapPlain, 320, 320, W, H);
    check(overlap(aiPlain, front.mask) > 0.9, "AI figure finder: the figure on a plain background", `overlap ${(overlap(aiPlain, front.mask) * 100).toFixed(1)}%, ${netMs} ms (the first run loads the model)`);
    const busy = onBusyBackground(front, W, H, 7), colourBusy = C.photoMask(busy.rgba, W, H, 35);
    t0 = Date.now(); const mapBusy = await figureNet(busy.rgba, W, H), busyMs = Date.now() - t0;
    const aiBusy = C.photoMaskFromMap(mapBusy, 320, 320, W, H);
    const fc = C.photoFit(fig.raw, "front", colourBusy, W, H, false), fa = C.photoFit(fig.raw, "front", aiBusy, W, H, false);
    const off = f => f ? [Math.abs(f.fit.a / trueFront.a - 1), Math.hypot(f.fit.tx - trueFront.tx, f.fit.ty - trueFront.ty)] : [9, 9];
    const [ca, ct] = off(fc), [aa, at] = off(fa);
    check(overlap(colourBusy, busy.mask) < 0.5 && ca > 0.2, "on a busy background the colour method loses the figure (why the AI is there)",
      `overlap ${(overlap(colourBusy, busy.mask) * 100).toFixed(1)}%, size off ${(ca * 100).toFixed(0)}%`);
    check(overlap(aiBusy, busy.mask) > 0.75 && aa < 0.05 && at < 0.015, "the AI finds it there (a worst case: a red disc hugs the head), and the photo lines up roughly",
      `overlap ${(overlap(aiBusy, busy.mask) * 100).toFixed(1)}%, size off ${(aa * 100).toFixed(1)}%, place off ${(at * 100).toFixed(2)}% of the height, ${busyMs} ms`);
    // an everyday busy background: a bookshelf behind the figure
    const shelf = onShelfBackground(front, W, H, 11), aiShelf = C.photoMaskFromMap(await figureNet(shelf.rgba, W, H), 320, 320, W, H), colourShelf = C.photoMask(shelf.rgba, W, H, 35);
    const fs2 = C.photoFit(fig.raw, "front", aiShelf, W, H, false, null, false, { extra: 0.7 }), [sa, st] = off(fs2);
    check(overlap(aiShelf, shelf.mask) > 0.8 && overlap(colourShelf, shelf.mask) < 0.6 && sa < 0.02 && st < 0.01, "in front of a bookshelf: the AI finds the figure (the colour method does not) and it lines up closely",
      `AI ${(overlap(aiShelf, shelf.mask) * 100).toFixed(1)}%, by colour ${(overlap(colourShelf, shelf.mask) * 100).toFixed(1)}%, size off ${(sa * 100).toFixed(1)}%, place off ${(st * 100).toFixed(2)}%`);
    const tiny = await figureNet(front.rgba.slice(0, 4 * 40 * 30), 40, 30);
    check(tiny.length === 320 * 320 && tiny.some(v => v > 0), "a photo smaller than the network's 320 pixels works too");
  }

  // 5c. a product photo (v0.22.1, the owner's case): a figure in a red and green kit lit hard from the right, a
  // camera at chest height and close by, a dark background with a grey copy of the figure behind it, icons and
  // a size label. Today's way lined it up from the side and took the red in shade for a colour of its own.
  console.log("  a product photo: lit from one side, taken from close by, a grey copy behind");
  const kit = kitTruth(topo, fig.partOf), PW = 900, PH = 675, KL = [0.73, 0.53, 0.44].map((v, _, a) => v / Math.hypot(...a));
  t0 = Date.now(); const kLight = keyLight(solid, topo, KL), lightMs = Date.now() - t0;
  const pCam = { yaw: 0, pitch: 10 }, pFit = { a: 5.2 / PH, tx: 560 / PH, ty: 600 / PH, rot: 0, mirror: false, k: 0.45 };
  const prod = productPhoto(solid, topo, kit, pCam, pFit, PW, PH, kLight, { amb: 0.06, copy: { a: 4.2 / PH, tx: 330 / PH, ty: 520 / PH, rot: 0, mirror: false, k: 0.45 } });
  const pAI = C.photoMaskFromMap(await figureNet(prod.rgba, PW, PH), 320, 320, PW, PH);
  const seenBy = (cam, f) => { const R = C.photoRaster(solid, cam, f, PW, PH), sn = new Uint8Array(topo.n); for (const t of R.id) if (t >= 0) sn[t] = 1; return Uint8Array.from(out, (o, t) => o && sn[t] ? 1 : 0); };
  const pSeen = seenBy(pCam, pFit);
  // colour the figure the way the app does: colours from inside the lined-up model, then every triangle
  const colourBy = (F, shade, strict, minInner) => {
    let img = prod.rgba, L = null;
    if (shade) { const use = C.photoModelMask(fig.raw, F.cam, F.fit, PW, PH, 3); for (let i = 0; i < PW * PH; i++) if (!pAI[i]) use[i] = 0;
      L = C.photoLight(prod.rgba, PW, PH, fig.raw, F.cam, F.fit, use); img = C.photoUnshade(prod.rgba, PW, PH, fig.raw, F.cam, F.fit, L, pAI); }
    const rim = Math.max(2, Math.round(0.02 * F.fit.a * C.photoRef(fig.raw, F.cam)[3] * PH)), pal = C.photoPalette(img, C.photoModelMask(fig.raw, F.cam, F.fit, PW, PH, rim), PW, PH, 5);
    const v = C.photoView(img, PW, PH, solid, F.cam, F.fit, pal, pAI, strict), p = new Uint8Array(topo.n).fill(255);
    C.paintFromPhotos(solid, topo, p, [v], { slots: pal.map((_, i) => i), fill: true, speck: 1, smooth: true, minInner });
    return { L, pal, img, p, seen: score(topo, p, kit, pSeen), all: score(topo, p, kit, out) };
  };
  t0 = Date.now(); const Fold = C.photoFit(fig.raw, "front", pAI, PW, PH, false, { yaw: 45, pitch: 20 }, false, { extra: 0.7 });
  const Fnew = C.photoFitFull(fig.raw, "front", pAI, PW, PH, false, { yaw: 45, pitch: 20 }, { extra: 0.7 }), fullMs = Date.now() - t0;
  check(Fnew && Fnew.iou > 0.9 && Math.abs(Fnew.fit.k - 0.45) < 0.15 && Math.abs(Fnew.cam.yaw) <= 5 && Math.abs(Fnew.cam.pitch - 10) <= 8 && Math.abs(Fnew.fit.a / pFit.a - 1) < 0.04,
    "the photo lines up on the figure, not on the icons or the grey copy, and how close the camera was is found",
    Fnew && `outline ${(Fnew.iou * 100).toFixed(1)}%, ${Fnew.cam.yaw}° round, ${Fnew.cam.pitch}° up (really 0° and 10°), closeness ${Fnew.fit.k} (really 0.45), size off ${((Fnew.fit.a / pFit.a - 1) * 100).toFixed(1)}%, ${fullMs} ms with the search from far away; the scene's light took ${lightMs} ms`);
  const pBefore = colourBy(Fold, false, false, 0.2), pAfter = colourBy(Fnew, true, true, undefined);
  const ang = Math.acos(Math.min(1, pAfter.L.dir[0] * KL[0] + pAfter.L.dir[1] * KL[1] + pAfter.L.dir[2] * KL[2])) * 180 / Math.PI;
  check(pAfter.L && ang < 12 && Math.abs(pAfter.L.amb - 0.06) < 0.08 && pAfter.L.shadows, "the light is found from the photo and the model's shape: its direction, the fill and the model's own shadows",
    pAfter.L && `${ang.toFixed(1)}° off, fill ${pAfter.L.amb} (really 0.06, less the room's occlusion), explains ${(pAfter.L.fit * 100).toFixed(0)}% of the shading`);
  const kitDE = pal => KIT_NAMES.map(nm => Math.min(...pal.map(q => dE(q.rgb, KIT[nm]))));
  check(pAfter.pal.length === 5 && kitDE(pAfter.pal).every(d => d < 25), "with the light taken out, the five colours are the five paints (no red in shade as a colour of its own)",
    `${KIT_NAMES.map((nm, i) => `${nm} ΔE ${kitDE(pAfter.pal)[i].toFixed(0)}`).join(", ")}; without: ${KIT_NAMES.map((nm, i) => `${nm} ΔE ${kitDE(pBefore.pal)[i].toFixed(0)}`).join(", ")}`);
  let clear = 0; for (let i = 0; i < PW * PH; i++) if (pAfter.img[4 * i + 3] === 0) clear++;
  check(clear > 0 && clear < PW * PH * 0.02, "pixels too dark to read are left out, not made into some colour", `${clear} pixels`);
  check(pAfter.seen > 0.9 && pAfter.seen > pBefore.seen + 0.05 && pAfter.all > pBefore.all + 0.05, "coloured from it: far more of the figure right than before",
    `what the photo shows ${(pBefore.seen * 100).toFixed(1)}% → ${(pAfter.seen * 100).toFixed(1)}%, the whole figure ${(pBefore.all * 100).toFixed(1)}% → ${(pAfter.all * 100).toFixed(1)}% (the back from one photo is a guess)`);
  // evenly lit (every colour exactly the same everywhere): nothing to take out
  const flat = new Uint8ClampedArray(prod.rgba); { const R = C.photoRaster(solid, pCam, pFit, PW, PH); for (let i = 0; i < PW * PH; i++) if (R.id[i] >= 0) flat.set(KIT[KIT_NAMES[kit[R.id[i]]]], 4 * i); }
  check(C.photoLight(flat, PW, PH, fig.raw, Fnew.cam, Fnew.fit, null) === null, "an evenly lit photo: no light to take out");
  // the top of the base, seen from a little above: read from the photo, not guessed from its front
  const top = []; for (let t = 0; t < topo.n; t++) if (fig.partOf[t] === 0 && topo.nrm[3 * t + 1] > 0.9 && pSeen[t]) top.push(t);
  const viewTop = C.photoView(pAfter.img, PW, PH, solid, Fnew.cam, Fnew.fit, pAfter.pal, pAI, true), sl = pAfter.pal.map((_, i) => i);
  const pTop = mi => { const p = new Uint8Array(topo.n).fill(255); C.paintFromPhotos(solid, topo, p, [viewTop], { slots: sl, fill: false, speck: 0, smooth: false, minInner: mi }); return top.filter(t => p[t] !== 255).length / top.length; };
  check(top.length > 100 && pTop(undefined) > 0.8, "the top of the base, seen at a low angle from close by, is read from the photo", `${top.length} triangles, ${(pTop(undefined) * 100).toFixed(0)}% read (${(pTop(0.2) * 100).toFixed(0)}% when only squarely seen faces count)`);

  // 6. a denser model: time
  const ed = C.meshEditor(solid); ed.refine(0.9, 900000);
  const dense = ed.solid(), dtopo = C.meshTopology(dense);
  t0 = Date.now();
  const p4 = new Uint8Array(dtopo.n).fill(255); C.paintFromPhotos(dense, dtopo, p4, [{ cam: "front", fit: F.fit, cls: clsF }, { cam: "back", fit: Fb.fit, cls: clsB }], { slots, fill: true, speck: 1 });
  const ms4 = Date.now() - t0;
  check(ms4 < 15000, "a model of a few hundred thousand triangles colours in seconds", `${dtopo.n} triangles, ${ms4} ms`);

  if (process.env.CORE || !process.argv[2]) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

  // ---- 7. the Paint tab: import the plain figure, drop the two photos on it, and check what comes out ----
  console.log("\nthe Paint tab");
  const boot = require("./tools-test-env.js"), env = boot(process.argv[2]);
  const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(800);
  const MF = win.MakerForge;
  const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 2400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); } return false; };
  const pageErrors = () => env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  // the figure as an OBJ file, Z up like a printer's (the app turns it Y up)
  const raw = fig.raw, lines = [];
  for (let i = 0; i < raw.pos.length; i += 3) lines.push(`v ${raw.pos[i]} ${-raw.pos[i + 2]} ${raw.pos[i + 1]}`);
  for (let i = 0; i < raw.idx.length; i += 3) lines.push(`f ${raw.idx[i] + 1} ${raw.idx[i + 1] + 1} ${raw.idx[i + 2] + 1}`);
  MF.state.printer.colors = 6;                         // a printer that loads six filaments: six colours by default
  await MF.paint.importModel(new win.File([lines.join("\n")], "footballer.obj")); await settle();
  $$("#tabs button").find(b => b.dataset.k === "paint").click(); await sleep(80);
  check(MF.paint.ui.method === "photo" && document.querySelector("#photoDrop"), "an imported plain model opens the Paint tab on colouring from a photo");
  const png = (img, name) => new win.File([boot.encodePNG(W, H, img.rgba)], name, { type: "image/png" });
  t0 = Date.now();
  await MF.paint.photo.add([png(front, "front.png"), png(back, "back.png")]); await settle();
  const addMs = Date.now() - t0, op = MF.paint.photo.op, part = MF.parts[0];
  check(op && op.views.length === 2 && op.views.every(v => v.fit && v.match > 0.8) && Math.abs(op.views[0].cam.yaw) <= 10 && Math.abs(Math.abs(op.views[1].cam.yaw) - 180) <= 10,
    "both photos line up by themselves, the first from the front and the second from the back (white shorts on a white background lower the match)", op && `${op.views.map(v => `${v.name}: ${v.cam.yaw}° round, ${v.cam.pitch}° up, outline ${(v.match * 100).toFixed(0)}%`).join("; ")}, ${addMs} ms in all`);
  const slotRgb = MF.state.slots.map(s => C.hexToRgb(s.hex));
  const near6 = seenNames.map(nm => Math.min(...op.slots.map(s => dE(slotRgb[s], PAL[nm]))));
  check(op.pal.length === 6 && MF.state.slots.length >= 6 && near6.every(d => d < 25), "the filaments are set to the photos' six colours, with plain names",
    MF.state.slots.map(s => `${s.name} ${s.hex}`).join(", "));
  // how much of the painted figure is right: each triangle against the nearest one of the labelled figure
  const grid = C.triangleGrid(topo, 2);
  const accuracy = (q, k, truthCls = cls) => {       // k: how much bigger the imported model is than the figure
    const ptopo = q.pc.topo, pout = outside(q.pc.solid, ptopo), ptruth = new Int8Array(ptopo.n).fill(-1);
    for (let t = 0; t < ptopo.n; t++) {
      let bd = Infinity; const x = ptopo.cen[3 * t] / k, y = ptopo.cen[3 * t + 1] / k, z = ptopo.cen[3 * t + 2] / k;
      grid.near(x, y, z, 3, u => { if (topo.nrm[3 * u] * ptopo.nrm[3 * t] + topo.nrm[3 * u + 1] * ptopo.nrm[3 * t + 1] + topo.nrm[3 * u + 2] * ptopo.nrm[3 * t + 2] < 0.3) return;
        const d = (topo.cen[3 * u] - x) ** 2 + (topo.cen[3 * u + 1] - y) ** 2 + (topo.cen[3 * u + 2] - z) ** 2; if (d < bd) { bd = d; ptruth[t] = truthCls[u]; } });
      if (ptruth[t] < 0) pout[t] = 0;
    }
    return { acc: score(ptopo, q.paint, ptruth, pout), n: ptopo.n };
  };
  const { acc: accApp, n: nApp } = accuracy(part, 1), ptopo = { n: nApp };
  check(accApp > 0.93 && part.paint.every(s => s !== 255), "the figure comes out coloured all over, nearly all of it right",
    `${(accApp * 100).toFixed(1)}% of the surface, ${ptopo.n} triangles`);
  const info = MF.paint.photo.info(op);
  check(info && info.seen > 0.6 * info.n && /The photos show \d+% of the model/.test(document.querySelector("#panel").textContent), "the card says how much of the model the photos show",
    info && `${info.seen} of ${info.n} triangles seen`);
  // the preview: the photo with the model's outline on it in yellow
  const cv = document.querySelector("canvas.photoPrev"), px = cv && cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  let yellow = 0; if (px) for (let i = 0; i < px.length; i += 4) if (px[i] === 255 && px[i + 1] === 214 && px[i + 2] === 0) yellow++;
  check(cv && yellow > 200, "the preview shows the lined-up outline", `${yellow} outline pixels on a ${cv && cv.width} × ${cv && cv.height} preview`);
  // nudging: the arrow keys on the preview move the photo, not the brush or the tabs
  const sel = op.views[MF.paint.ui.photo], tx0 = sel.fit.tx, a0 = sel.fit.a;
  const press = k => { const e = new win.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }); cv.dispatchEvent(e); return e.defaultPrevented; };
  const took = press("ArrowRight") && press("+");
  check(took && Math.abs(sel.fit.tx - tx0 - 0.005) < 0.002 && Math.abs(sel.fit.a / a0 - 1.01) < 1e-9, "the arrow keys and + on the preview nudge and resize the photo",
    `tx ${tx0.toFixed(4)} → ${sel.fit.tx.toFixed(4)}, size ×${(sel.fit.a / a0).toFixed(3)}`);
  sel.fit.a = a0;
  sel.fit.tx = tx0; await sleep(600); await settle();
  // a brush stroke after the photo step does not colour it all again
  t0 = Date.now(); MF.paint.repaint(); const again = Date.now() - t0;
  MF.state.paint.ops.push({ k: "brush", slot: 0, r: 2, pts: [[0, 92, 10]], facing: null }); t0 = Date.now(); MF.paint.repaint(); const stroke = Date.now() - t0;
  check(stroke < 1500 && part.paint.some((s, t) => s === 0), "a brush stroke on top stays quick: the photo step's result is kept", `repaint ${again} ms, with a stroke ${stroke} ms`);
  MF.state.paint.ops.pop(); MF.paint.repaint();
  // my own filaments instead: every colour prints in the nearest loaded one
  const before = op.slots.slice(); MF.state.slots.splice(0, MF.state.slots.length,
    { hex: "#ffffff", name: "White", mat: "PLA", price: 20 }, { hex: "#111111", name: "Black", mat: "PLA", price: 20 }, { hex: "#c81e28", name: "Red", mat: "PLA", price: 20 }, { hex: "#1e5ac8", name: "Blue", mat: "PLA", price: 20 });
  MF.paint.photo.nearest(op); MF.paint.repaint();
  const want = { white: 0, hair: 1, shirt: 2, boots: 3 }, got = Object.keys(want).map(nm => op.slots[op.pal.map(p => dE(p.rgb, PAL[nm])).indexOf(Math.min(...op.pal.map(p => dE(p.rgb, PAL[nm]))))]);
  check(Object.values(want).every((s, i) => got[i] === s) && op.use === "mine", "with my own four filaments, each photo colour prints in the nearest one", `was ${before.join(",")}, now ${op.slots.join(",")}`);
  // the card's own controls: fewer colours, and the hidden parts left alone
  const field = re => $$("#panel .field").find(w => re.test((w.querySelector("label") || {}).textContent || ""));
  const numIn = field(/^Number of colours/).querySelector("input[type=number]"); numIn.value = "4"; numIn.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 200 && op.pal.length !== 4; i++) await sleep(50);
  for (let i = 0; i < 100 && !(MF.paint.photo.info(op) && part.paint.every(s => op.slots.includes(s))); i++) await sleep(50);
  const used4 = [...new Set(part.paint)];
  check(op.pal.length === 4 && op.slots.length === 4 && used4.every(s => op.slots.includes(s)) && $$("#panel select").filter(x => /prints in/.test((x.labels[0] || {}).textContent)).length === 4,
    "\"Number of colours\" picks four colours from the photos, each printed in one of my filaments", `${op.pal.map(p => C.rgbToHex(...p.rgb)).join(" ")} → filaments ${op.slots.join(",")}`);
  const fillBox = $$("#panel label.check").find(l => /cannot see/.test(l.textContent)).querySelector("input");
  fillBox.checked = false; fillBox.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 200 && !part.paint.some(s => s === 255); i++) await sleep(50);
  const left = part.paint.filter(s => s === 255).length, inf = MF.paint.photo.info(op);
  check(left > 0 && inf && Math.abs(left - (inf.n - inf.seen)) < inf.n * 0.02, "unticking the hidden-parts fill leaves what the photos cannot see in the model's own colour",
    `${left} of ${part.paint.length} triangles left, ${inf && inf.n - inf.seen} unseen`);
  fillBox.checked = true; fillBox.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 200 && part.paint.some(s => s === 255); i++) await sleep(50);
  await sleep(300); await settle();

  // a project file keeps the photos, the fit and the colours
  const sig = () => JSON.stringify(MF.state.paint), payload = MF.projectPayload(true), paintBefore = Array.from(part.paint), sig0 = sig();
  const inp = document.querySelector("#projInput"), open = async text => {
    const f = new win.File([text], "p.json", { type: "application/json" }), r1 = MF.rev;
    Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r1; i++) await sleep(30); return settle();
  };
  await open(payload);
  const kept = Object.keys(JSON.parse(payload).assets || {});
  check(sig() === sig0 && kept.length === 2 && MF.parts[0].paint && MF.parts[0].paint.every((s, t) => s === paintBefore[t]), "saved and opened again: the same photos, fit, colours and paint",
    `${kept.length} pictures in the file, ${(payload.length / 1024).toFixed(0)} KB`);

  // the imported model made bigger on the Make tab: the photos follow it
  const acc100 = accuracy(MF.parts[0], 1).acc;
  MF.state.base.stl.scale = 150; MF.rebuild(false); await settle();
  const big = MF.parts[0], acc150 = accuracy(big, 1.5).acc;
  check(acc150 > acc100 - 0.01, "the model made 1.5 times bigger afterwards: the photos follow it", `${(acc100 * 100).toFixed(1)}% of the surface right with four colours, ${(acc150 * 100).toFixed(1)}% at 150%`);
  MF.state.base.stl.scale = 100; MF.rebuild(false); await settle();

  // ---- 7b. a photo on a busy background, and the AI figure finder (the network run here in Node) ----
  console.log("\na photo in front of a bookshelf");
  MF.state.paint.ops.length = 0; MF.paint.repaint(); await settle();
  const busyFront = onShelfBackground(front, W, H, 11);
  await MF.paint.photo.add([png(busyFront, "shelf.png")]); await settle();
  const bop = MF.paint.photo.op, bv = bop.views[0], byColour = { match: bv.match, a: bv.fit ? Math.abs(bv.fit.a / trueFront.a - 1) : 9, acc: accuracy(MF.parts[0], 1).acc };
  const aiBtn = () => $$("#panel button").find(b => /Find the figure with AI/.test(b.textContent));
  // by colour the figure found takes in books round it; since v0.22.1 the parts the model does not reach are
  // left out of lining up, so it lines up roughly (it did not before: 45% outline, 54% of the surface right)
  check(aiBtn() && byColour.a < 0.05 && byColour.acc > 0.6, "by colour it lines up roughly (the books round it are left out of lining up), and the card offers the AI figure finder",
    `outline ${(byColour.match * 100).toFixed(0)}%, size off ${(byColour.a * 100).toFixed(0)}%, ${(byColour.acc * 100).toFixed(1)}% of the surface right`);
  let netCalls = 0; MF.paint.photo.ai.hooks.run = async (input, S) => { netCalls++; return netRaw(input, S); };
  aiBtn().click();
  for (let i = 0; i < 600 && !(bv.ai && MF.paint.photo.info(bop) && !/Finding|Lining|Colouring/.test(document.querySelector("#statusLine").textContent)); i++) await sleep(50);
  await sleep(600); await settle();
  const aiMap = MF.paint.photo.ai.mapOf(bv.ai), sizeOff = Math.abs(bv.fit.a / trueFront.a - 1), placeOff = Math.hypot(bv.fit.tx - trueFront.tx, bv.fit.ty - trueFront.ty);
  check(netCalls === 1 && aiMap && aiMap.w === 320 && bv.match > 0.75 && sizeOff < 0.03 && placeOff < 0.01 && Math.abs(bv.cam.yaw) <= 10,
    "Find the figure with AI: the photo lines up", `outline ${(bv.match * 100).toFixed(0)}%, size off ${(sizeOff * 100).toFixed(1)}%, place off ${(placeOff * 100).toFixed(2)}%, ${bv.cam.yaw}° round`);
  const accBusy = accuracy(MF.parts[0], 1).acc;
  check(accBusy > 0.78 && accBusy > byColour.acc && MF.parts[0].paint.every(s => s !== 255), "and the figure is coloured from it nearly as well as from a plain background (one photo, so the back is a guess)",
    `${(accBusy * 100).toFixed(1)}% of the surface right, ${(byColour.acc * 100).toFixed(1)}% by colour`);
  check($$("#panel button").some(b => /by colour instead/.test(b.textContent)) && /AI figure finder found the figure/.test(document.querySelector("#panel").textContent),
    "the card says the AI found it, and offers the colour method back");
  // saved and opened again with no AI at hand: the grey picture it made is in the file, so the paint is the same
  MF.paint.photo.ai.hooks.run = null;
  const bPaint = Array.from(MF.parts[0].paint), bPayload = MF.projectPayload(true), bKept = Object.keys(JSON.parse(bPayload).assets || {});
  await open(bPayload);
  const bv2 = MF.paint.photo.op.views[0];
  check(bKept.includes(bv.ai) && bv2.ai === bv.ai && MF.paint.photo.ai.mapOf(bv2.ai) && MF.parts[0].paint.every((s, t) => s === bPaint[t]),
    "saved and opened again without the AI: its outline is in the file and the paint is the same", `${bKept.length} pictures in the file`);

  // ---- 7b2. the figure fixed by hand (Session 20): the bookshelf photo again, without the AI. A careful but
  // quick maker: big "Take away" strokes across the background that keep clear of the figure, then smaller
  // "Add to the figure" strokes down its middle, then Line it up again ----
  console.log("\nthe figure fixed by hand");
  {
    MF.state.paint.ops.length = 0; MF.paint.repaint(); await settle();
    await MF.paint.photo.add([png(busyFront, "shelf.png")]); await settle();
    const fop = MF.paint.photo.op, fv = fop.views[0], acc0 = accuracy(MF.parts[0], 1).acc, match0 = fv.match;
    const tool = re => $$("#panel .seg.tool button").find(b => re.test(b.textContent));
    tool(/Take away/).click(); await sleep(80);
    let cv = document.querySelector("canvas.photoPrev");
    const navy = c => { const q = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < q.length; i += 4) if (q[i + 2] >= 60 && q[i + 2] <= 112 && q[i] <= 66 && q[i] >= 14) n++; return n / (q.length / 4); };
    const dark0 = navy(cv);
    check(MF.paint.ui.photoTool === "cut" && MF.paint.ui.photoShow === "figure" && cv.classList.contains("fixing") && $$("#panel .field label").some(l => /Brush size/.test(l.textContent)) && dark0 > 0.2,
      "Take away: a brush with its size, and the photo shows the figure it found, the rest darkened", `${(dark0 * 100).toFixed(0)}% of the preview darkened`);
    // how far every pixel is from the true figure (dOut) and from the background (dIn), in pixels
    const dist = inside => { const d = new Float32Array(W * H).fill(1e9), q = []; for (let i = 0; i < W * H; i++) if (inside(i)) { d[i] = 0; q.push(i); }
      for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, j = Y * W + X;
        if (X >= 0 && Y >= 0 && X < W && Y < H && d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } } } return d; };
    const dOut = dist(i => busyFront.mask[i]), dIn = dist(i => !busyFront.mask[i]);
    cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: cv.width, height: cv.height, right: cv.width, bottom: cv.height });
    const ev = (type, fx, fy) => cv.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, clientX: fx * cv.width, clientY: fy * cv.height }));
    // strokes along rows, broken wherever the brush would come within `gap` of the other side
    const rows = (r, gap, step, far) => { let n = 0;
      for (let fy = step / 2; fy < 1; fy += step) { let on = false;
        for (let fx = 0; fx <= 1.0001; fx += 0.01) { const i = Math.min(H - 1, Math.round(fy * H)) * W + Math.min(W - 1, Math.round(fx * W)), ok = far[i] > (r + gap) * H;
          if (ok && !on) { ev("pointerdown", fx, fy); on = true; n++; } else if (ok) ev("pointermove", fx, fy); else if (on) { ev("pointerup", fx, fy); on = false; } }
        if (on) ev("pointerup", 1, fy); }
      return n; };
    // a pass: pick the tool and the brush, then the strokes
    const pass = async (re, r, gap, step, far) => {
      MF.paint.ui.photoFixR = r * 100; tool(re).click(); await sleep(80); cv = document.querySelector("canvas.photoPrev");
      cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: cv.width, height: cv.height, right: cv.width, bottom: cv.height });
      return rows(r, gap, step, far); };
    // big strokes first, then (seeing what is still wrong in the darkened photo) a small brush near the edges
    const nCut = await pass(/Take away/, 0.04, 0.015, 0.05, dOut) + await pass(/Take away/, 0.01, 0.005, 0.01, dOut);
    const nAdd = await pass(/Add to the figure/, 0.02, 0.01, 0.025, dIn) + await pass(/Add to the figure/, 0.005, 0.003, 0.006, dIn);
    for (let i = 0; i < 100 && !/fixes by hand/.test(document.querySelector("#panel").textContent); i++) await sleep(50);
    await sleep(300); await settle();
    // the figure it finds now, against the true one
    const maskNow = MF.paint.photo.figure(fv, W, H); let a = 0, b = 0, a0 = 0, b0 = 0; const found0 = C.photoMask(busyFront.rgba, W, H, fv.tol);
    for (let i = 0; i < W * H; i++) { const t = busyFront.mask[i]; if (maskNow[i] && t) a++; if (maskNow[i] || t) b++; if (found0[i] && t) a0++; if (found0[i] || t) b0++; }
    check(fv.fix && fv.fix.length === nCut + nAdd && a / b > 0.8 && a / b > a0 / b0 + 0.2 && /fixes by hand/.test(document.querySelector("#panel").textContent),
      "strokes on the photo fix the figure it found", `${nCut} strokes taken away, ${nAdd} added; the figure ${(a0 / b0 * 100).toFixed(0)}% → ${(a / b * 100).toFixed(0)}% like the true one`);
    $$("#panel button").find(x => /Line it up again/.test(x.textContent)).click();
    for (let i = 0; i < 200 && fv.match === match0; i++) await sleep(50);
    await sleep(300); await settle();
    const accFix = accuracy(MF.parts[0], 1).acc, sizeOff = Math.abs(fv.fit.a / trueFront.a - 1), placeOff = Math.hypot(fv.fit.tx - trueFront.tx, fv.fit.ty - trueFront.ty);
    // (before v0.22.1 by colour alone it lined up badly, 53.6% of the surface right; it now lines up roughly)
    check(fv.match > 0.75 && sizeOff < 0.03 && placeOff < 0.01 && accFix > 0.78 && accFix > acc0,
      "Line it up again: with the fixes the photo lines up, the colours are read again, and the figure comes out about as well as with the AI",
      `outline ${(match0 * 100).toFixed(0)}% → ${(fv.match * 100).toFixed(0)}%, size off ${(sizeOff * 100).toFixed(1)}%, place off ${(placeOff * 100).toFixed(2)}%, ${(acc0 * 100).toFixed(1)}% → ${(accFix * 100).toFixed(1)}% of the surface right`);
    // saved and opened again: the fixes are in the file and the paint is the same
    const fPaint = Array.from(MF.parts[0].paint), fSaved = MF.projectPayload(true), fixN = fv.fix.length;
    await open(fSaved);
    const fv2 = MF.paint.photo.op.views[0];
    check(fv2 !== fv && fv2.fix && fv2.fix.length === fixN && JSON.stringify(fv2.fix) === JSON.stringify(fv.fix) && MF.parts[0].paint.every((s, t) => s === fPaint[t]),
      "saved and opened again: the fixes come back and the paint is the same", `${fixN} strokes, ${(fSaved.length / 1024).toFixed(0)} KB`);
    $$("#tabs button").find(x => x.dataset.k === "paint").click(); await sleep(80);
    $$("#panel button").find(x => /Undo the last fix/.test(x.textContent)).click(); await sleep(80);
    const afterUndo = (MF.paint.photo.op.views[0].fix || []).length;
    $$("#panel button").find(x => /Clear my fixes/.test(x.textContent)).click(); await sleep(900); await settle();
    check(afterUndo === fixN - 1 && !MF.paint.photo.op.views[0].fix && !$$("#panel button").some(x => /Clear my fixes/.test(x.textContent)),
      "Undo the last fix takes one stroke off; Clear my fixes takes them all", `${fixN} → ${afterUndo} → 0`);
    // while a stroke grows the preview draws only its new part: frame by frame it must match drawing every fix afresh
    {
      await pass(/Take away/, 0.03, 0, 0.05, dOut);                          // some strokes to draw on top of
      await sleep(900); await settle(); tool(/Take away/).click(); await sleep(120);
      cv = document.querySelector("canvas.photoPrev"); cv.getBoundingClientRect = () => ({ left: 0, top: 0, width: cv.width, height: cv.height, right: cv.width, bottom: cv.height });
      ev("pointerdown", 0.05, 0.3); await sleep(40);
      for (let i = 1; i <= 8; i++) { ev("pointermove", 0.05 + i * 0.03, 0.3 + (i % 2) * 0.02); await sleep(40); }
      ev("pointerup", 0.3, 0.3); await sleep(80);
      cv.dispatchEvent(new win.PointerEvent("pointerleave", { pointerId: 1 })); await sleep(40);   // the brush ring goes with the pointer
      const grab = c => Array.from(c.getContext("2d").getImageData(0, 0, c.width, c.height).data);
      const inc = grab(cv), n = MF.paint.photo.op.views[0].fix.length;
      tool(/Take away/).click(); await sleep(120);                          // a new card: its preview draws every fix afresh
      const fresh = grab(document.querySelector("canvas.photoPrev"));
      let diff = 0; for (let i = 0; i < inc.length; i += 4) if (inc[i] !== fresh[i] || inc[i + 1] !== fresh[i + 1] || inc[i + 2] !== fresh[i + 2]) diff++;
      check(diff === 0 && n > 1 && inc.length === fresh.length, "a stroke drawn a bit at a time looks exactly like all the fixes drawn afresh", `${n} strokes, ${diff} pixels differ`);
      $$("#panel button").find(x => /Clear my fixes/.test(x.textContent)).click(); await sleep(900); await settle();
    }
    tool(/Move the photo/).click(); await sleep(60);
  }

  // ---- 7d. the product photo of 5c in the app (v0.22.1): the light evened out, the camera close by ----
  console.log("\na product photo: lit from one side, taken from close by");
  {
    MF.state.paint.ops.length = 0; MF.paint.repaint(); await settle();
    MF.state.printer.colors = 5;
    await MF.paint.photo.add([new win.File([boot.encodePNG(PW, PH, prod.rgba)], "product.png", { type: "image/png" })]); await settle();
    const pop = MF.paint.photo.op, pv = pop.views[0];
    MF.paint.photo.ai.hooks.run = async (input, S) => netRaw(input, S);
    $$("#panel button").find(b => /Find the figure with AI/.test(b.textContent)).click();
    for (let i = 0; i < 1200 && !(pv.ai && MF.paint.photo.info(pop) && !/Finding|Lining|Colouring/.test(document.querySelector("#statusLine").textContent)); i++) await sleep(50);
    await sleep(600); await settle(); MF.paint.photo.ai.hooks.run = null;
    const panel = () => document.querySelector("#panel").textContent, kField = () => $$("#panel .field").find(w => /^How close the camera was/.test((w.querySelector("label") || {}).textContent || ""));
    const accOn = accuracy(MF.parts[0], 1, kit).acc;
    check(pop.shade === true && pv.fit && pv.fit.k > 0.25 && pv.match > 0.85 && Math.abs(pv.cam.yaw) <= 5 && kField() && /The light in this photo comes from the upper right, and the model casts shadows/.test(panel()),
      "the photo lines up from close by, and the card says where the light comes from", `${pv.cam.yaw}° round, ${pv.cam.pitch}° up, closeness ${pv.fit.k}, outline ${(pv.match * 100).toFixed(0)}%; "${(/The light in this photo[^.]*\./.exec(panel()) || [""])[0]}"`);
    const kitNear = () => KIT_NAMES.map(nm => Math.min(...pop.pal.map(q => dE(q.rgb, KIT[nm]))));
    check(pop.pal.length === 5 && kitNear().every(d => d < 25) && accOn > 0.75, "the five paints are its five colours, and the figure comes out right",
      `${KIT_NAMES.map((nm, i) => `${nm} ΔE ${kitNear()[i].toFixed(0)}`).join(", ")}; ${(accOn * 100).toFixed(1)}% of the surface right from one photo`);
    // Even out light and shadow, off and on again
    const shadeBox = () => $$("#panel label.check").find(l => /Even out light and shadow/.test(l.textContent)).querySelector("input");
    shadeBox().checked = false; shadeBox().dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 200 && pop.shade !== false; i++) await sleep(50);
    await sleep(600); await settle();
    const accOff = accuracy(MF.parts[0], 1, kit).acc;
    check(pop.shade === false && /a colour in deep shade can come out as a colour of its own/.test(panel()) && accOff < accOn, "unticking Even out light and shadow reads the photo as it is (less of the figure right)",
      `${(accOff * 100).toFixed(1)}% right without, ${(accOn * 100).toFixed(1)}% with`);
    shadeBox().checked = true; shadeBox().dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 200 && pop.shade !== true; i++) await sleep(50);
    await sleep(600); await settle();
    // How close the camera was: set by hand, the photo lines up again at that closeness
    const k0 = pv.fit.k, kin = kField().querySelector("input[type=number]"); kin.value = "0"; kin.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 200 && pv.fit.k; i++) await sleep(50);
    await sleep(900); await settle();
    const matchFar = pv.match;
    check(!pv.fit.k && matchFar < 0.97, "How close the camera was set to 0 (far away): it lines up again that way", `outline ${(matchFar * 100).toFixed(0)}% far away`);
    $$("#panel button").find(b => /Line it up again/.test(b.textContent)).click();
    for (let i = 0; i < 400 && !pv.fit.k; i++) await sleep(50);
    await sleep(600); await settle();
    check(pv.fit.k > 0.25 && pv.match >= matchFar, "Line it up again finds how close it was by itself", `closeness ${k0} → 0 → ${pv.fit.k}, outline ${(pv.match * 100).toFixed(0)}%`);
    // saved and opened again: the closeness and the light setting come back, and so does the paint
    const kPaint = Array.from(MF.parts[0].paint), kSaved = MF.projectPayload(true), sv = JSON.parse(kSaved).state.paint.ops.find(o => o.k === "photo");
    await open(kSaved);
    const pv2 = MF.paint.photo.op.views[0];
    check(sv.shade === true && sv.views[0].fit.k === pv.fit.k && !sv.views[0].fit.ref && MF.paint.photo.op.shade === true && pv2.fit.k === pv.fit.k && MF.parts[0].paint.every((x, t) => x === kPaint[t]),
      "saved and opened again: the closeness, the light setting and the paint are the same", `closeness ${pv2.fit.k}`);
    // a step saved before v0.22.1 (no shade setting) keeps the look it had
    delete sv.shade; const oldFile = JSON.parse(kSaved); oldFile.state.paint.ops = oldFile.state.paint.ops.map(o => o.k === "photo" ? sv : o);
    await open(JSON.stringify(oldFile));
    check(MF.paint.photo.op.shade === false, "a photo step saved before this version opens with the light left as it is");
    MF.state.printer.colors = 6;
  }

  // ---- 7c. the AI cut-out on the Art tab (Session 20): the same bookshelf photo as a picture ----
  console.log("\nthe AI cut-out: a picture's background taken away");
  {
    const sel = document.querySelector("#objectSel"); sel.value = "board"; sel.dispatchEvent(new win.Event("change")); await settle();
    $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(60);
    const ev = new win.Event("drop", { bubbles: true, cancelable: true }); ev.dataTransfer = { files: [png(busyFront, "shelf.png")] };
    document.querySelector("#drop").dispatchEvent(ev);
    for (let i = 0; i < 200 && !MF.state.items.some(d => d.name === "shelf" && d.src); i++) await sleep(30);
    await settle();
    const d = MF.state.items.find(x => x.name === "shelf"), cutBtn = () => $$("#panel button").find(b => /Cut out the subject with AI/.test(b.textContent));
    check(d && !MF.state.items.some(x => x.example) && MF.art.hasBackground(d) && cutBtn(), "a photo on the Art tab (it replaced the example): the AI cut-out is offered", d && d.name);
    let calls = 0; MF.paint.photo.ai.hooks.run = async (input, S) => { calls++; return netRaw(input, S); };
    const orig = d.asset; cutBtn().click();
    for (let i = 0; i < 600 && !d.uncut; i++) await sleep(50);
    await settle();
    const cv = d.src, px = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let a = 0, b = 0; for (let i = 0; i < W * H; i++) { const on = px[4 * i + 3] > 127, t = busyFront.mask[i]; if (on && t) a++; if (on || t) b++; }
    check(calls === 1 && d.uncut === orig && d.asset !== orig && d.crop === true && cv.width === W && a / b > 0.8 && !MF.art.hasBackground(d),
      "Cut out the subject with AI: the figure stays, the bookshelf goes, and the picture is trimmed to it", `outline ${(a / b * 100).toFixed(1)}% of the true figure`);
    check(MF.parts.length > 1 && MF.parts.every(q => C.checkMesh(q.solid).open === 0) && $$("#panel button").some(x => /Put the background back/.test(x.textContent)),
      "the cut-out prints on the board, every part closed, and the background can be put back", `${MF.parts.length} parts`);
    // saved and opened again: both pictures travel in the file
    MF.paint.photo.ai.hooks.run = null;
    const saved = MF.projectPayload(true), keptIds = Object.keys(JSON.parse(saved).assets || {});
    await open(saved);
    const d2 = MF.state.items.find(x => x.name === "shelf");
    check(keptIds.includes(d.asset) && keptIds.includes(d.uncut) && d2 && d2.uncut === d.uncut && d2.asset === d.asset && !MF.art.hasBackground(d2), "saved and opened again: the cut-out and the original are both in the file", `${keptIds.length} pictures`);
    $$("#tabs button").find(x => x.dataset.k === "art").click(); await sleep(60);
    $$("#panel button").find(x => /Put the background back/.test(x.textContent)).click(); await settle();
    const d3 = MF.state.items.find(x => x.name === "shelf");
    check(d3.asset === orig && !d3.uncut && d3.crop === false && MF.art.hasBackground(d3), "Put the background back: the original picture again");
    // beside a name on a keychain: the same button, and the colour cut-out is switched off once the AI has cut it
    sel.value = "nameplate"; sel.dispatchEvent(new win.Event("change")); await settle();
    const np = MF.state.base.nameplate; np.pic.on = true; np.pic.item = MF.state.items.indexOf(d3); np.pic.cutout = true;
    $$("#tabs button").find(x => x.dataset.k === "make").click(); await sleep(60); MF.render(); await sleep(60);
    const kBtn = $$("#panel button").find(x => /Cut out the subject with AI/.test(x.textContent));
    MF.paint.photo.ai.hooks.run = async (input, S) => netRaw(input, S);
    if (kBtn) kBtn.click();
    for (let i = 0; i < 600 && !d3.uncut; i++) await sleep(50);
    await settle(); MF.paint.photo.ai.hooks.run = null;
    check(kBtn && d3.uncut && np.pic.cutout === false && MF.parts.every(q => C.checkMesh(q.solid).open === 0), "beside a name on a keychain: cut out with AI, the colour cut-out switched off, every part closed", `${MF.parts.length} parts`);
    // a picture without a background (a cut-out logo) is not offered the AI
    const logo = { rgba: new Uint8ClampedArray(W * H * 4), mask: null };
    for (let i = 0; i < W * H; i++) { const x = i % W, y = (i - x) / W; if (Math.hypot(x - W / 2, y - H / 2) < 150) { logo.rgba.set([200, 40, 40, 255], 4 * i); } }
    $$("#tabs button").find(x => x.dataset.k === "art").click(); await sleep(60);
    const ev2 = new win.Event("drop", { bubbles: true, cancelable: true }); ev2.dataTransfer = { files: [png(logo, "logo.png")] };
    document.querySelector("#drop").dispatchEvent(ev2);
    for (let i = 0; i < 200 && !MF.state.items.some(x => x.name === "logo" && x.src); i++) await sleep(30);
    await settle();
    check(!$$("#panel button").some(x => /Cut out the subject with AI/.test(x.textContent)), "a logo on a clear background is not offered the AI cut-out");
  }

  // ---- 8. a hostile project file ----
  console.log("\na photo step in a hostile project file");
  const data = JSON.parse(payload), hv = data.state.paint.ops.find(o => o.k === "photo");
  hv.views = Array.from({ length: 50 }, (_, i) => ({ asset: i ? "<img src=x onerror=alert(1)>" : hv.views[0].asset, name: "<b>x</b>".repeat(40), cam: { yaw: 1e9, pitch: -1e9 },
    fit: i === 0 ? { a: 1e9, tx: 0.5, ty: 0.9, rot: 0, mirror: "yes" } : i === 1 ? { a: "big", tx: 0, ty: 0, rot: 0 } : { a: 0.01, tx: 1e9, ty: -1e9, rot: 50, mirror: true }, tol: -5, match: 7 }));
  hv.pal = Array.from({ length: 100 }, () => ({ rgb: [1e9, "x", -4], keys: [[NaN, 0, 0], [1e9, -1e9, 3], "k"] }));
  hv.slots = [99, -1, "2", 255]; hv.colours = 1e6; hv.speck = 1e9; hv.fill = "no"; hv.use = "<script>"; hv.shade = "yes";
  hv.views[2].fit.k = 1e9; hv.views[2].fit.ref = [1e9, "x", 0, -5]; hv.views[3].fit.k = "<b>"; hv.views[4].fit.k = -3;
  hv.views[3].ai = "<img src=x onerror=alert(1)>"; hv.views[4].ai = { evil: 1 }; hv.views[5].ai = "x".repeat(500);
  hv.views[0].fix = Array.from({ length: 3000 }, (_, i) => ({ add: i % 2 === 0, r: 0.03, p: Array.from({ length: 100 }, (_, j) => (j % 7) / 7) }));
  hv.views[3].fix = Array.from({ length: 1000 }, () => ({ add: true, r: 5, p: Array.from({ length: 100 }, (_, j) => j % 2) }));   // huge brushes flung corner to corner
  hv.views[1].fix = "<img src=x onerror=alert(1)>";
  hv.views[2].fix = [{ add: "yes", r: 1e9, p: [NaN, 5, -3, 0.5, 0.2, "x"] }, { p: "x" }, null, { add: true, r: -4, p: [0.5] }, { add: true, p: Array(9000).fill(0.5) }];
  data.state.items = (data.state.items || []).concat([{ evil: 1 }, "<img src=x onerror=alert(1)>", "y".repeat(500), 7].map((u, i) => ({ id: 900 + i, name: "hostile " + i, uncut: u, width: 20 })));
  t0 = Date.now(); const e0 = env.errors.length; await open(JSON.stringify(data)); const hostileMs = Date.now() - t0;
  const ho = MF.state.paint.ops.find(o => o.k === "photo"), herr = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(ho && ho.views.length === 6 && ho.pal.length === 8 && ho.slots.length === 8 && ho.views[0].fit.a <= 10 && ho.views[1].fit === null && Math.abs(ho.views[2].fit.tx) <= 5 &&
    ho.views.every(v => Math.abs(v.cam.yaw) <= 180 && Math.abs(v.cam.pitch) <= 89 && v.tol >= 0 && v.match <= 1 && v.name.length <= 60) &&
    ho.views[4].ai === undefined && ho.views[5].ai.length === 40 && !MF.paint.photo.ai.mapOf(ho.views[3].ai) &&
    ho.pal.every(p => p.rgb.every(c => c >= 0 && c <= 255) && p.keys.every(k => k.every(Number.isFinite))) && ho.colours === 8 && ho.speck === 50 && ho.use === "photo" &&
    ho.shade === false && ho.views[2].fit.k === C.PHOTO_K_MAX && !("ref" in ho.views[2].fit) && !("k" in ho.views[3].fit) && !("k" in ho.views[4].fit),
    "at most six photos and eight colours, numbers clamped, a broken fit dropped", ho && `${ho.views.length} photos, ${ho.pal.length} colours, a ${ho.views[0].fit.a}, slots ${ho.slots.join(",")}`);
  const hf = ho && ho.views.map(v => v.fix), hfN = hf && hf[0] ? hf[0].reduce((n, q) => n + q.p.length, 0) : 0;
  const tFix = Date.now(), bigFix = ho && MF.paint.photo.figure({ asset: ho.views[0].asset, tol: 35, fix: ho.views[3].fix }, 480, 480), fixMs = Date.now() - tFix;
  check(hf && hf[0].length === 1000 && hfN === 100000 && bigFix && fixMs < 1500 && hf[0].every(q => q.p.every(x => x >= 0 && x <= 1) && q.r >= 0.002 && q.r <= 0.25 && typeof q.add === "boolean") &&
    hf[1] === undefined && hf[2].length === 2 && JSON.stringify(hf[2][0]) === JSON.stringify({ add: false, r: 0.25, p: [1, 0, 0.5, 0.2] }) && hf[2][1].p.length === 4000,
    "hand fixes on a photo: at most 2000 strokes and 100 000 numbers, every point on the photo, the brush size clamped, and huge brushes cannot stall it",
    hf && `${hf[0].length} strokes, ${hfN} numbers; ${JSON.stringify(hf[2] && hf[2][0])}; huge brushes ${fixMs} ms`);
  const hu = MF.state.items.filter(x => /^hostile/.test(x.name)).map(x => x.uncut);
  check(hu.length === 4 && hu[0] === undefined && hu[3] === undefined && hu[1].length <= 40 && hu[2].length === 40, "a picture's original (before an AI cut-out) is only ever a short name", JSON.stringify(hu).slice(0, 80));
  check(hostileMs < 20000 && !herr.length && !document.querySelector("#panel b b") && !document.querySelector("#panel img[src=x]"), "it opens quickly without errors and no markup gets in",
    `${hostileMs} ms${herr.length ? ", " + herr[0].split("\n")[0] : ""}`);

  const errs = pageErrors();
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
