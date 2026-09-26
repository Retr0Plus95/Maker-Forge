// Tracing a logo on a transparent background (reported from a real browser, v0.14.0): a white
// brush-stroke ring that thins out at one end, white letters inside it, small text under them.
// The trace must keep the letters (not only the biggest piece), smoothing must not cut the thin
// stretch of the ring, and a black logo on transparency must trace as well as a white one.
//   node tools-tracer-logo-test.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
const N = 300, CX = 150, CY = 150, R = 120;
// sample points (pixels) that must end up in the part, and some that must not
const ringPts = [], thinPts = [];
for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; (a > 5.2 && a < 6.0 ? thinPts : ringPts).push([CX + R * Math.cos(a), CY + R * Math.sin(a)]); }
const letterPts = { "A left leg": [96, 175], "A right leg": [135, 160], "A bar": [110, 150], "Y stem": [200, 180], "Y arm": [190, 130], "STUDIO": [126, 222] };
const emptyPts = { "centre gap": [150, 205], outside: [10, 10], "inside A": [117, 132] };
function logo(colour) {
  const cv = document.createElement("canvas"); cv.width = N; cv.height = N;
  const x = cv.getContext("2d"); x._ensure && x._ensure();               // stays fully transparent
  x.strokeStyle = colour; x.fillStyle = colour; x.lineCap = "round";
  // the ring: 8 px wide for most of the way round, 2.4 px (about 0.5 mm at 60 mm) at the tail
  x.lineWidth = 8; x.beginPath(); x.arc(CX, CY, R, 6.05, 5.15 + Math.PI * 2, false); x.stroke();
  x.lineWidth = 2.4; x.beginPath(); x.arc(CX, CY, R, 5.1, 6.1, false); x.stroke();
  // A and Y as brush strokes, 7 px wide
  x.lineWidth = 7;
  x.beginPath(); x.moveTo(92, 190); x.lineTo(118, 100); x.lineTo(142, 190); x.stroke();
  x.beginPath(); x.moveTo(104, 150); x.lineTo(132, 150); x.stroke();
  x.beginPath(); x.moveTo(170, 100); x.lineTo(200, 145); x.lineTo(230, 100); x.stroke();
  x.beginPath(); x.moveTo(200, 145); x.lineTo(200, 200); x.stroke();
  // small text (the test canvas draws each glyph as a box)
  x.font = "16px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("STUDIO", 150, 222);
  return cv;
}
async function trace(tag, cv, over) {
  const MF = win.MakerForge, st = MF.state;
  st.items = [{ id: 995, name: tag, src: cv, aspect: 1, width: 60, skip: [], smooth: 1, mode: "flat",
    adjust: { bright: 0, contrast: 0, sat: 0 }, rot90: 0, crop: false, enabled: true, place: { c: [0, 0, 0], n: [0, 1, 0] } }];
  st.active = 0; st.base.type = "tracer";
  const defaults = JSON.parse(JSON.stringify(MF.defaults.tracer));
  st.base.tracer = Object.assign(defaults, { scaleFrom: "measure", sizeAxis: "width", size: 60, strokes: [] }, over || {});
  MF.rebuild(false); await settle();
  const T = MF.tracer;
  if (!T || !T.mask) { check(false, `${tag}: traced something`, document.querySelector("#notice") && document.querySelector("#notice").textContent); return; }
  const on = ([x, y]) => T.mask[Math.floor(y * T.h / N) * T.w + Math.floor(x * T.w / N)] === 1;
  const ring = ringPts.filter(on).length, thin = thinPts.filter(on).length;
  const letters = Object.entries(letterPts).filter(([, p]) => !on(p)).map(([k]) => k);
  // between the T and the U: 0.4 mm apart, so heavier smoothing may join them
  if ((over && over.smooth || 0.4) <= 0.6) check(!on([150, 222]), `${tag}: the small letters stay apart`);
  const wrong = Object.entries(emptyPts).filter(([, p]) => on(p)).map(([k]) => k);
  const outers = T.polys.length, withHole = T.polys.filter(p => p.holes.length).length;
  check(ring === ringPts.length && thin === thinPts.length, `${tag}: the whole ring, thin stretch included`, `${ring}/${ringPts.length} thick, ${thin}/${thinPts.length} thin`);
  check(!letters.length, `${tag}: every letter kept`, letters.length ? "missing " + letters.join(", ") : `${outers} pieces`);
  check(!wrong.length, `${tag}: background stays empty`, wrong.join(", ") || "");
  check(withHole >= 1 && MF.parts.length === 1, `${tag}: the ring is one closed loop`, `${withHole} piece(s) with a hole, ${MF.parts.length} part`);
}
(async () => {
  await sleep(800);
  console.log("white logo on transparency (as reported)");
  await trace("defaults", logo("#ffffff"));
  await trace("smooth 0.6 mm", logo("#ffffff"), { smooth: 0.6 });
  await trace("smooth 1.2 mm", logo("#ffffff"), { smooth: 1.2 });
  await trace("threshold", logo("#ffffff"), { method: "threshold" });
  console.log("\nblack logo on transparency");
  await trace("defaults", logo("#000000"));
  await trace("threshold", logo("#000000"), { method: "threshold" });
  console.log("\ncoloured logo on transparency");
  await trace("pink, smooth 0.8", logo("#e0306a"), { smooth: 0.8 });
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
