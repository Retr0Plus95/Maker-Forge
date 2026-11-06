// Boards and modules in a project box (Session 45): every board builds closed, on standoffs or in a cradle that holds it
// by its edges; several boards in one box; "Add this board's ports" puts each port's opening where the port is; the search
// in the lists; a hostile project file.
//   node tools-boards-test.js index.html
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
  const MF = win.MakerForge, C = MF.core, st = MF.state, e0 = env.errors.length, BOARDS = MF.boards;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle();
  const fresh = over => { st.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount: "none" }, over || {}); };
  const direct = over => { fresh(over); return MF.buildEnclosure(); };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });

  console.log("every board and module, alone in a box big enough for it");
  const keys = Object.keys(BOARDS).filter(k => k !== "none" && k !== "custom"), bad = [];
  let cradles = 0, posts = 0;
  for (const k of keys) {
    const B = BOARDS[k], w = Math.ceil(Math.max(B.w, B.d) + 30), q = direct({ w, d: w, h: 40, board: k, lid: "none", cut: [] }), I = MF.enclosure;
    const ok = closed(q) && I.board && I.board.fits !== false && !I.warn.some(x => /does not fit|overlaps|screw post/.test(x.t));
    if (!ok) bad.push(`${k}: ${I.warn.map(x => x.t).join("; ")}`);
    if (I.board && I.board.hold === "edges") cradles++; else posts++;
  }
  check(!bad.length && keys.length >= 60, `${keys.length} boards and modules each build closed, held on standoffs (${posts}) or in a cradle (${cradles})`, bad.slice(0, 4).join(" | "));

  console.log("\na cradle: an ESP32 DevKit held by its edges");
  {
    const B = BOARDS.esp32devkit, q = direct({ w: 90, d: 60, h: 30, board: "esp32devkit", standH: 5, lid: "none", cut: [], radius: 0 }), box = q[0].solid, I = MF.enclosure, fl = 2;
    const top = fl + 5;        // the seats' top: the board's underside
    // a seat under each corner (solid 1 mm in from the corner, just under the board), the fence just outside the corner,
    // rising over the board's top; clear between the fences along the edges' middles, and over the board
    const cx = B.w / 2, cy = B.d / 2, at = (x, y, h) => [x, h, -y];
    const seat = insideMesh(box, at(cx - 1, cy - 1, top - 0.5)), fence = insideMesh(box, at(cx + 0.3 + 0.8, cy - 2, top + 1.6 + 0.6));
    const clearIn = !insideMesh(box, at(cx - 1, cy - 1, top + 0.8)), clearMid = !insideMesh(box, at(0, cy + 1.1, top + 1)), board = I.board;
    check(closed(q) && board.hold === "edges" && seat && fence && clearIn && clearMid && near(board.top, fl + 5 + 1.6, 1e-6),
      "a seat under each corner at the standoff height, an L-shaped fence round it 0.3 mm clear and over the board's top, open between", `seat ${seat}, fence ${fence}, board top ${board.top} mm`);
    // printed upright: no support
    fresh({ w: 90, d: 60, h: 30, board: "esp32devkit", lid: "none", cut: [] }); MF.rebuild(false); await settle(); await MF.printNow();
    for (let i = 0; i < 200 && !MF.print; i++) await sleep(30);
    check(MF.print && MF.print.overhang.area < 3, "the cradle needs no support", MF.print && MF.print.overhang.area.toFixed(1) + " mm²");
  }
  {
    const q = direct({ w: 100, d: 80, h: 30, board: "uno", boardHold: "edges", lid: "none", cut: [] });
    check(closed(q) && MF.enclosure.board.hold === "edges", "a board with holes can be held by its edges instead (By its edges)");
  }

  console.log("\nseveral boards in one box");
  {
    const q = direct({ w: 180, d: 120, h: 45, board: "uno", boardX: -40, more: [{ kind: "relay2", x: 45, y: 25, h: 3 }, { kind: "buck2596", x: 45, y: -25, h: 3 }, { kind: "l298n", x: 40, y: 0, h: 3, hold: "holes" }], lid: "none", cut: [] });
    const I = MF.enclosure, names = I.boards.map(b => b.label);
    check(closed(q) && I.boards.length === 4 && I.warn.some(x => /overlaps/.test(x.t)), "four boards: each built, and the two that share a place are named", `${names.length}: ${I.warn.filter(x => /overlaps/.test(x.t)).map(x => x.t).join("; ")}`);
    const q2 = direct({ w: 200, d: 120, h: 45, board: "uno", boardX: -55, more: [{ kind: "relay2", x: 25, y: 25, h: 3 }, { kind: "buck2596", x: 25, y: -25, h: 3 }, { kind: "l298n", x: 76, y: 0, h: 3, hold: "holes" }], lid: "none", cut: [] });
    const I2 = MF.enclosure, l298 = I2.boards.find(b => b.key === "l298n");
    check(closed(q2) && I2.boards.length === 4 && !I2.warn.length && l298.hold === "holes", "moved apart: no warnings; the L298N on its four standoffs, the relay and converter in cradles", I2.boards.map(b => `${b.key}:${b.hold}`).join(", "));
    const q3 = direct({ w: 80, d: 60, h: 30, board: "none", more: [{ kind: "lrs100", x: 0, y: 0 }], lid: "none", cut: [] });
    check(MF.enclosure.warn.some(x => /does not fit/.test(x.t)) && MF.enclosure.boardNeed.w > 130, "a power supply too big for the box: left out, and the box size it needs is known", `needs ${Math.ceil(MF.enclosure.boardNeed.w)} × ${Math.ceil(MF.enclosure.boardNeed.d)} mm`);
  }

  console.log("\nAdd this board's ports");
  for (const [k, rot] of [["uno", false], ["pi", false], ["pi", true], ["esp32devkit", false]]) {
    fresh({ w: 140, d: 110, h: 45, board: k, boardRot: rot, cut: [] }); MF.rebuild(false); await settle();
    MF.addBoardPorts(); await settle();
    const E = st.base.enclosure, I = MF.enclosure, B = BOARDS[k], ports = MF.boardPorts[k];
    // each port's middle, worked out from the board where it ended up, must be inside its opening's bounds
    const bw = rot ? B.d : B.w, bd = rot ? B.w : B.d, missed = [];
    const normal = { x0: [-1, 0], x1: [1, 0], y0: [0, -1], y1: [0, 1] };
    ports.forEach(([edge, along, kind, up]) => {
      const p = { x0: [0, along], x1: [B.w, along], y0: [along, 0], y1: [along, B.d] }[edge];
      let lx = p[0] - B.w / 2, ly = p[1] - B.d / 2, [nx, ny] = normal[edge]; if (rot) { [lx, ly] = [-ly, lx]; [nx, ny] = [-ny, nx]; }
      const px = E.boardX + lx, py = E.boardY + ly, face = nx < 0 ? "left" : nx > 0 ? "right" : ny < 0 ? "front" : "back";
      const u = { front: px, back: -px, left: -py, right: py }[face], v = I.board.top + up;
      const c = E.cut.find(o => o.face === face && o.kind === kind && near(o.u, u, 0.05) && near(o.v, v, 0.05));
      if (!c) missed.push(`${kind}@${face}`);
    });
    // and the board's port edges sit 1 mm inside their walls
    const iw = I.inner[0], id = I.inner[1], against = [...new Set(E.cut.map(c => c.face))].every(f => near({ left: -iw / 2 + 1 + bw / 2, right: iw / 2 - 1 - bw / 2 }[f] ?? E.boardX, E.boardX, 0.05) && near({ front: -id / 2 + 1 + bd / 2, back: id / 2 - 1 - bd / 2 }[f] ?? E.boardY, E.boardY, 0.05));
    check(!missed.length && E.cut.length === ports.length && !I.left.length && closed(MF.parts) && against,
      `${B.label}${rot ? ", turned" : ""}: ${ports.length} openings where its ports are, the board against ${[...new Set(E.cut.map(c => c.face))].join(" and ")}`, missed.join(", ") || I.warn.map(w => w.t).join("; "));
    MF.addBoardPorts(); await settle();
    check(E.cut.length === ports.length, "pressed again: no second set");
  }

  console.log("\nthe search in the lists");
  {
    fresh({ board: "none" }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50);
    const fields = [...document.querySelectorAll("#panel .field")].filter(f => f.querySelector("input.srch"));
    const boardF = fields.find(f => /^Board/.test(f.querySelector("label").textContent)), addF = fields.find(f => /Add an opening/.test(f.querySelector("label").textContent));
    const type = (f, txt) => { const i = f.querySelector("input.srch"); i.value = txt; i.dispatchEvent(new win.Event("input")); return [...f.querySelectorAll("select option")].map(o => o.textContent); };
    const r = boardF && type(boardF, "relay");
    check(r && r.filter(t => /^Relay module/.test(t)).length === 4 && r.length < 15, "typing 'relay' in Board lists the four relay modules (and the rest of Motors and relays)", r && r.length + " shown");
    const e = boardF && type(boardF, "esp8266");
    check(e && e.some(t => /NodeMCU/.test(t)) && e.some(t => /D1 mini/.test(t)), "a search word that is not in the name finds it too ('esp8266': the NodeMCUs and the D1 mini)", e && e.filter(t => !/None|My own/.test(t)).join("; "));
    const o = addF && type(addF, "gland m20");
    check(o && o.length === 1 && /M20/.test(o[0]) && win.MakerForge.state && (await sleep(10), true), "every word must match: 'gland m20' is the M20 gland alone", o && o.join("; "));
    const none = addF && type(addF, "zzzz");
    check(none && addF.querySelector(".srchCount").textContent.startsWith("Nothing found"), "nothing found says so");
  }

  console.log("\na hostile project file");
  {
    const s0 = JSON.parse(MF.projectPayload()).state;
    s0.base.type = "enclosure";
    s0.base.enclosure = Object.assign(s0.base.enclosure || {}, { boardHold: "<script>", more: Array.from({ length: 100 }, (_, i) => i % 3 === 0 ? { kind: "__proto__", x: 1 } : i % 3 === 1 ? { kind: "relay1", x: "far", y: 1e9, h: -5, rot: "yes", hold: 7 } : "junk") });
    const f = new win.File([JSON.stringify({ app: "Maker Forge", v: 6, state: s0 })], "p.json", { type: "application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E = MF.state.base.enclosure;
    check(E.boardHold === "holes" && E.more.length === 4 && E.more.every(m => m.kind === "relay1" && m.x === 0 && m.y === 150 && m.h === 1 && m.rot === false && m.hold === "holes"),
      "a hold that does not exist, 100 extra boards of nonsense: on screw holes; of the first 12, the 4 known boards kept, each number clamped", `${E.more.length} kept`);
    // one with numbers that are not numbers
    s0.base.enclosure.more = [{ kind: "relay1", x: "far", y: 1e9, h: -5, rot: "yes", hold: 7 }];
    const f2 = new win.File([JSON.stringify({ app: "Maker Forge", v: 6, state: s0 })], "p.json", { type: "application/json" }), r1 = MF.rev;
    Object.defineProperty(inp, "files", { value: [f2], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r1; i++) await sleep(30); await settle(); await sleep(1500); await settle();
    const m = MF.state.base.enclosure.more[0];
    check(MF.state.base.enclosure.more.length === 1 && m.x === 0 && m.y === 150 && m.h === 1 && m.rot === false && m.hold === "holes", "a relay at a position that is a word, a billion mm back and a negative height: kept, each number clamped", JSON.stringify(m));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
