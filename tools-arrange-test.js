// Arrange it for me (Session 48): boards and modules packed in the smallest box that holds them and fits the bed, or in the
// box as it is; the main board against the walls its ports face, its port openings where it ends up; nothing overlapping,
// on a corner post or outside the box; boards on a level packed on their level; random sets of boards.
//   node tools-arrange-test.js index.html
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
  const fresh = over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount: "none", cut: [], w: 100, d: 64, h: 36 }, over || {});
    (MF.state.base.enclosure.more || []).forEach(m => { m.x = m.x || 0; m.y = m.y || 0; m.h = m.h || 3; m.rot = !!m.rot; }); };
  const bad = I => I.warn.filter(w => /does not fit|overlaps|screw post|left out|behind the lid|too tall/.test(w.t));
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });

  console.log("the smallest box");
  for (const [name, set] of [["an Uno, two relays, a buck converter, an L298N and a charger", { board: "uno", more: [{ kind: "relay2" }, { kind: "buck2596" }, { kind: "l298n", hold: "holes" }, { kind: "tp4056" }] }],
                             ["a Raspberry Pi and a 4-channel relay", { board: "pi", more: [{ kind: "relay4" }] }],
                             ["an ESP32, a weather sensor and an 18650 holder", { board: "esp32devkit", more: [{ kind: "bme280" }, { kind: "bat18650x1" }] }]]) {
    fresh(set); const r = MF.arrange(false), q = MF.buildEnclosure(), I = MF.enclosure, E = MF.state.base.enclosure;
    check(r.ok && !bad(I).length && !I.hints.length && closed(q) && E.w <= 256 && E.d <= 256 && r.ports === MF.boardPorts[set.board].length,
      `${name}: arranged in ${r.after.join(" × ")} mm with nothing overlapping, every port opening in place`, bad(I).map(w => w.t).join("; ") || `${r.ports} port openings`);
  }
  {
    // smaller than a box that holds them side by side in a row
    fresh({ board: "uno", more: [{ kind: "relay2" }, { kind: "buck2596" }, { kind: "tp4056" }, { kind: "mp1584" }] }); const r = MF.arrange(false), E = MF.state.base.enclosure;
    const row = [68.6, 50, 43, 25, 22].reduce((a, b) => a + b + 3, 0) * 53.3;
    check(r.ok && (E.w - 4) * (E.d - 4) < row, "packed tighter than a row of them", `${E.w} × ${E.d} mm`);
    // the Uno's ports face the left wall: it is 1 mm from it
    const I = MF.enclosure, uno = I.boards.find(b => b.main);
    check(Math.abs(uno.bb[0] - (-(E.w - 4) / 2 + 1)) < 0.2, "the Uno against the left wall, where its USB and power ports are", `${(uno.bb[0] + (E.w - 4) / 2).toFixed(1)} mm from it`);
  }

  console.log("\nin the box as it is");
  {
    fresh({ w: 200, d: 150, h: 50, board: "uno", more: [{ kind: "relay2" }, { kind: "buck2596" }] }); const r = MF.arrange(true), E = MF.state.base.enclosure, I = (MF.buildEnclosure(), MF.enclosure);
    check(r.ok && E.w === 200 && E.d === 150 && !bad(I).length, "packed inside a 200 × 150 box, which keeps its size", bad(I).map(w => w.t).join("; "));
    fresh({ w: 60, d: 50, h: 30, board: "uno", more: [{ kind: "relay4" }] }); const r2 = MF.arrange(true);
    check(!r2.ok && /Smallest box/.test(r2.why), "too small: it says so and suggests Smallest box", r2.why);
  }

  console.log("\nlevels");
  {
    fresh({ w: 120, d: 100, h: 90, board: "esp32devkit", levels: [{ z: 45, t: 2 }], more: [{ kind: "relay4", lvl: 1 }, { kind: "buck2596", lvl: 1 }, { kind: "relay2" }] });
    const r = MF.arrange(true), I = (MF.buildEnclosure(), MF.enclosure), lvl1 = I.boards.filter(b => b.lvl === 1);
    check(r.ok && lvl1.length === 2 && !bad(I).length, "boards on level 1 are packed on it, the rest on the floor", bad(I).map(w => w.t).join("; "));
  }

  console.log("\nthe panel");
  {
    fresh({ board: "uno", more: [{ kind: "relay2" }] }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50);
    const btn = [...document.querySelectorAll("#panel button")].find(b => /Arrange it for me/.test(b.textContent));
    btn && btn.click(); await settle();
    check(btn && MF.state.base.enclosure.w !== 100 && !bad(MF.enclosure).length, "Arrange it for me on the Board mounts page", `${MF.state.base.enclosure.w} × ${MF.state.base.enclosure.d}`);
    MF.undo && MF.undo(); await settle();
  }

  console.log("\nrandom sets of boards");
  {
    let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const keys = Object.keys(BOARDS).filter(k => k !== "none" && k !== "custom" && BOARDS[k].w * BOARDS[k].d < 9000), probs = [];
    let ok = 0, refused = 0;
    for (let n = 0; n < 60; n++) {
      const main = keys[Math.floor(rnd() * keys.length)], more = Array.from({ length: 1 + Math.floor(rnd() * 5) }, () => ({ kind: keys[Math.floor(rnd() * keys.length)], hold: rnd() < 0.3 ? "edges" : "holes" }));
      fresh({ board: main, more, lid: ["screw", "press", "magnet", "slide", "none"][Math.floor(rnd() * 5)], fasten: rnd() < 0.2 ? "none" : "insert" });
      const r = MF.arrange(false);
      if (!r.ok) { refused++; continue; }
      const q = MF.buildEnclosure(), I = MF.enclosure;
      if (bad(I).length || I.hints.length || !closed(q)) probs.push(`${main}+${more.map(m => m.kind).join(",")}: ${bad(I).map(w => w.t).concat(I.hints).join("; ")}`); else ok++;
    }
    check(!probs.length && ok >= 50, `60 random sets of 2 to 6 boards: each arranged with nothing overlapping, on a post or outside the box (${refused} too big for one floor on the bed, said so)`, probs.slice(0, 3).join(" | ") || `${ok} arranged`);
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
