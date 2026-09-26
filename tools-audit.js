// Extremes audit: for each generator, drive every slider on the make page to its minimum and
// maximum and flip every checkbox, one at a time from the defaults. Flags failed or empty builds,
// NaN geometry, open edges, page errors, and dead controls (the model did not change at all).
//   node tools-audit.js index.html                 all generators
//   node tools-audit.js index.html nameplate,board just these
//   node tools-audit.js index.html board art       the Art tab's controls on the board
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2]);
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const findings = [], expected = [];
// dead-control reports that are right by design or an artefact of the synthetic test picture
const EXPECTED_DEAD = [
  // a mirror changes nothing on a model that is left-right symmetric (odd moments in x all vanish)
  [/^Mirror the whole model/, "the model is left-right symmetric", () => {
    const MF = win.MakerForge; let m3 = 0, mxz = 0, mxy = 0, s = 0, n = 0;
    MF.exportParts().forEach(q => { for (let i = 0; i < q.pos.length; i += 3) { const x = q.pos[i], y = q.pos[i + 1], z = q.pos[i + 2]; m3 += x * x * x; mxz += x * z; mxy += x * y; s = Math.max(s, Math.abs(x), Math.abs(z)); n++; } });
    const k = n * Math.max(1, s) ** 3; return Math.abs(m3) / k < 1e-4 && Math.abs(mxz) / k < 1e-4 && Math.abs(mxy) / k < 1e-4;
  }],
  // printability settings only act where the model has something for them to act on
  [/^Steepest overhang/, "this model has no downward faces off the bed", () => { const p = win.MakerForge.print; return p && p.overhang.area === 0 && !p.overhang.narrow && !p.flats.length; }],
  [/^Longest bridge/, "this model has no flat ceilings", () => { const p = win.MakerForge.print; return p && !p.flats.length; }],
  [/^Show problem areas/, "this model has nothing to mark", () => { const p = win.MakerForge.print; return p && !p.marks.support.length && !p.marks.fine.length && !p.thin.length; }],
  [/^Brush size/, "only sets the size of the next brush stroke"],
  [/^Dot size/, "the test text has no i/j dots, and the test canvas draws glyphs as boxes"],
  [/^Minimum difference from the background/, "the test picture has only strong contrast"],
  [/^Keep only the (biggest|main) piece/, "the test picture is one piece"],
  [/^Ignore pieces smaller than/, "the test picture has no small pieces", () => win.MakerForge.state.base.type === "tracer"],
  [/^Remove specks below|small marks and labels/, "the test picture has no specks or small marks"],
  [/contrast|saturation/i, "the two-colour test picture does not change with colour adjustments"],
  [/^Preview zoom/, "only zooms the picture preview on the Art tab"],
  [/^Clean up specks/, "the test picture has no specks, and a cutter's silhouette ignores colour boundaries", () => win.MakerForge.state.base.type === "cutter"],
];
async function settle() {
  // a change schedules a rebuild after a short debounce: wait for the build counter to move,
  // then for the build to finish. No rebuild within 1.2 s means the control did not ask for one.
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
// what the person actually gets: the built parts, the exported parts (scale, mirror, turn, brim),
// and on the Export tab the printability result and the preview overlay
let auditTab = "make";
async function printResult() {
  const MF = win.MakerForge;
  if (auditTab !== "export") return "";
  let p = null; for (let i = 0; i < 400 && !(p = MF.print); i++) await sleep(25);
  return p ? `${p.overhang.area.toFixed(1)}|${p.flats.map(f => f.kind).join(",")}|${p.thin.length}|${MF.overlay}` : "none";
}
function signature(extra) {
  const MF = win.MakerForge, C = MF.core;
  let ex = "";
  try { const e = MF.exportParts(); ex = e.map(q => { const r = C.checkMesh(q), b = C.solidBounds(q); return `${r.tris}:${r.volume.toFixed(2)}:${b.mn.map(v => v.toFixed(2))}`; }).join(";"); } catch (err) { ex = "export failed: " + err.message; }
  let tris = 0, vol = 0, bad = [], mx = 0, mz = 0, nv = 0;
  MF.parts.forEach(p => {
    const r = C.checkMesh(p.solid); tris += r.tris; vol += r.volume;
    const pos = p.solid.pos || []; for (let i = 0; i < pos.length; i += 3) { mx += pos[i]; mz += pos[i + 2]; nv++; }  // catches mirrors
    if (!isFinite(r.volume) || r.nan) bad.push(`${p.name}: NaN`);
    if (r.open > 0) bad.push(`${p.name}: ${r.open} open edges`);
  });
  if (/^export failed/.test(ex)) bad.push(ex);
  return { n: MF.parts.length, tris, vol: +vol.toFixed(3), bad, key: `${MF.parts.length}|${tris}|${vol.toFixed(3)}|${(mx / Math.max(1, nv)).toFixed(3)}|${(mz / Math.max(1, nv)).toFixed(3)}|${ex}|${extra || ""}` };
}
const clickTab = async k => { const b = $$("#tabs button").find(b => b.dataset.k === k); if (b) { b.click(); await sleep(50); } };
async function addPicture(MF) {
  const { encodePNG } = require("./tools-test-env.js"), W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, dx = x - 120, dy = y - 90, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const star = r < 40 * (0.62 + 0.38 * Math.cos(5 * a)), hole = Math.hypot(dx - 50, dy) < 9;
    const col = hole ? [255, 255, 255] : star ? [240, 190, 30] : r < 75 ? [25, 90, 170] : [255, 255, 255];
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
  }
  await clickTab("art");
  const ev = new win.Event("drop", { bubbles: true, cancelable: true });
  ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
  document.querySelector("#drop").dispatchEvent(ev);
  for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge" && d.src); i++) await sleep(30);
  await settle();
}
// every control on every page of the current tab, as { page, label, kind, el-finder }
function controls() {
  const out = [], pages = $$("#secrail button");
  const scan = pg => {
    $$("#panel .field").forEach(f => {
      const rng = f.querySelector("input[type=range]"); if (!rng) return;
      out.push({ page: pg, kind: "range", label: rng.getAttribute("aria-label") });
    });
    $$("#panel label.check").forEach(l => out.push({ page: pg, kind: "check", label: l.textContent.trim() }));
  };
  if (!pages.length) scan(0);
  pages.forEach((b, i) => { b.click(); scan(i); });
  const seen = new Set();
  return out.filter(c => { const k = c.kind + c.label; if (seen.has(k)) return false; seen.add(k); return true; });
}
async function openPage(pg) { const b = $$("#secrail button")[pg]; if (b && b.getAttribute("aria-pressed") !== "true") { b.click(); await sleep(15); } }
function find(c) {
  if (c.kind === "range") return $$("#panel input[type=range]").find(r => r.getAttribute("aria-label") === c.label);
  const l = $$("#panel label.check").find(l => l.textContent.trim() === c.label); return l && l.querySelector("input");
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge;
  await addPicture(MF);
  const all = [...document.querySelector("#objectSel").options].map(o => o.value).filter(v => v !== "stl");
  const pick = process.argv[3] ? process.argv[3].split(",") : all, tabName = process.argv[4] || "make"; auditTab = tabName;
  const snapshot = JSON.stringify(MF.state.base), itemsSnap = MF.state.items.map(d => JSON.stringify({ ...d, src: undefined, thumb: undefined, _srcCv: undefined, solids: undefined }));
  let tested = 0;
  for (const obj of pick) {
    const sel = document.querySelector("#objectSel"); sel.value = obj; sel.dispatchEvent(new win.Event("change")); await settle();
    await clickTab(tabName);
    const list = controls();
    const baseState = JSON.stringify(MF.state.base), baseItems = JSON.stringify(MF.state.items.map(d => ({ ...d, src: 0, thumb: 0, _srcCv: 0, solids: 0, _raw: 0 })));
    const restore = async () => {
      Object.assign(MF.state.base, JSON.parse(baseState));
      JSON.parse(baseItems).forEach((d, i) => { const it = MF.state.items[i]; for (const k in d) if (!["src", "thumb", "_srcCv", "solids", "_raw"].includes(k)) it[k] = d[k]; it._imgKey = ""; it.solids = null; });
      MF.rebuild(false); await settle(); MF.render(); await sleep(20);
    };
    await restore();
    const base = signature(await printResult());
    if (base.bad.length) findings.push(`${obj}: defaults: ${base.bad.join(", ")}`);
    let n = 0;
    for (const c of list) {
      const tries = c.kind === "range" ? ["min", "max"] : ["flip"];
      const keys = [];
      for (const t of tries) {
        await openPage(c.page); const el = find(c);
        if (!el) { findings.push(`${obj}: control "${c.label}" not found on its page`); break; }
        const e0 = env.errors.length, notice = document.querySelector("#notice");
        if (notice) notice.textContent = "";
        if (c.kind === "range") { el.value = el.getAttribute(t); el.dispatchEvent(new win.Event("input")); }
        else { el.checked = !el.checked; el.dispatchEvent(new win.Event("change")); }
        const ok = await settle(), s = signature(await printResult()); n++; tested++;
        const tag = `${obj}: ${c.label} ${t === "flip" ? "toggled" : "at " + t + " (" + el.getAttribute(t) + ")"}`;
        if (!ok) findings.push(`${tag}: build never finished`);
        if (env.errors.length > e0) findings.push(`${tag}: page error ${env.errors[e0].split("\n")[0]}`);
        // an empty model is fine when the app tells the person why (a washed-out picture has nothing to trace)
        const why = notice && notice.textContent.trim();
        if (!s.n && obj !== "none") (why ? expected : findings).push(`${tag}: empty model${why ? ` (expected: the app says "${why}")` : ""}`);
        if (s.bad.length) findings.push(`${tag}: ${s.bad.join(", ")}`);
        keys.push(s.key);
        if (c.kind === "check") { const el2 = find(c); if (el2) { el2.checked = !el2.checked; el2.dispatchEvent(new win.Event("change")); await settle(); } }
      }
      if (keys.length && keys.every(k => k === base.key)) {
        const why = EXPECTED_DEAD.find(([re, , cond]) => re.test(c.label) && (!cond || cond()));
        (why ? expected : findings).push(`${obj}: "${c.label}" unchanged${why ? " (expected: " + why[1] + ")" : " - looks dead"}`);
      }
      await restore();
    }
    console.log(`${obj.padEnd(10)} ${list.length} controls, ${n} builds, base ${base.n} parts / ${base.tris} tris`);
  }
  console.log(`\n${tested} builds audited`);
  if (expected.length) console.log("expected, not bugs:\n  " + expected.join("\n  "));
  if (findings.length) console.log("FINDINGS:\n  " + findings.join("\n  ")); else console.log("no findings");
  process.exit(0);
})();
