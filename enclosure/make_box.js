// Builds the project box with Maker Forge's own enclosure generator, headless, from box-design.json, checks it
// and writes the print files:
//   enclosure/rgb-lamp-controller-box-bambu.3mf   (Bambu Studio, OrcaSlicer: box, lid and lens on one plate)
//   enclosure/rgb-lamp-controller-box.3mf         (PrusaSlicer and others)
//   enclosure/stl/*.stl                           (each part on its own)
//   enclosure/rgb-lamp-controller-box.forge.json  (open it in Maker Forge to change the box: Project > Open)
//
//   node enclosure/make_box.js [path to a Maker Forge checkout, default ../Maker-Forge]
// Needs the Maker Forge repository with its npm dev dependencies (jsdom) and a built index.html.
"use strict";
const fs = require("fs");
const path = require("path");

const here = __dirname;
const forge = path.resolve(process.argv[2] || process.env.MAKER_FORGE || path.join(here, "..", "..", "Maker-Forge"));
const design = JSON.parse(fs.readFileSync(path.join(here, "box-design.json"), "utf8"));
const out = name => path.join(here, name);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };

(async () => {
  const boot = require(path.join(forge, "tools-test-env.js"));
  const env = boot(path.join(forge, "index.html"));
  const win = env.window;
  await sleep(800);
  const MF = win.MakerForge, C = MF.core, st = MF.state;
  const settle = async () => {
    const r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 600; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return; } await sleep(25); }
    throw new Error("Maker Forge is still busy");
  };
  console.log(`Maker Forge ${win.document.title.replace(/^.*?(v[\d.]+).*$/, "$1")} from ${forge}`);

  // the box: Maker Forge's defaults, then everything in box-design.json, each opening as newOpening() makes it
  const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), JSON.parse(JSON.stringify(design.enclosure)));
  E.cut = design.enclosure.cut.map(c => Object.assign(MF.newOpening(c.kind, c.face), c));
  st.base.type = "enclosure";
  st.base.enclosure = E;
  if (design.slots) st.slots = JSON.parse(JSON.stringify(design.slots));
  MF.rebuild(false);
  await settle();

  console.log("\nchecks");
  const info = MF.enclosure;
  check(info && !info.warn.length, "Maker Forge placed every opening and label with no warning", info && info.warn.map(w => w.t + ": " + w.s).join(" | "));
  check(info && info.left.length === 0, "no opening left out", info && info.left.join(","));
  const parts = MF.parts;
  for (const p of parts) {
    const m = C.checkMesh(p.solid);
    check(m.open === 0 && !m.nan && C.signedVolume(p.solid) > 0, `${p.name}: closed, outward-facing, no NaN`, `${m.tris} triangles, ${(m.volume / 1000).toFixed(1)} cm³`);
  }
  const box = parts.find(p => /box/i.test(p.name)) || parts[0];
  const b = C.solidBounds(box.solid);
  check(Math.abs(b.size[0] - E.w) < 0.01 && Math.abs(b.size[2] - E.d) < 0.01 && Math.abs(b.size[1] - E.h) < 0.01 && Math.abs(b.mn[1]) < 1e-6,
    `the box is ${E.w} x ${E.d} x ${E.h} mm and sits on the bed`, b.size.map(v => v.toFixed(2)).join(" x "));

  // the R32's floor holes follow the Uno pattern turned USB-to-the-back
  const R = design.r32, holes = design.enclosure.cut.filter(c => c.face === "bottom" && c.kind === "hole");
  const want = R.holes.map(([x, y]) => [R.left + y, R.back - x]);
  const worst = Math.max(...want.map(([X, Y], i) => Math.hypot(holes[i].u - X, holes[i].v - Y)));
  check(holes.length === 4 && worst < 0.02, "the four floor holes are the R32's Uno hole pattern", `worst ${worst.toFixed(3)} mm`);
  const usb = design.enclosure.cut.find(c => c.face === "back" && c.label === "USB");
  check(Math.abs(usb.u - -(R.left + R.usb_y)) < 0.2, "the USB opening is in line with the R32's USB socket", `u ${usb.u}, socket at u ${(-(R.left + R.usb_y)).toFixed(1)}`);
  // the R32 and the perfboard keep clear of each other, the walls and the corner screw posts
  const inner = [E.w / 2 - E.wall, E.d / 2 - E.wall];
  const r32 = [R.left, R.back - 68.6, R.left + 53.3, R.back];
  const pb = [design.perfboard.x - 45, design.perfboard.y - 35, design.perfboard.x + 45, design.perfboard.y + 35];
  check(r32[2] + 3 < pb[0], "R32 and perfboard are apart", `gap ${(pb[0] - r32[2]).toFixed(1)} mm`);
  const post = 3.6 + 3.6;   // a corner post for an M3 insert reaches about 7.2 mm in from each wall
  const clearOfPosts = rect => [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([sx, sy]) => {
    const cx = sx * inner[0], cy = sy * inner[1];
    const nx = Math.max(rect[0], Math.min(cx, rect[2])), ny = Math.max(rect[1], Math.min(cy, rect[3]));
    return Math.abs(nx - cx) > post || Math.abs(ny - cy) > post;
  });
  check(clearOfPosts(r32) && clearOfPosts(pb), "neither board runs into a corner screw post");
  check(r32[0] > -inner[0] && r32[3] < inner[1] && pb[2] < inner[0] && pb[3] < inner[1] && pb[1] > -inner[1], "both boards fit inside the walls");

  console.log("\nfiles");
  const JSZip = require(path.join(forge, "node_modules", "jszip"));
  const title = design.title;
  const { parts: P, size } = C.prepareParts(MF.exportParts());
  const zip3mf = async files => { const z = new JSZip(); Object.entries(files).forEach(([k, v]) => z.file(k, v));
    return z.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } }); };
  fs.writeFileSync(out("rgb-lamp-controller-box-bambu.3mf"), await zip3mf(C.make3MF_BBL(P, st.slots, title)));
  fs.writeFileSync(out("rgb-lamp-controller-box.3mf"), await zip3mf(C.make3MF(P, st.slots, title)));
  console.log(`  rgb-lamp-controller-box-bambu.3mf, rgb-lamp-controller-box.3mf  (plate ${size.map(v => v.toFixed(1)).join(" x ")} mm)`);
  fs.mkdirSync(out("stl"), { recursive: true });
  for (const p of parts) {
    const one = C.prepareParts([{ name: p.name, slot: p.slot, pos: p.solid.pos, idx: p.solid.idx }]).parts[0];
    const file = "stl/rgb-lamp-controller-" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") + ".stl";
    fs.writeFileSync(out(file), Buffer.from(C.makeSTL(one)));
    console.log("  " + file);
  }
  const project = JSON.parse(MF.projectPayload(false));
  project.saved = "2026-10-29T00:00:00.000Z";                       // a fixed date keeps the file stable in git
  fs.writeFileSync(out("rgb-lamp-controller-box.forge.json"), JSON.stringify(project) + "\n");
  console.log("  rgb-lamp-controller-box.forge.json");

  // Maker Forge's printability check, as its Print tab shows it
  let pr = null;
  for (let i = 0; i < 1200 && !(pr = MF.print); i++) await sleep(25);
  const notes = pr ? MF.checks.list.filter(r => r.k !== "ok").map(r => `${r.t}${r.s ? ": " + r.s : ""}`) : ["no printability result"];
  if (pr) {
    const flats = k => pr.flats.filter(x => x.kind === k).length;
    console.log(`\nprintability: support ${pr.overhang.area.toFixed(1)} mm², ${flats("bridge")} bridges, ${flats("ledge")} ledges`);
    notes.forEach(n => console.log("  - " + n));
  }
  const grams = MF.checks && MF.checks.totals && MF.checks.totals.grams;
  fs.writeFileSync(out("box-summary.json"), JSON.stringify({
    maker_forge: win.document.title, size_mm: [E.w, E.d, E.h], plate_mm: size.map(v => +v.toFixed(1)),
    parts: parts.map(p => ({ name: p.name, triangles: C.checkMesh(p.solid).tris, cm3: +(C.checkMesh(p.solid).volume / 1000).toFixed(1) })),
    grams: grams ? +grams.toFixed(0) : null,
    printability: pr ? { support_mm2: +pr.overhang.area.toFixed(1), bridges: pr.flats.filter(x => x.kind === "bridge").length, notes } : null
  }, null, 2) + "\n");
  console.log("  box-summary.json" + (grams ? `  (about ${grams.toFixed(0)} g of filament)` : ""));
  console.log(fails ? `\n${fails} failed` : "\nall checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
