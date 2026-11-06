// Art on project boxes (Session 53): words, an icon and the Art tab picture on every face, engraved, inlaid or raised; the
// lid and the floor read from outside; kept clear of openings and edges; Label every opening; a hostile project; the panel.
//
//   node tools-boxart-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length;
  const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
  const fresh = over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); };
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const part = (q, re) => q.find(p => re.test(p.name)), vol = p => C.signedVolume(p.solid);
  const support = async over => { fresh(over); MF.rebuild(false); await settle(); MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const defCut = () => JSON.parse(JSON.stringify(MF.defaults.enclosure.cut));
  const box0 = parts => part(parts, /^Box$/), bounds = s => { const P = s.pos; let y0 = Infinity, y1 = -Infinity; for (let i = 1; i < P.length; i += 3){ if (P[i] < y0) y0 = P[i]; if (P[i] > y1) y1 = P[i]; } return [y0, y1]; };
  try { await document.fonts.load('800 180px "Manrope"'); await document.fonts.load('400 180px "Bungee"'); } catch (e) {}
  const words = (face, finish, o) => Object.assign({ face, kind:"text", text:"HELLO", font:"Manrope", size:8, x:0, y:0, finish, slot:2, depth:0.6 }, o || {});

  console.log("words and icons on every face");
  {
    fresh({ w:120, d:80, h:45, lid:"screw" }); const plain = MF.buildEnclosure(), vBox = vol(box0(plain)), vLid = vol(part(plain, /^Lid$/));
    const rows = [];
    for (const face of ["front", "back", "left", "right", "top", "bottom"]) for (const finish of ["engrave", "inlay", "raised"]){
      fresh({ w:120, d:80, h:45, lid:"screw", art:[words(face, finish)] }); const q = MF.buildEnclosure(), I = MF.enclosure, art = q.filter(p => / art \(/.test(p.name));
      const host = face === "top" ? part(q, /^Lid$/) : box0(q), v0 = face === "top" ? vLid : vBox, dv = vol(host) - v0, fin = I.art[0] && I.art[0].finish;
      const wall = !["top", "bottom"].includes(face), want = wall ? finish : finish === "raised" ? "inlay" : finish;
      const ok = closed(q) && !I.warn.length && fin === want && (want === "engrave" ? dv < -5 && !art.length : want === "inlay" ? dv < -5 && art.length === 1 && Math.abs(vol(art[0]) + dv) < Math.abs(dv)*0.05 : art.length === 1 && Math.abs(dv) < 1);
      rows.push(`${face}/${finish}: ${ok ? "ok" : "BAD " + fin + " dv " + dv.toFixed(1) + " art " + art.map(p => vol(p).toFixed(1)).join(",") + " " + I.warn.map(w => w.t).join(";")}`);
    }
    const bad = rows.filter(r => /BAD/.test(r));
    check(!bad.length, "words on all six faces, engraved (a pocket), inlaid (the pocket filled flush in its own filament) or raised (walls; inlaid on the lid and floor)", bad.slice(0, 3).join(" | "));
    fresh({ w:120, d:80, h:45, lid:"screw", boxSlot:1, art:[words("front", "raised", { slot:1 })] }); let q = MF.buildEnclosure();
    check(!q.some(p => / art \(/.test(p.name)) && vol(box0(q)) > vBox + 5 && closed(q), "raised words in the box's own filament are part of the box", `+${(vol(box0(q)) - vBox).toFixed(1)} mm³`);
    // the lid prints face down: its art is at the bottom of the print; the floor's art too
    fresh({ w:120, d:80, h:45, lid:"screw", art:[words("top", "inlay"), words("bottom", "inlay", { text:"MADE BY" })] }); q = MF.buildEnclosure();
    const la = part(q, /^Lid art/), fa = part(q, /^Floor art/), lb = la && bounds(la.solid), fb = fa && bounds(fa.solid);
    check(lb && fb && Math.abs(lb[0]) < 0.01 && Math.abs(lb[1] - 0.6) < 0.01 && Math.abs(fb[0]) < 0.01 && Math.abs(fb[1] - 0.6) < 0.01, "art on the lid and the floor is in the first layers on the bed", lb && fb && `${lb.map(v => v.toFixed(2))} / ${fb.map(v => v.toFixed(2))}`);
    // reading from outside: the lid's art is mirrored on the print (it faces down), the front's is not
    fresh({ w:120, d:80, h:45, lid:"screw", art:[words("top", "inlay", { text:"L", x:-20 })] }); q = MF.buildEnclosure();
    const L1 = part(q, /^Lid art/).solid, P = L1.pos; let sx = 0, n = 0; for (let i = 0; i < P.length; i += 3){ sx += P[i]; n++; }
    const lid = part(q, /^Lid$/).solid, LP = lid.pos; let lx0 = Infinity, lx1 = -Infinity; for (let i = 0; i < LP.length; i += 3){ lx0 = Math.min(lx0, LP[i]); lx1 = Math.max(lx1, LP[i]); }
    check(sx/n < (lx0 + lx1)/2 - 10, "art 20 mm to the left on the lid is on the left seen from above (the lid turned over to print)", `${(sx/n - (lx0 + lx1)/2).toFixed(1)} mm`);
    // icons: every one makes a closed shape
    const icons = Object.keys(MF.icons.list), badI = [];
    for (const ic of icons){ fresh({ w:120, d:80, h:45, lid:"press", cut:[], art:[{ face:"front", kind:"icon", icon:ic, size:14, finish:"inlay", slot:2 }] }); const qq = MF.buildEnclosure();
      if (!closed(qq) || MF.enclosure.warn.length || !part(qq, /^Front art/)) badI.push(ic); }
    check(!badI.length, `all ${icons.length} icons inlaid on a wall, closed`, badI.join(", "));
  }

  console.log("\nplacing and fitting");
  {
    fresh({ w:120, d:80, h:45, lid:"screw", cut:defCut(), art:[words("front", "inlay", { y:-4, size:10 })] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /Art 1 left out/.test(w.t) && /overlaps opening/.test(w.s)), "words over an opening are left out, and say which opening");
    fresh({ w:120, d:80, h:45, lid:"screw", art:[words("front", "inlay", { size:30, text:"A LONG NAME HERE" })] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /Art 1 left out/.test(w.t) && /past the edge/.test(w.s)), "words too big for the face are left out, with their size");
    fresh({ w:120, d:80, h:45, lid:"screw", cut:[], art:[words("left", "inlay", { rot:90, text:"SIDE", size:6 })] }); const q = MF.buildEnclosure(), a = MF.enclosure.art[0];
    check(a && a.h > a.w && closed(q), "turned words stand up the wall", a && `${a.w.toFixed(1)} × ${a.h.toFixed(1)} mm`);
    fresh({ w:120, d:80, h:45, lid:"none", cut:[], art:[words("top", "inlay")] }); MF.buildEnclosure();
    check(MF.enclosure.warn.some(w => /no lid/.test(w.s)), "art on the lid of a box with no lid is left out, and says so");
    fresh({ w:120, d:80, h:45, lid:"slide", cut:[], art:[words("top", "inlay"), words("top", "engrave", { y:12, text:"SLIDE" })] }); const qs = MF.buildEnclosure();
    check(closed(qs) && part(qs, /^Lid art/) && !MF.enclosure.warn.length, "a sliding lid takes art too (printed face up: the art at its top)");
    const s1 = await support({ w:120, d:80, h:45, lid:"screw", art:[words("front", "raised"), words("right", "inlay"), words("back", "engrave"), words("top", "inlay"), words("bottom", "engrave")] });
    check(s1 === 0, "raised, inlaid and engraved art on every face needs no support", `${s1} mm²`);
  }

  console.log("\nthe Art tab picture, labels, a hostile project, the panel");
  {
    await MF.icons.add(MF.icons.clean({ badge:{ shape:"circle", slot:0, ring:false, ringSlot:1 }, gap:true, layers:[{ icon:"wifi", slot:2, size:1, x:0, y:0, rot:0 }], label:{ text:"", slot:1 } })); await settle();
    const sel2 = document.querySelector("#objectSel"); sel2.value = "enclosure"; sel2.dispatchEvent(new win.Event("change")); await settle();
    fresh({ w:120, d:80, h:45, lid:"screw", cut:[], art:[{ face:"front", kind:"picture", size:24, finish:"inlay" }, { face:"back", kind:"picture", size:24, finish:"engrave" }] }); let q = MF.buildEnclosure();
    const pic = q.filter(p => /^Front art/.test(p.name));
    check(pic.length >= 1 && closed(q) && !MF.enclosure.warn.length && MF.enclosure.art.length === 2, "the Art tab picture inlaid in its colours on the front, and engraved on the back", `${pic.map(p => p.name).join(", ")} ${MF.enclosure.warn.map(w => w.t).join("; ")}`);
    fresh({ w:120, d:80, h:45, lid:"screw", cut:defCut() }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    const lbl = [...document.querySelectorAll("#panel button")].find(b => /^Label every opening/.test(b.textContent)); lbl && lbl.click(); await settle();
    const labs = MF.state.base.enclosure.cut.map(c => c.label);
    check(lbl && labs.join(",") === "USB-C,PUSH,ON" && closed(MF.buildEnclosure()), "Label every opening names them (USB-C, PUSH, ON)", labs.join(","));
    const addW = [...document.querySelectorAll("#panel button")].find(b => b.textContent === "Add words"); addW && addW.click(); await settle();
    const addI = [...document.querySelectorAll("#panel button")].find(b => b.textContent === "Add an icon"); addI && addI.click(); await settle();
    const A = MF.state.base.enclosure.art;
    check(addW && addI && A.length === 2 && A[0].kind === "text" && A[1].kind === "icon" && /Art 2/.test(document.querySelector("#panel").textContent), "the panel adds words and an icon, each with its own settings", A.map(a => a.kind).join(","));
    // a hostile project
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { art:Array.from({ length:30 }, (_, i) => ({ face:i ? "<script>" : "front", kind:"x", text:"<img src=x onerror=alert(1)>" + "A".repeat(80), font:"Evil", icon:"__proto__", size:1e9, x:-1e9, y:"NaN", rot:45, finish:"melt", slot:99, depth:-5 })) });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const E2 = MF.state.base.enclosure.art, a0 = E2[0];
    check(E2.length === 10 && a0.face === "front" && a0.kind === "text" && !/[<>]/.test(a0.text) && a0.text.length <= 40 && a0.font === "Manrope" && a0.icon !== "__proto__" && a0.size === 200 && a0.x === -200 && a0.y === 0 && a0.rot === 0 && a0.finish === "engrave" && a0.depth === 0.2 && E2.every(a => a.slot < 8) && closed(MF.buildEnclosure()),
      "a hostile project: ten pieces at most, markup taken out of the words, every choice and number checked", JSON.stringify(a0).slice(0, 200));
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
