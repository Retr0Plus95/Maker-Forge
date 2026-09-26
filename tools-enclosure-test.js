// Project box / enclosure (Session 11): the box and lid are closed meshes of the right size, every
// kind of opening cuts a hole on every face it may go on, overlaps and misfits are left out with a
// message, screws, lids and board standoffs, the presets, the rulers, and a hostile project file.
// Session 12: engraved labels, magnet lids, foot recesses, notches, the sliding lid and the fit test.
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

  console.log("\nSession 12: labels, magnets, feet, pointed tops, notches, sliding lid, logo, fit test");
  {
    const op = (kind, face, over) => Object.assign(MF.newOpening(kind, face), over);   // with the part's real size
    const none = vol(direct({ cut: [op("usbc", "front", { u: 0, v: 14 })] })[0]);
    const Q = direct({ cut: [op("usbc", "front", { u: 0, v: 14, label: "USB-C" })] });
    check(closed(Q) && !MF.enclosure.warn.length && none - vol(Q[0]) > 2, "a label is engraved into the wall", `${(none - vol(Q[0])).toFixed(1)} mm³ cut`);
    direct({ cut: [op("usbc", "front", { u: 0, v: 3, label: "USB-C" })] });
    check(/does not fit below/.test(MF.enclosure.warn.map(w => w.s).join()), "a label with no room below is left out and said so", MF.enclosure.warn.map(w => w.s).join(" | "));
    const Q2 = direct({ cut: [op("btn", "top", { u: 0, v: 5, label: "RESET" }), op("round", "bottom", { u: 0, v: 0, dia: 6, label: "SERIAL 01" })] });
    check(closed(Q2) && !MF.enclosure.warn.length, "labels on the lid and the floor", `${Q2.map(p => C.checkMesh(p.solid).tris).join("+")} tris`);
    const mag = direct({ cut: [], lid: "magnet", magnet: "6x2", lidThick: 3, lipH: 0 });
    const pocket = Math.PI * 3.1 * 3.1 * 2.2;
    check(closed(mag) && !MF.enclosure.warn.length && mag.length === 2, "magnet lid: posts and lid closed", MF.enclosure.fastenText);
    const flatLid = vol(direct({ cut: [], lid: "press", lidThick: 3, lipH: 0 })[1]);
    check(Math.abs((flatLid - vol(mag[1])) - 4 * pocket) < 4 * pocket * 0.05, "four magnet pockets in the lid", `${(flatLid - vol(mag[1])).toFixed(1)} vs ${(4 * pocket).toFixed(1)} mm³`);
    direct({ cut: [], lid: "magnet", magnet: "8x3", lidThick: 2.4 });
    check(/too thin for the magnets/.test(MF.enclosure.warn.map(w => w.t).join()), "a lid too thin for the magnets says so", MF.enclosure.warn.map(w => w.s).join(" | "));
    const v0 = vol(direct({ cut: [] })[0]), feet = direct({ cut: [], feet: "recess", footSize: "8", footDepth: 1 });
    const recess = Math.PI * 4.15 * 4.15 * 1;
    check(closed(feet) && Math.abs((v0 - vol(feet[0])) - 4 * recess) < 4 * recess * 0.03, "four foot recesses under the floor", `${(v0 - vol(feet[0])).toFixed(1)} vs ${(4 * recess).toFixed(1)} mm³`);
    direct({ cut: [op("round", "bottom", { u: 44, v: 26, dia: 6 })] });
    check(/corner post/.test(MF.enclosure.warn.map(w => w.s).join()), "a floor opening over a corner post is left out", MF.enclosure.warn.map(w => w.s).join(" | "));
    const sl = direct({ lid: "slide", cut: [op("usbc", "front", { u: 0, v: 12 }), op("vent", "top", { u: 0, v: 0, w: 30, h: 12, label: "AIR" })] });
    const Es = MF.state.base.enclosure, gr = Math.min(Math.max(Es.wall * 0.5, 0.6), Math.max(0.6, Es.wall - 0.6));
    let gap = Infinity; const lp = sl[1].solid.pos, off = -(Es.w + 10);
    for (let i = 0; i < lp.length; i += 3) gap = Math.min(gap, (Es.w / 2 - Es.wall + gr - lp[i + 1]) - Math.abs(lp[i] + off));
    check(closed(sl) && !MF.enclosure.warn.length && Math.abs(gap - Es.fit) < 1e-4, "sliding lid: closed, and it clears the 45° rails by the fit gap", `${gap.toFixed(4)} mm`);
    const pi0 = direct({ lipH: 3, cut: [op("rect", "right", { u: 0, v: 18, w: 40, h: 10, r: 1 })] }), pin = direct({ lipH: 3, cut: [op("rect", "right", { u: 0, v: 18, w: 40, h: 10, r: 1, notch: true })] });
    check(closed(pin) && !MF.enclosure.warn.length && vol(pin[0]) < vol(pi0[0]) - 100 && vol(pin[1]) < vol(pi0[1]) - 20, "a notch runs to the top edge, and the lid's lip has a gap there",
      `box −${(vol(pi0[0]) - vol(pin[0])).toFixed(0)} mm³, lid −${(vol(pi0[1]) - vol(pin[1])).toFixed(0)} mm³`);
    // a wide port prints its top as a bridge; a pointed top needs none
    const waitPrint = async () => { let q = null; for (let i = 0; i < 400 && !(q = MF.print); i++) await sleep(25); return q; };
    const usba = top => Object.assign(MF.newOpening("usba", "front"), { u: 0, v: 14, top });
    await build({ cut: [usba("flat")] }); const flatSup = (await waitPrint()).overhang.area;
    await build({ cut: [usba("pointed")] }); const ptSup = (await waitPrint()).overhang.area;
    check(closed(MF.parts) && flatSup > 5 && ptSup < 0.5, "a pointed top on a wide port removes its support", `${flatSup.toFixed(1)} -> ${ptSup.toFixed(1)} mm²`);
    // the logo on the lid: a picture dropped on the Art tab, inlaid in its own colours
    {
      const { encodePNG } = require("./tools-test-env.js"), W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, dx = x - 120, dy = y - 90, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const col = r < 40 * (0.62 + 0.38 * Math.cos(5 * a)) ? [240, 190, 30] : r < 75 ? [209, 73, 91] : [255, 255, 255];
        px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
      }
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "art").click(); await sleep(50);
      const ev = new win.Event("drop", { bubbles: true, cancelable: true }); ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
      document.querySelector("#drop").dispatchEvent(ev);
      for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge" && d.src); i++) await sleep(30);
      [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(50);
      const lid0 = vol((await build({ cut: [] }))[1]);
      const Pl = await build({ cut: [], logo: { on: true, mode: "inlay", width: 40, x: 0, y: 0, depth: 0.6 } });
      const logos = Pl.filter(p => /Lid logo/.test(p.name)), lv = logos.reduce((a, p) => a + vol(p), 0);
      check(closed(Pl) && logos.length === 2 && Math.abs((lid0 - vol(Pl[1])) - lv) < lv * 0.01, "a logo inlaid into the lid in two colours, filling exactly what the lid lost",
        `${logos.map(p => p.name).join(", ")}: ${lv.toFixed(1)} mm³ vs ${(lid0 - vol(Pl[1])).toFixed(1)}`);
      const Pe = await build({ cut: [], logo: { on: true, mode: "engrave", width: 40, x: 0, y: 0, depth: 0.6 } });
      check(closed(Pe) && Pe.length === 2 && Math.abs((lid0 - vol(Pe[1])) - lv) < lv * 0.01, "or engraved into it", `${(lid0 - vol(Pe[1])).toFixed(1)} mm³ cut`);
      await build({ cut: [op("vent", "top", { u: 0, v: 0, w: 30, h: 12 })], logo: { on: true, mode: "inlay", width: 40, x: 0, y: 0, depth: 0.6 } });
      check(/overlaps opening 1/.test(MF.enclosure.warn.map(w => w.s).join()), "a logo over a lid opening is left off and said so", MF.enclosure.warn.map(w => w.s).join(" | "));
      const Ps = await build({ lid: "slide", cut: [], logo: { on: true, mode: "inlay", width: 30, x: 0, y: 0, depth: 0.6 } });
      check(closed(Ps) && Ps.filter(p => /Lid logo/.test(p.name)).length === 2, "and on a sliding lid, in its top face");
      MF.state.items.splice(0); MF.state.active = -1;
    }
    // put each lid back on its box: every point of its lip stays the fit gap inside the rounded walls
    const lipGap = over => { const Q = direct(over), Ex = MF.state.base.enclosure, lid = Q[1].solid, ri = Ex.radius - Ex.wall, iw = Ex.w - 2 * Ex.wall, id = Ex.d - 2 * Ex.wall; let g = Infinity;
      for (let i = 0; i < lid.pos.length; i += 3) { if (lid.pos[i + 1] < Ex.lidThick + 1e-6) continue;
        const x = lid.pos[i] - (Ex.w + 10), z = -lid.pos[i + 2], qx = Math.abs(x) - (iw / 2 - ri), qz = Math.abs(z) - (id / 2 - ri);
        g = Math.min(g, qx > 0 && qz > 0 ? ri - Math.hypot(qx, qz) : Math.min(iw / 2 - Math.abs(x), id / 2 - Math.abs(z))); }
      return g; };
    const gaps = [{ lid: "press" }, { lid: "press", cut: [op("rect", "right", { u: 0, v: 18, w: 30, h: 10, notch: true })] }, { lid: "screw", cut: [op("rect", "front", { u: 0, v: 18, w: 30, h: 10, notch: true })] }, { lid: "magnet", lidThick: 3 }].map(lipGap);
    check(gaps.every(g => Math.abs(g - 0.2) < 1e-3), "every lid's lip clears the rounded walls by the fit gap (press, press with a notch, screwed with a notch, magnet)", gaps.map(g => g.toFixed(3)).join(", "));
    const tb = direct({ test: true, cut: MF.defaults.enclosure.cut.concat([op("btn", "front", { u: 30, v: 18, dia: 12.2 })]) });
    const Ti = MF.enclosure;
    check(closed(tb) && !Ti.warn.length && Ti.test && Ti.count === 3 && Ti.size[0] < 100, "fit test: a smaller box with one of each opening", `${Ti.size.map(v => v.toFixed(0)).join(" × ")}, ${Ti.count} openings`);
  }

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
  // Session 12 settings in a hostile file
  const bad3 = { app: "maker-forge", state: JSON.parse(JSON.stringify(MF.state)) };
  bad3.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { lid: "magnet", magnet: "__proto__", feet: "<x>", footSize: "999", test: "yes",
    logo: { on: "yes", width: 1e9, x: -1e9, mode: "<svg onload=alert(2)>", depth: -5 }, labelH: 1e6, labelDepth: -3,
    cut: [{ face: "front", kind: "usbc", u: 0, v: 14, label: "<img src=x onerror=alert(3)>", labelPos: "sideways", top: "evil", notch: "yes" }] });
  const f3 = new win.File([JSON.stringify(bad3)], "evil2.json", { type: "application/json" });
  Object.defineProperty(inp, "files", { value: [f3], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && MF.state.base.enclosure.lid !== "magnet"; i++) await sleep(30);
  await settle();
  const E3 = MF.state.base.enclosure, c3 = E3.cut[0];
  check(E3.magnet === "6x2" && E3.feet === "none" && E3.footSize === "8" && E3.test === false, "bad magnet, feet and fit-test values fall back", `${E3.magnet}, ${E3.feet}, ${E3.footSize}, ${E3.test}`);
  check(E3.logo.on === false && E3.logo.mode === "inlay" && E3.logo.width === 300 && E3.logo.x === -200 && E3.logo.depth === 0.2, "the lid logo's settings are clamped", JSON.stringify(E3.logo));
  check(E3.labelH === 15 && E3.labelDepth === 0.2, "label size and depth are clamped", `${E3.labelH}, ${E3.labelDepth}`);
  check(/^[A-Z0-9\-+\/.:% ]*$/.test(c3.label) && c3.labelPos === "below" && c3.top === "flat" && c3.notch === false, "an opening's label keeps only letters it can engrave", JSON.stringify(c3.label));
  check(!document.body.innerHTML.includes("onerror=alert") && !document.body.innerHTML.includes("onload=alert"), "still nothing injected");

  console.log("\nSession 13: round holes, the box grows to fit, boards that do not fit");
  const $$ = q => [...document.querySelectorAll(q)];
  await settle(); await sleep(300); await settle();
  const near = (a, c, tol) => Math.abs(a - c) <= tol;
  // projects were loaded above, so the state object is a new one: always go through MF.state
  const freshNow = over => { MF.state.base.type = "enclosure"; MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), over || {}); };
  const directNow = over => { freshNow(over); return MF.buildEnclosure(); };
  const buildNow = async over => { freshNow(over); MF.rebuild(false); await settle(); return MF.parts; };
  const holeVol = async over => { const v0 = vol(directNow({ cut: [], ...over })[0]); const v1 = vol(directNow({ cut: [{ ...MF.newOpening("round", "front"), dia: 20, v: 18 }], ...over })[0]); return v0 - v1; };
  const round = await holeVol({}), wantRound = Math.PI * 10.2 * 10.2 * 2, tear = await holeVol({ teardrop: true });
  check(Math.abs(round - wantRound) / wantRound < 0.03, "a 20 mm hole in a wall is round by default", `${round.toFixed(0)} mm³ removed, a round one ${wantRound.toFixed(0)}`);
  check(tear > round * 1.05, "pointed tops are still there when asked for", `${tear.toFixed(0)} mm³`);
  const load = async (v, teardrop) => {
    const st = JSON.parse(JSON.stringify(Object.assign({}, MF.state, { items: [] }))); st.base.type = "enclosure"; st.base.enclosure.teardrop = teardrop; st.base.enclosure.w = 101 + (v === 5 ? 1 : 0);
    const f = new win.File([JSON.stringify({ app: "Maker Forge", v, state: st })], "p.json", { type: "application/json" });
    const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.state.base.enclosure.w !== st.base.enclosure.w; i++) await sleep(30); await settle();
    return MF.state.base.enclosure.teardrop;
  };
  check(await load(4, true) === false && await load(5, true) === true, "older projects open with round holes; a newer one keeps pointed tops when it asked for them");
  // the PSU box's 60 mm fan made 120 mm through its own menu
  $$("#presetGallery button").find(b => b.dataset.k === "PSU box").click(); await settle();
  MF.state.base.enclosure.teardrop = false;
  $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40);
  $$("#secrail button").find(b => b.dataset.title === "Openings").click(); await sleep(40);
  let fanSel = $$("#panel select").find(x => [...x.options].some(o => /120 mm fan/.test(o.textContent)));
  fanSel.value = "120"; fanSel.dispatchEvent(new win.Event("change")); await settle();
  let E4 = MF.state.base.enclosure, fanIdx = E4.cut.findIndex(c => c.kind === "fan");
  check(!MF.enclosure.left.length && E4.d >= 120 && E4.h >= 115 && /box grew/.test(document.querySelector("#notice").textContent), "a 120 mm fan on a 110 × 75 mm side: the box grows and the fan moves up so it fits",
    `${E4.w} × ${E4.d} × ${E4.h}, fan at ${E4.cut[fanIdx].v} mm: "${document.querySelector("#notice").textContent.slice(0, 70)}"`);
  check(closed(MF.parts), "and it is still a closed box");
  E4.grow = false; fanSel = $$("#panel select").find(x => [...x.options].some(o => /140 mm fan/.test(o.textContent)));
  fanSel.value = "140"; fanSel.dispatchEvent(new win.Event("change")); await settle(); await sleep(50);
  check(MF.enclosure.left.includes(fanIdx) && MF.checks.list.some(l => /left out/.test(l.t)) && $$("#panel .result.warn b").some(b => /Not in the box yet/.test(b.textContent)),
    "with growing switched off, a 140 mm fan is left out, said on its card and in the checks");
  $$("#panel button").find(b => /Make it fit/.test(b.textContent)).click(); await settle();
  check(!MF.enclosure.left.length && MF.state.base.enclosure.d >= 140 && MF.state.base.enclosure.h >= 130, "Make it fit grows the box for it", `${E4.w} × ${E4.d} × ${E4.h}`);
  // a board bigger than the box: no standoffs outside it; picking it grows the box
  P = await buildNow({ w: 50, d: 40, h: 30, board: "pi", cut: [] });
  b = bnd(P[0]);
  check(near(b.size[0], 50, 1e-3) && near(b.size[2], 40, 1e-3) && MF.enclosure.warn.some(w => /does not fit/.test(w.t) && /left out/.test(w.s)), "a Raspberry Pi in a 50 × 40 mm box: warned, and no standoffs outside the box", b.size.map(v => v.toFixed(1)).join(" x "));
  await buildNow({ w: 50, d: 40, h: 30, board: "none", cut: [] }); MF.render(); await sleep(40);
  $$("#secrail button").find(x => /board/i.test(x.dataset.title || "")).click(); await sleep(40);
  const boardSel = $$("#panel select").find(x => [...x.options].some(o => o.value === "pi"));
  boardSel.value = "pi"; boardSel.dispatchEvent(new win.Event("change")); await settle();
  const E5 = MF.state.base.enclosure;
  check(E5.w >= 90 && E5.d >= 60 && !MF.enclosure.warn.some(w => /does not fit/.test(w.t)) && MF.enclosure.board && MF.enclosure.board.fits !== false, "picking the Pi for that box grows it round the board", `${E5.w} × ${E5.d} × ${E5.h}`);

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
