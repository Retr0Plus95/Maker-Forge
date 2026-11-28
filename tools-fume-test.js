// The fume extractor (Session 95): PRCore.fume in Node (every setting at its ends: each part closed, outward, finite and on the bed;
// no support; the corner screws, the fans' bolts, the air's way through, the display's window and the knob checked with rays through
// the parts put together; the checks, the warnings, what you'll need, cleaning), then the Fume extractor object in the app (CORE=1
// skips it): the panel, every slider and choice, the extractor and the plates, the panels' filament, a saved and a hostile project.
// Usage: node tools-fume-test.js index.html     (CORE=1 for the library only)
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
  const F = C.fume, S = F.settings;
  console.log("\nevery setting at its ends");
  {
    const cases = [{}];
    for (const [k, sp] of Object.entries(S)){
      if (Array.isArray(sp)) cases.push({ [k]:sp[1] }, { [k]:sp[2] });
      else if (sp.opts) for (const o of sp.opts) cases.push({ [k]:o });
      else cases.push({ [k]:"SIR SUCKS-A-LOT" });
    }
    for (const fan of F.settings.fan.opts) cases.push({ fan, fans:"1", bay:"none" }, { fan, fans:"2", grille:"honeycomb", name:"RETR0+" }, { fan, boardW:30, boardH:20, display:"oled096", sw:"toggle", power:"usbc" });
    const bad = [], big = [];
    let parts = 0;
    for (const raw of cases){
      const L = F.make(raw);
      for (const p of L.printed){
        parts++;
        const m = C.checkMesh(p.solid), b = C.solidBounds(p.solid), v = C.signedVolume(p.solid);
        if (m.open || !(v > 0) || Math.abs(b.mn[1]) > 1e-3 || [...p.solid.pos].some(x => !Number.isFinite(x))) bad.push(`${JSON.stringify(raw)} ${p.name}`);
        if (Math.max(b.size[0], b.size[2]) > 255 && !(raw.bayH > 100 && raw.fan === "140")) big.push(`${JSON.stringify(raw)} ${p.name} ${b.size.map(Math.round).join("×")}`);
      }
    }
    check(!bad.length, `${cases.length} extractors, ${parts} parts: each closed, outward, finite and on the bed`, bad.slice(0, 3).join(" | "));
    check(!big.length, "every one fits a 256 mm bed (but a 140 mm fan with the tallest bay, which says so)", big.slice(0, 3).join(" | "));
    check(F.make({ fan:"140", bayH:120 }).info.warn.some(w => /bed bigger than 256/.test(w)), "the tallest, with a 140 mm fan, says it needs a bigger bed");
  }

  console.log("\nno support");
  {
    const bad = [];
    for (const raw of [{}, { fan:"80", fans:"1" }, { fan:"140", grille:"honeycomb" }, { bay:"none", feet:"none" }, { pad:25, display:"oled096", sw:"round", power:"usbc" }]){
      for (const p of F.make(raw).printed){
        const a = C.analyzePrint([{ name:p.name, slot:0, pos:p.solid.pos, idx:p.solid.idx }], { overhang:45, bridge:20 });
        if (a.overhang.area > 5) bad.push(`${JSON.stringify(raw)} ${p.name} ${a.overhang.area.toFixed(1)} mm²`);
      }
    }
    check(!bad.length, "the duct on its back, the panels and the tray flat: nothing needs support", bad.join(" | "));
    const named = F.make({ name:"SIR SUCKS-A-LOT" }).printed.find(p => p.key === "body"), a = C.analyzePrint([{ name:"b", slot:0, pos:named.solid.pos, idx:named.solid.idx }], { overhang:45, bridge:20 });
    check(a.overhang.area < 40, "the raised name on the side: only the letters' small undersides", `${a.overhang.area.toFixed(1)} mm²`);
  }

  console.log("\nput together: the screws, the fans' bolts, the air's way, the display and the knob");
  for (const raw of [{}, { fan:"80", fans:"1", boardW:60, boardH:50 }, { fan:"140", grille:"honeycomb", display:"oled096" }]){
    const L = F.make(raw), P = L.plan, A = L.assembly().parts, part = n => A.find(q => q.name === n).solid;
    const body = part("Duct body"), front = part("Front panel"), rear = part("Rear cap"), tray = part("Filter tray"), tag = JSON.stringify(raw);
    // through each panel's screw hole and 5 mm into the boss's insert hole
    const screws = P.bosses.every(([x, y]) => !meets(front, [x, y, P.D + 10], [0, 0, -1], 10 + 3 + 5) && !meets(body, [x, y, P.D + 10], [0, 0, -1], 10 + 5)
      && !meets(rear, [x, y, -10], [0, 0, 1], 10 + 5) && !meets(body, [x, y, -10], [0, 0, 1], 10 + 5));
    check(screws, `${tag}: every corner screw goes through the panels into its boss's insert hole (${P.bosses.length} at each end)`);
    const h = P.F.hole / 2, bolts = [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([a, b]) => !meets(rear, [a * h, P.yC + b * h, -10], [0, 0, 1], 20));
    check(bolts, `the fan's bolt holes in the rear cap, ${P.F.hole} mm apart (the fan's own)`);
    // the air: in through the front grille, through a cell of the tray's grid, out of the rear cap; the walls don't leak
    let rays = 0, open = 0; const R = P.fan / 2 - 6;
    for (let x = -R; x <= R; x += 4) for (let y = -R; y <= R; y += 4){ if (Math.hypot(x, y) > R) continue; rays++;
      if ([front, tray, rear].every(s => !meets(s, [x + 0.3, P.yC + y + 0.7, P.D + 20], [0, 0, -1], P.D + 40))) open++; }
    check(open / rays > 0.3, "the air's way is open: rays straight through the front grille, the tray's grid and the rear grille", `${open} of ${rays} rays`);
    check(meets(body, [P.W / 2 + 5, P.yC, P.D / 2], [-1, 0, 0], P.W + 10) >= 2, "and the duct's walls are closed round it");
    if (P.lay && P.lay.disp){ const d = P.lay.disp; check(!meets(front, [d.x, d.y + (P.DS.dy || 0), P.D + 10], [0, 0, -1], 20), "the display's window is open"); }
    P.lay && P.lay.ctl.forEach(q => check(!meets(front, [q.x, q.y, P.D + 10], [0, 0, -1], 20), `the ${q.k === "knob" ? "knob's" : "switch's"} hole is open`));
    // the tray sits in front of its stops, clear of the bosses (none of its corners inside one)
    const tb = C.solidBounds(tray);
    check(tb.mn[2] >= P.ribZ + 2 - 1e-6 && tb.mx[2] <= P.D && Math.abs(tb.size[0] - P.trayS) < 0.01, "the tray sits between its stops and the front panel", `${tb.mn[2].toFixed(1)}..${tb.mx[2].toFixed(1)} of ${P.D}`);
    check(L.info.checks.find(c => /fans fit/.test(c.name)).ok && L.info.checks.find(c => /tray clears/.test(c.name)).ok, "the fans' corners and the tray's cut corners clear the bosses");
  }

  console.log("\nthe checks, the warnings, what you'll need");
  {
    const d = F.make({});
    check(d.info.checks.every(c => c.ok) && !d.info.warn.length, "as it starts: every check passes, no warnings", d.info.checks.filter(c => !c.ok).map(c => c.name).join(", "));
    check(d.info.size.outside.join("×") === "135×218×79" && d.info.size.tray.join("×") === "129×129×16", "two 120 mm fans: about 135 × 218 × 79 mm, a 129 mm tray", d.info.size.outside.join("×"));
    const bom = d.info.bom.map(([n, w]) => `${n} ${w}`).join(" | ");
    check(/^2 120 mm fans/.test(bom) && /8 M3 heat inserts/.test(bom) && /4 M4 × 60 mm bolts/.test(bom) && /1602 LCD/.test(bom) && /potentiometer/.test(bom) && /DC panel socket/.test(bom), "what you'll need: the fans, 8 inserts, M4 × 60 bolts, the display, the knob, the socket", bom.slice(0, 160));
    check(/Retr0Plus95\/Solder-Fume-Extractor/.test(d.info.notes.join(" ")), "the notes credit the owner's project");
    const one = F.make({ fans:"1" });
    check(one.info.bom.some(([n, w]) => n === 4 && /M4 × 35 mm/.test(w)) && one.plan.D < d.plan.D, "one fan: a shallower duct and shorter bolts");
    const small = F.make({ fan:"80" });
    check(!small.info.checks.find(c => /board fits/.test(c.name)).ok && small.info.warn.some(w => /board is bigger than the bay/.test(w)), "an 80 mm fan with the 90 × 70 board: the board check fails and says why");
    check(small.plan.lay.disp && small.plan.lay.disp.y > small.plan.lay.ctl[0].y, "and with its narrower bay the display goes above the knob and the switch");
    const none = F.make({ bay:"none" });
    check(none.info.warn.some(w => /no electronics bay/.test(w)) && !none.info.bom.some(([, w]) => /LCD|potentiometer|socket/.test(w)) && none.plan.H < d.plan.H, "no bay: a shorter duct, the electronics left out and said so");
    const tight = F.make({ fans:"1", pad:3 });
    check(!tight.info.checks.find(c => /Room between/.test(c.name)).ok, "one fan and a thin pad: too shallow for the display behind the panel, and it says so");
  }

  console.log("\ncleaning");
  {
    const c = F.clean({ fan:"<b>", fans:3, pad:1e9, bay:"__proto__", bayH:-5, display:{}, wall:"x", name:"<img src=x> sir!", boardW:NaN, extra:1 });
    check(c.fan === "120" && c.fans === "2" && c.pad === 25 && c.bay === "below" && c.bayH === 50 && c.display === "lcd1602" && c.wall === 2.4 && c.name === "IMG SRCX SIR" && c.boardW === 90 && !("extra" in c),
      "anything odd is cleaned to the nearest allowed value or the default; the name keeps only letters it can draw", JSON.stringify(c));
    check(JSON.stringify(F.clean(null)) === JSON.stringify(F.clean({})) && F.clean({ name:"A".repeat(40) }).name.length === 16, "nothing gives the defaults; the name stops at 16 letters");
  }
}

async function appTests({ win, document, MF, C, settle, sleep }){
  const $$ = s => [...document.querySelectorAll(s)];
  $$(".objcard").find(b => b.dataset.k === "fume").click(); await settle();
  [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(30);
  const closed = () => MF.parts.length === 4 && MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const sig = () => MF.parts.map(p => p.name + ":" + p.solid.idx.length + ":" + C.signedVolume(p.solid).toFixed(2)).join("|");
  const slider = label => $$("#panel input[type=range]").find(x => x.getAttribute("aria-label") === label);
  const pick = async (label, value) => { const s = $$("#panel select").find(x => x.closest(".field") && x.closest(".field").textContent.includes(label)); if (!s) return false; s.value = value; s.dispatchEvent(new win.Event("change")); await settle(); return true; };
  const hints = () => $$("#panel .hint, #panel .sub").map(h => h.textContent).join("\n");
  const Fz = () => MF.state.base.fume;

  console.log("\nthe Fume extractor object");
  {
    check(MF.state.base.type === "fume" && closed() && MF.fume && MF.fume.info.checks.every(c => c.ok), "it opens from Start from and builds: four parts, closed, every check passing", MF.parts.map(p => p.name).join(", "));
    check(MF.parts.filter(p => /panel|cap/i.test(p.name)).every(p => p.slot === 1) && MF.parts.filter(p => !/panel|cap/i.test(p.name)).every(p => p.slot === 0), "the panels in the second filament, the duct and the tray in the first");
    check(MF.parts.every(p => p.plate != null), "laid out on plates of the bed", `${new Set(MF.parts.map(p => p.plate)).size} plates`);
    check(/Outside about 135 × 218 × 79 mm/.test(hints()) && /Retr0Plus95\/Solder-Fume-Extractor/.test(hints()), "the panel gives the size and credits the owner's project");
    const bed = MF.checks.list.find(l => /bed/i.test(l.t) && l.k !== "ok");
    check(!bed, "every plate fits the bed", bed && bed.t);
  }

  console.log("\nevery slider and choice");
  {
    const bad = [], dead = [];
    for (const sp of Object.values(C.fume.settings).filter(Array.isArray)){
      const label = sp[4], keys = [];
      for (const t of ["min", "max"]){
        const r = slider(label); if (!r){ bad.push(`no slider "${label}"`); break; }
        r.value = r.getAttribute(t); r.dispatchEvent(new win.Event("input")); await settle();
        if (!closed()) bad.push(`${label} at ${t}`);
        keys.push(sig());
      }
      const r2 = slider(label); if (r2){ r2.value = String(sp[0]); r2.dispatchEvent(new win.Event("input")); await settle(); }
      if (keys.length === 2 && keys[0] === keys[1]) dead.push(label);
    }
    check(!bad.length, "every slider at both ends builds closed", bad.join(" | "));
    check(!dead.length, "no slider leaves the extractor unchanged at both ends", dead.join(", "));
    for (const [label, value, what] of [["Fan size", "92", "a 92 mm fan"], ["Fans in line", "1", "one fan"], ["Display", "oled096", "the OLED"], ["Power switch", "round", "a round rocker"],
      ["Power in", "usbc", "a USB-C socket"], ["Grilles", "honeycomb", "honeycomb grilles"], ["Feet", "none", "no rails"], ["Speed knob", "none", "no knob"]]){
      const before = sig(), ok = await pick(label, value);
      check(ok && sig() !== before && closed(), `${what}: the parts change and stay closed`);
    }
    await pick("Electronics bay", "none");
    check(!slider("Bay, inside (mm tall)") && !$$("#panel select").some(x => x.closest(".field").textContent.includes("Display")) && /no electronics bay/.test(hints()), "no bay: its settings are hidden and it says the electronics are left out");
    const name = $$("#panel input[type=text]").find(x => x.closest(".field").textContent.includes("Name on the side"));
    const before = sig(); name.value = "sir <b>"; name.dispatchEvent(new win.Event("input")); await sleep(400); await settle();
    check(Fz().set.name === "SIR B" && sig() !== before && closed(), "the name on the side: cleaned, and raised on the duct", Fz().set.name);
    Fz().set = C.fume.clean({}); MF.rebuild(false); await settle(); MF.renderTab && MF.renderTab();
  }

  console.log("\nthe extractor, the plates, the panels' filament");
  {
    const parts = sig();
    $$("#panel button").find(x => x.textContent === "Parts to print").click(); await settle();
    check(Fz().show === "plates" && sig() === parts, "Parts to print shows the plates; the files are the same either way");
    $$("#panel button").find(x => x.textContent === "The extractor").click(); await settle();
    const names = MF.fume.assembly().parts.map(p => p.name).join(" | ");
    check(/Fan 1/.test(names) && /Fan 2/.test(names) && /Carbon pad/.test(names) && /Board/.test(names) && /Display/.test(names) && /Knob/.test(names), "the picture of the extractor has the fans, the pad, the board, the display and the knob", names);
    await pick("Panels' filament", "2");
    check(MF.parts.filter(p => /panel|cap/i.test(p.name)).every(p => p.slot === 2) && MF.parts.find(p => p.name === "Duct body").slot === 0, "the panels' filament can be chosen");
    Fz().panelSlot = 1; MF.rebuild(false); await settle();
  }

  console.log("\nsaved and opened again; a hostile project");
  {
    const inp = document.querySelector("#projInput");
    const open = async text => { const f = new win.File([text], "p.json", { type:"application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    Object.assign(Fz().set, { fan:"140", fans:"1", grille:"honeycomb", name:"RETR0+" }); Fz().show = "plates"; Fz().panelSlot = 3; MF.rebuild(false); await settle();
    const want = JSON.stringify(Fz()); await open(MF.projectPayload(true));
    check(JSON.stringify(Fz()) === want && MF.state.base.type === "fume" && closed(), "the extractor, its settings, the view and the panels' filament come back from a saved project");
    const st = JSON.parse(MF.projectPayload()).state;
    st.base.fume = { set:{ fan:"<img src=x>", pad:1e9, wall:-4, name:"<script>", bay:"__proto__" }, show:"<b>", panelSlot:-3 };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    const Fq = Fz();
    check(Fq.set.fan === "120" && Fq.set.pad === 25 && Fq.set.wall === 1.6 && Fq.set.name === "SCRIPT" && Fq.set.bay === "below" && Fq.show === "together" && Fq.panelSlot === 0 && closed(),
      "a hostile project: markup, huge and negative numbers, a strange bay: cleaned, and it builds", JSON.stringify(Fq));
    st.base.fume = [1, 2]; await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    check(JSON.stringify(Fz().set) === JSON.stringify(C.fume.clean({})) && closed(), "a list in its place gives the defaults");
  }
}

(async () => {
  if (process.env.CORE || !process.argv[2]){
    global.earcut = require("earcut");
    require(path.resolve(__dirname, "src/core.js"));
    coreTests(global.PRCore);
  } else {
    const env = require(path.resolve(__dirname, "tools-test-env.js"))(process.argv[2]);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(800);
    const win = env.window, document = win.document, MF = win.MakerForge, C = MF.core;
    const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 4000; i++){ if (!MF.busy){ await sleep(40); if (!MF.busy) return; } await sleep(25); } };
    coreTests(C);
    await appTests({ win, document, MF, C, settle, sleep });
    if (env.errors.length) check(false, "no page errors", env.errors[0].split("\n")[0]);
  }
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
