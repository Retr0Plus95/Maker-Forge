// How boards are held (Session 59): crush ribs in a cradle (the default), snap clips, loose; snap pins on standoffs instead
// of screws; the parts list; support; a hostile project; the panel.
//
//   node tools-grip-test.js index.html
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
  // a 4-channel relay module (no holes listed: a cradle) in the middle of the box, 5 mm up
  const B = MF.boards.relay2, base = g => ({ w:120, d:90, h:30, lid:"none", cut:[], board:"relay2", boardX:0, boardY:0, standH:5, boardGrip:g });
  console.log("in a cradle");
  {
    fresh(base("loose")); const ql = MF.buildEnclosure(), vl = vol(part(ql, /^Box$/));
    fresh(base("ribs")); const qr = MF.buildEnclosure(), br = part(qr, /^Box$/), vr = vol(br), I = MF.enclosure;
    const long = B.w >= B.d, L = long ? B.w : B.d, S2 = long ? B.d : B.w, fl = 2, bTop = fl + 5 + 1.6;
    // a rib on a short side, in its middle: 0.15 mm into the board's edge
    const ex = (long ? B.w : B.d)/2, at = (u, v, z) => long ? solidAt(br, u, v, z) : solidAt(br, v, u, z);
    check(closed(qr) && !I.warn.length && I.boards[0].grip === "ribs" && vr > vl + 2 && at(ex - 0.07, 0, fl + 6) && !at(ex - 0.3, 0, fl + 6),
      "snug fit (the default): ribs inside the rim press 0.15 mm into the board's edges", `${(vr - vl).toFixed(1)} mm³ of ribs`);
    fresh(base("clips")); const qc = MF.buildEnclosure(), bc = part(qc, /^Box$/), Ic = MF.enclosure, sy = S2/2, atc = (u, v, z) => long ? solidAt(bc, u, v, z) : solidAt(bc, v, u, z);
    check(closed(qc) && !Ic.warn.length && Ic.boards[0].grip === "clips" && atc(0, sy + 0.8, fl + 3) && atc(0, sy, bTop + 0.4) && !atc(0, sy - 0.3, bTop - 0.5) && !atc(10, sy + 0.8, fl + 3),
      "snap clips: a beam standing free in the middle of each long side, its hook over the board's top edge, the board's space clear under it");
    const s1 = await support(base("ribs")), s2 = await support(base("clips"));
    check(s1 === 0 && s2 === 0, "ribs and clips need no support", `${s1}, ${s2} mm²`);
  }
  console.log("\nsnap pins");
  {
    const pi = o => Object.assign({ w:120, d:90, h:30, lid:"none", cut:[], board:"pi", boardX:0, boardY:0, standH:5 }, o);
    fresh(pi({})); MF.buildEnclosure(); const screws = MF.enclosure.need.map(([n, w]) => `${n} × ${w}`).join(" | ");
    fresh(pi({ boardPins:true })); const q = MF.buildEnclosure(), box = part(q, /^Box$/), I = MF.enclosure, so = MF.boards.pi.holes[0];
    const x = so[0] - MF.boards.pi.w/2, y = so[1] - MF.boards.pi.d/2, z = 2 + 5;
    check(closed(q) && !I.warn.length && I.boards[0].grip === "pins" && solidAt(box, x, y, z - 1) && !solidAt(box, x, y, z + 1) && solidAt(box, x + 0.4 + 0.6, y, z + 1) && solidAt(box, x + 0.4 + 0.6, y, z + 2.2),
      "the Pi on snap pins: solid standoffs, each with a split pin (a slot down its middle) and a barb over the board");
    const N = I.need.map(([n, w]) => `${n} × ${w}`).join(" | ");
    check(/screws, 6 mm long, for the boards/.test(screws) && !/for the boards/.test(N), "the parts list drops the board screws", N);
    const s3 = await support(pi({ boardPins:true }));
    check(s3 === 0, "snap pins need no support", `${s3} mm²`);
  }
  console.log("\na hostile project and the panel");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { boardGrip:"<x>", boardPins:"yes", more:[{ kind:"relay2", x:0, y:0, grip:"evil", pins:1 }, { kind:"relay2", x:0, y:0, grip:"clips", pins:true }] });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E2 = MF.state.base.enclosure;
    check(E2.boardGrip === "ribs" && E2.boardPins === false && !("grip" in E2.more[0]) && !("pins" in E2.more[0]) && E2.more[1].grip === "clips" && E2.more[1].pins === true, "a hostile project: only the grips there are, pins only when true");
    fresh(base("ribs")); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    let txt = document.querySelector("#panel").textContent;
    const cr = /Snug fit \(ribs\)/.test(txt) && /Snap clips/.test(txt);
    fresh({ w:120, d:90, h:30, lid:"none", cut:[], board:"pi" }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    txt = document.querySelector("#panel").textContent;
    check(cr && /Snap pins \(no screws\)/.test(txt), "the panel: the grip for a cradle, screws or snap pins for a board with holes");
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
