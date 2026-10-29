// SVG drawings -> PNG at 2048 px wide, with the Chromium that Playwright brings.
//   node hardware/render_png.js docs/schematics/RLC-01_Schematic.svg [more.svg ...]
// With no arguments it renders every drawing in docs/schematics and docs/layout.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
let files = process.argv.slice(2);
if (!files.length) {
  for (const dir of ["docs/schematics", "docs/layout"]) {
    const d = path.join(root, dir);
    if (fs.existsSync(d)) files.push(...fs.readdirSync(d).filter(f => f.endsWith(".svg")).map(f => path.join(dir, f)));
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const f of files) {
    const svg = fs.readFileSync(path.resolve(root, f), "utf8");
    const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const w = +m[1], h = +m[2], scale = 2048 / w;
    await page.setViewportSize({ width: 2048, height: Math.round(h * scale) });
    await page.setContent(`<!doctype html><style>html,body{margin:0;background:#0b2545}svg{display:block;width:2048px;height:auto}</style>${svg}`);
    await page.waitForTimeout(100);
    const out = path.resolve(root, f).replace(/\.svg$/, ".png");
    await page.screenshot({ path: out, fullPage: true });
    console.log("wrote", path.relative(root, out));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
