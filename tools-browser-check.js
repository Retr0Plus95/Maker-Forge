// Real-browser check: opens the built app in Chromium (Playwright), answers the CDN script requests
// from node_modules (same files, so the SRI hashes still match) and walks every quick start, every
// object and every panel page, taking screenshots and checking what jsdom cannot see:
//   - page errors, console errors and failed requests;
//   - the 3D view actually draws the model (pixels differ from the background);
//   - layout: sideways page scroll, panel content wider than the panel, HUD pills hidden behind the
//     view buttons, text cut off in buttons and labels;
//   - web fonts loaded, and the checks list with real glyph shapes (the jsdom stub draws boxes);
//   - what only a browser does: an SVG drawn at its own size, the measuring tape, the section view and
//     a share link opened in a second page, a brush stroke made with the mouse and a painted 3mf opened again.
//
//   node tools-browser-check.js index.html [out-dir]        (default out-dir: browser-check/)
//   ONLY=nameplate,enclosure   objects to open (skips quick starts unless PRESETS=1)
//   PAGES=0                    no screenshot per panel page (faster)
//   MOBILE=1                   also check a phone-sized window (390 × 844)
//   THEME=dark                 dark theme
//   PRINT=1                    wait for the printability check on every quick start and report it
//
// Needs Playwright with Chromium: `npm i --no-save playwright && npx playwright install chromium`
// (a globally installed playwright is found too). Screenshots and report.html go to out-dir.
"use strict";
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");
const { encodePNG, decodePNG } = require("./tools-test-env.js");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) {}
  try { return require(path.join(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), "playwright")); } catch (e) {}
  console.error("Playwright is not installed: npm i --no-save playwright && npx playwright install chromium");
  process.exit(2);
}
const { chromium } = loadPlaywright();
const FILE = path.resolve(process.argv[2] || "index.html");
const OUT = path.resolve(process.argv[3] || "browser-check");
const NM = path.join(__dirname, "node_modules");
const LIBS = [
  [/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"],
  [/three@[\d.]+\/examples\/js\/controls\/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"],
  [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"],
  // the AI figure finder (Session 17), only when it is asked for: the runtime, and the model from the repository
  [/onnxruntime-web@[\d.]+\/dist\/ort\.wasm\.bundle\.min\.mjs/, "onnxruntime-web/dist/ort.wasm.bundle.min.mjs"],
  [/onnxruntime-web@[\d.]+\/dist\/ort-wasm-simd-threaded\.wasm/, "onnxruntime-web/dist/ort-wasm-simd-threaded.wasm"],
  [/gh\/Retr0Plus95\/Maker-Forge@[^/]+\/models\/u2netp\.onnx/, "../models/u2netp.onnx"],
];
const TYPES = { js: "application/javascript", mjs: "application/javascript", wasm: "application/wasm", onnx: "application/octet-stream" };
const env = process.env, ONLY = env.ONLY ? env.ONLY.split(",") : null;
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/\.(png|html|json)$/.test(f)) fs.unlinkSync(path.join(OUT, f));

const shots = [], findings = [], notes = [];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let shotN = 0;

// what the page itself measures (runs in the browser)
function pageLayout() {
  const out = [], vw = innerWidth, de = document.documentElement;
  const vis = el => { if (el.closest("[hidden]")) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
  const name = el => (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "")) +
    (el.textContent.trim() ? ` "${el.textContent.trim().replace(/\s+/g, " ").slice(0, 40)}"` : "");
  if (de.scrollWidth > vw + 1 && getComputedStyle(document.body).overflowX !== "hidden") out.push(`page scrolls sideways (${de.scrollWidth} px in a ${vw} px window)`);
  const panel = document.querySelector("#panel");
  if (panel && vis(panel)) {
    const pr = panel.getBoundingClientRect();
    const seen = new Set();
    for (const el of panel.querySelectorAll("*")) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > pr.right + 2 || r.left < pr.left - 2) {
        // report the outermost offender only
        let p = el.parentElement, inner = false;
        while (p && p !== panel) { if (seen.has(p)) { inner = true; break; } p = p.parentElement; }
        seen.add(el);
        if (!inner) out.push(`wider than the panel by ${Math.round(Math.max(r.right - pr.right, pr.left - r.left))} px: ${name(el)}`);
      }
    }
    // text cut off: a leaf-ish element with hidden overflow whose content is wider or taller
    for (const el of panel.querySelectorAll("button, label, .hint, h2, h3, summary, .seg button, option, span, b")) {
      if (!vis(el) || el.children.length > 2) continue;
      const cs = getComputedStyle(el);
      if (cs.overflow === "visible" && cs.overflowX === "visible") continue;
      if (el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== "ellipsis") out.push(`text cut off (${el.scrollWidth} > ${el.clientWidth} px): ${name(el)}`);
    }
  }
  // HUD: pills must not sit under the view buttons, and neither may leave the view
  const stage = document.querySelector("#view"), vt = document.querySelector(".viewtools");
  const hud = [...document.querySelectorAll(".hudpills .pill, #notice, .explode")].filter(vis);
  if (vt && vis(vt)) {
    const a = vt.getBoundingClientRect();
    for (const el of hud) {
      const b = el.getBoundingClientRect();
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 1 && iy > 1) out.push(`${name(el)} is covered by the view buttons (${Math.round(ix)} × ${Math.round(iy)} px)`);
    }
  }
  if (stage && vis(stage)) {
    const s = stage.getBoundingClientRect();
    for (const el of hud.concat(vt ? [vt] : [])) {
      if (!vis(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.right > s.right + 1 || b.left < s.left - 1) out.push(`${name(el)} runs outside the 3D view`);
    }
    for (const el of hud) {
      if (el.scrollWidth > el.clientWidth + 2) out.push(`text cut off (${el.scrollWidth} > ${el.clientWidth} px): ${name(el)}`);
    }
  }
  return out;
}
// how much of the 3D view differs from its background colour (0..1)
function pageCoverage() {
  const cv = document.querySelector("#view canvas");
  if (!cv || !cv.width) return -1;
  const w = 240, h = Math.max(1, Math.round(240 * cv.height / cv.width)), c = document.createElement("canvas");
  c.width = w; c.height = h; const g = c.getContext("2d"); g.drawImage(cv, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, count = new Map();
  for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4; count.set(k, (count.get(k) || 0) + 1); }
  // the background is the bed and the empty space; the model is whatever is not one of the common flat colours
  let bg = 0; [...count.values()].sort((a, b) => b - a).slice(0, 3).forEach(v => bg += v);
  return 1 - bg / (w * h);
}

(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
    proxy: env.HTTPS_PROXY ? { server: env.HTTPS_PROXY } : undefined,
  });
  const errors = [];
  async function openPage(viewport, label, url) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: env.THEME === "dark" ? "dark" : "light" });
    const page = await ctx.newPage();
    await page.route(/cdn\.jsdelivr\.net/, r => {
      const u = r.request().url(), l = LIBS.find(([re]) => re.test(u));
      // the fonts are built into the page: a font download means one is missing from fonts/
      if (/\/@fontsource\/|\.woff2?(\?|$)/.test(u)) { errors.push(`${label}: a font was downloaded ${u}`); return r.abort(); }
      if (!l) { errors.push(`${label}: unexpected CDN request ${u}`); return r.abort(); }
      return r.fulfill({ status: 200, contentType: TYPES[l[1].split(".").pop()], headers: { "access-control-allow-origin": "*" }, body: fs.readFileSync(path.join(NM, l[1])) });
    });
    // nor ask Google (or anyone) for fonts
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => { errors.push(`${label}: Google Fonts request ${r.request().url()}`); return r.abort(); });
    page.on("pageerror", e => errors.push(`${label}: page error: ${e.message}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`${label}: console: ${m.text()}`); });
    page.on("requestfailed", r => { if (!/fonts\./.test(r.url())) errors.push(`${label}: request failed: ${r.url()} ${r.failure() && r.failure().errorText}`); });
    // a clean start: no saved project from an earlier run
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto(url || "file://" + FILE);
    await page.waitForFunction(() => window.MakerForge && window.MakerForge.rev > 0 && !window.MakerForge.busy, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  const settle = page => page.evaluate(async () => {
    const MF = window.MakerForge, r0 = MF.rev, sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 1200; i++) { if (!MF.busy) { await sleep(60); if (!MF.busy) break; } await sleep(25); }
    await document.fonts.ready; await sleep(120);
  });
  async function shot(page, name, caption, extra = {}) {
    const file = `${String(++shotN).padStart(3, "0")}-${slug(name)}.png`;
    await page.screenshot({ path: path.join(OUT, file) });
    const layout = await page.evaluate(pageLayout);
    layout.forEach(t => findings.push({ where: caption, what: t }));
    shots.push({ file, caption, layout, ...extra });
    return file;
  }
  async function modelInfo(page, label) {
    const info = await page.evaluate(() => {
      const MF = window.MakerForge, n = document.querySelector("#notice");
      return { type: MF.state.base.type, parts: MF.parts.length, checks: MF.checks.list.map(l => `${l.k}: ${l.t}${l.s ? " — " + String(l.s).replace(/<[^>]+>/g, "") : ""}`),
        notice: n ? n.textContent.trim() : "", size: (document.querySelector("#stSize") || {}).textContent };
    });
    info.coverage = await page.evaluate(pageCoverage);
    if (info.parts && info.coverage >= 0 && info.coverage < 0.002) findings.push({ where: label, what: `the 3D view looks empty (${(info.coverage * 100).toFixed(2)}% of pixels differ from the background) although ${info.parts} parts were built` });
    return info;
  }
  const byText = (page, sel, text) => page.evaluate(([s, t]) => { const b = [...document.querySelectorAll(s)].find(b => b.dataset.k === t || b.textContent.trim() === t); if (b) b.click(); return !!b; }, [sel, text]);

  // ---------- desktop ----------
  const page = await openPage({ width: 1440, height: 900 }, "desktop");
  if (env.THEME === "dark") await page.evaluate(() => { const MF = window.MakerForge; MF.state.view.theme = "dark"; document.documentElement.setAttribute("data-theme", "dark"); });
  await shot(page, "start", "Start: default name keychain", await modelInfo(page, "start"));
  // every lettering font and the Easy reading font, built into the page
  {
    const f = await page.evaluate(async () => {
      const rules = [...document.getElementById("webFonts").sheet.cssRules];
      const faces = [...new Set(rules.map(r => `${r.style.fontWeight} 40px ${r.style.fontFamily}`))], bad = [];
      for (const k of faces) { try { if (!(await document.fonts.load(k, "AaZz")).length) bad.push(k); } catch (e) { bad.push(k); } }
      const inline = rules.every(r => /url\("?data:font\/woff2;base64,/.test(r.style.getPropertyValue("src")));
      return { n: faces.length, rules: rules.length, bad, inline };
    });
    if (f.bad.length || f.n < 36 || !f.inline) findings.push({ where: "fonts", what: `${f.bad.length} of ${f.n} fonts did not load${f.inline ? "" : ", and not every font is built in"}: ${f.bad.slice(0, 5).join(", ")}` });
    notes.push(`fonts: ${f.n - f.bad.length} of ${f.n} font faces (${f.rules} alphabet files) loaded, all built into the page`);
  }
  // drop the same two-colour badge the smoke test uses, through the Art tab's drop zone
  {
    const W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, dx = x - 120, dy = y - 90, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const col = r < 40 * (0.62 + 0.38 * Math.cos(5 * a)) ? [240, 190, 30] : r < 75 ? [25, 90, 170] : [255, 255, 255];
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
    await byText(page, "#tabs button", "art");
    await page.evaluate(async b64 => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), dt = new DataTransfer();
      dt.items.add(new File([bytes], "badge.png", { type: "image/png" }));
      document.querySelector("#drop").dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      for (let i = 0; i < 200 && !window.MakerForge.state.items.some(d => d.name === "badge"); i++) await new Promise(r => setTimeout(r, 30));
    }, encodePNG(W, H, px).toString("base64"));
    await settle(page);
    if (!(await page.evaluate(() => window.MakerForge.state.items.some(d => d.name === "badge")))) findings.push({ where: "Art tab", what: "the dropped picture was not added" });
    // the other tabs, every page, once
    const tabs = (await page.evaluate(() => [...document.querySelectorAll("#tabs button")].map(b => b.dataset.k))).filter(t => t !== "make");
    for (const t of tabs) {
      await byText(page, "#tabs button", t); await page.waitForTimeout(150);
      const n = await page.evaluate(() => document.querySelectorAll("#secrail button").length);
      for (let i = 0; i < (env.PAGES === "0" ? 1 : n); i++) {
        await page.evaluate(i => { const b = document.querySelectorAll("#secrail button")[i]; if (b && b.getAttribute("aria-pressed") !== "true") b.click(); }, i);
        await page.waitForTimeout(120);
        const title = await page.evaluate(() => (document.querySelector("#sheetTitle") || {}).textContent || "");
        await shot(page, `tab-${t}-${i}`, `${t} tab, page ${i + 1}/${n}: ${title}`);
      }
    }
    for (const [btn, cap] of [["#settingsBtn", "Settings dialog"], ["#aboutBtn", "About dialog"]]) {
      await page.click(btn); await page.waitForTimeout(200); await shot(page, cap, cap);
      await page.click("#modalClose"); await page.waitForTimeout(100);
    }
    await byText(page, "#tabs button", "make");
  }
  // quick starts
  const presets = ONLY && !env.PRESETS ? [] : await page.evaluate(() => [...document.querySelectorAll("#presetGallery button")].map(b => b.dataset.k));
  const printRows = [];
  for (const k of presets) {
    await page.evaluate(k => [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === k).click(), k);
    await settle(page);
    const info = await modelInfo(page, "quick start " + k);
    if (env.PRINT) {
      const pr = await page.evaluate(async () => {
        const MF = window.MakerForge; for (let i = 0; i < 600 && !MF.print; i++) await new Promise(r => setTimeout(r, 50));
        const p = MF.print; if (!p) return null;
        return { support: Math.round(p.overhang.area), thin: p.thin.length, thinAt: p.thin.slice(0, 3).map(t => `${t.name} ${t.width.toFixed(2)} mm at ${t.y.toFixed(1)} mm`), contact: Math.round(p.contact.area) };
      });
      printRows.push({ k, ...pr });
    }
    await shot(page, "preset-" + k, `Quick start: ${k} (${info.parts} parts)`, info);
  }
  // objects, and each page of their Make tab
  const objects = (await page.evaluate(() => [...document.querySelector("#objectSel").options].map(o => o.value))).filter(v => v !== "stl" && (!ONLY || ONLY.includes(v)));
  for (const obj of objects) {
    await page.evaluate(obj => { const s = document.querySelector("#objectSel"); s.value = obj; s.dispatchEvent(new Event("change")); }, obj);
    await settle(page);
    const info = await modelInfo(page, "object " + obj);
    const n = await page.evaluate(() => document.querySelectorAll("#secrail button").length);
    for (let i = 0; i < (env.PAGES === "0" ? 1 : n); i++) {
      await page.evaluate(i => { const b = document.querySelectorAll("#secrail button")[i]; if (b && b.getAttribute("aria-pressed") !== "true") b.click(); }, i);
      await page.waitForTimeout(120);
      const title = await page.evaluate(() => (document.querySelector("#sheetTitle") || {}).textContent || "");
      await shot(page, `object-${obj}-${i}`, `Object ${obj}, Make page ${i + 1}/${n}: ${title}`, i ? {} : info);
    }
  }
  // ---------- things only a real browser does ----------
  {
    const r = await page.evaluate(async () => {
      const MF = window.MakerForge, sleep = ms => new Promise(q => setTimeout(q, ms)), out = {};
      const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 1200; i++){ if (!MF.busy){ await sleep(60); if (!MF.busy) break; } await sleep(25); } };
      // an SVG drawn in mm keeps its size: a 40 × 20 mm plate with a 6 mm hole on a 60 × 40 mm page
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><path fill="#111" fill-rule="evenodd" d="M10 10 H50 V30 H10 Z M30 17 a3 3 0 1 0 0.001 0 Z"/></svg>`;
      const dt = new DataTransfer(); dt.items.add(new File([svg], "plate.svg", { type:"image/svg+xml" }));
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "art").click(); await sleep(100);
      const n0 = MF.state.items.length;
      document.querySelector("#drop").dispatchEvent(new DragEvent("drop", { bubbles:true, cancelable:true, dataTransfer:dt }));
      for (let i = 0; i < 100 && MF.state.items.length === n0; i++) await sleep(50);
      const s = document.querySelector("#objectSel"); s.value = "tracer"; s.dispatchEvent(new Event("change")); await settle();
      Object.assign(MF.state.base.tracer, { scaleFrom:"file", smooth:0 }); MF.rebuild(false); await settle();
      const d = MF.tracer && MF.tracer.dims;
      out.svg = d ? [d.width, d.height] : null; out.hole = MF.tracer && MF.tracer.holes[0] && MF.tracer.holes[0].measured;
      MF.state.base.tracer.scaleFrom = "measure";
      // the measuring tape: two corners of the project box's front wall, 92 mm apart
      [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === "Project box").click(); await settle();
      document.querySelector("#vMeasure").click(); await sleep(100);
      const cv = document.querySelector("#view canvas"), rect = cv.getBoundingClientRect();
      for (const x of [-45.8, 45.8]){
        const v = new THREE.Vector3(x, 35.8, 32).project(MF.camera), cx = rect.left + (v.x + 1)/2*rect.width, cy = rect.top + (1 - v.y)/2*rect.height;
        cv.dispatchEvent(new PointerEvent("pointerdown", { clientX:cx, clientY:cy, bubbles:true })); cv.dispatchEvent(new PointerEvent("pointerup", { clientX:cx, clientY:cy, bubbles:true }));
        await sleep(100);
      }
      const m = MF.measure; out.measure = m.length === 2 ? Math.hypot(m[0][0] - m[1][0], m[0][1] - m[1][1], m[0][2] - m[1][2]) : null;
      document.querySelector("#vMeasure").click();
      // the section view clips the model at the slider's height
      document.querySelector("#vSection").click(); const sr = document.querySelector("#sectionR"); sr.value = 50; sr.dispatchEvent(new Event("input")); await sleep(200);
      out.section = document.querySelector("#sectionV").textContent;
      document.querySelector("#vSection").click();
      // a list of names: one plate each, laid out on the bed; a pasted spreadsheet row keeps its first column
      [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === "Name keychain").click(); await settle();
      Object.assign(MF.state.base.nameplate, { batch:true, names:"Emma\nNoah\n\"Olivia\",7B" }); MF.rebuild(false); await settle();
      const openParts = MF.parts.filter(q => MF.core.checkMesh(q.solid).open).length;
      out.batch = { parts: MF.parts.length, open: openParts, check: (MF.checks.list.find(l => /name plates/.test(l.t)) || {}).t };
      MF.state.base.nameplate.batch = false;
      [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === "Project box").click(); await settle();
      MF.state.base.enclosure.lid = "slide"; MF.state.base.enclosure.cut[0].label = "USB-C";
      // a share link opens the same design
      out.link = await MF.shareLink(); out.sig = JSON.stringify(MF.state.base.enclosure);
      return out;
    });
    const near = (a, b, t) => a != null && Math.abs(a - b) <= t;
    if (!(r.svg && near(r.svg[0], 40, 0.05) && near(r.svg[1], 20, 0.05) && near(r.hole, 6, 0.05))) findings.push({ where:"SVG import", what:`a 40 × 20 mm SVG plate traced at ${r.svg && r.svg.map(v => v.toFixed(2)).join(" × ")} mm, hole ${r.hole && r.hole.toFixed(2)} mm` });
    if (!near(r.measure, 92, 0.05)) findings.push({ where:"measuring tape", what:`the project box's front wall measured ${r.measure && r.measure.toFixed(2)} mm instead of 92` });
    if (!(r.batch && r.batch.open === 0 && /^3 name plates/.test(r.batch.check || ""))) findings.push({ where:"name list", what:`three names gave ${JSON.stringify(r.batch)}` });
    if (r.section !== "18.0 mm") findings.push({ where:"section view", what:`the cut at 50% of 36 mm reads ${r.section}` });
    const other = await openPage({ width: 1200, height: 800 }, "share link", r.link.url);
    await other.waitForTimeout(800);
    const sig2 = await other.evaluate(() => JSON.stringify(window.MakerForge.state.base.enclosure));
    if (sig2 !== r.sig) findings.push({ where:"share link", what:"the design opened from the link is not the one that was shared" });
    notes.push(`browser-only features: SVG ${r.svg && r.svg.map(v => v.toFixed(3)).join(" × ")} mm, measure ${r.measure && r.measure.toFixed(3)} mm, section ${r.section}, share link ${r.link.url.length} characters, name list: ${r.batch && r.batch.check}`);
    await other.context().close();
  }
  // ---------- the colour painter with a real mouse, and a painted 3mf opened again (Session 13) ----------
  {
    const s = await page.evaluate(async () => {
      const MF = window.MakerForge, sleep = ms => new Promise(q => setTimeout(q, ms));
      const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 1200; i++){ if (!MF.busy){ await sleep(60); if (!MF.busy) break; } await sleep(25); } };
      const sel = document.querySelector("#objectSel"); sel.value = "turned"; sel.dispatchEvent(new Event("change")); await settle();
      MF.state.paint.ops = [{ k:"height", slots:[0, 1], cuts:[45] }]; MF.paint.repaint(); await settle();
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "paint").click(); await sleep(100);
      [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Brush and fill").click(); await sleep(100);
      MF.paint.ui.tool = "brush"; MF.paint.ui.slot = Math.min(2, MF.state.slots.length - 1); MF.paint.ui.r = 5;
      const r = document.querySelector("#view canvas").getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2, ops: MF.state.paint.ops.length };
    });
    await page.mouse.move(s.x - 30, s.y); await page.mouse.down();
    for (let i = 0; i <= 12; i++) await page.mouse.move(s.x - 30 + i*5, s.y + Math.sin(i/2)*6);
    await page.mouse.up(); await settle(page);
    const brushed = await page.evaluate(() => { const o = window.MakerForge.state.paint.ops; return { n:o.length, k:o[o.length - 1].k, pts:(o[o.length - 1].pts || []).length }; });
    await shot(page, "paint-brush", "Paint tab: height bands and a brush stroke made with the mouse");
    if (!(brushed.n === s.ops + 1 && brushed.k === "brush" && brushed.pts >= 3)) findings.push({ where:"paint brush", what:`dragging on the model left ${JSON.stringify(brushed)}` });
    // Session 18: the brush preview under the pointer, then a box and a lasso drawn with the mouse
    await page.mouse.move(s.x + 5, s.y - 20); await page.waitForTimeout(150); await page.mouse.move(s.x + 6, s.y - 22); await page.waitForTimeout(150);
    const pv = await page.evaluate(() => window.MakerForge.paint.previewCount);
    await shot(page, "paint-brush-preview", "Paint tab: the brush preview lights up what the brush will paint");
    if (!(pv > 0)) findings.push({ where:"brush preview", what:`hovering with the brush lit up ${pv} triangles` });
    const area = async (shape, pts) => {
      await page.evaluate(sh => { const MF = window.MakerForge; MF.paint.ui.tool = "area"; MF.paint.ui.area = sh; MF.paint.ui.slot = 3; MF.render(); }, shape);
      const n0 = await page.evaluate(() => window.MakerForge.state.paint.ops.length);
      await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
      for (const q of pts.slice(1)) await page.mouse.move(q[0], q[1], { steps: 4 });
      await page.mouse.up(); await settle(page);
      return page.evaluate(n0 => { const MF = window.MakerForge, o = MF.state.paint.ops; let c = 0; MF.parts.forEach(p => p.paint && p.paint.forEach(v => { if (v === 3) c++; }));
        return { added: o.length - n0, k: o.length ? o[o.length - 1].k : "", points: o.length ? (o[o.length - 1].poly || []).length : 0, painted: c }; }, n0);
    };
    const bx = await area("box", [[s.x - 60, s.y - 60], [s.x + 60, s.y + 40]]);
    await shot(page, "paint-box", "Paint tab: a box drawn over the model paints the side you see");
    const lz = await area("lasso", [[s.x - 40, s.y + 60], [s.x + 40, s.y + 70], [s.x + 50, s.y + 120], [s.x, s.y + 140], [s.x - 50, s.y + 110]]);
    if (!(bx.added === 1 && bx.k === "area" && bx.points === 4 && bx.painted > 0)) findings.push({ where:"box select", what:JSON.stringify(bx) });
    if (!(lz.added === 1 && lz.k === "area" && lz.points >= 5 && lz.painted > bx.painted)) findings.push({ where:"lasso select", what:JSON.stringify(lz) });
    notes.push(`painter tools: the brush preview lit ${pv} triangles; a box painted ${bx.painted} triangles, then a lasso of ${lz.points} points took it to ${lz.painted}`);
    await page.evaluate(() => { const MF = window.MakerForge; MF.paint.ui.tool = "brush"; MF.render(); });
    const exp = await page.evaluate(async () => {
      const MF = window.MakerForge, parts = MF.exportParts(), zip = await MF.paint.buildZip(parts, "vase"), u8 = await zip.file("model-bambu.3mf").async("uint8array");
      // the filament each triangle in the file prints in: its paint, or its part's own filament (a brim too)
      const c = {}; parts.forEach(p => { const n = p.idx.length / 3; for (let t = 0; t < n; t++){ const v = p.paint && p.paint[t] !== 255 ? p.paint[t] : p.slot; c[v] = (c[v] || 0) + 1; } });
      let b = ""; for (let i = 0; i < u8.length; i += 0x8000) b += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return { b64: btoa(b), counts: JSON.stringify(c), parts: parts.map(p => `${p.name} ${p.slot} ${p.idx.length / 3}`).join(", ") };
    });
    const f3 = path.join(OUT, "painted.3mf"); fs.writeFileSync(f3, Buffer.from(exp.b64, "base64"));
    await page.evaluate(() => { const sel = document.querySelector("#objectSel"); sel.value = "stl"; });
    await page.setInputFiles("#stlInput", f3);
    await page.waitForFunction(() => /^painted\.3mf/.test((window.MakerForge.state.base.stl || {}).name || ""), null, { timeout: 180000 }).catch(() => {});
    await settle(page);
    // the opened file only: a picture still on the project is laid on the new model as a fresh decal
    const back = await page.evaluate(() => { const MF = window.MakerForge, c = {};
      MF.parts.filter(p => "importPaint" in p).forEach(p => { const n = p.solid.idx.length / 3; for (let t = 0; t < n; t++){ const v = p.paint && p.paint[t] !== 255 ? p.paint[t] : p.slot; c[v] = (c[v] || 0) + 1; } });
      return { type:MF.state.base.type, counts:JSON.stringify(c), parts:MF.parts.map(p => `${p.name} ${p.slot} ${p.solid.idx.length / 3}`).join(", ") }; });
    fs.unlinkSync(f3);
    if (back.type !== "stl" || back.counts !== exp.counts) findings.push({ where:"painted 3mf", what:`exported ${exp.counts} (${exp.parts}), read back ${back.counts} (${back.type}: ${back.parts})` });
    await shot(page, "paint-reimported", "A painted Bambu 3mf opened again: the paint is kept");
    notes.push(`painter: a mouse stroke of ${brushed.pts} points; a painted 3mf read back ${back.counts === exp.counts ? "with every triangle's colour" : "DIFFERENT"}`);
  }
  // ---------- colour from a photo: a plain figure, then a photo of its front and one of its back (Session 16) ----------
  {
    require(path.join(__dirname, "src", "core.js"));
    const PC = globalThis.PRCore, F = require("./tools-photo-figure.js")(PC);
    const fig = F.figure(), topo = PC.meshTopology(fig.solid), cls = F.truth(topo, fig.partOf), W = 600, H = 800;
    const photo = (cam, fit, seed, name) => { const r = F.render(fig.solid, topo, cls, cam, fit, W, H, seed), f = path.join(OUT, name); fs.writeFileSync(f, encodePNG(W, H, r.rgba)); return f; };
    const fFront = photo("front", { a: 6.3 / H, tx: 310 / H, ty: 760 / H, rot: 0.04, mirror: false }, 1, "photo-front.png");
    const fBack = photo("back", { a: 5.8 / H, tx: 290 / H, ty: 745 / H, rot: -0.03, mirror: false }, 2, "photo-back.png");
    const raw = fig.raw, lines = [];
    for (let i = 0; i < raw.pos.length; i += 3) lines.push(`v ${raw.pos[i]} ${-raw.pos[i + 2]} ${raw.pos[i + 1]}`);     // Z up, as printers have it
    for (let i = 0; i < raw.idx.length; i += 3) lines.push(`f ${raw.idx[i] + 1} ${raw.idx[i + 1] + 1} ${raw.idx[i + 2] + 1}`);
    const fObj = path.join(OUT, "footballer.obj"); fs.writeFileSync(fObj, lines.join("\n"));
    // the badge from the Art tab would be laid on the figure as a decal: leave it out of this one
    await page.evaluate(() => { const MF = window.MakerForge; MF.state.items.length = 0; MF.state.active = -1; MF.state.printer.colors = 6; const sel = document.querySelector("#objectSel"); sel.value = "stl"; });
    await page.setInputFiles("#stlInput", fObj);
    await page.waitForFunction(() => /^footballer\.obj/.test((window.MakerForge.state.base.stl || {}).name || ""), null, { timeout: 180000 }).catch(() => {});
    await settle(page);
    await page.evaluate(async () => {
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "paint").click(); await new Promise(r => setTimeout(r, 100));
      const b = [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Auto colour"); if (b) b.click();
    });
    const t0 = Date.now();
    await page.setInputFiles("#photoInput", [fFront, fBack]);
    await page.waitForFunction(() => { const MF = window.MakerForge, o = MF.paint.photo.op; return o && o.views.length === 2 && MF.paint.photo.info(o) && !MF.busy; }, null, { timeout: 240000 }).catch(() => {});
    await settle(page);
    const ms = Date.now() - t0;
    const r = await page.evaluate(() => {
      const MF = window.MakerForge, o = MF.paint.photo.op, p = MF.parts[0], cv = document.querySelector("canvas.photoPrev");
      let yellow = 0; if (cv){ const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 214 && d[i + 2] === 0) yellow++; }
      const b = cv && cv.getBoundingClientRect();
      return { views: o ? o.views.map(v => ({ yaw: v.cam.yaw, match: v.match })) : [], colours: o ? o.pal.length : 0, slots: MF.state.slots.map(s => s.name).join(", "),
        painted: p && p.paint ? p.paint.filter(s => s !== 255).length / p.paint.length : 0, yellow, box: b && { x: b.left + b.width / 2, y: b.top + b.height / 2, h: b.height }, tx: o && o.views[MF.paint.ui.photo].fit.tx };
    });
    await page.evaluate(() => document.querySelector("canvas.photoPrev") && document.querySelector("canvas.photoPrev").scrollIntoView({ block: "center" }));
    await shot(page, "paint-photo", "Paint tab: a plain figure coloured from a photo of its front and one of its back", await modelInfo(page, "paint from a photo"));
    const ok = r.views.length === 2 && r.views.every(v => v.match > 0.8) && Math.abs(r.views[0].yaw) <= 10 && Math.abs(Math.abs(r.views[1].yaw) - 180) <= 10 && r.colours === 6 && r.painted > 0.999 && r.yellow > 200;
    if (!ok) findings.push({ where: "paint from a photo", what: `after two photos: ${JSON.stringify(r)}` });
    // drag the photo with the mouse, then look at the colours it reads
    let dragged = null;
    if (r.box){
      const b = await page.evaluate(() => { const b = document.querySelector("canvas.photoPrev").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, h: b.height }; });
      const tx0 = await page.evaluate(() => { const MF = window.MakerForge, o = MF.paint.photo.op; return o.views[MF.paint.ui.photo].fit.tx; });
      await page.mouse.move(b.x, b.y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(b.x + i * 5, b.y); await page.mouse.up();
      const tx1 = await page.evaluate(() => { const MF = window.MakerForge, o = MF.paint.photo.op; return o.views[MF.paint.ui.photo].fit.tx; });
      dragged = (tx1 - tx0) * b.h;
      if (Math.abs(dragged - 30) > 3) findings.push({ where: "paint from a photo", what: `dragging the preview 30 px moved the photo ${dragged.toFixed(1)} px` });
      await page.evaluate(tx => { const MF = window.MakerForge, o = MF.paint.photo.op; o.views[MF.paint.ui.photo].fit.tx = tx; }, tx0);
      await page.evaluate(() => { const b = [...document.querySelectorAll("#panel .seg.show button")].find(b => b.dataset.k === "colours"); if (b) b.click(); });
      await settle(page);
      await shot(page, "paint-photo-colours", "Paint tab: the colours read from the photo, each in the filament it prints in");
      await page.evaluate(() => { const b = [...document.querySelectorAll("#panel .seg.show button")].find(b => b.dataset.k === "photo"); if (b) b.click(); });
    }
    [fFront, fBack, fObj].forEach(f => fs.unlinkSync(f));
    notes.push(`colour from a photo: ${r.views.map(v => `${v.yaw}° (outline ${Math.round(v.match * 100)}%)`).join(" and ")}, ${r.colours} colours (${r.slots}), ${(r.painted * 100).toFixed(1)}% painted, ${ms} ms; a 30 px drag moved it ${dragged == null ? "–" : dragged.toFixed(1)} px`);

    // ---------- the AI figure finder (Session 17): a photo in front of a bookshelf ----------
    const fShelf = path.join(OUT, "photo-shelf.png");
    fs.writeFileSync(fShelf, encodePNG(W, H, F.onShelfBackground(F.render(fig.solid, topo, cls, "front", { a: 6.3 / H, tx: 310 / H, ty: 760 / H, rot: 0.04, mirror: false }, W, H, 1), W, H, 11).rgba));
    await page.evaluate(() => { const MF = window.MakerForge; MF.state.paint.ops.length = 0; MF.paint.repaint(); });
    await page.setInputFiles("#photoInput", fShelf);
    await page.waitForFunction(() => { const o = window.MakerForge.paint.photo.op; return o && o.views.length === 1 && window.MakerForge.paint.photo.info(o); }, null, { timeout: 240000 }).catch(() => {});
    await settle(page);
    const aiClick = () => page.evaluate(() => { const b = [...document.querySelectorAll("#panel button")].find(b => /Find the figure with AI/.test(b.textContent)); if (b) b.click(); return !!b; });
    const aiIdle = () => page.waitForFunction(() => !/Downloading|Starting|Finding|Lining|Colouring/.test(document.querySelector("#statusLine").textContent), null, { timeout: 240000 }).catch(() => {});
    // a model file that is not the right one is refused before it runs
    const bad = r2 => r2.fulfill({ status: 200, contentType: "application/octet-stream", headers: { "access-control-allow-origin": "*" }, body: Buffer.from("not the model") });
    await page.route(/gh\/Retr0Plus95\/Maker-Forge@[^/]+\/models\/u2netp\.onnx/, bad);
    const clicked = await aiClick(); await page.waitForTimeout(500); await aiIdle();
    const refused = await page.evaluate(() => ({ ai: !!window.MakerForge.paint.photo.op.views[0].ai, notice: document.querySelector("#notice").textContent }));
    await page.unroute(/gh\/Retr0Plus95\/Maker-Forge@[^/]+\/models\/u2netp\.onnx/, bad);
    if (!clicked || refused.ai || !/was not the one it should be/.test(refused.notice)) findings.push({ where: "AI figure finder", what: `a wrong model file was not refused: ${JSON.stringify(refused)}` });
    // the real one: downloaded, checked, run in the browser
    const t1 = Date.now(); await aiClick(); await page.waitForTimeout(500);
    await page.waitForFunction(() => { const MF = window.MakerForge, v = MF.paint.photo.op.views[0]; return v.ai && MF.paint.photo.info(MF.paint.photo.op); }, null, { timeout: 240000 }).catch(() => {});
    await aiIdle(); await settle(page); const aiMs = Date.now() - t1;
    const ai = await page.evaluate(() => { const MF = window.MakerForge, v = MF.paint.photo.op.views[0], p = MF.parts[0];
      return { ai: !!(v.ai && MF.paint.photo.ai.mapOf(v.ai)), match: v.match, yaw: v.cam.yaw, a: v.fit && v.fit.a, painted: p.paint ? p.paint.filter(s => s !== 255).length / p.paint.length : 0,
        ready: !!MF.paint.photo.ai.state.session, text: document.querySelector("#panel").textContent.includes("AI figure finder found the figure") }; });
    const sizeOff = ai.a ? Math.abs(ai.a / (6.3 / H) - 1) : 9;
    await page.evaluate(() => document.querySelector("canvas.photoPrev") && document.querySelector("canvas.photoPrev").scrollIntoView({ block: "center" }));
    await shot(page, "paint-photo-ai", "Paint tab: a photo in front of a bookshelf, the figure found by the AI figure finder");
    if (!(ai.ai && ai.ready && ai.text && ai.match > 0.75 && Math.abs(ai.yaw) <= 10 && sizeOff < 0.03 && ai.painted > 0.999)) findings.push({ where: "AI figure finder", what: JSON.stringify(ai) });
    fs.unlinkSync(fShelf);
    notes.push(`AI figure finder: a wrong model file ${refused.ai ? "WAS NOT" : "was"} refused; the real one found the figure in ${aiMs} ms with the download (outline ${Math.round(ai.match * 100)}%, ${ai.yaw}° round, size off ${(sizeOff * 100).toFixed(1)}%)`);
  }
  await page.context().close();

  // ---------- phone ----------
  if (env.MOBILE) {
    const ph = await openPage({ width: 390, height: 844 }, "phone");
    for (const obj of (ONLY || ["nameplate", "tracer", "enclosure", "jigsaw", "lithophane"])) {
      await ph.evaluate(obj => { const s = document.querySelector("#objectSel"); s.value = obj; s.dispatchEvent(new Event("change")); }, obj);
      await settle(ph);
      const info = await modelInfo(ph, "phone " + obj);
      const file = `${String(++shotN).padStart(3, "0")}-phone-${obj}.png`;
      await ph.screenshot({ path: path.join(OUT, file), fullPage: true });
      const layout = await ph.evaluate(pageLayout); layout.forEach(t => findings.push({ where: "phone " + obj, what: t }));
      shots.push({ file, caption: `Phone: ${obj}`, layout, ...info });
    }
    await ph.context().close();
  }
  await browser.close();

  // ---------- report ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // repeated findings (the same HUD overlap on every page) are grouped
  const grouped = new Map();
  findings.forEach(f => { const k = f.what.replace(/\d+(\.\d+)?/g, "#"); const g = grouped.get(k) || []; g.push(f.where); grouped.set(k, g); });
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ errors, findings, notes, shots, print: printRows }, null, 1));
  fs.writeFileSync(path.join(OUT, "report.html"), `<!doctype html><meta charset="utf-8"><title>Maker Forge browser check</title>
<style>body{font:14px system-ui;margin:16px;background:#f6f6f4;color:#222}h1{font-size:20px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}
figure{margin:0;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px}img{width:100%;border-radius:4px}figcaption{font-size:12px;margin-top:6px}
.bad{color:#b00020}.warn{color:#8a5a00}ul{margin:4px 0 0 18px;padding:0}</style>
<h1>Maker Forge in Chromium</h1>
<p>${shots.length} screenshots · ${errors.length} page errors · ${grouped.size} layout findings</p>
${errors.length ? `<h2 class="bad">Page errors</h2><ul>${errors.map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
${grouped.size ? `<h2 class="warn">Layout</h2><ul>${[...grouped].map(([w, g]) => `<li>${esc(w)} <small>(${g.length}×: ${esc(g.slice(0, 3).join("; "))}${g.length > 3 ? "…" : ""})</small></li>`).join("")}</ul>` : ""}
${printRows.length ? `<h2>Printability with real fonts</h2><ul>${printRows.map(r => `<li>${esc(r.k)}: support ${r.support} mm², ${r.thin} thin walls</li>`).join("")}</ul>` : ""}
<div class="g">${shots.map(s => `<figure><a href="${s.file}"><img loading="lazy" src="${s.file}"></a><figcaption><b>${esc(s.caption)}</b>
${s.checks ? `<ul>${s.checks.filter(c => !/^ok/.test(c)).map(c => `<li class="${c.split(":")[0]}">${esc(c)}</li>`).join("")}</ul>` : ""}
${s.layout.length ? `<ul>${s.layout.map(l => `<li class="warn">${esc(l)}</li>`).join("")}</ul>` : ""}</figcaption></figure>`).join("")}</div>`);

  console.log(`${shots.length} screenshots in ${path.relative(process.cwd(), OUT) || "."}/ (open report.html)`);
  notes.forEach(n => console.log("note: " + n));
  if (printRows.length) { console.log("\nprintability with real fonts:"); printRows.forEach(r => console.log(`  ${r.k.padEnd(22)} support ${String(r.support).padStart(5)} mm²  bed ${String(r.contact).padStart(5)} mm²  thin walls ${r.thin}${r.thin ? " (" + r.thinAt.join(", ") + ")" : ""}`)); }
  if (grouped.size) { console.log("\nLAYOUT:"); for (const [w, g] of grouped) console.log(`  ${w}  (${g.length}×, e.g. ${g[0]})`); }
  if (errors.length) { console.log("\nERRORS:\n  " + errors.slice(0, 30).join("\n  ")); }
  process.exit(errors.length || grouped.size ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
