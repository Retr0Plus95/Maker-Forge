// The inside of a project box (Session 46): levels (a second floor on posts or ledges, boards on it), dividers in grooves
// with a fan, the see-through parts and the checks they make (parts reaching the lid or a level, ports with no opening),
// the plates when it all does not fit one bed, and a hostile project file.
//   node tools-inside-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
function insideMesh(s, p) {
  const P = s.pos, I = s.idx, d = [1, 1e-3, 2e-3]; let n = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]], det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const f = 1 / det, sv = [p[0] - P[a], p[1] - P[a + 1], p[2] - P[a + 2]], u = f * (sv[0] * h[0] + sv[1] * h[1] + sv[2] * h[2]);
    if (u < 0 || u > 1) continue;
    const q = [sv[1] * e1[2] - sv[2] * e1[1], sv[2] * e1[0] - sv[0] * e1[2], sv[0] * e1[1] - sv[1] * e1[0]], v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]);
    if (v < 0 || u + v > 1) continue;
    if (f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) > 1e-9) n++;
  }
  return n % 2 === 1;
}
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
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle();
  MF.examples.drop(); await settle();
  const fresh = over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount: "none", cut: [] }, over || {}); };
  const direct = over => { fresh(over); return MF.buildEnclosure(); };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid), b = C.solidBounds(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0 && b.mn[1] > -1e-3; });
  const supportOf = async () => { await MF.printNow(); for (let i = 0; i < 200 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const fl = 2;

  console.log("a level on four posts");
  {
    const q = direct({ w: 160, d: 120, h: 90, lid: "screw", levels: [{ z: 45, t: 2, hold: "posts", cable: true }] }), I = MF.enclosure;
    const box = q.find(p => p.name === "Box").solid, lvl = q.find(p => p.name === "Level 1");
    const lb = lvl && C.solidBounds(lvl.solid), iw = 160 - 4, id = 120 - 4;
    // a post stands from the floor to the plate's underside, 7 mm in from its sides
    const px = iw / 2 - 0.4 - 7, postIn = insideMesh(box, [px, fl + 20, 0 + 0]) || true;
    check(closed(q) && lvl && near(lb.size[1], 2, 1e-3) && near(lb.size[0], iw - 0.8, 0.01) && I.levels.length === 1, "a closed plate 2 mm thick, 0.4 mm smaller all round than the inside, printed flat beside the box", lvl && `${lb.size[0].toFixed(1)} × ${lb.size[2].toFixed(1)} × ${lb.size[1].toFixed(1)} mm`);
    // the posts: solid at their middles up to the plate's underside, with a pilot hole down their centre
    const y = id / 2 - 0.4 - 14, posts = [[-px, y], [px, y], [-px, -y], [px, -y]], z = fl + 45 - 2 - 1;
    const solid = posts.every(([x, yy]) => insideMesh(box, [x + 2.6, z, -yy])), hollow = posts.every(([x, yy]) => !insideMesh(box, [x, z, -yy]));
    check(solid && hollow, "four posts up to the plate's underside, each with a pilot hole for an M3 screw", `${posts.length} posts`);
    // the plate's clearance holes over them, and the cable slot at the back
    const lh = posts.every(([x, yy]) => !insideMesh(lvl.solid, [x + lb.mn[0] + lb.size[0] / 2 - 0, 1, -yy + (lb.mn[2] + lb.size[2] / 2)]));
    check(lh, "the plate has a clearance hole over each post");
    check((await (async () => { fresh({ w: 160, d: 120, h: 90, levels: [{ z: 45, t: 2, hold: "posts" }] }); MF.rebuild(false); await settle(); return supportOf(); })()) < 3, "no support needed (the posts are upright, the plate prints flat)");
  }

  console.log("\na level on ledges, with air slots");
  {
    const q = direct({ w: 160, d: 120, h: 90, lid: "screw", levels: [{ z: 45, t: 2, hold: "ledges", vent: true }] }), box = q.find(p => p.name === "Box").solid;
    const iw = 156, zb = fl + 43;
    // just under the plate the ledge reaches 3 mm out from the wall; 3.75 mm lower it is a sliver (0.2 mm out per 0.25 up)
    const at = (inset, z) => insideMesh(box, [iw / 2 - inset, z, 0]);
    check(closed(q) && at(2.7, zb - 0.1) && !at(2.7, zb - 3.6) && at(0.1, zb - 3.6), "a ledge along each side wall, 3 mm out under the plate, sloping back to the wall", `${at(2.7, zb - 0.1)} / ${!at(2.7, zb - 3.6)} / ${at(0.1, zb - 3.6)}`);
    fresh({ w: 160, d: 120, h: 90, levels: [{ z: 45, t: 2, hold: "ledges" }] }); MF.rebuild(false); await settle();
    check((await supportOf()) < 3, "the ledges need no support");
  }

  console.log("\nboards on a level, and the checks");
  {
    const q = direct({ w: 200, d: 150, h: 150, board: "uno", boardX: -50, boardY: -30, levels: [{ z: 100, t: 2 }], more: [{ kind: "relay2", x: -40, y: 30, h: 3, lvl: 1 }, { kind: "esp32devkit", x: -40, y: -25, h: 3, lvl: 1 }] }), I = MF.enclosure;
    const relay = I.boards.find(b => b.key === "relay2"), esp = I.boards.find(b => b.key === "esp32devkit");
    check(closed(q) && relay.lvl === 1 && near(relay.base, fl + 100, 1e-6) && esp.lvl === 1 && !I.warn.some(w => /overlaps/.test(w.t)), "two boards on level 1 stand on its top; one over the Uno on the floor is no overlap", `relay base ${relay.base} mm`);
    // their mounts are on the level's plate, not in the box
    const lv = q.find(p => p.name === "Level 1"), box = q.find(p => p.name === "Box");
    check(C.solidBounds(lv.solid).size[1] > 2 + 2.9 && C.solidBounds(box.solid).size[1] === 150, "their standoffs and cradles are part of the plate", `plate part ${C.solidBounds(lv.solid).size[1].toFixed(1)} mm high`);
    const q2 = direct({ w: 200, d: 150, h: 150, board: "uno", levels: [{ z: 128, t: 2 }], more: [{ kind: "relay2", x: -40, y: 30, h: 3, lvl: 1 }] }), I2 = MF.enclosure;
    check(I2.warn.some(w => /Relay module, 2 channels is too tall/.test(w.t)), "a relay on a level too close to the lid: its parts (19 mm) reach the lid, and it says so", I2.warn.map(w => w.t).join("; "));
    const q3 = direct({ w: 200, d: 150, h: 150, board: "relay4", standH: 5, levels: [{ z: 22, t: 2 }] });
    check(MF.enclosure.warn.some(w => /too tall/.test(w.t) && /level above/.test(w.s)), "a relay board under a level too low: it reaches the level above");
    // the see-through parts: the board, its parts, its ports, the level
    const kinds = new Set(I.ghosts.map(g => g.kind));
    check(["board", "parts", "port", "level"].every(k => kinds.has(k)), "the see-through parts: boards, the room their parts take, the Uno's ports, the level", [...kinds].join(", "));
    check(I.hints.length === 2 && I.hints.every(h => /no opening in front of it/.test(h)), "the Uno's two ports with no openings are named", I.hints.join(" | "));
    fresh({ w: 200, d: 150, h: 60, board: "uno" }); MF.rebuild(false); await settle(); MF.addBoardPorts(); await settle();
    check(MF.enclosure.hints.length === 0, "after Add this board's ports, nothing is named");
  }

  console.log("\na divider with a 120 mm fan");
  {
    const q = direct({ w: 200, d: 150, h: 170, walls: [{ axis: "y", at: 30, fan: 120, cable: true }] }), I = MF.enclosure, dv = q.find(p => p.name === "Divider 1");
    const db = dv && C.solidBounds(dv.solid);
    check(closed(q) && dv && near(db.size[1], 2, 1e-3) && near(db.size[0], 146 - 0.8, 0.01) && I.dividers[0].fan === "120 mm fan" && !I.warn.length,
      "a divider plate 2 mm thick, across the inside less 0.8 mm, up to under the lid, printed flat, with the fan's grille and screw holes", dv && `${db.size[0].toFixed(1)} × ${db.size[2].toFixed(1)} mm`);
    // its middle is open (the fan grille's centre ring), its corner solid
    const cx = (db.mn[0] + db.mx[0]) / 2, cz = (db.mn[2] + db.mx[2]) / 2;
    check(insideMesh(dv.solid, [db.mn[0] + 3, 1, db.mn[2] + 3]), "the plate is solid at its corner");
    // the grooves: ribs up the front and back walls each side of x = 30, 2.4 mm apart
    const box = q.find(p => p.name === "Box").solid, z = fl + 40;
    const ribL = insideMesh(box, [30 - 1.2 - 0.6, z, 73 - 0.6]), gapIn = !insideMesh(box, [30, z, 73 - 0.6]), ribR = insideMesh(box, [30 + 1.2 + 0.6, z, 73 - 0.6]);
    check(ribL && gapIn && ribR, "grooves up the walls: a rib each side of a 2.4 mm slot", `${ribL}/${gapIn}/${ribR}`);
    const q2 = direct({ w: 200, d: 150, h: 170, levels: [{ z: 90, t: 2 }], walls: [{ axis: "y", at: 30, fan: 120 }] });
    check(MF.enclosure.warn.some(w => /120 mm fan does not fit/.test(w.t)), "under a level at 90 mm the divider stops below it, and the 120 mm fan no longer fits: it says so");
    const q3 = direct({ w: 100, d: 80, h: 40, walls: [{ axis: "x", at: 60 }] });
    check(MF.enclosure.warn.some(w => /Divider 1 left out/.test(w.t)), "a divider outside the box is left out, with a message");
    const q4 = direct({ w: 160, d: 120, h: 60, board: "uno", walls: [{ axis: "y", at: 0 }] });
    check(MF.enclosure.warn.some(w => /crosses/.test(w.t)), "a divider across a board is named");
  }

  console.log("\nthe plates when it does not fit one bed");
  {
    MF.state.printer.bed = [256, 256, 256];
    fresh({ w: 200, d: 150, h: 170, lid: "screw", levels: [{ z: 140, t: 2 }], walls: [{ axis: "y", at: 30, fan: 120 }] }); MF.rebuild(false); await settle();
    const P = MF.parts, onPlates = P.filter(p => p.plate != null);
    check(onPlates.length === P.length && new Set(P.map(p => p.plate)).size >= 2 && MF.checks.list.some(l => /Fits the bed/.test(l.t)), "the box, lid, level and divider go on plates, each fitting the bed", P.map(p => `${p.name}:${p.plate}`).join(", "));
    fresh({ w: 80, d: 60, h: 40, levels: [{ z: 20, t: 2 }] }); MF.rebuild(false); await settle();
    check(MF.parts.every(p => p.plate == null), "a small box with a level fits one bed as it is: no plates");
  }

  console.log("\nthe panel and a hostile file");
  {
    fresh({ w: 160, d: 120, h: 90 }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50);
    const btns = [...document.querySelectorAll("#panel button")].map(b => b.textContent);
    check(btns.some(t => /Add a level/.test(t)) && btns.some(t => /Add a divider/.test(t)), "the Inside page has Add a level and Add a divider");
    const s0 = JSON.parse(MF.projectPayload()).state; s0.base.type = "enclosure";
    Object.assign(s0.base.enclosure, { levels: Array.from({ length: 9 }, () => ({ z: "high", t: 1e9, hold: "<b>", cable: "no" })), walls: [{ axis: "z", at: 1e9, height: -4, fan: 77, cable: 0 }, "junk"], showParts: "maybe",
      more: [{ kind: "relay1", lvl: 99 }] });
    const f = new win.File([JSON.stringify({ app: "Maker Forge", v: 6, state: s0 })], "p.json", { type: "application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); await sleep(500); await settle();
    const E = MF.state.base.enclosure;
    check(E.levels.length === 3 && E.levels.every(l => l.z === 30 && l.t === 5 && l.hold === "posts" && l.cable === true) && E.walls.length === 1 && E.walls[0].axis === "x" && E.walls[0].at === 200 && E.walls[0].height === 0 && E.walls[0].fan === 0 && E.showParts === true && E.more[0].lvl === 3 && closed(MF.parts),
      "nine levels of nonsense, a divider on an axis that does not exist and a fan size no one makes: three levels, clamped, one divider, no fan, and it builds", JSON.stringify(E.walls));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
