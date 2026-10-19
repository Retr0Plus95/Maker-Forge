// Cutting with Manifold (Session 32): artwork engraved or inlaid into an object, an imported model cut flat, and what
// happens when a model can't be cut (gaps in its surface) or the cutting tool can't be downloaded. The library runs in
// Node here, from its copy in models/, handed to the app through MakerForge.cut.hooks.module.
//   node tools-cut-test.js index.html          CORE=1 for the geometry library only
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const manifold = require("./tools-test-env.js").manifold;      // from models/, as the app downloads it
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---------- the geometry library alone ----------
function coreTests(C, M) {
  console.log("the library: cutting a box");
  const box = C.extrudePolys([{ outer: C.ringRect(40, 30, 3, 8), holes: [] }], 10), vol = C.checkMesh(box).volume;
  const pos0 = Float32Array.from(box.pos);
  const prep = C.cutBase(M, box);
  check(prep && near(prep.volume, vol, 1e-3), "a closed box is read in, with its volume", prep && prep.volume.toFixed(2));
  const a = C.extrudePolysAt([{ outer: C.ringRect(10, 10, 0, 1), holes: [] }], 8, 11);
  const b = C.affineSolid(a, [1, 0, 0, 0, 1, 0, 0, 0, 1], [12, 0, 0]);
  const r = C.cutSolid(prep, [{ solid: a, keep: true }, { solid: b, keep: false }]);
  const left = C.checkMesh(r.solid), piece = C.checkMesh(r.pieces[0]);
  check(left.open === 0 && piece.open === 0, "the cut box and the inlay piece are closed", `${left.open} and ${piece.open} open edges`);
  check(near(r.removed[0], 200, 1e-3) && near(r.removed[1], 200, 1e-3), "each cutter takes 10 × 10 × 2 mm out of the top", r.removed.map(v => v.toFixed(3)).join(", "));
  check(near(left.volume + piece.volume + r.removed[1], vol, 1e-3), "what is left, plus the inlay, plus the engraving, is the box", `${(left.volume + piece.volume + r.removed[1]).toFixed(3)} of ${vol.toFixed(3)} mm³`);
  check(r.pieces[1] === null, "an engraving brings no piece back");
  const pb = C.solidBounds(r.pieces[0]);
  check(near(pb.mx[1], 10, 1e-4) && near(pb.mn[1], 8, 1e-4), "the inlay is flush with the top and as deep as the cut", `${pb.mn[1].toFixed(3)} to ${pb.mx[1].toFixed(3)} mm`);
  check(box.pos.every((v, i) => v === pos0[i]), "the box itself is left as it was");
  check(r.solid.from.filter(f => f === -1).length > 0 && r.solid.from.filter(f => f === 0).length > 0 && r.solid.from.filter(f => f === 1).length > 0,
    "every triangle says where it came from", [-1, 0, 1].map(f => r.solid.from.filter(x => x === f).length).join(" / "));

  console.log("\nthe library: colours carried over");
  const n0 = box.idx.length / 3, cc = new Uint8Array(9 * n0), mids = [];
  for (let t = 0; t < n0; t++) {                      // the top red, the rest blue
    const ys = [0, 1, 2].map(k => box.pos[3 * box.idx[3 * t + k] + 1]), top = ys.every(y => y > 9.99);
    for (let k = 0; k < 3; k++) cc.set(top ? [220, 30, 30] : [30, 30, 220], 9 * t + 3 * k);
    mids.push(top);
  }
  const src = C.cutSources(r.solid), cols = C.cutCorners(r.solid, src, box, { cc });
  let wrong = 0, walls = 0;
  for (let t = 0; t < src.length; t++) {
    const ys = [0, 1, 2].map(k => r.solid.pos[3 * r.solid.idx[3 * t + k] + 1]);
    if (r.solid.from[t] === -1) { if (ys.every(y => y > 9.99) !== (cols.cc[9 * t] > 100)) wrong++; }
    else { walls++; if (cols.cc[9 * t] < 100) wrong++; }  // the engraving's walls and floor take the top's colour
  }
  check(src.every(s => s >= 0 && s < n0), "every triangle has a source triangle in the box");
  check(wrong === 0 && walls > 0, "the box keeps its colours, and the engraving takes the colour round it", `${wrong} wrong of ${src.length}, ${walls} in the cuts`);

  console.log("\nthe library: cut flat, faces the wrong way, gaps");
  const f = C.cutFlat(prep, 2), fb = C.solidBounds(f.solid);
  check(near(fb.mn[1], 2, 1e-4) && C.checkMesh(f.solid).open === 0 && near(f.volume, vol * 0.8, 0.5), "cut flat at 2 mm: closed, 80% of the box", `from ${fb.mn[1].toFixed(3)} mm, ${f.volume.toFixed(1)} mm³`);
  const capSrc = C.cutSources(f.solid);
  check(capSrc.every(s => s >= 0 && s < n0), "the new flat face takes its colour from the box");
  const inv = C.extrudePolysAt([{ outer: C.ringRect(10, 10, 0, 1), holes: [] }], 11, 8);
  const r2 = C.cutSolid(prep, [{ solid: inv, keep: false }]);
  check(near(r2.removed[0], 200, 1e-3), "a cutter that faces inward is turned the right way out", r2.removed[0].toFixed(3));
  const leaky = { pos: box.pos, idx: box.idx.slice(0, box.idx.length - 3) };
  check(C.cutBase(M, leaky) === null, "a solid with a gap is refused, not cut wrongly");
  // two overlapping pieces in one model (eyes set into a head) are joined first
  const two = C.mergeSolids([box, C.affineSolid(box, [1, 0, 0, 0, 1, 0, 0, 0, 1], [20, 0, 0])]), p2 = C.cutBase(M, two);
  check(p2 && p2.volume < 2 * vol - 1, "two pieces that overlap are joined into one before cutting", p2 && `${p2.volume.toFixed(0)} mm³, not ${(2 * vol).toFixed(0)}`);
  C.cutFree(p2); C.cutFree(prep);
}

// ---------- the app ----------
async function appTests(C, M) {
  const boot = require("./tools-test-env.js");
  const env = boot(process.argv[2] || "index.html");
  const win = env.window, document = win.document, $$ = s => [...document.querySelectorAll(s)];
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 600; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  const tabBtn = k => $$("#tabs button").find(b => b.dataset.k === k);
  const choose = async v => { const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); await settle(); };
  async function setFile(input, name, bytes, type) {
    const f = new win.File([bytes], name, { type });
    Object.defineProperty(input, "files", { value: [f], configurable: true });
    input.dispatchEvent(new win.Event("change"));
  }
  function stl(solids, drop) {
    const tris = []; solids.forEach(s => { for (let i = 0; i < s.idx.length; i += 3) tris.push([0, 1, 2].map(k => [s.pos[s.idx[i + k] * 3], -s.pos[s.idx[i + k] * 3 + 2], s.pos[s.idx[i + k] * 3 + 1]])); });
    if (drop) tris.splice(0, drop);
    const b = Buffer.alloc(84 + tris.length * 50); b.writeUInt32LE(tris.length, 80);
    tris.forEach((t, i) => { const o = 84 + i * 50; t.forEach((v, k) => v.forEach((c, j) => b.writeFloatLE(c, o + 12 + k * 12 + j * 4))); });
    return b;
  }
  async function addBadge(MF) {                    // a yellow disc in a blue ring, on white
    const W = 240, H = 180, px = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4, r = Math.hypot(x - 120, y - 90), col = r < 40 ? [240, 190, 30] : r < 75 ? [25, 90, 170] : [255, 255, 255];
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
    tabBtn("art").click(); await sleep(50);
    const ev = new win.Event("drop", { bubbles: true, cancelable: true });
    ev.dataTransfer = { files: [new win.File([boot.encodePNG(W, H, px)], "badge.png", { type: "image/png" })] };
    document.querySelector("#drop").dispatchEvent(ev);
    for (let i = 0; i < 100 && !MF.state.items.some(d => d.name === "badge" && d.src); i++) await sleep(30);
    await settle();
    return MF.state.items.find(d => d.name === "badge");
  }
  const rebuild = async MF => { MF.state.items.forEach(d => { d.solids = null; }); MF.rebuild(false); await settle(); };
  const sumVol = list => list.reduce((a, p) => a + C.checkMesh(p.solid).volume, 0);
  const warn = (MF, re) => MF.checks.list.find(r => re.test(r.t));
  const exportOk = MF => {
    const ex = MF.exportParts(); let open = 0, nan = 0, low = Infinity;
    ex.forEach(p => { open += C.checkMesh(p).open; for (let i = 0; i < p.pos.length; i++) { if (!isFinite(p.pos[i])) nan++; if (i % 3 === 1) low = Math.min(low, p.pos[i]); } });
    return { open, nan, low, n: ex.length };
  };

  await sleep(800);
  const MF = win.MakerForge;
  // set up the colours: 1 white (the box), 2 blue, 3 yellow, 4 black
  const slots = [["White", "#f2f2f2"], ["Blue", "#195aaa"], ["Yellow", "#f0be1e"], ["Black", "#111111"]];
  MF.state.slots.length = 0; slots.forEach(([name, hex]) => MF.state.slots.push({ name, hex, mat: "PLA" }));
  await choose("box"); MF.examples.drop();

  console.log("\nthe app: the cutting tool can't be downloaded");
  const d = await addBadge(MF);
  d.skip = [0]; d.width = 30; d.cut = "engrave"; d.depth = 1; await rebuild(MF);
  check(MF.cut.info().blocked === "load", "without the library, the cut is marked as not possible", MF.cut.info().blocked);
  check(!!warn(MF, /cutting tool could not be downloaded/), "Before you print says the cutting tool could not be downloaded", (warn(MF, /cutting tool/) || {}).s);
  check(MF.parts.some(p => p.decal), "the artwork is shown raised meanwhile");

  console.log("\nthe app: engraved into a box");
  MF.cut.hooks.module = M;
  const B = MF.state.base.box;
  d.cut = "raised"; await rebuild(MF);
  const v0 = C.checkMesh(MF.parts[0].solid).volume, tris0 = C.checkMesh(MF.parts[0].solid).tris;
  d.cut = "engrave"; await rebuild(MF);
  const base = MF.parts[0], ck = C.checkMesh(base.solid), area = Math.PI * (75 / 240 * 30) ** 2;
  check(MF.cut.info().blocked === "", "with the library the box can be cut");
  check(MF.parts.length === 1 && !MF.parts.some(p => p.decal), "an engraving adds no parts", MF.parts.map(p => p.name).join(", "));
  check(ck.open === 0 && ck.tris > tris0, "the engraved box is closed, with the engraving's triangles", `${ck.tris} triangles, ${ck.open} open edges`);
  check(near(v0 - ck.volume, area * 1, area * 0.06), "it takes about the badge's area × 1 mm out", `${(v0 - ck.volume).toFixed(0)} mm³, about ${area.toFixed(0)} expected`);
  const e1 = exportOk(MF);
  check(e1.open === 0 && e1.nan === 0 && near(e1.low, 0, 1e-4), "the print file is closed, has no NaN and sits on the bed", `${e1.n} parts, lowest ${e1.low.toFixed(4)} mm`);
  check(!warn(MF, /deeper than the model/), "no warning for a 1 mm engraving in a solid box");
  tabBtn("art").click(); await sleep(60);
  const panel = document.querySelector("#panel").textContent;
  check(/Engraved/.test(panel) && /Depth \(mm\)/.test(panel) && !/Thickness above surface/.test(panel) && !/Sink into surface/.test(panel),
    "the Art tab shows Depth, not the raised artwork's thickness and sink");

  console.log("\nthe app: inlaid flush");
  d.cut = "inlay"; await rebuild(MF);
  const pieces = MF.parts.filter(p => p.inlay), vb = C.checkMesh(MF.parts[0].solid).volume;
  check(pieces.length === 2 && pieces.every(p => C.checkMesh(p.solid).open === 0), "a closed piece for each of the badge's two colours", pieces.map(p => `${p.name} ${C.checkMesh(p.solid).tris}`).join(", "));
  check(near(vb + sumVol(pieces), v0, v0 * 1e-5), "the box and its inlays add up to the whole box", `${(vb + sumVol(pieces)).toFixed(2)} of ${v0.toFixed(2)} mm³`);
  const top = Math.max(...pieces.map(p => C.solidBounds(p.solid).mx[1]));
  check(near(top, B.h, 1e-3), "the inlays are flush with the top of the box", `${top.toFixed(4)} of ${B.h} mm`);
  check(new Set(pieces.map(p => p.slot)).size === 2 && pieces.every(p => p.slot === 1 || p.slot === 2), "each piece is in its own filament", pieces.map(p => p.slot).join(", "));
  // a colour that is the box's own is not cut out
  d.forceSlot = 0; await rebuild(MF);
  check(!MF.parts.some(p => p.inlay) && near(C.checkMesh(MF.parts[0].solid).volume, v0, 1e-3), "artwork inlaid in the box's own colour leaves the box whole");
  d.forceSlot = null;

  console.log("\nthe app: deeper than the model is thick");
  B.h = 3; d.cut = "engrave"; d.depth = 5; MF.rebuild(true); await settle();
  check(!!warn(MF, /deeper than the model is thick/), "a 5 mm engraving in a 3 mm box is reported", (warn(MF, /deeper/) || {}).t);
  d.depth = 1; MF.rebuild(true); await settle();
  check(!warn(MF, /deeper than the model is thick/), "at 1 mm it is not");
  B.h = 20; MF.rebuild(true); await settle();

  console.log("\nthe app: a model with a gap");
  const sphere = MF.core.revolveLoop(Array.from({ length: 41 }, (_, i) => { const a = -Math.PI / 2 + Math.PI * i / 40; return [Math.max(0, 15 * Math.cos(a)), 15 + 15 * Math.sin(a)]; }), 64);
  check(C.checkMesh(sphere).open === 0, "the test ball is closed");
  await setFile(document.querySelector("#stlInput"), "leaky.stl", stl([sphere], 2), "model/stl"); await settle(); await settle();
  const d2 = MF.state.items[MF.state.items.length - 1];
  check(MF.state.base.type === "stl", "the leaky ball is opened");
  d2.cut = "engrave"; d2.skip = [0]; d2.place = { c: [0, 30, 0], n: [0, 1, 0] }; await rebuild(MF);
  check(MF.cut.info().blocked === "open", "it can't be cut", MF.cut.info().blocked);
  check(!!warn(MF, /gaps in its surface/), "Before you print says it has gaps and how to repair it", (warn(MF, /gaps/) || {}).s);
  check(MF.parts.some(p => p.decal), "the artwork is shown raised instead");

  console.log("\nthe app: an imported model cut flat");
  await setFile(document.querySelector("#stlInput"), "ball.stl", stl([sphere]), "model/stl"); await settle(); await settle();
  MF.state.items.forEach(x => { x.enabled = false; });
  await rebuild(MF);
  const whole = C.checkMesh(MF.parts[0].solid).volume;
  MF.state.base.stl.flat = 10; MF.rebuild(true); await settle();
  const flat = MF.parts[0], fck = C.checkMesh(flat.solid), info = MF.cut.info();
  check(fck.open === 0 && fck.volume < whole && fck.volume > whole * 0.9, "the ball is cut flat: closed, a little smaller", `${fck.volume.toFixed(0)} of ${whole.toFixed(0)} mm³`);
  check(info.flat && near(info.drop, 3, 1e-3), "10% of its 30 mm height is cut off", info.drop);
  const e2 = exportOk(MF), contact = MF.exportParts().reduce((a, p) => a + C.bedContact(p, 0.05), 0);
  check(e2.open === 0 && e2.nan === 0 && near(e2.low, 0, 1e-4), "the print file is closed and sits on the bed", `lowest ${e2.low.toFixed(4)} mm`);
  check(contact > 200, "it stands on a flat face", `${contact.toFixed(0)} mm² on the bed`);
  const want = Math.PI * (15 ** 2 - 12 ** 2);
  check(near(contact, want, want * 0.08), "the face is the ball's slice at 3 mm", `${contact.toFixed(0)} mm², ${want.toFixed(0)} expected`);
  MF.state.base.stl.scale = 200;
  const e3 = exportOk(MF);
  check(near(e3.low, 0, 1e-4), "at 200% it still sits on the bed", e3.low.toFixed(4));
  MF.state.base.stl.scale = 100;
  // another object afterwards is not lowered, and has no message about the import
  await choose("box"); const e4 = exportOk(MF);
  check(near(e4.low, 0, 1e-4) && MF.cut.info().drop === 0 && !warn(MF, /gaps in its surface|cutting tool/), "a box opened after it sits on the bed", `lowest ${e4.low.toFixed(4)} mm`);
  document.querySelector("#objectSel").value = "stl"; document.querySelector("#objectSel").dispatchEvent(new win.Event("change")); await settle();
  check(MF.state.base.type === "stl" && near(MF.cut.info().drop, 3, 1e-3), "back on the ball, it is cut flat again", MF.cut.info().drop);
  tabBtn("make").click(); await sleep(60);
  check(/Cut off the bottom/.test(document.querySelector("#panel").textContent) && /Cuts off 3/.test(document.querySelector("#panel").textContent), "the Make tab has the setting and says how much it cuts off");

  console.log("\nthe app: a model's own colours go with the cut");
  // the same ball as an OBJ with colours at its corners: red above the middle, blue below
  const obj = [];
  for (let v = 0; v < sphere.pos.length; v += 3) {           // written Z up, as model files are
    const y = sphere.pos[v + 1]; obj.push(`v ${sphere.pos[v]} ${-sphere.pos[v + 2]} ${y} ${y > 15 ? "0.9 0.1 0.1" : "0.1 0.1 0.9"}`);
  }
  for (let t = 0; t < sphere.idx.length; t += 3) obj.push(`f ${sphere.idx[t] + 1} ${sphere.idx[t + 1] + 1} ${sphere.idx[t + 2] + 1}`);
  await setFile(document.querySelector("#stlInput"), "two-tone.obj", obj.join("\n"), "model/obj"); await settle(); await settle();
  check(!!MF.model.colour, "the OBJ opens with its own colours");
  MF.state.items.forEach(x => { x.enabled = false; });
  MF.state.base.stl.flat = 10; MF.rebuild(true); await settle();
  const colourWrong = (p, inPocket) => {
    const s0 = p.solid0 || p.solid, I = s0.idx, P = s0.pos, cc = p.importColour && p.importColour.cc; let wrong = 0, n = 0, pocket = 0;   // the cut, before the paint refines it
    if (!cc) return { wrong: -1, n: 0, pocket: 0 };
    for (let t = 0; t < I.length / 3; t++) {
      const y = (P[3 * I[3 * t] + 1] + P[3 * I[3 * t + 1] + 1] + P[3 * I[3 * t + 2] + 1]) / 3, red = cc[9 * t] > 150;
      if (inPocket && inPocket(t)) { pocket++; if (!red) wrong++; continue; }
      if (Math.abs(y - 15) < 1.5) continue;    // the triangles across the middle are part red, part blue
      n++; if (red !== (y > 15)) wrong++;
    }
    return { wrong, n, pocket };
  };
  const cf = colourWrong(MF.parts[0]);
  check(cf.wrong === 0 && cf.n > 1000, "cut flat, every triangle keeps its colour, and the new bottom is blue like the ball's bottom", `${cf.wrong} wrong of ${cf.n}`);
  const d4 = MF.state.items[MF.state.items.length - 1];
  d4.enabled = true; d4.cut = "engrave"; d4.depth = 1; d4.width = 12; d4.skip = [0]; d4.place = { c: [0, 30, 0], n: [0, 1, 0] }; d4.offU = d4.offV = 0;
  await rebuild(MF);
  const eng = MF.parts[0], ce = colourWrong(eng, t => { const I = (eng.solid0 || eng.solid).idx, P = (eng.solid0 || eng.solid).pos; return [0, 1, 2].every(k => P[3 * I[3 * t + k] + 1] < 29.95 && P[3 * I[3 * t + k] + 1] > 27.5 && Math.hypot(P[3 * I[3 * t + k]], P[3 * I[3 * t + k] + 2]) < 5); });
  check(ce.wrong === 0 && ce.pocket > 0, "engraved at the top, the engraving takes the red round it", `${ce.wrong} wrong, ${ce.pocket} triangles in the engraving`);
  check(MF.cut.info().blocked === "" && C.checkMesh(eng.solid).open === 0, "the flat-cut ball is engraved and stays closed");
  // and the paint the app made from the model's colours follows: red filament above the middle, blue below
  const op = (MF.state.paint.ops || []).find(o => o.k === "model");
  if (op) {
    const I = eng.solid.idx, P = eng.solid.pos, hexRed = s => { const h = (MF.state.slots[s] || MF.state.slots[eng.slot]).hex; return parseInt(h.slice(1, 3), 16) > parseInt(h.slice(5, 7), 16); };
    let bad = 0, n = 0;
    for (let t = 0; t < I.length / 3; t++) {
      const y = (P[3 * I[3 * t] + 1] + P[3 * I[3 * t + 1] + 1] + P[3 * I[3 * t + 2] + 1]) / 3; if (Math.abs(y - 15) < 1.5) continue;
      const s = eng.paint && eng.paint[t] !== 255 ? eng.paint[t] : eng.slot; n++; if (hexRed(s) !== (y > 15)) bad++;
    }
    check(bad === 0 && n > 0, "the model's colours, painted, follow the cut", `${bad} wrong of ${n}`);
  } else check(false, "the model opened painted in its own colours");
  MF.state.base.stl.flat = 0;

  console.log("\nthe app: saved and opened again, and a hostile project");
  const d3 = MF.state.items[MF.state.items.length - 1]; d3.enabled = true; d3.cut = "inlay"; d3.depth = 1.4; MF.state.base.stl.flat = 10;
  const saved = JSON.parse(MF.projectPayload()).state;
  check(saved.base.stl.flat === 10 && saved.items.some(x => x.cut === "inlay" && x.depth === 1.4) && !saved.items.some(x => "_cut" in x || "_cutInfo" in x),
    "a project keeps the cut, the depth and the flat cut, and none of the working values");
  const inp = document.querySelector("#projInput");
  const open = async text => {
    const f = new win.File([text], "p.json", { type: "application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value: [f], configurable: true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30);
    return settle();
  };
  const hostile = JSON.parse(MF.projectPayload());
  hostile.state.base.stl.flat = -40;
  hostile.state.items = [Object.assign({}, saved.items[0], { name: "a", cut: "<img src=x onerror=alert(1)>", depth: 1e9 }), Object.assign({}, saved.items[0], { name: "b", cut: "inlay", depth: -3 })];
  await open(JSON.stringify(hostile));
  const st = MF.state;
  check(st.base.stl.flat === 0, "a negative flat cut becomes none", st.base.stl.flat);
  check(st.items[0].cut === "raised" && st.items[0].depth === 5 && st.items[1].cut === "inlay" && st.items[1].depth === 0.2, "a strange cut becomes raised, depths are clamped to 0.2–5 mm",
    st.items.map(x => `${x.cut} ${x.depth}`).join(", "));
  check(!document.querySelector("#panel img[src='x']"), "no markup from the project reaches the page");
  hostile.state.base.stl.flat = 1e6; await open(JSON.stringify(hostile));
  check(MF.state.base.stl.flat === 60, "a huge flat cut stops at 60%", MF.state.base.stl.flat);
  win.close();
}

(async () => {
  global.earcut = require("earcut");
  require("./src/core.js");
  const C = globalThis.PRCore, M = await manifold();
  coreTests(C, M);
  if (!process.env.CORE) await appTests(C, M);
  console.log(fails ? `\n${fails} check(s) failed` : "\nall cutting checks passed");
  process.exit(fails ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
