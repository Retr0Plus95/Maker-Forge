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

  console.log("\nmechanisms, fix-it parts and the keychain's new settings in a hostile project file (Session 37)");
  {
    const host = async (type, edit, test, what, empty) => {
      const s = document.querySelector("#objectSel"); s.value = type; s.dispatchEvent(new win.Event("change")); await settle();
      const st = JSON.parse(MF.projectPayload()).state; edit(st.base);
      const t0 = Date.now(), e0 = env.errors.length, done = await open(JSON.stringify({ app: "Maker Forge", v: 5, state: st })), ms = Date.now() - t0;
      const tris = MF.parts.reduce((n, p) => n + C.checkMesh(p.solid).tris, 0), errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
      const out = test(MF.state.base);
      check(done && ms < 15000 && (tris > 0 || empty) && tris < 1500000 && !errs.length && out === true, what, `${ms} ms, ${tris} triangles${errs.length ? ", " + errs[0].split("\n")[0] : ""}${out !== true ? ", " + out : ""}`);
    };
    await host("mech", b => { b.mech.kind = "bolt"; b.mech.bolt.size = "<img src=x onerror=alert(1)>"; b.mech.bolt.length = 1e9; b.mech.bolt.nut = "yes"; b.fit = { gap: 99 }; },
      b => b.mech.bolt.size === "M10" && b.mech.bolt.length === 200 && b.mech.bolt.nut === false && b.fit.gap === 1 || JSON.stringify([b.mech.bolt.size, b.mech.bolt.length, b.mech.bolt.nut, b.fit.gap]),
      "a bolt with markup for its size, a huge length, a nut that is not true/false and a fit gap of 99: M10, 200 mm, no nut, 1 mm");
    await host("mech", b => { b.mech.kind = "gears"; b.mech.gears = { teeth1: 1e9, teeth2: -5, module: "big", layout: "sideways", extra: { evil: 1 } }; },
      b => b.mech.gears.teeth1 === 150 && b.mech.gears.teeth2 === 8 && b.mech.gears.module === 1.5 && b.mech.gears.layout === "apart" && !("extra" in b.mech.gears) || JSON.stringify(b.mech.gears),
      "gears with a billion teeth, negative teeth, a module that is text and an unknown layout: clamped, the defaults, the stranger dropped");
    await host("mech", b => { b.mech = { kind: "rocket" }; }, b => b.mech.kind === "gears" && b.mech.hinge.knuckles === 5 || b.mech.kind,
      "an unknown mechanism: gears, with every other group at its defaults");
    await host("fixit", b => { b.fixit.kind = "clip"; b.fixit.clip.count = 1e6; b.fixit.count = 1e6; b.fixit.clip.cable = -3; },
      b => b.fixit.clip.count === 8 && b.fixit.count === 24 && b.fixit.clip.cable === 1 || JSON.stringify([b.fixit.clip.count, b.fixit.count, b.fixit.clip.cable]),
      "a cable clip for a million cables, a million copies, a cable -3 mm thick: 8 cables, 24 copies, 1 mm");
    await host("fixit", b => { b.fixit.kind = "knob"; b.fixit.knob.grip = "__proto__"; b.fixit.knob.flutes = 1e9; b.fixit.knob.shaft = 1e9; },
      b => b.fixit.knob.grip === "fluted" && b.fixit.knob.flutes === 40 && b.fixit.knob.shaft === 40 || JSON.stringify(b.fixit.knob),
      "a knob with a grip named __proto__, a billion flutes and a huge shaft: fluted, 40 flutes, the hole kept inside the knob");
    await host("nameplate", b => { b.nameplate.line2 = "Ab" + " ".repeat(4998); b.nameplate.line2Size = -50; b.nameplate.letterHeight = 8; b.nameplate.credit = { on: "true", text: "<b>hi</b>".repeat(20), size: 1e9, depth: -1, slot: 99, font: -4 }; },
      b => b.nameplate.line2.length === 60 && b.nameplate.line2Size === 0.3 && b.nameplate.credit.on === false && b.nameplate.credit.text.length === 40 && b.nameplate.credit.size === 8
        && b.nameplate.credit.depth === 0.2 && b.nameplate.credit.slot === 7 && b.nameplate.credit.font === 0 || JSON.stringify([b.nameplate.line2.length, b.nameplate.line2Size, b.nameplate.credit]),
      "a keychain's second line 5000 letters long and a credit that is not quite right: 60 letters, its size clamped to 0.3, the credit off until turned on");
    // Session 42: the keychain's own back text and magnet pocket, and the card's tagline
    await host("nameplate", b => { b.nameplate.line2 = ""; b.nameplate.doubleSided = true; b.nameplate.backText = "<img src=x onerror=alert(7)>".repeat(5); b.nameplate.magnet = "__proto__"; b.nameplate.magnets = 9; },
      b => b.nameplate.backText.length === 40 && b.nameplate.magnet === "none" && b.nameplate.magnets === 1 || JSON.stringify([b.nameplate.backText.length, b.nameplate.magnet, b.nameplate.magnets]),
      "a back text 140 letters long, a magnet that does not exist and nine of them: 40 letters, no magnet, one");
    await host("card", b => { b.card.tagline = "<script>alert(8)</script>".repeat(10); },
      b => b.card.tagline.length === 80 || b.card.tagline.length, "a card tagline 250 letters long is cut to 80");
    // Session 43: frames for a photo and stands
    await host("frame", b => { b.frame = Object.assign(b.frame, { photo: "__proto__", pw: 1e9, ph: -5, border: "wide", overlap: 99, sheet: -1, panelT: 1e9, stand: "<b>", hang: "no", standBase: "yes", landscape: 1 }); },
      b => b.frame.photo === "none" && b.frame.pw === 300 && b.frame.ph === 30 && b.frame.border === 14 && b.frame.overlap === 10 && b.frame.sheet === 0 && b.frame.panelT === 4 && b.frame.stand === "none" && b.frame.hang === true && b.frame.standBase === false && b.frame.landscape === false
        || JSON.stringify(b.frame), "a frame with a photo size that does not exist and silly sizes: no photo, each size clamped, no stand");
    await host("frame", b => { b.frame = Object.assign(b.frame, { photo: "a5", border: 40, overlap: 2, sheet: 3, panelT: 4, stand: "leg", hang: true }); },
      b => b.frame.photo === "a5" || b.frame.photo, "the biggest frame for a photo (A5, 40 mm round it) builds in time");
    await host("board", b => { b.board.stand = "yes"; }, b => b.board.stand === false || b.board.stand, "a plaque's stand that is not true/false: none");
    // Session 44: the relief's colours and stand, the tracer's edges and countersinks
    await host("relief", b => { b.relief = Object.assign(b.relief, { colour: "<img src=x>", stand: "yes" }); },
      b => b.relief.colour === "one" && b.relief.stand === false || JSON.stringify(b.relief), "a relief's colour that does not exist and a stand that is not true/false: one colour, no stand", true);
    await host("tracer", b => { b.tracer = Object.assign(b.tracer, { edgeTop: "__proto__", edgeSize: 1e9, edgeBottom: -4, sink: "please" }); },
      b => b.tracer.edgeTop === "square" && b.tracer.edgeSize === 5 && b.tracer.edgeBottom === 0 && b.tracer.sink === false || JSON.stringify(b.tracer).slice(0, 300), "a traced part's edge that does not exist, a 1000 km edge and a negative bottom chamfer: square, clamped, no countersinks", true);
    await host("tracer", b => { b.tracer = Object.assign(b.tracer, { edgeTop: "round", edgeSize: "big", edgeBottom: 0.5, sink: true }); },
      b => b.tracer.edgeTop === "round" && b.tracer.edgeSize === 1 && b.tracer.edgeBottom === 0.5 && b.tracer.sink === true || JSON.stringify(b.tracer).slice(0, 300), "a rounded edge whose size is a word: the default 1 mm, the rest kept", true);
    // Session 38: signs and reliefs
    await host("sign", b => { b.sign = { style: "<script>", text: "<img src=x onerror=alert(1)>".repeat(30), letterH: 1e9, depth: -5, wall: "thick", backing: "everywhere", mount: "nails", holes: "yes", diffuserSlot: 99, font: -3, evil: 1 }; },
      b => b.sign.style === "channel" && b.sign.text.length === 200 && b.sign.letterH === 400 && b.sign.depth === 2 && b.sign.wall === 1.6 && b.sign.backing === "none" && b.sign.mount === "keyhole" && b.sign.holes === false && b.sign.diffuserSlot === 7 && b.sign.font === 0 && !("evil" in b.sign)
        || JSON.stringify(b.sign).slice(0, 200), "a sign with markup in its text, a style and backing that don't exist, a 1000 km letter height and numbers that are words: tamed (too big to build, it says so at once)", true);
    await host("relief", b => { b.relief = { source: "magic", shape: "star", width: 1e9, height: -1, cell: 0, contrast: "lots", hole: 1, extra: [] }; },
      b => b.relief.source === "ai" && b.relief.shape === "rect" && b.relief.width === 300 && b.relief.height === 0.3 && b.relief.cell === 0.15 && b.relief.contrast === 1 && b.relief.hole === false && !("extra" in b.relief)
        || JSON.stringify(b.relief), "a relief 1000 km wide with a negative height, a zero detail and a shape that doesn't exist: tamed", true);
    // Session 40: a project box split into parts
    await host("enclosure", b => { Object.assign(b.enclosure, { w: 1e9, d: 1e9, split: "<img src=x onerror=alert(1)>", splitParts: 1e9, splitScrew: "constructor" }); },
      b => b.enclosure.split === "bed" && b.enclosure.splitParts === 8 && b.enclosure.splitScrew === "M3" && b.enclosure.w === 400 || JSON.stringify([b.enclosure.split, b.enclosure.splitParts, b.enclosure.splitScrew, b.enclosure.w]),
      "a box a million km wide, split into a billion parts with constructor screws: 400 mm (too big for the bed even in parts, it says so), 8 parts at most, M3");
    await host("enclosure", b => { Object.assign(b.enclosure, { w: 300, d: 120, split: "parts", splitParts: 1e9 }); },
      b => b.enclosure.splitParts === 8 && MF.enclosure.split && MF.enclosure.split.n <= 8 || JSON.stringify([b.enclosure.splitParts, MF.enclosure.split && MF.enclosure.split.n]),
      "a 300 mm box asked for a billion parts: eight at most, built quickly");
    check(!document.querySelector("#panel b, #panel img[src=x]") || ![...document.querySelectorAll("#panel b")].some(b => b.textContent === "hi"), "no markup from the file reached the page");
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

  // Session 30: an imported model's Scale (%) is applied when it is drawn and printed, no longer built into its
  // shape. A project from before (version 5) with artwork on a model at 150% has it moved onto the model at its
  // own size and made smaller by as much, so it prints where and as big as before; a version 6 project is kept.
  {
    console.log("\nartwork on an imported model saved before its scale became a transform");
    const proj = v => JSON.stringify({ app: "Maker Forge", v, state: Object.assign(JSON.parse(MF.projectPayload()).state, {
      base: Object.assign(JSON.parse(MF.projectPayload()).state.base, { type: "stl", stl: { name: "figure.stl", scale: 150 } }),
      items: [{ id: 1, name: "Text", text: { value: "Hi", font: "Manrope", weight: 800 }, mode: "flat", width: 30, height: 0.9, offU: 3, offV: -6,
        place: { c: [30, 15, 0], n: [1, 0, 0] }, skip: [], quality: "high" }], active: 0 }) });
    await open(proj(5));
    const a = MF.state.items[0];
    const near = (x, y) => Math.abs(x - y) < 1e-9;
    await open(proj(6));
    const b = MF.state.items[0];
    check(a && near(a.width, 20) && near(a.height, 0.6) && near(a.offU, 2) && near(a.offV, -4) && a.place.c.every((x, k) => near(x, [20, 10, 0][k])) && near(MF.state.base.stl.scale, 150)
      && b && b.width === 30 && b.height === 0.9 && b.place.c[0] === 30,
      "a version 5 project: the artwork moved and made smaller by the scale (it prints as before); a version 6 project unchanged",
      a && `${a.width} mm wide at (${a.place.c.join(", ")}); version 6: ${b && b.width} mm at (${b && b.place.c.join(", ")})`);
  }

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
