// A gasket groove and a battery door (Session 57): the groove in the lid over the middle of the walls (its size, what stops
// it); a battery over an opening in the floor on a door screwed on from below (the recess, the posts, the door, when not); support; a hostile project; the panel.
//
//   node tools-sealdoor-test.js index.html
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
  const solidAt = (p, x, y, z) => { const P = p.solid.pos, I = p.solid.idx; let n = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
    const wx = (x0 + x1) / 2 + x + 0.0123, wz = (z0 + z1) / 2 - y + 0.0071;          // (off the triangles' shared edges)
    for (let t = 0; t < I.length; t += 3) { const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
      const ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2], d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) continue;
      const l1 = ((bz - cz) * (wx - cx) + (cx - bx) * (wz - cz)) / d, l2 = ((cz - az) * (wx - cx) + (ax - cx) * (wz - cz)) / d, l3 = 1 - l1 - l2; if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      if (l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1] > z) n++; }
    return n % 2 === 1; };
  const support = async over => { fresh(over); MF.rebuild(false); await settle(); MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  console.log("a gasket groove");
  {
    const base = { w:120, d:80, h:40, wall:3.6, lid:"screw", cut:[] };
    fresh(base); const plain = MF.buildEnclosure();
    fresh(Object.assign({ gasket:2 }, base)); const q = MF.buildEnclosure(), I = MF.enclosure, G = I.gasket;
    const dL = vol(part(plain, /^Lid$/)) - vol(part(q, /^Lid$/)), want = G ? G.length*G.width*G.depth : 0;
    check(G && G.cord === 2 && Math.abs(G.width - 2.3) < 1e-6 && Math.abs(G.depth - 1.4) < 1e-6 && Math.abs(dL - want) < want*0.04 && closed(q) && !I.warn.length && Math.abs(vol(part(q, /^Box$/)) - vol(part(plain, /^Box$/))) < 0.01,
      "a 2 mm cord's groove: 2.3 mm wide, 1.4 mm deep, round the lid's inside face over the walls (the box unchanged)", G && `${dL.toFixed(0)} mm³ out of the lid, ${want.toFixed(0)} expected, ${G.length} mm long`);
    check(MF.enclosure.need.some(([n, w]) => /cord, 2 mm thick, \d+ mm long/.test(w)), "What you'll need lists the cord");
    fresh(Object.assign({ gasket:2 }, base, { lid:"magnet", lidThick:3.2 })); const qm = MF.buildEnclosure();
    check(MF.enclosure.gasket && closed(qm) && !MF.enclosure.warn.length, "a magnet lid takes one too");
    const why = o => { fresh(Object.assign({ gasket:2 }, base, o)); MF.buildEnclosure(); return !MF.enclosure.gasket && MF.enclosure.warn.some(w => /No gasket groove/.test(w.t)); };
    check(why({ wall:2 }) && why({ lid:"press" }) && why({ lidThick:1.6 }), "thin walls, a press-fit lid and a thin lid get none, and say why");
    const s0 = await support(Object.assign({ gasket:2 }, base));
    check(s0 === 0, "the groove needs no support (it faces up as the lid prints)", `${s0} mm²`);
  }
  console.log("\na battery under a door");
  {
    const base = { w:120, d:100, h:40, lid:"press", cut:[], board:"aax4flat", boardHold:"door", boardX:0, boardY:0 };
    fresh(base); const q = MF.buildEnclosure(), I = MF.enclosure, box = part(q, /^Box$/), door = part(q, /^Battery door/), b = I.boards[0];
    // the holder: 58 × 63, its ends front and back; the door's recess 9.5 mm past the opening at the ends, 3.5 at the sides
    const dt = 1.2, endY = 31.5 + 0.6 + 4, sideX = 29 + 0.6 + 1.5;
    check(door && closed(q) && !I.warn.length && b.hold === "door" && Math.abs(b.base - dt) < 1e-6, "the battery rests on the door, 1.2 mm up from the bed", `${b.hold}, from ${b.base} mm`);
    check(!solidAt(box, 0, 0, 1) && !solidAt(box, 12, endY, 0.6) && solidAt(box, 12, endY, 1.7) && !solidAt(box, sideX, 0, 0.6) && solidAt(box, sideX, 0, 1.7) && solidAt(box, 0, 31.5 + 5.5 + 2, 4),
      "an opening under it, a recess round that for the door to sit flush, a ledge over the recess, a post at each end for the screws");
    const db = C.solidBounds(door.solid);
    check(Math.abs((db.mx[0] - db.mn[0]) - (58 + 1.2 + 7 - 0.5)) < 0.05 && Math.abs((db.mx[2] - db.mn[2]) - (63 + 1.2 + 19 - 0.5)) < 0.05 && Math.abs((db.mx[1] - db.mn[1]) - (dt - 0.1)) < 0.01,
      "the door: 0.25 mm smaller than its recess all round, 1.1 mm thick, printed flat", `${(db.mx[0] - db.mn[0]).toFixed(1)} × ${(db.mx[2] - db.mn[2]).toFixed(1)} × ${(db.mx[1] - db.mn[1]).toFixed(2)} mm`);
    check(MF.enclosure.need.some(([n, w]) => n === 2 && /M2 self-tapping screws, 6 mm long, for the battery doors/.test(w)), "What you'll need lists its two M2 screws");
    const fall = o => { fresh(Object.assign({}, base, o)); MF.buildEnclosure(); return MF.enclosure.boards[0].hold === "strap" && MF.enclosure.warn.some(w => /no door/.test(w.t)); };
    check(fall({ d:86 }) && fall({ floor:1.2 }), "a door that would reach the walls, or a floor under 1.6 mm, means a strap tray instead, and says why");
    fresh({ w:120, d:100, h:60, lid:"press", cut:[], levels:[{ z:30, t:2, hold:"posts", pass:"back" }], more:[{ kind:"lipo603450", x:0, y:0, h:3, rot:false, hold:"door", lvl:1 }] }); MF.buildEnclosure();
    check(MF.enclosure.boards[0].hold === "strap" && MF.enclosure.warn.some(w => /on a level/.test(w.s)), "on a level it is in a strap tray instead");
    const s1 = await support(base);
    check(s1 === 0, "the door, its recess and posts need no support", `${s1} mm²`);
  }
  console.log("\na hostile project and the panel");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { gasket:7, boardHold:"<x>", more:[{ kind:"lipo603450", x:0, y:0, hold:"door" }, { kind:"lipo603450", x:0, y:0, hold:"melt" }] });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E2 = MF.state.base.enclosure;
    check(E2.gasket === 0 && E2.boardHold === "holes" && E2.more[0].hold === "door" && E2.more[1].hold === "holes", "a hostile project: only the cords listed, only the holds there are");
    fresh({ w:120, d:100, h:40, lid:"screw", wall:3.6, cut:[], board:"aax4flat" }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    const txt = document.querySelector("#panel").textContent;
    check(/Under a door/.test(txt) && /Gasket groove/.test(txt), "the panel: Under a door for a battery, the gasket groove on the Lid page");
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
