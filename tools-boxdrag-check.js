// Drags a board in a project box with real mouse events in Chromium (Session 58): switches on "Move things with the mouse",
// drags the Uno 80 px, and checks it moved with the camera still, that a drag on empty space still turns the view, and no
// page errors. Prints one line of JSON.   node tools-boxdrag-check.js [index.html]
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const NM = path.join(__dirname, "node_modules");
const LIBS = [[/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"], [/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"], [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"], [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"]];
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  await p.route(/cdn\.jsdelivr\.net/, r => { const l = LIBS.find(([x]) => x.test(r.request().url())); return l ? r.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(NM, l[1])) }) : r.abort(); });
  const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto("file://" + path.resolve(process.argv[2] || path.join(__dirname, "index.html")));
  await p.waitForFunction(() => window.MakerForge && window.MakerForge.rev > 0 && !window.MakerForge.busy, null, { timeout: 60000 });
  const settle = () => p.waitForFunction(() => !window.MakerForge.busy, null, { timeout: 60000 }).then(() => p.waitForTimeout(400));
  await p.evaluate(async () => { const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 1500));
    const MF = window.MakerForge; MF.examples.drop && MF.examples.drop(); await new Promise(r => setTimeout(r, 600));
    MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { w:160, d:120, h:40, lid:"none", cut:[], board:"uno", boardX:0, boardY:0, showParts:true });
    MF.rebuild(false); });
  await settle();
  // the switch on the Make tab
  await p.evaluate(() => { [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); });
  await p.waitForTimeout(300);
  const sw = await p.evaluate(() => { const l = [...document.querySelectorAll("#panel label")].find(x => /Move things with the mouse/.test(x.textContent)); if (!l) return false; l.querySelector("input").click(); return true; });
  // the Uno's middle on the screen: its top at the board's height, projected with the page's own camera
  const at = () => p.evaluate(() => { const MF = window.MakerForge, I = MF.enclosure, b = I.boards[0], cam = MF.camera, cv = document.querySelector("#view canvas") || document.querySelector("canvas");
    const bi = MF.parts.findIndex(q => q.name === "Box"); let mesh = null; MF.scene.traverse(o => { if (o.isMesh && o.userData && o.userData.part === bi) mesh = o; });
    mesh.updateMatrixWorld(true); const v = new THREE.Vector3(b.at[0], b.top + 2, -b.at[1]).applyMatrix4(mesh.matrixWorld).project(cam), r = cv.getBoundingClientRect();
    return { x: r.left + (v.x + 1)/2*r.width, y: r.top + (1 - v.y)/2*r.height, cam: cam.position.toArray(), bx: MF.state.base.enclosure.boardX, by: MF.state.base.enclosure.boardY }; });
  const a = await at();
  await p.mouse.move(a.x, a.y); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(a.x + i*8, a.y); await p.mouse.up();
  await settle(); const b2 = await at();
  const camSame = a.cam.every((v, i) => Math.abs(v - b2.cam[i]) < 1e-6);
  // a drag on empty space still turns the view
  const rc = await p.evaluate(() => { const cv = document.querySelector('#view canvas') || document.querySelector('canvas'), r = cv.getBoundingClientRect(); return [r.left + 40, r.bottom - 60]; }); const c0 = await at(); await p.mouse.move(rc[0], rc[1]); await p.mouse.down(); for (let i = 1; i <= 10; i++) await p.mouse.move(rc[0] + i*12, rc[1]); await p.mouse.up(); await p.waitForTimeout(300);
  const c1 = await at();
  console.log(JSON.stringify({ screenBefore:[a.x, a.y], screenAfter:[b2.x, b2.y], switch: sw, before: [a.bx, a.by], after: [b2.bx, b2.by], cameraStill: camSame, viewTurned: c0.cam.some((v, i) => Math.abs(v - c1.cam[i]) > 0.5), errs }));
  await b.close();
})();
