// The project's cover picture (1280 x 800, the size retr0plus.se uses for project cards): the box from Maker
// Forge, the phone page and a piece of the schematic on the drawing set's blueprint sheet.
//   node tools/make_cover.js      (after enclosure/render_box.js and test/web_page_test.js)
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const data = (f, type) => `data:${type};base64,` + fs.readFileSync(path.join(root, f)).toString("base64");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(`<!doctype html><html><head><style>
    body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:"DejaVu Sans Mono",monospace;color:#e6eef7;
      background:#0d2545;background-image:linear-gradient(#14325a 1px,transparent 1px),linear-gradient(90deg,#14325a 1px,transparent 1px);background-size:40px 40px}
    .frame{position:absolute;inset:14px;border:3px solid #e6eef7}.frame:after{content:"";position:absolute;inset:8px;border:1px solid #e6eef7}
    h1{position:absolute;left:64px;top:60px;margin:0;font-size:52px;letter-spacing:4px;line-height:1.1}
    .sub{position:absolute;left:66px;top:192px;font-size:21px;color:#7cc4f2;letter-spacing:1px;line-height:1.5}
    .tags{position:absolute;left:66px;top:290px;display:flex;gap:10px;flex-wrap:wrap;width:520px}
    .tags span{border:1.5px solid #f2c14e;color:#f2c14e;border-radius:6px;padding:5px 10px;font-size:16px}
    .box{position:absolute;left:560px;top:52px;width:660px;height:430px;object-fit:cover;object-position:50% 68%;border-radius:16px;border:2px solid #4f8fd0;box-shadow:0 10px 40px #0008}
    .phone{position:absolute;left:470px;top:300px;width:230px;border-radius:26px;border:8px solid #050c18;box-shadow:0 10px 40px #000a;background:#0f1218}
    .sch{position:absolute;left:740px;top:470px;width:470px;height:270px;object-fit:cover;object-position:0 0;border-radius:10px;border:2px solid #4f8fd0}
    .strip{position:absolute;left:66px;top:440px;width:360px;height:26px;border-radius:13px;
      background:linear-gradient(90deg,#ff3c38,#ff9f1c,#ffe14d,#4cd964,#2fd6ff,#3c5bff,#b03cff,#ff3cac);box-shadow:0 0 34px #ff9f1c88}
    .note{position:absolute;left:66px;top:500px;font-size:16px;color:#8aa6c4;line-height:1.6;width:380px}
  </style></head><body><div class="frame"></div>
    <h1>RGB LAMP<br>CONTROLLER</h1>
    <div class="sub">ESP32 (D1 R32) · 12 V RGB strip<br>for the Desk Stranding lamp</div>
    <div class="tags"><span>IR remote</span><span>Wi-Fi page</span><span>7×9 perfboard</span><span>Maker Forge box</span></div>
    <div class="strip"></div>
    <div class="note">Schematic, perfboard layout, firmware<br>and a printable box. Open hardware, MIT.</div>
    <img class="box" src="${data("images/box-front.jpg", "image/jpeg")}">
    <img class="sch" src="${data("docs/schematics/RLC-01_Schematic.png", "image/png")}">
    <img class="phone" src="${data("images/web-page.png", "image/png")}">
  </body></html>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, "images/cover.jpg"), type: "jpeg", quality: 88 });
  console.log("wrote images/cover.jpg");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
