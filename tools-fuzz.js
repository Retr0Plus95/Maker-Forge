// Every object: random settings through the panel (Session 72), as tools-boxfuzz.js does for project boxes. Each run opens an
// object and does random things on its pages: a slider set anywhere in its range, a list's other choice, a box ticked or not,
// one of a row of buttons, odd text in a text field (empty, emoji, markup, a long line, two lines). After each step it checks:
// no page error and no "Could not build the model", every part closed, facing outward, free of NaN, and the print standing on
// the bed. A seed repeats the same steps, so a finding can be run again.
//   node tools-fuzz.js index.html        OBJ=nameplate,sign (default: all)  SEED=1  RUNS=2  STEPS=14  VERBOSE=1
//   UNDO=1: after each step, Undo must bring back the parts from before it (number for number) and Redo the ones after it
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms)), $$ = s => [...document.querySelectorAll(s)];
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 4000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core;
  // what the page says went wrong: its console errors and the notices it shows
  const said = [];
  const ce = win.console.error.bind(win.console); win.console.error = (...a) => { said.push(a.map(x => x && x.message ? x.message : String(x)).join(" ")); };
  const notice = () => { const n = document.querySelector("#notice"); return n && n.classList.contains("show") ? n.textContent : ""; };
  let seed = +(process.env.SEED || 1); const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
  const TEXTS = ["", " ", "W", "Ωmega Ünïcödé", "😀👍", "a\nb", "<b>x</b>&amp;", "x".repeat(140), "123", "Mr. O'Neil-Smith"];
  const objects = [...document.querySelector("#objectSel").options].map(o => o.value).filter(v => v !== "stl" && v !== "none")
    .filter(v => !process.env.OBJ || process.env.OBJ.split(",").includes(v));
  const RUNS = +(process.env.RUNS || 2), STEPS = +(process.env.STEPS || 14), findings = [], dumped = new Set();
  const visible = el => !el.closest("[hidden]") && !el.disabled && el.offsetParent !== undefined;
  // the parts as they are: each one's name, triangles and a hash of its corners
  const sig = () => MF.parts.map(p => p.name + ":" + p.solid.idx.length + ":" + C.memo.hash(p.solid.pos) + ":" + C.memo.hash(p.solid.idx)).join(" ");
  const sigBrief = x => x.split(" ").map(q => q.split(":").slice(0, 2).join(":")).join(" ").slice(0, 160);
  function check(where) {
    const out = [];
    MF.parts.forEach(p => {
      const r = C.checkMesh(p.solid), v = C.signedVolume(p.solid);
      if (r.nan) out.push(`${p.name}: NaN in its corners`);
      if (r.open) out.push(`${p.name}: ${r.open} open edges`);
      if (v < -1e-6) out.push(`${p.name}: faces inward (volume ${v.toFixed(2)})`);
    });
    const pp = MF.printParts();
    if (pp.length) { let lo = Infinity, who = "";
      pp.forEach(p => { let l = Infinity; for (let i = 1; i < p.pos.length; i += 3) l = Math.min(l, p.pos[i]); if (l < lo){ lo = l; who = p.name; } });
      if (Math.abs(lo) > 0.02 && isFinite(lo)) out.push(`the print stands ${lo.toFixed(3)} mm off the bed (lowest: ${who})`); }
    const n = notice(); if (/Could not build|failed|went wrong/i.test(n)) out.push(`notice: ${n.slice(0, 200)}`);
    said.splice(0).forEach(s => out.push(`console: ${s.slice(0, 200)}`));
    env.errors.splice(0).forEach(s => out.push(`page error: ${s.split("\n").slice(0, 2).join(" / ").slice(0, 200)}`));
    return out.map(x => `${where}: ${x}`);
  }
  for (const obj of objects) {
    for (let run = 0; run < RUNS; run++) {
      const sel = document.querySelector("#objectSel"); sel.value = obj; sel.dispatchEvent(new win.Event("change")); await settle();
      // a coarser trace for speed, but not when checking Undo: a change made outside the history would come back as a difference
      if (!process.env.UNDO && MF.state.base.tracer) Object.assign(MF.state.base.tracer, { workRes: 300, paperRes: 500 });
      const tabBtn = $$("#tabs button").find(b => b.dataset.k === "make"); if (tabBtn) { tabBtn.click(); await sleep(20); }
      const log = []; let sigBefore = null;
      for (let step = 0; step < STEPS; step++) {
        if (process.env.UNDO) { await sleep(500); await settle(); sigBefore = sig(); }
        const icons = $$("#secrail button"); if (icons.length) { const ic = pick(icons); if (ic.getAttribute("aria-pressed") !== "true") { ic.click(); await sleep(15); } }
        const ranges = $$("#panel input[type=range]").filter(visible), selects = $$("#panel select").filter(visible),
          checks = $$("#panel input[type=checkbox]").filter(visible), segs = $$("#panel .seg button").filter(visible),
          texts = $$("#panel input[type=text], #panel textarea").filter(visible);
        const kinds = [[ranges, 5], [selects, 2], [checks, 2], [segs, 2], [texts, 1]].filter(([l]) => l.length);
        if (!kinds.length) continue;
        const tot = kinds.reduce((a, [, w]) => a + w, 0); let r = rnd() * tot, list = kinds[0][0];
        for (const [l, w] of kinds) { if ((r -= w) <= 0) { list = l; break; } }
        const el = pick(list), label = (el.getAttribute("aria-label") || (el.closest(".field") && el.closest(".field").querySelector("label") || {}).textContent || el.textContent || "").trim().slice(0, 50);
        let what = "";
        try {
          if (el.type === "range") { const lo = +el.min, hi = +el.max, st = +el.step || 1, v = rnd() < 0.25 ? (rnd() < 0.5 ? lo : hi) : lo + Math.round(rnd() * (hi - lo) / st) * st; el.value = String(v); el.dispatchEvent(new win.Event("input")); what = `${label} = ${el.value}`; }
          else if (el.tagName === "SELECT") { const o = pick([...el.options]); el.value = o.value; el.dispatchEvent(new win.Event("change")); what = `${label} → ${o.textContent.trim().slice(0, 30)}`; }
          else if (el.type === "checkbox") { el.checked = !el.checked; el.dispatchEvent(new win.Event("change")); what = `${label} ${el.checked ? "on" : "off"}`; }
          else if (el.tagName === "BUTTON") { el.click(); what = `button "${label}"`; }
          else { const t = pick(TEXTS); el.value = t; el.dispatchEvent(new win.Event("input")); el.dispatchEvent(new win.Event("change")); what = `${label} := ${JSON.stringify(t.slice(0, 20))}`; }
        } catch (e) { findings.push(`${obj} run ${run} step ${step} (${what || label}): threw ${e.message}`); }
        log.push(what);
        if (!(await settle())) findings.push(`${obj} run ${run} step ${step}: the build after ${what} never finished`);
        // UNDO=1: Undo brings back the parts from before the step, number for number, and Redo the ones after it
        if (process.env.UNDO && sigBefore !== null && MF.state.base.type === obj) {
          await sleep(500); await settle(); const sigAfter = sig(), ub = document.querySelector("#undoBtn"), rb = document.querySelector("#redoBtn");
          if (sigAfter !== sigBefore && ub && !ub.disabled) {
            ub.click(); await settle(); await sleep(60); await settle();
            if (sig() !== sigBefore) findings.push(`${obj} run ${run} step ${step}: Undo after [${what}] did not bring back the parts from before (${sigBrief(sigBefore)} → ${sigBrief(sig())})`);
            if (rb && !rb.disabled) { rb.click(); await settle(); await sleep(60); await settle();
              if (sig() !== sigAfter) findings.push(`${obj} run ${run} step ${step}: Redo after Undo of [${what}] did not bring back the parts (${sigBrief(sigAfter)} → ${sigBrief(sig())})`); }
          }
        }
        if (MF.state.base.type !== obj) { log.push("(object changed, back)"); const s2 = document.querySelector("#objectSel"); s2.value = obj; s2.dispatchEvent(new win.Event("change")); await settle(); }
        const f = check(`${obj} run ${run} step ${step} after [${log.slice(-3).join(" | ")}]`);
        if (f.length) {
          findings.push(...f); if (process.env.VERBOSE) console.log("  !", f.join("\n  ! "));
          // the first time on an object: what is shared between objects (the model's settings, the pictures), to find a cause
          if (!dumped.has(obj)) { dumped.add(obj); findings.push(`${obj}: shared state at the first finding: model ${JSON.stringify(MF.state.model)}; pictures ${JSON.stringify(MF.state.items.map(d => ({ n:d.name, on:d.enabled, mode:d.mode, w:d.width, h:d.height, place:d.place, cut:d.cut })))}`.slice(0, 1500)); }
        }
      }
      if (process.env.VERBOSE) console.log(`${obj} run ${run}: ${log.join(" · ")}`);
    }
    console.log(`${obj.padEnd(12)} ${RUNS} runs of ${STEPS} steps`);
  }
  console.log(findings.length ? `\n${findings.length} FINDINGS:\n  ` + [...new Set(findings)].join("\n  ") : "\nno findings");
  process.exit(findings.length ? 1 : 0);
})();
