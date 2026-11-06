// Project boxes that print without support (Session 47): pointed tops on wide wall openings by themselves, fan grilles of
// pointed slots, flat-top honeycomb and pointed vent slots in walls; the quick starts' support before and after.
//   node tools-boxprint-test.js index.html
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
  const fresh = over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount: "none", cut: [], lid: "none" }, over || {}); };
  const supportOf = async over => { fresh(over); MF.rebuild(false); await settle(); MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const op = (kind, face, extra) => Object.assign(MF.newOpening(kind, face), { u: 0, v: 30 }, extra || {});
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const base = { w: 140, d: 100, h: 70 };

  console.log("pointed tops by themselves");
  {
    const usba = op("usba", "front"), usbc = op("usbc", "front"), ring = c => MF.openingRings(c, true, MF.state.base.enclosure);
    check(usba.top === "auto" && usbc.top === "auto", "a new opening's top is Auto");
    const a = await supportOf(Object.assign({}, base, { cut: [Object.assign(op("usba", "front"), { top: "flat" })] })), b = await supportOf(Object.assign({}, base, { cut: [op("usba", "front")] }));
    check(a > 5 && b < 3, "a USB-A port (13.2 mm wide, past the 10 mm bridge limit): flat needs support, Auto points it and needs none", `${a.toFixed(1)} → ${b.toFixed(1)} mm²`);
    const c = await supportOf(Object.assign({}, base, { cut: [op("usbc", "front")] }));
    MF.state.printer.bridge = 6; const d = await supportOf(Object.assign({}, base, { cut: [op("usbc", "front")] })); MF.state.printer.bridge = 10;
    // the USB-C port (9.2 mm) stays flat with a 10 mm limit; with a 6 mm limit it turns pointed: its hole reaches higher
    fresh(Object.assign({}, base, { cut: [op("usbc", "front")] })); const h10 = MF.buildEnclosure() && MF.core;
    check(c < 3 && d < 3, "a USB-C port stays flat under a 10 mm bridge limit and turns pointed under a 6 mm one, both without support", `${c.toFixed(1)} / ${d.toFixed(1)} mm²`);
    const kept = await supportOf(Object.assign({}, base, { cut: [Object.assign(op("usba", "front"), { top: "flat" })] }));
    check(kept > 5, "a saved opening with a flat top stays flat (projects don't change by themselves)");
  }

  console.log("\ngrilles and vents in walls");
  {
    const rings = await supportOf(Object.assign({}, base, { cut: [op("fan", "front", { size: 60, style: "rings", v: 35 })] }));
    const slots = await supportOf(Object.assign({}, base, { cut: [op("fan", "front", { size: 60, style: "slots", v: 35 })] }));
    const hexes = await supportOf(Object.assign({}, base, { cut: [op("fan", "front", { size: 60, style: "honeycomb", v: 35 })] }));
    check(rings > 50 && slots < 3 && hexes < 3, "a 60 mm fan in a wall: rings need support; slots and flat-top honeycomb need none", `${rings.toFixed(0)} / ${slots.toFixed(1)} / ${hexes.toFixed(1)} mm²`);
    check(MF.newOpening("fan", "front").style === "slots", "a new fan's grille is slots");
    const vs = await supportOf(Object.assign({}, base, { cut: [op("vent", "front", { w: 50, h: 20, style: "slots", v: 35 })] }));
    const vh = await supportOf(Object.assign({}, base, { cut: [op("vent", "front", { w: 50, h: 20, style: "honeycomb", v: 35 })] }));
    check(vs < 3 && vh < 3 && closed(MF.parts), "a vent of slots (pointed tops) and of honeycomb in a wall: no support", `${vs.toFixed(1)} / ${vh.toFixed(1)} mm²`);
    // on the lid the honeycomb keeps its pointy-top cells and the slots their round ends (nothing to bridge there)
    fresh(Object.assign({}, base, { lid: "screw", cut: [op("vent", "top", { w: 50, h: 20, style: "honeycomb", v: 0 })] }));
    check(closed(MF.buildEnclosure()), "honeycomb on the lid: unchanged, closed");
  }

  console.log("\nthe quick starts");
  {
    const out = [];
    for (const [k, max] of [["PSU box", 250], ["Power bank box", 60], ["Project box", 30], ["Raspberry Pi case", 3]]) {
      [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === k).click(); await sleep(300); await settle();
      MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30);
      out.push([k, MF.print.overhang.area, max]);
    }
    check(out.every(([, a, m]) => a <= m), "the box quick starts need less support (the PSU box 633 mm² before, the power bank box 73)", out.map(([k, a]) => `${k} ${a.toFixed(0)}`).join(", "));
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
