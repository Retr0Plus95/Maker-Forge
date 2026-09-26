// Project box / enclosure (Session 11): the box and lid are closed meshes of the right size, every
// kind of opening cuts a hole on every face it may go on, overlaps and misfits are left out with a
// message, screws, lids and board standoffs, the presets, the rulers, and a hostile project file.
//   node tools-enclosure-test.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge, C = MF.core, st = MF.state;
  const fresh = over => { st.base.type = "enclosure"; st.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), over || {}); };
  const build = async over => { fresh(over); MF.rebuild(false); await settle(); return MF.parts; };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const vol = p => C.checkMesh(p.solid).volume, bnd = p => C.solidBounds(p.solid);
  const direct = over => { fresh(over); return MF.buildEnclosure(); };          // the generator alone, no rebuild

  console.log("default box 100 × 64 × 36");
  let P = await build();
  check(P.length === 2 && closed(P), "box and lid, both closed and outward", P.map(p => `${p.name} ${C.checkMesh(p.solid).tris}`).join(", "));
  let b = bnd(P[0]);
  check(Math.abs(b.size[0] - 100) < 1e-3 && Math.abs(b.size[2] - 64) < 1e-3 && Math.abs(b.size[1] - 36) < 1e-3 && Math.abs(b.mn[1]) < 1e-6, "box is exactly 100 × 64 × 36 on the bed", b.size.map(v => v.toFixed(3)).join(" × "));
  const L = bnd(P[1]);
  check(Math.abs(L.size[0] - 100) < 1e-3 && Math.abs(L.size[1] - (2.4 + 3)) < 1e-3 && L.mn[0] > b.mx[0] + 5, "lid beside it, 2.4 mm plate + 3 mm lip", L.size.map(v => v.toFixed(2)).join(" × "));
  check(!MF.enclosure.warn.length && MF.enclosure.count === 3, "three openings, no warnings", MF.enclosure.warn.map(w => w.t).join(" / "));
  const full = await build({ cut: [] }), vFull = vol(full[0]);
  check(vFull < 100 * 64 * 36 * 0.4, "it is hollow", `${vFull.toFixed(0)} mm³`);
  // walls measured: a ray-free check on the volume of a box with no posts and square corners
  const plain = await build({ cut: [], radius: 0, fasten: "none", lid: "none" }), vPlain = vol(plain[0]);
  const want = 100 * 64 * 36 - 96 * 60 * 34;
  check(plain.length === 1 && Math.abs(vPlain - want) < 0.5, "square open box: exactly walls plus floor", `${vPlain.toFixed(1)} vs ${want}`);

  console.log("\nevery opening, on every face it can go on");
  const kinds = Object.keys(MF.cutouts);
  let bad = []; const refs = [];
  for (const k of kinds) for (const face of ["front", "right", "top", "bottom"]) {
    if (k === "lcd2004" && face === "right") continue;            // wider than the side
    const wall = face === "front" || face === "right";
    const c = Object.assign(MF.newOpening(k, face), { u: 0, v: wall ? 70 : 0 });
    const big = { w: 180, d: 140, h: 140, cut: [c] };
    const idx = face === "top" ? 1 : 0, ref = refs[idx] ?? (refs[idx] = vol(direct({ w: 180, d: 140, h: 140, cut: [] })[idx]));
    const Q2 = direct(big), v = vol(Q2[idx]);
    if (!closed(Q2) || !(v < ref - 0.5) || MF.enclosure.warn.length) bad.push(`${k}@${face}: ${closed(Q2) ? "" : "OPEN "}${(ref - v).toFixed(1)} mm³ ${MF.enclosure.warn.map(w => w.t).join(";")}`);
  }
  check(!bad.length, `${kinds.length} kinds × 4 faces cut closed holes with no warnings`, bad.slice(0, 6).join(" | "));

  console.log("\nplacement problems are reported, not silently cut");
  await build({ cut: [{ face: "front", kind: "btn", u: 0, v: 18, dia: 12.2 }, { face: "front", kind: "btn", u: 5, v: 18, dia: 12.2 }] });
  check(MF.enclosure.left.join() === "1" && /overlaps opening 1/.test(MF.enclosure.warn[0].s), "an overlapping opening is left out and named", MF.enclosure.warn.map(w => w.s).join(" | "));
  await build({ cut: [{ face: "front", kind: "usba", u: 49, v: 18 }] });
  check(MF.enclosure.left.length === 1 && /does not fit/.test(MF.enclosure.warn[0].s), "one on the rounded corner is left out", MF.enclosure.warn.map(w => w.t).join(" | "));
  await build({ cut: [{ face: "front", kind: "usba", u: 0, v: 33 }] });
  check(/behind the lid's lip/.test(MF.enclosure.warn.map(w => w.t).join()), "one behind the lid's lip is flagged", MF.enclosure.warn.map(w => w.t).join(" | "));
  check(MF.checks.list.some(r => /behind the lid/.test(r.t)), "and the warning reaches the checks list");
  await build({ lid: "none", cut: [{ face: "top", kind: "btn", u: 0, v: 0 }] });
  check(MF.enclosure.left.length === 1 && MF.parts.length === 1, "an opening on a lid that does not exist is left out");

  console.log("\nscrews, lids and heads");
  for (const [tag, over] of [["heat inserts, countersunk", {}], ["self-tapping, counterbored, 4 mm lid", { fasten: "screw", head: "bore", lidThick: 4 }],
                             ["plain holes, M4", { head: "plain", screw: "M4" }], ["press-fit lid, no posts", { lid: "press" }], ["no lid", { lid: "none" }],
                             ["square corners", { radius: 0 }], ["round corners 20 mm", { radius: 20, cut: [] }], ["flat lid, no lip", { lipH: 0 }]]) {
    const Q = direct(over);
    check(closed(Q) && !MF.enclosure.warn.length, tag, `${Q.length} parts, ${Q.map(p => C.checkMesh(p.solid).tris).join("+")} tris`);
  }
  await build({ head: "bore", lidThick: 2 });
  check(/too thin for counterbored/.test(MF.enclosure.warn.map(w => w.t).join()), "a lid too thin for counterbores says how thick it should be", MF.enclosure.warn.map(w => w.s).join(" | "));
  // the countersink: M3 heads are 6 mm, holes 3.4 mm, so 1.3 mm deep at 45°
  const sink = direct({ cut: [] })[1], flat = direct({ cut: [], head: "plain" })[1];
  const cone = Math.PI / 3 * 1.3 * (3 * 3 + 3 * 1.7 + 1.7 * 1.7) - Math.PI * 1.7 * 1.7 * 1.3;
  check(Math.abs((vol(flat) - vol(sink)) - 4 * cone) < 4 * cone * 0.15, "four countersinks remove four 90° cones", `${(vol(flat) - vol(sink)).toFixed(1)} vs ${(4 * cone).toFixed(1)} mm³`);

  console.log("\nboards");
  for (const brd of ["uno", "mega", "pi", "pizero", "pico", "custom"]) {
    const Q = direct({ w: 140, d: 90, h: 40, board: brd, cut: [] });
    const I = MF.enclosure;
    check(closed(Q) && I.board && !I.warn.length, `${brd}: standoffs, board top at ${I.board && I.board.top.toFixed(1)} mm`, I.warn.map(w => w.t).join(" | "));
  }
  await build({ board: "mega", cut: [] });
  check(/does not fit/.test(MF.enclosure.warn.map(w => w.t).join()), "a Mega in the 100 mm box: does not fit", MF.enclosure.warn.map(w => w.s).join(" | "));

  console.log("\npresets");
  for (const k of ["Project box", "Power bank box", "PSU box", "Raspberry Pi case"]) {
    [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === k).click(); await settle(); await sleep(150); await settle();
    const I = MF.enclosure;
    check(MF.state.base.type === "enclosure" && closed(MF.parts) && I && !I.warn.length && I.count === MF.state.base.enclosure.cut.length,
      `${k}: ${I && I.count} openings, closed, no warnings`, I && I.warn.map(w => w.s).join(" | "));
    let p = null; for (let i = 0; i < 400 && !(p = MF.print); i++) await sleep(25);
    check(!!p, `  printability check ran`, p && `support ${p.overhang.area.toFixed(0)} mm², bridges ${p.flats.filter(f => f.kind === "bridge").length}, bed ${p.contact.area.toFixed(0)} mm²`);
  }

  console.log("\nrulers");
  const rulerOn = () => { let n = 0; MF.bedHelper.traverse(o => { if (o.isSprite) n++; }); return n; };
  const n1 = rulerOn();
  check(n1 > 10, "labels on the bed axes and the model", n1 + " labels");
  document.querySelector("#vRuler").click(); await sleep(50);
  check(rulerOn() === 0, "the ruler button hides them");
  document.querySelector("#vRuler").click(); await sleep(50);

  console.log("\nhostile project file");
  const bad2 = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state)) };
  bad2.state.items = [];
  bad2.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { lid: "<img src=x onerror=alert(1)>", screw: "M99", board: "__proto__",
    cut: [{ face: "<b>", kind: "<script>", u: 1e9, v: -1e9, dia: "12" }, "junk", null, { face: "top", kind: "fan", size: 33, style: "evil" }] });
  const f = new win.File([JSON.stringify(bad2)], "evil.json", { type: "application/json" });
  const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.state.base.enclosure.lid !== "screw"; i++) await sleep(30);
  await settle();
  const E = MF.state.base.enclosure;
  check(E.lid === "screw" && E.screw === "M3" && E.board === "none", "bad choices fall back to safe ones", `${E.lid}, ${E.screw}, ${E.board}`);
  check(E.cut.length === 2 && E.cut[0].kind === "round" && E.cut[0].face === "front" && E.cut[0].u === 400 && E.cut[0].v === -400, "bad openings are cleaned or dropped", JSON.stringify(E.cut[0]));
  check(E.cut[1].size === 40 && E.cut[1].style === "rings", "a fan with an unknown size gets the default", JSON.stringify(E.cut[1]));
  check(!document.querySelector("#panel img[src=x]") && !document.body.innerHTML.includes("onerror=alert"), "nothing injected into the page");

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
