// Project boxes: random clicking through the panel (Session 62), the way the bugs of Sessions 61 and 62 were found. Each run
// opens a project box quick start and does random things (adds boards, modules and openings, levels, dividers and channels,
// Arrange, Shrink to fit, Make it all fit, a new lid, turning, moving, picking and nudging in the plan, undo…), and after each
// step checks: no page errors, every part closed, sizes in range, and that adding a part (when the box may grow) never puts
// it on something, Shrink to fit makes no new warning, Make it all fit leaves no board out, and adding an opening leaves none
// out. Slow and random, so not part of test:enclosure; run it after changing how parts or openings are placed.
//   node tools-boxfuzz.js index.html            SEED=1 RUNS=6 STEPS=22 (each seed repeats the same clicks)
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const seed0 = +(process.env.SEED || 1); let seed = seed0;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }, pick = a => a[Math.floor(rnd() * a.length)];
  const C = MF.core, boards = Object.keys(MF.boards).filter(k => k !== "none" && k !== "custom"), cutouts = Object.keys(MF.cutouts);
  const closed = () => MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan; });
  const field = re => [...document.querySelectorAll("#panel .field")].find(w => re.test((w.querySelector("label") || {}).textContent || ""));
  const buttonsRe = re => [...document.querySelectorAll("#panel button")].filter(b => re.test(b.textContent));
  const click = async re => { const bs = buttonsRe(re); if (!bs.length) return false; pick(bs).click(); await settle(); return true; };
  const typeIn = async (re, v) => { const fs = [...document.querySelectorAll("#panel .field")].filter(w => re.test((w.querySelector("label") || {}).textContent || "")); if (!fs.length) return false;
    const inp = pick(fs).querySelector("input[type=number]"); if (!inp) return false; inp.value = String(v); inp.dispatchEvent(new win.Event("change")); await settle(); return true; };
  const seg = async label => { const b = [...document.querySelectorAll("#panel .seg button")].filter(b => b.textContent === label); if (!b.length) return false; pick(b).click(); await settle(); return true; };
  const tick = async re => { const l = [...document.querySelectorAll("#panel label.check")].filter(l => re.test(l.textContent)); if (!l.length) return false; const cb = pick(l).querySelector("input"); cb.checked = !cb.checked; cb.onchange({ target:cb }); await settle(); return true; };
  const actions = {
    addPart: async () => { const f = field(/^Add another board/); if (!f) return; const k = pick(boards); const inp = f.querySelector("input"); inp.value = k; inp.oninput(); await sleep(10); return click(/^Add it$/); },
    addOpening: async () => { const f = field(/^Add an opening/); if (!f) return; const s = [...document.querySelectorAll("#panel .field")].find(w => /^On$/.test((w.querySelector("label")||{}).textContent||"") && w.closest("div") && [...(w.querySelector("select")||{options:[]}).options].some(o => o.value === "bottom"));
      const k = pick(cutouts), inp = f.querySelector("input"); inp.value = k; inp.oninput(); await sleep(10); if (s){ const sel = s.querySelector("select"); sel.value = pick(["front","back","left","right","top","bottom"]); sel.onchange && sel.onchange(); sel.dispatchEvent(new win.Event("change")); } return click(/^Add opening$/); },
    mainBoard: async () => { const f = field(/^Board$/); if (!f) return; const s = f.querySelector("select"), k = pick(boards.concat(["none"])); if (![...s.options].some(o => o.value === k)) { const inp = f.querySelector("input"); inp.value = k; inp.oninput(); }
      s.value = k; s.onchange(); await settle(); },
    addLevel: () => click(/^Add a level/), addDivider: () => click(/^Add a divider$/), addDuct: () => click(/^Add a cable channel/),
    rooms: () => click(/^(Two, front and back|Two, side by side|Three in a row|Four \(a cross\))$/),
    arrange: () => click(/^Arrange (it for me|in this box)/), shrink: () => click(/^Shrink to fit/), fixAll: () => click(/^Make it all fit$/),
    ports: () => click(/^Add this board's ports$/), dup: () => click(/^Duplicate$/), remove: () => click(/^Remove( the last| this board)?$/), centre: () => click(/^Centre it/),
    turn: () => tick(/Turn (the board|it) 90/), lid: () => seg(pick(["Screwed lid","Press-fit lid","Magnet lid","Sliding lid","No lid"])),
    grow: () => seg(pick(["Grows to fit what I add","Stays this size"])), inside: () => seg(pick(["Outside sizes","Inside sizes"])),
    size: () => typeIn(/^(Outside|Inside) (width|depth)|^Height of the box|^Inside height/, Math.round(20 + rnd() * 200)),
    pos: () => typeIn(/position|^Position/, Math.round(-120 + rnd() * 240)),
    levelZ: () => typeIn(/^Height of its top above the floor/, Math.round(10 + rnd() * 80)),
    radius: () => typeIn(/^Corner radius/, Math.round(rnd() * 20)),
    hold: () => seg(pick(["By its edges","Strap tray","Corner cradle","Under a door","On its screw holes (M3)","Snap clips","Snap pins (no screws)"])),
    posts: () => seg(pick(["Posts down to the floor","Short posts (floor free)"])),
    split: () => seg(pick(["Always","Never","When it's bigger than the bed"])),
    // the plan of the inside (Session 62): pick a part, then a key
    planKey: async () => { const b = [...document.querySelectorAll("#secrail button")].find(x => x.dataset.title === "Plan of the inside"); if (!b) return; b.click(); await sleep(20);
      const svg = document.querySelector("#panel .boxplan"), g = svg && [...svg.querySelectorAll(".pl-part")]; if (!g || !g.length) return;
      pick(g).dispatchEvent(new win.Event("pointerdown", { bubbles:true })); svg.dispatchEvent(new win.Event("pointerup", { bubbles:true })); await settle();
      const s2 = document.querySelector("#panel .boxplan"); if (s2){ s2.dispatchEvent(new win.KeyboardEvent("keydown", { key:pick(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","r","d","Delete"]), shiftKey:rnd() < 0.3, bubbles:true })); await settle(); } },
    undo: async () => { const b = document.querySelector("#undoBtn, button[title^='Undo']"); if (b){ b.click(); await settle(); } },
  };
  const names = Object.keys(actions).concat(["addPart","addPart","addPart","mainBoard","addOpening","addOpening","pos","turn"]), presets = ["Project box","Power bank box","PSU box","Raspberry Pi case"], problems = [];
  for (let run = 0; run < (+process.env.RUNS || 6); run++){
    const pr = pick(presets), btn = [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === pr);
    if (btn){ btn.click(); await settle(); }
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(30);
    const log = [pr];
    for (let step = 0; step < (+process.env.STEPS || 14); step++){
      const a = pick(names), errs0 = env.errors.length, warn0 = (MF.enclosure && MF.enclosure.warn || []).map(w => w.t);
      const left0 = MF.enclosure ? MF.enclosure.left.length : 0;
      try { await actions[a](); } catch (e) { problems.push(`${log.join(" > ")} > ${a}: threw ${e.message}`); break; }
      log.push(a);
      const errs = env.errors.slice(errs0).filter(e => !/navigation|HTMLMedia/.test(e));
      if (errs.length) problems.push(`${log.join(" > ")}: page error ${errs[0].slice(0, 300)}`);
      if (!closed()){ problems.push(`${log.join(" > ")}: a part is not closed: ${MF.parts.filter(p => { const r = C.checkMesh(p.solid); return r.open || r.nan; }).map(p => p.name).join(", ")}`);
        break; }
      const E = MF.state.base.enclosure, I = MF.enclosure;
      if (!I) continue;
      if ([E.w, E.d, E.h].some(v => !isFinite(+v))) problems.push(`${log.join(" > ")}: size NaN ${[E.w,E.d,E.h]}`);
      if (E.w > 300.01 || E.d > 300.01 || E.h > 250.01) problems.push(`${log.join(" > ")}: size past the sliders ${[E.w,E.d,E.h]}`);
      const newW = I.warn.map(w => w.t).filter(t => !warn0.includes(t) && !/join|crosses a join/i.test(t)), said = (document.querySelector("#notice") || {}).textContent || "";
      if (a === "addPart" && E.grow !== false && !/no free room/.test(said) && newW.some(t => /overlaps|screw post|does not fit|under a post|crosses|runs into|bracket/.test(t))) problems.push(`${log.join(" > ")}: adding a part made: ${newW.join("; ")} [${[E.w,E.d,E.h].join("x")}; ${said.slice(0,160)}]`);
      if (a === "fixAll" && I.boards.some(b => b.fits === false)) problems.push(`${log.join(" > ")}: Make it all fit left a board out`);
      if (a === "shrink" && newW.length) problems.push(`${log.join(" > ")}: Shrink made new warnings: ${newW.join("; ")}`);
      if ((a === "dup" || a === "addOpening") && E.grow !== false && !/even in a bigger box/.test(said) && I.left.length > left0) problems.push(`${log.join(" > ")}: an opening left out: ${newW.join("; ")} ${JSON.stringify(I.warn.map(w=>w.s).filter(s=>/Opening/.test(s)).slice(0,2))}`);
      if (MF.state.base.type !== "enclosure") break;
    }
    if (process.env.VERBOSE){ const E = MF.state.base.enclosure, I = MF.enclosure; console.log(log.join(" > "), "|", [E.w,E.d,E.h].join("x"), "boards", (I.boards||[]).length, "cuts", (E.cut||[]).length, "levels", (E.levels||[]).length, "walls", (E.walls||[]).length, "warn", I.warn.map(w=>w.t).join("; ").slice(0,300)); }
  }
  console.log(`seed ${seed0}: ${problems.length} problems`); problems.forEach(p => console.log(" - " + p));
  process.exit(problems.length ? 1 : 0);
})();
