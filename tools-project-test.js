// Project files (Session 15): every quick start and every object comes back unchanged from a saved
// project (so a clamp never changes a real setting), and the settings that used to make a build run
// away when a project file set them out of range now build quickly and small.
//   node tools-project-test.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 2400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge, C = MF.core, inp = document.querySelector("#projInput");
  const open = async text => {
    const f = new win.File([text], "p.json", { type: "application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30);
    return settle();
  };
  // what a project file must bring back exactly: every object's settings, the model, printer and paint
  // (keys in a fixed order: a reopened project may list them in another order, which changes nothing)
  const sorted = v => Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
  const sig = () => JSON.stringify(sorted({ base: MF.state.base, model: MF.state.model, printer: MF.state.printer, paint: MF.state.paint, slots: MF.state.slots }));
  const diff = (a, b, pre = "") => {
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return [`${pre}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diff(a[k], b[k], pre ? pre + "." + k : k));
  };

  console.log("every quick start and every object survives a save and reopen");
  const changed = [];
  const roundTrip = async label => {
    const before = sig(); await open(MF.projectPayload(true)); const after = sig();
    if (before !== after) changed.push(`${label}: ${diff(JSON.parse(before), JSON.parse(after)).slice(0, 3).join("; ")}`);
  };
  const presets = $$("#presetGallery button").map(b => b.dataset.k);
  for (const k of presets) { $$("#presetGallery button").find(b => b.dataset.k === k).click(); await settle(); await roundTrip("quick start " + k); }
  const objects = $$("#objectSel option").map(o => o.value).filter(v => v !== "stl");
  for (const v of objects) { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); await roundTrip("object " + v); }
  check(!changed.length, `${presets.length} quick starts and ${objects.length} objects come back unchanged`, changed.slice(0, 4).join(" | "));

  console.log("\nsettings that used to run away, set far out of range in a project file");
  const cases = [
    ["turned", "wall", -1e9], ["turned", "neck", 1e9], ["bobble", "plinthH", -1e9], ["bobble", "bore", 1e9], ["bobble", "shoulder", 1e9],
    ["canvas", "pitch", -1e9], ["nameplate", "arc", 1e9], ["nameplate", "rim", -1e9],
  ];
  for (const [type, key, val] of cases) {
    const s = document.querySelector("#objectSel"); s.value = type; s.dispatchEvent(new win.Event("change")); await settle();
    const st = JSON.parse(JSON.stringify(MF.state)); st.base[type][key] = val;
    const t0 = Date.now(), e0 = env.errors.length, done = await open(JSON.stringify({ app: "Maker Forge", v: 5, state: st })), ms = Date.now() - t0;
    const tris = MF.parts.reduce((n, p) => n + C.checkMesh(p.solid).tris, 0), errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
    const kept = MF.state.base[type][key];
    check(done && ms < 8000 && tris < 400000 && !errs.length && Math.abs(kept) < 1000, `${type} ${key} = ${val}: kept as ${kept}, builds normally`, `${ms} ms, ${tris} triangles${errs.length ? ", " + errs[0].split("\n")[0] : ""}`);
  }

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
