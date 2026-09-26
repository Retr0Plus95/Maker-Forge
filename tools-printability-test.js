// Printability checks on shapes with known answers: overhangs, bridges, ledges, parts resting on
// or sunk into other parts, thin walls, bed contact, the brim, and the orientation optimizer.
// Runs on the core alone:  node tools-printability-test.js [src/core.js | index.html]
const fs = require("fs"), path = require("path");
const file = process.argv[2] || "src/core.js";
let src = fs.readFileSync(file, "utf8");
if (/\.html?$/.test(file)) { const s = src.indexOf("(function (global) {"); src = src.slice(s, src.indexOf("</script>", s)); }
globalThis.earcut = require("earcut");
new Function(src)();
const C = globalThis.PRCore;
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// an axis-aligned box from (x0,y0,z0) to (x1,y1,z1)
function box(x0, y0, z0, x1, y1, z1) {
  const ring = [[x0, -z0], [x1, -z0], [x1, -z1], [x0, -z1]];
  return C.extrudePolysAt([{ outer: C.area2(ring) > 0 ? ring : ring.reverse(), holes: [] }], y0, y1);
}
function sphere(r, cy, seg) {
  const pos = [], idx = [], rings = seg, sides = seg * 2;
  for (let i = 0; i <= rings; i++) for (let j = 0; j < sides; j++) {
    const th = Math.PI * i / rings, ph = 2 * Math.PI * j / sides;
    pos.push(r * Math.sin(th) * Math.cos(ph), cy + r * Math.cos(th), r * Math.sin(th) * Math.sin(ph));
  }
  const v = (i, j) => i * sides + (j % sides);
  for (let i = 0; i < rings; i++) for (let j = 0; j < sides; j++) {
    if (i > 0) idx.push(v(i, j), v(i, j + 1), v(i + 1, j));
    if (i < rings - 1) idx.push(v(i, j + 1), v(i + 1, j + 1), v(i + 1, j));
  }
  return C.weldSoup(new Float32Array(pos), new Uint32Array(idx));
}
const part = (name, s) => ({ name, pos: s.pos, idx: s.idx });
const opt = { nozzle: 0.4, layer: 0.2, angle: 45, bridge: 10 };
const run = (parts, o) => C.analyzePrint(parts, Object.assign({}, opt, o));
const supportRows = r => r.flats.filter(f => f.kind === "support");

console.log("mesh builders");
check(C.checkMesh(box(0, 0, 0, 1, 1, 1)).open === 0 && near(C.checkMesh(box(0, 0, 0, 2, 3, 4)).volume, 24, 1e-6), "box is closed, volume 24");
{ const s = sphere(10, 10, 24), r = C.checkMesh(s); check(r.open === 0, "sphere is closed", `${r.tris} tris, vol ${r.volume.toFixed(0)}`); }

console.log("\n20 mm cube");
{ const r = run([part("cube", box(-10, 0, -10, 10, 20, 10))]);
  check(r.overhang.area < 0.01, "no overhang", r.overhang.area.toFixed(2));
  check(near(r.contact.area, 400, 8), "400 mm² on the bed", r.contact.area.toFixed(1));
  check(!r.thin.length, "no thin walls");
  check(!r.contact.brimWhy, "no brim needed"); }

console.log("\nmushroom: 10 mm stem, 30 mm cap (a 10 mm ledge all round)");
{ const r = run([part("stem", box(-5, 0, -5, 5, 20, 5)), part("cap", box(-15, 20, -15, 15, 25, 15))]);
  check(near(r.overhang.area, 800, 20), "800 mm² needs support", r.overhang.area.toFixed(1));
  check(supportRows(r).length === 1 && supportRows(r)[0].span > 9.5 && supportRows(r)[0].span < 14.2, "one ledge region, 10 mm out (more at the corners)", supportRows(r).map(f => f.span.toFixed(2)).join(","));
  check(near(r.overhang.lowest, 20, 0.01), "lowest overhang at 20 mm", r.overhang.lowest); }

console.log("\nsame cap as one part with the stem (stem ends inside the cap)");
{ const s = C.mergeSolids([box(-5, 0, -5, 5, 22, 5), box(-15, 20, -15, 15, 25, 15)]);
  const r = run([part("mushroom", s)]);
  check(near(r.overhang.area, 800, 20), "still 800 mm²: the stem's top is inside the cap", r.overhang.area.toFixed(1)); }

console.log("\nsmall ledge: 0.8 mm lip");
{ const r = run([part("a", box(-10, 0, -10, 10, 10, 10)), part("b", box(-10.8, 10, -10.8, 10.8, 12, 10.8))]);
  check(r.overhang.area < 0.5 && r.flats.every(f => f.kind === "ledge"), "printable ledge, no support", r.flats.map(f => f.kind + " " + f.span.toFixed(2)).join(",")); }

console.log("\nbridges: a 40 x 10 mm beam on two posts");
for (const [gap, want] of [[8, "bridge"], [20, "support"]]) {
  const g = gap / 2;
  const r = run([part("left", box(-g - 10, 0, -5, -g, 10, 5)), part("right", box(g, 0, -5, g + 10, 10, 5)), part("beam", box(-g - 10, 10, -5, g + 10, 14, 5))]);
  const f = r.flats[0] || {};
  check(r.flats.length === 1 && f.kind === want && near(f.span, gap, 0.6), `${gap} mm gap: ${want}`, `${f.kind} span ${f.span && f.span.toFixed(2)}`);
  check(want === "bridge" ? r.overhang.area < 0.5 : near(r.overhang.area, gap * 10, 6), `  needs support: ${want === "bridge" ? "none" : gap * 10 + " mm²"}`, r.overhang.area.toFixed(1));
}

console.log("\nroof over a closed room (held all round), 9 mm across");
{ const walls = [box(-6.5, 0, -6.5, 6.5, 8, -4.5), box(-6.5, 0, 4.5, 6.5, 8, 6.5), box(-6.5, 0, -4.5, -4.5, 8, 4.5), box(4.5, 0, -4.5, 6.5, 8, 4.5)];
  const r = run([part("walls", C.mergeSolids(walls)), part("roof", box(-6.5, 8, -6.5, 6.5, 10, 6.5))]);
  check(r.flats.length === 1 && r.flats[0].kind === "bridge", "a bridge", r.flats.map(f => f.kind + " " + f.span.toFixed(2)).join(",")); }

console.log("\ninlays on a plate");
{ const plate = part("plate", box(-20, 0, -20, 20, 3, 20));
  let r = run([plate, part("on top", box(-5, 3, -5, 5, 4, 5))]);
  check(r.overhang.area < 0.01, "resting on the plate: supported", r.overhang.area.toFixed(2));
  r = run([plate, part("sunk", box(-5, 2.4, -5, 5, 4, 5))]);
  check(r.overhang.area < 0.01, "sunk 0.6 mm into the plate: supported", r.overhang.area.toFixed(2));
  r = run([plate, part("floating", box(-5, 5, -5, 5, 6, 5))]);
  check(near(r.overhang.area, 100, 3), "2 mm above the plate: 100 mm² needs support", r.overhang.area.toFixed(1)); }

console.log("\nname plate stack: letters sunk 0.3 mm into the plate, a colour cap sunk into the letters");
{ const r = run([part("plate", box(-30, 0, -10, 30, 2.4, 10)), part("name", box(-25, 2.1, -6, 25, 3.6, 6)), part("cap", box(-24, 3.3, -5, 24, 4.2, 5))]);
  check(r.overhang.area < 0.5, "nothing needs support", r.overhang.area.toFixed(1));
  check(!r.thin.length, "no thin walls", r.thin.length); }

console.log("\nball resting on the bed (a round bottom, no thin rim)");
{ const r = run([part("ball", sphere(8, 8, 64))]);
  check(!r.thin.length, "the first layer's thin rim is not a wall", r.thin.map(t => t.width.toFixed(2) + "@" + t.y.toFixed(2)).join(",")); }

console.log("\na round badge, 0.8 mm thick, on the side of a block (a decal on a wall)");
{ const disc = C.extrudePolys([{ outer: C.ringCircle(6, 64), holes: [] }], 0.8);      // lies flat: turn it upright onto the wall at z = 10
  const up = C.affineSolid(disc, [1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 7, 10]);
  const r = run([part("block", box(-10, 0, -10, 10, 14, 10)), part("badge", up)]);
  check(r.overhang.area < 1 && r.overhang.narrow > 5, "its underside sticks out 0.8 mm: no support", `${r.overhang.area.toFixed(1)} mm², ${r.overhang.narrow.toFixed(1)} mm² excused`); }
{ const disc = C.extrudePolys([{ outer: C.ringCircle(6, 64), holes: [] }], 4);
  const up = C.affineSolid(disc, [1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 7, 10]);
  const r = run([part("block", box(-10, 0, -10, 10, 14, 10)), part("boss", up)]);
  check(r.overhang.area > 10, "the same disc 4 mm thick does need support", r.overhang.area.toFixed(1)); }

console.log("\na plate lifted 0.1 mm (within the first layer)");
{ const r = run([part("plate", box(-10, 0.1, -10, 10, 2, 10))]);
  check(r.overhang.area < 0.5, "counts as on the bed", r.overhang.area.toFixed(1)); }

console.log("\n20 mm sphere");
{ const r = run([part("ball", sphere(10, 10, 32))]);
  // faces steeper than 45° below the equator: a cap of height r(1 - cos 45°), area 2πr·h; minus the bed-contact dimple
  const want = 2 * Math.PI * 10 * 10 * (1 - Math.cos(Math.PI / 4));
  check(near(r.overhang.area, want, want * 0.12), `about ${want.toFixed(0)} mm² needs support`, r.overhang.area.toFixed(1));
  check(r.contact.area < 30 && r.contact.brimWhy === "small", "hardly touches the bed: brim suggested", `${r.contact.area.toFixed(1)} mm², ${r.contact.brimWhy}`); }

console.log("\ntall pin: 6 x 6 x 60 mm");
{ const r = run([part("pin", box(-3, 0, -3, 3, 60, 3))]);
  check(r.contact.brimWhy === "tall", "tall for its footprint: brim suggested", r.contact.brimWhy); }

console.log("\nthin walls");
{ const r = run([part("base", box(-15, 0, -10, 15, 2, 10)), part("fin", box(-10, 2, -0.15, 10, 12, 0.15))]);
  const t = r.thin.find(t => t.name === "fin");
  check(!!t && near(t.width, 0.3, 0.12), "0.3 mm fin found", t && `${t.width.toFixed(2)} mm wide, ${t.length.toFixed(1)} mm long at ${t.y.toFixed(1)} mm`);
  check(r.thin.every(t => t.name === "fin"), "base not flagged");
  const r2 = run([part("base", box(-15, 0, -10, 15, 2, 10)), part("fin", box(-10, 2, -0.3, 10, 12, 0.3))]);
  check(!r2.thin.length, "0.6 mm fin passes", r2.thin.length); }
{ const star = C.ringStar(5, 20, 7), s = C.extrudePolys([{ outer: star, holes: [] }], 3);
  const r = run([part("star", s)]);
  check(!r.thin.length, "sharp star tips are not thin walls", r.thin.map(t => t.width.toFixed(2)).join(",")); }

console.log("\nmirror keeps meshes closed");
{ const m = C.affineSolid(box(0, 0, 0, 3, 2, 1), [-1, 0, 0, 0, 1, 0, 0, 0, 1], [0, 0, 0]), r = C.checkMesh(m);
  check(r.open === 0 && C.signedVolume(m) > 0, "mirrored box closed, outward", C.signedVolume(m).toFixed(2)); }

console.log("\nrotations");
for (const d of [[0, -1, 0], [0, 1, 0], [1, 0, 0], [0, 0, -1], [0.6, 0.8, 0], [-0.36, -0.48, 0.8]]) {
  const R = C.rotationDownTo(d), y = [R[0] * d[0] + R[1] * d[1] + R[2] * d[2], R[3] * d[0] + R[4] * d[1] + R[5] * d[2], R[6] * d[0] + R[7] * d[1] + R[8] * d[2]];
  const det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
  check(near(y[0], 0, 1e-9) && near(y[1], -1, 1e-9) && near(y[2], 0, 1e-9) && near(det, 1, 1e-9), `[${d}] turns to straight down`);
}

console.log("\norientation");
{ const r = C.bestOrientation([part("cube", box(-10, 0, -10, 10, 20, 10))], opt);
  check(r.dir[1] === -1, "a cube stays as it is", r.dir.map(v => +v.toFixed(3))); }
{ // a table: top 40 x 40 x 3 on four 3 x 3 legs 20 mm tall; best printed upside down
  const legs = [[-20, -20], [17, -20], [-20, 17], [17, 17]].map(([x, z]) => box(x, 0, z, x + 3, 20, z + 3));
  const table = [part("legs", C.mergeSolids(legs)), part("top", box(-20, 20, -20, 20, 23, 20))];
  const a = run(table);
  check(a.overhang.area > 1000, "upright table needs support under its top", a.overhang.area.toFixed(0));
  const r = C.bestOrientation(table, opt);
  check(near(r.dir[1], 1, 1e-6), "optimizer turns it upside down", `dir ${r.dir.map(v => +v.toFixed(3))}, support ${r.current.support.toFixed(0)} -> ${r.best.support.toFixed(0)} mm²`);
  const turned = table.map(p => part(p.name, C.affineSolid(p, r.R, [0, 23, 0])));
  const b = run(turned);
  check(b.overhang.area < 1 && near(b.contact.area, 1600, 30), "upside down: no support, the top on the bed", `${b.overhang.area.toFixed(1)} mm², contact ${b.contact.area.toFixed(0)} mm²`); }
{ // a 60 x 10 x 5 bar standing on end, prefer: lying flat
  const r = C.bestOrientation([part("bar", box(-2.5, 0, -5, 2.5, 60, 5))], opt);
  check(near(r.best.height, 5, 0.01) || near(r.best.height, 10, 0.01), "same support either way: the bar lies down (more contact)", `height ${r.best.height.toFixed(1)}`); }
{ // the preferred direction wins a tie
  const r = C.bestOrientation([part("cube", box(-10, 0, -10, 10, 20, 10))], Object.assign({ prefer: [1, 0, 0] }, opt));
  check(r.dir[0] === 1, "tie goes to the current orientation", r.dir); }

console.log("\nbrim");
{ const parts = [part("pin", box(-3, 0, -3, 3, 60, 3))], s = C.brimSolid(parts, [true], 5, 0.2, 0.1);
  const m = C.checkMesh(s), b = C.solidBounds(s);
  check(m.open === 0, "brim is a closed mesh", `${m.tris} tris`);
  check(near(b.size[0], 16, 0.5) && near(b.size[2], 16, 0.5) && near(b.size[1], 0.2, 1e-6), "16 x 16 mm, 0.2 mm thick", b.size.map(v => v.toFixed(2)).join(" x "));
  check(near(b.mn[0] + b.mx[0], 0, 0.2) && near(b.mn[2] + b.mx[2], 0, 0.2), "centred on the part", `${((b.mn[0] + b.mx[0]) / 2).toFixed(2)}, ${((b.mn[2] + b.mx[2]) / 2).toFixed(2)}`);
  // outer corners are rounded (radius 5): 256 - (4 - pi) 25 = 234.5; minus the 6 x 6 part = 198.5
  const area = m.volume / 0.2, ring = 256 - (4 - Math.PI) * 25 - 36, over = (area - ring) / 24;
  check(over > 0.08 && over < 0.3, "a ring that overlaps the part slightly, so they fuse", `${area.toFixed(1)} mm², overlap ${over.toFixed(2)} mm`); }

{ const parts = [part("left", box(-10, 0, -5, 0, 3, 5)), part("right", box(0, 0, -5, 10, 3, 5))];
  const s = C.brimSolid(parts, [true, false], 4, 0.2, 0.1), F = C.analyzePrint([part("brim", s), parts[1]], opt);
  const b = C.solidBounds(s), overlap = C.checkMesh(s).volume / 0.2 - ((28 * 18) - 20 * 10);
  check(C.checkMesh(s).open === 0 && near(b.size[0], 28, 0.5), "two-colour model: brim goes round both", b.size.map(v => v.toFixed(2)).join(" x "));
  check(overlap < 8, "and stays out of the other colour's footprint", `overlap ${overlap.toFixed(1)} mm² incl. the 1-cell rim on its own part`); }

console.log("\ntiming");
{ const s = sphere(30, 30, 120), t0 = Date.now(), r = run([part("ball", s)]);
  console.log(`  ${r.tris} triangles analysed in ${Date.now() - t0} ms`);
  const t1 = Date.now(); C.bestOrientation([part("ball", s)], opt); console.log(`  orientation search in ${Date.now() - t1} ms`); }
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
