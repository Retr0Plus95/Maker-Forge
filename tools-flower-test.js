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
        if (Array.isArray(sp)){ cases.push({ style, [k]:sp[1] }); cases.push({ style, [k]:sp[2] }); }
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
