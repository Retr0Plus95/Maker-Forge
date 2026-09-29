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
// the photo test's figure, its photos and its GLB (Session 20), made here and handed to the page as files
const { encodePNG } = require("./tools-test-env.js"), TMP = fs.mkdtempSync(path.join(require("os").tmpdir(), "mf-shots-"));
const figureKit = () => { globalThis.earcut = globalThis.earcut || require("earcut"); require(path.join(__dirname, "src", "core.js")); const PC = globalThis.PRCore; return { PC, F: require("./tools-photo-figure.js")(PC) }; };

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
    // Session 20: the test figure as a GLB with a colour picture (what AI model makers give), opened in its colours
    async modelcolours() {
      const { F, PC } = figureKit(), small = F.figure(2.5), cls = F.truth(PC.meshTopology(small.solid), small.partOf), f = path.join(TMP, "footballer.glb");
      fs.writeFileSync(f, F.figureGLB(small.solid, cls, encodePNG));
      const { ctx, page } = await open();
      await page.evaluate(() => { const MF = window.MakerForge; MF.state.items.length = 0; MF.state.active = -1; MF.state.printer.colors = 6; document.querySelector("#objectSel").value = "stl"; });
      await page.setInputFiles("#stlInput", f);
      await page.waitForFunction(() => window.MakerForge.model.colour && window.MakerForge.state.paint.ops.some(o => o.k === "model"), null, { timeout: 180000 });
      await idle(page); await tab(page, "paint"); await idle(page);
      await shot(page, path.join(IMAGES, "model-colours.jpg")); fs.unlinkSync(f); await ctx.close();
    },
    // Session 20: a photo on a bookshelf, the figure fixed by hand with mouse strokes, then lined up again
    async photofix() {
      const { F, PC } = figureKit(), fig = F.figure(), topo = PC.meshTopology(fig.solid), cls = F.truth(topo, fig.partOf), W = 600, H = 800;
      const shelf = F.onShelfBackground(F.render(fig.solid, topo, cls, "front", { a: 6.3 / H, tx: 310 / H, ty: 760 / H, rot: 0.04, mirror: false }, W, H, 1), W, H, 11);
      const fPhoto = path.join(TMP, "shelf.png"), fObj = path.join(TMP, "footballer.obj"), raw = fig.raw, lines = [];
      fs.writeFileSync(fPhoto, encodePNG(W, H, shelf.rgba));
      for (let i = 0; i < raw.pos.length; i += 3) lines.push(`v ${raw.pos[i]} ${-raw.pos[i + 2]} ${raw.pos[i + 1]}`);
      for (let i = 0; i < raw.idx.length; i += 3) lines.push(`f ${raw.idx[i] + 1} ${raw.idx[i + 1] + 1} ${raw.idx[i + 2] + 1}`);
      fs.writeFileSync(fObj, lines.join("\n"));
      // how far each pixel is from the figure and from the background, for strokes that keep clear of the other
      const dist = inside => { const d = new Float32Array(W * H).fill(1e9), q = []; for (let i = 0; i < W * H; i++) if (inside(i)) { d[i] = 0; q.push(i); }
        for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy, j = Y * W + X;
          if (X >= 0 && Y >= 0 && X < W && Y < H && d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } } } return d; };
      const dOut = dist(i => shelf.mask[i]), dIn = dist(i => !shelf.mask[i]);
      const { ctx, page } = await open(1440, 1000);
      await page.evaluate(() => { const MF = window.MakerForge; MF.state.items.length = 0; MF.state.active = -1; MF.state.printer.colors = 6; document.querySelector("#objectSel").value = "stl"; });
      await page.setInputFiles("#stlInput", fObj);
      await page.waitForFunction(() => /^footballer\.obj/.test((window.MakerForge.state.base.stl || {}).name || ""), null, { timeout: 180000 });
      await idle(page); await tab(page, "paint");
      await page.setInputFiles("#photoInput", fPhoto);
      await page.waitForFunction(() => { const o = window.MakerForge.paint.photo.op; return o && o.views.length === 1 && window.MakerForge.paint.photo.info(o); }, null, { timeout: 240000 });
      await idle(page);
      const pass = async (re, r, gap, step, far) => {
        await page.evaluate(([src, r]) => { window.MakerForge.paint.ui.photoFixR = r * 100; const b = [...document.querySelectorAll("#panel .seg.tool button")].find(b => new RegExp(src).test(b.textContent)); b.click(); }, [re, r]);
        await page.waitForTimeout(300);
        await page.evaluate(() => document.querySelector("canvas.photoPrev").scrollIntoView({ block: "center" }));
        const b = await page.evaluate(() => { const c = document.querySelector("canvas.photoPrev"), q = c.getBoundingClientRect(), k = Math.min(q.width / c.width, q.height / c.height);
          return { x: q.left + (q.width - c.width * k) / 2, y: q.top + (q.height - c.height * k) / 2, w: c.width * k, h: c.height * k }; });
        for (let fy = step / 2; fy < 1; fy += step) { let on = false;
          for (let fx = 0; fx <= 1.0001; fx += 0.02) { const i = Math.min(H - 1, Math.round(fy * H)) * W + Math.min(W - 1, Math.round(fx * W)), ok = far[i] > (r + gap) * H;
            if (ok) { await page.mouse.move(b.x + fx * b.w, b.y + fy * b.h); if (!on) { await page.mouse.down(); on = true; } } else if (on) { await page.mouse.up(); on = false; } }
          if (on) await page.mouse.up(); }
      };
      await pass("Take away", 0.04, 0.015, 0.05, dOut); await pass("Add to the figure", 0.02, 0.01, 0.025, dIn);
      await page.waitForTimeout(1200); await idle(page);
      await page.evaluate(() => [...document.querySelectorAll("#panel button")].find(b => /Line it up again/.test(b.textContent)).click());
      await page.waitForTimeout(500); await idle(page);
      await page.evaluate(() => document.querySelector("canvas.photoPrev").scrollIntoView({ block: "start" }));
      await page.waitForTimeout(300);
      await shot(page, path.join(IMAGES, "photo-fix.jpg"));
      [fPhoto, fObj].forEach(f => fs.unlinkSync(f)); await ctx.close();
    },
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
  await browser.close(); fs.rmSync(TMP, { recursive: true, force: true });
})().catch(e => { console.error(e); process.exit(1); });
