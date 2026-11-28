// Arrow nocks (Sessions 90 and 91: the owner's own design, arrow_nock.scad): PRCore.nock in Node (every setting at its ends for each
// mount: each nock closed, outward, finite and on the bed; no support upright; the seat, the throat, the flats, the socket, the pin,
// the ribs, the grooves and the ridge checked with rays; engraved and raised labels; the fit test; the weight; the warnings; a 0.67
// project carried over; cleaning), then the Arrow nocks object in the app (CORE=1 skips it).
// Usage: node tools-nock-test.js index.html     (CORE=1 for the library only)
const path = require("path");
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };

// the faces a ray from o along d (unit) crosses before `far`, and the distance to the first
function hits(sol, o, d, far){ const P = sol.pos, I = sol.idx, out = [];
  for (let t = 0; t < I.length; t += 3){ const a = 3*I[t], b = 3*I[t + 1], c = 3*I[t + 2];
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const pv = [d[1]*e2[2] - d[2]*e2[1], d[2]*e2[0] - d[0]*e2[2], d[0]*e2[1] - d[1]*e2[0]], det = e1[0]*pv[0] + e1[1]*pv[1] + e1[2]*pv[2]; if (Math.abs(det) < 1e-12) continue;
    const tv = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]], u = (tv[0]*pv[0] + tv[1]*pv[1] + tv[2]*pv[2])/det; if (u < 0 || u > 1) continue;
    const qv = [tv[1]*e1[2] - tv[2]*e1[1], tv[2]*e1[0] - tv[0]*e1[2], tv[0]*e1[1] - tv[1]*e1[0]], v = (d[0]*qv[0] + d[1]*qv[1] + d[2]*qv[2])/det; if (v < 0 || u + v > 1) continue;
    const tt = (e2[0]*qv[0] + e2[1]*qv[1] + e2[2]*qv[2])/det; if (tt > 0 && tt < far) out.push(tt); }
  return out.sort((x, y) => x - y); }
const meets = (sol, o, d, far) => hits(sol, o, d, far).length;
const first = (sol, o, d, far) => { const h = hits(sol, o, d, far); return h.length ? h[0] : Infinity; };
// an upright nock moved so its axis is on x = z = 0
const centred = (C, p) => C.affineSolid(p.solid, [1, 0, 0, 0, 1, 0, 0, 0, 1], [-p.at[0], 0, -p.at[2]]);
// a setting's companions, so it is in use: "some" is 1, "words" is a label
function withWhen(S, k, base){ const sp = S[k], w = Array.isArray(sp) ? sp[5] : sp.when, o = { ...base };
  for (const [k2, v] of Object.entries(w || {})){ if (k2 in o && (Array.isArray(v) ? v.includes(o[k2]) : v === o[k2])) continue; o[k2] = v === "some" ? 1 : v === "words" ? "AB" : Array.isArray(v) ? v[0] : v; }
  return o; }

async function coreTests(C, manifold){
  const K = C.nock, S = K.settings;
  console.log("\nevery setting at its ends, for each mount and orientation");
  {
    const cases = [];
    for (const mount of S.mount.opts) for (const orientation of S.orientation.opts){
      const b = { mount, orientation }; cases.push(b);
      for (const [k, sp] of Object.entries(S)){
        if (k === "mount" || k === "orientation") continue;
        if (Array.isArray(sp)){ cases.push({ ...withWhen(S, k, b), [k]:sp[1] }, { ...withWhen(S, k, b), [k]:sp[2] }); }
        else if (sp.bool) cases.push({ ...withWhen(S, k, b), [k]:!sp.def });
        else if (sp.text) cases.push({ ...withWhen(S, k, b), [k]:"AB12" });
        else for (const o of sp.opts) cases.push({ ...withWhen(S, k, b), [k]:o });
      }
    }
    cases.push({ mount:"slip", ribs:8, ribH:0.4, grooves:4, label:"XYZ", number:true, quantity:3, labelStyle:"raised" }, { mount:"pushin", shaftOd:4, shaftId:3, tipD:4.5, throatW:1.8 },
      { mount:"tapered", preset:"9.53", socket:20, taper:15, length:22 }, { mount:"slip", preset:"5.0", wall:0.8, length:22, throatD:12 });
    const bad = [];
    let n = 0;
    for (const raw of cases){
      const L = K.make(raw);
      for (const p of L.printed){
        n++;
        for (const sol of [p.solid, ...p.cutters, ...p.raisedLetters]){
          const m = C.checkMesh(sol), v = C.signedVolume(sol);
          if (m.open || !(v > 0) || [...sol.pos].some(x => !Number.isFinite(x))){ bad.push(`${JSON.stringify(raw)} ${p.name}`); break; }
        }
        if (Math.abs(C.solidBounds(p.solid).mn[1]) > 1e-3) bad.push(`${JSON.stringify(raw)} ${p.name} off the bed`);
      }
    }
    check(!bad.length, `${cases.length} sets, ${n} nocks (and their letters): each closed, outward, finite and on the bed`, bad.slice(0, 3).join(" | "));
  }

  console.log("\nsupport");
  {
    const sup = raw => { const p = K.make(raw).printed[0]; return C.analyzePrint([{ name:p.name, slot:0, pos:p.solid.pos, idx:p.solid.idx }], { overhang:45, bridge:20 }).overhang.area; };
    const up = S.mount.opts.map(m => [m, sup({ mount:m, orientation:"upright", ribs:m !== "tapered" ? 4 : 0, grooves:m !== "tapered" ? 2 : 0 })]);
    check(up.every(([, a]) => a <= 2), "standing upright, every mount (with ribs and grooves) prints with no support", up.map(([m, a]) => `${m} ${a.toFixed(1)}`).join(", "));
    const tilt = S.mount.opts.map(m => [m, sup({ mount:m, orientation:"tilt45" })]);
    check(tilt.every(([m, a]) => m === "pushin" ? a <= 2 : a <= 60), "tilted 45° (the design's way): a push-in none; a socket only a little inside it", tilt.map(([m, a]) => `${m} ${a.toFixed(1)}`).join(", "));
  }

  console.log("\nthe throat, the flats, the socket and the pin (rays, standing upright)");
  {
    const bad = [];
    for (const raw of [{ orientation:"upright" }, { orientation:"upright", mount:"tapered", preset:"8.73" }, { orientation:"upright", mount:"pushin", shaftOd:7.6 },
      { orientation:"upright", throatW:2.2, snap:0.25, leadIn:0 }, { orientation:"upright", flats:false, throatD:10, length:34 }]){
      const L = K.make(raw), P = L.plan, s = L.settings, sol = centred(C, L.printed[0]), tag = JSON.stringify(raw), y0 = P.base, far = 4 * P.R;
      const yc = y0 + P.slotBottom + P.w / 2, Z = [0, 0, 1], X = [1, 0, 0], along = (x, y) => [x, y, -2 * P.R];
      // the string's seat: open along the string, round (as wide as the throat's width at its middle), solid just under it
      if (meets(sol, along(0, yc), Z, far)) bad.push(`${tag}: the seat is closed`);
      if (meets(sol, along(P.w / 2 - 0.08, yc), Z, far)) bad.push(`${tag}: the seat is narrower than ${P.w}`);
      if (!meets(sol, along(0, y0 + P.slotBottom - 0.12), Z, far)) bad.push(`${tag}: open under the seat`);
      // the throat above the seat: open just inside its width (the snap), solid just outside
      const yt = y0 + (P.slotBottom + P.w + P.L - 2 * s.leadIn - 0.4) / 2;
      if (meets(sol, along(P.ws / 2 - 0.06, yt), Z, far)) bad.push(`${tag}: the throat is narrower than ${P.ws}`);
      if (!meets(sol, along(P.ws / 2 + 0.1, yt), Z, far)) bad.push(`${tag}: the throat is wider than ${P.ws}`);
      // the ears: solid across the string
      if (!meets(sol, [-2 * P.R, yc, 0], X, far)) bad.push(`${tag}: the ears are open across the string`);
      // the flats: along the string, the side is met at the flat (not the round) up the taper
      const yf = y0 + (P.Ts + P.slotBottom) / 2, zf = (yf - y0), F = P.R + 0.2 - P.flatSlope * (zf - P.Ts), r = (() => { const t = (zf - P.Ts) / (P.L - P.Ts); return P.R - (P.R - P.rTip) * (0.35 * t * t + 0.65 * t); })();
      const met = 2 * P.R - first(sol, along(0, yf), Z, far);
      if (s.flats ? Math.abs(met - Math.min(F, r)) > 0.08 : Math.abs(met - r) > 0.08) bad.push(`${tag}: the side along the string at ${met.toFixed(2)}, not ${(s.flats ? Math.min(F, r) : r).toFixed(2)}`);
      // the socket: open from the bed to its depth at its size; its ceiling pointed and closed; the pin: solid
      const up = [0, 1, 0];
      if (P.push){ if (!meets(sol, [0, -1, 0], up, 1.5)) bad.push(`${tag}: the pin's end is open`);
        const pr = first(sol, [0, y0 / 2, 0], X, far); if (meets(sol, [-2 * P.R, y0 / 2, 0.01], X, 2 * P.R - P.pinD / 2 - 0.05)) bad.push(`${tag}: the pin is fatter than ${P.pinD}`); }
      else {
        if (meets(sol, [0, -1, 0], up, 1 + P.depth)) bad.push(`${tag}: the socket is blocked`);
        if (!meets(sol, [0, -1, 0], up, 1 + P.coneTop + 0.3)) bad.push(`${tag}: the socket's ceiling is open`);
        const rIn = first(sol, [0, 1.5, 0], X, far), want = P.socketD / 2 + (P.taper ? (P.ceilD - P.socketD) / 2 * 1.5 / P.depth : 0);
        if (Math.abs(rIn - want) > 0.06) bad.push(`${tag}: the socket's radius ${rIn.toFixed(3)}, not ${want.toFixed(3)}`);
      }
    }
    check(!bad.length, "the round seat, the throat its width (the snap), the ears, the flats along the string, the socket to the shaft's size with its ceiling, the pin", bad.slice(0, 4).join(" | "));
  }

  console.log("\nribs, grooves, the ridge and the label");
  {
    const bad = [];
    const L0 = K.make({ orientation:"upright" }), P = L0.plan, s0 = centred(C, L0.printed[0]), X = [1, 0, 0];
    // crush ribs: the socket narrower at a rib by its height; glue grooves: wider at a groove
    const R6 = K.make({ orientation:"upright", ribs:6, ribH:0.3, index:false }), s6 = centred(C, R6.printed[0]), phi = 30 * Math.PI / 180;
    const ribAt = first(s6, [0, P.depth / 2, 0], [Math.cos(phi), 0, -Math.sin(phi)], 10), gapAt = first(s6, [0, P.depth / 2, 0], X, 10);
    if (Math.abs(ribAt - (P.socketD / 2 - 0.3)) > 0.06 || Math.abs(gapAt - P.socketD / 2) > 0.06) bad.push(`ribs: ${ribAt.toFixed(3)} at a rib, ${gapAt.toFixed(3)} between`);
    const G1 = K.make({ orientation:"upright", grooves:1, index:false }), g1 = centred(C, G1.printed[0]);
    const inG = first(g1, [0, P.depth / 2, 0], X, 10); if (Math.abs(inG - (P.socketD / 2 + 0.3)) > 0.06) bad.push(`groove: ${inG.toFixed(3)}`);
    // the ridge: stands out at its angle (0: square to the string); none when it's off
    const yr = (2 + P.Ts - 1) / 2, out = (sol, o, d) => P.R + 2 - first(sol, o, d, 10), ridge = out(s0, [P.R + 2, yr, 0], [-1, 0, 0]);   // how far out the side is met
    const noR = centred(C, K.make({ orientation:"upright", index:false }).printed[0]), plain = out(noR, [P.R + 2, yr, 0], [-1, 0, 0]);
    if (!(ridge > P.R + 0.4 && Math.abs(plain - P.R) < 0.05)) bad.push(`ridge ${ridge.toFixed(2)} (plain ${plain.toFixed(2)})`);
    const a90 = centred(C, K.make({ orientation:"upright", indexAngle:90 }).printed[0]), at90 = out(a90, [0, yr, -P.R - 2], [0, 0, 1]);
    if (!(at90 > P.R + 0.4)) bad.push(`ridge at 90°: ${at90.toFixed(2)}`);
    // the label: raised letters stand out opposite the ridge; engraved ones are cutters (cut in below, with Manifold)
    const Lr = K.make({ orientation:"upright", label:"AB", labelStyle:"raised" }), Le = K.make({ orientation:"upright", label:"AB" });
    if (!(C.signedVolume(Lr.printed[0].solid) > C.signedVolume(L0.printed[0].solid) && !Lr.printed[0].cutters.length)) bad.push("raised letters add nothing");
    if (!(Le.printed[0].cutters.length >= 2 && Le.printed[0].raisedLetters.length === Le.printed[0].cutters.length)) bad.push(`engraved: ${Le.printed[0].cutters.length} cutters`);
    const lb = C.solidBounds(C.mergeSolids(Lr.printed[0].solid ? [centred(C, Lr.printed[0])] : [])); if (!(lb.mn[0] < -P.R - 0.3)) bad.push("the raised letters aren't opposite the ridge");
    check(!bad.length, "ribs narrow the socket by their height, a groove widens it, the ridge stands out at its angle, the label's letters raised or as cutters", bad.join(" | "));
    if (manifold){
      const p = Le.printed[0], prep = C.cutBase(manifold, p.solid), r = C.cutSolid(prep, p.cutters.map(solid => ({ solid, keep:false }))); C.cutFree(prep);
      const before = C.signedVolume(p.solid), after = C.signedVolume(r.solid), m = C.checkMesh(r.solid);
      check(after < before - 0.5 && !m.open, "engraved: Manifold cuts the letters in, and the nock stays closed", `${before.toFixed(1)} → ${after.toFixed(1)} mm³`);
    }
    const long = K.make({ label:"ABCDEFGHIJ" }).info;
    check(long.notes.some(n => /made \d+% of its size/.test(n)), "a label too long for the side is made smaller, and said");
    const num = K.make({ label:"A", number:true, quantity:3 });
    check(num.printed.map(p => p.text).join() === "A1,A2,A3", "numbered arrows: the text and 1, 2, 3", num.printed.map(p => p.text).join());
  }

  console.log("\nthe fit test, the weight, the checks, the warnings, the layout");
  {
    const T = K.make({ fitTest:true, orientation:"upright" }), X = [1, 0, 0];
    const r = T.printed.map(p => first(centred(C, p), [0, 1.5, 0], X, 10)), steps = r.slice(1).map((v, k) => r[k] - v);
    check(T.printed.length === 5 && steps.every(d => Math.abs(d - 0.025) < 0.006) && T.printed.map(p => p.text).join("") === "12345",
      "the fit test: five nocks, each socket 0.05 mm smaller across than the last, numbered 1 to 5", r.map(v => (2 * v).toFixed(3)).join(", "));
    const std = K.make({}).info, push = K.make({ mount:"pushin", shaftOd:7.6 }).info;
    check(std.size.grains > 10 && std.size.grains < 40 && push.size.grains < std.size.grains, "the weight in grains", `slip-over ${std.size.grains}, push-in ${push.size.grains}`);
    check(std.ok && !std.warn.length && K.make({ mount:"tapered", preset:"8.73" }).info.ok && push.ok, "the design's own defaults and a taper and a push-in pass their checks with no warnings");
    check(!K.make({ tipD:4.5, throatW:3.6 }).info.ok, "ears thinner than 1.2 mm fail their check");
    check(K.make({ mount:"tapered", socket:20, taper:15 }).info.warn.some(w => /taper would close/.test(w)) && K.make({ mount:"pushin", shaftOd:6, shaftId:6.5 }).info.warn.some(w => /pin is made/.test(w))
      && K.make({ throatD:12, socket:20, length:22 }).info.warn.some(w => /made [\d.]+ mm long/.test(w)), "a taper that closes, a pin as wide as the shaft and a nock too short for its socket are made to fit and said");
    const many = K.make({ quantity:13 });
    const boxes = many.printed.map(p => C.solidBounds(p.solid)), clash = boxes.some((a, i) => boxes.some((b, j) => j > i && [0, 2].every(k => a.mn[k] < b.mx[k] - 0.01 && b.mn[k] < a.mx[k] - 0.01)));
    check(many.printed.length === 13 && !clash, "13 nocks laid out, none on another");
    check(/cock vane/.test(std.notes.join(" ")) && /dry-fire/.test(std.notes.join(" ")) && /tilted 45/.test(std.notes.join(" ")) && /own design/.test(std.credit), "the notes (the ridge, check every nock, how it prints) and the credit to the owner's design");
  }

  console.log("\na project from 0.67, and cleaning");
  {
    const old = K.clean({ fit:"insert", shaftId:6.2, shaftOd:7.6, string:2.4, depth:6, head:12, count:6, index:"none", tight:0.05 });
    check(old.mount === "pushin" && old.shaftOd === 7.6 && old.throatW === 2.4 && old.throatD === 6 && old.headLen === 12 && old.quantity === 6 && old.index === false && old.interference === 0.05 && old.orientation === "upright",
      "0.67's settings carried over (push-in, the string, the depth, the head, how many, no ridge)", JSON.stringify(old));
    const c = K.clean({ mount:"<b>", shaftOd:1e9, preset:"__proto__", label:"<img src=x>", number:"yes", ribs:2.6, orientation:{}, quantity:-5, extra:1 });
    check(c.mount === "slip" && c.shaftOd === 12 && c.preset === "custom" && c.label === "IMG SRCX" && c.number === false && c.ribs === 3 && c.orientation === "tilt45" && c.quantity === 1 && !("extra" in c),
      "anything odd is cleaned: numbers into range, choices from their lists, markup out of the label (only what the letters can draw)", JSON.stringify(c));
  }
}

async function appTests({ win, document, MF, C, settle, sleep }){
  const all = s => [...document.querySelectorAll(s)];
  const sel = document.querySelector("#objectSel"); sel.value = "nock"; sel.dispatchEvent(new win.Event("change")); await settle();
  all("#tabs button").find(b => b.dataset.k === "make").click(); await sleep(30);
  const closed = () => MF.parts.length >= 1 && MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const N = () => MF.state.base.nock, text = () => document.querySelector("#panel").textContent;
  const set = async o => { Object.assign(N().set, o); MF.rebuild(false); await settle(); MF.renderTab && MF.renderTab(); await sleep(20); };
  const pages = () => all("#secrail button").map(b => b.textContent.trim() || b.getAttribute("aria-label"));

  console.log("\nthe Arrow nocks object");
  {
    check(closed() && MF.parts.length === 1 && MF.nock && MF.nock.info.ok, "it builds the design's default nock: one, closed, every check passing", MF.parts.length);
    check(/grains/.test(text()) && /own design/.test(text()), "the panel gives the size, the weight in grains and the credit");
    const rail = all("#secrail button .tip").map(t => t.textContent).join("|");
    check(["Mount", "Retention", "String throat", "Shape", "Cock vane index", "Label", "Print"].every(g => rail.includes(g)), "the design's own groups, each a page", rail);
  }

  console.log("\nsettings shown for their choices");
  {
    const has = label => all("#panel input[type=range]").some(x => x.getAttribute("aria-label") === label) || all("#panel .field").some(f => f.textContent.includes(label));
    const open = async name => { const b = all("#secrail button").find(x => (x.querySelector(".tip") || {}).textContent === name); if (b){ b.click(); await sleep(20); } };
    await open("Mount");
    check(has("Socket depth (mm)") && !has("Pin length (mm)") && !has("Taper's included angle (°)"), "slip-over: the socket's settings, no pin, no taper");
    await set({ mount:"tapered" }); await open("Mount");
    check(has("Taper's included angle (°)") && closed(), "tapered: the taper's angle");
    await set({ mount:"pushin", shaftOd:7.6 }); await open("Mount");
    check(has("Pin length (mm)") && !has("Socket depth (mm)") && closed(), "push-in: the pin, no socket");
    await open("Retention");
    check(!has("How far each rib stands out (mm)"), "no rib height until there are ribs");
    await set({ ribs:4 }); await open("Retention");
    check(has("How far each rib stands out (mm)") && closed(), "with ribs: their height");
    await set({ fitTest:true });
    check(MF.parts.length === 5 && closed(), "the fit test: five nocks");
    await set(C.nock.clean({}));
  }

  console.log("\nlabels: engraved with the cutting tool, raised without it");
  {
    const vol = () => C.signedVolume(MF.parts[0].solid), plain = vol();
    await set({ label:"AB", labelStyle:"raised" });
    const raised = vol();
    MF.cut.hooks.module = await require(path.resolve(__dirname, "tools-test-env.js")).manifold();
    await set({ labelStyle:"engraved" });
    const engraved = vol();
    check(raised > plain + 0.3 && engraved < plain - 0.3 && closed(), "raised letters add plastic; engraved ones are cut in (Manifold)", `${plain.toFixed(1)}, raised ${raised.toFixed(1)}, engraved ${engraved.toFixed(1)} mm³`);
    await set(C.nock.clean({}));
  }

  console.log("\nsaved and opened again; a hostile project; a project from 0.67");
  {
    const inp = document.querySelector("#projInput");
    const open = async t => { const f = new win.File([t], "p.json", { type:"application/json" }), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    Object.assign(N().set, { mount:"tapered", preset:"8.73", quantity:6, label:"RP", number:true }); MF.rebuild(false); await settle();
    const want = JSON.stringify(N()); await open(MF.projectPayload(true));
    check(JSON.stringify(N()) === want && MF.state.base.type === "nock" && closed() && MF.parts.length === 6, "the nocks and their settings come back from a saved project");
    const st = JSON.parse(MF.projectPayload()).state;
    st.base.nock = { set:{ mount:"<img src=x>", shaftOd:1e9, quantity:1e9, label:"<script>alert(1)</script>" } };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    check(N().set.mount === "slip" && N().set.shaftOd === 12 && N().set.quantity === 24 && /^[0-9A-Z+\-\/.: ]*$/.test(N().set.label) && N().set.label.length <= 10 && closed() && MF.parts.length === 24,
      "a hostile project: markup, huge numbers: cleaned, and it builds", JSON.stringify(N().set));
    st.base.nock = { set:{ fit:"taper", shaftOd:8.7, string:2.4, count:3 } };
    await open(JSON.stringify({ app:"Maker Forge", v:6, state:st }));
    check(N().set.mount === "tapered" && N().set.throatW === 2.4 && MF.parts.length === 3 && closed(), "a project saved by 0.67 opens with its nocks carried over", JSON.stringify(N().set));
  }
}

(async () => {
  const envMod = require(path.resolve(__dirname, "tools-test-env.js"));
  if (process.env.CORE || !process.argv[2]){
    global.earcut = require("earcut");
    require(path.resolve(__dirname, "src/core.js"));
    let M = null; try { M = await envMod.manifold(); } catch (e) { console.log("  (Manifold not loaded: the engraving test is skipped)"); }
    await coreTests(global.PRCore, M);
  } else {
    const env = envMod(process.argv[2]);
    const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(800);
    const MF = win.MakerForge, C = MF.core;
    let M = null; try { M = await envMod.manifold(); } catch (e) {}
    await coreTests(C, M);
    const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 3000; i++){ if (!MF.busy){ await sleep(40); if (!MF.busy) return; } await sleep(25); } };
    await appTests({ win, document, MF, C, settle, sleep });
    if (env.errors && env.errors.length) check(false, "no page errors", env.errors[0].split("\n")[0]);
  }
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
