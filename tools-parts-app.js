// The Mechanical parts object in the app (Session 82), run by tools-parts-test.js: every part from the panel, each slider at its
// ends (closed, and the model changes: no dead controls), a choice that changes the part, a saved project, a hostile project.
module.exports = async function partsApp({ win, document, MF, C, settle, sleep, check }) {
  const $$ = s => [...document.querySelectorAll(s)];
  const sel = document.querySelector("#objectSel"); sel.value = "parts"; sel.dispatchEvent(new win.Event("change")); await settle();
  [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(30);
  const closed = () => MF.parts.length === 1 && MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  // the part and what the panel says about it (a calculator's settings change its travel and notes, not its shape)
  const sig = () => MF.parts.map(p => p.solid.idx.length + ":" + C.signedVolume(p.solid).toFixed(3)).join("|") + JSON.stringify(MF.mechParts && [MF.mechParts.meta.travel && MF.mechParts.meta.travel.rows, MF.mechParts.meta.notes]);
  const choose = async key => { const s = $$("#panel select").find(x => [...x.options].some(o => o.value === "servoMount")); s.value = key; s.dispatchEvent(new win.Event("change")); await settle(); await sleep(20); };

  console.log("\nthe Mechanical parts object: every part, each slider at its ends");
  {
    const list = C.parts.list(), bad = [], dead = []; let n = 0;
    for (const p of list) {
      await choose(p.key);
      if (!closed() || MF.state.base.parts.kind !== p.key) { bad.push(`${p.key}: did not build`); continue; }
      const labels = Object.values(p.settings).filter(Array.isArray).map(sp => sp[4]);
      for (const label of labels) {
        const keys = [];
        for (const t of ["min", "max"]) {
          const r = $$("#panel input[type=range]").find(x => x.getAttribute("aria-label") === label);
          if (!r) { bad.push(`${p.key}: no slider "${label}"`); break; }
          r.value = r.getAttribute(t); r.dispatchEvent(new win.Event("input")); await settle(); n++;
          if (!closed()) bad.push(`${p.key}: ${label} at ${t}`);
          keys.push(sig());
        }
        // back to the default for the next one
        const sp = Object.values(p.settings).find(x => Array.isArray(x) && x[4] === label), r2 = $$("#panel input[type=range]").find(x => x.getAttribute("aria-label") === label);
        if (r2) { r2.value = String(sp[0]); r2.dispatchEvent(new win.Event("input")); await settle(); }
        if (keys.length === 2 && keys[0] === keys[1]) dead.push(`${p.key}: ${label}`);
      }
    }
    check(!bad.length, `${list.length} parts from the panel, ${n} slider ends: each builds closed`, bad.slice(0, 3).join(" | "));
    // a few sliders only act at some settings (a hub of 0 mm, holes that are already the most there's room for): expected
    const expected = ["spurGear: Hub height (mm)", "servoHorn: Holes along the arm", "pushRod: Servo shaft to output pivot (mm)"];   // (the rod jams at both its ends: 10 and 200 mm)
    const real = dead.filter(d => !expected.includes(d));
    check(!real.length, "no slider leaves the part unchanged at both its ends", real.join(", "));
  }

  console.log("\na choice, the notes, the clearance");
  {
    await choose("servoMount");
    const a = sig(), s = $$("#panel select").find(x => [...x.options].some(o => o.value === "MG996R"));
    s.value = "MG996R"; s.dispatchEvent(new win.Event("change")); await settle(); await sleep(30);
    check(sig() !== a && MF.mechParts.settings.servo === "MG996R" && [...document.querySelectorAll("#panel .hint")].some(h => /MG996R standard servo/.test(h.textContent)), "the MG996R: a bigger mount, and the panel's list of what you'll need names it");
    const before = sig(), r = $$("#panel input[type=range]").find(x => x.getAttribute("aria-label") === "Printer clearance (mm)");
    r.value = "0.5"; r.dispatchEvent(new win.Event("input")); await settle();
    check(sig() !== before && MF.mechParts.clearance === 0.5, "the printer clearance changes the part");
    await choose("pushRod");
    check([...document.querySelectorAll("#panel .hint")].some(h => /Travel/.test(h.textContent) && /→/.test(h.textContent)), "a push rod's panel shows its travel, servo angle by angle");
  }

  console.log("\nsaved and opened again; a hostile project");
  {
    const inp = document.querySelector("#projInput");
    const open = async text => { const f = new win.File([text], "p.json", { type:"application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    await choose("fourBar"); MF.state.base.parts.set.fourBar.crank = 22; MF.state.base.parts.clearance = 0.35; MF.rebuild(false); await settle();
    const want = JSON.stringify(MF.state.base.parts); await open(MF.projectPayload(true));
    check(JSON.stringify(MF.state.base.parts) === want && MF.state.base.type === "parts" && closed(), "the part, its settings and the clearance come back from a saved project");
    const st = JSON.parse(MF.projectPayload()).state;
    st.base.parts = { kind:"__proto__", clearance:1e9, set:{ servoHorn:{ servo:"<img src=x>", arm:"long", holes:1e9 }, nothing:{ a:1 }, fourBar:"x" } };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    const P = MF.state.base.parts;
    check(P.kind === "servoMount" && P.clearance === 1 && P.set.servoHorn.servo === "SG90" && P.set.servoHorn.arm === 16 && P.set.servoHorn.holes === 8 && !("nothing" in P.set) && !("fourBar" in P.set) && closed(),
      "a hostile project: an unknown part, a huge clearance, markup and words in the settings: cleaned, and it builds", JSON.stringify(P));
  }
};
