// Project boxes, v0.55 (Session 63): boards on a wall or under the lid, the plan's tools (openings, distances, Tab), the
// wiring, a board from KiCad, the parts' real shapes, heat, recipes, the style (the lid's edge, textures, a band), the fit
// test for the holders, and a saved project that keeps everything (it lost modules' and openings' newer settings before).
//   node tools-boxpro-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const KICAD = `(kicad_pcb (version 20221018) (generator pcbnew)
  (title_block (title "Test panel"))
  (gr_rect (start 100 100) (end 160 140) (layer "Edge.Cuts") (width 0.1))
  (footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at 103.5 103.5) (property "Reference" "H1"))
  (footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at 156.5 103.5) (property "Reference" "H2"))
  (footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at 103.5 136.5) (property "Reference" "H3"))
  (footprint "MountingHole:MountingHole_3.2mm_M3" (layer "F.Cu") (at 156.5 136.5) (property "Reference" "H4"))
  (footprint "Connector_USB:USB_C_Receptacle_GCT_USB4085" (layer "F.Cu") (at 103 120 90) (property "Reference" "J1")
    (pad "A1" smd rect (at -2 -3) (size 0.6 1.2) (layers "F.Cu")) (pad "B1" smd rect (at 2 3) (size 0.6 1.2) (layers "F.Cu"))
    (fp_line (start -4.5 -3.5) (end 4.5 -3.5) (layer "F.CrtYd")) (fp_line (start -4.5 3.5) (end 4.5 3.5) (layer "F.CrtYd")))
  (footprint "LED_THT:LED_D5.0mm" (layer "F.Cu") (at 140 115) (property "Reference" "D1")
    (pad "1" thru_hole rect (at 0 0) (size 1.8 1.8) (drill 0.9) (layers "*.Cu")) (pad "2" thru_hole circle (at 2.54 0) (size 1.8 1.8) (drill 0.9) (layers "*.Cu")))
  (footprint "Button_Switch_THT:SW_PUSH_6mm" (layer "F.Cu") (at 130 125) (property "Reference" "SW1")
    (pad "1" thru_hole circle (at 0 0) (size 2 2) (drill 1.1)) (pad "2" thru_hole circle (at 6.5 0) (size 2 2) (drill 1.1))
    (pad "3" thru_hole circle (at 0 4.5) (size 2 2) (drill 1.1)) (pad "4" thru_hole circle (at 6.5 4.5) (size 2 2) (drill 1.1)))
)`;
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
  const MF = win.MakerForge, C = MF.core, R = MF.boxRoom, e0 = env.errors.length;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const E = () => MF.state.base.enclosure, I = () => MF.enclosure, size = () => [E().w, E().d, E().h];
  const make = async () => { [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50); };
  const fresh = async over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); MF.rebuild(false); await settle(); await make(); };
  const page = title => [...document.querySelectorAll("#panel .section")].find(d => d.dataset.title === title);
  const press = async (re, root) => { const b = [...(root || document.querySelector("#panel")).querySelectorAll("button")].find(b => re.test(b.textContent)); if (!b) { check(false, `a button ${re}`); return false; } b.click(); await settle(); return true; };
  const closed = () => MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const support = async () => { MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const warnT = () => I().warn.map(w => w.t);
  const plan = () => document.querySelector("#panel .section[data-title='Plan of the inside'] .boxplan");
  const key = async (k, o = {}) => { plan().dispatchEvent(new win.KeyboardEvent("keydown", Object.assign({ key:k, bubbles:true, cancelable:true }, o))); await settle(); };
  const reload = async () => { const s0 = JSON.parse(MF.projectPayload()).state, f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:s0 })], "p.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); await sleep(300); await settle(); await make(); };

  console.log("boards on a wall and under the lid");
  {
    for (const [face, side] of [["back", "in"], ["left", "in"], ["right", "in"], ["front", "out"], ["top", "in"]]) {
      await fresh({ w:140, d:110, h:110, lid:"screw", fasten:"insert", board:"pi", boardFace:face, boardSide:side, boardX:0, boardY:face === "top" ? 0 : 60, standH:face === "front" ? 18 : 6 });
      const s = await support(), b = I().boards[0];
      check(closed() && !warnT().length && s === 0 && b.face === face && I().ghosts.filter(g => g.who).length === 2, `a Pi on ${face === "top" ? "the lid" : "the " + face + " wall"}, its parts facing ${side}: closed, no support, drawn in 3D`, `${s} mm²`);
    }
    await fresh({ w:140, d:110, h:110, lid:"screw", board:"pi", boardFace:"front", boardSide:"out", boardY:60, standH:6 });
    check(warnT().some(t => /parts go through the front wall/.test(t)), "facing the wall on short standoffs: its parts would go through it, and it says so");
    await fresh({ w:140, d:110, h:80, lid:"screw", board:"pi", boardFace:"back", boardX:0, boardY:40, standH:6, more:[{ kind:"relay1", x:0, y:35, h:3 }] });
    check(warnT().some(t => /Raspberry Pi .* runs into Relay module/.test(t)), "a relay on the floor under the Pi on the back wall: named, in 3D");
    await fresh({ w:140, d:110, h:110, lid:"screw", board:"pi", boardFace:"back", boardX:0, boardY:60, standH:6 });
    { const f = [...document.querySelectorAll("#panel .field")].find(w => /^Along the wall/.test((w.querySelector("label") || {}).textContent || "")), inp = f.querySelector("input[type=number]"); inp.value = "60"; inp.dispatchEvent(new win.Event("change")); await settle(); }
    check(E().w > 140 && !warnT().length, "a board run off the end of its wall: the box grows that way", size().join(" × "));
    // the panel: Mounted on, and the plan shows it
    await fresh({ w:140, d:110, h:110, lid:"screw", board:"pi" });
    const ms = [...document.querySelectorAll("#panel .field")].find(w => /^Mounted on$/.test((w.querySelector("label") || {}).textContent || "")).querySelector("select");
    ms.value = "back"; ms.dispatchEvent(new win.Event("change")); await settle(); await make();
    check(E().boardFace === "back" && E().boardY > 20 && I().boards[0].face === "back" && [...plan().querySelectorAll(".pl-face")].length === 1, "Mounted on: The back wall puts it there, half way up, and the plan draws it", `${E().boardY}`);
    check(R.assembly().some(t => /^On the walls and the lid: screw Raspberry Pi .* on the back wall/.test(t)), "How to put it together says where it goes");
    // found by tools-boxfuzz.js: a wall chosen for a board, then a board without holes picked: it is on the floor, and a part
    // added beside it does not land on it (the box's growth moved it as if it were on the wall)
    await fresh({ w:207, d:110, h:75, lid:"screw", board:"nodemcu3", boardFace:"right" });
    { const f = [...document.querySelectorAll("#panel .field")].find(x => /^Add another board/.test((x.querySelector("label") || {}).textContent || "")), inp = f.querySelector("input");
      inp.value = "rc3s5000"; inp.oninput(); await sleep(10); await press(/^Add it$/); }
    check(!warnT().some(t => /overlaps/.test(t)) && !I().boards[0].face, "a board without holes left with a wall chosen stays on the floor, and a part added beside it does not land on it", warnT().join("; ") || size().join(" × "));
  }

  console.log("\nthe plan's tools");
  {
    await fresh({ w:160, d:110, h:50, lid:"screw", board:"uno", boardX:-30, boardY:5, more:[{ kind:"relay2", x:45, y:20, h:3, hold:"holes" }], cut:[{ kind:"usbc", face:"front", u:20, v:20 }, { kind:"vent", face:"bottom", u:45, v:-30 }] });
    await key("Tab");
    check([...plan().querySelectorAll(".pl-sel")].map(q => q.dataset.pick).join() === "main" && plan().querySelectorAll(".pl-dimtxt").length === 4, "Tab picks the first part, with its distances to the walls and its neighbour", [...plan().querySelectorAll(".pl-dimtxt")].map(t => t.textContent).join(" "));
    await key("Tab"); await key("Tab");
    check([...plan().querySelectorAll(".pl-sel")].map(q => q.dataset.pick).join() === "c0", "Tab goes on to the openings after the parts");
    await key("ArrowRight", { shiftKey:true }); await key("PageUp");
    check(E().cut[0].u === 25 && E().cut[0].v === 21, "an opening picked in the plan moves along its wall, and Page Up raises it", `${E().cut[0].u}, ${E().cut[0].v}`);
    await key("Tab"); await key("ArrowUp"); await key("ArrowLeft");
    check(E().cut[1].u === 44 && E().cut[1].v === -29, "an opening in the floor moves both ways", `${E().cut[1].u}, ${E().cut[1].v}`);
    const ev = new win.KeyboardEvent("keydown", { key:"Tab", bubbles:true, cancelable:true }); plan().dispatchEvent(ev);
    check(!ev.defaultPrevented, "Tab past the last one leaves the plan");
  }

  console.log("\nthe wiring");
  {
    await fresh({ w:160, d:120, h:90, lid:"screw", board:"uno", boardX:-35, boardY:10, more:[{ kind:"relay2", id:"rel001", x:45, y:20, h:3 }, { kind:"buck2596", id:"buc001", x:40, y:0, h:3, lvl:1 }],
      levels:[{ z:45, t:2, hold:"brackets", pass:"back" }], cut:[{ kind:"barrel", face:"back", u:40, v:20, id:"dcj001" }],
      wires:[{ from:"dcj001", fromPin:"+", to:"buc001", toPin:"IN+", colour:"red" }, { from:"buc001", fromPin:"OUT+", to:"main", toPin:"VIN", colour:"red" }, { from:"main", fromPin:"D7", to:"rel001", toPin:"IN1", colour:"yellow" }, { from:"gone1", to:"main" }] });
    const ws = R.wires(E(), I()), ok = ws.filter(w => w.ok);
    check(ok.length === 3 && ws.length === 4 && /no longer in the box/.test(ws[3].why), "three wires with a length, one whose end is gone said so", ok.map(w => w.len).join(", "));
    const up = ok[0], P = up.path, pass = [0, I().inner[1]/2 - 12];
    check(P.some(q => Math.abs(q[0] - pass[0]) < 0.01 && Math.abs(q[1] - pass[1]) < 0.01) && up.len >= 100, "the wire up to the level goes through its cable pass at the back", JSON.stringify(P));
    check(plan().querySelectorAll(".pl-wire").length === 3 && /Wire to cut/.test(page("Wiring").textContent), "the plan draws them, the Wiring page totals each colour");
    check(R.assembly().some(t => /3 wires, wiring\.txt/.test(t)), "How to put it together points to the wiring list");
    await press(/^Add a wire$/, page("Wiring"));
    check(E().wires.length === 5 && E().wires[4].from && E().wires[4].to && E().wires[4].from !== E().wires[4].to, "Add a wire adds one between two parts", JSON.stringify(E().wires[4]));
  }

  console.log("\na board from KiCad");
  {
    const r = R.kicad(KICAD);
    check(r.ok && r.board.w === 60 && r.board.d === 40 && r.board.holes.length === 4 && r.board.screw === "M3" && JSON.stringify(r.board.ports) === '[["x0",20,"usbc",1.6]]' && r.board.panel.map(q => q[2]).join() === "led5,tact",
      "its outline, four M3 holes, the USB-C at the left edge, an LED and a button on top", JSON.stringify(r.board));
    check(!R.kicad("hello").ok && !R.kicad("(kicad_pcb (version 1))").ok, "a file that is not a board, or has nothing on it, is refused with a reason");
    await fresh({ w:100, d:80, h:60, lid:"screw" });
    R.importKicad(new win.File([KICAD], "panel.kicad_pcb")); for (let i = 0; i < 60 && !(E().customBoards || []).length; i++) await sleep(30); await settle(); await make();
    check(/^kc_/.test(E().board) && E().cut.some(c => c.kind === "usbc" && c.face === "left") && !warnT().length && /Imported: Test panel/.test(page("Board mounts").textContent), "imported: the main board, its USB-C opening on the left wall, listed on Board mounts", E().board);
    { const ms = [...document.querySelectorAll("#panel .field")].find(w => /^Mounted on$/.test((w.querySelector("label") || {}).textContent || "")).querySelector("select"); ms.value = "front"; ms.dispatchEvent(new win.Event("change")); await settle(); await make(); }
    await press(/^Its parts face the wall$/);
    E().boardX = 0; E().boardY = 30; E().standH = 12; MF.rebuild(false); await settle(); await make();
    await press(/^Cut holes for its 2 LEDs, buttons and knobs$/);
    const front = E().cut.filter(c => c.face === "front").map(c => `${c.kind} ${c.u},${c.v}`).join("; ");
    check(front === "led5 11.27,35; tact 3.25,22.75" && !E().cut.some(c => c.auto === "ports") && !I().left.length, "on the front wall facing out: holes for its LED and button in front of them, its floor port opening gone", front);
  }

  console.log("\nthe parts' shapes");
  {
    await fresh({ w:180, d:100, h:50, lid:"screw", board:"uno", boardX:10, boardY:0, more:[{ kind:"relay1", x:-42, y:8, h:3, rot:true }] });
    check(warnT().some(t => /USB-B socket runs into Relay module/.test(t)) && I().ghosts.filter(g => g.kind === "feat").length >= 5, "the Uno's USB-B socket reaches past its edge into the relay: said, and its parts drawn one by one");
    const at = async x => { await fresh({ w:140, d:90, h:80, lid:"screw", board:"pi", boardX:x, boardY:0, standH:5, levels:[{ z:34, t:2, hold:"brackets" }] }); return warnT().filter(t => /wall bracket/.test(t)).length; };
    const low = await at(-20), high = await at(20);
    check(low === 0 && high > 0, "a wall bracket over the Pi's low end is fine; over its USB sockets, it is said", `${low}, ${high}`);
  }

  console.log("\nheat");
  {
    await fresh({ w:120, d:80, h:45, lid:"screw", board:"pi", boardX:-10, more:[{ kind:"buck2596", x:40, y:0, h:3 }] });
    const h = R.heat(E(), I());
    check(Math.abs(h.P - 6.5) < 0.01 && h.status === "vents" && h.needVent > 0 && /About 6.5 W of heat/.test(page("Heat and air").textContent), "a Pi and a buck converter, about 6.5 W: it asks for vents", `${h.sealed.toFixed(1)} W shed closed, ${h.needVent} mm² needed`);
    await press(/^Add a fan instead$/, page("Heat and air"));
    check(R.heat(E(), I()).status === "ok" && E().cut.some(c => c.kind === "fan") && E().cut.some(c => c.kind === "vent"), "Add a fan instead: a fan and a vent, and then it is enough");
    await fresh({ w:180, d:120, h:80, lid:"screw", more:[{ kind:"lrs150", x:0, y:0, h:3, watts:3 }] });
    check(Math.abs(R.heat(E(), I()).P - 3) < 0.01, "a part's watts can be set by hand");
  }

  console.log("\nrecipes");
  {
    for (const kit of R.kits) {
      await fresh({}); const r = R.startKit(kit); MF.rebuild(false); await settle();
      const s = await support();
      check(r.ok && !warnT().length && closed() && E().cut.length >= (kit.name === "Bird house camera" ? 2 : 3) && s < 200, `${kit.name}: builds with no warnings, closed, labelled openings`, `${size().join(" × ")}, ${E().cut.length} openings, ${s.toFixed(0)} mm² support`);
    }
  }

  console.log("\nthe style, and the fit test for the holders");
  {
    for (const st of [{ edge:"chamfer", edgeSize:1.5 }, { edge:"round", edgeSize:2, lidThick:3 }, { texture:"grooves" }, { texture:"hex" }, { band:true, bandZ:20, bandH:8, bandSlot:2 }]) {
      await fresh(Object.assign({ w:120, d:80, h:40, lid:"screw", fasten:"insert", cut:[{ kind:"usbc", face:"front", u:0, v:20, label:"USB-C" }, { kind:"rocker", face:"right", u:0, v:22 }] }, st));
      const s = await support();
      check(closed() && !warnT().length && s === 0 && (!st.band || MF.parts.some(p => /^Band/.test(p.name))), `${JSON.stringify(st)}: closed, no support`, MF.parts.map(p => p.name).join(", "));
    }
    await fresh({ w:120, d:80, h:40, lid:"screw", texture:"hex", cut:[{ kind:"usbc", face:"front", u:0, v:20 }] });
    const vHex = C.signedVolume(MF.parts.find(p => p.name === "Box").solid); E().texture = ""; MF.rebuild(false); await settle();
    check(vHex < C.signedVolume(MF.parts.find(p => p.name === "Box").solid) - 200, "hexagons are cut into the walls");
    await fresh({ test:true, testKind:"holders" });
    const s = await support();
    check(MF.parts.map(p => p.name).join() === "Holder test card,Test tiles" && closed() && s === 0, "the fit test for the holders: a card and its tiles, closed, no support", `${s} mm²`);
  }

  console.log("\na saved project keeps it all");
  {
    await fresh({ w:160, d:120, h:110, lid:"screw", board:"uno", boardX:-30, edge:"chamfer", texture:"hex", band:true,
      more:[{ kind:"lipo906090", x:30, y:-20, strapBy:"loops", watts:1.5 }, { kind:"pi", x:0, y:60, face:"back", side:"out", h:20 }, { kind:"relay1", x:150, y:0 }],
      levels:[{ z:70, t:2, hold:"brackets", bracketWalls:"frontback" }] });
    [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === "Board mounts").click(); await sleep(30);
    await press(/^Add this board's ports$/);
    E().wires = [{ from:"main", fromPin:"", to:E().cut[0].id || (E().cut[0].id = "abc123"), toPin:"", colour:"black" }]; MF.rebuild(false); await settle(); await make();     // (ids are given as the panel is drawn)
    const before = JSON.stringify({ more:E().more.map(m => [m.strapBy, m.face, m.side, m.watts, m.x]), lvl:E().levels.map(l => l.bracketWalls), cut:E().cut.map(c => [c.auto, c.board, c.port, c.id]), w:E().wires, st:[E().edge, E().texture, E().band] });
    await reload();
    const after = JSON.stringify({ more:E().more.map(m => [m.strapBy, m.face, m.side, m.watts, m.x]), lvl:E().levels.map(l => l.bracketWalls), cut:E().cut.map(c => [c.auto, c.board, c.port, c.id]), w:E().wires, st:[E().edge, E().texture, E().band] });
    check(before === after, "strap loops, a module on a wall, its watts, one 150 mm out, front and back brackets, port openings' link to the board, ids, wires, the style: all kept", after);
    // a hostile project
    const s0 = JSON.parse(MF.projectPayload()).state;
    Object.assign(s0.base.enclosure, { boardFace:"ceiling", boardSide:7, edge:"<b>", texture:{}, band:"yes", wires:[{ from:"<script>", to:1e9, fromPin:"<img onerror=x>", colour:"plaid" }, "junk"],
      customBoards:[{ id:"../x", label:"<b>bad</b>", w:1e9, d:-5, holes:[[1e9, "x"], null], ports:[["z9", 1, "nothing"], ["x0", 1e9, "usbc", -4]], panel:"no", tall:1e6 }, "junk"],
      more:[{ kind:"relay1", face:"under", side:"left", watts:-50, id:"???" }] });
    const f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:s0 })], "p.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); await sleep(300); await settle(); await make();
    const e2 = E(), cb = e2.customBoards[0];
    check(e2.boardFace === "" && e2.edge === "" && e2.texture === "" && e2.band === false && e2.wires.length === 1 && e2.wires[0].from === "" && !/[<>]/.test(e2.wires[0].fromPin) && e2.wires[0].colour === "red"
      && e2.customBoards.length === 1 && cb.w === 300 && cb.d === 5 && /^[a-z0-9]{4,10}$/.test(cb.id) && !/[<>]/.test(cb.label) && cb.ports.length === 1 && cb.ports[0][1] <= 5 && cb.tall === 60
      && !("face" in e2.more[0]) && e2.more[0].watts === 0 && /^[a-z0-9]{4,10}$/.test(e2.more[0].id) && closed(), "a hostile project: faces, styles, wires and an imported board cleaned, and it builds", JSON.stringify(cb));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
