// Pictures for the Start sidebar: opens the built app in Chromium (Playwright), picks every quick start and
// every object in a fresh page (so each looks as it does for someone new), waits for its example to build and
// asks the app for a picture of the model alone (MakerForge.thumb: no bed or rulers, clear background).
// They are written to examples/start-thumbs.json, which build.py packs into index.html.
//
//   node tools-thumbs.js index.html          (then python3 build.py again)
//   ONLY=jigsaw,Lithophane                   just these (the others are kept from the file)
//
// Needs Playwright with Chromium, like tools-browser-check.js. Run it again after changing an example.
"use strict";
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) {}
  try { return require(path.join(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), "playwright")); } catch (e) {}
  console.error("Playwright is not installed: npm i --no-save playwright && npx playwright install chromium");
  process.exit(2);
}
const { chromium } = loadPlaywright();
const FILE = path.resolve(process.argv[2] || "index.html"), OUT = path.join(__dirname, "examples/start-thumbs.json");
const NM = path.join(__dirname, "node_modules");
const LIBS = [
  [/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"],
  [/three@[\d.]+\/examples\/js\/controls\/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"],
  [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const W = 160, H = 120;

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.route("**/*", r => { const u = r.request().url(); for (const [re, f] of LIBS) if (re.test(u)) return r.fulfill({ path: path.join(NM, f), contentType: "application/javascript" }); r.continue(); });
    page.on("pageerror", e => console.log("  page error:", e.message));
    await page.goto("file://" + FILE);
    await page.waitForFunction(() => window.MakerForge && !MakerForge.busy, null, { timeout: 120000 });
    return { ctx, page };
  };
  const idle = async page => { await page.waitForTimeout(300); await page.waitForFunction(() => !MakerForge.busy, null, { timeout: 300000 }); await page.waitForTimeout(700); };
  const first = await open();
  const presets = await first.page.evaluate(() => [...document.querySelectorAll("#presetGallery button")].map(b => b.dataset.k));
  const objects = await first.page.evaluate(() => [...document.querySelectorAll("#objectSel option")].map(o => o.value).filter(v => MakerForge.examples.forType[v]));
  await first.ctx.close();
  const jobs = [...presets.map(k => ["preset", k]), ...objects.map(k => ["object", k])].filter(([, k]) => !ONLY || ONLY.includes(k));
  const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  for (const [kind, k] of jobs) {
    const t0 = Date.now(), { ctx, page } = await open();
    if (kind === "preset") await page.click(`#presetGallery button[data-k="${k.replace(/"/g, '\\"')}"]`);
    else await page.selectOption("#objectSel", k);
    await idle(page);
    const url = await page.evaluate(([w, h]) => MakerForge.thumb(w, h), [W, H]);
    out[kind + ":" + k] = url;
    console.log(`${kind.padEnd(7)} ${k.padEnd(20)} ${(url.length/1024).toFixed(1).padStart(5)} KB  ${((Date.now() - t0)/1000).toFixed(1)} s`);
    await ctx.close();
  }
  await browser.close();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  const total = Object.values(out).reduce((a, v) => a + v.length, 0);
  console.log(`${Object.keys(out).length} pictures, ${(total/1024).toFixed(0)} KB, in ${path.relative(process.cwd(), OUT)}. Run python3 build.py to pack them in.`);
})().catch(e => { console.error(e); process.exit(1); });
