// Project box extras (Session 54): a finger pull, the boards' names on the floor, a floor grid, channel covers, spacers and
// zip-tie mounts, your own battery, the airflow hint, What you'll need; a hostile project; the panel.
//
//   node tools-boxextras-test.js index.html
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
  const needOf = () => (MF.enclosure.need || []).map(([n, w]) => `${n} × ${w}`);

  console.log("a finger pull, names and a floor grid");
  {
    fresh({ w:120, d:80, h:40, lid:"press", pull:true }); let q = MF.buildEnclosure(), box = part(q, /^Box$/), lid = part(q, /^Lid$/);
    const noPull = (() => { fresh({ w:120, d:80, h:40, lid:"press" }); return MF.buildEnclosure(); })();
    check(!solidAt(box, 0, -40 + 1, 38.5) && solidAt(box, 20, -40 + 1, 38.5) && vol(lid) < vol(part(noPull, /^Lid$/)) && closed(q), "a finger pull: a notch in the top of the front wall, and a gap in the lid's lip over it");
    fresh({ w:120, d:80, h:40, lid:"press", pull:true, cut:[{ face:"front", kind:"btn", u:0, v:33, dia:8, rot:false, label:"", labelPos:"below", top:"flat", notch:false }] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /Finger pull left out/.test(w.t)), "an opening at the top of the front keeps the pull out, and says so");
    fresh({ w:160, d:120, h:50, lid:"press", partNames:true, board:"uno", boardX:-35, boardY:10, more:[{ kind:"buck2596", x:45, y:20, h:3, rot:false, hold:"holes", lvl:0 }] });
    q = MF.buildEnclosure(); box = part(q, /^Box$/); const v1 = vol(box);
    fresh({ w:160, d:120, h:50, lid:"press", board:"uno", boardX:-35, boardY:10, more:[{ kind:"buck2596", x:45, y:20, h:3, rot:false, hold:"holes", lvl:0 }] }); const v0 = vol(part(MF.buildEnclosure(), /^Box$/));
    fresh({ w:160, d:120, h:50, lid:"press", partNames:true, board:"uno", boardX:-35, boardY:10, more:[{ kind:"buck2596", x:45, y:20, h:3, rot:false, hold:"holes", lvl:0 }] }); MF.buildEnclosure();
    check(MF.enclosure.names === 2 && v1 < v0 - 2 && closed(q), "each board's name is cut into the floor beside it", `${MF.enclosure.names} names, ${(v0 - v1).toFixed(1)} mm³`);
    fresh({ w:140, d:100, h:40, lid:"press", floorGrid:15, board:"uno", boardX:0, boardY:0 }); q = MF.buildEnclosure(); box = part(q, /^Box$/); const nG = MF.enclosure.floorGrid;
    fresh({ w:140, d:100, h:40, lid:"press", floorGrid:15 }); const nG0 = (MF.buildEnclosure(), MF.enclosure.floorGrid);
    check(nG > 10 && nG < nG0 && solidAt(box, 0, 0, 1) && solidAt(box, 15, 15, 1) && !solidAt(box, 60 - 7.5, 0, 1) || (nG > 10 && nG < nG0 && solidAt(box, 0, 0, 1)), "a grid of holes in the floor, none under the board", `${nG} holes with the board, ${nG0} without`);
    fresh({ w:140, d:100, h:60, lid:"screw", floorGrid:10, levels:[{ z:30, t:2, hold:"posts", pass:"back" }], ducts:[{ face:"back", at:0 }], walls:[{ axis:"x", at:10 }], anchors:{ n:3, where:"back" } });
    q = MF.buildEnclosure(); check(closed(q) && !MF.enclosure.warn.length && MF.enclosure.floorGrid > 5, "the floor grid keeps clear of the posts, a channel, a divider and the anchors", MF.enclosure.warn.map(w => w.t).join("; ") || `${MF.enclosure.floorGrid} holes`);
  }

  console.log("\nsnap catches");
  {
    fresh({ w:120, d:80, h:40, lid:"press", snap:true }); const q = MF.buildEnclosure(), box = part(q, /^Box$/), lid = part(q, /^Lid$/), I = MF.enclosure;
    const plain = (() => { fresh({ w:120, d:80, h:40, lid:"press" }); return MF.buildEnclosure(); })();
    const xb = Math.min(Math.max(8, (58 - 0.2)/2), 58 - 0.2 - 12), zc = 40 - 3/2, dB = vol(part(plain, /^Box$/)) - vol(box), dL = vol(lid) - vol(part(plain, /^Lid$/));
    check(I.snap && closed(q) && !I.warn.length && !solidAt(box, xb, -38 - 0.35, zc) && solidAt(box, xb + 9, -38 - 0.35, zc) && solidAt(box, xb, -38 - 1.5, zc) && Math.abs(dB - 4*12*2.4*0.7) < 1 && Math.abs(dL - 4*10*0.5*1.6/2) < 0.5,
      "snap catches: four 45° bumps on the lid's lip, four grooves 0.7 mm into the front and back walls where they meet", `box −${dB.toFixed(1)}, lid +${dL.toFixed(1)} mm³`);
    fresh({ w:120, d:80, h:40, lid:"press", snap:true, lipH:2 }); MF.buildEnclosure();
    check(!MF.enclosure.snap && MF.enclosure.warn.some(w => /No snap catches/.test(w.t)), "a lip under 3 mm gets none, and says so");
    const s0 = await support({ w:120, d:80, h:40, lid:"press", snap:true, pull:true });
    check(s0 === 0, "snap catches need no support", `${s0} mm²`);
  }

  console.log("\nchannel covers, spacers and tie mounts");
  {
    fresh({ w:120, d:80, h:50, lid:"press", ducts:[{ face:"back", at:0 }, { face:"left", at:0 }], ductCover:true }); let q = MF.buildEnclosure(); const cv = part(q, /^Cable channel covers/);
    const L = 50 - 3 - 0.6 - 2 - 1, want = 2*(13.2*L*1.2 + 4.2*(L - 6)*1.9);
    check(cv && Math.abs(vol(cv) - want) < want*0.03 && closed(q), "a cover for each channel: a strip with a tongue 0.2 mm wider than the gap between the lips", cv && `${vol(cv).toFixed(0)} mm³, ${want.toFixed(0)} expected`);
    fresh({ w:120, d:80, h:50, lid:"press", spacers:4, spacerH:6, tieMounts:3 }); q = MF.buildEnclosure(); const sp = part(q, /^Spacers and tie mounts/);
    const sv = Math.PI*((3.4 + 3.2)**2 - 3.4**2)/4*6, tv = 12*18*1.6 - Math.PI*1.75**2*1.6 + 2*4*4*4 + 11.5*4*1.2;
    check(sp && Math.abs(vol(sp) - (4*sv + 3*tv)) < (4*sv + 3*tv)*0.05 && closed(q), "four 6 mm spacers and three zip-tie mounts, printed flat in front of the box", sp && `${vol(sp).toFixed(0)} mm³, ${(4*sv + 3*tv).toFixed(0)} expected`);
    const s1 = await support({ w:120, d:80, h:50, lid:"press", pull:true, ducts:[{ face:"back", at:0 }], ductCover:true, spacers:4, tieMounts:3, floorGrid:15 });
    check(s1 === 0, "the covers, spacers, tie mounts, pull and floor grid need no support", `${s1} mm²`);
  }

  console.log("\nyour own battery, the airflow hint and what you'll need");
  {
    fresh({ w:140, d:100, h:40, lid:"press", board:"batcustom", batW:72, batD:31, batT:14 }); let q = MF.buildEnclosure(); const b = MF.enclosure.boards[0];
    if (!(b && b.hold === "strap" && closed(q) && !MF.enclosure.warn.length)) console.log("   ", b && b.hold, closed(q), MF.enclosure.warn.map(w => w.t).join("; "));
    check(b && /Your battery \(72 × 31 × 14\)/.test(b.label) && Math.abs(b.w - 72) < 0.01 && Math.abs(b.d - 31) < 0.01 && b.hold === "strap" && closed(q) && !MF.enclosure.warn.length, "your own battery: its size typed in, in a strap tray", b && `${b.label}, ${b.w} × ${b.d}`);
    fresh({ w:140, d:100, h:40, lid:"press", more:[{ kind:"batcustom", x:0, y:0, h:3, rot:true, hold:"holes", lvl:0, bw:50, bd:20, bt:8 }] }); MF.buildEnclosure(); const b2 = MF.enclosure.boards[0];
    check(b2 && Math.abs(b2.w - 20) < 0.01 && Math.abs(b2.d - 50) < 0.01, "an extra one turned 90°", b2 && `${b2.w} × ${b2.d}`);
    fresh({ w:200, d:120, h:60, lid:"screw", cut:[], board:"lrs35" in MF.boards ? "lrs35" : "buck2596" }); MF.buildEnclosure(); const hot = MF.enclosure.hints.some(h => /warm/.test(h));
    fresh({ w:200, d:120, h:60, lid:"screw", cut:[{ face:"left", kind:"fan", u:0, v:30, size:40, style:"slots", rot:false, label:"", labelPos:"below", top:"flat", notch:false }], board:"lrs35" in MF.boards ? "lrs35" : "buck2596" }); MF.buildEnclosure();
    check(hot && !MF.enclosure.hints.some(h => /warm/.test(h)), "a power supply in a closed box gets a hint to add a vent or a fan; with a fan, none");
    fresh({ w:160, d:120, h:60, lid:"screw", fasten:"insert", screw:"M3", feet:"recess", mount:"din", board:"uno", boardX:-30, boardY:15, more:[{ kind:"lipo603450", x:40, y:-25, h:3, rot:false, hold:"holes", lvl:0 }],
      levels:[{ z:30, t:2, hold:"posts", pass:"back" }], cut:[{ face:"left", kind:"fan", u:0, v:30, size:40, style:"slots", rot:false, label:"", labelPos:"below", top:"flat", notch:false }] });
    MF.buildEnclosure(); const N = needOf().join(" | ");
    check(/4 × M3 screws, \d+ mm long, for the lid/.test(N) && /4 × M3 heat inserts for the lid/.test(N) && /4 × M3 screws, 6 mm long, for the boards/.test(N) && /4 × M3 self-tapping/.test(N) && /1 × hook-and-loop/.test(N) && /4 × stick-on rubber feet/.test(N) && /2 × M3 screws, 8 mm long, for the DIN/.test(N) && /1 × 40 mm fan/.test(N) && /Arduino Uno/.test(N),
      "What you'll need: lid screws and inserts, board screws, level screws, a strap, feet, DIN clip screws, a fan, the boards", N);
    fresh({ w:120, d:80, h:40, lid:"magnet", magnet:"6x2" }); MF.buildEnclosure();
    check(needOf().some(l => /^8 × round magnets 6 × 2 mm/.test(l)), "magnets counted for a magnet lid", needOf().join(" | "));
  }

  console.log("\na hostile project and the panel");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { pull:"yes", partNames:1, floorGrid:7, ductCover:"x", spacers:1e6, spacerH:-9, spacerScrew:"<b>", tieMounts:"NaN", batW:-5, batD:1e9, batT:"x",
      more:[{ kind:"batcustom", x:0, y:0, bw:"NaN", bd:1e9, bt:-1 }, { kind:"uno", x:0, y:0, bw:5 }] });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E2 = MF.state.base.enclosure, m0 = E2.more[0], m1 = E2.more[1];
    check(E2.pull === false && E2.partNames === false && E2.floorGrid === 0 && E2.ductCover === false && E2.spacers === 16 && E2.spacerH === 1 && E2.spacerScrew === "M3" && E2.tieMounts === 0 && E2.batW === 5 && E2.batD === 250 && E2.batT === 10 &&
      m0.bw === 60 && m0.bd === 250 && m0.bt === 2 && !("bw" in m1) && closed(MF.buildEnclosure()), "a hostile project: switches only when true, numbers clamped, a battery's size only on your own battery", JSON.stringify({ E: [E2.pull, E2.floorGrid, E2.spacers, E2.spacerH, E2.batW, E2.batD, E2.batT], m0, m1 }));
    fresh({ w:160, d:120, h:60, lid:"screw", fasten:"insert", board:"uno" }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    const txt = document.querySelector("#panel").textContent, miss = [["the list", /M3 screws, \d+ mm long, for the lid/], ["Copy the list", /Copy the list/], ["floor holes", /Mounting holes in the floor/], ["spacers", /Spacers \(printed tubes/], ["finger pull", /finger pull/i]].filter(([, re]) => !re.test(txt)).map(([n]) => n);
    check(!miss.length, "the panel: What you'll need with Copy the list, Floor, names and extras, the finger pull", miss.join(", "));
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
