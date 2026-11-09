// Geometry fingerprints (Session 65): every object and quick start built by default, and for each part its triangle count,
// volume and size, kept in tools-fingerprints.json. Run it after a change: any object whose geometry moved is listed, so a
// change you did not mean shows up (the print survey only compares warnings). With --update it writes the file afresh.
//   node tools-fingerprint.js index.html [--update]
const fs = require("fs"), path = require("path");
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const FILE = path.join(__dirname, "tools-fingerprints.json"), update = process.argv.includes("--update");
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 800; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
// a part's fingerprint: triangles, volume (0.1 mm³) and its box (0.01 mm), each a number that only moves when the shape does
function print(MF) {
  const C = MF.core;
  return MF.parts.map(p => { const P = p.solid.pos; let a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9];
    for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], P[i + k]); b[k] = Math.max(b[k], P[i + k]); }
    return { name: p.name, tris: p.solid.idx.length / 3, vol: Math.round(C.signedVolume(p.solid) * 10) / 10, size: b.map((v, k) => Math.round((v - a[k]) * 100) / 100) }; });
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge, now = {};
  for (const v of $$("#objectSel option").map(o => o.value).filter(v => v !== "stl" && v !== "none")) {
    const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); now["object " + v] = print(MF);
  }
  for (const k of $$("#presetGallery button").map(b => b.dataset.k)) { $$("#presetGallery button").find(b => b.dataset.k === k).click(); await settle(); now["preset " + k] = print(MF); }
  if (update || !fs.existsSync(FILE)) { fs.writeFileSync(FILE, JSON.stringify(now, null, 1) + "\n"); console.log(`wrote ${Object.keys(now).length} fingerprints to tools-fingerprints.json`); process.exit(0); }
  const was = JSON.parse(fs.readFileSync(FILE, "utf8")), moved = [];
  for (const k of new Set([...Object.keys(was), ...Object.keys(now)])) {
    const A = was[k] || [], B = now[k] || [];
    if (!was[k] || !now[k]) { moved.push(`${k}: ${was[k] ? "gone" : "new"}`); continue; }
    const names = new Set([...A.map(p => p.name), ...B.map(p => p.name)]);
    for (const n of names) { const a = A.find(p => p.name === n), b = B.find(p => p.name === n);
      if (!a || !b) { moved.push(`${k} / ${n}: ${a ? "gone" : "new"}`); continue; }
      const dv = b.vol - a.vol, ds = b.size.map((v, i) => +(v - a.size[i]).toFixed(2));
      if (Math.abs(dv) > Math.max(0.5, Math.abs(a.vol) * 1e-4) || ds.some(d => Math.abs(d) > 0.02) || a.tris !== b.tris)
        moved.push(`${k} / ${n}: volume ${a.vol} → ${b.vol}${ds.some(d => d) ? `, size ${a.size.join("×")} → ${b.size.join("×")}` : ""}${a.tris !== b.tris ? `, triangles ${a.tris} → ${b.tris}` : ""}`); }
  }
  console.log(moved.length ? `${moved.length} changed:\n  ` + moved.join("\n  ") : `all ${Object.keys(now).length} unchanged`);
  process.exit(moved.length ? 1 : 0);
})();
