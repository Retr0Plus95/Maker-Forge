// Project boxes, seeing the parts (Session 62): the plan of the inside (drawn, picked, dragged, nudged with keys), the parts
// catalogue with drawings, names over the parts in the 3D view, How to put it together, the openings' parts in What you'll
// need, strap loops instead of floor slots, level brackets on the front and back walls, Arrange moving the posts you put,
// and this session's bug fixes (things on the walls moving out when the box grows, an opening pushing another out, a bigger
// box that does not help).
//   node tools-boxview-test.js index.html
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
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const E = () => MF.state.base.enclosure, I = () => MF.enclosure, size = () => [E().w, E().d, E().h];
  const make = async () => { [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50); };
  const fresh = async over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); MF.rebuild(false); await settle(); await make(); };
  const page = title => [...document.querySelectorAll("#panel .section")].find(d => d.dataset.title === title);
  const press = async (re, root) => { const b = [...(root || document.querySelector("#panel")).querySelectorAll("button")].find(b => re.test(b.textContent)); if (!b) { check(false, `a button ${re}`); return false; } b.click(); await settle(); return true; };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const support = async () => { MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const key = async (el, k, o = {}) => { el.dispatchEvent(new win.KeyboardEvent("keydown", Object.assign({ key:k, bubbles:true }, o))); await settle(); };
  const plan = () => document.querySelector("#panel .section[data-title='Plan of the inside'] .boxplan");
  const pickPart = async n => { const g = plan().querySelectorAll(".pl-part")[n]; g.dispatchEvent(new win.Event("pointerdown", { bubbles:true })); plan().dispatchEvent(new win.Event("pointerup", { bubbles:true })); await settle(); };

  console.log("the plan of the inside");
  {
    await fresh({ w:160, d:110, h:50, lid:"screw", fasten:"insert", board:"uno", boardX:-30, boardY:5, more:[{ kind:"relay2", x:45, y:20, h:3, hold:"holes" }, { kind:"bat18650x1", x:-32, y:-38, h:3, hold:"holes" }],
      walls:[{ axis:"y", at:12 }], ducts:[{ face:"back", at:-30 }], cut:[{ kind:"usbc", face:"front", u:20, v:20 }, { kind:"vent", face:"bottom", u:45, v:-30 }] });
    check(!I().warn.length, "(the box for these checks has no warnings)", I().warn.map(w => w.t).join("; "));
    const pg = page("Plan of the inside"), svg = plan();
    check(!!pg && !!svg, "a Plan of the inside page with the plan");
    const parts = svg.querySelectorAll(".pl-part"), names = [...svg.querySelectorAll(".pl-name")].map(t => t.textContent);
    check(parts.length === 3 && names.some(n => /Uno/.test(n)) && names.some(n => /Relay/.test(n)), "every part on the floor is drawn, with its name", names.join(", "));
    check(svg.querySelectorAll(".pl-screw").length === 4 && svg.querySelectorAll(".pl-port").length >= 2, "the Uno's four screw holes and its ports are drawn", `${svg.querySelectorAll(".pl-screw").length} holes, ${svg.querySelectorAll(".pl-port").length} ports`);
    check(svg.querySelectorAll(".pl-post").length === 4 && svg.querySelectorAll(".pl-div").length === 1 && svg.querySelectorAll(".pl-duct").length === 1 && svg.querySelectorAll(".pl-hole").length === 1 && svg.querySelectorAll(".pl-floorhole").length >= 1,
      "the corner posts, the divider, the cable channel, the front opening and the floor vent are drawn");
    const uno = [...parts].find(g => /Uno/.test(g.textContent)), r = uno.querySelector("rect"), b = I().boards.find(q => q.main);
    check(Math.abs(+r.getAttribute("x") - b.bb[0]) < 0.01 && Math.abs(+r.getAttribute("width") - (b.bb[2] - b.bb[0])) < 0.01 && Math.abs(+r.getAttribute("y") + b.bb[3]) < 0.01, "drawn to scale, in millimetres, back at the top");
    // pick the relay: its settings come up, the 3D view marks it
    await pickPart(1);
    const txt = page("Plan of the inside").textContent;
    check(/Relay module, 2 channels/.test(txt) && [...page("Plan of the inside").querySelectorAll(".field label")].some(l => /^Across/.test(l.textContent)), "picking a part shows its settings under the plan", txt.match(/Relay[^:]*:[^,]*/) && txt.match(/Relay[^:]*:[^,]*/)[0]);
    // the keys: arrows, Shift, R, D, Delete
    const m0 = E().more[0], x0 = m0.x, y0 = m0.y;
    await key(plan(), "ArrowLeft"); await key(plan(), "ArrowDown", { shiftKey:true });
    check(Math.abs(m0.x - (x0 - 1)) < 0.01 && Math.abs(m0.y - (y0 - 5)) < 0.01, "arrow keys move the picked part 1 mm, with Shift 5 mm", `${x0},${y0} → ${m0.x},${m0.y}`);
    await key(plan(), "r");
    check(m0.rot === true, "R turns it");
    await key(plan(), "d");
    check(E().more.length === 3 && !I().warn.some(w => /overlaps/.test(w.t)), "D copies it, where there is room", E().more.length);
    await key(plan(), "Delete");
    check(E().more.length === 2, "Delete takes the picked part out", E().more.length);
    // with levels: a floor picker, and a part on a level drawn on its own floor
    await fresh({ w:140, d:100, h:90, lid:"screw", board:"uno", more:[{ kind:"relay1", x:0, y:0, h:3, hold:"holes", lvl:1 }], levels:[{ z:45, t:2, hold:"brackets" }] });
    const segs = [...page("Plan of the inside").querySelectorAll(".seg button")].map(b => b.textContent);
    check(segs.includes("Floor") && segs.includes("Level 1"), "with a level, the plan has a floor picker", segs.join(","));
    check(plan().querySelectorAll(".pl-part").length === 1 && plan().querySelectorAll(".pl-other").length === 1, "the floor shows its own parts, and the level's dashed");
    [...page("Plan of the inside").querySelectorAll(".seg button")].find(b => b.textContent === "Level 1").click(); await settle();
    check(/Relay/.test(plan().textContent) && plan().querySelectorAll(".pl-post").length >= 4, "Level 1 shows the relay and the level's wall brackets", plan().querySelectorAll(".pl-post").length);
    await press(/See it bigger/);
    check(!document.querySelector("#modal").hidden && !!document.querySelector("#modal .boxplan"), "⤢ See it bigger opens the plan in a window");
    document.querySelector("#modalClose").click();
  }

  console.log("\nthe parts catalogue");
  {
    await fresh({ w:160, d:110, h:50, lid:"screw" });
    [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Board mounts").click(); await sleep(30);
    await press(/^Browse the parts, with pictures$/);
    const M = document.querySelector("#modal"), cards = () => M.querySelectorAll(".partcard");
    check(!M.hidden && cards().length >= 100 && cards()[0].querySelector("svg rect"), "Browse the parts lists every board, module and battery, each drawn", cards().length);
    const inp = M.querySelector("input[type=search]"); inp.value = "uno"; inp.oninput(); await sleep(20);
    const uno = [...cards()].find(c => /Arduino Uno/.test(c.textContent));
    check(cards().length <= 4 && uno && uno.querySelectorAll("circle").length === 4 && uno.querySelectorAll(".pc-port").length === 2 && /68.6 × 53.3 mm/.test(uno.textContent), "the search finds the Uno, drawn with its 4 holes and 2 ports, with its size", cards().length);
    await press(/^As the main board$/, uno);
    check(E().board === "uno", "As the main board makes it the main board");
    inp.value = "relay"; inp.oninput(); await sleep(20);
    await press(/^Add to the box$/, cards()[0]); await press(/^Add to the box$/, cards()[0]);
    check(E().more.length === 2 && !document.querySelector("#modal").hidden && /3 added/.test(M.textContent) && !I().warn.some(w => /overlaps/.test(w.t)), "Add to the box adds it where there is room, and the window stays open to add more", E().more.map(m => m.kind).join(","));
    // the openings' drawings are the holes they cut
    document.querySelector("#modalClose").click();
    [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Openings").click(); await sleep(30);
    await press(/^Browse the openings, with pictures$/);
    check(M.querySelectorAll(".partcard").length >= 140 && M.querySelectorAll(".partcard path.pc-cut").length >= 140, "Browse the openings draws every opening as the hole it cuts", M.querySelectorAll(".partcard").length);
    const fsel = [...M.querySelectorAll("select")].find(s => [...s.options].some(o => o.value === "back")); fsel.value = "back"; fsel.onchange();
    const inp2 = M.querySelector("input[type=search]"); inp2.value = "usb-c port"; inp2.oninput(); await sleep(20);
    const n0 = E().cut.length; await press(/^Add$/, M.querySelectorAll(".partcard")[0]);
    check(E().cut.length === n0 + 1 && E().cut[E().cut.length - 1].face === "back", "Add puts it on the face picked at the top", E().cut.map(c => c.face).join(","));
    document.querySelector("#modalClose").click();
  }

  console.log("\nthe parts named in the 3D view");
  {
    await fresh({ w:140, d:100, h:40, lid:"none", board:"uno", more:[{ kind:"relay1", x:40, y:0, h:3, hold:"holes" }] });
    const sprites = () => { let n = 0; MF.scene.traverse(o => { if (o.isSprite && o.renderOrder === 6) n++; }); return n; };
    check(sprites() === 2, "each part has its name over it", sprites());
    const cb = [...document.querySelectorAll("#panel label.check")].find(l => /Names over the parts/.test(l.textContent)).querySelector("input"); cb.checked = false; cb.onchange({ target:cb }); await settle();
    check(sprites() === 0, "and they go when switched off", sprites());
    cb.checked = true; cb.onchange({ target:cb }); await settle();
    await pickPart(1);
    let amber = 0; MF.scene.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0xffa21a) amber++; });
    check(amber >= 1, "the part picked in the plan is amber in the 3D view", amber);
  }

  console.log("\nhow to put it together, and what you'll need");
  {
    await fresh({ w:180, d:130, h:110, lid:"screw", fasten:"insert", board:"uno", feet:"recess", ducts:[{ face:"back", at:30 }], ductCover:true,
      more:[{ kind:"relay2", x:50, y:30, h:3, hold:"edges", grip:"clips" }, { kind:"buck2596", x:40, y:0, h:3, lvl:1 }], levels:[{ z:60, t:2, hold:"brackets", pass:"back" }], walls:[{ axis:"y", at:15, fan:40 }],
      cut:[{ kind:"usbc", face:"front", u:-60, v:20 }, { kind:"pilotp3", face:"front", u:0, v:20 }, { kind:"gland9", face:"back", u:-40, v:30 }] });
    await press(/^Add this board's ports$/);
    const steps = [...page("How to put it together").querySelectorAll("li")].map(li => li.textContent);
    const has = re => steps.some(t => re.test(t));
    check(steps.length >= 9 && has(/^Print Box, Lid, Level 1, Divider 1/) && has(/heat inserts.*4 in the lid posts/) && has(/rubber feet/) && has(/screw Arduino Uno onto its standoffs/) && has(/clips click/)
      && has(/40 mm fan into divider 1/) && has(/^Level 1: push Buck/) && has(/wall brackets/) && has(/pilot light lens/) && has(/^Screw the lid on \(M3 screws/), "the steps follow the box: print, inserts, feet, boards, the divider's fan, the level, lenses, the lid", steps.length);
    const need = I().need.map(([n, w]) => `${n} x ${w}`);
    check(need.some(t => /1 x USB-C port \(in its opening\)/.test(t)) && need.some(t => /3 mm LED, for a pilot light/.test(t)) && need.some(t => /Cable gland PG9/.test(t)) && !need.some(t => /USB-B/.test(t)),
      "What you'll need lists the openings' parts (not the board's own ports)", need.filter(t => /opening/.test(t)).join("; "));
    // (the download's how-to-assemble.txt is checked in Chromium: JSZip cannot build a zip inside jsdom)
    check(MF.boxRoom.assembly().join("|") === steps.join("|"), "the steps on the page are the ones the download writes");
  }

  console.log("\nstrap loops, brackets on the front and back, Arrange and the posts you put");
  {
    await fresh({ w:140, d:100, h:40, lid:"screw", board:"lipo906090", boardStrapBy:"loops" });
    let q = MF.parts, box = q.find(p => p.name === "Box");
    check(closed(q) && !I().warn.length, "a battery on strap loops builds closed, with no warnings");
    E().boardStrapBy = "slots"; MF.rebuild(false); await settle(); const vSlots = C.signedVolume(MF.parts.find(p => p.name === "Box").solid);
    E().boardStrapBy = "loops"; MF.rebuild(false); await settle(); const vLoops = C.signedVolume(MF.parts.find(p => p.name === "Box").solid);
    check(vLoops > vSlots + 200, "loops add their tunnels and close the floor's slots", `${vSlots.toFixed(0)} → ${vLoops.toFixed(0)} mm³`);
    const sL = await support();
    check(sL === 0, "the loops' gable roofs need no support", `${sL} mm²`);
    check(I().need.some(([n, w]) => n === 1 && /hook-and-loop straps/.test(w)), "What you'll need still counts the strap");
    // brackets on the front and back
    await fresh({ w:140, d:100, h:90, lid:"screw", levels:[{ z:50, t:2, hold:"brackets", bracketWalls:"frontback" }] });
    const lv = I().levels[0];
    check(lv.posts.length === 4 && lv.posts.every(([x, y]) => Math.abs(Math.abs(y) - (I().inner[1]/2 - 4.5)) < 0.01) && closed(MF.parts) && !I().warn.length, "a level's brackets on the front and back walls: four, built closed", JSON.stringify(lv.posts));
    const sB = await support();
    check(sB === 0, "they print without support, like the side ones", `${sB} mm²`);
    await fresh({ w:140, d:100, h:90, lid:"screw", board:"uno", boardX:30, boardY:-20, levels:[{ z:30, t:2, hold:"brackets", bracketWalls:"frontback" }] });
    check(I().warn.some(w => /runs into a wall bracket/.test(w.t)), "a board under a front bracket is named");
    // Arrange moves a post a board now covers
    await fresh({ w:150, d:110, h:80, lid:"screw", board:"uno", more:[{ kind:"relay2", x:0, y:0, h:3, hold:"holes" }], levels:[{ z:50, t:2, hold:"custom", at:[{ x:-50, y:-35 }, { x:50, y:-35 }, { x:-50, y:35 }, { x:50, y:35 }] }] });
    await press(/^Arrange in this box$/);
    check(!I().warn.some(w => /under a post/.test(w.t)), "after Arrange no board is under a post you put", I().warn.map(w => w.t).join("; ") || document.querySelector("#notice").textContent);
  }

  console.log("\nthis session's bug fixes");
  {
    // a box too small for corner posts gets them when it grows: the new part is not put on one
    for (const [w, d] of [[40, 40], [49, 55]]) {
      await fresh({ w, d, h:23, lid:"screw", fasten:"insert", radius:5 });
      const f = [...document.querySelectorAll("#panel .field")].find(x => /^Add another board/.test((x.querySelector("label") || {}).textContent || "")), inp = f.querySelector("input");
      inp.value = "pi3a"; inp.oninput(); await sleep(10); await press(/^Add it$/);
      check(!I().warn.some(x => /screw post|overlaps/.test(x.t)), `a Pi 3 A+ added to a ${w} × ${d} box: not on a corner post that came with the growth`, size().join(" × "));
    }
    // dividers make every room too small: the box grows both ways, the part is not dropped in the middle
    await fresh({ w:121, d:188, h:39, lid:"screw", walls:[{ axis:"x", at:0 }, { axis:"y", at:0 }] });
    { const f = [...document.querySelectorAll("#panel .field")].find(x => /^Add another board/.test((x.querySelector("label") || {}).textContent || "")), inp = f.querySelector("input");
      inp.value = "lrs150"; inp.oninput(); await sleep(10); await press(/^Add it$/); }
    check(!I().warn.some(x => /crosses|overlaps/.test(x.t)) && !/middle/.test(document.querySelector("#notice").textContent), "a power supply too big for any room: the box grows both ways for it", size().join(" × "));
    // a copied opening put first would push others out: it finds a free place instead
    await fresh({ w:110, d:107, h:60, lid:"screw", cut:[{ kind:"usba", face:"front", u:-6, v:13 }, { kind:"pilotp3", face:"front", u:14, v:13 }, { kind:"pilotp3", face:"front", u:24, v:13 }, { kind:"pilotp3", face:"front", u:34, v:13 }] });
    [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Openings").click(); await sleep(30);
    await press(/^Duplicate$/);
    check(E().cut.length === 5 && !I().left.length, "a copied USB-A on a busy front pushes nothing out", `left out: ${I().left.length}`);
    // a bigger box that does not help: back to its size, and says so
    await fresh({ w:107, d:109, h:34, lid:"screw", radius:6, cut:[{ kind:"rect", face:"right", u:-16.5, v:18, w:50, h:10, notch:true }] });
    const before = size().join();
    { const f = [...document.querySelectorAll("#panel .field")].find(x => /^Add an opening/.test((x.querySelector("label") || {}).textContent || "")), inp = f.querySelector("input");
      const on = [...document.querySelectorAll("#panel .field")].find(x => /^On$/.test((x.querySelector("label") || {}).textContent || "") && [...(x.querySelector("select") || { options:[] }).options].some(o => o.value === "bottom")).querySelector("select");
      inp.value = "pitouch7"; inp.oninput(); on.value = "right"; on.dispatchEvent(new win.Event("change")); await sleep(20); await press(/^Add opening$/); }
    check(size().join() === before && /even in a bigger box/.test(document.querySelector("#notice").textContent), "a 7-inch screen that cannot fit past a notch: the box keeps its size and says why", size().join(" × "));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
