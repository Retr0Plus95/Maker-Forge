// A rough build first (Session 70, the engine's third step): while a slider is dragged on a slow lettered object, the
// model is built at half the detail at once and exactly when the dragging stops.
// Checked: a single edit is built exactly, as before; a drag shows rough models (fewer triangles) and leaves the checks
// alone meanwhile; the page counts as busy until the exact model is there, which is the same, number for number, as
// one built directly; an exact build stops when a change comes in, and the next is exact again; a download (or
// MakerForge.build.exact) gets the exact model straight away; a quick object (a project box) is never built rough;
// the name plate, the sign, the card and the jigsaw each come out exact after a drag.
//   node tools-rough-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const envMod = require("./tools-test-env.js"), env = envMod(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, B = MF.build;
  async function settle() {
    const r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  const pick = async v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); };
  const sig = () => MF.parts.map(p => p.name + ":" + p.solid.idx.length + ":" + C.memo.hash(p.solid.pos) + ":" + C.memo.hash(p.solid.idx)).join(" ");
  const tris = () => MF.parts.reduce((a, p) => a + p.solid.idx.length / 3, 0);
  // a drag: the setting changed n times, 100 ms apart, as a slider makes it; what the page showed meanwhile
  async function drag(o, key, vals) {
    let sawRough = 0, minTris = Infinity, checksMoved = 0; const checks0 = MF.checks;
    for (const v of vals) {
      o[key] = v; B.schedule();
      for (let t = 0; t < 4; t++) { await sleep(25); if (B.rough) { sawRough++; minTris = Math.min(minTris, tris()); if (MF.checks !== checks0) checksMoved++; } }
    }
    return { sawRough, minTris, checksMoved };
  }

  console.log("the name plate");
  await pick("nameplate");
  const np = MF.state.base.nameplate;
  await MF.rebuild(false); const exactTris = tris();
  check(B.lastExact.nameplate > B.roughAfter, "its exact build is slow enough here to be built rough while dragging", `${Math.round(B.lastExact.nameplate)} ms`);
  {
    const c0 = { ...B.count }; np.thick = 2.6; B.schedule(); await settle();
    check(B.count.rough === c0.rough && B.count.exact === c0.exact + 1, "a single edit is built exactly, as before", JSON.stringify(B.count));
  }
  {
    const c0 = { ...B.count }, d = await drag(np, "thick", [2.8, 3.0, 3.2, 3.4, 3.6, 3.8]);
    check(d.sawRough > 0 && B.count.rough > c0.rough, "while dragging, rough models are shown", `${B.count.rough - c0.rough} rough builds`);
    check(d.minTris < exactTris, "a rough model has less detail (fewer triangles)", `${d.minTris} against ${exactTris}`);
    check(d.checksMoved === 0, "the checks are left as they were while the model is rough");
    check(MF.busy, "let go: the page counts as busy until the exact model is there");
    await settle();
    const after = sig();
    check(!B.rough && B.count.exact > c0.exact, "then the exact model follows by itself");
    await MF.rebuild(false);
    check(sig() === after, "and it is the same, number for number, as one built directly");
  }
  {
    // an exact build stops when a change comes in: a drag, a pause just long enough for the exact build to start, a change
    const c0 = { ...B.count };
    await drag(np, "thick", [3.0, 3.1, 3.2]);
    for (let i = 0; i < 2000 && B.stage !== "exact"; i++) await sleep(2);    // the exact build that follows the drag has started
    const started = B.stage === "exact";
    np.thick = 3.3; B.schedule(); np.thick = 3.4; B.schedule();
    await settle();
    check(started && B.count.stopped > c0.stopped, "an exact build stops when a newer change comes in", JSON.stringify({ rough: B.count.rough - c0.rough, exact: B.count.exact - c0.exact, stopped: B.count.stopped - c0.stopped }));
    const after = sig(); await MF.rebuild(false);
    check(!B.rough && sig() === after && np.thick === 3.4, "and the model left is the exact one for the last value");
  }
  {
    // a download waits for the exact model
    await drag(np, "thick", [2.5, 2.6, 2.7]);
    const wasRough = B.rough; await B.exact();
    const after = sig(); await MF.rebuild(false);
    check(wasRough && !B.rough && sig() === after, "asked for in the middle of a drag (a download), the exact model is built first");
    await settle();
  }

  console.log("\nthe sign, the card and the jigsaw: exact after a drag");
  for (const [v, key, vals] of [["sign", "depth", [22, 24, 26, 28]], ["card", "thick", [1.0, 1.1, 1.2, 1.3]], ["jigsaw", "thick", [2.2, 2.4, 2.6, 2.8]]]) {
    await pick(v); const o = MF.state.base[v];
    await MF.rebuild(false); await MF.rebuild(false);
    const slow = B.lastExact[v] > B.roughAfter, c0 = { ...B.count }, d = await drag(o, key, vals);
    await settle();
    const after = sig(); await MF.rebuild(false);
    check(sig() === after && !B.rough, `${v}: after the drag the model is exact`, slow ? `${B.count.rough - c0.rough} rough builds meanwhile` : "built exactly here: quick enough");
    if (slow) check(d.sawRough > 0, `${v}: rough models while dragging`);
  }

  console.log("\na quick object is never built rough");
  {
    await pick("enclosure"); await MF.rebuild(false);
    const E = MF.state.base.enclosure, c0 = { ...B.count };
    await drag(E, "h", [31, 32, 33, 34, 35]); await settle();
    check(B.count.rough === c0.rough, "a project box (tens of milliseconds) is built exactly every time", `${Math.round(B.lastExact.enclosure)} ms a build`);
  }
  // Session 75: a long name curved at small letters needed a canvas over the limit and did not build at all (found by
  // tools-fuzz.js); now it is drawn on a coarser grid, exactly and while dragging
  console.log("\na long curved name at small letters builds on a coarser grid");
  {
    await pick("nameplate");
    const np = MF.state.base.nameplate, keep = { text: np.text, letterHeight: np.letterHeight, arc: np.arc };
    Object.assign(np, { text: "Maximilian Johnson", letterHeight: 10, arc: 120 }); env.errors.length = 0;
    await MF.rebuild(false); await settle();
    const b = MF.parts.length ? C.solidBounds(MF.parts[0].solid) : null;
    check(MF.parts.length > 1 && b && b.mx[0] - b.mn[0] > 150 && !env.errors.length, "“Maximilian Johnson”, 10 mm letters, curved 120°: it builds", b ? `${MF.parts.length} parts, ${(b.mx[0] - b.mn[0]).toFixed(0)} mm wide` : env.errors[0]);
    await drag(np, "arc", [110, 115, 120]); await settle();
    check(MF.parts.length > 1 && !env.errors.length, "and again after dragging the curve (rough builds on the coarser grid too)", env.errors[0] || `${MF.parts.length} parts`);
    Object.assign(np, keep); env.errors.length = 0; await MF.rebuild(false); await settle();
  }
  // Session 86: a name curved the other way (a negative curve) began right of the middle and curled up and over instead of
  // bending into a smile; and the room left for a curve (0.3 of the name's width per 90° on every side) kept a long curved
  // name off the canvas (found by tools-fuzz.js)
  console.log("\na name curved either way bends evenly, and a long curved name builds");
  {
    const np = MF.state.base.nameplate, keep = { text: np.text, arc: np.arc, side: np.sym.side };
    // where the name's letters are across the plate, front to back, at its left end, middle and right end
    const shape = () => { const L = MF.parts.filter(p => /^Name/.test(p.name)), pts = [];
      L.forEach(p => { const P = p.solid.pos; for (let i = 0; i < P.length; i += 3) pts.push([P[i], P[i + 2]]); });
      if (!pts.length) return null;
      const x0 = Math.min(...pts.map(q => q[0])), x1 = Math.max(...pts.map(q => q[0]));
      return [0.04, 0.5, 0.96].map(f => { const bx = x0 + f*(x1 - x0), near = pts.filter(q => Math.abs(q[0] - bx) < (x1 - x0)*0.05); return near.reduce((a, q) => a + q[1], 0)/near.length; }); };
    Object.assign(np, { text: "Alexandra", arc: 90 }); np.sym.side = "none"; await MF.rebuild(false); await settle();
    const up = shape();
    np.arc = -90; await MF.rebuild(false); await settle();
    const down = shape();
    check(up && down && up[1] < up[0] - 3 && up[1] < up[2] - 3 && down[1] > down[0] + 3 && down[1] > down[2] + 3 && Math.abs(down[0] - down[2]) < 0.35*Math.abs(down[1] - down[0]),
      "“Alexandra” curved 90° arches with its middle highest; curved -90° it bends the other way, its ends level with each other",
      up && down ? `+90: ${up.map(v => v.toFixed(1)).join(", ")}; -90: ${down.map(v => v.toFixed(1)).join(", ")} mm` : "no name");
    Object.assign(np, { text: "x".repeat(40), arc: 120 }); env.errors.length = 0; await MF.rebuild(false); await settle();
    check(MF.parts.some(p => /^Name/.test(p.name)) && !env.errors.length, "a 40-letter name curved 120° builds", env.errors[0] || `${MF.parts.length} parts`);
    Object.assign(np, { text: keep.text, arc: keep.arc }); np.sym.side = keep.side; env.errors.length = 0; await MF.rebuild(false); await settle();
  }
  check(env.errors.length === 0, "no page errors", env.errors.join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
