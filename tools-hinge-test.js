// The hinged lid (Session 56): knuckles on the back wall and the lid on a 1.75 mm filament pin, their pin holes on one axis,
// no support; what stops it (a mount on the back, a narrow or shallow box, an opening there); a hostile project; the panel.
//
//   node tools-hinge-test.js index.html
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
  const solidAt = (p, x, y, z) => { const P = p.solid.pos, I = p.solid.idx; let n = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 2] < z0) z0 = P[i + 2]; if (P[i + 2] > z1) z1 = P[i + 2]; }
    const wx = (x0 + x1) / 2 + x + 0.0123, wz = (z0 + z1) / 2 - y + 0.0071;          // (off the triangles' shared edges)
    for (let t = 0; t < I.length; t += 3) { const a = 3 * I[t], b = 3 * I[t + 1], c = 3 * I[t + 2];
      const ax = P[a], az = P[a + 2], bx = P[b], bz = P[b + 2], cx = P[c], cz = P[c + 2], d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) continue;
      const l1 = ((bz - cz) * (wx - cx) + (cx - bx) * (wz - cz)) / d, l2 = ((cz - az) * (wx - cx) + (ax - cx) * (wz - cz)) / d, l3 = 1 - l1 - l2; if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      if (l1 * P[a + 1] + l2 * P[b + 1] + l3 * P[c + 1] > z) n++; }
    return n % 2 === 1; };
  const support = async over => { fresh(over); MF.rebuild(false); await settle(); MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? MF.print.overhang.area : -1; };
  const base = { w:120, d:80, h:40, lid:"press", cut:[] };
  console.log("the hinge");
  {
    fresh(base); const plain = MF.buildEnclosure();
    fresh(Object.assign({ hinge:true }, base)); const q = MF.buildEnclosure(), I = MF.enclosure, box = part(q, /^Box$/);
    const dB = vol(box) - vol(part(plain, /^Box$/)), dL = vol(part(q, /^Lid$/)) - vol(part(plain, /^Lid$/));
    // the box's middle knuckle: its pin hole on the axis, 3.8 mm behind the back and lidT - r above the top
    const lidT = +MF.state.base.enclosure.lidThick || 2.4, ax = 40 + 3.5 + 0.3, az = 40 + lidT - 3.5;
    check(I.hinge && I.hinge.knuckles === 5 && I.hinge.length === 106 && dB > 300 && dL > 200 && closed(q) && !I.warn.length,
      "five knuckles, three on the back wall and two on the lid, 106 mm of pin (the back less its rounded corners and 3 mm each end)", I.hinge && `box +${dB.toFixed(0)}, lid +${dL.toFixed(0)} mm³`);
    // solidAt measures from the Box's own middle, which the knuckles move back by half their depth
    const P = box.solid.pos; let z0 = Infinity, z1 = -Infinity; for (let i = 2; i < P.length; i += 3){ z0 = Math.min(z0, P[i]); z1 = Math.max(z1, P[i]); }
    const shift = -((z0 + z1)/2);          // plan y of the part's middle
    const at = (y, z) => solidAt(box, 0, y - shift, z);
    check(!at(ax, az) && at(ax, az + 2.6) && at(ax + 2.6, az) && !at(ax, az + 4.2), "the box's knuckle has its pin hole on the axis, solid round it", [at(ax, az), at(ax, az + 2.6), at(ax + 2.6, az), at(ax, az + 4.2)].join(","));
    check(MF.enclosure.need.some(([n, w]) => n === 1 && /1\.75 mm filament, 106 mm long, as the hinge pin/.test(w)) && /hinge at the back/.test(I.fastenText), "What you'll need lists the pin, and the lid's description says how it goes together");
    const s0 = await support(Object.assign({ hinge:true, snap:true, pull:true }, base));
    check(s0 === 0, "the knuckles print without support (a 45° slope under the box's, the lid's on the bed)", `${s0} mm²`);
  }
  console.log("\nwhat stops it");
  {
    const stops = o => { fresh(Object.assign({}, base, { hinge:true }, o)); MF.buildEnclosure(); return MF.enclosure.warn.some(w => /No hinge/.test(w.t)) && !MF.enclosure.hinge; };
    check(stops({ mount:"tabs" }) && stops({ w:40 }) && stops({ h:12 }), "hanging tabs on the back, a narrow box and a shallow one get no hinge, and say why");
    fresh(Object.assign({}, base, { hinge:true, cut:[{ face:"back", kind:"usbc", u:0, v:36, w:9.2, h:3.4, r:1.6, rot:false, label:"", labelPos:"below", top:"flat", notch:false }] })); MF.buildEnclosure();
    check(MF.enclosure.hinge && MF.enclosure.warn.some(w => /left out/.test(w.t) && /hinge/.test(w.s)), "an opening at the top of the back is left out where the hinge is");
    fresh(Object.assign({}, base, { hinge:true, lid:"screw" })); MF.buildEnclosure();
    check(!MF.enclosure.hinge, "a screwed lid has no hinge");
  }
  console.log("\na hostile project and the panel");
  {
    const E = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { lid:"press", hinge:"yes" });
    const st = JSON.parse(MF.projectPayload()).state; st.base.type = "enclosure"; st.base.enclosure = E;
    const inp = document.querySelector("#projInput"), f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:st })], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    check(MF.state.base.enclosure.hinge === false, "a hostile project: the hinge only when true");
    fresh(Object.assign({}, base)); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    check(/Hinged at the back/.test(document.querySelector("#panel").textContent), "the Lid page offers the hinge for a press-fit lid");
  }
  const errs = env.errors.slice(e0);
  check(!errs.length, "no page errors", errs.slice(0, 3).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
