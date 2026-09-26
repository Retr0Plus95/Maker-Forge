// Real-browser check: opens the built app in Chromium (Playwright), answers the CDN script requests
// from node_modules (same files, so the SRI hashes still match) and walks every quick start, every
// object and every panel page, taking screenshots and checking what jsdom cannot see:
//   - page errors, console errors and failed requests;
//   - the 3D view actually draws the model (pixels differ from the background);
//   - layout: sideways page scroll, panel content wider than the panel, HUD pills hidden behind the
//     view buttons, text cut off in buttons and labels;
//   - web fonts loaded, and the checks list with real glyph shapes (the jsdom stub draws boxes).
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
];
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
  async function openPage(viewport, label) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: env.THEME === "dark" ? "dark" : "light" });
    const page = await ctx.newPage();
    await page.route(/cdn\.jsdelivr\.net/, r => {
      const u = r.request().url(), l = LIBS.find(([re]) => re.test(u));
      if (!l) { errors.push(`${label}: unexpected CDN request ${u}`); return r.abort(); }
      return r.fulfill({ status: 200, contentType: "application/javascript", headers: { "access-control-allow-origin": "*" }, body: fs.readFileSync(path.join(NM, l[1])) });
    });
    // web fonts: fetched by Node (which knows the system's and NODE_EXTRA_CA_CERTS certificates), so a
    // proxy that re-signs TLS does not break them; offline, the app falls back to system fonts
    await page.route(/fonts\.(googleapis|gstatic)\.com/, async r => {
      try { await r.fulfill({ response: await r.fetch() }); } catch (e) { notes.push("web fonts could not be fetched: " + e.message.split("\n")[0]); await r.abort(); }
    });
    page.on("pageerror", e => errors.push(`${label}: page error: ${e.message}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`${label}: console: ${m.text()}`); });
    page.on("requestfailed", r => { if (!/fonts\./.test(r.url())) errors.push(`${label}: request failed: ${r.url()} ${r.failure() && r.failure().errorText}`); });
    // a clean start: no saved project from an earlier run
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
    await page.goto("file://" + FILE);
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
