// The blooming flower lamp (Session 85): PRCore.flower in Node (every setting at its ends: each part closed, outward, finite and
// on the bed, every check over the travel passing, the petals' travel smooth, the over-centre crank's ends, support-free parts,
// the sketch, cleaning), then the Flower lamp object in the app (CORE=1 skips it): the panel, each slider's ends, the bloom,
// the plates, a saved and a hostile project, the export's sketch and steps.
// Usage: node tools-flower-test.js index.html     (CORE=1 for the library only)
const path = require("path");
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };

function coreTests(C){
  const F = C.flower, S = F.settings;
  console.log("\nevery setting at its ends, for each flower");
  {
    const cases = [];
    for (const style of S.style.opts){
      cases.push({ style });
      for (const [k, sp] of Object.entries(S)){
        if (Array.isArray(sp)){ cases.push({ style, ...(sp[5] || {}), [k]:sp[1] }); cases.push({ style, ...(sp[5] || {}), [k]:sp[2] }); }   // (a setting shown only for a choice: with it)
        else for (const o of sp.opts) cases.push({ style, [k]:o });
      }
      cases.push({ style, petals:14, dia:70, led:"24" }, { style, petals:5, dia:160, open:70, servo:"MG996R" }, { style, petals:14, open:70 }, { style, dia:70, open:70, wall:1.2 });
    }
    const bad = [], failedChecks = [];
    let parts = 0;
    for (const raw of cases){
      const L = F.make(raw);
      for (const p of L.printed){
        parts++;
        const m = C.checkMesh(p.solid), b = C.solidBounds(p.solid), v = C.signedVolume(p.solid);
        if (m.open || !(v > 0) || Math.abs(b.mn[1]) > 1e-3 || [...p.solid.pos].some(x => !Number.isFinite(x))) bad.push(`${JSON.stringify(raw)} ${p.name}`);
        if (Math.max(b.mx[0] - b.mn[0], b.mx[2] - b.mn[2], b.mx[1] - b.mn[1]) > 250) bad.push(`${JSON.stringify(raw)} ${p.name} too big for a 256 mm bed`);
      }
      L.info.checks.filter(q => !q.ok).forEach(q => failedChecks.push(`${JSON.stringify(raw)} ${q.key} ${q.worst}`));
      if (!L.info.hold.ok) failedChecks.push(`${JSON.stringify(raw)} doesn't hold itself`);
    }
    check(!bad.length, `${cases.length} lamps, ${parts} parts: each closed, outward, finite, on the bed and smaller than the bed`, bad.slice(0, 3).join(" | "));
    check(!failedChecks.length, "every check over the travel passes (petal on petal, on the head, the runner, the links, the LEDs, the ring's hole), and each holds itself", failedChecks.slice(0, 3).join(" | "));
  }

  console.log("\nthe mechanism");
  {
    const L = F.make({}), P = L.plan, I = L.info;
    check(Math.abs(P.oc.end - P.oc.start - 180) < 1e-6 && Math.abs(P.oc.bottom - P.oc.top - 172) < 1e-6, "the crank turns 180° and its dead centres are 172° apart: 4° past each", `${P.oc.start.toFixed(1)}° to ${P.oc.end.toFixed(1)}°`);
    const ts = Array.from({ length: 21 }, (_, k) => k / 20), A = ts.map(t => L.assembly(t));
    check(A.every((a, k) => !k || (a.angle >= A[k - 1].angle - 1e-6 && a.drop >= A[k - 1].drop - 1e-6)), "as the servo turns, the rod only goes down and the petals only open");
    check(Math.abs(A[0].angle) < 1e-6 && Math.abs(A[20].angle - P.open) < 1.5, `closed at 0, open by the flower's ${P.open}° at the end`, A[20].angle.toFixed(1));
    const hub = a => a.hub - P.yPiv, lug = a => P.lugAt(a.angle * Math.PI / 180), len = a => Math.hypot(P.Rp + lug(a)[0] - P.Rh, P.yPiv + lug(a)[1] - a.hub);
    check(A.every(a => Math.abs(len(a) - P.l) < 0.01), "the link's length stays the same all the way (the runner, link and lug really join)", P.l.toFixed(2));
    check(A[0].hub - 3.2 > P.yLedTop && A[20].hub - 3.2 > P.yLedTop, "the runner is above the LEDs, closed and open");
    check(hub(A[0]) + 6 < P.y0 + P.Hf, "the runner sits inside the closed bud", `${(hub(A[0]) + 6).toFixed(0)} of ${(P.y0 + P.Hf).toFixed(0)} mm`);
    check(I.hold.closed < I.hold.friction / 10 && I.hold.open < I.hold.friction / 10, "past the dead centre the petals' weight turns the crank with under a tenth of what an unpowered servo holds", `${I.hold.closed} and ${I.hold.open} N·mm`);
    const tul = F.make({ style:"tulip", open:70 });
    check(tul.plan.open === 45 && tul.info.warn.some(w => /tulip opens by 45° at most/.test(w)), "a tulip asked to open 70° opens 45° and says why");
    const big = F.make({ led:"24", petals:14, dia:70 });
    check(big.info.size.flower > 70 && big.info.warn.some(w => /need a flower/.test(w)), "a 24-LED ring and 14 petals in a 70 mm flower: it grows, and says so", big.info.size.flower);
  }

  console.log("\nprinting: no support");
  {
    const bad = [];
    for (const raw of [{}, { style:"rose", petals:8 }, { style:"lotus", petals:10 }, { petals:14, dia:70, board:"nano" }, { style:"rose", dia:160, petals:5, board:"promini", control:"button" }]){
      for (const p of F.make(raw).printed){
        const r = C.analyzePrint([{ name:p.name, slot:0, pos:p.solid.pos, idx:p.solid.idx }], { overhang:45, bridge:20 });
        if (r.overhang.area > 5) bad.push(`${JSON.stringify(raw)} ${p.name} ${r.overhang.area.toFixed(1)} mm²`);
      }
    }
    check(!bad.length, "every part of five lamps prints as it lies with no support (at most 5 mm² of steep faces)", bad.slice(0, 3).join(" | "));
  }

  console.log("\npower and servos (Session 88)");
  {
    // where a ray from outside, level, towards the middle, first meets the base's shell within its wall: none means it is open
    const meets = (sol, o, d, far) => { const P = sol.pos, I = sol.idx; let n = 0;
      for (let t = 0; t < I.length; t += 3){ const a = 3*I[t], b = 3*I[t + 1], c = 3*I[t + 2];
        const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
        const pv = [d[1]*e2[2] - d[2]*e2[1], d[2]*e2[0] - d[0]*e2[2], d[0]*e2[1] - d[1]*e2[0]], det = e1[0]*pv[0] + e1[1]*pv[1] + e1[2]*pv[2]; if (Math.abs(det) < 1e-12) continue;
        const tv = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]], u = (tv[0]*pv[0] + tv[1]*pv[1] + tv[2]*pv[2])/det; if (u < 0 || u > 1) continue;
        const qv = [tv[1]*e1[2] - tv[2]*e1[1], tv[2]*e1[0] - tv[0]*e1[2], tv[0]*e1[1] - tv[1]*e1[0]], v = (d[0]*qv[0] + d[1]*qv[1] + d[2]*qv[2])/det; if (v < 0 || u + v > 1) continue;
        const tt = (e2[0]*qv[0] + e2[1]*qv[1] + e2[2]*qv[2])/det; if (tt > 0 && tt < far) n++; }
      return n; };
    const boxes = parts => parts.map(p => ({ name:p.name, b:C.solidBounds(p.solid) }));
    const overlap = (p, q) => [0, 1, 2].every(k => p.b.mn[k] < q.b.mx[k] - 0.05 && q.b.mn[k] < p.b.mx[k] - 0.05);
    const bad = [], room = [];
    for (const power of S.power.opts) for (const servo of ["SG90", "MG996R"]){
      const L = F.make({ power, servo }), I = L.info, Rb = I.size.base[0]/2, base = L.assembly(0).parts.find(p => p.name === "Base").solid;
      const want = { usbc:/USB-C socket board/, dc:/DC jack/, "18650":/18650 holder, 1 cell/, "2x18650":/2 cells/, "3xAA":/3 × AA/, lipo:/LiPo/ }[power];
      if (want && !I.bom.some(([, w]) => want.test(w))) bad.push(`${power}: the list has no ${want}`);
      if (I.power.battery !== !!(["18650", "2x18650", "3xAA", "lipo"].includes(power))) bad.push(`${power}: battery ${I.power.battery}`);
      if (I.power.battery && !(I.power.litHours > 0 && I.power.darkDays > 0)) bad.push(`${power}: no battery life`);
      if (I.power.battery && !I.bom.some(([, w]) => /latching push switch/.test(w))) bad.push(`${power}: no switch`);
      if (/18650|lipo/.test(power) && !I.bom.some(([, w]) => /charge-and-boost/.test(w))) bad.push(`${power}: no charge board`);
      for (const w of I.power.walls){
        const y = w.key === "switch" ? 13 : w.key === "dc" ? 12 : 6.2, n = [Math.cos(w.a), Math.sin(w.a)], o = [n[0]*(Rb + 4), y, n[1]*(Rb + 4)], d = [-n[0], 0, -n[1]];
        if (meets(base, o, d, 4 + 3.5)) bad.push(`${power} ${servo}: the ${w.key} opening is closed`);
        const a2 = w.a + 0.5, n2 = [Math.cos(a2), Math.sin(a2)];
        if (!meets(base, [n2[0]*(Rb + 4), 30, n2[1]*(Rb + 4)], [-n2[0], 0, -n2[1]], 4 + 3.5)) bad.push(`${power} ${servo}: the wall beside the ${w.key} is open`);
      }
      const want2 = { usbc:["usbc"], dc:["dc"], "18650":["charge", "switch"], "2x18650":["charge", "switch"], "3xAA":["switch"], lipo:["charge", "switch"], usb:[] }[power];
      if (I.power.walls.map(w => w.key).sort().join() !== want2.slice().sort().join()) bad.push(`${power}: in the wall ${I.power.walls.map(w => w.key).join()}`);
      // the bought parts don't run into each other (the battery, the servo, the board, the boards in the wall)
      const bought = boxes(L.assembly(0).parts.filter(p => p.role === "bought" && !/rod|NeoPixel/.test(p.name)));
      for (let i = 0; i < bought.length; i++) for (let j = i + 1; j < bought.length; j++) if (overlap(bought[i], bought[j])) bad.push(`${power} ${servo}: ${bought[i].name} runs into ${bought[j].name}`);
      for (const k of ["base", "floor"]){ const p = L.printed.find(q => q.key === k), r = C.analyzePrint([{ name:k, slot:0, pos:p.solid.pos, idx:p.solid.idx }], { overhang:45, bridge:20 });
        if (r.overhang.area > 5) bad.push(`${power} ${servo}: the ${k} needs ${r.overhang.area.toFixed(1)} mm² of support`); }
      if (!I.ok || !I.hold.ok) bad.push(`${power} ${servo}: a check fails`);
      room.push(`${power}/${servo} ${Math.round(2*Rb)}`);
    }
    check(!bad.length, "every way to power it, with a micro and a standard servo: the right parts listed, the openings open and the wall beside them closed, nothing running into anything, no support", bad.slice(0, 4).join(" | "));
    console.log("    base diameters (mm): " + room.join(", "));
    const usb = F.make({}).info.size.base[0], aa = F.make({ power:"3xAA" }), two = F.make({ power:"2x18650" });
    check(aa.info.size.base[0] <= usb + 20 && two.info.size.base[0] <= usb + 30 && two.info.power.cell.edge, "a battery holder stands on its edge where the base is tall enough, so the base grows little", `${usb} mm on USB; 3 × AA ${aa.info.size.base[0]} mm, two 18650s ${two.info.size.base[0]} mm (on edge: ${two.info.power.cell.edge})`);
    // servos: the standard digital one, and your own
    const ds = F.make({ servo:"DS3218" });
    check(ds.plan.S.label.startsWith("DS3218") && ds.info.ok && ds.info.hold.friction === 80 && ds.info.bom.some(([, w]) => /DS3218/.test(w)), "a DS3218 standard servo: listed, held by its stronger gears");
    const mine = F.make({ servo:"custom", servoL:30, servoW:15, servoH:28, servoSpan:40, servoHoles:35, servoTab:19, servoShaftX:7, servoShaftY:33 });
    check(mine.plan.S.L === 30 && mine.plan.S.W === 15 && mine.plan.SV.horn === "SG90" && mine.info.ok && !mine.info.warn.length && mine.printed.every(p => C.checkMesh(p.solid).open === 0),
      "your own servo, 30 × 15 × 28 mm: its sizes used, the micro horn, every part closed", mine.info.warn.join(" "));
    const big = F.make({ servo:"custom", servoL:41, servoW:20, servoH:38, servoSpan:30, servoHoles:60, servoTab:45, servoShaftX:25, servoShaftY:20 });
    check(big.plan.SV.horn === "MG996R" && big.plan.S.span >= 47 && big.plan.S.holes < big.plan.S.span && big.plan.S.shaftY > 38 && big.info.warn.some(w => /don't go together/.test(w)) && big.printed.every(p => C.checkMesh(p.solid).open === 0),
      "sizes that can't go together (tabs narrower than the body, holes past the tabs): made to, and said; a 20 mm wide servo gets the standard horn", big.info.warn.find(w => /go together/.test(w)));
  }

  console.log("\nthe sketch, the list, the steps");
  {
    const esp = F.make({}).info, nano = F.make({ board:"nano", control:"button", led:"16" }).info;
    check(/#include <ESP32Servo\.h>/.test(esp.sketch) && /touchRead\(TOUCH_PIN\)/.test(esp.sketch) && /servo\.detach\(\)/.test(esp.sketch) && /LED_COUNT = 12/.test(esp.sketch), "an ESP32 sketch: touch, the servo switched off at rest, 12 LEDs");
    check(/#include <Servo\.h>/.test(nano.sketch) && /INPUT_PULLUP/.test(nano.sketch) && /LED_COUNT = 16/.test(nano.sketch), "a Nano sketch: a button, 16 LEDs");
    check(esp.bom.some(([n, w]) => n === 18 && /1\.75 mm filament/.test(w)) && esp.bom.some(([, w]) => /SG90/.test(w)) && esp.bom.some(([, w]) => /4 mm rod.*mm long/.test(w)), "what you'll need: 18 filament pins for 6 petals, the servo, the rod cut to length");
    check(esp.assembly.length >= 6 && esp.notes.some(n => /No support/.test(n)), "the steps to put it together, and how each part prints");
  }

  console.log("\ncleaning settings");
  {
    const c = F.clean({ style:"<b>", petals:1e9, dia:-5, wall:"x", stem:NaN, open:-1, servo:"__proto__", led:24, board:{}, control:"touch", extra:1 });
    check(c.style === "tulip" && c.petals === 14 && c.dia === 70 && c.wall === 1 && c.stem === 140 && c.open === 0 && c.servo === "SG90" && c.led === "12" && c.board === "esp32devkit" && !("extra" in c),
      "anything odd is cleaned to the nearest allowed value or the default", JSON.stringify(c));
  }
}

(async () => {
  if (process.env.CORE || !process.argv[2]){
    global.earcut = require("earcut");
    require(path.resolve(__dirname, "src/core.js"));
    coreTests(global.PRCore);
  } else {
    const env = require(path.resolve(__dirname, "tools-test-env.js"))(process.argv[2]);
    const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(800);
    const MF = win.MakerForge, C = MF.core;
    coreTests(C);
    const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 3000; i++){ if (!MF.busy){ await sleep(40); if (!MF.busy) return; } await sleep(25); } };
    await require(path.resolve(__dirname, "tools-flower-app.js"))({ win, document, MF, C, settle, sleep, check });
  }
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
