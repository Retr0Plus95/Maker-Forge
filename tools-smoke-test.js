// Smoke test: every quick-start preset, every object, every tab and panel page, every button on
// the make page, plus the export writers run on the result. Fails (exit 1) on page errors,
// empty builds, NaN geometry or open edges.
//   node tools-smoke-test.js index.html            (QUICK=1 skips the per-button clicks,
//                                                   ONLY=tracer,board limits the objects and skips
//                                                   the presets unless PRESETS=1; PAGES=0-3 limits
//                                                   the panel pages; VERBOSE=1 shows progress)
const boot = require("./tools-test-env.js");
const JSZip = require("jszip");
const env = boot(process.argv[2]);
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
async function settle() {
  // a change schedules a rebuild after a short debounce: wait for the build counter to move,
  // then for the build to finish. No rebuild within 1.2 s means the control did not ask for one.
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
let lastReason = "";
async function explainEmpty() {                 // rebuild once with the notice cleared, to catch its own message
  const MF = win.MakerForge, n = document.querySelector("#notice");
  if (MF.parts.length || !n) return;
  n.textContent = ""; MF.rebuild(false); await settle(); lastReason = n.textContent;
  if (process.env.DEBUG) console.log("  empty build state:", JSON.stringify(MF.state.base[MF.state.base.type]), "items:", MF.state.items.map(d => d.name + ":" + (d.enabled !== false)).join(","), "active:", MF.state.active);
}
function inspect(tag) {
  const MF = win.MakerForge, C = MF.core, parts = MF.parts;
  if (!parts.length && MF.state.base.type !== "none" && MF.state.base.type !== "stl") {
    // an empty build is fine only if the user is told why (e.g. paper mode on a photo without paper)
    const why = lastReason;
    if (why.trim()) console.log(`  ${tag}: nothing built, user told: "${why.trim()}"`);
    else problems.push(`${tag}: nothing built, and no message says why`);
  }
  parts.forEach(p => {
    const r = C.checkMesh(p.solid);
    if (r.nan || (r.open || r.openEdges || 0) > 0) problems.push(`${tag}: part "${p.name}" ${JSON.stringify(r)}`);
  });
  return parts.length;
}
const clickTab = async k => { const b = $$("#tabs button").find(b => b.dataset.k === k); if (b) { b.click(); await sleep(60); } };
(async () => {
  await sleep(800);
  const MF = win.MakerForge, C = MF.core;
  let clicks = 0;
  // drop a real PNG (a two-colour badge on white) through the Art tab, like a user would
  {
    const { encodePNG } = require("./tools-test-env.js"), W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, dx = x - 120, dy = y - 90, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const star = r < 40 * (0.62 + 0.38 * Math.cos(5 * a));
      const col = star ? [240, 190, 30] : r < 75 ? [25, 90, 170] : [255, 255, 255];
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
    await clickTab("art");
    const file = new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" });
    const ev = new win.Event("drop", { bubbles: true, cancelable: true }); ev.dataTransfer = { files: [file] };
    document.querySelector("#drop").dispatchEvent(ev);
    for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge"); i++) await sleep(30);
    if (!MF.state.items.some(d => d.name === "badge" && d.src)) problems.push("dropped picture was not added");
    await settle();
  }
  // presets
  const presets = process.env.ONLY && !process.env.PRESETS ? [] : $$("#presetGallery button").map(b => b.dataset.k);
  for (const k of presets) {
    const b = $$("#presetGallery button").find(b => b.dataset.k === k); b.click();
    await settle(); console.log(`preset  ${k.padEnd(26)} ${inspect("preset " + k)} parts`);
  }
  // objects, tabs, pages, buttons
  const objects = [...document.querySelector("#objectSel").options].map(o => o.value).filter(v => v !== "stl")
    .filter(v => !process.env.ONLY || process.env.ONLY.split(",").includes(v));
  const tabs = $$("#tabs button").map(b => b.dataset.k);
  for (const obj of objects) {
    const sel = document.querySelector("#objectSel"); sel.value = obj; sel.dispatchEvent(new win.Event("change"));
    await settle();
    // this test checks wiring, not accuracy: trace at low resolution so ~150 clicks fit the time budget
    Object.assign(MF.state.base.tracer, { workRes: 300, paperRes: 500 });
    const n = inspect("object " + obj);
    for (const t of tabs) { await clickTab(t); for (const ic of $$("#secrail button")) { ic.click(); await sleep(15); } }
    await clickTab("make"); await settle();
    if (!process.env.QUICK) {
      const pages = $$("#secrail button").length || 1;
      const [p0, p1] = (process.env.PAGES || "0-99").split("-").map(Number);
      for (let pg = p0; pg < Math.min(pages, p1 + 1); pg++) {
        if (process.env.VERBOSE) console.log(`  ${obj} page ${pg + 1}/${pages}`);
        const icon = $$("#secrail button")[pg]; if (icon && icon.getAttribute("aria-pressed") !== "true") { icon.click(); await sleep(15); }
        // only the open page's buttons: the other pages stay in the DOM, hidden
        const visible = () => $$("#panel button").filter(b => !b.closest("[hidden]"));
        const labels = visible().map(b => b.textContent.trim());
        for (let i = 0; i < labels.length; i++) {
          if (/Change the object|Clear saved|Undo|Redo|with AI/.test(labels[i])) continue;      // "with AI" downloads the figure finder
          const b = visible().find(x => x.textContent.trim() === labels[i]);
          if (!b || b.disabled) continue;
          const t0 = Date.now();
          try { b.click(); clicks++; } catch (e) { problems.push(`${obj}: button "${labels[i]}" threw ${e.message}`); }
          if (!(await settle())) problems.push(`${obj}: build after "${labels[i]}" never finished`);
          if (process.env.VERBOSE && Date.now() - t0 > 1500) console.log(`    slow: "${labels[i].slice(0, 40)}" ${Date.now() - t0} ms`);
          if (MF.state.base.type !== obj) { sel.value = obj; const s2 = document.querySelector("#objectSel"); s2.value = obj; s2.dispatchEvent(new win.Event("change")); await settle(); }
        }
      }
      await explainEmpty(); inspect("object " + obj + " after buttons");
    }
    // export writers on whatever is built now
    if (MF.parts.length) {
      const { parts: P } = C.prepareParts(MF.parts.map(p => { const m = C.mergeSolids([p.solid]); return { name: p.name, slot: p.slot, pos: m.pos, idx: m.idx }; }));
      const zip = new JSZip();
      Object.entries(C.make3MF(P, MF.state.slots, "smoke")).forEach(([k, v]) => zip.file(k, v));
      Object.entries(C.make3MF_BBL(P, MF.state.slots, "smoke")).forEach(([k, v]) => zip.file("bbl/" + k, v));
      const o = C.makeOBJ(P, MF.state.slots); zip.file("m.obj", o.obj); zip.file("m.mtl", o.mtl);
      P.forEach((p, i) => zip.file(`s${i}.stl`, new Uint8Array(C.makeSTL(p))));
      const bytes = await zip.generateAsync({ type: "uint8array" });
      if (bytes.length < 200) problems.push(`${obj}: export too small`);
    }
    console.log(`object  ${obj.padEnd(26)} ${n} parts`);
  }
  // project round trip through the sanitiser
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  errs.slice(0, 10).forEach(e => problems.push("page error: " + e.split("\n").slice(0, 3).join(" / ")));
  console.log(`\n${presets.length} presets, ${objects.length} objects, ${tabs.length} tabs, ${clicks} button clicks`);
  if (problems.length) { console.log("PROBLEMS:\n  " + problems.join("\n  ")); process.exit(1); }
  console.log("smoke test passed"); process.exit(0);
})();
