// Project box mounts (Session 52): the rim that holds a board or a battery (no loose corner pieces), short lid posts that hang
// from the corners, levels on wall brackets or posts where they are put, a level's posts standing on the level under it (clear
// of its screws), the warnings for a board under a post, Arrange keeping clear of the posts, a hostile project, the panel.
//   node tools-mounts-test.js index.html
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

  console.log("the rim round a board or a battery");
  {
    // a Pi held by its edges at the middle of a 140 × 100 box: 85 × 56, the rim 0.3–1.9 mm out, a finger gap in each long side
    fresh({ w:140, d:100, h:40, board:"pi", boardHold:"edges", boardX:0, boardY:0, lid:"press" });
    let q = MF.buildEnclosure(); const box = part(q, /^Box/), fl = 2, I = MF.enclosure, top = I.boards[0].top;
    const mid = 42.5 + 0.3 + 1.1, ends = [solidAt(box, mid, 0, top - 0.5), solidAt(box, -mid, 0, top - 0.5)], sideY = 28 + 0.3 + 1.1;
    check(ends.every(Boolean) && solidAt(box, 30, sideY, top - 0.5) && solidAt(box, -30, -sideY, top - 0.5) && !solidAt(box, 0, sideY, top - 0.5) && !solidAt(box, 0, -sideY, top - 0.5),
      "a board's rim runs all round it, with a finger gap in the middle of each long side", [...ends, solidAt(box, 30, sideY, top - 0.5), solidAt(box, 0, sideY, top - 0.5)].join(","));
    check(!solidAt(box, 42.5 + 0.55, 28 + 0.55, top - 0.5) && solidAt(box, 42.5 + 1.6, 28 + 1.6, top - 0.5) && solidAt(box, 36, 27, fl + 1),
      "each inside corner has a pocket for the board's corner, the outside corner is solid, and a seat is under the corner",
      [solidAt(box, 42.5 + 0.55, 28 + 0.55, top - 0.5), solidAt(box, 42.5 + 1.6, 28 + 1.6, top - 0.5), solidAt(box, 36, 27, fl + 1)].join(","));
    check(!solidAt(box, 0, 0, fl + 1) && closed(q), "nothing under the middle of the board but the floor; closed");
    // a LiPo 90 × 60 in a strap tray: gaps where the strap passes, the rim along the short sides
    fresh({ w:140, d:100, h:40, board:"lipo906090", lid:"press" }); q = MF.buildEnclosure(); const b2 = part(q, /^Box/), ry = 30 + 0.6 + 0.8;
    check(!solidAt(b2, 0, ry, fl + 2) && solidAt(b2, 35, ry, fl + 2) && solidAt(b2, 45 + 0.6 + 0.8, 0, fl + 2) && closed(q),
      "a battery's tray: a gap in the rim where the strap passes, rim either side of it and along the ends", [solidAt(b2, 0, ry, fl + 2), solidAt(b2, 35, ry, fl + 2), solidAt(b2, 46.4, 0, fl + 2)].join(","));
    const s1 = await support({ w:140, d:100, h:40, board:"pi", boardHold:"edges", lid:"press", more:[{ kind:"lipo603450", x:0, y:0, h:3, rot:false, hold:"holes", lvl:1 }], levels:[{ z:22, t:2, hold:"ledges", pass:"back" }] });
    check(s1 === 0, "a cradle on the floor and a tray on a level need no support", `${s1} mm²`);
  }

  console.log("\nshort lid posts");
  {
    fresh({ w:120, d:90, h:50, lid:"screw", fasten:"insert", postStyle:"hang" }); let q = MF.buildEnclosure(); const box = part(q, /^Box/), I = MF.enclosure, P = I.lidPosts;
    const cx = 60 - 2 - P.r + 0.5 - 2, cy = 45 - 2 - P.r + 0.5 - 2;           // in a post's wall, clear of its insert hole
    check(P.hang && P.free > 30 && solidAt(box, cx, cy, 48) && !solidAt(box, cx, cy, 10) && !solidAt(box, cx, cy, P.free - 0.5) && closed(q),
      "the lid posts hang from the corners: solid near the top, nothing under them from the floor up", `free to ${P.free.toFixed(1)} mm`);
    const sH = await support({ w:120, d:90, h:50, lid:"screw", fasten:"insert", postStyle:"hang" }), sM = await support({ w:120, d:90, h:50, lid:"magnet", postStyle:"hang" });
    check(sH === 0 && sM === 0, "their 45° cones need no support (screws and magnets)", `${sH}, ${sM} mm²`);
    fresh({ w:120, d:90, h:16, lid:"screw", fasten:"insert", postStyle:"hang" }); MF.buildEnclosure();
    check(!MF.enclosure.lidPosts.hang && MF.enclosure.warn.some(w => /Short lid posts left full height/.test(w.t)), "a box too shallow for them keeps full posts, and says so");
    // a board in a corner, under a short post: fine; under a full one: a warning
    const corner = { w:120, d:90, h:50, lid:"screw", fasten:"insert", board:"xiao", boardX:-58 + 11.5, boardY:-43 + 10 };
    fresh(Object.assign({ postStyle:"full" }, corner)); MF.buildEnclosure(); const wFull = MF.enclosure.warn.some(w => /screw post/.test(w.t));
    fresh(Object.assign({ postStyle:"hang" }, corner)); MF.buildEnclosure(); const wHang = MF.enclosure.warn.some(w => /screw post/.test(w.t));
    check(wFull && !wHang, "a board in the corner sits on a full-height post (warned), and fits under a short one");
  }

  console.log("\nlevels on brackets, on posts where you put them, and on the level under them");
  {
    // brackets: nothing on the floor; a screw boss on each side wall under the plate; the plate's holes over them
    fresh({ w:140, d:100, h:70, lid:"press", levels:[{ z:35, t:2, hold:"brackets", pass:"back" }] }); let q = MF.buildEnclosure(); let box = part(q, /^Box/), lv = part(q, /^Level 1/);
    const L0 = MF.enclosure.levels[0], [bx, by] = L0.posts[1];
    check(L0.hold === "brackets" && L0.posts.length === 4 && !solidAt(box, bx, by, 6) && !solidAt(box, bx, by, 15) && solidAt(box, bx + 2.5, by, 30) && solidAt(box, bx + 3.5, by, 33 - 0.5) && !solidAt(lv, bx, by, 1) && closed(q),
      "wall brackets: the floor under them is free, the boss is on the side wall, the plate has a hole over it", `at ${bx.toFixed(1)}, ${by.toFixed(1)}`);
    const sB = await support({ w:140, d:100, h:70, lid:"press", levels:[{ z:35, t:2, hold:"brackets", pass:"back" }] });
    check(sB === 0, "the brackets' 45° wedges need no support", `${sB} mm²`);
    fresh({ w:140, d:100, h:70, lid:"press", levels:[{ z:12, t:2, hold:"brackets", pass:"back" }] }); MF.buildEnclosure();
    check(MF.enclosure.levels[0].hold === "posts" && MF.enclosure.warn.some(w => /no room for wall brackets/.test(w.t)), "a level too low for brackets stands on posts, and says so");
    // posts where you put them
    fresh({ w:140, d:100, h:70, lid:"press", levels:[{ z:35, t:2, hold:"custom", pass:"none", at:[{ x:-10, y:-30 }, { x:30, y:-30 }, { x:0, y:30 }] }] }); q = MF.buildEnclosure(); box = part(q, /^Box/); lv = part(q, /^Level 1/);
    check(MF.enclosure.levels[0].posts.length === 3 && solidAt(box, 30 + 2.5, -30, 20) && solidAt(box, 2.5, 30, 20) && !solidAt(lv, 30, -30, 1) && !solidAt(box, -60 + 7, -50 + 15, 20) && closed(q),
      "three posts where they were put, holes over them in the plate, none in the corners");
    // two levels on corner posts: the upper one's posts stand on the lower plate, printed on it, 9 mm further in
    fresh({ w:140, d:100, h:90, lid:"press", levels:[{ z:30, t:2, hold:"posts", pass:"back" }, { z:60, t:2, hold:"posts", pass:"back" }] }); q = MF.buildEnclosure();
    box = part(q, /^Box/); lv = part(q, /^Level 1/); const lv2 = part(q, /^Level 2/), A = MF.enclosure.levels[0].posts, B = MF.enclosure.levels[1].posts;
    const apart = Math.min(...B.map(([x, y]) => Math.min(...A.map(([a, b]) => Math.hypot(a - x, b - y)))));
    check(apart >= 8.9 && solidAt(box, A[0][0] + 2.5, A[0][1], 15) && !solidAt(box, B[0][0] + 2.5, B[0][1], 15) && !solidAt(box, B[0][0] + 2.5, B[0][1], 45) && solidAt(lv, B[0][0] + 2.5, B[0][1], 10) && !solidAt(lv2, B[0][0], B[0][1], 1) && !MF.enclosure.warn.length && closed(q),
      "level 2's posts stand on level 1 (printed on it), clear of level 1's screws; nothing runs through level 1", `${apart.toFixed(1)} mm from level 1's screws; ${MF.enclosure.warn.map(w => w.t).join("; ")}`);
    const sP = await support({ w:140, d:100, h:90, lid:"press", levels:[{ z:30, t:2, hold:"posts", pass:"back" }, { z:60, t:2, hold:"brackets", pass:"back" }] });
    check(sP === 0, "posts printed on a plate and brackets above it need no support", `${sP} mm²`);
  }

  console.log("\nboards and posts");
  {
    fresh({ w:140, d:100, h:70, lid:"press", board:"xiao", boardX:-60.6 + 9, boardY:-40.6 + 6, levels:[{ z:35, t:2, hold:"posts", pass:"back" }] }); MF.buildEnclosure();
    const under = MF.enclosure.warn.some(w => /under a post of level 1/.test(w.t));
    fresh({ w:140, d:100, h:70, lid:"press", board:"xiao", boardX:-60.6 + 9, boardY:-40.6 + 6, levels:[{ z:35, t:2, hold:"brackets", pass:"back" }] }); MF.buildEnclosure();
    check(under && !MF.enclosure.warn.some(w => /post|bracket/.test(w.t)), "a board under a level's post is warned about; with wall brackets the floor there is free");
    fresh({ w:140, d:100, h:70, lid:"press", board:"esp32devkit", levels:[{ z:35, t:2, hold:"brackets", pass:"back" }], more:[{ kind:"relay4", x:0, y:0, h:3, rot:false, hold:"holes", lvl:0 }, { kind:"buck2596", x:0, y:0, h:3, rot:false, hold:"holes", lvl:0 }] });
    MF.buildEnclosure(); const r = MF.arrange(false); MF.buildEnclosure();
    check(r.ok && !MF.enclosure.warn.some(w => /bracket|post|overlap/.test(w.t)), "Arrange with wall brackets: no board runs into one", MF.enclosure.warn.map(w => w.t).join("; ") || `${r.after.join(" × ")}`);
    // Arrange with a level on corner posts: nothing ends up under a post (random sets)
    const keys = ["uno", "nano", "esp32devkit", "relay2", "relay4", "buck2596", "mp1584", "d1mini", "pico", "lipo603450", "bat18650x1"].filter(k => MF.boards[k]);
    let bad = 0, n = 0, worst = "";
    for (let s = 0; s < 18; s++){
      const pick = keys.filter((_, i) => ((s*7 + i*3) % 5) < 2).slice(0, 4); if (!pick.length) continue;
      fresh({ lid:s % 3 ? "screw" : "magnet", postStyle:s % 2 ? "hang" : "full", board:pick[0], levels:[{ z:40, t:2, hold:"posts", pass:"back" }],
        more:pick.slice(1).map(k => ({ kind:k, x:0, y:0, h:3, rot:false, hold:"holes", lvl:0 })) });
      MF.buildEnclosure(); const rr = MF.arrange(false); if (!rr.ok) continue; MF.buildEnclosure(); n++;
      const w = MF.enclosure.warn.filter(x => /post|overlap/.test(x.t)); if (w.length){ bad++; worst = pick.join("+") + ": " + w.map(x => x.t).join("; "); }
    }
    check(n >= 10 && bad === 0, `Arrange keeps boards clear of the lid posts and the posts a level stands on (${n} random sets)`, worst);
  }

  console.log("\na hostile project and the panel");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { postStyle:"<img src=x onerror=alert(1)>",
      levels:[{ z:30, t:2, hold:"evil", at:"x" }, { z:60, t:2, hold:"custom", at:Array.from({ length:40 }, (_, i) => ({ x:i*1e6, y:"NaN" })) }] });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E2 = MF.state.base.enclosure;
    check(E2.postStyle === "full" && E2.levels[0].hold === "posts" && Array.isArray(E2.levels[0].at) && !E2.levels[0].at.length && E2.levels[1].at.length === 6 && E2.levels[1].at.every(q => Math.abs(q.x) <= 200 && Number.isFinite(q.y)) && closed(MF.buildEnclosure()),
      "a hostile project: unknown styles fall back, at most six posts, every number clamped", JSON.stringify({ ps:E2.postStyle, h:E2.levels.map(l => l.hold), at:E2.levels[1].at.slice(0, 2) }));
    fresh({ w:140, d:100, h:70, lid:"screw", fasten:"insert", levels:[{ z:35, t:2, hold:"posts", pass:"back" }] }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    const txt = () => document.querySelector("#panel").textContent;
    const hasLevel = /It is held by/.test(txt()) && /Brackets on the side walls/.test(txt());
    const short = [...document.querySelectorAll("#panel button")].find(b => b.textContent === "Short posts (floor free)");
    short && short.click(); await settle();
    check(hasLevel && short && MF.state.base.enclosure.postStyle === "hang" && MF.enclosure.lidPosts.hang, "the panel: how each level is held, and short lid posts in one click");
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
