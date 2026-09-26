// What the printability check says about every object and quick-start preset, as built by default.
//   node tools-print-survey.js index.html [objects|presets|all]
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
async function report(tag) {
  const MF = win.MakerForge, t0 = Date.now();
  let p = null; for (let i = 0; i < 600 && !(p = MF.print); i++) await sleep(25);
  if (!MF.parts.length) { console.log(`${tag.padEnd(30)} (nothing built)`); return; }
  if (!p) { console.log(`${tag.padEnd(30)} NO RESULT`); return; }
  const f = k => p.flats.filter(x => x.kind === k);
  const warn = MF.checks.list.filter(r => r.k !== "ok" && /support|thin|bed|Barely|Tall|Small contact|warps|Floats/.test(r.t)).map(r => r.t);
  console.log(`${tag.padEnd(30)} ${String(p.tris).padStart(6)} tris ${String(Date.now() - t0).padStart(5)} ms | support ${p.overhang.area.toFixed(1).padStart(7)} mm² | bridges ${f("bridge").length} ledges ${f("ledge").length} | thin ${p.thin.length}${p.thin.length ? " (" + p.thin.slice(0, 3).map(t => `${t.name} ${t.width.toFixed(2)}mm@${t.y.toFixed(1)}`).join(", ") + ")" : ""} | bed ${p.contact.area.toFixed(0)} mm² ${p.contact.brimWhy}`);
  if (warn.length) console.log(`${"".padEnd(30)} -> ${warn.join(" / ")}`);
}
async function addPicture(MF) {           // the same two-colour badge the smoke test drops in
  const { encodePNG } = require("./tools-test-env.js"), W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, dx = x - 120, dy = y - 90, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const star = r < 40 * (0.62 + 0.38 * Math.cos(5 * a)), col = star ? [240, 190, 30] : r < 75 ? [25, 90, 170] : [255, 255, 255];
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
  }
  $$("#tabs button").find(b => b.dataset.k === "art").click(); await sleep(50);
  const ev = new win.Event("drop", { bubbles: true, cancelable: true });
  ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
  document.querySelector("#drop").dispatchEvent(ev);
  for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge" && d.src); i++) await sleep(30);
  await settle();
}
(async () => {
  await sleep(800);
  if (!process.env.NOPIC) await addPicture(win.MakerForge);
  const what = process.argv[3] || "all";
  if (what !== "presets") for (const v of $$("#objectSel option").map(o => o.value).filter(v => v !== "stl" && v !== "none")) {
    const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); await report("object " + v);
  }
  if (what !== "objects") for (const k of $$("#presetGallery button").map(b => b.dataset.k)) {
    $$("#presetGallery button").find(b => b.dataset.k === k).click(); await settle(); await report("preset " + k);
  }
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  console.log("errors:", errs.length, errs.slice(0, 2).map(e => e.split("\n")[0]).join(" / "));
  process.exit(0);
})();
