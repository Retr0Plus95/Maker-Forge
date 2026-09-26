// Pictures on objects (Session 15): a picture on a photo frame goes on the border, a picture that lands
// off the model is reported, the phone case's Art tab offers the inlay in the back instead of placement
// controls that do nothing, and the keys that move or delete artwork act only on the Art tab.
//   node tools-art-test.js index.html
const boot = require("./tools-test-env.js");
const { encodePNG } = boot;
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
async function settle() {
  const MF = win.MakerForge, r0 = MF.rev;
  for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
  for (let i = 0; i < 400; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
  return false;
}
const tabBtn = k => $$("#tabs button").find(b => b.dataset.k === k);
const choose = async v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); };
const key = (el, k) => el.dispatchEvent(new win.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
async function addPicture(MF) {                      // the smoke test's two-colour badge, dropped on the Art tab
  const W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4, r = Math.hypot(x - 120, y - 90), col = r < 40 ? [240, 190, 30] : r < 75 ? [25, 90, 170] : [255, 255, 255];
    px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
  }
  tabBtn("art").click(); await sleep(50);
  const ev = new win.Event("drop", { bubbles: true, cancelable: true });
  ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
  document.querySelector("#drop").dispatchEvent(ev);
  for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge" && d.src); i++) await sleep(30);
  await settle();
  return MF.state.items.find(d => d.name === "badge");
}
(async () => {
  await sleep(800);
  const MF = win.MakerForge, C = MF.core;
  const panelText = () => document.querySelector("#panel").textContent;
  const labels = () => $$("#panel label").map(l => l.textContent.trim());

  console.log("photo frame: the picture goes on the border");
  await choose("frame");
  const d = await addPicture(MF), F = MF.state.base.frame, band = (F.h - F.winH) / 2;
  const decals = MF.parts.filter(p => p.name !== "Frame");
  check(decals.length >= 1 && decals.every(p => C.checkMesh(p.solid).tris > 0), "the picture prints on the frame", MF.parts.map(p => `${p.name} ${C.checkMesh(p.solid).tris}`).join(", "));
  const zs = decals.flatMap(p => { const b = C.solidBounds(p.solid); return [b.mn[2], b.mx[2]]; });
  check(Math.min(...zs) >= F.winH / 2 - 0.01 && Math.max(...zs) <= F.h / 2 + 0.01, "all of it sits on the bottom border, none in the window", `z ${Math.min(...zs).toFixed(1)} to ${Math.max(...zs).toFixed(1)} mm, border ${F.winH / 2} to ${F.h / 2}`);
  check(d.width / d.aspect <= band, "it is sized to fit the border", `${d.width} × ${(d.width / d.aspect).toFixed(1)} mm in a ${band} mm border`);
  check(!MF.checks.list.some(r => /misses the model/.test(r.t)), "no warning while it is on the frame");
  check(/goes on the border/.test(panelText()), "the Art tab says where pictures go on a frame");

  console.log("\na picture that misses the model is reported");
  d.place = { c: [0, F.thick, 0], n: [0, 1, 0] }; d.offU = d.offV = 0; d.width = 40; d.solids = null; MF.rebuild(false); await settle();
  const miss = MF.checks.list.find(r => /misses the model/.test(r.t));
  check(MF.parts.length === 1 && miss && miss.k === "warn" && /window/.test(miss.s), "a picture in the frame's window: nothing prints, and the checks say why", miss && `${miss.t}: ${miss.s}`);
  d.enabled = false; d.solids = null; MF.rebuild(false); await settle();
  check(!MF.checks.list.some(r => /misses the model/.test(r.t)), "a picture that is switched off is not reported");
  d.enabled = true; d.solids = null;

  console.log("\nphone case: the picture goes in the back");
  await choose("phonecase"); tabBtn("art").click(); await sleep(80);
  const btn = $$("#panel button").find(b => /Put it in the back/.test(b.textContent));
  check(/inlaid in the back/.test(panelText()) && btn && !labels().some(l => /^Rotation|^Move across|^Thickness above/.test(l)), "the Art tab offers the inlay instead of placement controls that do nothing", labels().slice(0, 6).join(", "));
  if (btn) btn.click(); else { MF.state.base.phonecase.logo.on = true; MF.rebuild(false); } await settle(); await sleep(50);
  check(MF.state.base.phonecase.logo.on === true && document.querySelector("#tabs button.on, #tabs button[aria-selected=true]") && MF.parts.length > 1, "the button switches the inlay on and opens the Make tab", MF.parts.map(p => p.name).join(", "));
  tabBtn("art").click(); await sleep(80);
  check(/inlaid into the back of the case/.test(panelText()) && labels().includes("Mirror") && !labels().some(l => /^Rotation|^Move across/.test(l)), "with the inlay on, the Art tab shows only what the inlay reads", labels().join(", ").slice(0, 160));
  MF.state.base.phonecase.style = "bumper"; MF.rebuild(false); await settle(); tabBtn("art").click(); await sleep(80);
  check(/A bumper has no back/.test(panelText()), "a bumper says it cannot carry a picture");
  MF.state.base.phonecase.style = "case"; MF.state.base.phonecase.logo.on = false;

  console.log("\nkeys that move or delete artwork act only on the Art tab");
  await choose("board"); await settle();
  const item = MF.state.items[MF.state.active] || MF.state.items[0], u0 = item.offU, n0 = MF.state.items.length;
  tabBtn("make").click(); await sleep(50);
  tabBtn("make").focus(); key(tabBtn("make"), "ArrowRight"); await sleep(50);
  check(item.offU === u0, "arrow keys on the tab bar move between tabs, not the artwork", `offU ${item.offU}`);
  tabBtn("make").click(); await sleep(50); document.activeElement.blur();
  key(document.body, "ArrowRight"); key(document.body, "Delete"); await sleep(50);
  check(item.offU === u0 && MF.state.items.length === n0, "on the Make tab the arrow keys and Delete leave the artwork alone");
  tabBtn("art").click(); await sleep(50); document.activeElement.blur();
  key(document.body, "ArrowRight"); await settle();
  check(Math.abs(item.offU - (u0 + 0.5)) < 1e-9, "on the Art tab, with nothing else focused, an arrow key nudges it", `offU ${u0} → ${item.offU}`);
  const b = $$("#panel button")[0]; b.focus(); key(b, "ArrowRight"); key(b, "Delete"); await sleep(50);
  check(Math.abs(item.offU - (u0 + 0.5)) < 1e-9 && MF.state.items.length === n0, "not while a button has the focus");
  document.activeElement.blur(); key(document.body, "Delete"); await settle();
  check(MF.state.items.length === n0 - 1, "Delete on the Art tab removes the picture", `${n0} → ${MF.state.items.length}`);

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
