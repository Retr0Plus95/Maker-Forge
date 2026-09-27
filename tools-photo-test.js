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

const { PART_NAMES, PAL, NAMES, figure, truth, outside, render, score } = require("./tools-photo-figure.js")(C);

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
  const accuracy = (q, k) => {                       // k: how much bigger the imported model is than the figure
    const ptopo = q.pc.topo, pout = outside(q.pc.solid, ptopo), ptruth = new Int8Array(ptopo.n).fill(-1);
    for (let t = 0; t < ptopo.n; t++) {
      let bd = Infinity; const x = ptopo.cen[3 * t] / k, y = ptopo.cen[3 * t + 1] / k, z = ptopo.cen[3 * t + 2] / k;
      grid.near(x, y, z, 3, u => { if (topo.nrm[3 * u] * ptopo.nrm[3 * t] + topo.nrm[3 * u + 1] * ptopo.nrm[3 * t + 1] + topo.nrm[3 * u + 2] * ptopo.nrm[3 * t + 2] < 0.3) return;
        const d = (topo.cen[3 * u] - x) ** 2 + (topo.cen[3 * u + 1] - y) ** 2 + (topo.cen[3 * u + 2] - z) ** 2; if (d < bd) { bd = d; ptruth[t] = cls[u]; } });
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

  // ---- 8. a hostile project file ----
  console.log("\na photo step in a hostile project file");
  const data = JSON.parse(payload), hv = data.state.paint.ops.find(o => o.k === "photo");
  hv.views = Array.from({ length: 50 }, (_, i) => ({ asset: i ? "<img src=x onerror=alert(1)>" : hv.views[0].asset, name: "<b>x</b>".repeat(40), cam: { yaw: 1e9, pitch: -1e9 },
    fit: i === 0 ? { a: 1e9, tx: 0.5, ty: 0.9, rot: 0, mirror: "yes" } : i === 1 ? { a: "big", tx: 0, ty: 0, rot: 0 } : { a: 0.01, tx: 1e9, ty: -1e9, rot: 50, mirror: true }, tol: -5, match: 7 }));
  hv.pal = Array.from({ length: 100 }, () => ({ rgb: [1e9, "x", -4], keys: [[NaN, 0, 0], [1e9, -1e9, 3], "k"] }));
  hv.slots = [99, -1, "2", 255]; hv.colours = 1e6; hv.speck = 1e9; hv.fill = "no"; hv.use = "<script>";
  t0 = Date.now(); const e0 = env.errors.length; await open(JSON.stringify(data)); const hostileMs = Date.now() - t0;
  const ho = MF.state.paint.ops.find(o => o.k === "photo"), herr = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(ho && ho.views.length === 6 && ho.pal.length === 8 && ho.slots.length === 8 && ho.views[0].fit.a <= 10 && ho.views[1].fit === null && Math.abs(ho.views[2].fit.tx) <= 5 &&
    ho.views.every(v => Math.abs(v.cam.yaw) <= 180 && Math.abs(v.cam.pitch) <= 89 && v.tol >= 0 && v.match <= 1 && v.name.length <= 60) &&
    ho.pal.every(p => p.rgb.every(c => c >= 0 && c <= 255) && p.keys.every(k => k.every(Number.isFinite))) && ho.colours === 8 && ho.speck === 50 && ho.use === "photo",
    "at most six photos and eight colours, numbers clamped, a broken fit dropped", ho && `${ho.views.length} photos, ${ho.pal.length} colours, a ${ho.views[0].fit.a}, slots ${ho.slots.join(",")}`);
  check(hostileMs < 20000 && !herr.length && !document.querySelector("#panel b b") && !document.querySelector("#panel img[src=x]"), "it opens quickly without errors and no markup gets in",
    `${hostileMs} ms${herr.length ? ", " + herr[0].split("\n")[0] : ""}`);

  const errs = pageErrors();
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
