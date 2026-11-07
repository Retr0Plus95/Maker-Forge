// Moving things in a project box with the mouse (Session 58): a board on the floor, an extra one on a level, words on the
// front, back and a side, a post you put; what is in front wins; a miss turns the view; the panel's switch.
//
//   node tools-boxdrag-test.js index.html
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
  const fresh = over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const part = (q, re) => q.find(p => re.test(p.name)), vol = p => C.signedVolume(p.solid);
  const T = win.THREE, R = (o, d) => new T.Ray(new T.Vector3(...o), new T.Vector3(...d).normalize());
  const drag = (from, to) => { const h = MF.boxDrag.pick(from); if (!h) return null; MF.boxDrag.start(h); MF.boxDrag.to(to); MF.boxDrag.end(); return h.kind; };
  console.log("boards");
  {
    fresh({ w:160, d:120, h:60, lid:"press", board:"uno", boardX:0, boardY:0, levels:[{ z:30, t:2, hold:"posts", pass:"back" }], more:[{ kind:"relay2", x:-20, y:10, h:3, rot:false, hold:"holes", lvl:1 }] });
    MF.buildEnclosure(); await settle();
    // straight down onto the Uno at (5, 5) on the plan (the box's frame: z is minus the plan's y), then to (25, 15)
    let k = drag(R([5, 25, -5], [0, -1, 0]), R([25, 25, -15], [0, -1, 0])), E = MF.state.base.enclosure;
    check(k === "board" && E.boardX === 20 && E.boardY === 10, "the main board dragged across the floor: it follows the pointer from where it was picked up", `${k}, at ${E.boardX}, ${E.boardY}`);
    MF.buildEnclosure();
    // the relay on level 1, from above the level
    k = drag(R([-20, 100, -10], [0, -1, 0]), R([10, 100, 20], [0, -1, 0])); const m = E.more[0];
    check(k === "board" && m.x === 10 && m.y === -20 && m.lvl === 1, "a board on level 1 dragged on its level", `${k}, at ${m.x}, ${m.y}`);
    MF.buildEnclosure();
    check(MF.boxDrag.pick(R([70, 100, 50], [0, -1, 0])) === null, "a press on nothing picks nothing (the view turns)");
  }
  console.log("\nwords and icons on the walls");
  {
    fresh({ w:120, d:80, h:40, lid:"press", cut:[], art:[{ face:"front", kind:"text", text:"HI", size:8, x:0, y:0, finish:"inlay", slot:2 }, { face:"back", kind:"icon", icon:"power", size:12, x:0, y:0, finish:"engrave" }, { face:"right", kind:"icon", icon:"bolt", size:12, x:0, y:0, finish:"engrave" }] });
    MF.buildEnclosure(); await settle(); const E = MF.state.base.enclosure, Hw = 40;
    let k = drag(R([2, Hw/2 + 1, 300], [0, 0, -1]), R([12, Hw/2 + 6, 300], [0, 0, -1]));
    check(k === "art" && E.art[0].x === 10 && E.art[0].y === 5, "words on the front dragged across it and up", `${k}, at ${E.art[0].x}, ${E.art[0].y}`);
    MF.buildEnclosure();
    k = drag(R([0, Hw/2, -300], [0, 0, 1]), R([-15, Hw/2 - 4, -300], [0, 0, 1]));
    check(k === "art" && E.art[1].x === 15 && E.art[1].y === -4, "an icon on the back: along it as seen from behind", `${k}, at ${E.art[1].x}, ${E.art[1].y}`);
    MF.buildEnclosure();
    k = drag(R([300, Hw/2, 0], [-1, 0, 0]), R([300, Hw/2 + 3, -8], [-1, 0, 0]));
    check(k === "art" && E.art[2].x === 8 && E.art[2].y === 3 && closed(MF.buildEnclosure()), "an icon on the right side, seen from the right", `${k}, at ${E.art[2].x}, ${E.art[2].y}`);
    check(MF.boxDrag.pick(R([0, Hw/2, -300], [0, 0, -1])) === null, "words seen from inside the box (behind the wall) aren't picked");
  }
  console.log("\nposts you put, and what is in front");
  {
    fresh({ w:140, d:100, h:70, lid:"press", levels:[{ z:35, t:2, hold:"custom", pass:"none", at:[{ x:20, y:-15 }, { x:-20, y:-15 }, { x:0, y:25 }] }], board:"nano", boardX:-40, boardY:20 });
    MF.buildEnclosure(); await settle(); const E = MF.state.base.enclosure;
    const k = drag(R([20, 100, 15], [0, -1, 0]), R([30, 100, 5], [0, -1, 0])), q = MF.buildEnclosure();
    check(k === "post" && E.levels[0].at[0].x === 30 && E.levels[0].at[0].y === -5 && MF.enclosure.levels[0].posts[0][0] === 30 && closed(q), "a post you put dragged to a new place, and built there", `${k}, at ${E.levels[0].at[0].x}, ${E.levels[0].at[0].y}`);
    fresh({ w:120, d:80, h:40, lid:"press", cut:[], board:"uno", boardX:0, boardY:-5, art:[{ face:"front", kind:"text", text:"FRONT", size:8, x:0, y:0, finish:"inlay", slot:2 }] }); MF.buildEnclosure();
    const h = MF.boxDrag.pick(R([0, 20, 300], [0, 0, -1]));
    check(h && h.kind === "art", "looking at the front, the words on it come before the board behind the wall", h && h.kind);
  }
  console.log("\nthe panel");
  {
    fresh({ w:120, d:80, h:40, lid:"press", board:"uno" }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    check(/Move things with the mouse in the 3D view/.test(document.querySelector("#panel").textContent), "the switch is on the Board mounts page");
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
