// Project boxes, floors and rooms (Session 51): every battery in a strap tray or a corner cradle; strap slots through the floor
// and through a level; the main board on a level; a level's mounting holes, cable passes and zip-tie anchors; cable channels
// up the walls with the levels notched round them; dividers that cross (half-lap slots), notches and the room presets; a
// hostile project; the panel.
//   node tools-floors-test.js index.html
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
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length, BOARDS = MF.boards;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const fresh = over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const vol = p => C.signedVolume(p.solid);
  const part = (q, re) => q.find(p => re.test(p.name));
  // is there solid at plan (x, y) and height z in a part? a ray straight down counts the faces it crosses above z
  // (plan x, y from the part's own middle: parts are laid out side by side for printing)
  const solidAt = (p, x, y, z) => { const P = p.solid.pos, I = p.solid.idx; let n = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
    const wx = (x0 + x1) / 2 + x + 0.0123, wz = (z0 + z1) / 2 - y + 0.0071;          // (off the triangles' shared edges)
    for (let t = 0; t < I.length; t += 3) { const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
      const ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2], d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) continue;
      const l1 = ((bz - cz) * (wx - cx) + (cx - bx) * (wz - cz)) / d, l2 = ((cz - az) * (wx - cx) + (ax - cx) * (wz - cz)) / d, l3 = 1 - l1 - l2; if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      if (l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1] > z) n++; }
    return n % 2 === 1; };

  console.log("batteries");
  {
    const bats = Object.keys(BOARDS).filter(k => BOARDS[k].g === "battery"), bad = [];
    for (const k of bats) for (const hold of ["holes", "edges"]) {
      fresh({ w:200, d:130, h:110, board:k, boardHold:hold }); const q = MF.buildEnclosure(), I = MF.enclosure;
      if (!closed(q) || I.warn.length || (hold === "holes" ? I.boards[0].hold !== "strap" : I.boards[0].hold !== "edges")) bad.push(`${k}/${hold}: ${I.warn.map(w => w.t).join("; ") || I.boards[0].hold}`);
    }
    check(bats.length >= 38 && !bad.length, `all ${bats.length} batteries (LiPo pouches up to 8000 mAh, RC packs to 4S 5000, 18650/21700/26650, AA, AAA, C, D, coin cells, lead-acid) in a strap tray and in a corner cradle, closed`, bad.slice(0, 3).join(" | "));
    // the tray: the battery lies on the floor, fences at its corners, slots through the floor either side
    fresh({ w:140, d:100, h:40, board:"lipo906090" }); let q = MF.buildEnclosure(); const box = part(q, /^Box/), fl = +MF.state.base.enclosure.floor || 2;
    const g = MF.enclosure.ghosts.find(gh => /LiPo/.test(gh.label));
    const slotY = 30 + 0.6 + 1.4 + 1.3;               // half its depth, the gap, the offset, half the slot
    check(g && Math.abs(g.b[2] - fl) < 0.05 && !solidAt(box, 0, slotY, 0.5) && !solidAt(box, 0, -slotY, 0.5) && solidAt(box, 0, 0, 0.5) && solidAt(box, 45 + 0.6 + 0.8, 30 + 0.6 + 0.8 - 5, fl + 2),
      "a LiPo pouch lies on the floor: a fence at each corner and strap slots through the floor either side", g && `the battery from ${g.b[2].toFixed(1)} mm; ${[solidAt(box, 0, slotY, 0.5), solidAt(box, 0, -slotY, 0.5), solidAt(box, 0, 0, 0.5), solidAt(box, 45 + 0.6 + 0.8, 30 + 0.6 + 0.8 - 5, fl + 2)].join(",")}`);
    fresh({ w:140, d:110, h:80, board:"esp32devkit", levels:[{ z:40, t:2, hold:"posts", pass:"back" }], more:[{ kind:"rc3s2200", x:0, y:0, h:3, rot:false, hold:"holes", lvl:1 }] });
    q = MF.buildEnclosure(); const lv = part(q, /^Level 1/);
    const lvPlain = (() => { fresh({ w:140, d:110, h:80, board:"esp32devkit", levels:[{ z:40, t:2, hold:"posts", pass:"back" }] }); return part(MF.buildEnclosure(), /^Level 1/); })();
    check(lv && closed(q) && vol(lv) > vol(lvPlain) && MF.enclosure.warn.length === 0, "an RC pack on level 1: its tray and strap slots on the level's plate", `level ${vol(lvPlain).toFixed(0)} → ${vol(lv).toFixed(0)} mm³`);
  }

  console.log("\nthe main board on a level");
  {
    fresh({ w:120, d:100, h:80, board:"uno", boardLvl:1, levels:[{ z:38, t:2, hold:"posts", pass:"back" }], more:[{ kind:"relay4", x:0, y:0, h:3, rot:false, hold:"holes", lvl:0 }] });
    const r = MF.arrange(true), q = MF.buildEnclosure(), I = MF.enclosure, uno = I.boards.find(b => b.main);
    check(r.ok && uno.lvl === 1 && Math.abs(uno.base - (2 + 38)) < 0.01 && !I.warn.some(w => /overlap|does not fit|screw post/.test(w.t)) && closed(q),
      "the Uno on level 1, its standoffs on the plate; the relay on the floor; Arrange in this box keeps them apart", I.warn.map(w => w.t).join("; ") || `the Uno from ${uno.base} mm`);
  }

  console.log("\nlevels: mounting holes, cable passes, anchors");
  {
    const lvl = L => { fresh({ w:140, d:110, h:90, board:"esp32devkit", levels:[Object.assign({ z:40, t:2, hold:"posts", pass:"back" }, L)] }); const q = MF.buildEnclosure(); return { q, I:MF.enclosure, lv:part(q, /^Level 1/) }; };
    const none = lvl({}), g10 = lvl({ grid:10 }), g20 = lvl({ grid:20 });
    check(g10.I.levels[0].grid > 4 * g20.I.levels[0].grid * 0.8 && g20.I.levels[0].grid > 10 && vol(g10.lv) < vol(none.lv) && closed(g10.q),
      "mounting holes every 10 or 20 mm, clear of the posts and the cable slot", `${g10.I.levels[0].grid} and ${g20.I.levels[0].grid} holes`);
    const withBoard = (() => { fresh({ w:140, d:110, h:90, board:"esp32devkit", levels:[{ z:40, t:2, hold:"posts", pass:"back", grid:10 }], more:[{ kind:"relay2", x:0, y:0, h:3, rot:false, hold:"holes", lvl:1 }] }); MF.buildEnclosure(); return MF.enclosure.levels[0].grid; })();
    check(withBoard <= g10.I.levels[0].grid - 15, "no mounting holes under a board's mounts on the level", `${g10.I.levels[0].grid} → ${withBoard}`);
    const passes = ["back", "front", "left", "right", "corners", "none"].map(p => ["small", "large"].map(sz => { const r = lvl({ pass:p, passSize:sz }); return { p, sz, v:vol(r.lv), ok:closed(r.q) && !r.I.warn.length }; })).flat();
    const v = (p, sz) => passes.find(x => x.p === p && x.sz === sz).v;
    check(passes.every(x => x.ok) && v("none", "small") > v("back", "small") && v("back", "small") > v("back", "large") && v("corners", "small") < v("none", "small"), "cable passes at the back, front, sides or corners, small or large: each takes plastic out of the plate",
      passes.map(x => `${x.p}/${x.sz} ${x.v.toFixed(0)}`).join(", "));
    const an = lvl({ anchors:4 });
    check(an.I.levels[0].anchors === 4 && vol(an.lv) > vol(none.lv) && closed(an.q), "four zip-tie anchors on the level", `${an.I.levels[0].anchors} made`);
  }

  console.log("\ncable channels up the walls");
  {
    fresh({ w:140, d:110, h:90, board:"esp32devkit", ducts:[{ face:"back", at:30 }, { face:"left", at:0 }], levels:[{ z:40, t:2, hold:"posts", pass:"back" }, { z:70, t:2, hold:"ledges", pass:"corners" }] });
    let q = MF.buildEnclosure(); const I = MF.enclosure, box = part(q, /^Box/), fl = 2, iw = 136, id = 106;
    // the channel's side and lip at the back wall, and its open middle
    const ok3D = solidAt(box, 30 - 5 - 0.8, id/2 - 4, 50) && solidAt(box, 30 + 5 + 0.8, id/2 - 4, 50) && !solidAt(box, 30, id/2 - 4, 50) && solidAt(box, 30 - 5 + 1.5, id/2 - 9 + 0.8, 50) && !solidAt(box, 30, id/2 - 9 + 0.8, 50);
    const lv1 = part(q, /^Level 1/), lv2 = part(q, /^Level 2/);
    check(I.ducts === 2 && ok3D && closed(q) && !I.warn.length, "two C-shaped channels up the walls, from the floor to the top, open in the middle", I.warn.map(w => w.t).join("; ") || "sides, lips and opening measured");
    fresh({ w:140, d:110, h:90, board:"esp32devkit", levels:[{ z:40, t:2, hold:"posts", pass:"back" }, { z:70, t:2, hold:"ledges", pass:"corners" }] });
    const q0 = MF.buildEnclosure();
    check(vol(lv1) < vol(part(q0, /^Level 1/)) && vol(lv2) < vol(part(q0, /^Level 2/)), "the levels are notched round them", `level 1 ${vol(part(q0, /^Level 1/)).toFixed(0)} → ${vol(lv1).toFixed(0)} mm³`);
    fresh({ w:140, d:110, h:60, board:"esp32devkit", ducts:[{ face:"back", at:65 }] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /Cable channel 1 left out/.test(w.t)), "a channel in a corner is left out and said so");
    fresh({ w:140, d:110, h:60, board:"esp32devkit", ducts:[{ face:"front", at:0 }], cut:[Object.assign(MF.newOpening("usbc", "front"), { u:0, v:25 })] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /behind cable channel/.test(w.t)), "an opening behind a channel is named");
  }

  console.log("\ndividers and rooms");
  {
    const div = walls => { fresh({ w:140, d:110, h:60, walls }); const q = MF.buildEnclosure(); return { q, I:MF.enclosure, plates:q.filter(p => /^Divider/.test(p.name)) }; };
    const plain = div([{ axis:"x", at:0, notch:"none" }, { axis:"y", at:30, notch:"none" }]), solo = div([{ axis:"x", at:0, notch:"none" }]), soloY = div([{ axis:"y", at:30, notch:"none" }]);
    // the across divider loses a slot from the top, the front-to-back one from the bottom: each half the joint (2.4 × half the height)
    const hp = plain.I.dividers[0].h, cut = 2.4 * hp / 2 * 2;
    const dX = vol(solo.plates[0]) - vol(plain.plates[0]), dY = vol(soloY.plates[0]) - vol(plain.plates[1]);
    check(plain.I.dividers.every(d => d.crossings === 1) && Math.abs(dX - cut) < cut * 0.15 && Math.abs(dY - cut) < cut * 0.15 && closed(plain.q), "two dividers that cross lock together: a slot half way down one and half way up the other",
      `${dX.toFixed(0)} and ${dY.toFixed(0)} mm³ out, ${cut.toFixed(0)} expected`);
    const notch = n => vol(div([{ axis:"x", at:0, notch:n }]).plates[0]);
    check(notch("none") > notch("small") && notch("small") > notch("large") && notch("ends") < notch("none"), "a cable notch: none, small, large or one at each end", ["none", "small", "large", "ends"].map(n => `${n} ${notch(n).toFixed(0)}`).join(", "));
    const grid = div([{ axis:"x", at:-15 }, { axis:"x", at:15 }, { axis:"y", at:-20 }, { axis:"y", at:20 }]);
    check(grid.I.dividers.every(d => d.crossings === 2) && closed(grid.q) && !grid.I.warn.length, "nine rooms from four dividers, each crossing two");
    // the presets on the panel
    fresh({ w:140, d:110, h:60 }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    const b4 = [...document.querySelectorAll("#panel button")].find(b => b.textContent === "Four (a cross)"); b4 && b4.click(); await sleep(80);
    const W1 = JSON.parse(JSON.stringify(MF.state.base.enclosure.walls));
    const b3 = [...document.querySelectorAll("#panel button")].find(b => b.textContent === "Three in a row"); b3 && b3.click(); await sleep(80);
    const W2 = MF.state.base.enclosure.walls;
    check(b4 && W1.length === 2 && W1.some(w => w.axis === "x") && W1.some(w => w.axis === "y") && b3 && W2.length === 2 && W2.every(w => w.axis === "y") && Math.abs(W2[0].at + W2[1].at) < 1 && Math.abs(Math.abs(W2[0].at) - 136 / 6) < 1,
      "Make rooms in one go: four in a cross, three in a row (a third each)", JSON.stringify(W2.map(w => [w.axis, w.at])));
  }

  console.log("\na hostile project");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { boardLvl:99, ducts:[...Array(9)].map(() => ({ face:"<x>", at:1e9 })),
      levels:[{ z:40, t:2, pass:"<script>", passSize:"huge", grid:7, anchors:1e6 }], walls:[{ axis:"x", at:0, notch:"<b>" }] });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E2 = MF.state.base.enclosure, L = E2.levels[0];
    check(E2.boardLvl === 3 && E2.ducts.length === 4 && E2.ducts.every(u => u.face === "back" && u.at === 150) && L.pass === "back" && L.passSize === "small" && L.grid === 0 && L.anchors === 8 && E2.walls[0].notch === "small",
      "levels, channels, the main board's floor and divider notches cleaned", JSON.stringify({ lvl:E2.boardLvl, ducts:E2.ducts.length, L, notch:E2.walls[0].notch }));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
