// Screenshots for the README and the user manual: opens the built app in Chromium (Playwright), sets up each
// scene from a quick start's example and saves JPEGs to docs/manual/ and docs/images/. Run it after the look
// of the app or an example changes:
//
//   node tools-screenshots.js index.html        (ONLY=overview,gallery for just some)
//
// Needs Playwright with Chromium, like tools-browser-check.js.
"use strict";
const fs = require("fs"), path = require("path"), { execSync } = require("child_process");

function loadPlaywright() {
  try { return require("playwright"); } catch (e) {}
  try { return require(path.join(execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(), "playwright")); } catch (e) {}
  console.error("Playwright is not installed: npm i --no-save playwright && npx playwright install chromium");
  process.exit(2);
}
const { chromium } = loadPlaywright();
const FILE = path.resolve(process.argv[2] || "index.html"), NM = path.join(__dirname, "node_modules");
const LIBS = [
  [/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"],
  [/three@[\d.]+\/examples\/js\/controls\/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"],
  [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"],
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const MANUAL = path.join(__dirname, "docs/manual"), IMAGES = path.join(__dirname, "docs/images");
fs.mkdirSync(MANUAL, { recursive: true }); fs.mkdirSync(IMAGES, { recursive: true });

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));
  const open = async (w = 1440, h = 900) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: "light" });
    const page = await ctx.newPage();
    await page.route("**/*", r => { const u = r.request().url(); for (const [re, f] of LIBS) if (re.test(u)) return r.fulfill({ path: path.join(NM, f), contentType: "application/javascript" }); r.continue(); });
    page.on("pageerror", e => console.log("  page error:", e.message));
    await page.goto("file://" + FILE);
    await page.waitForFunction(() => window.MakerForge && !MakerForge.busy, null, { timeout: 120000 });
    return { ctx, page };
  };
  const idle = async page => { await page.waitForTimeout(300); await page.waitForFunction(() => !MakerForge.busy, null, { timeout: 300000 }); await page.waitForTimeout(800); };
  const preset = async (page, k) => { await page.click(`#presetGallery button[data-k="${k.replace(/"/g, '\\"')}"]`); await idle(page); };
  const object = async (page, k) => { await page.selectOption("#objectSel", k); await idle(page); };
  const tab = async (page, k) => { await page.click(`#tabs button[data-k="${k}"]`); await page.waitForTimeout(400); };
  const railPage = async (page, re) => {
    const i = await page.evaluate(src => [...document.querySelectorAll("#secrail button")].findIndex(b => new RegExp(src, "i").test(b.textContent)), re);
    if (i >= 0) { await page.click(`#secrail button >> nth=${i}`); await page.waitForTimeout(400); }
  };
  const quiet = page => page.evaluate(() => document.querySelector("#notice").classList.remove("show"));
  const shot = async (page, file, clip) => { await quiet(page); await page.waitForTimeout(200); await page.screenshot({ path: file, type: "jpeg", quality: 84, clip }); console.log("  " + path.relative(__dirname, file)); };

  const scenes = {
    // the whole app on the Make tab, the iron-on patch example
    async overview() { const { ctx, page } = await open(); await preset(page, "Iron-on patch"); await shot(page, path.join(MANUAL, "overview.jpg")); await ctx.close(); },
    // the Start from sidebar with its pictures, and the app on the phone case
    async sidebar() {
      const { ctx, page } = await open(1440, 1000); await preset(page, "Phone case");
      const box = await (await page.$("#starts")).boundingBox();
      await shot(page, path.join(MANUAL, "start-sidebar.jpg"), { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 1000 - box.y) });
      await shot(page, path.join(IMAGES, "phone-case-example.jpg")); await ctx.close();
    },
    async art() { const { ctx, page } = await open(); await preset(page, "Iron-on patch"); await tab(page, "art");
      await page.evaluate(() => { const b = [...document.querySelectorAll("#panel .seg button")].find(x => /split/i.test(x.textContent)); if (b) b.click(); });
      await page.waitForTimeout(400); await shot(page, path.join(MANUAL, "art-tab.jpg")); await ctx.close(); },
    async colours() { const { ctx, page } = await open(); await preset(page, "Jigsaw puzzle"); await tab(page, "colour"); await shot(page, path.join(MANUAL, "colours-tab.jpg")); await ctx.close(); },
    async paint() { const { ctx, page } = await open(); await object(page, "turned"); await tab(page, "paint"); await idle(page); await shot(page, path.join(MANUAL, "paint-tab.jpg")); await ctx.close(); },
    async export() { const { ctx, page } = await open(); await preset(page, "Car badge"); await tab(page, "export"); await idle(page); await shot(page, path.join(MANUAL, "export-tab.jpg")); await ctx.close(); },
    async help() { const { ctx, page } = await open(); await preset(page, "Lithophane"); await page.click("#helpBtn"); await page.waitForTimeout(500);
      await shot(page, path.join(MANUAL, "help.jpg")); await ctx.close(); },
    async tracer() { const { ctx, page } = await open(); await preset(page, "Trace a part"); await shot(page, path.join(IMAGES, "tracer-example.jpg")); await ctx.close(); },
    async lightbox() { const { ctx, page } = await open(); await preset(page, "Lightbox"); await shot(page, path.join(IMAGES, "lightbox-example.jpg")); await ctx.close(); },
    // a gallery of examples, rendered large on a clear background and set out in a grid with their names
    async gallery() {
      const list = [["preset", "Iron-on patch"], ["preset", "Car badge"], ["preset", "Phone case"], ["preset", "Jigsaw puzzle"], ["preset", "Circuit board"], ["preset", "Bobble head"],
        ["preset", "Ornament"], ["preset", "Plastic canvas"], ["preset", "Lithophane"], ["preset", "Lightbox"], ["object", "hex"], ["object", "box"],
        ["preset", "Kids' puzzle"], ["preset", "Tea light"], ["object", "turned"], ["object", "sphere"], ["preset", "Project box"], ["object", "cylinder"]];
      const names = { hex: "Coaster (hex prism)", box: "Plaque", turned: "Painted vase", sphere: "Painted planet", cylinder: "Cactus pot" };
      const tiles = [];
      for (const [kind, k] of list) {
        const { ctx, page } = await open(1200, 900);
        if (kind === "preset") await preset(page, k); else await object(page, k);
        tiles.push([names[k] || k, await page.evaluate(() => MakerForge.thumb(480, 360))]);
        await ctx.close(); process.stdout.write(".");
      }
      console.log("");
      const { ctx, page } = await open(1500, 900);
      await page.setContent(`<body style="margin:0;background:#eef1f4;font:600 17px system-ui,sans-serif;color:#22303c">
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;padding:14px;width:1472px;box-sizing:border-box">${tiles.map(([n, u]) =>
        `<figure style="margin:0;background:#fff;border-radius:12px;padding:6px 6px 8px;text-align:center"><img src="${u}" style="width:100%;display:block">${n.replace(/</g, "&lt;")}</figure>`).join("")}</div></body>`);
      await page.waitForTimeout(400);
      const el = await page.$("div"); await el.screenshot({ path: path.join(IMAGES, "examples-gallery.jpg"), type: "jpeg", quality: 86 });
      console.log("  docs/images/examples-gallery.jpg"); await ctx.close();
    },
  };
  for (const [name, fn] of Object.entries(scenes)) if (!ONLY || ONLY.includes(name)) { console.log(name); await fn(); }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
