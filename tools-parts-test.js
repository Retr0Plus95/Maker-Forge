// The mechanical parts library (Session 82): every part at its defaults and each setting at its ends (each choice too) is
// closed, outward, finite and on the bed; its connectors are unit directions; its BOM and print orientation are there; the
// clearance widens what it should; snap() lines connectors up; hostile settings are cleaned. Then the Mechanical parts object
// in the app: every part builds, its settings come back from a saved project, and a hostile project is cleaned.
//   node tools-parts-test.js index.html        (CORE=1 for the library only)
const path = require("path");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

function coreTests(C) {
  const P = C.parts, list = P.list();
  console.log("every part, at its defaults and each setting at its ends");
  {
    const bad = []; let n = 0;
    for (const p of list) {
      const tries = [{}];
      for (const [k, sp] of Object.entries(p.settings)) { if (Array.isArray(sp)) tries.push({ [k]:sp[1] }, { [k]:sp[2] }); else sp.opts.forEach(o => tries.push({ [k]:o })); }
      for (const t of tries) {
        n++;
        let r; try { r = P.make(p.key, t); } catch (e) { bad.push(`${p.key} ${JSON.stringify(t)}: ${e.message}`); continue; }
        const m = C.checkMesh(r.solid), v = C.signedVolume(r.solid), b = C.solidBounds(r.solid), finite = r.solid.pos.every(Number.isFinite);
        const conns = Object.values(r.connectors), unit = conns.every(q => near(Math.hypot(...q.dir), 1, 1e-6) && near(Math.hypot(...q.up), 1, 1e-6) && Math.abs(q.dir[0] * q.up[0] + q.dir[1] * q.up[1] + q.dir[2] * q.up[2]) < 1e-6 && q.at.every(Number.isFinite));
        const o = r.meta.orient, orth = Array.isArray(o) && o.length === 9;
        if (m.open || v <= 0 || !finite || Math.abs(b.mn[1]) > 1e-6 || !unit || !Array.isArray(r.meta.bom) || !orth || !(r.meta.support === false || (p.key === "flexureSpring" && /coil/.test(r.settings.style) && typeof r.meta.support === "string")))
          bad.push(`${p.key} ${JSON.stringify(t)}: open ${m.open}, volume ${v.toFixed(1)}, lowest ${b.mn[1].toFixed(3)}, connectors ${unit}, bom ${Array.isArray(r.meta.bom)}`);
      }
    }
    check(!bad.length, `${list.length} parts, ${n} builds: each closed, outward, finite, on the bed, with unit connectors, a BOM, a print orientation and no support (the coil spring says why it needs some)`, bad.slice(0, 3).join(" | "));
  }

  console.log("\nthe clearance widens the fits");
  {
    const s = P.servos.SG90, T = 3, a = P.make("servoMount", { servo:"SG90", thick:T }, { clearance:0 }), b = P.make("servoMount", { servo:"SG90", thick:T }, { clearance:0.4 });
    const want = ((s.L + 0.8) * (s.W + 0.8) - s.L * s.W) * T, got = C.signedVolume(a.solid) - C.signedVolume(b.solid);
    check(near(got, want, want * 0.05), "the SG90's pocket grows by the clearance on every side (volume taken out)", `${got.toFixed(1)} mm³, expected ${want.toFixed(1)}`);
    check(P.make("servoMount", {}).clearance === 0.2 && P.make("servoMount", {}, { clearance:5 }).clearance === 1 && P.make("servoMount", {}, { clearance:"x" }).clearance === 0.2, "0.2 mm by default, at most 1, a word ignored");
    const r0 = P.make("ledRing", { ring:"16" }, { clearance:0 }), r1 = P.make("ledRing", { ring:"16" }, { clearance:0.3 });
    const b0 = C.solidBounds(r0.solid), b1 = C.solidBounds(r1.solid);
    check(near((b1.mx[0] - b1.mn[0]) - (b0.mx[0] - b0.mn[0]), 0.6, 0.02), "the ring holder's seat grows by the clearance a side (the holder 0.6 mm wider)", ((b1.mx[0] - b1.mn[0]) - (b0.mx[0] - b0.mn[0])).toFixed(3));
  }

  console.log("\nconnectors and snap()");
  {
    const horn = P.make("servoHorn", { arm:20, holes:3, pin:1.6 }), link = P.make("hornLink", { length:40, pinA:1.6 });
    const sn = P.snap(horn, "hole1", link, "a"), ha = horn.connectors.hole1, la = sn.connectors.a;
    check(ha.at.every((v, i) => near(v, la.at[i], 1e-4)) && ha.dir.every((v, i) => near(v, -la.dir[i], 1e-6)) && ha.up.every((v, i) => near(v, la.up[i], 1e-6)),
      "a link snapped onto the horn's end hole: its hole on the horn's, facing it, turned the same way", JSON.stringify(la));
    const moved = C.affineSolid(link.solid, sn.m, sn.t), mb = C.solidBounds(moved);
    check(near(mb.mx[1], horn.connectors.hole1.at[1], 1e-3) || near(mb.mn[1], horn.connectors.hole1.at[1], 1e-3), "and the link's solid moves with it: it lies against the horn's top face", `${mb.mn[1].toFixed(3)}..${mb.mx[1].toFixed(3)}`);
    const mount = P.make("servoMount", { servo:"MG996R" });
    check(Object.keys(mount.connectors).filter(k => /^screw/.test(k)).length === 4 && near(mount.connectors.shaft.at[0], P.servos.MG996R.shaftX, 1e-6), "the MG996R's mount: four screw connectors and the shaft over its offset");
    const tray = P.make("boardMount", { board:"esp32devkit", openEnd:"both" });
    check(tray.connectors.portLeft && tray.connectors.portRight && tray.connectors.board.dir[1] === 1, "a board tray open at both ends has a plug connector at each");
  }

  console.log("\nthe travel calculators");
  {
    // a parallelogram (ground = coupler, crank = rocker): the rocker turns exactly with the crank
    const par = [0, 30, 60, 90, 120].map(d => P.fourBarAngle(50, 20, 50, 20, d));
    check(par.every((v, i) => v !== null && near(v, [0, 30, 60, 90, 120][i], 1e-6)), "a parallelogram four-bar: the rocker follows the crank degree for degree", par.join(", "));
    // a crank-slider in line: at 0° the slider is at crank + rod, at 180° at rod - crank
    check(near(P.crankSliderX(10, 40, 0, 0), 50, 1e-9) && near(P.crankSliderX(10, 40, 0, 180), 30, 1e-9) && near(P.crankSliderX(10, 40, 0, 90), Math.sqrt(1500), 1e-9), "a crank and slider: 50 mm at 0°, 30 mm at 180°, √1500 at 90°");
    const t = P.travel("slider", { a:10, b:40, e:0, start:0, sweep:180 });
    check(t.ok && near(t.stroke, 20, 1e-6) && t.rows.length >= 13, "its travel over 180°: a 20 mm stroke, a row every 15°", `${t.stroke} mm, ${t.rows.length} rows`);
    const jam = P.make("fourBar", { ground:100, crank:10, coupler:20, rocker:20 });
    check(!jam.meta.travel.ok && /jam/.test(jam.meta.notes.join(" ")), "links too short to reach: the four-bar says it would jam", jam.meta.notes[1]);
    const rod = P.make("pushRod", { horn:10, length:40, lever:15, ground:40, start:30, sweep:90 });
    check(rod.meta.travel.ok && rod.meta.travel.stroke > 30 && rod.meta.travel.stroke < 120, "a push rod: the output lever's swing over the servo's travel", `${rod.meta.travel.min}° to ${rod.meta.travel.max}°`);
    const g = P.make("spurGear", { module:1.5, teeth:20, mate:30 });
    check(near(g.meta.pitch, 30, 1e-9) && near(g.meta.centre, 37.5, 1e-9), "a spur gear: module 1.5 × 20 teeth = 30 mm pitch; 37.5 mm to a 30-tooth gear");
    const sn = P.make("snapFit", { length:12, thick:1.6, hook:1 }), stiff = P.make("snapFit", { length:5, thick:3, hook:2 });
    check(near(sn.meta.strain, 1.67, 0.01) && /Too stiff/.test(stiff.meta.notes[0]), "a snap fit's strain (1.5 t y / L²): 1.7% on a 12 mm arm; a short thick one is too stiff", `${sn.meta.strain}%, ${stiff.meta.strain}%`);
  }

  console.log("\nthe core primitives: loft, sweep, thin shells (Session 83)");
  {
    const vol = s => C.signedVolume(s), ok = s => s && C.checkMesh(s).open === 0 && vol(s) > 0 && s.pos.every(Number.isFinite);
    const sq = (w, y) => [[-w, y, -w], [w, y, -w], [w, y, w], [-w, y, w]];
    const cube = C.loft([sq(5, 0), sq(5, 10)]), fr = C.loft([sq(5, 0), sq(2, 10)]), pyr = C.loft([sq(5, 0), [[0, 10, 0], [0, 10, 0], [0, 10, 0], [0, 10, 0]]]), rev = C.loft([sq(5, 0).reverse(), sq(5, 10).reverse()]);
    check([cube, fr, pyr, rev].every(ok) && near(vol(cube), 1000, 1e-6) && near(vol(fr), 520, 1e-6) && near(vol(pyr), 1000 / 3, 1e-6) && near(vol(rev), 1000, 1e-6),
      "loft: a cube, a frustum and a pyramid to a point, closed, outward and to the volume; loops either way round", [cube, fr, pyr, rev].map(s => vol(s).toFixed(2)).join(", "));
    const circ = (r, n) => Array.from({ length:n }, (_, i) => [r * Math.cos(i / n * 2 * Math.PI), r * Math.sin(i / n * 2 * Math.PI)]);
    const path = Array.from({ length:41 }, (_, i) => [30 * Math.cos(i / 40 * Math.PI), 0, 30 * Math.sin(i / 40 * Math.PI)]);
    const tube = C.sweep(circ(2, 24), path), want = 0.5 * 24 * 4 * Math.sin(2 * Math.PI / 24) * 30 * Math.PI;   // the 24-gon's area along the half circle
    check(ok(tube) && near(vol(tube), want, want * 0.01), "sweep: a 4 mm tube round half a 60 mm circle, closed, to its volume", `${vol(tube).toFixed(1)} mm³, about ${want.toFixed(1)}`);
    const flat = C.shellSurface((u, v) => [u * 10, 0, v * 10], 4, 4, 2), one = C.shellSurface((u, v) => [u * 10, 0, v * 10], 4, 4, 2, { side:1 });
    const ob = C.solidBounds(one);
    check(ok(flat) && near(vol(flat), 200, 1e-6) && ok(one) && (near(ob.mn[1], 0, 1e-6) || near(ob.mx[1], 0, 1e-6)), "a thin shell: a 10 × 10 sheet 2 mm thick, centred or all to one side", `${vol(flat).toFixed(2)}, ${ob.mn[1].toFixed(2)}..${ob.mx[1].toFixed(2)}`);
    const petal = (u, v) => { const a = (u - 0.5) * 1.2, r = 20 * v; return [r * Math.sin(a) * (1 - v * 0.6), 30 * v, 8 * Math.sin(Math.PI * v) * Math.cos(a)]; };
    const p1 = C.shellSurface(petal, 24, 24, 1), p2 = C.shellSurface(petal, 24, 24, 2);
    check(ok(p1) && ok(p2) && near(vol(p2) / vol(p1), 2, 0.05), "a curved petal from its point (a row that shrinks to one point): closed, its volume doubling with its wall", `${vol(p1).toFixed(1)}, ${vol(p2).toFixed(1)} mm³`);
  }

  console.log("\nsettings that are not right are cleaned");
  {
    const c = P.clean("servoHorn", { servo:"<b>", arm:1e9, holes:"many", pin:-4, thick:NaN, extra:1, __proto__:{ evil:1 } });
    check(c.servo === "SG90" && c.arm === 40 && c.holes === 4 && c.pin === 1 && c.thick === 3 && !("extra" in c) && !c.evil, "a horn with markup for its servo, a huge arm, holes as a word, a negative pin and no thickness", JSON.stringify(c));
    check(P.clean("nothing", {}) === null, "an unknown part: nothing");
    let threw = false; try { P.make("nothing", {}); } catch (e) { threw = true; }
    check(threw, "making an unknown part says so");
  }
}

(async () => {
  if (process.env.CORE) {
    global.earcut = require("earcut");
    require(path.resolve(__dirname, "src/core.js"));
    coreTests(global.PRCore);
    console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
  }
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 2400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(800);
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length;
  coreTests(C);
  if (MF.state.base.parts !== undefined) await require("./tools-parts-app.js")({ win, document, MF, C, settle, sleep, check, env });
  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
