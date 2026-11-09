// Project boxes, v0.56 (Session 65): battery life, nut pockets, a printed TPU gasket, rain hoods, a breather, a solar panel on the
// lid, a tripod nut and magnets under the floor, scales round knobs, an ESPHome / Arduino starter from the wiring, printed
// plungers and light pipes, clear windows, a flexing lid button, drilling templates and face drawings, boards from Eagle and
// EasyEDA, and your own parts library; each part closed, the box without support, saved and opened again, a hostile project.
//   node tools-boxplus-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const EAGLE = `<?xml version="1.0" encoding="utf-8"?>
<eagle version="9.6.2"><drawing><board><description>Sensor node</description><plain>
<wire x1="0" y1="0" x2="60" y2="0" width="0" layer="20"/><wire x1="60" y1="0" x2="60" y2="40" width="0" layer="20"/>
<wire x1="60" y1="40" x2="0" y2="40" width="0" layer="20"/><wire x1="0" y1="40" x2="0" y2="0" width="0" layer="20"/>
<hole x="3.5" y="3.5" drill="3.2"/><hole x="56.5" y="3.5" drill="3.2"/><hole x="3.5" y="36.5" drill="3.2"/><hole x="56.5" y="36.5" drill="3.2"/></plain>
<libraries><library name="con"><packages>
<package name="USB-C-SMD"><smd name="1" x="-3" y="0" dx="0.6" dy="1.2" layer="1"/><smd name="2" x="3" y="0" dx="0.6" dy="1.2" layer="1"/>
<wire x1="-4.5" y1="-3.5" x2="4.5" y2="-3.5" width="0.1" layer="21"/><wire x1="-4.5" y1="3.5" x2="4.5" y2="3.5" width="0.1" layer="21"/></package>
<package name="LED-5MM"><pad name="A" x="-1.27" y="0" drill="0.9"/><pad name="K" x="1.27" y="0" drill="0.9"/></package>
</packages></library></libraries>
<elements><element name="J1" library="con" package="USB-C-SMD" value="USB" x="3" y="20" rot="R90"/><element name="D1" library="con" package="LED-5MM" value="LED" x="40" y="25"/></elements>
</board></drawing></eagle>`;
const EASYEDA = JSON.stringify({ head:{ docType:"3", c_para:{ name:"Weather node" } }, shape:["TRACK~1~10~~400 300 636.22 300 636.22 457.48 400 457.48 400 300~gge1~0",
  "HOLE~413.78~313.78~6.3~gge2~0", "HOLE~622.44~313.78~6.3~gge3~0", "HOLE~413.78~443.7~6.3~gge4~0", "HOLE~622.44~443.7~6.3~gge5~0",
  "LIB~404~380~package`TYPE-C-31-M-12`pre`USB1`~90~~gge6~1~~0#@$PAD~RECT~404~374~2~5~1~~1~0~~90~gge7~0#@$PAD~RECT~404~386~2~5~1~~2~0~~90~gge8~0",
  "LIB~560~400~package`SW-TH_4P-L6.0-W6.0-P4.50-LS6.5`pre`SW1`~0~~gge9~1~~0#@$PAD~ELLIPSE~555~395~6~6~11~~1~1.6~~0~gge10~0#@$PAD~ELLIPSE~565~405~6~6~11~~2~1.6~~0~gge11~0"] });
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
  const E = () => MF.state.base.enclosure, I = () => MF.enclosure;
  const make = async () => { [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50); };
  const fresh = async over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); MF.rebuild(false); await settle(); await make(); };
  const closed = () => MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const vol = name => { const p = MF.parts.find(q => q.name === name); return p ? C.signedVolume(p.solid) : 0; };
  const support = async () => { MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? Math.round(MF.print.overhang.area*10)/10 : -1; };
  const warnT = () => I().warn.map(w => w.t);
  const page = title => { const b = [...document.querySelectorAll("#secrail button")].find(b => b.dataset.title === title); if (b) b.click(); return !!b; };
  const press = async re => { const b = [...document.querySelectorAll("#panel button")].find(b => re.test(b.textContent)); if (!b) { check(false, `a button ${re}`); return; } b.click(); await settle(); await sleep(30); };
  const reload = async () => { const s0 = JSON.parse(MF.projectPayload()).state, f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:s0 })], "p.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };

  console.log("battery life");
  {
    MF.boxRoom.startKit(MF.boxRoom.kits.find(k => k.name === "Bird house battery and motion sensor")); MF.rebuild(false); await settle(); await make();
    const b = R.battery(E(), I());
    check(b && Math.abs(b.wh - 29.6) < 0.01 && b.days > 20 && b.days < 40 && b.wake, "the bird house battery box: about a month on the 126090 (29.6 Wh), the camera box waking on motion", b && `${b.days.toFixed(1)} days, ${b.perDay.toFixed(2)} Wh a day`);
    check(page("Battery life") && [...document.querySelectorAll("#panel .hint")].some(n => /about \d+ days on LiPo pouch 126090/.test(n.textContent)), "the Battery life page says so");
    E().power.mode = "on"; const on = R.battery(E(), I());
    check(on.days < b.days/5, "always on, much shorter", `${on.days.toFixed(1)} days`);
    check(R.batteryWh("bat18650x2", null) === 21.6 && R.batteryWh("rc3s2200", { label:"RC LiPo pack 3S 2200 mAh" }) > 24 && R.batteryWh("aax4", null) === 12, "batteries' energy from their cells", [R.batteryWh("bat18650x2"), R.batteryWh("rc3s2200", { label:"RC LiPo pack 3S 2200 mAh" }).toFixed(1), R.batteryWh("aax4")].join(", "));
    E().more.find(m => /^lipo/.test(m.kind)).wh = 10; const typed = R.battery(E(), I());
    check(Math.abs(typed.wh - 10) < 1e-9, "a battery's energy can be typed");
  }

  console.log("\nnut pockets, a printed gasket");
  {
    await fresh({ w:100, d:70, h:35, fasten:"insert" }); const vIns = vol("Box");
    await fresh({ w:100, d:70, h:35, fasten:"nut" }); const s = await support();
    check(closed() && s < 3 && /pocket for an M3 nut/.test(I().fastenText) && vol("Box") > vIns, "nut pockets: closed, no support (their roofs step in at 45°), the posts thicker for the nut", `${s} mm², ${I().fastenText}`);
    check(I().need.some(([n, t]) => /hex nuts/.test(t)) && R.assembly().some(t => /Slide an M3 nut/.test(t)), "What you'll need lists the nuts, and the steps say where they go");
    await fresh({ w:100, d:70, h:35, wall:3, gasket:1.5, gasketPrint:true }); const s2 = await support();
    const gk = MF.parts.find(p => p.name === "Gasket (TPU)");
    check(gk && closed() && s2 < 3 && I().gasket.printed && Math.abs(I().gasket.printed.h - (I().gasket.depth + 0.75)) < 0.01, "a gasket to print in TPU: a ring the cord's width, half the cord proud of its groove", gk && `${vol("Gasket (TPU)").toFixed(0)} mm³`);
    check(!I().need.some(([n, t]) => /cord/.test(t)), "no cord to buy then");
  }

  console.log("\noutdoors");
  {
    await fresh({ w:120, d:90, h:40, wall:3, cut:[{ kind:"gland", face:"back", u:0, v:15, dia:12.6 }, { kind:"usbc", face:"front", u:-20, v:12 }, { kind:"pirmini", face:"left", u:0, v:18, dia:10.4 }] });
    page("Outdoors"); await press(/^Round holes that seal/); await press(/^Rain hoods over/); await press(/^Add a breather vent/);
    const s = await support();
    check(E().teardrop === "flat" && I().hoods.length === 3 && E().cut.some(c => c.kind === "breather") && closed() && s < 3, "round holes that seal, hoods over the three wall openings, a breather: closed, no support", `${s} mm², ${I().hoods.length} hoods`);
    const vH = vol("Box"); E().cut.forEach(c => { c.hood = false; }); MF.rebuild(false); await settle();
    check(vH > vol("Box") + 100, "the hoods are on the box", `${(vH - vol("Box")).toFixed(0)} mm³`);
    E().solar = "110x60"; MF.rebuild(false); await settle(); const s3 = await support();
    check(I().solar && I().solar.fits && closed() && s3 < 3, "a solar panel's outline and its cable hole in the lid: no support (a pocket would face the bed)", `${s3} mm²`);
    E().solar = "165x135"; MF.rebuild(false); await settle();
    check(warnT().includes("Solar panel bigger than the lid"), "a panel bigger than the lid says so");
  }

  console.log("\nmounts: a tripod nut, magnets");
  {
    await fresh({ w:100, d:70, h:35, mount:"tripod" }); const s = await support();
    check(closed() && s < 3 && I().tripod && /tripod nut/.test(I().mount.join(" ")), "a 1/4-inch tripod nut in a boss: closed, no support", `${s} mm²`);
    E().board = "uno"; E().boardX = 0; E().boardY = 0; MF.rebuild(false); await settle();
    check(warnT().some(t => /is over the tripod nut/.test(t)), "a board over its boss says so");
    await fresh({ w:100, d:70, h:35, mount:"magnets", floor:3.8 }); const vM = vol("Box"), s2 = await support();
    check(closed() && s2 < 3 && !warnT().length, "four 8 × 3 mm magnet pockets under the floor: no support", `${s2} mm²`);
    E().floor = 2; MF.rebuild(false); await settle();
    check(warnT().includes("Floor too thin for the magnets"), "a floor too thin for them says so");
  }

  console.log("\nknob scales, the firmware starter");
  {
    await fresh({ w:120, d:80, h:45, cut:[{ kind:"pot", face:"front", u:-25, v:22, dia:7.3 }, { kind:"encoder", face:"top", u:20, v:0, dia:7.3, knob:24 }] });
    const v0 = vol("Box"), l0 = vol("Lid");
    E().cut.forEach(c => { c.dial = "0-10"; }); MF.rebuild(false); await settle();
    check(vol("Box") < v0 - 0.5 && vol("Lid") < l0 - 0.5 && !warnT().length && closed(), "a 0-to-10 scale cut round a knob on a wall and on the lid", `${(v0 - vol("Box")).toFixed(1)}, ${(l0 - vol("Lid")).toFixed(1)} mm³`);
    E().cut[0].knob = 60; MF.rebuild(false); await settle();
    check(warnT().some(t => /Scale round opening 1 left out/.test(t)), "a scale with no room is left out, with a word");
    await fresh({ w:140, d:100, h:50, board:"esp32cam", boardHold:"edges", more:[{ kind:"relay1", id:"rel001", x:40, y:20, h:3 }],
      cut:[{ kind:"pirmini", face:"front", u:-20, v:20, id:"pir001" }, { kind:"led5", face:"front", u:20, v:20, id:"led001" }],
      wires:[{ from:"main", fromPin:"GPIO13", to:"pir001", toPin:"OUT", colour:"yellow" }, { from:"main", fromPin:"12", to:"rel001", toPin:"IN1", colour:"green" }, { from:"main", fromPin:"GPIO4", to:"led001", toPin:"+", colour:"red" }, { from:"main", fromPin:"GND", to:"rel001", toPin:"GND", colour:"black" }] });
    const fw = R.firmware(E(), I(), "Bird cam"), y = fw.text.join("\n");
    check(fw.file === "esphome.yaml" && /board: esp32cam/.test(y) && /esp32_camera:/.test(y) && /pin: GPIO12/.test(y) && /device_class: motion/.test(y) && /platform: binary/.test(y) && !/GND/.test(y.replace(/#.*$/gm, "")),
      "an ESPHome starter: the ESP32-CAM's camera, the relay as a switch, the motion sensor, the LED, no GND", `${fw.text.length} lines`);
    E().board = "uno"; MF.rebuild(false); await settle(); const ar = R.firmware(E(), I(), "Bird cam").text.join("\n");
    check(/#define MINI_MOTION_SENSOR_PIN 13/.test(ar) && /#define RELAY_MODULE_1_CHANNEL_PIN 12/.test(ar) && !/GND/.test(ar.split("\n").slice(1).join("\n")), "for an Uno, the pins as #defines", ar.split("\n")[2]);
  }

  console.log("\nplungers, light pipes, clear windows, a flexing button");
  {
    MF.state.slots.push({ hex:"#e8f4f8", name:"Clear PETG", mat:"PETG", price:25 }); const clearK = MF.state.slots.length - 1;
    const cuts = [{ kind:"tact", face:"top", u:-20, v:0, dia:4, plunger:true, reach:6 }, { kind:"tact", face:"front", u:-20, v:15, dia:4, plunger:true },
      { kind:"lightpipe", face:"top", u:20, v:0, dia:3.2, pipe:true, reach:8 }, { kind:"led5", face:"front", u:20, v:15, dia:5.2, window:true }, { kind:"oled", face:"top", u:0, v:-18, window:true }];
    await fresh({ w:100, d:70, h:35, cut:cuts.map(c => Object.assign({}, c, { plunger:false, pipe:false, window:false })) }); const s0 = await support();
    await fresh({ w:100, d:70, h:35, cut:cuts });
    const s = (await support()) - s0, pl = MF.parts.find(p => /^Button plungers/.test(p.name)), lp = MF.parts.find(p => /^Light pipe/.test(p.name));
    const ww = MF.parts.find(p => p.name === "Windows (clear)"), lw = MF.parts.find(p => p.name === "Lid windows (clear)");
    check(pl && lp && ww && lw && closed() && s < 3, "two plungers, a light pipe, a window in the front and one in the lid: closed, no support of their own", `${s.toFixed(1)} mm² more than the holes alone`);
    check(lp.slot === clearK && ww.slot === clearK && lw.slot === clearK, "the light pipe and the windows in the clear filament", [lp.slot, ww.slot, lw.slot].join(","));
    check(I().extras.plungers.length === 2 && I().extras.plungers[0].len > 6 && I().extras.pipes[0].len > 8, "their lengths: the reach and the wall", JSON.stringify(I().extras.plungers));
    MF.state.slots.pop();
    await fresh({ w:100, d:70, h:35, lidThick:2, cut:[MF.newOpening("flexbtn", "top")] }); const l0 = vol("Lid"), s2 = await support();
    check(closed() && s2 < 3 && !warnT().length && l0 > 0, "a flexing button in the lid: its slot and nub, closed, no support", `${s2} mm²`);
  }

  console.log("\ntemplates and drawings");
  {
    await fresh({ w:120, d:80, h:45, teardrop:true, cut:[{ kind:"usbc", face:"front", u:-30, v:12, w:9.2, h:3.4, r:1.6, label:"USB-C" }, { kind:"gland", face:"back", u:0, v:20, dia:12.6 }, { kind:"led5", face:"top", u:30, v:20, dia:5.2 }] });
    const svg = R.faceSVG(E(), I(), "Test"), dxf = R.faceDXF(E(), I()), F = R.faceDrawings(E(), I());
    check(/width="\d+(\.\d+)?mm"/.test(svg) && /USB-C: 30 from left, 12 from bottom/.test(svg) && /Cable gland PG7: 60 from left, 20 from bottom/.test(svg) && /LED: 90 from left, 60 from front/.test(svg) && /50 mm/.test(svg),
      "drilling templates at true size, with each opening's distances and a 50 mm bar", `${svg.length} characters`);
    const gl = F.find(f => f.face === "back").holes[0].rings[0], ys = gl.map(p => p[1]), top = Math.max(...ys);
    check(Math.abs(top - (20 + 6.5)) < 0.2, "a hole drawn as it is cut (round, no pointed top), with its clearance", top.toFixed(2));
    check((dxf.match(/POLYLINE/g) || []).length === 6 + 3 && /\$INSUNITS/.test(dxf), "the faces as a DXF: six outlines and three openings", (dxf.match(/POLYLINE/g) || []).length);
  }

  console.log("\nboards from Eagle and EasyEDA, your own parts");
  {
    const eg = R.boardFile(EAGLE), ez = R.boardFile(EASYEDA), bad = R.boardFile("hello");
    check(eg.ok && eg.board.w === 60 && eg.board.d === 40 && eg.board.holes.length === 4 && eg.board.ports.some(q => q[2] === "usbc" && q[0] === "x0") && eg.board.panel.some(q => q[2] === "led5"), "an Eagle board: its outline, four holes, the USB-C at its left edge, the LED", JSON.stringify(eg.board).slice(0, 120));
    check(ez.ok && ez.board.w === 60 && ez.board.d === 40 && ez.board.holes.length === 4 && ez.board.ports.some(q => q[2] === "usbc") && ez.board.panel.some(q => q[2] === "tact"), "an EasyEDA board: the same, and its button", JSON.stringify(ez.board).slice(0, 120));
    check(!bad.ok && /KiCad .kicad_pcb, an Eagle .brd or an EasyEDA/.test(bad.why), "anything else is turned away with a word");
    await fresh({ w:120, d:90, h:40 });
    const key = R.addCustomBoard(E(), eg.board); MF.rebuild(false); await settle(); await make();
    check(E().board === key && E().cut.some(c => c.kind === "usbc" && c.auto === "ports") && closed(), "it goes in as the main board, its USB-C through the wall", key);
    win.localStorage.removeItem("makerforge.parts");
    page("Board mounts"); await press(/^Save “Sensor node” to my parts$/);
    check(R.myParts().length === 1 && R.myParts()[0].label === "Sensor node", "saved to your parts (this browser)");
    await fresh({ w:120, d:90, h:40, board:"uno" }); page("Board mounts");
    await press(/^Add it from my parts$/);
    check(E().more.some(m => /^kc_/.test(m.kind)) && E().customBoards.length === 1 && closed(), "added from your parts to another project, which keeps a copy", JSON.stringify(E().more.map(m => m.kind)));
    E().board = "custom"; E().bw = 70; E().bd = 50; E().bsx = 60; E().bsy = 40; MF.rebuild(false); await settle(); await make(); page("Board mounts");
    await press(/^Save my measured board to my parts$/);
    const mb = R.myParts().find(q => /^My board 70 × 50/.test(q.label));
    check(mb && mb.holes.length === 4 && mb.holes[0][0] === 5 && mb.holes[0][1] === 5, "your measured board saved too, its holes from their spacing", mb && JSON.stringify(mb.holes));
    await press(/^Remove it from my parts$/);
    check(R.myParts().length === 1, "and taken out again");
    win.localStorage.removeItem("makerforge.parts");
    // a board measured from a photo: a 60 × 40 board at 10 px/mm, its corners clicked, its four holes and a USB-C at the left edge
    const m = { a:[100, 500], b:[700, 100], w:60, d:40, holes:[[135, 465], [665, 465], [135, 135], [665, 135]], ports:[[102, 300, "usbc"]], screw:"M3", label:"Photo test" };
    const pb = R.boardFromPhoto(m);
    check(pb && pb.w === 60 && pb.d === 40 && JSON.stringify(pb.holes) === "[[3.5,3.5],[56.5,3.5],[3.5,36.5],[56.5,36.5]]" && JSON.stringify(pb.ports) === '[["x0",20,"usbc",1.6]]', "a board from a photo: its holes and port in mm, from the clicks", JSON.stringify(pb));
    await fresh({ w:120, d:90, h:40 }); R.openPhotoBoard(); await sleep(50);
    Object.assign(R.openPhotoBoard.m, m); [...document.querySelectorAll("#modal button")].find(b => b.textContent === "Make the board").click(); await settle();
    check(/^kc_/.test(E().board) && E().customBoards[0].label === "Photo test" && document.querySelector("#modal").hidden && closed(), "Make the board puts it in the box", E().board);
  }

  console.log("\nsaved and opened again; a hostile project");
  {
    await fresh({ w:140, d:100, h:50, wall:3, gasket:1.5, gasketPrint:true, gasketSlot:1, fasten:"nut", mount:"magnets", mountMagnet:"6x2", floor:3, solar:"custom", solarW:70, solarD:50, solarX:5, solarY:-5, teardrop:"flat",
      boardWh:5, boardSleepMw:3, power:{ mode:"wake", wakes:12, secs:20, extW:0.5, extSleepMw:4, eff:90 },
      more:[{ kind:"lipo906090", x:0, y:0, wh:18, sleepMw:0.2 }],
      cut:[{ kind:"pot", face:"front", u:-25, v:22, dia:7.3, dial:"minmax", knob:22, hood:true }, { kind:"tact", face:"top", u:-20, v:10, dia:4, plunger:true, reach:7 }, { kind:"led5", face:"top", u:20, v:10, dia:5.2, window:true }] });
    await reload(); const A = JSON.parse(JSON.stringify(E())); await reload(); const B = JSON.parse(JSON.stringify(E()));
    const want = { gasketPrint:true, gasketSlot:1, fasten:"nut", mount:"magnets", mountMagnet:"6x2", solar:"custom", solarW:70, solarD:50, solarX:5, solarY:-5, teardrop:"flat", boardWh:5, boardSleepMw:3,
      power:{ mode:"wake", wakes:12, secs:20, extW:0.5, extSleepMw:4, eff:90 } }, lost = Object.keys(want).filter(k => JSON.stringify(A[k]) !== JSON.stringify(want[k]));
    const c0 = A.cut[0], c1 = A.cut[1], c2 = A.cut[2], m0 = A.more[0];
    check(!lost.length && JSON.stringify(A) === JSON.stringify(B) && c0.dial === "minmax" && c0.knob === 22 && c0.hood === true && c1.plunger === true && c1.reach === 7 && c2.window === true && m0.wh === 18 && m0.sleepMw === 0.2,
      "every new setting comes back from a saved project, and again", lost.map(k => `${k}: ${JSON.stringify(A[k])}`).join("; "));
    const st = JSON.parse(MF.projectPayload()).state;
    Object.assign(st.base.enclosure, { fasten:"<b>", mount:"rocket", mountMagnet:"huge", gasketPrint:"yes", gasketSlot:99, solar:"999x999", solarW:-5, solarX:1e9, teardrop:"sharp",
      power:{ mode:"warp", wakes:1e9, secs:-1, extW:"x", eff:500, junk:1 }, boardWh:-3, boardSleepMw:"q",
      cut:[{ kind:"pot", face:"front", u:0, v:20, dial:"<script>", knob:1e6, hood:"yes", plunger:1, reach:-50, window:"y" }] });
    st.base.enclosure.more = [{ kind:"lipo906090", x:0, y:0, wh:1e9, sleepMw:-4 }];
    const f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "h.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const H = E(), c = H.cut[0], m = H.more[0];
    check(H.fasten === "insert" && H.mount === "none" && H.mountMagnet === "8x3" && H.gasketPrint === false && H.gasketSlot === undefined && H.solar === "" && H.teardrop === true || H.teardrop === false,
      "hostile settings: back to safe ones", JSON.stringify({ f:H.fasten, m:H.mount, mm:H.mountMagnet, g:H.gasketPrint, s:H.solar, t:H.teardrop }));
    check(JSON.stringify(H.power) === JSON.stringify({ wakes:1440, secs:1, eff:100 }) && H.boardWh === 0 && H.boardSleepMw === undefined && m.wh === 5000 && m.sleepMw === 0,
      "the power schedule and the batteries' numbers clamped, junk dropped", JSON.stringify({ p:H.power, wh:m.wh, mw:m.sleepMw }));
    check(c.dial === undefined && c.knob === 60 && c.hood === undefined && c.plunger === undefined && c.reach === 0.5 && c.window === undefined && closed(), "an opening's new settings clamped, junk dropped, and it builds", JSON.stringify(c));
  }

  check(env.errors.length === e0, "no page errors", env.errors.slice(e0).join(" | "));
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
