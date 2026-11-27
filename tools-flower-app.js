// The Flower lamp object in the app (Session 85), run by tools-flower-test.js: the panel, every slider at its ends (closed, and
// the parts change: no dead controls but the bloom, which turns the picture), the lamp and the plates, a saved project and a
// hostile project (the export's files: tools-browser-check.js).
module.exports = async function flowerApp({ win, document, MF, C, settle, sleep, check }){
  const $$ = s => [...document.querySelectorAll(s)];
  const sel = document.querySelector("#objectSel"); sel.value = "flower"; sel.dispatchEvent(new win.Event("change")); await settle();
  [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(30);
  const closed = () => MF.parts.length > 10 && MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const sig = () => MF.parts.map(p => p.solid.idx.length + ":" + C.signedVolume(p.solid).toFixed(2)).join("|");
  const slider = label => $$("#panel input[type=range]").find(x => x.getAttribute("aria-label") === label);

  console.log("\nthe Flower lamp object");
  {
    check(closed() && MF.flower && MF.flower.info.ok, "it builds: every part closed, every check passing", MF.parts.length);
    check(MF.parts.filter(p => /^Petal \d/.test(p.name)).every(p => p.slot === 1) && MF.parts.filter(p => !/^Petal \d/.test(p.name)).every(p => p.slot === 0), "the petals in the second filament, the rest in the first");
    check(new Set(MF.parts.map(p => p.plate)).size >= 1 && MF.parts.every(p => p.plate != null), "laid out on plates of the bed", `${new Set(MF.parts.map(p => p.plate)).size} plates`);
    const hints = $$("#panel .hint").map(h => h.textContent).join("\n");
    check(/✓ Petals clear each other/.test(hints) && /Holds itself/.test(hints) && /You'll need|filament/.test(hints), "the panel lists the checks, that it holds itself, and what you'll need");
  }

  console.log("\neach slider at its ends");
  {
    const spec = C.flower.settings, bad = [], dead = [];
    for (const sp of Object.values(spec).filter(Array.isArray)){
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
    check(!dead.length, "no slider leaves the parts unchanged at both ends", dead.join(", "));
    const pick = async (label, value) => { const s = $$("#panel select").find(x => x.closest(".field") && x.closest(".field").textContent.includes(label)); s.value = value; s.dispatchEvent(new win.Event("change")); await settle(); await sleep(20); };
    for (const [label, value, what] of [["Flower", "lotus", "a lotus"], ["Servo", "MG996R", "the MG996R"], ["NeoPixel ring", "16", "a 16-LED ring"], ["Board", "nano", "a Nano"], ["Switch it with", "button", "a button"]]){
      const before = sig(); await pick(label, value);
      check(sig() !== before && closed(), `${what}: the parts change and stay closed`);
    }
  }

  console.log("\nthe lamp and the plates");
  {
    const b = slider("Bloom (%)"), parts = sig();
    b.value = "100"; b.dispatchEvent(new win.Event("input")); await sleep(50);
    check(MF.state.base.flower.bloom === 1 && sig() === parts, "the bloom opens the picture of the lamp and leaves the files as they are");
    MF.state.base.flower.bloom = 0;
    const seg = $$("#panel button").find(x => x.textContent === "Parts to print"); seg.click(); await sleep(30);
    check(MF.state.base.flower.show === "plates" && !slider("Bloom (%)"), "Parts to print shows the plates (and no bloom)");
    $$("#panel button").find(x => x.textContent === "The lamp").click(); await sleep(30);
  }

  console.log("\nsaved and opened again; a hostile project");
  {
    const inp = document.querySelector("#projInput");
    const open = async text => { const f = new win.File([text], "p.json", { type:"application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    MF.state.base.flower.set.petals = 9; MF.state.base.flower.clearance = 0.3; MF.state.base.flower.bloom = 0.4; MF.rebuild(false); await settle();
    const want = JSON.stringify(MF.state.base.flower); await open(MF.projectPayload(true));
    check(JSON.stringify(MF.state.base.flower) === want && MF.state.base.type === "flower" && closed(), "the lamp, its settings, the clearance and the bloom come back from a saved project");
    const st = JSON.parse(MF.projectPayload()).state;
    st.base.flower = { set:{ style:"<img src=x>", petals:1e9, stem:-4, servo:"__proto__" }, clearance:1e9, show:"<b>", bloom:7, petalSlot:-3 };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    const Fq = MF.state.base.flower;
    check(Fq.set.style === "tulip" && Fq.set.petals === 14 && Fq.set.stem === 60 && Fq.set.servo === "SG90" && Fq.clearance === 1 && Fq.show === "lamp" && Fq.bloom === 1 && Fq.petalSlot === 0 && closed(),
      "a hostile project: markup, huge and negative numbers, a strange servo: cleaned, and it builds", JSON.stringify(Fq));
    // (the export's files are checked in a real browser: tools-browser-check.js, ONLY=flower; JSZip doesn't finish in jsdom)
  }
};
