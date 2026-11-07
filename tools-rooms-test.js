// Rooms (Session 55): Arrange it for me puts each board inside a room (two side by side, three in a row, four in a cross,
// random sets), the smallest box moves its dividers with it; dividers standing on a level; a hostile project; the panel.
//
//   node tools-rooms-test.js index.html
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
  const support = async over => { fresh(over); MF.rebuild(false); await settle(); MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const more = keys => keys.map(k => ({ kind:k, x:0, y:0, h:3, rot:false, hold:"holes", lvl:0 }));
  // does any board sit across a divider (on its floor)? its footprint against the divider's band
  const across = I => { const bad = []; (MF.state.base.enclosure.walls || []).forEach((w, k) => { const lvl = +w.lvl || 0, gp = 2.4/2 + 1.2;
    I.boards.filter(b => (b.lvl || 0) === lvl && b.fits !== false).forEach(b => { const lo = w.axis === "x" ? b.bb[1] : b.bb[0], hi = w.axis === "x" ? b.bb[3] : b.bb[2]; if (lo < w.at + gp && hi > w.at - gp) bad.push(`${b.label} × divider ${k + 1}`); }); });
    return bad; };
  const bad = I => I.warn.filter(w => /overlap|crosses|does not fit|screw post|under a post/.test(w.t));

  console.log("Arrange inside rooms");
  {
    fresh({ w:160, d:110, h:50, lid:"screw", board:"uno", more:more(["relay2", "buck2596", "nano"]), walls:[{ axis:"y", at:0, height:0, fan:0, notch:"small" }] });
    MF.buildEnclosure(); let r = MF.arrange(true); MF.buildEnclosure(); let I = MF.enclosure;
    check(r.ok && r.rooms === 2 && !across(I).length && !bad(I).length && closed(MF.buildEnclosure()), "two rooms side by side, in the box as it is: every board inside one", r.ok ? across(I).concat(bad(I).map(w => w.t)).join("; ") || `${r.rooms} rooms` : r.why);
    fresh({ w:100, d:80, h:50, lid:"screw", board:"esp32devkit", more:more(["relay4", "buck2596", "mp1584", "d1mini"]), walls:[{ axis:"y", at:-16, height:0, fan:0, notch:"small" }, { axis:"y", at:16, height:0, fan:0, notch:"small" }] });
    MF.buildEnclosure(); r = MF.arrange(false); MF.buildEnclosure(); I = MF.enclosure; const W2 = MF.state.base.enclosure.walls, iwN = MF.state.base.enclosure.w - 4;
    check(r.ok && r.rooms === 3 && !across(I).length && !bad(I).length && Math.abs(Math.abs(W2[0].at) - 16/48*iwN/2) < 1 && Math.abs(W2[0].at + W2[1].at) < 0.6, "three in a row, the smallest box: each board in a room, the dividers moved with the box (a third stays a third)",
      r.ok ? `${r.after.join(" × ")} mm, dividers at ${W2.map(w => w.at).join(", ")}; ${across(I).join("; ")}` : r.why);
    fresh({ w:200, d:150, h:50, lid:"screw", board:"uno", more:more(["relay2", "buck2596", "nano", "pico"]), walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small" }, { axis:"y", at:0, height:0, fan:0, notch:"small" }] });
    MF.buildEnclosure(); r = MF.arrange(true); MF.buildEnclosure(); I = MF.enclosure;
    check(r.ok && r.rooms === 4 && !across(I).length && !bad(I).length, "four rooms in a cross: every board inside one", r.ok ? across(I).join("; ") || "" : r.why);
    // the main board's ports still get their openings, in a room against the walls they face
    fresh({ w:150, d:110, h:50, lid:"screw", board:"pi", more:more(["relay4"]), walls:[{ axis:"y", at:0, height:0, fan:0, notch:"small" }] });
    MF.buildEnclosure(); r = MF.arrange(false); MF.buildEnclosure(); I = MF.enclosure;
    check(r.ok && r.ports === MF.boardPorts.pi.length && !I.hints.length && !across(I).length && !bad(I).length, "a Raspberry Pi and a relay in two rooms: the Pi's ports against their walls, every opening in place", r.ok ? `${r.ports} ports; ${I.hints.join("; ")} ${across(I).join("; ")}` : r.why);
    // random sets with one or two dividers: arranged with none across a divider, or told why not
    const keys = ["uno", "nano", "esp32devkit", "relay2", "relay4", "buck2596", "mp1584", "d1mini", "pico", "lipo603450", "bat18650x1", "tp4056", "pi"].filter(k => MF.boards[k]);
    let ok = 0, told = 0, probs = [];
    for (let s = 0; s < 24; s++){
      const pick = keys.filter((_, i) => ((s*5 + i*7) % 6) < 2).slice(0, 5); if (pick.length < 2) continue;
      const walls = s % 3 === 0 ? [{ axis:"x", at:0 }] : s % 3 === 1 ? [{ axis:"y", at:-10 }] : [{ axis:"x", at:5 }, { axis:"y", at:0 }];
      fresh({ lid:s % 2 ? "screw" : "press", board:pick[0], more:more(pick.slice(1)), walls:walls.map(w => Object.assign({ height:0, fan:0, notch:"small" }, w)) });
      MF.buildEnclosure(); const rr = MF.arrange(false);
      if (!rr.ok){ if (/rooms/.test(rr.why)) told++; else probs.push(pick.join("+") + ": " + rr.why); continue; }
      MF.buildEnclosure(); const II = MF.enclosure, p = across(II).concat(bad(II).map(w => w.t));
      if (p.length || !closed(MF.buildEnclosure())) probs.push(pick.join("+") + ": " + p.join("; ")); else ok++;
    }
    check(ok >= 15 && !probs.length, `random sets with rooms: ${ok} arranged with no board across a divider, ${told} told they don't fit`, probs.slice(0, 3).join(" | "));
  }

  console.log("\ndividers on a level");
  {
    const base = { w:140, d:100, h:80, lid:"press", levels:[{ z:38, t:2, hold:"posts", pass:"back" }] };
    fresh(base); const plain = MF.buildEnclosure();
    fresh(Object.assign({ walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small", lvl:1 }] }, base)); let q = MF.buildEnclosure(), I = MF.enclosure, D0 = I.dividers[0];
    const dB = vol(part(q, /^Box$/)) - vol(part(plain, /^Box$/)), dL = vol(part(q, /^Level 1$/)) - vol(part(plain, /^Level 1$/));
    check(D0 && D0.lvl === 1 && Math.abs(D0.base - (2 + 38)) < 0.01 && Math.abs(D0.h - (80 - 3 - 0.6 - 40)) < 0.01 && Math.abs(dB) < 0.5 && dL > 100 && closed(q) && !I.warn.length,
      "a divider on level 1: in a groove on the level (two ribs printed on it), as tall as the room up to the lid, nothing added to the box", D0 && `${D0.h.toFixed(1)} mm tall, level +${dL.toFixed(0)} mm³, box ${dB.toFixed(1)}`);
    fresh(Object.assign({ walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small", lvl:1 }, { axis:"y", at:0, height:0, fan:0, notch:"small", lvl:1 }, { axis:"y", at:20, height:0, fan:0, notch:"small", lvl:0 }] }, base)); q = MF.buildEnclosure(); I = MF.enclosure;
    check(I.dividers[0].crossings === 1 && I.dividers[1].crossings === 1 && I.dividers[2].crossings === 0 && closed(q) && !I.warn.length, "two on level 1 cross and lock together; one on the floor below crosses neither");
    fresh({ w:140, d:100, h:60, lid:"press", levels:[{ z:20, t:2, hold:"posts", pass:"back" }, { z:30, t:2, hold:"ledges", pass:"back" }], walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small", lvl:1 }] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /Divider 1 left out/.test(w.t) && /less than 8 mm/.test(w.s)), "a level with too little room over it takes no divider, and says so");
    fresh(Object.assign({ walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small", lvl:1 }], more:[{ kind:"relay2", x:0, y:0, h:3, rot:false, hold:"holes", lvl:1 }] }, base)); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /Divider 1 crosses/.test(w.t)), "a board on that level across it is named");
    const sp = await support(Object.assign({ walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small", lvl:1 }, { axis:"y", at:0, height:0, fan:0, notch:"small", lvl:1 }] }, base));
    check(sp === 0, "dividers on a level need no support", `${sp} mm²`);
  }

  console.log("\na hostile project and the panel");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { levels:[{ z:30, t:2 }], walls:[{ axis:"x", at:0, lvl:99 }, { axis:"y", at:0, lvl:-3 }, { axis:"y", at:10, lvl:"<b>" }] });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const W = MF.state.base.enclosure.walls;
    check(W[0].lvl === 3 && !("lvl" in W[1]) && !("lvl" in W[2]) && closed(MF.buildEnclosure()), "a hostile project: a divider's floor clamped, kept only when above the floor", JSON.stringify(W.map(w => w.lvl)));
    fresh({ w:140, d:100, h:80, levels:[{ z:38, t:2, hold:"posts", pass:"back" }], walls:[{ axis:"x", at:0, height:0, fan:0, notch:"small" }] }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    check(/Stands on/.test(document.querySelector("#panel").textContent) && /Level 1 \(in a groove on it\)/.test(document.querySelector("#panel").innerHTML), "the panel: Stands on, the floor or a level");
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
