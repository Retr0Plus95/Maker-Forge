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

  // leaving the frame gives the picture back its size (it used to stay border-sized on every later object)
  await choose("cylinder"); d.width = 60; const wCyl = d.width; await choose("frame");
  const wFrame = d.width; await choose("cylinder");
  check(wFrame < wCyl && d.width === wCyl, "a picture fitted to the frame's border gets its size back on the next object", `${wCyl} → ${wFrame} → ${d.width} mm`);
  await choose("frame");

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
  MF.state.base.phonecase.style = "full"; MF.state.base.phonecase.logo.on = false;

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

  // ---- Session 34: a picture's background taken away by its colour (the owner's keychain logo, white on green,
  // that the AI found no subject in) ----
  console.log("\na picture's background taken away by its colour");
  {
    const P = require("./tools-cutout-pictures.js")(C), inp = document.querySelector("#projInput");
    const notice = () => document.querySelector("#notice").textContent;
    const openProject = async text => {
      const f = new win.File([text], "p.json", { type: "application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
      for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30);
      return settle();
    };
    const drop = async (p, name) => {
      tabBtn("art").click(); await sleep(50);
      const ev = new win.Event("drop", { bubbles: true, cancelable: true });
      ev.dataTransfer = { files: [new win.File([encodePNG(p.W, p.H, p.rgba)], name + ".png", { type: "image/png" })] };
      document.querySelector("#drop").dispatchEvent(ev);
      for (let i = 0; i < 100 && !MF.state.items.some(x => x.name === name && x.src); i++) await sleep(30);
      await settle(); tabBtn("art").click(); await sleep(50);
      return MF.state.items.find(x => x.name === name);
    };
    const btn = re => $$("#panel button").find(b => re.test(b.textContent));
    const pixels = cv => cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    const waitFor = async f => { for (let i = 0; i < 300 && !f(); i++) await sleep(30); await settle(); tabBtn("art").click(); await sleep(50); };
    await choose("board");
    const logo = P.logoOnGreen(), d = await drop(logo, "skondal");
    let aiCalls = 0; MF.paint.photo.ai.hooks.run = async () => { aiCalls++; throw new Error("not this time"); };
    check(d && MF.art.hasBackground(d) && btn(/Take the background away/) && btn(/Cut out with AI/), "a logo on plain green: taking the background away by its colour is offered, and the AI beside it");
    const orig = d.asset; btn(/Take the background away/).click();
    await waitFor(() => d.uncut);
    // the cut-out keeps its full size: crop is applied when it is drawn, so its pixels line up with the truth
    const s = P.score(logo, pixels(d.src));
    check(d.uncut === orig && d.cutBy && d.cutBy.by === "colour" && d.cutBy.holes === true && aiCalls === 0, "taken away by its colour, inside the S too, with nothing downloaded", JSON.stringify(d.cutBy));
    check(s.iou > 0.97 && s.edge < 0.05, "only the white S and the name are left, to within a pixel, with soft edges", `overlap ${(s.iou * 100).toFixed(1)}%, edges ${(s.edge * 100).toFixed(1)}% off`);
    const px = pixels(d.src); let rim = 0, soft = 0;
    for (let i = 0; i < logo.W * logo.H; i++) { const a = px[4 * i + 3]; if (a > 0 && a < 255) { soft++; if (px[4 * i + 1] - px[4 * i] > 40) rim++; } }
    check(soft > 200 && rim === 0, "no rim of green left round the letters: the soft edge pixels are white", `${soft} soft edge pixels, ${rim} green`);
    check(MF.parts.length > 1 && MF.parts.every(q => C.checkMesh(q.solid).open === 0) && /inside the letters too/.test(notice()), "it prints on the board, every part closed", MF.parts.map(q => q.name).join(", "));
    // only round it: the green inside the S comes back
    $$("#panel button").find(b => /Only round it/.test(b.textContent)).click();
    await waitFor(() => d.cutBy && d.cutBy.holes === false);
    const s2 = P.score(logo, pixels(d.src));
    check(d.cutBy.holes === false && s2.extra > 1000, "Only round it: the green inside the S and the letters stays", `${s2.extra} more pixels kept`);
    // a different tolerance cuts it again from the original
    const t = $$("#panel input[type=range]").find(r => /How different/.test(r.getAttribute("aria-label")));
    t.value = 20; t.dispatchEvent(new win.Event("input")); await sleep(500);
    await waitFor(() => d.cutBy && d.cutBy.tol === 20);
    check(d.cutBy.tol === 20 && d.uncut === orig, "the tolerance cuts it again from the original", JSON.stringify(d.cutBy));
    // saved and opened again: how it was cut comes back, so it can still be changed
    const saved = MF.projectPayload(true); await openProject(saved);
    const d2 = MF.state.items.find(x => x.name === "skondal");
    check(d2 && d2.cutBy && d2.cutBy.by === "colour" && d2.cutBy.tol === 20 && d2.uncut === orig, "saved and opened again: how it was cut comes back", d2 && JSON.stringify(d2.cutBy));
    tabBtn("art").click(); await sleep(50); btn(/Put the background back/).click(); await settle();
    check(!d2.uncut && !d2.cutBy && d2.asset === orig, "Put the background back: the original, and no cut-out settings");
    // the AI finding nothing in a logo (it is made for photos): taken away by its colour instead
    MF.paint.photo.ai.hooks.run = async (input, S) => { aiCalls++; return new Float32Array(S * S).fill(0).map((v, i) => i === 0 ? 1 : 0); };
    let said = ""; const watch = setInterval(() => { said += " " + notice(); }, 5);
    tabBtn("art").click(); await sleep(50); btn(/Cut out with AI/).click();
    await waitFor(() => d2.uncut);
    check(d2.cutBy && d2.cutBy.by === "colour" && /found no clear subject.*by its colour instead/.test(said), "the AI finding no subject in a logo: its background is taken away by its colour instead", notice().slice(0, 120));
    tabBtn("art").click(); await sleep(50); btn(/Put the background back/).click(); await settle(); said = "";
    // the AI that cannot be loaded (offline): by its colour too
    MF.paint.photo.ai.hooks.run = null; MF.paint.photo.ai.hooks.load = async () => { throw new Error("offline"); };
    tabBtn("art").click(); await sleep(50); btn(/Cut out with AI/).click();
    await waitFor(() => d2.uncut); clearInterval(watch);
    check(d2.cutBy && d2.cutBy.by === "colour" && /could not be loaded.*by its colour instead/.test(said), "the AI that cannot be loaded: taken away by its colour instead", notice().slice(0, 120));
    MF.paint.photo.ai.hooks.load = null;

    // a badge: a green square with a white margin. The white goes; the green stays, and can go too
    const badge = P.badgeOnWhite(), b = await drop(badge, "badge2");
    btn(/Take the background away/).click(); await waitFor(() => b.uncut);
    const sb = P.score(badge, pixels(b.src));
    check(b.cutBy.holes === false && sb.iou > 0.99, "a badge on white: the white margin goes, the white S on the green stays (a big white patch inside is kept)", `overlap ${(sb.iou * 100).toFixed(1)}%`);
    const peel = btn(/Take the green round it away too/);
    check(!!peel, "the green round it can go too", $$("#panel button").map(x => x.textContent).filter(x => /Take/.test(x)).join(" | "));
    if (peel){ peel.click(); await waitFor(() => b.cutBy.peel && b.cutBy.peel.length === 1); }
    const pb = pixels(b.src); let white = 0, green = 0;
    for (let i = 0; i < badge.W * badge.H; i++) if (pb[4 * i + 3] > 127) { if (pb[4 * i + 1] > 200) white++; else green++; }
    check(b.cutBy.peel.length === 1 && white > 1000 && green < white * 0.05, "then only the white S and name are left", `${white} white pixels, ${green} other`);

    // a cartoon on white: the white inside its outline stays (the white round it goes)
    const cart = P.cartoonOnWhite(), ct = await drop(cart, "cartoon");
    btn(/Take the background away/).click(); await waitFor(() => ct.uncut);
    const sc = P.score(cart, pixels(ct.src));
    check(ct.cutBy.holes === false && sc.iou > 0.99, "a drawing on white: the white face inside its outline stays", `overlap ${(sc.iou * 100).toFixed(1)}%`);
    // a busy picture is not offered the colour, only the AI
    const busy = await drop(P.busyPhoto(), "busy");
    check(!btn(/Take the background away/) && btn(/Cut out the subject with AI/), "a busy photo: only the AI is offered");

    // a keychain's own background removal (Session 34: soft edges, no green rim): the logo beside a name
    await choose("nameplate"); const np = MF.state.base.nameplate;
    np.pic.on = true; np.pic.item = MF.state.items.findIndex(x => x.name === "skondal"); np.pic.cutout = true; np.pic.colour = true;
    MF.rebuild(false); await settle();
    check(MF.parts.length > 1 && MF.parts.every(q => C.checkMesh(q.solid).open === 0), "a keychain with the logo beside the name, its background taken away by colour: every part closed", MF.parts.map(q => q.name).join(", "));
    MF.paint.photo.ai.hooks.run = null;

    // a hostile project: how a cut-out was made is only ever the few settings it has
    const data = JSON.parse(MF.projectPayload(true)), it = data.state.items.find(x => x.name === "skondal");
    it.uncut = it.uncut || it.asset;
    it.cutBy = { by: "colour", tol: 1e9, holes: "yes", inside: -5, peel: [[1e9, -4, "x"], [10, 20, 30], ...Array(20).fill([1, 2, 3])], evil: "<img src=x onerror=alert(1)>" };
    const other = data.state.items.find(x => x.name === "badge2"); other.cutBy = "<script>"; delete other.uncut;
    await openProject(JSON.stringify(data));
    const h1 = MF.state.items.find(x => x.name === "skondal").cutBy, h2 = MF.state.items.find(x => x.name === "badge2").cutBy;
    check(h1 && h1.tol === 100 && h1.holes === false && h1.inside === 0 && h1.peel.length === 4 && h1.peel[0].join() === "10,20,30" && !("evil" in h1) && h2 === undefined,
      "a hostile project: the cut-out settings are clamped, and only kept with an original", JSON.stringify(h1));
  }

  // ---- Session 34: pictures placed accurately ----
  console.log("\npictures placed accurately");
  {
    const dropPic = async (W, H, at, name) => {
      const px = new Uint8ClampedArray(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px.set([...at(x, y), 255], 4 * (y * W + x));
      tabBtn("art").click(); await sleep(50);
      const ev = new win.Event("drop", { bubbles: true, cancelable: true });
      ev.dataTransfer = { files: [new win.File([encodePNG(W, H, px)], name + ".png", { type: "image/png" })] };
      document.querySelector("#drop").dispatchEvent(ev);
      for (let i = 0; i < 100 && !MF.state.items.some(x => x.name === name && x.src); i++) await sleep(30);
      await settle(); tabBtn("art").click(); await sleep(50);
      return MF.state.items.find(x => x.name === name);
    };
    // a flag in two colours, each reaching the edge: both print (they used to trace to nothing), right up to it
    await choose("board");
    const red = [200, 30, 40], blue = [30, 60, 180];
    MF.state.slots[0].hex = "#f4f1ea"; MF.state.slots[1].hex = "#c81e28"; MF.state.slots[2].hex = "#1e3cb4";
    const flag = await dropPic(300, 200, x => x < 150 ? red : blue, "flag");
    flag.width = 30; flag.solids = null; MF.rebuild(false); await settle();
    const area = q => q ? C.checkMesh(q).volume / (flag.height + flag.embed) : 0, a1 = area(flag.solids[1]), a2 = area(flag.solids[2]);
    check(Math.abs(a1 - 300) < 8 && Math.abs(a2 - 300) < 8, "a flag in two colours reaching the edge: both halves print, right up to it", `${a1.toFixed(0)} and ${a2.toFixed(0)} mm², 300 each`);
    // a logo on white: the white round it is left out, and the preview shows it see-through
    const logo = await dropPic(300, 200, (x, y) => Math.hypot(x - 150, y - 100) < 60 ? red : [255, 255, 255], "dot");
    logo.width = 30; logo.solids = null; MF.rebuild(false); await settle();
    const pv = document.querySelector("#preview"), pp = pv.getContext("2d").getImageData(0, 0, pv.width, pv.height).data;
    check(!logo.solids[0] && Math.abs(area(logo.solids[1]) - Math.PI * 36) < 4 && pp[3] === 0 && pp[4 * (Math.floor(pv.height / 2) * pv.width + Math.floor(pv.width / 2)) + 3] === 255,
      "a logo on white: the white round it prints nothing, and the preview shows it see-through", `${area(logo.solids[1]).toFixed(1)} mm² of red, ${(Math.PI * 36).toFixed(1)} drawn`);
    // Print the background too: the white prints, a rectangle round the dot, up to the picture's edges
    const keepBox = $$("#panel label.check").find(l => /Print the background too/.test(l.textContent));
    if (keepBox){ const cb = keepBox.querySelector("input"); cb.checked = true; cb.dispatchEvent(new win.Event("change")); await settle(); }
    const white = area(logo.solids[0]);
    check(keepBox && logo.keepBg === true && Math.abs(white + area(logo.solids[1]) - 600) < 10, "Print the background too: the white round it prints, out to the picture's edges", `${white.toFixed(0)} mm² of white, 600 mm² in all`);
    logo.keepBg = false;
    // a thin line and a small dot keep their size (a dot three cells across used to be lost, a line thinned)
    logo.enabled = false;
    const line = await dropPic(240, 120, (x, y) => (y >= 40 && y < 44 && x > 20 && x < 220) || (Math.hypot(x - 120, y - 80) < 3.2) ? [20, 20, 20] : [255, 255, 255], "line");
    line.width = 30; line.quality = "standard"; line.smooth = 0; line.solids = null; MF.rebuild(false); await settle();
    const ls = line.solids.find(Boolean), bb = ls && C.solidBounds(ls);
    check(ls && Math.abs(C.checkMesh(ls).volume / (line.height + line.embed) - (200 / 8) * (4 / 8) - Math.PI * (3.2 / 8) ** 2) < 1.2, "a line two cells wide and a small dot both print at their size",
      ls ? `${(C.checkMesh(ls).volume / (line.height + line.embed)).toFixed(1)} mm², ${((200 / 8) * (4 / 8) + Math.PI * (3.2 / 8) ** 2).toFixed(1)} drawn` : "nothing");
    // wrapped round a cylinder: a 50 mm picture goes 50 mm round it, not wider
    line.enabled = false; flag.enabled = false;
    await choose("cylinder");
    const band = await dropPic(400, 80, () => red, "band");
    band.width = 50; band.keepBg = true; band.solids = null; MF.rebuild(false); await settle();   // all one colour: all background, unless asked
    const R = MF.state.base.cyl.dia / 2, span = () => { const q = band.solids.find(Boolean).pos; let lo = 9, hi = -9;
      for (let i = 0; i < q.length; i += 3) if (Math.hypot(q[i], q[i + 2]) > R + 0.3) { const a = Math.atan2(q[i], q[i + 2]); lo = Math.min(lo, a); hi = Math.max(hi, a); }
      return (hi - lo) * R; };
    const wrapped = span();
    check(band.wrap === "auto" && Math.abs(wrapped - 50) < 0.8 && $$("#panel button").some(b => /Wrap it round/.test(b.textContent)), "on a cylinder a picture wraps round it: 50 mm wide goes 50 mm round", `${wrapped.toFixed(2)} mm round`);
    $$("#panel button").find(b => /Project it straight on/.test(b.textContent)).click(); await settle();
    const flat = span();
    check(band.wrap === "flat" && flat > 54, "projected straight on instead, it comes out wider (the old way, still there to choose)", `${flat.toFixed(2)} mm round`);
    check(band.solids.every(q => !q || C.checkMesh(q).open === 0), "every part closed");
    band.wrap = "auto"; band.keepBg = false; band.solids = null; MF.rebuild(false); await settle();
  }

  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
