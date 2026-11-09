// Project boxes, room for parts (Session 61): a part added goes where there is room, and the box grows on one side by just
// enough when there is none (it used to grow round the middle by twice that); the main board's port openings follow it
// and keep their labels; a full wall grows for a new opening; levels in height order; a new divider and a new level where
// they make sense; Shrink to fit, Make it all fit, inside sizes, the parts overview and the box's problems in one place.
//   node tools-boxroom-test.js index.html
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
  const MF = win.MakerForge, e0 = env.errors.length;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const E = () => MF.state.base.enclosure, I = () => MF.enclosure, size = () => [E().w, E().d, E().h];
  const fresh = async over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50); };
  const buttons = () => [...document.querySelectorAll("#panel button")];
  const press = async (re, n = 0) => { const b = buttons().filter(b => re.test(b.textContent))[n]; if (!b) { check(false, `a button ${re}`); return false; } b.click(); await settle(); return true; };
  const field = re => [...document.querySelectorAll("#panel .field")].find(w => re.test((w.querySelector("label") || {}).textContent || ""));
  const type = async (re, v, n = 0) => { const f = [...document.querySelectorAll("#panel .field")].filter(w => re.test((w.querySelector("label") || {}).textContent || ""))[n];
    const inp = f.querySelector("input[type=number]"); inp.value = String(v); inp.dispatchEvent(new win.Event("change")); await settle(); };
  const addPart = async kind => { const f = field(/^Add another board/), inp = f.querySelector("input"); inp.value = kind; inp.oninput(); await sleep(20); await press(/^Add it$/); };
  const addOpening = async kind => { const f = field(/^Add an opening/), inp = f.querySelector("input"); inp.value = kind; inp.oninput(); await sleep(20); await press(/^Add opening$/); };
  const warns = re => I().warn.filter(w => re.test(w.t));
  const clash = re => warns(re || /overlaps|screw post|does not fit|under a post|crosses|runs into/).map(w => w.t).join("; ");

  console.log("a part added goes where there is room");
  {
    // the owner's case: a relay added to a 100 × 70 Uno box made it 218 mm wide
    await fresh({ w:100, d:70, h:40, lid:"screw", board:"uno" });
    await addPart("relay1");
    check(E().w <= 125 && E().d === 70 && E().h === 40 && !clash(), "a 1-channel relay beside a Uno grows the box on one side, just enough", size().join(" × "));
    const uno = I().boards.find(b => b.main), relay = I().boards.find(b => b.key === "relay1"), iw = I().inner[0];
    check(Math.abs(uno.bb[0] - (-iw/2)) < 18 && relay.bb[2] > iw/2 - 6, "the Uno stays near the old left wall, the relay goes in the new room on the right", `${uno.bb[0].toFixed(1)}, ${relay.bb[2].toFixed(1)} of ${(iw/2).toFixed(1)}`);
    for (const k of ["buck2596", "tp4056", "relay2"]) await addPart(k);
    check(E().w * E().d < 135 * 125 && !clash() && I().boards.length === 5, "three more: a compact box, nothing on anything else", size().join(" × "));
    // a small part in a box with room: the box stays as it is
    await fresh({ w:160, d:120, h:40, lid:"screw", board:"uno" });
    await addPart("tp4056");
    check(size().join() === "160,120,40" && !clash(), "a small module in a roomy box goes inside it; the box keeps its size", size().join(" × "));
    // clear of the corner posts and of a divider
    await fresh({ w:120, d:90, h:40, lid:"screw", fasten:"insert", walls:[{ axis:"y", at:0 }] });
    for (const k of ["relay1", "relay1", "buck2596"]) await addPart(k);
    check(!clash() && E().w === 120 && E().d === 90, "parts added to a box with a divider and corner posts keep clear of both", clash() || size().join(" × "));
    // a level with room: a part that no longer fits the floor goes up there
    await fresh({ w:110, d:80, h:70, lid:"screw", board:"uno", levels:[{ z:40, t:2, hold:"brackets" }] });
    await addPart("relay2");
    const r2 = I().boards.find(b => b.key === "relay2");
    check(size().join() === "110,80,70" && r2 && r2.lvl === 1 && !clash(), "the floor is full: it goes on the level, and the box keeps its size", r2 && `level ${r2.lvl}`);
    // the box stays this size: no growing
    await fresh({ w:90, d:65, h:40, lid:"screw", board:"uno" });
    await press(/^Stays this size$/);
    await addPart("relay2");
    check(E().grow === false && size().join() === "90,65,40", "with “Stays this size” the box does not grow", size().join(" × "));
    // a copy goes beside the one it copies
    await fresh({ w:160, d:120, h:40, lid:"screw", more:[{ kind:"relay1", x:-30, y:0, h:3, hold:"holes" }] });
    await press(/^Duplicate$/);
    check(E().more.length === 2 && !clash() && size().join() === "160,120,40", "Duplicate puts the copy beside it", JSON.stringify(E().more.map(m => [m.x, m.y])));
  }

  console.log("\nthe box grows on the side a part sticks out of");
  {
    await fresh({ w:120, d:80, h:40, lid:"screw", board:"uno", boardX:-20, more:[{ kind:"tp4056", x:-40, y:22, h:3, hold:"holes" }] });
    const leftGap0 = I().boards.find(b => b.key === "tp4056").bb[0] + I().inner[0]/2;
    await type(/^Board position, across/, 40);
    const leftGap1 = I().boards.find(b => b.key === "tp4056").bb[0] + I().inner[0]/2, uno = I().boards.find(b => b.main);
    check(E().w > 120 && E().w <= 140 && E().d === 80 && Math.abs(leftGap1 - leftGap0) < 0.6 && uno.fits !== false, "the Uno moved past the right wall: the box grows on the right only, the module keeps its place by the left wall",
      `${size().join(" × ")}, gap ${leftGap0.toFixed(1)} → ${leftGap1.toFixed(1)}`);
    // turned 90° near a wall: it slides back in instead of growing the box
    await fresh({ w:140, d:110, h:40, lid:"screw", board:"uno", boardX:30, boardY:0 });
    const cb = [...document.querySelectorAll("#panel label.check")].find(l => /Turn the board 90/.test(l.textContent)).querySelector("input");
    cb.checked = true; cb.onchange({ target:cb }); await settle();
    check(size().join() === "140,110,40" && I().boards[0].fits !== false, "a board turned near a wall slides back inside; the box keeps its size", `${size().join(" × ")} at ${E().boardX}`);
    // a position past the old ±120 mm limit, in a 300 mm box
    await fresh({ w:300, d:200, h:40, lid:"screw", board:"uno" });
    await type(/^Board position, across/, 135);
    check(E().boardX === 135, "the board can go 135 mm from the middle of a 300 mm box", E().boardX);
  }

  console.log("\nthe board's port openings follow it");
  {
    await fresh({ w:140, d:100, h:40, lid:"screw", board:"uno" });
    await press(/^Add this board's ports$/);
    const n0 = E().cut.length, u0 = E().cut.map(c => c.u); E().cut.forEach(c => { c.label = "MINE"; }); MF.rebuild(false); await settle();
    await type(/^Board position, front to back/, 10);
    // on the left wall u runs from the back to the front (seen from outside): 10 mm further back is 10 mm less
    check(E().cut.length === n0 && E().cut.every((c, k) => c.face === "left" && Math.abs(c.u - (u0[k] - 10)) < 0.01 && c.label === "MINE") && !warns(/left out/).length,
      "the Uno moved 10 mm back: its USB and power openings move with it, labels kept", `${u0.join(", ")} → ${E().cut.map(c => c.u).join(", ")}`);
    await press(/^Add this board's ports$/);
    check(E().cut.length === n0, "pressing Add this board's ports again adds none twice", E().cut.length);
    await press(/^Arrange in this box$/);
    check(E().cut.length === n0 && E().cut.every(c => c.label === "MINE"), "Arrange keeps the port openings' labels", E().cut.map(c => c.label).join(","));
    // another board picked: the old board's ports go, the new one's come
    const s = field(/^Board$/).querySelector("select"); s.value = "pi"; s.onchange(); await settle();
    check(E().cut.every(c => c.board === "pi") && E().cut.some(c => c.kind === "rj45") && !E().cut.some(c => c.kind === "usbb"), "picking a Pi: the Uno's openings go, the Pi's come", E().cut.map(c => c.kind).join(","));
    await press(/^Remove this board$/);
    check(E().board === "none" && E().cut.length === 0, "Remove this board takes its port openings too", E().cut.length);
    // a copy of a port opening is the user's own
    await fresh({ w:140, d:100, h:40, lid:"screw", board:"uno" });
    await press(/^Add this board's ports$/); await press(/^Duplicate$/);
    check(E().cut.filter(c => c.auto === "ports").length === 2 && E().cut.length === 3 && !warns(/left out/).length, "a duplicated port opening is not the board's (Arrange would take it), and finds a free place", E().cut.map(c => c.auto || "-").join(","));
  }

  console.log("\nopenings");
  {
    await fresh({ w:60, d:50, h:30, lid:"screw" });
    for (let i = 0; i < 5; i++) await addOpening("usbc");
    check(E().cut.length === 5 && !I().left.length && E().w > 60, "five USB-C ports on a 60 mm front: the box grows along it, none left out", `${size().join(" × ")}, left out ${I().left.length}`);
    await fresh({ w:80, d:60, h:30, lid:"screw" }); await press(/^Stays this size$/);
    for (let i = 0; i < 6; i++) await addOpening("usbc");
    check(E().w === 80 && I().left.length > 0, "with “Stays this size” the front stays 80 mm and the extra ones are left out", I().left.length);
  }

  console.log("\nlevels and dividers");
  {
    // three levels added in a shallow box: none vanishes
    await fresh({ w:120, d:90, h:40, lid:"screw" });
    for (let i = 0; i < 3; i++) await press(/^Add a level/);
    check(I().levels.length === 3 && !warns(/Level \d left out/).length && E().h > 40, "a third level in a 40 mm box: the box grows taller, every level is built", `${E().h} mm, ${I().levels.length} levels`);
    // a new level goes over the parts on the floor
    await fresh({ w:140, d:100, h:80, lid:"screw", more:[{ kind:"lrs35", x:0, y:0, h:3, hold:"holes" }] });
    await press(/^Add a level/);
    const lrs = I().boards.find(b => b.key === "lrs35"), fl = I().size[2] - I().inner[2], L1 = I().levels[0];
    check(fl + L1.z - L1.t > lrs.partsTop && !warns(/too tall/).length, "a new level goes over the power supply on the floor", `${(fl + L1.z - L1.t).toFixed(1)} over ${lrs.partsTop.toFixed(1)}`);
    // a level too close to another is said, not dropped in silence
    await fresh({ w:120, d:90, h:80, lid:"screw", levels:[{ z:30, t:2 }, { z:31, t:2 }] });
    check(warns(/Level \d left out/).length === 1, "a level 1 mm over another is left out with a warning", warns(/left out/).map(w => w.t).join());
    // levels typed out of order: the panel lists them by height, the parts go with their level
    await fresh({ w:140, d:100, h:100, lid:"screw", board:"uno", boardLvl:1, levels:[{ z:30, t:2, hold:"brackets" }, { z:65, t:2, hold:"brackets" }] });
    await type(/^Height of its top above the floor/, 80, 0);
    check(E().levels.map(l => l.z).join() === "65,80" && E().boardLvl === 2 && I().boards[0].lvl === 2, "level 1 raised over level 2: they swap in the list and the Uno stays on its shelf (now level 2)", `${E().levels.map(l => l.z)}; Uno on ${E().boardLvl}`);
    // a level taken out: the main board and a divider on it go down one
    await fresh({ w:140, d:100, h:100, lid:"screw", board:"uno", boardLvl:2, walls:[{ axis:"x", at:20, lvl:2 }], levels:[{ z:30, t:2, hold:"brackets" }, { z:65, t:2, hold:"brackets" }] });
    const lv1 = [...document.querySelectorAll("#panel p")].find(p => /^Level 1:/.test(p.textContent)); let el = lv1, rm = null;
    while (el && !rm) { el = el.nextElementSibling; if (el && el.querySelector) rm = [...el.querySelectorAll("button")].find(b => b.textContent === "Remove") || (el.tagName === "BUTTON" && el.textContent === "Remove" ? el : null); }
    rm.click(); await settle();
    check(E().levels.length === 1 && E().boardLvl === 1 && E().walls[0].lvl === 1, "level 1 removed: the Uno and the divider on level 2 are on level 1 now", `${E().boardLvl}, ${E().walls[0].lvl}`);
    // a second divider crosses the first, it does not land on it
    await fresh({ w:140, d:100, h:50, lid:"screw" });
    await press(/^Add a divider$/); await press(/^Add a divider$/);
    check(E().walls.length === 2 && (E().walls[0].axis !== E().walls[1].axis || E().walls[0].at !== E().walls[1].at), "a second divider goes elsewhere", JSON.stringify(E().walls.map(w => [w.axis, w.at])));
    await press(/^Add a divider$/);
    const ws = E().walls.map(w => w.axis + w.at);
    check(new Set(ws).size === 3, "a third one splits the biggest room", ws.join(" "));
  }

  console.log("\nshrink to fit, make it all fit, inside sizes, the overview");
  {
    await fresh({ w:220, d:160, h:90, lid:"screw", board:"uno", boardX:30, boardY:-10, more:[{ kind:"relay1", x:-40, y:10, h:3, hold:"holes" }] });
    const w0 = I().warn.length; await press(/^Shrink to fit/);
    check(E().w < 150 && E().d < 110 && E().h < 60 && I().warn.length <= w0 && !clash(), "Shrink to fit: a 220 × 160 × 90 box round a Uno and a relay comes down to their size", size().join(" × "));
    const s1 = size().join(); await press(/^Shrink to fit/);
    check(size().join() === s1, "a second press changes nothing", size().join(" × "));
    // everything out of place at once
    await fresh({ w:100, d:70, h:30, lid:"screw", grow:false, board:"uno", boardX:30, cut:[{ kind:"usbc", face:"front", u:60, v:12, rot:false }] });
    check(buttons().some(b => /^Make it all fit$/.test(b.textContent)) && /thing/.test(document.querySelector("#panel").textContent), "the problems are listed at the top, with Make it all fit");
    await press(/^Make it all fit$/);
    check(I().boards[0].fits !== false && !I().left.length && E().grow === false, "Make it all fit: the board gets room and the opening comes onto the front, even with the size kept", `${size().join(" × ")}, left out ${I().left.length}`);
    // inside sizes: the walls are added
    await fresh({ w:100, d:70, h:40, wall:2.4, floor:2, lid:"screw" });
    await press(/^Inside sizes$/);
    await type(/^Inside width/, 100); await type(/^Inside depth/, 60); await type(/^Inside height/, 30);
    check(Math.abs(E().w - 104.8) < 0.01 && Math.abs(E().d - 64.8) < 0.01 && Math.abs(E().h - 32) < 0.01 && Math.abs(I().inner[0] - 100) < 0.01, "inside sizes: 100 × 60 × 30 inside makes a 104.8 × 64.8 × 32 box", size().join(" × "));
    await press(/^Outside sizes$/);
    // the overview of the parts
    await fresh({ w:140, d:100, h:40, lid:"screw", board:"uno", more:[{ kind:"relay1", x:0, y:0, h:3, hold:"holes" }] });
    const txt = document.querySelector("#panel").textContent;
    check(/In the box:/.test(txt) && /% taken/.test(txt) && /overlaps/.test(txt), "Board mounts lists every part, how much floor they take, and what is wrong (an overlap here)");
  }

  console.log("\na hostile file");
  {
    const s0 = JSON.parse(MF.projectPayload()).state; s0.base.type = "enclosure";
    Object.assign(s0.base.enclosure, { levels:[{ z:90, t:2 }, null, "x", { z:20 }], boardLvl:"two", walls:[{ axis:"y", at:"far", lvl:-3 }], more:[{ kind:"relay1", x:1e9, y:-1e9 }], grow:"maybe", cut:[{ kind:"usbc", face:"front", auto:"ports", board:"<b>", port:1e9 }] });
    const f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:s0 })], "p.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); await sleep(400); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50);
    await press(/^Shrink to fit/); if (buttons().some(b => /^Make it all fit$/.test(b.textContent))) await press(/^Make it all fit$/);
    check(MF.parts.length > 0 && MF.parts.every(p => { const r = MF.core.checkMesh(p.solid); return r.open === 0 && !r.nan; }), "levels that are not levels, a part a billion mm away and a port of a board that does not exist: it builds, and the buttons cope");
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
