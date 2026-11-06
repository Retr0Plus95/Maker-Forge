// Click to colour (Session 50) in real Chromium with the real SlimSAM: the files served from models/ as if from Hugging
// Face (skipped when they are not there: they are not in the repository, see models/LICENSE.md); the footballer from the
// photo test, a photo, the tool, two clicks with the mouse, Paint it. Part of npm run check:browser.
//   node tools-clickcolour-check.js index.html
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const NM = path.join(__dirname, "node_modules"), WT = __dirname, PAGE = path.resolve(process.argv[2] || "index.html");
const LIBS = [[/three@[\d.]+\/build\/three\.min\.js/, NM + "/three/build/three.min.js"], [/OrbitControls\.js/, NM + "/three/examples/js/controls/OrbitControls.js"], [/earcut@[\d.]+\/dist\/earcut\.min\.js/, NM + "/earcut/dist/earcut.min.js"], [/jszip@[\d.]+\/dist\/jszip\.min\.js/, NM + "/jszip/dist/jszip.min.js"],
  [/onnxruntime-web@[\d.]+\/dist\/ort\.wasm\.bundle\.min\.mjs/, NM + "/onnxruntime-web/dist/ort.wasm.bundle.min.mjs"], [/onnxruntime-web@[\d.]+\/dist\/ort-wasm-simd-threaded\.wasm/, NM + "/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"],
  [/slimsam-77-uniform\/.*vision_encoder_quantized\.onnx/, WT + "/models/slimsam-77-vision-int8.onnx"], [/slimsam-77-uniform\/.*prompt_encoder_mask_decoder_quantized\.onnx/, WT + "/models/slimsam-77-decoder-int8.onnx"]];
(async () => {
  console.log("click to colour in Chromium");
  if (!fs.existsSync(WT + "/models/slimsam-77-vision-int8.onnx") || !fs.existsSync(WT + "/models/slimsam-77-decoder-int8.onnx")){ console.log("  (skipped: the SlimSAM files are not in models/)"); process.exit(0); }
  require(path.join(__dirname, "src", "core.js")); const C = globalThis.PRCore, F = require("./tools-photo-figure.js")(C), boot = require("./tools-test-env.js");
  const fig = F.figure(), solid = fig.solid, topo = C.meshTopology(solid), cls = F.truth(topo, fig.partOf), PW = 600, PH = 800, fit = { a:6.3/PH, tx:310/PH, ty:760/PH, rot:0.04, mirror:false };
  const pngB64 = Buffer.from(boot.encodePNG(PW, PH, F.render(solid, topo, cls, "front", fit, PW, PH, 1).rgba)).toString("base64");
  const raw = fig.raw, L = []; for (let i = 0; i < raw.pos.length; i += 3) L.push(`v ${raw.pos[i]} ${-raw.pos[i+2]} ${raw.pos[i+1]}`); for (let i = 0; i < raw.idx.length; i += 3) L.push(`f ${raw.idx[i]+1} ${raw.idx[i+1]+1} ${raw.idx[i+2]+1}`);
  const out = []; const check = (ok, what, got) => out.push(`${ok ? "  ok  " : "  FAIL"} ${what}  (${got})`);
  const b = await chromium.launch({ args:["--enable-unsafe-swiftshader","--use-angle=swiftshader","--ignore-gpu-blocklist"] });
  const page = await (await b.newContext({ viewport:{ width:1440, height:960 }, deviceScaleFactor:1 })).newPage();
  const fetched = [];
  await page.route(/cdn\.jsdelivr\.net|huggingface\.co/, r => { const u = r.request().url(), l = LIBS.find(([re]) => re.test(u)); fetched.push(u.split("/").pop());
    const ct = /wasm$/.test(u) ? "application/wasm" : /onnx$/.test(u) ? "application/octet-stream" : "application/javascript";
    return l ? r.fulfill({ status:200, contentType:ct, headers:{ "access-control-allow-origin":"*" }, body:fs.readFileSync(l[1]) }) : r.abort(); });
  page.on("pageerror", e => console.log("PAGE ERROR", e.message)); page.on("console", m => { if (m.type() === "error" || m.type() === "warning") console.log("console:", m.text().slice(0, 300)); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch(e){} });
  await page.goto("file://" + PAGE);
  await page.waitForFunction(() => window.MakerForge && window.MakerForge.rev > 0 && !window.MakerForge.busy, null, { timeout:60000 });
  const settle = () => page.evaluate(async () => { const MF = window.MakerForge, sleep = ms => new Promise(q => setTimeout(q, ms)), r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 4000; i++){ if (!MF.busy){ await sleep(80); if (!MF.busy) break; } await sleep(25); } });
  const obj = L.join("\n"), png = pngB64; const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.evaluate(async ([obj, png]) => { const MF = window.MakerForge; MF.state.printer.colors = 6;
    await MF.paint.importModel(new File([obj], "footballer.obj")); }, [obj, png]);
  await settle();
  await page.evaluate(async png => { const MF = window.MakerForge, bin = Uint8Array.from(atob(png), c => c.charCodeAt(0));
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "paint").click(); await new Promise(r => setTimeout(r, 100));
    await MF.paint.photo.add([new File([bin], "front.png", { type:"image/png" })]); }, png);
  await settle();
  // the click tool, a click on the shirt with the mouse
  await page.evaluate(() => { const cv = document.querySelector("canvas.photoPrev"); let el = cv; while (el && !el.dataset.page && el.id !== "panel") el = el.parentElement;
    const rb = [...document.querySelectorAll("#secrail button")]; const want = rb.find(b => b.dataset.title === "Auto colour"); if (want) want.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { [...document.querySelectorAll("#panel .seg.tool button")].find(b => /Click to colour/.test(b.textContent)).click(); });
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => { const cv = document.querySelector("canvas.photoPrev"); cv.scrollIntoView({ block:"center" }); const r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height), w = cv.width * k, h = cv.height * k; return { x:r.left + (r.width - w) / 2, y:r.top + (r.height - h) / 2, w, h }; });
  const t0 = Date.now();
  await page.mouse.click(box.x + 0.488 * box.w, box.y + 0.43 * box.h);
  try { await page.waitForFunction(() => { const c = window.MakerForge.paint.photo.sam.click; return c.res && !c.busy; }, null, { timeout:120000 }); }
  catch (e){ console.log("  FAIL the first click outlined nothing", JSON.stringify(await page.evaluate(() => { const S = window.MakerForge.paint.photo.sam; return { err:S.state.error, notice:document.querySelector("#notice").textContent }; }))); process.exit(1); }
  const first = Date.now() - t0; await page.waitForTimeout(300);
  const t1 = Date.now(); await page.mouse.click(box.x + 0.47 * box.w, box.y + 0.5 * box.h);
  await page.waitForFunction(n => { const c = window.MakerForge.paint.photo.sam.click; return c.points.length === 2 && c.res && !c.busy; }, null, { timeout:60000 });
  const second = Date.now() - t1; await page.waitForTimeout(400);
  const info = await page.evaluate(() => { const c = window.MakerForge.paint.photo.sam.click; return { pts:c.points.length, cover:c.res.mask.reduce((a, b) => a + b, 0) / c.res.mask.length, score:c.res.score }; });
  // paint it in a new filament
  await page.evaluate(async () => { const MF = window.MakerForge; MF.state.slots.push({ hex:"#1e5ac8", name:"Royal blue", mat:"PLA", price:20 }); MF.paint.ui.slot = MF.state.slots.length - 1; MF.render(); await new Promise(r => setTimeout(r, 200));
    [...document.querySelectorAll("#panel button")].find(b => b.textContent === "Paint it").click(); });
  await settle(); await page.waitForTimeout(800);
  const after = await page.evaluate(() => { const MF = window.MakerForge, p = MF.parts[0]; let n = 0; const s = MF.state.slots.length - 1; p.paint.forEach(v => { if (v === s) n++; }); return { n, ops:MF.state.paint.ops.map(o => o.k) }; });
  check(fetched.includes("vision_encoder_quantized.onnx") && fetched.includes("prompt_encoder_mask_decoder_quantized.onnx"), "the two model files are downloaded (and checked) the first time", fetched.filter(f => /onnx/.test(f)).join(", "));
  check(info.pts === 2 && info.cover > 0.03 && info.cover < 0.15 && info.score > 0.8, "two clicks on the shirt outline it", `${(info.cover * 100).toFixed(1)}% of the photo, ${(info.score * 100).toFixed(0)}% sure; the first click ${first} ms (download and reading the photo), the second ${second} ms`);
  check(after.n > 5000 && after.ops.join() === "photo,photoarea", "Paint it paints the shirt in the new filament", `${after.n} triangles`);
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(out.join("\n")); await b.close(); process.exit(out.some(l => l.includes("FAIL")) ? 1 : 0);
})().catch(e => { console.log(e.stack); process.exit(1); });
