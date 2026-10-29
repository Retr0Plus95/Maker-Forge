// Pictures of the box from Maker Forge itself, in Chromium (Playwright): the app with the box on the plate, and
// close-ups of the front, the back and the inside. Writes images/box-*.jpg and enclosure/share-link.txt.
//   node enclosure/render_box.js [path to a Maker Forge checkout, default ../Maker-Forge]
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const here = __dirname, root = path.join(here, "..");
const forge = path.resolve(process.argv[2] || process.env.MAKER_FORGE || path.join(root, "..", "Maker-Forge"));
const NM = path.join(forge, "node_modules");
const design = JSON.parse(fs.readFileSync(path.join(here, "box-design.json"), "utf8"));
const LIBS = [                                 // the libraries the page loads from a CDN, from Maker Forge's node_modules
  [/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"],
  [/three@[\d.]+\/examples\/js\/controls\/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"],
  [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"],
];
const IMG = path.join(root, "images");
fs.mkdirSync(IMG, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.route("**/*", r => { const u = r.request().url(); for (const [re, f] of LIBS) if (re.test(u)) return r.fulfill({ path: path.join(NM, f), contentType: "application/javascript" }); r.continue(); });
  page.on("pageerror", e => console.log("  page error:", e.message));
  await page.goto("file://" + path.join(forge, "index.html"));
  await page.waitForFunction(() => window.MakerForge && !MakerForge.busy, null, { timeout: 120000 });
  const idle = async () => { await page.waitForTimeout(400); await page.waitForFunction(() => !MakerForge.busy, null, { timeout: 300000 }); await page.waitForTimeout(900); };
  await page.evaluate(d => {
    const MF = window.MakerForge, st = MF.state;
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), JSON.parse(JSON.stringify(d.enclosure)));
    E.cut = d.enclosure.cut.map(c => Object.assign(MF.newOpening(c.kind, c.face), c));
    st.base.type = "enclosure"; st.base.enclosure = E;
    if (d.slots) st.slots = JSON.parse(JSON.stringify(d.slots));
    MF.render(); MF.rebuild(true);
  }, design);
  await idle();
  // the same box as a Maker Forge link (compressed here: the browser has CompressionStream)
  const url = await page.evaluate(async () => (await MakerForge.shareLink()).url);
  fs.writeFileSync(path.join(here, "share-link.txt"), "https://forge.retr0plus.se/" + url.slice(url.indexOf("#")) + "\n");
  console.log("  enclosure/share-link.txt");
  await page.evaluate(() => { const n = document.querySelector("#notice"); if (n) n.classList.remove("show"); });
  await page.screenshot({ path: path.join(IMG, "box-maker-forge.jpg"), type: "jpeg", quality: 86 });
  console.log("  images/box-maker-forge.jpg");

  // close-ups: no rulers, toolbars or status line, just the model on the bed
  await page.click("#vRuler");
  await page.addStyleTag({ content: ".hudpills,.viewtools,#explodeBox,#sectionBox,#statusbar{display:none!important}" });
  await page.waitForTimeout(500);
  // azimuth round the box (0 = from the front), elevation, distance factor
  const view = async (file, az, el, k = 1.0, lid = false) => {
    await page.evaluate(({ az, el, k, lid }) => {
      const MF = window.MakerForge, c = MF.controls, cam = MF.camera, box = new THREE.Box3();
      MF.scene.traverse(o => {
        if (o.isMesh && o.userData && o.userData.part != null) {
          const name = (MF.parts[o.userData.part] || {}).name || "";
          o.visible = lid ? true : /^Box$/.test(name);
          if (o.visible) box.expandByObject(o);
        }
      });
      const mid = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), d = k * 1.9 * Math.max(sz.x, sz.z, sz.y);
      c.target.copy(mid);
      cam.position.set(mid.x + d * Math.cos(el) * Math.sin(az), mid.y + d * Math.sin(el), mid.z + d * Math.cos(el) * Math.cos(az));
      c.update(); MF.requestRender();
    }, { az, el, k, lid });
    await page.waitForTimeout(700);
    await (await page.$("#view")).screenshot({ path: path.join(IMG, file), type: "jpeg", quality: 90 });
    console.log("  images/" + file);
  };
  await view("box-front.jpg", -0.5, 0.36, 1.05);
  await view("box-back.jpg", Math.PI + 0.5, 0.36, 1.05);
  await view("box-inside.jpg", -0.25, 1.0, 1.0);
  await view("box-plate.jpg", -0.35, 0.8, 0.85, true);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
