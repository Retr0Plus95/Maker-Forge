// Phone case (Session 13): every phone in the list builds a closed case of the right size, the fit
// test rim and the bumper, button and port openings, the camera opening, the lip printable without
// support, a picture inlaid in the back, and a hostile project file.
//   node tools-phonecase-test.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 600; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
(async () => {
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, st = () => MF.state;
  const s = document.querySelector("#objectSel"); s.value = "phonecase"; s.dispatchEvent(new win.Event("change")); await settle();
  const K = () => st().base.phonecase;
  const closed = p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; };
  console.log("the example");
  {
    const ex = st().items.filter(d => d.example), cols = MF.parts.slice(1);
    check(ex.length === 1 && K().logo.on && cols.length >= 2 && MF.parts.every(closed), "a new case opens with a picture inlaid in the back, in its colours, every part closed",
      `${ex.map(d => d.name).join(", ")}; ${cols.map(p => p.name).join(", ")}`);
    // the rest measures the bare case
    MF.examples.drop(); K().logo.on = false; MF.rebuild(false); await settle();
  }
  const sel = $$("#panel select").find(x => [...x.options].some(o => o.value === "iPhone 17 Pro"));
  const phones = [...sel.options].map(o => o.value);
  console.log(`every phone (${phones.length})`);
  check(phones.length >= 70 && ["Apple","Samsung","Google","OnePlus","Xiaomi","Nothing"].every(g => [...sel.querySelectorAll("optgroup")].some(o => o.label === g)), "phones grouped by maker", phones.length);
  check(["iPhone 18 Pro Max","iPhone Air","iPhone 17e","iPhone SE (2nd / 3rd gen)","Galaxy S26 Ultra","Galaxy A57","Pixel 10a","Pixel 11"].every(n => phones.includes(n)), "from the iPhone SE to the iPhone 18 Pro Max, the Galaxy S26 and the Pixel 11");
  let bad = [], worst = 0;
  for (const ph of phones) {
    K().phone = ph; K().spec = MF.phone.spec(ph); MF.rebuild(false); await settle();
    const p = MF.parts[0], b = C.solidBounds(p.solid), S = K().spec, k = K();
    const wantW = S.w + 2 * (k.fit + k.wall), wantH = S.h + 2 * (k.fit + k.wall), wantZ = k.back + S.d + 0.2 + k.lipT;
    const err = Math.max(Math.abs(b.size[0] - wantW), Math.abs(b.size[2] - wantH), Math.abs(b.size[1] - wantZ));
    worst = Math.max(worst, err);
    if (!closed(p) || err > 0.05 || Math.abs(b.mn[1]) > 1e-6 || MF.parts.length !== 1) bad.push(`${ph}: ${b.size.map(v => v.toFixed(2)).join("x")}`);
  }
  check(!bad.length, "each case is closed, on the bed, and exactly the phone plus gap and wall", bad.length ? bad.slice(0, 3).join("; ") : `worst ${worst.toFixed(3)} mm`);
  // the rest on the iPhone 17 Pro
  K().phone = "iPhone 17 Pro"; K().spec = MF.phone.spec("iPhone 17 Pro"); MF.rebuild(false); await settle();
  const base = MF.parts[0], v0 = C.checkMesh(base.solid).volume;
  console.log("\nopenings");
  const build = async over => { Object.assign(K(), over); MF.rebuild(false); await settle(); return MF.parts; };
  let P = await build({ buttons: "none", port: "closed" }); const vClosed = C.checkMesh(P[0].solid).volume;
  P = await build({ buttons: "each", port: "closed" }); const vEach = C.checkMesh(P[0].solid).volume;
  P = await build({ buttons: "long", port: "closed" }); const vLong = C.checkMesh(P[0].solid).volume;
  P = await build({ buttons: "each", port: "port" }); const vPort = C.checkMesh(P[0].solid).volume;
  P = await build({ buttons: "each", port: "wide" }); const vWide = C.checkMesh(P[0].solid).volume;
  check(vClosed > vEach && vEach > vLong && vEach > vPort && vPort > vWide, "button holes, one long slot a side, the port and the wide port each take plastic away",
    [vClosed, vEach, vLong, vPort, vWide].map(v => v.toFixed(0)).join(" > "));
  check(MF.parts.every(closed), "and the case stays closed");
  // a hole where it is asked for: the port is centred on the bottom edge at mid-thickness
  const S = K().spec, zMid = K().back + S.d / 2;
  const hasWallAt = (x, z, y) => { const s0 = MF.parts[0].solid; let hits = 0;   // count faces crossed by a ray along -z at (x, y) outside the phone's bottom
    for (let t = 0; t < s0.idx.length; t += 3) {
      const A = [0, 1, 2].map(k => { const i = s0.idx[t + k] * 3; return [s0.pos[i], s0.pos[i + 1], s0.pos[i + 2]]; });
      // ray from (x, y, far) toward +z... on the xz plane at height y: point in triangle projected onto x-y plane
      const d = (A[1][1] - A[2][1]) * (A[0][0] - A[2][0]) + (A[2][0] - A[1][0]) * (A[0][1] - A[2][1]); if (Math.abs(d) < 1e-12) continue;
      const l0 = ((A[1][1] - A[2][1]) * (x - A[2][0]) + (A[2][0] - A[1][0]) * (y - A[2][1])) / d, l1 = ((A[2][1] - A[0][1]) * (x - A[2][0]) + (A[0][0] - A[2][0]) * (y - A[2][1])) / d;
      if (l0 < 0 || l1 < 0 || l0 + l1 > 1) continue;
      const zz = l0 * A[0][2] + l1 * A[1][2] + (1 - l0 - l1) * A[2][2]; if (zz > z) hits++;
    }
    return hits; };
  await build({ port: "port", portW: 13 });
  const bottomZ = S.h / 2 + K().fit + K().wall / 2;     // world z of the bottom wall (plan y = -H/2 maps to +z)
  check(hasWallAt(0, bottomZ - 5, zMid) === 0 && hasWallAt(20, bottomZ - 5, zMid) > 0, "the port opening is where the plug goes; the wall is there beside it");
  console.log("\nlip, fit test, bumper");
  await build({ port: "port", buttons: "each" });
  let pr = null; MF.printNow && await MF.printNow(); for (let i = 0; i < 400 && !(pr = MF.print); i++) await sleep(50);
  const ledges = pr ? pr.flats.filter(f => f.kind === "ledge").reduce((a, f) => a + f.area, 0) : 0;
  check(pr && pr.overhang.area < 200 && ledges > 100, "the lip prints as a narrow ledge over a 45° slope: only the button tops bridge", pr && `${pr.overhang.area.toFixed(0)} mm² flagged, ${ledges.toFixed(0)} mm² of ledge`);
  P = await build({ test: true });
  const vt = C.checkMesh(P[0].solid).volume;
  check(P.length === 1 && P[0].name === "Fit test rim" && closed(P[0]) && vt < v0 * 0.8, "the fit test is the rim alone, with a ledge to hold the phone", `${vt.toFixed(0)} of ${v0.toFixed(0)} mm³`);
  P = await build({ test: false, style: "bumper" });
  check(P[0].name === "Bumper" && closed(P[0]), "the bumper too");
  await build({ style: "full" });
  console.log("\ncamera, lip and fit follow the settings");
  const vCam = C.checkMesh(MF.parts[0].solid).volume; K().spec.cam.w += 10; await build({}); const vCam2 = C.checkMesh(MF.parts[0].solid).volume; K().spec.cam.w -= 10;
  check(vCam2 < vCam, "a wider camera opening removes more of the back", `${vCam.toFixed(0)} → ${vCam2.toFixed(0)}`);
  for (const [k, v] of [["fit", 0.6], ["wall", 2.2], ["back", 2.4], ["lip", 1.6], ["lipT", 2], ["edge", 0], ["camMargin", 2]]) {
    const was = K()[k]; await build({ [k]: v }); const vv = C.checkMesh(MF.parts[0].solid).volume, b = C.solidBounds(MF.parts[0].solid);
    check(Math.abs(vv - vCam) > 1 && closed(MF.parts[0]), `${k} = ${v} changes the case`, `${vCam.toFixed(0)} → ${vv.toFixed(0)} mm³, ${b.size.map(x => x.toFixed(1)).join(" x ")}`);
    K()[k] = was;
  }
  await build({});
  console.log("\npicture in the back");
  const { encodePNG } = require("./tools-test-env.js"), W = 120, H = 120, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4, r = Math.hypot(x - 60, y - 60), c = r < 28 ? [230, 60, 50] : r < 45 ? [30, 40, 60] : [255, 255, 255]; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; }
  $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(40);
  const ev = new win.Event("drop", { bubbles: true, cancelable: true }); ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
  document.querySelector("#drop").dispatchEvent(ev); for (let i = 0; i < 100 && !st().items.length; i++) await sleep(30); await settle();
  $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40);
  P = await build({ logo: Object.assign(K().logo, { on: true, width: 40, x: 0, y: -20 }) });
  check(P.length >= 2 && P.every(closed) && P.slice(1).every(p => C.solidBounds(p.solid).mn[1] < 1e-6 && C.solidBounds(p.solid).mx[1] <= K().logo.depth + 1e-6),
    "the picture is inlaid in the back's first layers, one part per colour", P.map(p => p.name).join(", "));
  // Session 31: the picture prints face down, so the case is shown turned over; the Art tab's preview has its colours
  const flipped = () => document.querySelector("#vFlip").getAttribute("aria-pressed") === "true", item = st().items[st().active];
  check(flipped(), "with a picture in the back, the case is shown turned over so the picture is in sight");
  check(item._cm && item._cm.idx.some(v => v >= 0) && item._cm.idx.some(v => v < 0) && item._inlay, "the Art tab's preview has the picture in its colours, the background left out", item._cm && `${item._cm.gx} × ${item._cm.gy}`);
  K().logo.on = false; MF.rebuild(false); await settle();
  check(!flipped(), "without one it is shown the right way up again");
  K().logo.on = true; MF.rebuild(false); await settle();
  document.querySelector("#vFlip").click(); await settle(); MF.rebuild(false); await settle();
  check(!flipped(), "turned back with ⟳, it stays that way after the next change");
  document.querySelector("#vFlip").click(); await settle();
  P = MF.parts;
  const pic = P.slice(1).map(p => C.solidBounds(p.solid)), cx = (Math.min(...pic.map(b => b.mn[0])) + Math.max(...pic.map(b => b.mx[0]))) / 2;
  await build({ logo: Object.assign(K().logo, { x: 10 }) });
  const pic2 = MF.parts.slice(1).map(p => C.solidBounds(p.solid)), cx2 = (Math.min(...pic2.map(b => b.mn[0])) + Math.max(...pic2.map(b => b.mx[0]))) / 2;
  check(near(cx2 - cx, -10, 0.5), "moving it right (seen from the back) moves it left seen from above", `${(cx2 - cx).toFixed(2)} mm`);
  await build({ logo: Object.assign(K().logo, { x: 0, y: 60, width: 60 }) });
  check(MF.parts.length === 1 && MF.phone.info.warn.some(w => /camera|back/i.test(w.t + w.s)), "over the camera opening it is left off, with a message", MF.phone.info.warn.map(w => w.t).join(" / "));
  // Session 31: the picture's pocket is cut where the picture is. The back's first layers (z = 0) are case or
  // picture, never both: a camera bar right across the back (Pixel 8) splits it in two, and the pocket used to go
  // into the first piece only, so the whole picture sat inside solid case; a part of the picture inside a gap of
  // another (a bullseye) used to be covered by case too
  const downArea = s => { let a = 0; const Q = s.pos, I = s.idx; for (let t = 0; t < I.length; t += 3) { const A = 3 * I[t], B = 3 * I[t + 1], D = 3 * I[t + 2];
    if (Math.max(Math.abs(Q[A + 1]), Math.abs(Q[B + 1]), Math.abs(Q[D + 1])) > 1e-4) continue;
    a += Math.abs((Q[B] - Q[A]) * (Q[D + 2] - Q[A + 2]) - (Q[B + 2] - Q[A + 2]) * (Q[D] - Q[A])) / 2; } return a; };
  const overlap = async () => {
    K().logo.on = false; MF.rebuild(false); await settle(); const plain = downArea(MF.parts[0].solid);
    K().logo.on = true; MF.rebuild(false); await settle();
    const pic = MF.parts.slice(1).reduce((a, q) => a + downArea(q.solid), 0);
    return { pic, over: downArea(MF.parts[0].solid) + pic - plain };
  };
  const bull = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4, r = Math.hypot(x - 60, y - 60), c = r < 14 ? [230, 60, 50] : r < 26 ? [255, 255, 255] : r < 44 ? [240, 200, 60] : [255, 255, 255]; bull[o] = c[0]; bull[o + 1] = c[1]; bull[o + 2] = c[2]; bull[o + 3] = 255; }
  for (const [ph, file] of [["Pixel 8", null], ["iPhone 17 Pro", null], ["iPhone 17 Pro", "bullseye"]]) {
    if (file) { $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(40); const n0 = st().items.length;
      const e2 = new win.Event("drop", { bubbles: true, cancelable: true }); e2.dataTransfer = { files: [new win.File([encodePNG(W, H, bull)], "bullseye.png", { type: "image/png" })] };
      document.querySelector("#drop").dispatchEvent(e2); for (let i = 0; i < 100 && st().items.length === n0; i++) await sleep(30); await settle();
      $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40); }
    K().phone = ph; K().spec = MF.phone.spec(ph); Object.assign(K().logo, { on: true, width: 40, x: 0, y: -20 });
    const r = await overlap();
    check(r.pic > 50 && Math.abs(r.over) < 0.01 * r.pic, `${ph}${file ? ", a " + file : ""}: the picture's pocket is cut where the picture is, nothing of the case over it`, `${r.pic.toFixed(0)} mm² of picture, ${r.over.toFixed(1)} mm² overlapping`);
  }
  K().phone = "iPhone 17 Pro"; K().spec = MF.phone.spec("iPhone 17 Pro");
  // Session 31: gaps between two colours narrower than the nozzle take a neighbour's colour, so no strip of case
  // too thin to print is left between them (0.19 mm walls between a honeycomb's cells)
  const bars = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (y * W + x) * 4, inside = x >= 20 && x < 100 && y >= 30 && y < 90, k = (x - 20) % 9;
    const c = !inside || k === 8 ? [255, 255, 255] : (Math.floor((x - 20) / 9) % 2 ? [240, 200, 60] : [230, 60, 50]); bars[o] = c[0]; bars[o + 1] = c[1]; bars[o + 2] = c[2]; bars[o + 3] = 255; }
  { $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(40); const n0 = st().items.length;
    const e3 = new win.Event("drop", { bubbles: true, cancelable: true }); e3.dataTransfer = { files: [new win.File([encodePNG(W, H, bars)], "bars.png", { type: "image/png" })] };
    document.querySelector("#drop").dispatchEvent(e3); for (let i = 0; i < 100 && st().items.length === n0; i++) await sleep(30); await settle();
    $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40); }
  Object.assign(K().logo, { on: true, width: 24, x: 0, y: -20 }); MF.rebuild(false); await settle();      // 0.2 mm gaps
  let pb = null; MF.printNow && await MF.printNow(); for (let i = 0; i < 400 && !(pb = MF.print); i++) await sleep(50);
  const thinBack = pb ? pb.thin.filter(t => t.y < K().logo.depth + 0.05) : null;
  check(MF.parts.length >= 3 && thinBack && !thinBack.length, "stripes 0.2 mm apart: the gaps take a colour, no wall thinner than the nozzle at the back (v0.26.0: four of 0.19 mm)",
    thinBack && (thinBack.map(t => `${t.name} ${t.width.toFixed(2)} mm at ${t.y.toFixed(2)}`).join(", ") || "none"));
  // Session 31: Match to artwork with a picture in the back keeps the case's own filament, and names the others
  { const caseSlot = st().base.slot, before = JSON.parse(JSON.stringify(st().slots));
    $$("#tabs button").find(b => b.dataset.k === "colour").click(); await sleep(60);
    const mb = $$("#panel button").find(b => /Match to artwork/.test(b.textContent)); mb && mb.click(); await settle();
    const after = st().slots, changed = after.filter((s, i) => i !== caseSlot && s.hex !== before[i].hex);
    check(mb && after[caseSlot].hex === before[caseSlot].hex && after[caseSlot].name === before[caseSlot].name && changed.length >= 1 && changed.every(s => s.name.startsWith(MF.paint.photo.colourWord(C.hexToRgb(s.hex)))),
      "Match to artwork keeps the case's own filament and names the others after their colours", after.map(s => `${s.name} ${s.hex}`).join(", "));
    $$("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(40); }
  console.log("\nhostile project file");
  const evil = { app: "Maker Forge", v: 4, state: JSON.parse(JSON.stringify(Object.assign({}, st(), { items: [] }))) };
  evil.state.items = [];
  evil.state.base.phonecase = { phone: "<img src=x onerror=alert(1)>", spec: { h: 1e9, w: -5, d: "x", r: NaN, cam: { x: 1e9, w: -1 }, btn: [{ side: "<b>", from: 1e9, len: -3 }, null, "junk", ...Array(20).fill({ side: "left", from: 10, len: 5 })] },
    style: "evil", buttons: "all", port: "<script>", fit: 99, wall: -1, back: 1e9, lip: NaN, lipT: 0, edge: 1e9, camMargin: -9, portW: 1e9, logo: { on: "yes", mode: "x", width: 1e9, x: NaN, y: -1e9, depth: 99 } };
  const f = new win.File([JSON.stringify(evil)], "evil.json", { type: "application/json" });
  const inp = document.querySelector("#projInput"); Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
  for (let i = 0; i < 100 && K().phone !== "iPhone 17 Pro"; i++) await sleep(30);
  await settle();
  const k2 = K(), s2 = k2.spec;
  check(k2.phone === "iPhone 17 Pro" && k2.style === "full" && k2.buttons === "each" && k2.port === "port" && k2.logo.on === false && k2.logo.mode === "inlay", "bad choices fall back to safe ones", `${k2.phone}, ${k2.style}, ${k2.buttons}, ${k2.port}`);
  check(s2.h === 240 && s2.w === 40 && s2.d === 8.75 && s2.cam.x === 120 && s2.cam.w === 5 && s2.btn.length === 8 && s2.btn[0].side === "left" && s2.btn[0].from === 200 && s2.btn[0].len === 2,
    "sizes clamped, at most eight buttons", JSON.stringify(s2).slice(0, 120));
  check(k2.fit === 1.5 && k2.wall === 0.8 && k2.back === 4 && k2.lip === 1 && k2.lipT === 0.6 && k2.portW === 60 && k2.logo.width === 120, "numbers clamped");
  check(MF.parts.length >= 1 && MF.parts.every(closed), "and it still builds a closed case");
  check(!document.body.innerHTML.includes("onerror=alert"), "nothing injected into the page");
  console.log("errors:", env.errors.length ? env.errors.slice(0, 3) : "none");
  if (env.errors.length) fails++;
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
