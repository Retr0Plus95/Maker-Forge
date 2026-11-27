// Arrow nocks (Session 90): PRCore.nock in Node (every setting at its ends for each fit: each nock closed, outward, finite and on the
// bed, no support; the groove, the throat, the seat and the socket checked with rays; the fit test's five sizes; the weight; the
// warnings; cleaning), then the Arrow nocks object in the app (CORE=1 skips it): the panel, every slider and choice, the count, a
// saved and a hostile project.
// Usage: node tools-nock-test.js index.html     (CORE=1 for the library only)
const path = require("path");
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };

// how many faces of a solid a ray from o along d (unit) crosses before `far`
function meets(sol, o, d, far){ const P = sol.pos, I = sol.idx; let n = 0;
  for (let t = 0; t < I.length; t += 3){ const a = 3*I[t], b = 3*I[t + 1], c = 3*I[t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const pv = [d[1]*e2[2] - d[2]*e2[1], d[2]*e2[0] - d[0]*e2[2], d[0]*e2[1] - d[1]*e2[0]], det = e1[0]*pv[0] + e1[1]*pv[1] + e1[2]*pv[2]; if (Math.abs(det) < 1e-12) continue;
    const tv = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]], u = (tv[0]*pv[0] + tv[1]*pv[1] + tv[2]*pv[2])/det; if (u < 0 || u > 1) continue;
    const qv = [tv[1]*e1[2] - tv[2]*e1[1], tv[2]*e1[0] - tv[0]*e1[2], tv[0]*e1[1] - tv[1]*e1[0]], v = (d[0]*qv[0] + d[1]*qv[1] + d[2]*qv[2])/det; if (v < 0 || u + v > 1) continue;
    const tt = (e2[0]*qv[0] + e2[1]*qv[1] + e2[2]*qv[2])/det; if (tt > 0 && tt < far) n++; }
  return n; }
// a nock moved so its axis is on x = z = 0 (they are laid out in rows)
const centred = (C, p) => C.affineSolid(p.solid, [1, 0, 0, 0, 1, 0, 0, 0, 1], [-p.at[0], 0, -p.at[1]]);

function coreTests(C){
  const K = C.nock, S = K.settings;
  console.log("\nevery setting at its ends, for each fit");
  {
    const cases = [];
    for (const fit of S.fit.opts){
      cases.push({ fit });
      for (const [k, sp] of Object.entries(S)){
        if (k === "fit") continue;
        if (Array.isArray(sp)){ cases.push({ fit, ...(sp[5] || {}), [k]:sp[1] }, { fit, ...(sp[5] || {}), [k]:sp[2] }); }
        else for (const o of sp.opts) cases.push({ fit, [k]:o });
      }
      cases.push({ fit, shaftId:3, shaftOd:4, string:4, snap:0 }, { fit, shaftId:9, shaftOd:12, string:1.6, depth:8, head:5 });
    }
    const bad = [];
    let n = 0;
    for (const raw of cases){
      const L = K.make(raw);
      for (const p of L.printed){
        n++;
        const m = C.checkMesh(p.solid), b = C.solidBounds(p.solid), v = C.signedVolume(p.solid);
        if (m.open || !(v > 0) || Math.abs(b.mn[1]) > 1e-3 || [...p.solid.pos].some(x => !Number.isFinite(x))) bad.push(`${JSON.stringify(raw)} ${p.name}`);
      }
    }
    check(!bad.length, `${cases.length} sets, ${n} nocks: each closed, outward, finite and on the bed`, bad.slice(0, 3).join(" | "));
  }

  console.log("\nno support");
  {
    const bad = [];
    for (const raw of [{}, { fit:"taper", shaftOd:8.7 }, { fit:"over", shaftOd:8 }, { make:"test" }, { shaftId:4.2, shaftOd:5.6, string:2.2 }, { fit:"taper", shaftOd:12, shank:20 }, { snap:0.4, depth:8, string:4 }]){
      const p = K.make(raw).printed[0], a = C.analyzePrint([{ name:p.name, slot:0, pos:p.solid.pos, idx:p.solid.idx }], { overhang:45, bridge:20 });
      if (a.overhang.area > 2) bad.push(`${JSON.stringify(raw)} ${a.overhang.area.toFixed(1)} mm²`);
    }
    check(!bad.length, "seven nocks print standing on the shaft's end with no support (at most 2 mm² of steep faces)", bad.join(" | "));
  }

  console.log("\nthe groove, the throat, the seat and the shaft's end (rays)");
  {
    const bad = [];
    for (const raw of [{}, { fit:"taper", shaftOd:8.7 }, { fit:"over", shaftOd:8, string:3 }, { shaftId:4.2, shaftOd:5.6, string:2.2, snap:0.25 }, { depth:7, head:11, snap:0 }]){
      const L = K.make(raw), P = L.plan, s = L.settings, sol = centred(C, L.printed[0]), tag = JSON.stringify(raw);
      const top = s.shank + P.head, yS = top - s.depth + P.r, far = 4 * P.R, X = [1, 0, 0], at = (z, y) => [-2 * P.R, y, z];
      // the string's seat: open along the string at its middle and near its bottom; solid just under it
      if (meets(sol, at(0, yS), X, far)) bad.push(`${tag}: the seat is closed`);
      if (meets(sol, at(0, yS - P.r + 0.15), X, far)) bad.push(`${tag}: the seat's bottom is closed`);
      if (!meets(sol, at(0, yS - P.r - 0.15), X, far)) bad.push(`${tag}: open under the seat`);
      // the throat: open just inside its width, solid just outside it (the snap), above the seat
      const yT = (yS + P.r + top - 0.7) / 2;
      if (yT > yS + P.r){ for (const sg of [1, -1]){
        if (meets(sol, at(sg * (P.w / 2 - 0.06), yT), X, far)) bad.push(`${tag}: the throat is narrower than ${P.w.toFixed(2)}`);
        if (!meets(sol, at(sg * (P.w / 2 + 0.08), yT), X, far)) bad.push(`${tag}: the throat is wider than ${P.w.toFixed(2)}`); } }
      // the seat holds the string: wider than the throat
      if (meets(sol, at(P.ds / 2 - 0.1, yS), X, far)) bad.push(`${tag}: the seat is narrower than the string`);
      // the ears: solid across the string's line, either side
      if (!meets(sol, [0, yS, -2 * P.R], [0, 0, 1], 4 * P.R)) bad.push(`${tag}: the ears are open across the string`);
      // the shaft's end: a hollow shaft's shank is solid; a socket opens from the bed and is closed above its end
      const up = [0, 1, 0];
      if (P.insert){ if (!meets(sol, [0, -1, 0], up, 1.5)) bad.push(`${tag}: the shank's end is open`); }
      else {
        if (meets(sol, [0, -1, 0], up, 1 + s.shank)) bad.push(`${tag}: the socket is blocked`);
        if (!meets(sol, [0, -1, 0], up, 1 + s.shank + P.bot + 0.3)) bad.push(`${tag}: the socket's end is open`);
        if (meets(sol, [P.sock - 0.08, -1, 0], up, 1.5)) bad.push(`${tag}: the socket's mouth is smaller than the shaft`);
        if (!meets(sol, [P.sock + 0.15, -1, 0], up, 1.5)) bad.push(`${tag}: the socket's mouth is bigger than its wall`);
      }
    }
    check(!bad.length, "the seat open along the string and wider than the throat, the throat its width (the snap), the ears solid across it, the shank solid, a socket open to the shaft's size and closed at its end", bad.slice(0, 4).join(" | "));
  }

  console.log("\nthe fit test, the weight, the checks and the warnings");
  {
    const T = K.make({ make:"test" }), shank = p => { const sol = centred(C, p); let lo = 0, hi = 6; for (let i = 0; i < 30; i++){ const m = (lo + hi) / 2; meets(sol, [m, 2, -20], [0, 0, 1], 40) ? lo = m : hi = m; } return lo; };
    const r = T.printed.map(shank), steps = r.slice(1).map((v, k) => v - r[k]);
    check(T.printed.length === 5 && steps.every(d => Math.abs(d - 0.025) < 0.01) && T.printed.every((p, k) => p.name.startsWith(`Fit test ${k + 1}`)),
      "the fit test: five nocks, each shank 0.05 mm bigger across than the last, named 1 to 5", r.map(v => (2 * v).toFixed(3)).join(", "));
    const std = K.make({}).info, light = K.make({ shaftId:4.2, shaftOd:5.6 }).info;
    check(std.size.grains > 5 && std.size.grains < 25 && light.size.grains < std.size.grains, "the weight in grains (a standard nock about 11), a smaller one lighter", `${std.size.grains} / ${light.size.grains} grains`);
    check(std.ok && !std.warn.length && K.make({ fit:"taper", shaftOd:8.7 }).info.ok && !K.make({ fit:"taper", shaftOd:8.7 }).info.warn.length, "the standard nock and a taper nock pass their checks with no warnings");
    check(!K.make({ snap:0.4 }).info.ok && K.make({ snap:0.4 }).info.checks.find(q => q.key === "snap").ok === false, "a throat 0.4 mm narrower than the string fails its check");
    check(K.make({ shaftId:9, shaftOd:4 }).info.warn.some(w => /outside is made/.test(w)) && K.make({ depth:8, head:5 }).info.warn.some(w => /head is made/.test(w)),
      "a shaft's outside smaller than its inside, and a head too short for the groove, are made to fit and said");
    check(K.make({ count:13 }).printed.length === 13 && new Set(K.make({ count:13 }).printed.map(p => { const b = C.solidBounds(p.solid); return `${b.mn[0].toFixed(1)},${b.mn[2].toFixed(1)}`; })).size === 13,
      "13 nocks laid out in rows, none on another");
    check(K.make({ index:"none" }).printed[0].solid.idx.length < K.make({}).printed[0].solid.idx.length && /cock feather/.test(std.notes.join(" ")) && /dry-fire/.test(std.notes.join(" ")),
      "the cock-feather ridge, and the notes: line it up, check every nock before you shoot");
  }

  console.log("\ncleaning settings");
  {
    const c = K.clean({ fit:"<b>", shaftId:1e9, shaftOd:-5, tight:"x", string:NaN, snap:9, index:{}, make:"__proto__", count:2.6, extra:1 });
    check(c.fit === "insert" && c.shaftId === 9 && c.shaftOd === 4 && c.tight === 0 && c.string === 2.6 && c.snap === 0.4 && c.index === "ridge" && c.make === "nocks" && c.count === 3 && !("extra" in c),
      "anything odd is cleaned to the nearest allowed value or the default", JSON.stringify(c));
  }
}

async function appTests({ win, document, MF, C, settle, sleep }){
  const all = s => [...document.querySelectorAll(s)];
  const sel = document.querySelector("#objectSel"); sel.value = "nock"; sel.dispatchEvent(new win.Event("change")); await settle();
  all("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(30);
  const closed = () => MF.parts.length >= 1 && MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const sig = () => MF.parts.map(p => p.name + ":" + p.solid.idx.length + ":" + C.signedVolume(p.solid).toFixed(3) + ":" + C.memo.hash(p.solid.pos)).join("|");
  const slider = label => all("#panel input[type=range]").find(x => x.getAttribute("aria-label") === label);
  const pick = async (label, value) => { const s = all("#panel select").find(x => x.closest(".field") && x.closest(".field").textContent.includes(label)); if (!s) return false; s.value = value; s.dispatchEvent(new win.Event("change")); await settle(); await sleep(20); return true; };
  const hints = () => all("#panel .hint, #panel .sub").map(h => h.textContent).join("\n");
  const N = () => MF.state.base.nock;

  console.log("\nthe Arrow nocks object");
  {
    check(closed() && MF.parts.length === 6 && MF.nock && MF.nock.info.ok, "it builds six nocks, closed, every check passing", MF.parts.length);
    check(/grains/.test(hints()) && /7\.6 mm across/.test(hints()), "the panel says each one's size and weight in grains");
  }

  console.log("\nevery slider and choice");
  {
    const bad = [], dead = [];
    for (const [k, sp] of Object.entries(C.nock.settings).filter(([, sp]) => Array.isArray(sp))){
      const label = sp[4], keys = [];
      for (const t of ["min", "max"]){
        const r = slider(label); if (!r){ bad.push(`no slider "${label}"`); break; }
        r.value = r.getAttribute(t); r.dispatchEvent(new win.Event("input")); await settle();
        if (!closed()) bad.push(`${label} at ${t}`);
        keys.push(sig());
      }
      const r2 = slider(label); if (r2){ r2.value = String(sp[0]); r2.dispatchEvent(new win.Event("input")); await settle(); }
      if (keys.length === 2 && keys[0] === keys[1]) dead.push(label);
    }
    check(!bad.length, "every slider at both ends builds closed", bad.join(" | "));
    check(!dead.length, "no slider leaves the nocks unchanged at both ends", dead.join(", "));
    for (const [label, value, what] of [["How it fits", "taper", "a taper nock"], ["How it fits", "over", "a nock over the shaft"], ["Cock-feather mark", "none", "no ridge"], ["Print", "test", "the fit test"]]){
      const before = sig(), ok = await pick(label, value);
      check(ok && sig() !== before && closed(), `${what}: the nocks change and stay closed`);
    }
    check(!slider("Shaft's inside diameter (mm)") && !slider("How many") && MF.parts.length === 5, "over the shaft: no inside diameter; the fit test: five, and no count");
    N().set = C.nock.clean({}); MF.rebuild(false); await settle(); MF.renderTab && MF.renderTab();
  }

  console.log("\nsaved and opened again; a hostile project");
  {
    const inp = document.querySelector("#projInput");
    const open = async text => { const f = new win.File([text], "p.json", { type:"application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    Object.assign(N().set, { fit:"taper", shaftOd:8.7, string:2.4, count:12 }); MF.rebuild(false); await settle();
    const want = JSON.stringify(N()); await open(MF.projectPayload(true));
    check(JSON.stringify(N()) === want && MF.state.base.type === "nock" && closed() && MF.parts.length === 12, "the nocks and their settings come back from a saved project");
    const st = JSON.parse(MF.projectPayload()).state;
    st.base.nock = { set:{ fit:"<img src=x>", shaftId:1e9, count:1e9, string:-4 } };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    check(N().set.fit === "insert" && N().set.shaftId === 9 && N().set.count === 24 && N().set.string === 1.6 && closed() && MF.parts.length === 24,
      "a hostile project: markup, huge and negative numbers: cleaned, and it builds", JSON.stringify(N().set));
  }
}

(async () => {
  if (process.env.CORE || !process.argv[2]){
    global.earcut = require("earcut");
    require(path.resolve(__dirname, "src/core.js"));
    coreTests(global.PRCore);
  } else {
    const env = require(path.resolve(__dirname, "tools-test-env.js"))(process.argv[2]);
    const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(800);
    const MF = win.MakerForge, C = MF.core;
    coreTests(C);
    const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 3000; i++){ if (!MF.busy){ await sleep(40); if (!MF.busy) return; } await sleep(25); } };
    await appTests({ win, document, MF, C, settle, sleep });
    if (env.errors && env.errors.length) check(false, "no page errors", env.errors[0].split("\n")[0]);
  }
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
