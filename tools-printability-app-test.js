// Printability in the app: the checks shown for real objects, Optimize and Revert on an imported
// STL, mirroring plus a turn, the brim in the export, and a hostile project file.
//   node tools-printability-app-test.js index.html
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
async function analysed() {                       // wait for the background check to finish
  const MF = win.MakerForge;
  for (let i = 0; i < 300 && !MF.print; i++) await sleep(30);
  return MF.print;
}
const choose = async v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); };
const rows = () => win.MakerForge.checks.list.map(r => `${r.k}: ${r.t}`);
function closedAndSolid(parts, C) {
  return parts.every(p => { const r = C.checkMesh(p); return r.open === 0 && C.signedVolume(p) > 0; });
}
// binary STL, Z up like most CAD exports
function stl(solids) {
  const tris = []; solids.forEach(s => { for (let i = 0; i < s.idx.length; i += 3) tris.push([0, 1, 2].map(k => [s.pos[s.idx[i + k] * 3], -s.pos[s.idx[i + k] * 3 + 2], s.pos[s.idx[i + k] * 3 + 1]])); });
  const b = Buffer.alloc(84 + tris.length * 50); b.writeUInt32LE(tris.length, 80);
  tris.forEach((t, i) => { const o = 84 + i * 50; t.forEach((v, k) => v.forEach((c, j) => b.writeFloatLE(c, o + 12 + k * 12 + j * 4))); });
  return b;
}
async function setFile(input, name, bytes, type) {
  const f = new win.File([bytes], name, { type });
  Object.defineProperty(input, "files", { value: [f], configurable: true });
  input.dispatchEvent(new win.Event("change"));
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge, C = MF.core;

  console.log("sphere");
  await choose("sphere");
  let p = await analysed();
  check(p && p.overhang.area > 100, "needs support under its lower half", p && p.overhang.area.toFixed(0) + " mm²");
  check(p && p.contact.brimWhy === "small", "small contact: brim suggested", p && p.contact.area.toFixed(1) + " mm²");
  check(rows().some(r => /^warn: Needs support/.test(r)) && rows().some(r => /^warn: Small contact/.test(r)), "both shown in the checks");
  const volOf = ex => ex.reduce((a, q) => a + C.checkMesh(q).volume, 0), v0 = volOf(MF.exportParts());
  await MF.optimize(); await settle();
  check(!MF.state.model.orient, "Optimize cannot improve a sphere, so it does not turn it", JSON.stringify(MF.state.model.orient));
  check(MF.state.model.brim === 5, "but it adds a brim", MF.state.model.brim);
  let ex = MF.exportParts();
  check(ex.length && closedAndSolid(ex, C), "export with the brim is closed", ex.map(q => C.checkMesh(q).tris).join(","));
  // the brim reaches 5 mm past the first-layer outline, a circle of about sqrt(2 r h) = 2.6 mm at h = 0.1
  const rc = Math.sqrt(2 * MF.state.base.sphere.dia / 2 * 0.1), ring = Math.PI * ((rc + 5) ** 2 - rc ** 2) * 0.2, dv = volOf(ex) - v0;
  check(Math.abs(dv - ring) < ring * 0.25, "the brim adds a 0.2 mm ring reaching 5 mm past the contact", `${dv.toFixed(1)} mm³, expected about ${ring.toFixed(1)}`);
  p = await analysed();
  check(rows().some(r => /^ok: Sits well on the bed/.test(r)), "the check now says it sits well", rows().filter(r => /bed/.test(r)).join(" | "));
  MF.revertOptimize(); await settle();
  check(MF.state.model.brim === 0, "Revert removes the brim again", MF.state.model.brim);

  console.log("\nflat box");
  await choose("box");
  MF.examples.drop(); MF.rebuild(false); await settle();      // the bare box, without its example picture (Session 19)
  p = await analysed();
  check(p && p.overhang.area < 3 && !p.thin.length && !p.contact.brimWhy, "nothing to fix", p && `${p.overhang.area.toFixed(1)} mm², ${p.thin.length} thin, contact ${p.contact.area.toFixed(0)}`);
  check(MF.checks.list.filter(r => r.k !== "ok").every(r => !/support|thin|bed|Barely/i.test(r.t)), "no printability warnings", rows().filter(r => !/^ok/.test(r)).join(" | "));

  console.log("\nimported STL: a table standing on its legs");
  const box = (x0, y0, z0, x1, y1, z1) => { const ring = [[x0, -z0], [x1, -z0], [x1, -z1], [x0, -z1]]; return C.extrudePolysAt([{ outer: C.area2(ring) > 0 ? ring : ring.reverse(), holes: [] }], y0, y1); };
  const legs = [[-20, -20], [17, -20], [-20, 17], [17, 17]].map(([x, z]) => box(x, 0, z, x + 3, 20, z + 3));
  await setFile(document.querySelector("#stlInput"), "table.stl", stl([...legs, box(-20, 20, -20, 20, 23, 20)]), "model/stl");
  for (let i = 0; i < 100 && MF.state.base.type !== "stl"; i++) await sleep(30);
  await settle();
  p = await analysed();
  const before = p && p.overhang.area;
  check(before > 1000, "needs support under the top", before && before.toFixed(0) + " mm²");
  const vol0 = MF.exportParts().reduce((a, q) => a + C.checkMesh(q).volume, 0);
  await MF.optimize(); await settle();
  const R = MF.state.model.orient;
  check(R && Math.abs(R[4] + 1) < 1e-6, "Optimize turns it upside down", JSON.stringify(R));
  p = await analysed();
  check(p && p.overhang.area < 3, "now needs no support", p && p.overhang.area.toFixed(1) + " mm²");
  check(p && Math.abs(p.contact.area - 1600) < 40, "and stands on its top", p && p.contact.area.toFixed(0) + " mm²");
  ex = MF.exportParts();
  const b = ex.map(q => C.solidBounds(q));
  check(closedAndSolid(ex, C), "exported parts are closed and outward");
  check(Math.abs(Math.min(...b.map(q => q.mn[1]))) < 1e-4 && Math.abs(Math.max(...b.map(q => q.mx[1])) - 23) < 1e-3, "on the bed, 23 mm tall", `${Math.min(...b.map(q => q.mn[1])).toFixed(4)} .. ${Math.max(...b.map(q => q.mx[1])).toFixed(3)}`);
  const vol1 = ex.reduce((a, q) => a + C.checkMesh(q).volume, 0);
  check(Math.abs(vol1 - vol0) < 0.01, "same volume", `${vol0.toFixed(2)} -> ${vol1.toFixed(2)} mm³`);
  check(/23(\.0)? mm/.test(document.querySelector("#stSize").textContent), "size readout follows the turn", document.querySelector("#stSize").textContent);
  const zipFiles = C.make3MF(C.prepareParts(ex).parts, MF.state.slots, "t");
  check(Object.keys(zipFiles).length > 0, "3mf writer takes the turned parts");

  console.log("\nmirror and scale on top of the turn");
  MF.state.model.mirror = true; MF.state.model.scale = 150; MF.rebuild(false); await settle();
  ex = MF.exportParts();
  const bm = ex.map(q => C.solidBounds(q));
  check(closedAndSolid(ex, C), "still closed and outward");
  check(Math.abs(Math.max(...bm.map(q => q.mx[1])) - 34.5) < 1e-3 && Math.abs(Math.min(...bm.map(q => q.mn[1]))) < 1e-4, "34.5 mm tall on the bed", Math.max(...bm.map(q => q.mx[1])).toFixed(3));
  MF.state.model.mirror = false; MF.state.model.scale = 100;

  console.log("\nRevert");
  MF.revertOptimize(); await settle();
  check(MF.state.model.orient === null, "orientation back to as designed");
  MF.rebuild(false); await settle();
  p = await analysed();
  check(p && Math.abs(p.overhang.area - before) < 1, "and the support is back", p && p.overhang.area.toFixed(0));

  console.log("\nExport tab");
  [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "export").click(); await sleep(100);
  const pages = [...document.querySelectorAll("#secrail button")].map(b => b.getAttribute("aria-label") || b.title || b.textContent);
  check(pages.some(t => /Printability/i.test(t)), "has a Printability page", pages.join(" | "));
  const opt = [...document.querySelectorAll("#panel button")].find(b => /Optimize for printing/.test(b.textContent));
  check(!!opt, "with an Optimize button");
  opt.click(); await settle(); await sleep(100);
  check(MF.state.model.orient && [...document.querySelectorAll("#panel button")].some(b => b.textContent.trim() === "Revert"), "the button turns the model and offers Revert");
  const show = [...document.querySelectorAll("#panel label.check")].find(l => /problem areas/.test(l.textContent));
  check(!!show, "a switch to show problem areas");
  if (show) { const i = show.querySelector("input"); i.checked = true; i.dispatchEvent(new win.Event("change")); await sleep(50); }

  console.log("\nhostile project file");
  const bad = { app: "maker-forge", state: Object.assign(JSON.parse(JSON.stringify(MF.state)), {
    model: { scale: 100, mirror: "yes", orient: [2, 0, 0, 0, 2, 0, 0, 0, 2], brim: 1e9 },
    printer: Object.assign({}, MF.state.printer, { overhang: -50, bridge: 1e6 }) }) };
  delete bad.state.items;
  await setFile(document.querySelector("#projInput"), "evil.json", JSON.stringify(bad), "application/json");
  for (let i = 0; i < 100 && MF.state.model.brim !== 15; i++) await sleep(30);
  await settle();
  const m = MF.state.model, pr = MF.state.printer;
  check(m.orient === null, "a scaling 'rotation' is refused", JSON.stringify(m.orient));
  check(m.brim === 15 && m.mirror === false, "brim clamped to 15 mm, mirror a real boolean", `${m.brim}, ${m.mirror}`);
  check(pr.overhang === 20 && pr.bridge === 60, "overhang and bridge limits clamped", `${pr.overhang}, ${pr.bridge}`);

  // the bed check measures the parts where they print (Session 29): a layered lightbox's layers lie side by side
  // in the files, so eight 100 mm layers need about 840 mm of bed although the box itself is 100 mm wide
  [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === "Lightbox").click(); await settle();
  const bedRow = () => MF.checks.list.find(r => /bed/i.test(r.t)) || { t:"none", s:"" };
  const vLayout = document.querySelector("#vLayout");         // the view shows the box put together, not laid out
  if (vLayout.getAttribute("aria-pressed") === "true") vLayout.click();
  Object.assign(MF.state.base.lightbox, { mode:"layered", layers:8, width:100 }); await MF.rebuild(false); await settle();
  const wide = bedRow();
  Object.assign(MF.state.base.lightbox, { layers:2 }); await MF.rebuild(false); await settle();
  const narrow = bedRow();
  check(/Bigger than the print bed/.test(wide.t) && /Fits the bed/.test(narrow.t),
    "with the view showing it put together, a layered lightbox laid out wider than the bed is reported, two layers that fit are not",
    `${wide.t}: ${wide.s.split(" does")[0]} / ${narrow.t}`);

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
