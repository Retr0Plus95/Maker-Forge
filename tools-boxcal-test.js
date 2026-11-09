// Project boxes, v0.56 (Session 64): the calibration card (three sizes of every way a box holds a part) and your printer's
// fits: picked on the card's page, kept with the printer (this browser, a project file), used by every box after; a new box's
// lid gap and openings; the fits in Settings; a hostile project's fits cleaned.
//   node tools-boxcal-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, F = MF.boxRoom.fit, e0 = env.errors.length;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const E = () => MF.state.base.enclosure;
  const make = async () => { [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50); };
  const fresh = async over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); MF.rebuild(false); await settle(); await make(); };
  const closed = () => MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const vol = name => C.signedVolume(MF.parts.find(p => p.name === name).solid);
  const support = async () => { MF.printNow(); await settle(); const pr = MF.print; return pr ? Math.round(pr.supportArea || 0) : -1; };
  const panelButtons = () => [...document.querySelectorAll("#panel button")];
  const press = async re => { const b = panelButtons().find(b => re.test(b.textContent)); if (!b) { check(false, `a button ${re}`); return; } b.click(); await settle(); await sleep(30); };
  const reload = async state => { const f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state })], "p.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
  const stored = () => { try { return JSON.parse(win.localStorage.getItem("makerforge.printer") || "null"); } catch (e) { return null; } };

  console.log("\nthe calibration card");
  {
    check(JSON.stringify(F.printer()) === JSON.stringify(F.defaults), "no calibration yet: the standard fits", JSON.stringify(F.printer()));
    await fresh({ test:true });
    const seg = [...document.querySelectorAll("#panel .seg button")].find(b => b.textContent === "The holders, on a card");
    seg.click(); await settle(); await make();
    check(E().testKind === "holders" && E().cal && E().cal.rib === F.defaults.rib, "choosing the card keeps its middle sizes with it", JSON.stringify(E().cal));
    const s = await support(), I = MF.enclosure, card = F.card;
    check(MF.parts.map(p => p.name).join() === "Holder test card,Test tiles" && closed() && s === 0, "a card and its tiles, closed, no support", `${s} mm²`);
    const bb = C.solidBounds ? null : null, b = MF.parts[0].solid.bbox || null;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z1 = -1e9; const P = MF.parts[0].solid.pos || MF.parts[0].solid.positions || MF.parts[0].solid.p;
    for (const part of MF.parts) { const g = part.geom.attributes.position.array; for (let i = 0; i < g.length; i += 3) { x0 = Math.min(x0, g[i]); x1 = Math.max(x1, g[i]); z1 = Math.max(z1, g[i + 1]); y0 = Math.min(y0, -g[i + 2]); y1 = Math.max(y1, -g[i + 2]); } }
    check(x1 - x0 <= card.w + 0.5 && y1 - y0 <= card.d + 40 && x1 - x0 < 220 && y1 - y0 < 220, "card and tiles fit a 220 mm bed", `${(x1 - x0).toFixed(1)} × ${(y1 - y0).toFixed(1)} × ${z1.toFixed(1)} mm`);
    // every row's three sizes, 1 the tightest
    const rows = F.rows.map(r => [r.k, [1, 2, 3].map(i => F.sample(F.defaults, r.k, i))]);
    check(rows.every(([k, v]) => v[1] === F.defaults[k] && v[0] !== v[2]), "three sizes of each, the middle one the fit now", rows.map(([k, v]) => `${k} ${v.join("/")}`).join(", "));
    check(rows.find(([k]) => k === "rib")[1][0] > F.defaults.rib && rows.find(([k]) => k === "gap")[1][0] < F.defaults.gap, "1 is the tightest: more rib, less room");
    // the samples really differ: a card made round other sizes has another volume
    const v0 = vol("Holder test card");
    const segs = () => [...document.querySelectorAll("#panel .seg")].filter(w => [...w.querySelectorAll("button")].map(b => b.textContent).join() === "1,2,3");
    check(segs().length === F.rows.length && segs().every(w => w.querySelector('[aria-pressed="true"]').textContent === "2"), "a 1-2-3 pick for each row, 2 picked (the fit now)", segs().length);
    // pick RIBS 1 and WALL 3
    segs()[F.rows.findIndex(r => r.k === "rib")].querySelectorAll("button")[0].click(); await settle(); await make();
    segs()[F.rows.findIndex(r => r.k === "pilot")].querySelectorAll("button")[2].click(); await settle(); await make();
    const fit = F.printer(), st = stored();
    check(fit.rib === 0.25 && fit.pilot === 0.2 && st && st.fit && st.fit.rib === 0.25 && /^\d{4}-\d\d-\d\d$/.test(st.fit.when), "a pick sets the printer's fit, remembered in this browser", JSON.stringify(st && st.fit));
    check(Math.abs(vol("Holder test card") - v0) < 1e-6 && E().cal.rib === F.defaults.rib, "the card stays the one you printed after a pick");
    check(segs()[F.rows.findIndex(r => r.k === "rib")].querySelector('[aria-pressed="true"]').textContent === "1", "the pick shows as picked");
    await press(/^Make a new card round my picks$/); await make();
    check(E().cal.rib === 0.25 && E().cal.pilot === 0.2 && Math.abs(vol("Holder test card") - v0) > 0.5, "a new card round the picks: its middle sizes are the picks, and it changes", `${(vol("Holder test card") - v0).toFixed(2)} mm³`);
    check(segs().every(w => w.querySelector('[aria-pressed="true"]').textContent === "2"), "on the new card the picks are the middle ones");
  }

  console.log("\nevery box uses the fits");
  {
    // a cradle with ribs: a bigger rib fit makes the ribs reach further in (more plastic)
    const cradle = { w:110, d:80, h:40, lid:"screw", fasten:"screw", board:"esp32cam", boardX:0, boardY:0, boardHold:"edges", boardGrip:"ribs" };
    MF.state.printer.fit = { rib:0.15 }; await fresh(cradle); const vA = vol("Box"), sA = await support();
    MF.state.printer.fit = { rib:0.45 }; MF.rebuild(false); await settle(); const vB = vol("Box");
    check(vB > vA + 0.05 && closed(), "crush ribs follow the rib fit", `${(vB - vA).toFixed(2)} mm³ more`);
    // the room round a board in a cradle
    MF.state.printer.fit = { gap:0.6 }; MF.rebuild(false); await settle(); const iG = MF.enclosure.boards.find(b => b.main);
    MF.state.printer.fit = {}; MF.rebuild(false); await settle(); const iN = MF.enclosure.boards.find(b => b.main);
    check(iG && iN && iG.m > iN.m, "the room round a cradle's board follows the gap fit", `${iN && iN.m} → ${iG && iG.m}`);
    // pilot holes: bigger holes, less plastic in the lid posts
    await fresh({ w:110, d:80, h:40, lid:"screw", fasten:"screw" }); const pA = vol("Box");
    MF.state.printer.fit = { pilot:0.4 }; MF.rebuild(false); await settle(); const pB = vol("Box");
    check(Math.abs(pB - pA) > 1 && F.screw("M3").pilot === 2.9 && closed(), "self-tapping holes follow the pilot fit (the posts grow round a bigger hole)", `${(pB - pA).toFixed(2)} mm³, M3 pilot ${F.screw("M3").pilot}`);
    MF.state.printer.fit = {}; await fresh({ w:110, d:80, h:40, lid:"screw", fasten:"insert" }); const nA = vol("Box");
    MF.state.printer.fit = { insert:-0.2 }; MF.rebuild(false); await settle(); const nB = vol("Box");
    check(Math.abs(nB - nA) > 1 && F.screw("M3").insert === 3.8 && closed(), "heat-insert holes follow the insert fit", `${(nB - nA).toFixed(2)} mm³, M3 insert ${F.screw("M3").insert}`);
    const noteT = [...document.querySelectorAll("#panel .hint")].map(n => n.textContent).find(t => /heat inserts: the posts get/.test(t)) || "";
    await make(); const noteT2 = [...document.querySelectorAll("#panel .hint")].map(n => n.textContent).find(t => /heat inserts: the posts get/.test(t)) || "";
    check(/a 3\.8 mm hole/.test(noteT2), "the panel says the hole size it makes", noteT2.slice(0, 60));
    // strap loops
    MF.state.printer.fit = {}; const loopBox = { w:140, d:100, h:40, lid:"screw", more:[{ kind:"lipo906090", x:0, y:0, hold:"strap", strapBy:"loops" }] };
    await fresh(loopBox); const lA = vol("Box"), lsA = await support();
    MF.state.printer.fit = { loop:4 }; MF.rebuild(false); await settle(); const lB = vol("Box"), lsB = await support();
    check(Math.abs(lB - lA) > 1 && lsB === lsA && closed(), "strap loops follow the loop fit, still no support", `${(lB - lA).toFixed(2)} mm³, support ${lsA} → ${lsB}`);
  }

  console.log("\na new box's lid gap and openings");
  {
    MF.state.printer.fit = { lid:0.3, clear:0.15 }; MF.state.printer.fit.when = "2026-11-09";
    win.localStorage.setItem("makerforge.printer", JSON.stringify(MF.state.printer));
    check(MF.defaults.enclosure.fit === 0.3 && MF.defaults.enclosure.clear === 0.15, "a new box starts with the printer's lid gap and clearance", `${MF.defaults.enclosure.fit}, ${MF.defaults.enclosure.clear}`);
    await fresh({ test:true, testKind:"box", fit:0.25, clear:0.1 });
    await press(/^Keep these gaps for every new box/);
    check(F.printer().lid === 0.25 && F.printer().clear === 0.1 && stored().fit.lid === 0.25 && MF.defaults.enclosure.fit === 0.25, "the small test box's gaps kept for every new box", JSON.stringify(stored().fit));
    check(panelButtons().some(b => /^These gaps are your printer's/.test(b.textContent)), "and the button then says they are");
  }

  console.log("\nthe bird house: two recipes, the 126090 LiPo, the camera in the lid, what panel parts take up behind the wall");
  {
    MF.state.printer.fit = {};
    const kitBat = MF.boxRoom.kits.find(k => k.name === "Bird house battery and motion sensor"), kitCam = MF.boxRoom.kits.find(k => k.name === "Bird house camera");
    MF.boxRoom.startKit(kitBat); MF.rebuild(false); await settle(); await make();
    let I = MF.enclosure, s = await support();
    const lipo = E().more.find(m => m.kind === "lipo126090"), usb = E().cut.find(c => c.kind === "usbc" && c.auto === "ports");
    check(!I.warn.length && closed() && s === 0, "the battery box: no warnings, closed, no support", `${E().w} × ${E().d} × ${E().h}, ${s} mm², ${I.warn.map(w => w.t).join("; ")}`);
    check(lipo && lipo.hold === "strap" && lipo.strapBy === "loops" && E().board === "tp4056" && usb && E().cut.some(c => c.kind === "pirmini" && c.face === "front") && E().cut.some(c => c.kind === "gland"),
      "a 126090 LiPo on strap loops, the TP4056's USB-C through a wall, the dome in front, a gland", JSON.stringify(E().cut.map(c => c.kind + "@" + c.face)));
    check(I.gasket && I.mount && I.mount.length, "a gasket and screw ears", JSON.stringify(I.gasket));
    check(I.behind.some(q => E().cut[q.i].kind === "pirmini" && !q.hit) && I.ghosts.some(g => /behind the wall/.test(g.label)), "the motion sensor's body is shown behind the wall, clear of the battery");
    MF.boxRoom.startKit(kitCam); MF.rebuild(false); await settle(); await make();
    I = MF.enclosure; s = await support();
    const cam = E().cut.find(c => c.kind === "camholder");
    check(!I.warn.length && closed() && s === 0, "the camera box: no warnings, closed, no support", `${E().w} × ${E().d} × ${E().h}, ${s} mm², ${I.warn.map(w => w.t).join("; ")}`);
    check(E().board === "esp32cam" && E().boardGrip === "clips" && cam && cam.face === "top" && Math.abs(cam.u - E().boardX) < 0.1 && Math.abs(cam.v - E().boardY) < 0.1 && I.cams.length === 1,
      "an ESP32-CAM in snap clips, the camera holder in the lid right over it", JSON.stringify({ cam, x:E().boardX, y:E().boardY }));
    check(I.ghosts.some(g => g.label === "Camera (OV2640)"), "the camera shows in the 3D view under the lid");
    const lidWith = vol("Lid"); E().cut.forEach(c => { if (c.kind === "camholder") c.kind = "esp32cam"; }); MF.rebuild(false); await settle();     // the same hole, no frame
    check(lidWith > vol("Lid") + 80, "the frame is on the lid's inside", `${(lidWith - vol("Lid")).toFixed(1)} mm³`);
    // the frame too near a wall: the hole stays, the frame is left out with a word
    await fresh({ w:60, d:50, h:25, lid:"screw", cut:[{ kind:"camholder", face:"top", u:22, v:0 }] });
    check(MF.enclosure.warn.some(w => /no room for its frame/.test(w.t)) && MF.enclosure.cams.length === 0, "a frame that would reach the lid's lip is left out, with a word", MF.enclosure.warn.map(w => w.t).join("; "));
    // the frame over a tall board
    await fresh({ w:80, d:70, h:20, lid:"screw", board:"uno", cut:[{ kind:"camholder", face:"top", u:0, v:0 }] });
    check(MF.enclosure.warn.some(w => /its frame touches/.test(w.t)), "a frame that would sit on a board's parts says so", MF.enclosure.warn.map(w => w.t).join("; "));
    // a rocker switch right in front of a board: a warning; Make it all fit moves the wall out
    await fresh({ w:110, d:70, h:40, lid:"screw", board:"uno", boardX:0, boardY:-8, cut:[{ kind:"rocker", face:"front", u:0, v:20 }] });
    const w1 = MF.enclosure.warn.find(w => /reaches Arduino Uno/.test(w.t)), d0 = E().d;
    check(!!w1, "a rocker switch's body that meets the Uno behind the wall: a warning", w1 && w1.s.slice(0, 70));
    const rf = MF.boxRoom.fixAll(E()); MF.rebuild(false); await settle();
    check(!MF.enclosure.warn.length && E().d > d0 && closed(), "Make it all fit moves the front wall out by enough", `${d0} → ${E().d} mm deep`);
    // a board's own port is not a panel part
    await fresh({ w:110, d:80, h:40, lid:"screw", board:"pi", cut:[] });
    [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Board mounts").click(); await sleep(30);
    await press(/^Add this board's ports$/);
    check(E().cut.some(c => c.kind === "jack35" && c.auto === "ports") && !MF.enclosure.warn.some(w => /reaches/.test(w.t)), "a board's own audio jack is not checked as a panel jack", MF.enclosure.warn.map(w => w.t).join("; "));
  }

  console.log("\nSettings, saved projects, a hostile project");
  {
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "colour").click(); await sleep(60);
    const rail = [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Fits (from the calibration card)");
    if (rail) { rail.click(); await sleep(60); }
    const grp = rail && document.querySelector("#panel"), n = grp ? grp.querySelectorAll('input[type="number"], input.num, .field input').length : 0;
    check(grp && n >= Object.keys(F.defaults).length, "Settings → Printer has the fits as numbers", n);
    await fresh({ w:110, d:80, h:40, lid:"screw" });
    MF.state.printer.fit = { rib:0.3, pin:0.45, when:"2026-11-09" };
    const s0 = JSON.parse(MF.projectPayload()).state;
    MF.state.printer.fit = { rib:0.05 }; await reload(s0);
    check(F.printer().rib === 0.3 && F.printer().pin === 0.45, "a project keeps the fits it was made with", JSON.stringify(MF.state.printer.fit));
    const s1 = JSON.parse(JSON.stringify(s0)); delete s1.printer.fit;
    MF.state.printer.fit = { rib:0.2 }; await reload(s1);
    check(F.printer().rib === 0.2, "a project from before the fits keeps this printer's", JSON.stringify(MF.state.printer.fit));
    const s2 = JSON.parse(JSON.stringify(s0)); s2.printer.fit = { rib:99, gap:-5, pilot:"<b>", loop:"4", __proto__x:1, when:"<script>" };
    s2.base.enclosure = Object.assign(s2.base.enclosure, { test:true, testKind:"holders", cal:{ rib:"x", clip:50, gap:0.45 } });
    await reload(s2);
    const f2 = MF.state.printer.fit, c2 = MF.state.base.enclosure.cal;
    check(f2.rib === 0.6 && f2.gap === 0 && f2.pilot === undefined && f2.loop === 4 && !("when" in f2) && Object.keys(f2).every(k => k in F.defaults),
      "hostile fits: clamped, junk dropped", JSON.stringify(f2));
    check(c2 && c2.rib === undefined && c2.clip === 1.6 && c2.gap === 0.45 && closed(), "a hostile card's sizes: clamped, and it still builds", JSON.stringify(c2));
    MF.state.printer.fit = undefined; delete MF.state.printer.fit; win.localStorage.removeItem("makerforge.printer");
  }

  check(env.errors.length === e0, "no page errors", env.errors.slice(e0).join(" | "));
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
