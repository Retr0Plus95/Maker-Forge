// One solid per colour (Session 68, the engine's first step): C.joinSolid joins the overlapping pieces a part is built
// from with the cutting tool (Manifold, from models/ as in tools-cut-test.js), and the app does it for every colour in the
// background so the files and the weight use one clean solid.
// Core: two overlapping cubes and one apart (only the two are joined, the volume counts the overlap once, the third comes
// back untouched), cubes touching face to face (no face left between them), paint kept on every joined triangle, a group
// that is not closed left as it was, one shell handed back as it is.
// App: real objects joined (closed, no larger than before, and every test point inside the joined solid exactly where it
// was inside some piece), the weight from the joined solids, the check that says so, the files (README, 3mf objects),
// a result that arrives after a change dropped, and the files made as before, with a word, when the tool cannot be had.
//   node tools-join-test.js index.html        (CORE=1 for the core part only)
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const envMod = require("./tools-test-env.js"), env = envMod(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, M = await envMod.manifold();
  const cube = (x0, y0, z0, s) => C.extrudePolysAt([{ outer:[[x0, -(z0 + s)], [x0 + s, -(z0 + s)], [x0 + s, -z0], [x0, -z0]], holes:[] }], y0, y0 + s);
  const withPaint = (s, v) => Object.assign({}, s, { paint:new Uint8Array(s.idx.length/3).fill(v) });
  const centroids = s => { const out = []; for (let t = 0; t < s.idx.length; t += 3){ const c = [0, 0, 0];
    for (let k = 0; k < 3; k++) for (let a = 0; a < 3; a++) c[a] += s.pos[3*s.idx[t + k] + a]/3; out.push(c); } return out; };
  // how many times a ray from p along +x winds round the solid: > 0 inside, with overlapping pieces counted once each
  function winding(s, p){
    const P = s.pos, I = s.idx; let w = 0;
    for (let t = 0; t < I.length; t += 3){
      const a = 3*I[t], b = 3*I[t + 1], c = 3*I[t + 2];
      const e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      const det = e1y*e2z - e1z*e2y; if (Math.abs(det) < 1e-12) continue;
      const py = p[1] - P[a + 1], pz = p[2] - P[a + 2], u = (py*e2z - pz*e2y)/det, v = (e1y*pz - e1z*py)/det;
      if (u < 0 || v < 0 || u + v > 1) continue;
      const x = P[a] + u*(P[b] - P[a]) + v*(P[c] - P[a]); if (x <= p[0]) continue;
      w += det > 0 ? 1 : -1;      // the triangle's normal along x is det: facing along the ray, the ray leaves the solid there
    }
    return w;
  }

  console.log("the core: C.joinSolid");
  {
    const A = withPaint(cube(0, 0, 0, 10), 1), B = withPaint(cube(5, 0, 0, 10), 2), F = withPaint(cube(40, 0, 0, 10), 3);
    const all = C.mergeSolids([A, B, F]), r = C.joinSolid(M, all);
    check(r.shells === 3 && r.joined === 1 && r.open === 0, "three shells, the two that overlap joined, nothing left open", `${r.shells} shells, ${r.joined} joined, ${r.open} open`);
    check(Math.abs(r.volume - 2500) < 1e-3 && Math.abs(C.signedVolume(r) - 2500) < 1e-2, "the volume counts the overlap once: 1000 + 1000 - 500 + 1000", `${r.volume.toFixed(3)} mm³, the mesh ${C.signedVolume(r).toFixed(3)}`);
    const cm = C.checkMesh(r);
    check(cm.open === 0 && !cm.nan, "the joined solid is closed", `${cm.open} open edges`);
    const far = centroids(r).map((c, t) => [c, t]).filter(([c]) => c[0] > 30);
    check(far.length === 12 && far.every(([, t]) => r.paint[t] === 3), "the cube apart comes back as it was: its 12 triangles, its paint", `${far.length} triangles`);
    const onCube = (c, x0) => c[0] >= x0 - 1e-4 && c[0] <= x0 + 10 + 1e-4;
    const cs = centroids(r), bad = cs.filter((c, t) => c[0] < 30 && !(r.paint[t] === 1 ? onCube(c, 0) : r.paint[t] === 2 ? onCube(c, 5) : false));
    check(r.paint.length === r.idx.length/3 && bad.length === 0, "every joined triangle keeps the paint of the cube it came from", `${bad.length} wrong of ${cs.length}`);
    const inside = cs.filter(c => c[0] > 5 + 1e-3 && c[0] < 10 - 1e-3);
    check(inside.every(c => Math.abs(c[1]) < 1e-4 || Math.abs(c[1] - 10) < 1e-4 || Math.abs(c[2]) < 1e-4 || Math.abs(c[2] - 10) < 1e-4),
      "no face is left inside the plastic where the cubes overlap");
  }
  {
    const r = C.joinSolid(M, C.mergeSolids([cube(0, 0, 0, 10), cube(10, 0, 0, 10)]));
    const mid = centroids(r).filter(c => Math.abs(c[0] - 10) < 1e-4);
    check(r.joined === 1 && Math.abs(r.volume - 2000) < 1e-3 && mid.length === 0, "cubes touching face to face become one block, with no face between them", `${mid.length} faces at the join`);
  }
  {
    const A = cube(0, 0, 0, 10), torn = { pos:A.pos, idx:A.idx.slice(3) }, s = C.mergeSolids([torn, cube(5, 0, 0, 10)]), r = C.joinSolid(M, s);
    check(r.open === 1 && r.joined === 0 && r.idx.length === s.idx.length, "a group that is not closed is left as it was, and counted", `${r.open} open`);
  }
  {
    const A = withPaint(cube(0, 0, 0, 10), 7), r = C.joinSolid(M, A);
    check(r.pos === A.pos && r.idx === A.idx && r.paint === A.paint && r.shells === 1 && Math.abs(r.volume - 1000) < 1e-6, "one shell comes back as it is, without the library doing anything");
  }
  if (process.env.CORE){ console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0); }

  async function settle() {
    const r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  const pick = async (kind, v) => {
    if (kind === "object"){ const s = document.querySelector("#objectSel"); s.value = v; s.dispatchEvent(new win.Event("change")); }
    else [...document.querySelectorAll("#presetGallery button")].find(b => b.dataset.k === v).click();
    await settle();
  };
  // the join, waited for: the background pass, run now
  const joined = async () => { await MF.join.run(); for (let i = 0; i < 200 && !MF.join.fresh(); i++){ await sleep(25); await MF.join.run(); } return MF.join.fresh(); };

  console.log("\nwithout the cutting tool: nothing is joined in the background, and nothing is said");
  {
    await pick("object", "cutter");
    check(!MF.join.can() && !MF.join.fresh() && !MF.checks.list.some(c => /joined/.test(c.t)), "no helper thread and no library: the build is as before");
  }
  MF.cut.hooks.module = M;

  // where two shells' boxes meet: the boxes of those meetings
  function overlaps(sol){
    const I = sol.idx, P = sol.pos, nv = P.length/3, up = Int32Array.from({ length:nv }, (_, k) => k), f = v => { while (up[v] !== v) v = up[v] = up[up[v]]; return v; };
    for (let t = 0; t < I.length; t += 3){ up[f(I[t + 1])] = f(I[t]); up[f(I[t + 2])] = f(I[t]); }
    const box = new Map();
    for (let i = 0; i < I.length; i++){ const r = f(I[i]), v = 3*I[i]; let q = box.get(r); if (!q) box.set(r, q = { mn:[1e9, 1e9, 1e9], mx:[-1e9, -1e9, -1e9] });
      for (let a = 0; a < 3; a++){ q.mn[a] = Math.min(q.mn[a], P[v + a]); q.mx[a] = Math.max(q.mx[a], P[v + a]); } }
    const L = [...box.values()], out = [];
    for (let x = 0; x < L.length && out.length < 400; x++) for (let y = x + 1; y < L.length; y++){
      const mn = [0, 1, 2].map(a => Math.max(L[x].mn[a], L[y].mn[a])), mx = [0, 1, 2].map(a => Math.min(L[x].mx[a], L[y].mx[a]));
      if (mn.every((v, a) => v < mx[a])) out.push({ mn, mx });
    }
    return out;
  }
  console.log("\nreal objects, joined in the background");
  const seeded = (() => { let x = 12345; return () => (x = (x*16807) % 2147483647)/2147483647; })();
  for (const [kind, v, pts] of [["object", "cutter", 400], ["preset", "Project box", 300], ["preset", "Tea light", 250], ["preset", "Frame for a photo", 250], ["object", "nameplate", 250], ["preset", "Iron-on patch", 120]]){
    await pick(kind, v);
    const raw = MF.exportParts(), ok = await joined(), J = MF.join.info;
    check(ok && J.list.length === raw.length, `${v}: joined, one solid for each of its ${raw.length} colour${raw.length === 1 ? "" : "s"}`, J && J.joined + " pieces joined");
    if (!ok) continue;
    let closed = true, smaller = true, agree = 0, total = 0, layered = 0, twice = 0, inPts = 0, bed = 0;
    J.list.forEach((s, i) => {
      const cm = C.checkMesh(s), v0 = C.signedVolume(raw[i]), v1 = C.signedVolume(s);
      if (cm.open || cm.nan) closed = false;
      const b0 = C.solidBounds(raw[i]), b1 = C.solidBounds(s);
      bed = Math.max(bed, ...[0, 1, 2].map(a => Math.max(Math.abs(b0.mn[a] - b1.mn[a]), Math.abs(b0.mx[a] - b1.mx[a]))));
      if (v1 > v0 + Math.max(0.01, v0*1e-6) || Math.abs(v1 - J.vols[s.slot]) > Math.max(0.05, v1*1e-5) && J.slots.filter(k => k === s.slot).length === 1) smaller = false;
      // half the points anywhere in the part, half where two of its pieces' boxes meet (where joining does its work)
      const b = C.solidBounds(raw[i]), n = Math.round(pts/raw.length), meet = overlaps(raw[i]);
      for (let k = 0; k < n; k++){
        const q = k % 2 && meet.length ? meet[k % meet.length] : { mn:b.mn, mx:b.mx };
        const p = [0, 1, 2].map(a => q.mn[a] + (q.mx[a] - q.mn[a])*(0.02 + 0.96*seeded()) + 1e-5*Math.SQRT2*(a + 1));
        const w0 = winding(raw[i], p), w1 = winding(s, p);
        total++; if ((w0 > 0) === (w1 > 0)) agree++; if (w1 > 1 || w1 < 0) layered++; if (w0 > 1) twice++; if (w1 > 0) inPts++;
      }
    });
    check(closed, `${v}: every joined solid is closed, with no NaN`);
    check(bed < 1e-4, `${v}: each joined solid sits where its pieces did: on the bed, the same size`, `${bed.toExponential(1)} mm at most`);
    check(smaller, `${v}: no joined solid is bigger than its pieces, and the weight's volume is the joined one`);
    check(agree === total && layered === 0 && inPts > 0, `${v}: inside the joined solid exactly where some piece was, and only once`,
      `${agree}/${total} points agree, ${inPts} inside, ${twice} of them in two pieces before, ${layered} still in two after`);
  }

  console.log("\nthe weight and the check");
  {
    await pick("object", "cutter");
    const raw = MF.exportParts().reduce((a, p) => a + C.signedVolume(p), 0);
    await joined();
    const J = MF.join.info, exact = J.vols.reduce((a, v) => a + v, 0), cm3 = MF.checks.totals.cm3;
    check(Math.abs(cm3*1000 - exact) < 0.5 && exact < raw*0.97, "the cookie cutter's weight is from the joined solid: about 6% less than its pieces added up",
      `${(raw/1000).toFixed(2)} → ${cm3.toFixed(2)} cm³`);
    check(MF.checks.list.some(c => c.k === "ok" && c.t === "Overlapping pieces joined"), "the checks say the pieces are joined", (MF.checks.list.find(c => /joined/.test(c.t)) || {}).s);
  }

  console.log("\nthe print check on the joined solids (Session 86, the engine's E1)");
  {
    // the check as it stands, waited for: printNow runs it on whatever is fresh
    const printed = async want => { let r = null; for (let i = 0; i < 300; i++){ r = MF.print; if (r && want(r)) return r; await sleep(25); if (!MF.busy && i % 20 === 0) await MF.printNow(); } return r; };
    const P = MF.state.printer, mm1 = v => v < 10 ? v.toFixed(1) : v.toFixed(0);
    // an imported model of a 10 mm cube left inside a 30 mm one (two shells, one part): joined, the inner one goes. (The check
    // already counts a point inside any piece as held up, so both read 0 mm²: what shows it ran on the joined solid is its count
    // of triangles.)
    const toSTL = sol => { const I = sol.idx, Pp = sol.pos, n = I.length/3, buf = Buffer.alloc(84 + n*50); buf.writeUInt32LE(n, 80);
      for (let t = 0; t < n; t++) for (let j = 0; j < 3; j++){ const v = I[t*3 + j], o = 84 + t*50 + 12 + j*12; buf.writeFloatLE(Pp[v*3], o); buf.writeFloatLE(-Pp[v*3 + 2], o + 4); buf.writeFloatLE(Pp[v*3 + 1], o + 8); }
      return buf; };
    await MF.paint.importModel(new win.File([toSTL(C.mergeSolids([cube(0, 0, 0, 30), cube(10, 8, 10, 10)]))], "cube-in-a-cube.stl", { type:"model/stl" })); await settle();
    const onPieces = C.analyzePrint(MF.printParts(), { nozzle:P.nozzle || 0.4, layer:P.layer || 0.2, angle:P.overhang || 45, bridge:P.bridge ?? 10 });
    await joined(); await MF.printNow(); const onJoined = await printed(r => r.joined);
    const joinedTris = MF.join.info && MF.join.info.list ? MF.join.info.list.reduce((t, q) => t + q.idx.length/3, 0) : -1;
    check(onJoined && onJoined.joined && onJoined.tris === joinedTris && onPieces.tris === 24 && joinedTris === 12 && onJoined.overhang.area <= onPieces.overhang.area + 0.01,
      "once joined, the check runs on the joined solid (the cube inside is gone), no worse than on the pieces",
      `${onPieces.tris} → ${onJoined && onJoined.tris} triangles, ${onPieces.overhang.area.toFixed(1)} → ${onJoined && onJoined.overhang.area.toFixed(1)} mm²`);
    if (onJoined){
      const sum = onJoined.overhang.perPart.reduce((a, v) => a + v, 0);
      check(onJoined.parts.join() === onPieces.parts.join() && Math.abs(sum - onJoined.overhang.area) < 0.01 && onJoined.overhang.perPart.every(v => v >= 0),
        "the findings are still told by piece: the same names, the support shared out among them", onJoined.parts.join(", ") + ": " + onJoined.overhang.perPart.map(v => v.toFixed(1)).join(", "));
      check(MF.checks.list.some(c => c.t === "No overhangs need support"), "the checks list goes by the joined result", (MF.checks.list.find(c => /support|overhang/i.test(c.t)) || {}).t);
    }
    // a brim is part of the joined solid, so with one the check stays on the pieces
    MF.state.model.brim = 4; MF.rebuild(false); await settle(); await joined(); await MF.printNow();
    const withBrim = await printed(() => true);
    check(withBrim && !withBrim.joined && Math.abs(withBrim.contact.area - onPieces.contact.area) < 1, "with a brim the check stays on the pieces, and the brim isn't counted as bed", withBrim && withBrim.contact.area.toFixed(0) + " mm²");
    MF.state.model.brim = 0;
    // after a change, with nothing asked for: the build starts the check, the background pass joins, and the check runs again on that
    MF.state.model.scale = 110; MF.rebuild(false);
    const seen = []; let last = "";
    for (let i = 0; i < 600; i++){ const r = MF.print, k = r ? (r.joined ? "joined" : "pieces") : "waiting"; if (k !== last) seen.push(last = k); if (k === "joined") break; await sleep(20); }
    check(last === "joined", "after a change, the check on the joined solids comes by itself", seen.join(" → "));
    MF.state.model.scale = 100; MF.rebuild(false); await settle();
  }

  console.log("\na result that arrives after a change is dropped");
  {
    MF.state.model.brim = 0; MF.rebuild(false); await settle();
    const run = MF.join.run(); MF.state.model.brim = 3; await run;
    check(!MF.join.fresh() && (!MF.join.info || MF.join.info.key !== MF.join.key()), "the join for the model before the change is not used for the one after");
    MF.state.model.brim = 0; MF.rebuild(false); await settle();
  }

  // the page's JSZip never finishes in jsdom: the same version from node_modules makes the files, given bytes from the page's own realm
  const NodeZip = require("jszip");
  class PageZip extends NodeZip {
    file(name, data, o){
      const tag = data == null ? "" : Object.prototype.toString.call(data);
      if (/Uint8Array|Float32Array|ArrayBuffer/.test(tag) && !(data instanceof Uint8Array)) data = tag === "[object ArrayBuffer]" ? Buffer.from(new Uint8Array(data)) : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      return arguments.length < 2 ? super.file(name) : super.file(name, data, o);
    }
  }
  win.JSZip = PageZip;
  console.log("\nthe files");
  {
    await pick("preset", "Project box");
    await joined();
    const J = await MF.join.exportParts(), zip = await MF.join.zip(J.list, "test box", J.why);
    const readme = await zip.file("README.txt").async("string");
    check(J.list === MF.join.info.list, "the export takes the background pass's solids when they are up to date");
    check(/Each colour is one solid/.test(readme), "the README says each colour is one solid");
    const JSZip = require("jszip"), mf = await JSZip.loadAsync(await zip.file("model-prusa-orca.3mf").async("uint8array"));
    const model = await mf.file("3D/3dmodel.model").async("string"), tris = (model.match(/<triangle /g) || []).length, want = J.list.reduce((a, p) => a + p.idx.length/3, 0);
    check(tris === want, "the 3mf holds the joined solids, triangle for triangle", `${tris} triangles, ${want} joined`);
  }

  console.log("\nthe cutting tool cannot be had: the files are made as before, and say why");
  {
    MF.cut.hooks.module = null; MF.cut.state.M = null; MF.cut.state.loading = null;
    const off = Promise.reject(new Error("offline (test)")); off.catch(() => {}); MF.cut.state.bytes = off;
    MF.state.base.enclosure.h += 2; MF.rebuild(false); await settle();
    const raw = MF.exportParts(), J = await MF.join.exportParts(), zip = await MF.join.zip(J.list, "test box", J.why);
    const readme = await zip.file("README.txt").async("string");
    check(J.why && J.list.length === raw.length && J.list.every((p, i) => p.idx.length === raw[i].idx.length), "the export goes ahead with the pieces as they are", J.why);
    check(/not joined in these files/.test(readme), "the README says the pieces are not joined, and why");
  }

  check(env.errors.filter(e => !/offline \(test\)/.test(e)).length === 0, "no page errors", env.errors.join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
