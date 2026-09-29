// Models with their own colours (Session 20): what AI model makers export. The test figure of the photo test
// (a footballer with six known colours) is written out as a GLB with vertex colours, a GLB with a colour
// picture, an OBJ with vertex colours and an OBJ with an MTL file and a picture; each is opened, and how much
// of the surface comes back in its true colour is measured. Then saving and reopening, sizes, damaged and
// hostile files.
//   node tools-aimodel-test.js [index.html]      CORE=1 for the readers only
const path = require("path");
globalThis.earcut = require("earcut");
require(path.join(__dirname, "src", "core.js"));
const C = globalThis.PRCore;
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const { PAL, NAMES, figure, truth, outside, score } = require("./tools-photo-figure.js")(C);
const boot = require("./tools-test-env.js"), { encodePNG } = boot;

const sToLin = b => { const v = b / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const { makeGLB } = require("./tools-photo-figure.js")(C), TEX = require("./tools-photo-figure.js")(C).colourSquares(encodePNG);

(async () => {
  console.log("reading models with their own colours");
  const fig = figure(), solid = fig.solid, topo = C.meshTopology(solid), cls = truth(topo, fig.partOf), out = outside(solid, topo), n = topo.n;
  // the figure as triangle soup (glTF is Y up, like the figure), in metres
  const pos = new Float32Array(9 * n), col = new Float32Array(9 * n), uv = new Float32Array(6 * n);
  for (let t = 0; t < n; t++) {
    const rgb = PAL[NAMES[cls[t]]], [u, v] = TEX.uvOf(cls[t]);
    for (let k = 0; k < 3; k++) {
      const vi = solid.idx[3 * t + k];
      for (let a = 0; a < 3; a++) { pos[9 * t + 3 * k + a] = solid.pos[3 * vi + a] / 1000; col[9 * t + 3 * k + a] = sToLin(rgb[a]); }
      uv[6 * t + 2 * k] = u + (k - 1) * 0.02; uv[6 * t + 2 * k + 1] = v + (k === 1 ? 0.03 : -0.01);
    }
  }
  const glbVertex = makeGLB({ pos, col }), glbTex = makeGLB({ pos, uv, png: TEX.png });
  const rv = C.parseGLB(glbVertex), rt = C.parseGLB(glbTex);
  const sameTri = (r) => { let worst = 0; for (let t = 0; t < n; t += 97) for (let k = 0; k < 3; k++) { const vi = solid.idx[3 * t + k], P = solid.pos;
    worst = Math.max(worst, Math.abs(r.tris[9 * t + 3 * k] - P[3 * vi] / 1000), Math.abs(r.tris[9 * t + 3 * k + 1] + P[3 * vi + 2] / 1000), Math.abs(r.tris[9 * t + 3 * k + 2] - P[3 * vi + 1] / 1000)); } return worst; };
  let colOk = 0; for (let t = 0; t < n; t++) { const rgb = PAL[NAMES[cls[t]]]; if ([0, 1, 2].every(a => Math.abs(rv.cc[9 * t + a] - rgb[a]) <= 1)) colOk++; }
  check(rv.tris.length === 9 * n && sameTri(rv) < 1e-6 && colOk === n && !rv.uv && rv.units === "m", "a GLB with vertex colours: every triangle, turned Z up like an STL, and every colour exact", `${n} triangles`);
  check(rt.uv && rt.texOf.every(v => v === 0) && rt.images.length === 1 && rt.images[0].mime === "image/png" && rt.images[0].bytes.length === TEX.png.length,
    "a GLB with a colour picture: the picture and every corner's place on it", `${rt.images[0].bytes.length} bytes of PNG`);
  // the picture read the way the app reads it, and the colours of the triangles from it
  const texData = boot.decodePNG ? boot.decodePNG(Buffer.from(TEX.png)) : null;
  if (texData) {
    const rgbT = C.modelTriColours(solid, null, solid, { cc: rt.cc, uv: rt.uv, texOf: rt.texOf, tex: [{ w: texData.width, h: texData.height, data: texData.data }] });
    let ok = 0; for (let t = 0; t < n; t++) { const rgb = PAL[NAMES[cls[t]]]; if ([0, 1, 2].every(a => Math.abs(rgbT[3 * t + a] - rgb[a]) <= 2)) ok++; }
    check(ok === n, "the colour of every triangle, read from the picture", `${ok} of ${n}`);
  }
  // detail inside big triangles: a 40 mm square of two triangles, its picture split corner to corner the other way
  {
    const sq = { pos: new Float32Array([0, 0, 0, 40, 0, 0, 40, 0, 40, 0, 0, 40]), idx: new Uint32Array([0, 2, 1, 0, 3, 2]) };
    const W = 64, px = new Uint8ClampedArray(W * W * 4); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) px.set(x + y < W ? [220, 30, 30, 255] : [30, 30, 220, 255], 4 * (y * W + x));
    const mc = { cc: new Uint8Array(18).fill(255), uv: new Float32Array([0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1]), texOf: new Int16Array([0, 0]), tex: [{ w: W, h: W, data: px }] };
    const ed = C.meshEditor(sq); ed.refine(1.5, 100000); const fine = ed.solid(), ft = C.meshTopology(fine), rgb = C.modelTriColours(fine, ed.source(), sq, mc);
    let red = 0, tot = 0; for (let t = 0; t < ft.n; t++) { tot += ft.area[t]; if (rgb[3 * t] > rgb[3 * t + 2]) red += ft.area[t]; }
    check(Math.abs(red / tot - 0.5) < 0.04, "detail inside big triangles: on the finer mesh the picture's diagonal comes through", `${(red / tot * 100).toFixed(1)}% red, 50% expected, ${ft.n} triangles`);
  }
  // node transforms: moved, scaled, and mirrored (the winding is turned back so the model stays outward)
  {
    const cube = C.extrudePolys([{ outer: C.ringRect(10, 10, 0, 1), holes: [] }], 10), sp = new Float32Array(cube.idx.length * 3);
    for (let i = 0; i < cube.idx.length; i++) for (let a = 0; a < 3; a++) sp[3 * i + a] = cube.pos[3 * cube.idx[i] + a];
    const mirrored = C.parseGLB(makeGLB({ pos: sp, node: { translation: [5, 0, 0], scale: [-2, 2, 2] } })), w = C.weldSoup(mirrored.tris, null, true), r = C.checkMesh({ pos: w.pos, idx: w.idx });
    let mnx = Infinity; for (let i = 0; i < mirrored.tris.length; i += 3) mnx = Math.min(mnx, mirrored.tris[i]);
    check(r.open === 0 && r.volume > 7990 && r.volume < 8010 && Math.abs(mnx - (5 - 10)) < 1e-4, "node transforms: moved, scaled and mirrored, still closed and outward", `volume ${r.volume.toFixed(0)} mm³`);
  }
  // an OBJ with vertex colours, and one with an MTL file and a picture
  const objV = [], objT = [], mtl = "newmtl skin\nKd 1 1 1\nmap_Kd colours.png\n";
  for (let t = 0; t < n; t++) {
    const rgb = PAL[NAMES[cls[t]]].map(v => (v / 255).toFixed(4)), [u, v] = TEX.uvOf(cls[t]);
    for (let k = 0; k < 3; k++) { const vi = solid.idx[3 * t + k], P = solid.pos, x = P[3 * vi], y = P[3 * vi + 1], z = P[3 * vi + 2];
      objV.push(`v ${x.toFixed(4)} ${(-z).toFixed(4)} ${y.toFixed(4)} ${rgb.join(" ")}`); objT.push(`v ${x.toFixed(4)} ${(-z).toFixed(4)} ${y.toFixed(4)}`, `vt ${(u + (k - 1) * 0.02).toFixed(4)} ${(1 - (v + (k === 1 ? 0.03 : -0.01))).toFixed(4)}`); }
  }
  const objVertex = objV.join("\n") + "\n" + Array.from({ length: n }, (_, t) => `f ${3 * t + 1} ${3 * t + 2} ${3 * t + 3}`).join("\n");
  const objTex = "mtllib figure.mtl\nusemtl skin\n" + objT.join("\n") + "\n" + Array.from({ length: n }, (_, t) => `f ${3 * t + 1}/${3 * t + 1} ${3 * t + 2}/${3 * t + 2} ${3 * t + 3}/${3 * t + 3}`).join("\n");
  const ro = C.parseOBJColours(objVertex, ""), rot = C.parseOBJColours(objTex, mtl);
  let objOk = 0; for (let t = 0; t < n; t++) { const rgb = PAL[NAMES[cls[t]]]; if ([0, 1, 2].every(a => Math.abs(ro.cc[9 * t + a] - rgb[a]) <= 1)) objOk++; }
  check(ro.tris.length === 9 * n && objOk === n && !ro.uv, "an OBJ with vertex colours: every colour", `${objOk} of ${n}`);
  check(rot.uv && rot.images.length === 1 && rot.images[0].name === "colours.png" && rot.texOf.every(v => v === 0) && Math.abs(rot.uv[0] - rt.uv[0]) < 1e-3 && Math.abs(rot.uv[1] - rt.uv[1]) < 1e-3,
    "an OBJ with an MTL file: the picture by name, and the same places on it as the GLB (OBJ counts v from the bottom)", rot.images[0].name);
  check(C.parseOBJ(objVertex).length === ro.tris.length, "the same triangles as the plain OBJ reader");
  // damaged and unwanted files
  const err = f => { try { f(); return ""; } catch (e) { return e.message; } };
  check(/compressed/.test(err(() => C.parseGLB(makeGLB({ pos, extra: { extensionsRequired: ["KHR_draco_mesh_compression"] } })))), "a Draco-compressed GLB: a clear message");
  check(/cut short/.test(err(() => C.parseGLB(glbVertex.slice(0, 2000)))), "a cut-off GLB: says so, and does not crash", err(() => C.parseGLB(glbVertex.slice(0, 2000))));
  check(/2\.0/.test(err(() => C.parseGLTF({ asset: { version: "1.0" } }, null))) && /separate file/.test(err(() => C.parseGLTF({ asset: { version: "2.0" }, buffers: [{ uri: "model.bin", byteLength: 10 }], bufferViews: [{ buffer: 0, byteLength: 10 }], accessors: [{ bufferView: 0, componentType: 5126, count: 1, type: "VEC3" }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }] }, null))),
    "glTF 1 and a model whose data is in another file: clear messages");
  if (process.env.CORE) { console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

  // ---- in the app ----
  console.log("\nopening them in the app");
  const env = boot(path.resolve(process.argv[2] || "index.html")), win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(900);
  const MF = win.MakerForge;
  const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); } return false; };
  const file = (bytes, name, type) => new win.File([bytes], name, { type: type || "application/octet-stream" });
  const grid = C.triangleGrid(topo, 3);
  const accuracy = (q, k) => {
    const ptopo = q.pc.topo, pout = outside(q.pc.solid, ptopo), ptruth = new Int8Array(ptopo.n).fill(-1);
    for (let t = 0; t < ptopo.n; t++) {
      let bd = Infinity; const x = ptopo.cen[3 * t] / k, y = ptopo.cen[3 * t + 1] / k, z = ptopo.cen[3 * t + 2] / k;
      grid.near(x, y, z, 3, u => { if (topo.nrm[3 * u] * ptopo.nrm[3 * t] + topo.nrm[3 * u + 1] * ptopo.nrm[3 * t + 1] + topo.nrm[3 * u + 2] * ptopo.nrm[3 * t + 2] < 0.3) return;
        const d = (topo.cen[3 * u] - x) ** 2 + (topo.cen[3 * u + 1] - y) ** 2 + (topo.cen[3 * u + 2] - z) ** 2; if (d < bd) { bd = d; ptruth[t] = cls[u]; } });
      if (ptruth[t] < 0) pout[t] = 0;
    }
    return score(ptopo, q.paint, ptruth, pout);
  };
  const opOf = () => MF.state.paint.ops.find(o => o.k === "model");
  const sixColours = async () => { const o = opOf(); o.colours = 6; MF.model.pick(o); MF.paint.repaint(); await settle(); await sleep(200); await settle(); };

  // 1. a GLB with vertex colours
  await MF.paint.importModel(file(glbVertex, "figure.glb"), []); await settle();
  let o = opOf(), part = MF.parts[0];
  check(MF.model.colour && MF.model.colour.cc && !MF.model.colour.uv && o && o.pal.length === Math.min(8, MF.state.printer.colors) && part.paint && /own colours/.test(document.querySelector("#notice").textContent),
    "a GLB with vertex colours opens painted in its colours, in as many filaments as the printer loads", o && `${o.pal.length} colours: ${MF.state.slots.slice(0, o.pal.length).map(s => s.name).join(", ")}`);
  const B = C.solidBounds(part.solid0 || part.solid);
  check(Math.abs(B.mx[1] - B.mn[1] - 102) < 0.5, "its size: metres turned into millimetres", `${(B.mx[1] - B.mn[1]).toFixed(1)} mm tall`);
  await sixColours(); part = MF.parts[0];
  const accV = accuracy(part, 1);
  check(accV > 0.97, "with six colours nearly all of the surface is its true colour", `${(accV * 100).toFixed(1)}% of the surface right, ${part.pc.topo.n} triangles`);
  // 2. a GLB with a colour picture
  await MF.paint.importModel(file(glbTex, "figure-tex.glb"), []); await settle();
  check(MF.model.colour && MF.model.colour.uv && MF.model.colour.tex.length === 1 && opOf(), "a GLB with a colour picture: the picture comes along", MF.model.colour && MF.model.colour.tex.join(","));
  await sixColours(); part = MF.parts[0];
  const accT = accuracy(part, 1);
  check(accT > 0.97, "and its colours read from the picture", `${(accT * 100).toFixed(1)}% of the surface right`);
  // 3. saved and opened again: the picture and the colours are in the file
  const paintBefore = Array.from(part.paint), saved = MF.projectPayload(true), savedJ = JSON.parse(saved);
  const open = async text => { const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [new win.File([text], "p.json", { type: "application/json" })], configurable: true }); inp.dispatchEvent(new win.Event("change")); await sleep(300); await settle(); };
  await open(saved);
  part = MF.parts[0];
  check(savedJ.model.colour && savedJ.assets[savedJ.model.colour.tex[0]] && MF.model.colour && MF.model.colour.uv && part.paint && part.paint.length === paintBefore.length && part.paint.every((v, i) => v === paintBefore[i]),
    "saved and opened again: its colours and picture are in the file, and the paint is the same", `${(saved.length / 1024).toFixed(0)} KB`);
  // 4. an OBJ with vertex colours; an OBJ with its MTL and picture chosen together; one whose picture is missing
  await MF.paint.importModel(file(objVertex, "figure.obj", "text/plain"), []); await settle(); await sixColours(); part = MF.parts[0];
  const accO = accuracy(part, 1);
  check(opOf() && accO > 0.97, "an OBJ with vertex colours", `${(accO * 100).toFixed(1)}% of the surface right`);
  const fo = file(objTex, "figure.obj", "text/plain"), fm = file(mtl, "figure.mtl", "text/plain"), fp = file(TEX.png, "colours.png", "image/png");
  await MF.paint.importModel(fo, [fo, fm, fp]); await settle(); await sixColours(); part = MF.parts[0];
  const accOT = accuracy(part, 1);
  check(MF.model.colour && MF.model.colour.uv && accOT > 0.97, "an OBJ chosen with its MTL file and picture", `${(accOT * 100).toFixed(1)}% of the surface right`);
  await MF.paint.importModel(fo, [fo, fm]); await settle();
  check(/colours\.png/.test(document.querySelector("#notice").textContent) && MF.model.colour && !MF.model.colour.uv, "without its picture: the app says which file to add", document.querySelector("#notice").textContent.slice(0, 120));
  // 5. an AI model two metres tall is made 80 mm across; a plain STL is left as it was
  const tall = pos.map((v, i) => i % 3 === 1 ? v * 20 : v * 20);
  await MF.paint.importModel(file(makeGLB({ pos: tall, col }), "giant.glb"), []); await settle();
  const B2 = C.solidBounds(MF.parts[0].solid0 || MF.parts[0].solid), across = Math.max(B2.mx[0] - B2.mn[0], B2.mx[1] - B2.mn[1], B2.mx[2] - B2.mn[2]);
  check(Math.abs(across - 80) < 0.5 && /80 mm/.test(document.querySelector("#notice").textContent), "a model two metres tall is made 80 mm across, and the app says so", `${across.toFixed(1)} mm`);
  // 6. the Paint tab: the step's settings
  $$("#tabs button").find(b => b.dataset.k === "paint").click(); await sleep(100);
  const pageBtn = $$("#secrail button").find(b => b.dataset.title === "Auto colour"); if (pageBtn) pageBtn.click(); await sleep(60);
  check($$(".method b").some(b => b.textContent === "The model's own colours") && /Number of colours/.test(document.querySelector("#panel").textContent) && /Use my loaded filaments/.test(document.querySelector("#panel").textContent),
    "the Paint tab shows the step with its number of colours and a choice of filaments");
  const mine = $$("#panel .seg button").find(b => /Use my loaded filaments/.test(b.textContent)); const hexBefore = MF.state.slots.map(s => s.hex).join();
  if (mine) mine.click(); await settle();
  check(opOf().use === "mine" && MF.state.slots.map(s => s.hex).join() === hexBefore && MF.parts[0].paint, "Use my loaded filaments: each colour prints in the nearest loaded filament, the filaments stay", opOf().slots.join(","));
  // 7. hostile project files
  console.log("\nhostile files");
  const bad = JSON.parse(saved), e0 = env.errors.length;
  bad.model.colour = { cc: "!!!", uv: 5, texOf: { x: 1 }, tex: ["<img src=x onerror=alert(1)>", 7] };
  bad.state.paint.ops = [{ k: "model", colours: 1e9, pal: Array.from({ length: 50 }, () => ({ rgb: [1e9, "x", -3], keys: [[NaN, 1, 2], "k"] })), slots: [99, -1, "3"], use: "<script>", smooth: "no" }];
  await open(JSON.stringify(bad));
  const ho = MF.state.paint.ops.find(q => q.k === "model"), herr = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!MF.model.colour && ho && ho.colours === 8 && ho.pal.length === 8 && ho.pal.every(c => c.rgb.every(v => v >= 0 && v <= 255)) && ho.use === "model" && ho.smooth === true && !herr.length && !document.querySelector("img[src=x]"),
    "broken colours in a project file are left out, the step's numbers are clamped, nothing gets in", ho && `${ho.pal.length} colours, slots ${ho.slots.join(",")}`);
  const bad2 = JSON.parse(saved), nT = bad2.model.tris.length;
  bad2.model.colour.texOf = bad2.model.colour.texOf.slice(0, 40); await open(JSON.stringify(bad2));
  check(MF.model.colour && !MF.model.colour.uv && MF.model.colour.cc, "picture places of the wrong length: the model keeps its corner colours only");
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs[0] && errs[0].split("\n")[0]);
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
