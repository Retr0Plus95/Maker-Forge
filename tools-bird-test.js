// The bird house (Session 89): PRCore.bird in Node (every setting at its ends for each bird: each part closed, outward, finite and
// on the bed; support-free parts; the checks; the hole, the keyholes, the ports, the lens's window and the roof's screws lined up,
// tested with rays; the battery's life, what you'll need, the warnings, the camera's sketch, cleaning), then the Bird house object
// in the app (CORE=1 skips it): the panel, every slider and choice, the house and the plates, the roof's filament, the bed check,
// a saved and a hostile project (the export's files: tools-browser-check.js, ONLY=birdhouse).
// Usage: node tools-bird-test.js index.html     (CORE=1 for the library only)
const path = require("path");
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };

// how many faces of a solid a ray from o along d (unit) crosses before `far`: none means the way is open
function meets(sol, o, d, far){ const P = sol.pos, I = sol.idx; let n = 0;
  for (let t = 0; t < I.length; t += 3){ const a = 3*I[t], b = 3*I[t + 1], c = 3*I[t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const pv = [d[1]*e2[2] - d[2]*e2[1], d[2]*e2[0] - d[0]*e2[2], d[0]*e2[1] - d[1]*e2[0]], det = e1[0]*pv[0] + e1[1]*pv[1] + e1[2]*pv[2]; if (Math.abs(det) < 1e-12) continue;
    const tv = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]], u = (tv[0]*pv[0] + tv[1]*pv[1] + tv[2]*pv[2])/det; if (u < 0 || u > 1) continue;
    const qv = [tv[1]*e1[2] - tv[2]*e1[1], tv[2]*e1[0] - tv[0]*e1[2], tv[0]*e1[1] - tv[1]*e1[0]], v = (d[0]*qv[0] + d[1]*qv[1] + d[2]*qv[2])/det; if (v < 0 || u + v > 1) continue;
    const tt = (e2[0]*qv[0] + e2[1]*qv[1] + e2[2]*qv[2])/det; if (tt > 0 && tt < far) n++; }
  return n; }

function coreTests(C){
  const B = C.bird, S = B.settings, birds = Object.keys(B.birds);
  console.log("\nevery setting at its ends, for each bird");
  {
    const cases = [];
    for (const bird of birds){
      cases.push({ bird });
      for (const [k, sp] of Object.entries(S)){
        if (k === "bird") continue;
        if (Array.isArray(sp)){ cases.push({ bird, [k]:sp[1] }, { bird, [k]:sp[2] }); }
        else for (const o of sp.opts) cases.push({ bird, [k]:o });
      }
      cases.push({ bird, power:"2x18650", solar:"large", room:60 }, { bird, keyholes:"two", guard:0, slope:30, overhang:80, wall:6 }, { bird, camera:"none", sensor:"none", power:"none", solar:"none" });
    }
    const bad = [], big = [], over = [], screws = [];
    let parts = 0;
    for (const raw of cases){
      const L = B.make(raw);
      for (const p of L.printed){
        parts++;
        const m = C.checkMesh(p.solid), b = C.solidBounds(p.solid), v = C.signedVolume(p.solid);
        if (m.open || !(v > 0) || Math.abs(b.mn[1]) > 1e-3 || [...p.solid.pos].some(x => !Number.isFinite(x))) bad.push(`${JSON.stringify(raw)} ${p.name}`);
        if (Math.max(...b.size) > 255) (Object.keys(raw).some(k => Array.isArray(S[k])) ? over : big).push(`${JSON.stringify(raw)} ${p.name} ${b.size.map(Math.round).join("×")}`);
      }
      if (L.info.warn.some(w => /screws/.test(w))) screws.push(JSON.stringify(raw));
    }
    check(!bad.length, `${cases.length} houses, ${parts} parts: each closed, outward, finite and on the bed`, bad.slice(0, 3).join(" | "));
    check(!big.length, "at its sizes as they start, every bird's house fits a 256 mm bed with every choice", big.join(" | "));
    console.log(`  (bigger than a 256 mm bed, which the app's bed check points out: ${over.length} of the houses with a size at an end, e.g. ${over.slice(0, 2).join(" | ")})`);
    check(!screws.length, "the roof's screws fit the loft's sides at every setting", screws.slice(0, 3).join(" | "));
  }

  console.log("\nno support");
  {
    const bad = [];
    for (const raw of [{}, { bird:"bluetit" }, { bird:"starling", power:"2x18650", solar:"large" }, { bird:"robin", camera:"none", power:"none", solar:"none" },
      { power:"usbc", solar:"none" }, { keyholes:"two", guard:0, slope:30, overhang:80, wall:6 }, { slope:8, wall:2.4 }]){
      for (const p of B.make(raw).printed){
        const a = C.analyzePrint([{ name:p.name, slot:0, pos:p.solid.pos, idx:p.solid.idx }], { overhang:45, bridge:20 });
        if (a.overhang.area > 5) bad.push(`${JSON.stringify(raw)} ${p.name} ${a.overhang.area.toFixed(1)} mm²`);
      }
    }
    check(!bad.length, "every part of seven houses prints as it lies with no support (at most 5 mm² of steep faces)", bad.slice(0, 3).join(" | "));
  }

  console.log("\nthe checks");
  {
    const bad = [];
    for (const bird of birds){ const I = B.make({ bird }).info;
      if (!I.ok) bad.push(`${bird}: ${I.checks.filter(q => !q.ok).map(q => q.key).join()}`);
      if (I.checks.some(q => q.key === "height") === (bird === "robin")) bad.push(`${bird}: the hole's height check ${bird === "robin" ? "on an open front" : "missing"}`);
      if (!I.checks.some(q => q.key === "view")) bad.push(`${bird}: no camera view check`); }
    check(!bad.length, "each bird's house passes its checks: the floor, the hole's height over the floor (not on an open front), the camera's view", bad.join(" | "));
    const tight = B.make({ bird:"starling", tall:0, room:0 }).info, noCam = B.make({ camera:"none" }).info;
    check(tight.checks.find(q => q.key === "height").name.includes("150"), "a starling's hole is 150 mm over the floor");
    check(!noCam.checks.some(q => q.key === "view") && !noCam.sketch && !noCam.life, "with no camera: no view check, no sketch, no battery life");
  }

  console.log("\nlined up (rays)");
  {
    const bad = [], X = [-1, 0, 0], Z = [0, 0, 1], Y = [0, 1, 0];
    for (const raw of [{}, { bird:"bluetit", keyholes:"two" }, { bird:"starling", power:"2x18650", solar:"large", wall:6 }, { power:"usbc", slope:30 }, { bird:"sparrow", guard:0, room:30 }]){
      const L = B.make(raw), A = L.assembly().parts, P = L.plan, G = name => A.find(q => q.name === name).solid, lay = L.layout, tag = JSON.stringify(raw);
      const front = G("Front"), body = G("Body"), loft = G("Loft"), roof = G("Roof");
      // the hole: open through the front and its guard at its middle and 1 mm in from its edge; solid 2 mm outside it
      const [hx, hy, hz] = lay.hole, depth = P.tp + P.s.guard + 6;
      for (const dx of [0, P.hole / 2 - 1]) if (meets(front, [hx + dx, hy, hz + depth], [0, 0, -1], depth + 1)) bad.push(`${tag}: the hole is closed ${dx} mm from its middle`);
      if (!meets(front, [hx + P.hole / 2 + 2, hy, hz + depth], [0, 0, -1], depth + 1)) bad.push(`${tag}: the front is open beside the hole`);
      if (Math.abs(hy - (P.t + B.birds[P.s.bird].up + P.hole / 2)) > 1e-6) bad.push(`${tag}: the hole's height`);
      // each keyhole: open through the back wall into its pocket, closed by the pocket's skin (the screw's head stays out of the nest)
      for (const [x, y, z] of lay.keyholes){
        if (meets(body, [x, y, z - 5], Z, 5 + P.t + 3.3)) bad.push(`${tag}: the keyhole at ${x} is closed`);
        if (meets(body, [x, y + 7, z - 5], Z, 5 + P.t + 3.3)) bad.push(`${tag}: the keyhole's slot at ${x} is closed`);
        if (!meets(body, [x, y, z - 5], Z, 5 + P.t + 6)) bad.push(`${tag}: the keyhole at ${x} opens into the nest`);
        if (!meets(body, [x + 9, y, z - 5], Z, 5 + P.t + 0.5)) bad.push(`${tag}: the back is open beside the keyhole`);
      }
      // the ports and the switch: open through the loft's right-hand wall, and the roof's rim clear above them
      for (const q of lay.ports){ const o = q.at.map((v, k) => v + q.out[k] * 5), d = q.out.map(v => -v);
        if (meets(loft, [o[0], o[1] + 0.5, o[2]], d, 5 + 2.4 + 0.5)) bad.push(`${tag}: the ${q.key} opening is closed`);
        if (meets(roof, [o[0], o[1] + 11, o[2]], d, 5 + 2.4 + 0.5)) bad.push(`${tag}: the roof's rim comes down over the ${q.key}`); }
      if ((raw.power || "18650") !== "none" && !lay.ports.length) bad.push(`${tag}: no switch or port in the wall`);
      // it hangs flat: nothing stands out behind the back
      const behind = A.filter(q => C.solidBounds(q.solid).mn[2] < P.zB - 0.01).map(q => q.name);
      if (behind.length) bad.push(`${tag}: behind the back: ${behind.join(", ")}`);
      // the lens's window and the sensor's hole: open up through the loft's plate (the nest's ceiling)
      for (const [k, at] of [["lens", lay.lens], ["sensor", lay.pir]]) if (at && meets(loft, [at[0], at[1] - 5, at[2]], Y, 5 + 2.4 + 0.5)) bad.push(`${tag}: the ${k}'s hole is closed`);
      // the roof's screws: through the rim's hole and the loft's pilot hole at their middle; 1.5 mm off it, the screw bites the loft
      // and still clears the roof
      const [sx, sy, sz] = lay.screw, o = [sx - Math.sign(sx) * -6, sy, sz], d = [-Math.sign(sx), 0, 0];
      if (meets(roof, o, d, 18) || meets(loft, o, d, 18)) bad.push(`${tag}: the screw's line is blocked`);
      for (const o2 of [[o[0], o[1], o[2] + 1.5], [o[0], o[1], o[2] - 1.5], [o[0], o[1] - 1.5, o[2]]])    // (the pilot's top is pointed: not upwards)
        if (meets(roof, o2, d, 18) || !meets(loft, o2, d, 18)) bad.push(`${tag}: the screw doesn't bite the loft, or the roof's hole is too small (${o2.map((v, k) => (v - o[k]).toFixed(1))})`);
    }
    check(!bad.length, "the hole and its guard, the keyholes and their pockets, the side ports under the roof, the lens's window, the sensor's hole and the roof's screws are open where they should be; nothing stands out behind the back", bad.slice(0, 4).join(" | "));
  }

  console.log("\nthe battery, what you'll need, the warnings");
  {
    const one = B.make({}).info, two = B.make({ power:"2x18650" }).info, busy = B.make({ visits:200 }).info, large = B.make({ solar:"large" }).info;
    check(one.life && Math.abs(two.life.days / one.life.days - 2) < 0.05 && busy.life.days < one.life.days && large.life.solar > one.life.solar && one.life.solar > 0,
      "two cells last twice as long, more visits less, a bigger panel brings more", `${one.life.days} / ${two.life.days} / ${busy.life.days} days; ${one.life.solar} / ${large.life.solar} mAh`);
    check(!B.make({ power:"usbc" }).info.life && !B.make({ power:"none" }).info.life, "no battery life on a USB-C socket or with no power");
    const has = (I, re) => I.bom.some(([, w]) => re.test(w));
    check(has(one, /charge-and-boost/) && has(one, /latching push switch/) && has(one, /18650 holder, 1 cell/) && has(one, /ESP32-CAM/) && has(one, /AM312/) && has(one, /1 W panel/),
      "one 18650: the charge board, the switch, the holder, the camera, the sensor, the panel");
    check(two.bom.some(([n, w]) => n === 2 && /18650 cells/.test(w)) && has(two, /2 cells/), "two 18650s: two cells and a holder for two");
    const usb = B.make({ power:"usbc", solar:"none" }).info, bare = B.make({ camera:"none", power:"none", solar:"none" }).info, keys = B.make({ keyholes:"two" }).info;
    check(has(usb, /USB-C socket board/) && !has(usb, /charge-and-boost/) && !has(bare, /ESP32/) && !has(bare, /wires/) && keys.bom.some(([n, w]) => n === 2 && /to hang it by/.test(w)),
      "a USB-C socket on its own; no electronics with none; two screws to hang it by with two keyholes");
    check(!one.warn.length && B.make({ power:"usbc" }).info.warn.some(w => /solar panel needs a battery/.test(w)) && B.make({ camera:"none" }).info.warn.some(w => /motion sensor wakes the camera/.test(w)),
      "no warnings by default; a panel without a battery and a sensor without a camera are each pointed out", one.warn.join(" "));
    check(one.steps.length >= 6 && one.notes.some(n => /No support/.test(n)) && one.notes.some(n => /infrared/.test(n)), "the steps, how each part prints, and the advice on light inside the box");
  }

  console.log("\nthe camera's sketch");
  {
    const pir = B.make({}).info.sketch, timer = B.make({ sensor:"none" }).info.sketch;
    const balanced = t => (t.match(/{/g) || []).length === (t.match(/}/g) || []).length && (t.match(/\(/g) || []).length === (t.match(/\)/g) || []).length;
    check(/esp_sleep_enable_ext0_wakeup\(PIR, 1\)/.test(pir) && /GPIO_NUM_13/.test(pir) && /esp_sleep_enable_timer_wakeup/.test(timer) && !/ext0/.test(timer),
      "with the sensor it wakes on GPIO 13; without, on a timer");
    check(/SD_MMC\.begin\("\/sdcard", true\)/.test(pir) && /SD_MMC\.exists/.test(pir) && /rtc_gpio_hold_en\(GPIO_NUM_4\)/.test(pir) && balanced(pir) && balanced(timer),
      "1-bit SD (GPIO 13 stays free), photos never written over after a power cut, the flash held off, brackets balanced");
  }

  console.log("\ncleaning settings");
  {
    const c = B.clean({ bird:"<b>", room:1e9, tall:-5, wall:"x", guard:NaN, slope:99, keyholes:"__proto__", camera:{}, power:18650, solar:"huge", visits:-1, extra:1 });
    check(c.bird === "greattit" && c.room === 60 && c.tall === 0 && c.wall === 3 && c.guard === 15 && c.slope === 30 && c.keyholes === "one" && c.camera === "esp32cam" && c.power === "18650" && c.solar === "small" && c.visits === 1 && !("extra" in c),
      "anything odd is cleaned to the nearest allowed value or the default", JSON.stringify(c));
    check(JSON.stringify(B.clean(null)) === JSON.stringify(B.clean({})) && JSON.stringify(B.clean([1])) === JSON.stringify(B.clean({})), "nothing, or a list, gives the defaults");
  }
}

async function appTests({ win, document, MF, C, settle, sleep }){
  const $$ = s => [...document.querySelectorAll(s)];
  const sel = document.querySelector("#objectSel"); sel.value = "birdhouse"; sel.dispatchEvent(new win.Event("change")); await settle();
  [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(30);
  const closed = () => MF.parts.length >= 4 && MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const sig = () => MF.parts.map(p => p.name + ":" + p.solid.idx.length + ":" + C.signedVolume(p.solid).toFixed(2) + ":" + C.memo.hash(p.solid.pos)).join("|");
  const slider = label => $$("#panel input[type=range]").find(x => x.getAttribute("aria-label") === label);
  const pick = async (label, value) => { const s = $$("#panel select").find(x => x.closest(".field") && x.closest(".field").textContent.includes(label)); if (!s) return false; s.value = value; s.dispatchEvent(new win.Event("change")); await settle(); await sleep(20); return true; };
  const hints = () => $$("#panel .hint, #panel .sub").map(h => h.textContent).join("\n");
  const H = () => MF.state.base.birdhouse;

  console.log("\nthe Bird house object");
  {
    check(closed() && MF.birdhouse && MF.birdhouse.info.ok, "it builds: every part closed, every check passing", MF.parts.map(p => p.name).join(", "));
    check(MF.parts.filter(p => /Roof|Solar/.test(p.name)).every(p => p.slot === 1) && MF.parts.filter(p => !/Roof|Solar/.test(p.name)).every(p => p.slot === 0), "the roof and the panel's frame in the second filament, the rest in the first");
    check(MF.parts.every(p => p.plate != null), "laid out on plates of the bed", `${new Set(MF.parts.map(p => p.plate)).size} plates`);
    check(/About [\d.]+ days on a charge/.test(hints()) && /Inside 120 × 120/.test(hints()), "the panel says how long the battery lasts and the size inside");
  }

  console.log("\nevery slider and choice");
  {
    const bad = [], dead = [];
    for (const sp of Object.values(C.bird.settings).filter(Array.isArray)){
      const label = sp[4], keys = [];
      for (const t of ["min", "max"]){
        const r = slider(label); if (!r){ bad.push(`no slider "${label}"`); break; }
        r.value = r.getAttribute(t); r.dispatchEvent(new win.Event("input")); await settle();
        if (!closed()) bad.push(`${label} at ${t}`);
        keys.push(sig() + (label.startsWith("Visits") ? hints() : ""));
      }
      const r2 = slider(label); if (r2){ r2.value = String(sp[0]); r2.dispatchEvent(new win.Event("input")); await settle(); }
      if (keys.length === 2 && keys[0] === keys[1]) dead.push(label);
    }
    check(!bad.length, "every slider at both ends builds closed", bad.join(" | "));
    check(!dead.length, "no slider leaves the house unchanged at both ends (the visits change the battery's days)", dead.join(", "));
    for (const [label, value, what] of [["For", "starling", "a starling's house"], ["For", "robin", "an open front"], ["Hang it by", "two", "two keyholes"], ["Solar panel", "large", "the large panel"],
      ["Power", "2x18650", "two cells"], ["Power", "usbc", "a USB-C socket"], ["Motion sensor", "none", "no sensor"], ["Camera", "none", "no camera"]]){
      const before = sig(), ok = await pick(label, value);
      check(ok && sig() !== before && closed(), `${what}: the parts change and stay closed`);
    }
    check(!slider("Visits a day (for the battery)") && /solar panel needs a battery/.test(hints()), "no camera on a battery: no visits slider; the panel without a battery is pointed out");
    MF.state.base.birdhouse.set = C.bird.clean({}); MF.rebuild(false); await settle(); MF.renderTab && MF.renderTab();
  }

  console.log("\nthe house, the plates, the roof's filament, the bed");
  {
    const parts = sig();
    $$("#panel button").find(x => x.textContent === "Parts to print").click(); await settle();
    check(H().show === "plates" && sig() === parts, "Parts to print shows the plates; the files are the same either way");
    $$("#panel button").find(x => x.textContent === "The house").click(); await settle();
    const names = MF.birdhouse.assembly().parts.map(p => p.name).join(" | ");
    check(/ESP32-CAM/.test(names) && /AM312/.test(names) && /18650 holder/.test(names) && /latching push switch/.test(names) && /panel/.test(names), "the picture of the house has the camera, the sensor, the battery, the switch and the panel in it");
    await pick("Roof's filament", "2");
    check(MF.parts.filter(p => /Roof|Solar/.test(p.name)).every(p => p.slot === 2) && MF.parts.find(p => p.name === "Body").slot === 0, "the roof's filament can be chosen");
    H().set.tall = 80; MF.rebuild(false); await settle();
    const bed = MF.checks.list.find(l => /bed/i.test(l.t));
    check(bed && bed.k !== "ok", "a house too tall for the bed is flagged by the bed check", bed && `${bed.k}: ${bed.t}`);
    H().set.tall = 0; H().roofSlot = 1; MF.rebuild(false); await settle();
  }

  console.log("\nsaved and opened again; a hostile project");
  {
    const inp = document.querySelector("#projInput");
    const open = async text => { const f = new win.File([text], "p.json", { type:"application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    Object.assign(H().set, { bird:"bluetit", keyholes:"two", slope:20, power:"2x18650" }); H().show = "plates"; H().roofSlot = 3; MF.rebuild(false); await settle();
    const want = JSON.stringify(H()); await open(MF.projectPayload(true));
    check(JSON.stringify(H()) === want && MF.state.base.type === "birdhouse" && closed(), "the house, its settings, the view and the roof's filament come back from a saved project");
    const st = JSON.parse(MF.projectPayload()).state;
    st.base.birdhouse = { set:{ bird:"<img src=x>", room:1e9, wall:-4, power:"__proto__" }, show:"<b>", roofSlot:-3 };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    const Hq = H();
    check(Hq.set.bird === "greattit" && Hq.set.room === 60 && Hq.set.wall === 2.4 && Hq.set.power === "18650" && Hq.show === "house" && Hq.roofSlot === 0 && closed(),
      "a hostile project: markup, huge and negative numbers, a strange power: cleaned, and it builds", JSON.stringify(Hq));
    st.base.birdhouse = [1, 2]; await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    check(JSON.stringify(H().set) === JSON.stringify(C.bird.clean({})) && closed(), "a list in its place gives the defaults");
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
    await appTests({ win, document, MF, C, settle, sleep });
    if (env.errors && env.errors.length) check(false, "no page errors", env.errors[0].split("\n")[0]);
  }
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
