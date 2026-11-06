// Moving the view while painting (Session 49), in Chromium: a drag beside the model turns the view, one on it paints and the
// view stays (a turn's glide stopped); Space held, the middle and right buttons, the ✋ Move button; on a touch screen one
// finger paints or turns, a second finger straight after takes the stroke back and pinches. Part of npm run check:browser.
//   node tools-paintmove-check.js index.html
const { chromium } = require("playwright"); const fs = require("fs"), path = require("path");
const NM = path.join(__dirname, "node_modules");
const LIBS = [[/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"], [/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"], [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"]];
(async () => {
  const b = await chromium.launch({ args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 820 }, hasTouch: true }), page = await ctx.newPage();
  await page.route(/cdn\.jsdelivr\.net/, r => { const l = LIBS.find(([re]) => re.test(r.request().url())); return l ? r.fulfill({ status: 200, contentType: "application/javascript", body: fs.readFileSync(path.join(NM, l[1])) }) : r.abort(); });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.goto("file://" + path.resolve(process.argv[2]));
  await page.waitForFunction(() => window.MakerForge && window.MakerForge.rev > 0 && !window.MakerForge.busy, null, { timeout: 60000 });
  const settle = () => page.evaluate(async () => { const MF = window.MakerForge, sleep = ms => new Promise(q => setTimeout(q, ms)), r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 1200; i++){ if (!MF.busy){ await sleep(60); if (!MF.busy) break; } await sleep(25); } });
  const s = await page.evaluate(async () => {
    const MF = window.MakerForge, sleep = ms => new Promise(q => setTimeout(q, ms));
    const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 1200; i++){ if (!MF.busy){ await sleep(60); if (!MF.busy) break; } await sleep(25); } };
    const sel = document.querySelector("#objectSel"); sel.value = "turned"; sel.dispatchEvent(new Event("change")); await settle();
    MF.state.paint.ops = [{ k:"height", slots:[0, 1], cuts:[45] }]; MF.paint.repaint(); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "paint").click(); await sleep(100);
    MF.paint.ui.tool = "brush"; MF.paint.ui.slot = 1; MF.paint.ui.r = 5; MF.render(); await sleep(100);
    const r = document.querySelector("#view canvas").getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, l: r.left, t: r.top, w: r.width, h: r.height };
  });
  const st0 = () => page.evaluate(() => { const MF = window.MakerForge, c = MF.camera.position, t = MF.controls.target; return { ops: MF.state.paint.ops.length, cam: [c.x, c.y, c.z], tgt: [t.x, t.y, t.z], tool: MF.paint.ui.tool, move: document.querySelector("#paintMove").getAttribute("aria-pressed"), hidden: document.querySelector("#paintMove").hidden }; });
  const st = async () => { await still(); return st0(); };
  const still = () => page.evaluate(async () => { const MF = window.MakerForge, sleep = ms => new Promise(q => setTimeout(q, ms)); let last = "";
    for (let i = 0; i < 100; i++){ const c = MF.camera.position, k = [c.x, c.y, c.z].map(v => v.toFixed(3)).join(); if (k === last) return; last = k; await sleep(80); } });
  // where the model is on the screen now: the middle of its painted part, projected (a press there lands on it whatever
  // the view; under load a turn can end anywhere)
  const onModel = () => page.evaluate(() => { const MF = window.MakerForge, r = document.querySelector("#view canvas").getBoundingClientRect(), box = new THREE.Box3();
    MF.scene.traverse(o => { if (o.isMesh && o.visible && o.userData && o.userData.part != null) box.expandByObject(o); });
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()); c.y -= sz.y * 0.15; c.project(MF.camera);
    return [r.left + (c.x + 1) / 2 * r.width, r.top + (1 - c.y) / 2 * r.height]; });
  const moved = (a, b2, k = "cam") => Math.hypot(...a[k].map((v, i) => v - b2[k][i]));
  const drag = async (x0, y0, dx, dy, button = "left") => { await page.mouse.move(x0, y0); await page.mouse.down({ button }); for (let i = 1; i <= 10; i++) await page.mouse.move(x0 + dx*i/10, y0 + dy*i/10); await page.mouse.up({ button }); await page.waitForTimeout(400); };
  const out = []; const check = (ok, what, got) => out.push(`${ok ? "  ok  " : "  FAIL"} ${what}  (${got})`);
  let a = await st(); check(!a.hidden && a.move === "false", "the Move button shows on the Paint tab", JSON.stringify(a.move));
  // 1. drag beside the model: the view turns, nothing painted
  await drag(s.l + 40, s.t + s.h - 120, 120, -30); let b2 = await st();
  check(moved(a, b2) > 5 && b2.ops === a.ops, "a drag beside the model turns the view and paints nothing", `camera moved ${moved(a, b2).toFixed(1)}, ops ${a.ops} → ${b2.ops}`);
  // 2. drag on the model: paints, the view stays (measured from press to release: a turn before it may still be gliding)
  await page.evaluate(() => { const MF = window.MakerForge, v = document.querySelector("#view"); window.__cam = {};
    const rec = t => () => { const c = MF.camera.position; window.__cam[t] = [c.x, c.y, c.z]; };
    v.addEventListener("pointerdown", rec("down"), true); v.addEventListener("pointerup", rec("up"), true); });
  const pressMoved = () => page.evaluate(() => Math.hypot(...window.__cam.down.map((v, i) => v - window.__cam.up[i])));
  let [mx, my] = await onModel();
  a = b2; await drag(mx - 20, my, 40, 6); b2 = await st(); let pm = await pressMoved();
  check(pm < 0.5 && b2.ops === a.ops + 1, "a drag on the model paints and the view stays", `camera moved ${pm.toFixed(2)}, ops ${a.ops} → ${b2.ops}`);
  // 3. Space held: a drag on the model turns the view
  a = b2; await page.mouse.move(s.x, s.y); await page.keyboard.down("Space"); const held = (await st()).move; await drag(s.x - 30, s.y, 80, 20); await page.keyboard.up("Space"); b2 = await st();
  check(held === "true" && moved(a, b2) > 5 && b2.ops === a.ops && b2.move === "false", "holding Space, a drag on the model turns the view; let go, the brush is back", `pressed ${held}, camera moved ${moved(a, b2).toFixed(1)}, ops ${a.ops} → ${b2.ops}`);
  // 4. the middle button slides the view
  a = b2; await drag(s.x, s.y, 80, 0, "middle"); b2 = await st();
  check(moved(a, b2, "tgt") > 1 && b2.ops === a.ops, "the middle button slides the view", `target moved ${moved(a, b2, "tgt").toFixed(1)}`);
  // 5. the right button still turns it
  a = b2; await drag(s.x, s.y, 80, 0, "right"); b2 = await st();
  check(moved(a, b2) > 5 && b2.ops === a.ops, "the right button turns the view", `camera moved ${moved(a, b2).toFixed(1)}`);
  // 6. the Move button: the view tool, then back to the brush
  await page.click("#paintMove"); const m1 = await st(); a = m1; await drag(s.x - 30, s.y, 80, 10); b2 = await st(); await page.click("#paintMove"); const m2 = await st();
  check(m1.tool === "view" && m1.move === "true" && moved(a, b2) > 5 && b2.ops === a.ops && m2.tool === "brush" && m2.move === "false", "✋ Move frees the view; pressed again, the brush is back", `${m1.tool}/${m1.move} → ${m2.tool}/${m2.move}, camera ${moved(a, b2).toFixed(1)}`);
  // 7. touch: one finger on the model paints; a second finger straight after takes the stroke back and the two zoom
  const cdp = await ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  a = await st(); await T("touchStart", [[s.x - 20, s.y]]); await T("touchMove", [[s.x - 10, s.y + 2]]); await page.waitForTimeout(60);
  await T("touchStart", [[s.x - 10, s.y + 2], [s.x + 60, s.y]]);
  for (let i = 1; i <= 8; i++){ await T("touchMove", [[s.x - 10 - i*8, s.y + 2], [s.x + 60 + i*8, s.y]]); await page.waitForTimeout(20); }
  await T("touchEnd", []); await page.waitForTimeout(400); b2 = await st();
  check(b2.ops === a.ops && moved(a, b2) > 1, "touch: a second finger right after the first takes the stroke back, and the pinch zooms", `ops ${a.ops} → ${b2.ops}, camera moved ${moved(a, b2).toFixed(1)}`);
  // 8. touch: one finger beside the model turns the view; one on the model paints
  a = b2; await T("touchStart", [[s.l + 40, s.t + s.h - 120]]); for (let i = 1; i <= 8; i++){ await T("touchMove", [[s.l + 40 + i*12, s.t + s.h - 120]]); await page.waitForTimeout(20); } await T("touchEnd", []); await page.waitForTimeout(400); b2 = await st();
  check(moved(a, b2) > 5 && b2.ops === a.ops, "touch: one finger beside the model turns the view", `camera moved ${moved(a, b2).toFixed(1)}, ops ${a.ops} → ${b2.ops}`);
  [mx, my] = await onModel();
  a = b2; await T("touchStart", [[mx - 15, my]]); for (let i = 1; i <= 8; i++){ await T("touchMove", [[mx - 15 + i*4, my + 1]]); await page.waitForTimeout(20); } await T("touchEnd", []); await page.waitForTimeout(400); b2 = await st(); pm = await pressMoved();
  check(pm < 0.5 && b2.ops === a.ops + 1, "touch: one finger on the model paints", `camera moved ${pm.toFixed(2)}, ops ${a.ops} → ${b2.ops}`);
  // 9. the Make tab: the button hides, the left button turns the view again
  await page.evaluate(() => [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click()); await page.waitForTimeout(200); a = await st();
  check(a.hidden, "the Move button hides on other tabs", String(a.hidden));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log("moving the view while painting\n" + out.join("\n")); await b.close(); process.exit(out.some(l => l.includes("FAIL")) ? 1 : 0);
})();
