// Renders chosen parts alone in a plain scene, for the manual's pictures (Sessions 52 to 59).
//   node tools-partshot.js out.jpg setup.js [partRegex] [cameraDirJSON] [width height]
// setup.js is the body of an async function run in the page (MF is window.MakerForge): set up the object, return anything.
// Env: MF_FILE (the built page, default ./index.html), ZOOM (camera distance, default 1.6), ASSEMBLE=1 (turn the lid parts
// over onto the box, as used), SLOTCOL=1 (the filaments' own colours). A .jpg out is saved at quality 84.
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const NM = path.join(__dirname, "node_modules");
const LIBS = [[/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"], [/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"], [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"]];
const [out, setup, re = "^Box$", dir = "[0.35,1.1,0.8]", W = "1200", H = "900"] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  await p.route(/cdn\.jsdelivr\.net|huggingface\.co/, r => { const l = LIBS.find(([x]) => x.test(r.request().url())); return l ? r.fulfill({ status: 200, contentType: "application/javascript", headers: { "access-control-allow-origin": "*" }, body: fs.readFileSync(path.join(NM, l[1])) }) : r.abort(); });
  p.on("pageerror", e => console.log("PAGE ERROR", e.message));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
  await p.goto("file://" + (process.env.MF_FILE || path.join(__dirname, "index.html")));
  await p.waitForFunction(() => window.MakerForge && window.MakerForge.rev > 0 && !window.MakerForge.busy, null, { timeout: 60000 });
  const settle = () => p.evaluate(async () => { const MF = window.MakerForge, r0 = MF.rev, sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 6000; i++) { if (!MF.busy) { await sleep(60); if (!MF.busy) break; } await sleep(25); } });
  const info = await p.evaluate(async src => { const MF = window.MakerForge; const r = await (new Function("MF", "return (async () => {" + src + "})()"))(MF); MF.render(); MF.rebuild(false); return r; }, fs.readFileSync(setup, "utf8"));
  await settle();
  const res = await p.evaluate(([re, dir, W, H, zoom, assemble, slotcol]) => {
    const MF = window.MakerForge, rx = new RegExp(re), parts = MF.parts.filter(q => rx.test(q.name));
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeef1f5);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8890a0, 0.75)); const dl = new THREE.DirectionalLight(0xffffff, 0.65); dl.position.set(-0.5, 1, 0.7); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.25); dl2.position.set(0.8, 0.4, -0.6); scene.add(dl2);
    const box = new THREE.Box3(), cols = [0x4f7fb0, 0xd08a3c, 0x7aa65a, 0xb05a6a, 0x8a6ab0];
    const slotHex = q => slotcol ? new THREE.Color(MF.state.slots[q.slot] ? MF.state.slots[q.slot].hex : '#888') : null;
    parts.forEach((q, i) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(q.solid.pos, 3)); g.setIndex(Array.from(q.solid.idx)); g.computeVertexNormals();
      const m = new THREE.Mesh(g.toNonIndexed(), new THREE.MeshStandardMaterial({ color: slotHex(q) || cols[i % cols.length], roughness: 0.75, metalness: 0, flatShading: true })); m.geometry.computeVertexNormals(); m.userData.name = q.name; scene.add(m); box.expandByObject(m); });
    if (assemble){
      // the lid parts turned over and set on the box, as it is used
      const lidM = scene.children.filter(o => o.isMesh && /^Lid/.test(o.userData.name)), boxM = scene.children.filter(o => o.isMesh && !/^Lid/.test(o.userData.name));
      const bb = new THREE.Box3(); boxM.forEach(m => bb.expandByObject(m)); const lb = new THREE.Box3(); lidM.forEach(m => lb.expandByObject(m));
      const lc = lb.getCenter(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3()), lt = +MF.state.base.enclosure.lidThick || 2;
      lidM.forEach(m => { m.geometry.translate(-lc.x, 0, -lc.z); m.geometry.rotateX(Math.PI); m.geometry.translate(bc.x, bb.max.y + lt, bc.z); m.geometry.computeVertexNormals(); });
      box.makeEmpty(); scene.children.filter(o => o.isMesh).forEach(m => box.expandByObject(m));
    }
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()).length();
    const cam = new THREE.PerspectiveCamera(30, W / H, 1, 5000); cam.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(s * zoom)); cam.lookAt(c);
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.render(scene, cam);
    const cv = r.domElement; cv.id = "shot46"; cv.style.cssText = "position:fixed;left:0;top:0;z-index:99999"; document.body.appendChild(cv);
    return { parts: parts.map(q => q.name), all: MF.parts.map(q => q.name), checks: MF.checks.list.filter(l => l.k !== "ok").map(l => l.t), warn: (MF.enclosure && MF.enclosure.warn || []).map(w => w.t) };
  }, [re, JSON.parse(dir), +W, +H, +process.env.ZOOM || 1.6, !!process.env.ASSEMBLE, !!process.env.SLOTCOL]);
  await p.locator("#shot46").screenshot({ path: out, ...(/\.jpe?g$/.test(out) ? { type: "jpeg", quality: 84 } : {}) });
  console.log(JSON.stringify(info), JSON.stringify(res));
  await b.close();
})();
