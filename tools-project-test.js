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
    const st = JSON.parse(MF.projectPayload()).state; st.base[type][key] = val;      // as saved (the live state holds pictures' canvases)
    const t0 = Date.now(), e0 = env.errors.length, done = await open(JSON.stringify({ app: "Maker Forge", v: 5, state: st })), ms = Date.now() - t0;
    const tris = MF.parts.reduce((n, p) => n + C.checkMesh(p.solid).tris, 0), errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
    const kept = MF.state.base[type][key];
    check(done && ms < 8000 && tris < 400000 && !errs.length && Math.abs(kept) < 1000, `${type} ${key} = ${val}: kept as ${kept}, builds normally`, `${ms} ms, ${tris} triangles${errs.length ? ", " + errs[0].split("\n")[0] : ""}`);
  }

  console.log("\na picture's settings that are not numbers");
  {
    const s = document.querySelector("#objectSel"); s.value = "cutter"; s.dispatchEvent(new win.Event("change")); await settle();
    const { encodePNG } = require("./tools-test-env.js"), W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4, r = Math.hypot(x - 120, y - 90), col = r < 60 ? [25, 90, 170] : [255, 255, 255]; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255; }
    $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(50);
    const ev = new win.Event("drop", { bubbles: true, cancelable: true }); ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "disc.png", { type: "image/png" })] };
    document.querySelector("#drop").dispatchEvent(ev);
    for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "disc" && d.src); i++) await sleep(30);
    await settle();
    const data = JSON.parse(MF.projectPayload(true)), it = data.state.items.find(d => d.name === "disc");
    Object.assign(it, { width: "12abc", rotation: null, aspect: "wide", zoom: [2], adjust: 5, outline: { on: false, width: "x", slot: 1 }, pixel: "yes" });
    const e0 = env.errors.length; await open(JSON.stringify(data));
    const d = MF.state.items.find(x => x.name === "disc"), errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
    check(MF.parts.length && d.width === 40 && d.rotation === 0 && Math.abs(d.aspect - W / H) < 1e-9 && typeof d.adjust === "object" && typeof d.pixel === "object" && d.outline.width === 0.8 && !errs.length,
      "text, null or lists in a picture's settings fall back to defaults, and its shape comes from the picture itself", `${MF.parts.length} parts, width ${d.width}, aspect ${d.aspect}`);
  }

  console.log("\nthe example marker on a picture (Session 19)");
  {
    // only `true` marks an example picture (which the next picture added replaces); anything else is dropped
    const data = JSON.parse(MF.projectPayload(true)), it = data.state.items.find(d => d.name === "disc");
    it.example = "<img src=x onerror=alert(1)>";
    data.state.items.push(Object.assign(JSON.parse(JSON.stringify(it)), { id: 9001, name: "marked", example: true }));
    await open(JSON.stringify(data));
    const a = MF.state.items.find(x => x.name === "disc"), b = MF.state.items.find(x => x.name === "marked");
    check(a && !("example" in a) && b && b.example === true && !document.querySelector("img[src=x]"), "a marker that is not true is dropped; true is kept; nothing reaches the page",
      `${JSON.stringify(a && a.example)}, ${JSON.stringify(b && b.example)}`);
    // an example picture gives way to one of the person's own
    const ev = new win.Event("drop", { bubbles: true, cancelable: true }), { encodePNG } = require("./tools-test-env.js"), px = new Uint8ClampedArray(40 * 30 * 4).fill(200);
    $$("#tabs button").find(x => x.dataset.k === "art").click(); await sleep(50);
    ev.dataTransfer = { files: [new win.File([encodePNG(40, 30, px)], "mine.png", { type: "image/png" })] };
    document.querySelector("#drop").dispatchEvent(ev);
    for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "mine" && d.src); i++) await sleep(30);
    await settle();
    check(!MF.state.items.some(d => d.example) && MF.state.items.some(d => d.name === "mine"), "adding a picture of your own takes the example's place", MF.state.items.map(d => d.name).join(", "));
  }

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
