// Box shapes (Session 66): round with a twist-on lid, oval, hexagonal, octagonal, a sloped top and a clamshell, made by the
// cutting tool (Manifold, from models/ as in tools-cut-test.js). Each part closed and on the bed; each lid set back on its box
// touches nothing; openings go through, square to their face; what a shape cannot have is left out with a word; the
// shape is kept by a saved project; a hostile project is cleaned; the box stays a rectangle with a word when the cutting
// tool cannot be had; a build that changed nothing is not cut again.
//   node tools-boxshape-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const envMod = require("./tools-test-env.js"), env = envMod(process.argv[2] || "index.html");
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
  const E = () => MF.state.base.enclosure, I = () => MF.enclosure, warnT = () => I().warn.map(w => w.t);
  const op = (face, kind, u, v, o) => Object.assign({ face, kind, u, v, rot:false, label:"", labelPos:"below", top:"flat", notch:false }, o || {});
  const fresh = async over => { MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }, over || {}); MF.rebuild(false); await settle(); };
  const part = name => MF.parts.find(p => p.name === name);
  const okPart = p => { const r = C.checkMesh(p.solid), b = C.solidBounds(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0 && Math.abs(b.mn[1]) < 1e-3; };

  console.log("the cutting tool cannot be had: the box stays a rectangle, with a word");
  {
    await fresh({ shape:"round", w:80, d:80, lid:"twist" });
    check(I().shape && I().shape.built === false && warnT().includes("The box is shown as a rectangle") && part("Box") && okPart(part("Box")),
      "a round box without the cutting tool is built as a rectangle and says why", warnT().join("; "));
  }
  MF.cut.hooks.module = await envMod.manifold();
  const M = MF.cut.hooks.module;
  // how much two solids overlap (a lid set back on its box), and how much of a probe a solid takes
  const overlap = (a, b) => { const r = C.csgRun(M, { out:{ x:{ intersect:[{ solid:a }, { solid:b }] } } }); return r.x ? r.x.volume : 0; };
  const back = (p, lift) => { const { M:R, T } = p.pose, P = p.solid.pos, q = new Float32Array(P.length);
    for (let i = 0; i < P.length; i += 3){ const x = P[i] - T[0], y = P[i + 1] - T[1], z = P[i + 2] - T[2];
      q[i] = R[0]*x + R[3]*y + R[6]*z; q[i + 1] = R[1]*x + R[4]*y + R[7]*z + (lift || 0); q[i + 2] = R[2]*x + R[5]*y + R[8]*z; }
    let idx = p.solid.idx; return { pos:q, idx }; };
  const probe = (x0, y0, z0, x1, y1, z1) => C.extrudePolysAt([{ outer:[[x0, -z1], [x1, -z1], [x1, -z0], [x0, -z0]], holes:[] }], y0, y1);
  const takes = (s, pr) => overlap(s, pr);

  console.log("\na round box with a twist-on lid");
  {
    await fresh({ shape:"round", w:80, d:80, h:40, lid:"twist", cut:[op("front", "usbc", 0, 8, { w:9.2, h:3.4, r:1.6, label:"5V", labelPos:"above" }), op("right", "round", 0, 12, { dia:10 }), op("top", "round", 0, 0, { dia:20 })] });
    const B = part("Box"), L = part("Lid"), T = MF.boxRoom.shape.twist(MF.boxRoom.shape.geo(E()), +E().fit);
    check(I().shape.built && I().shape.lid === "twist" && okPart(B) && okPart(L), "the box and its lid are built, closed and on the bed", MF.parts.map(p => p.name).join(", "));
    const bb = C.solidBounds(B.solid);
    check(Math.abs(bb.mx[0] - 40) < 0.05 && Math.abs(bb.mn[2] + 40) < 0.05 && Math.abs(bb.mx[1] - 40) < 0.01, "80 mm across, 40 mm tall", `${(bb.mx[0] - bb.mn[0]).toFixed(2)} × ${(bb.mx[2] - bb.mn[2]).toFixed(2)} × ${bb.mx[1].toFixed(2)}`);
    // the neck's thread: material out to the thread's crest, but never past it
    const crest = takes(B.solid, probe(T.rM - T.dp*0.5, T.Hn + 2, -0.5, T.rM - 0.05, T.Hn + 6, 0.5)), past = takes(B.solid, probe(T.rM + 0.05, T.Hn + 0.5, -2, T.rM + 3, 40.5, 2));
    check(crest > 0.3 && past < 1e-6, "the neck carries a thread, nothing outside it", `${crest.toFixed(2)} mm³ in the crest, ${past.toFixed(4)} outside`);
    const lidOn = back(L), hit = overlap(B.solid, lidOn), tight = overlap(B.solid, back(L, -0.6));
    check(hit < 0.05, "screwed on, the lid touches nothing of the box", `${hit.toFixed(3)} mm³`);
    check(tight > 1, "pushed 0.6 mm further down it would hit the box: it seats on the neck", `${tight.toFixed(1)} mm³`);
    const lb = C.solidBounds(lidOn);
    check(Math.abs(lb.mx[1] - 42.4) < 0.01 && lb.mn[1] > T.Hn, "the lid's top is 2.4 mm over the box, its skirt down to the shoulder", `${lb.mn[1].toFixed(2)} to ${lb.mx[1].toFixed(2)}`);
    check(takes(B.solid, probe(-1.5, 7.5, 38, 1.5, 8.5, 42)) < 1e-6 && takes(B.solid, probe(-1.5, 20, 38, 1.5, 22, 42)) > 1, "the USB-C opening goes right through the front, the wall beside it is whole");
    check(takes(B.solid, probe(38, 11, -2, 42, 13, 2)) < 1e-6, "the round opening goes through the right side, square to it");
    check(takes(lidOn, probe(-5, 39, -5, 5, 43, 5)) < 1e-6 && takes(lidOn, probe(15, 41, -2, 17, 42.2, 2)) > 1, "the lid's opening goes through it");
    const plain = C.signedVolume(B.solid);
    E().cut[0].label = ""; MF.rebuild(false); await settle();
    check(C.signedVolume(part("Box").solid) > plain + 0.5, "the label is engraved into the round wall", `${(C.signedVolume(part("Box").solid) - plain).toFixed(2)} mm³`);
    // an opening up by the neck is left out; an oval gets a press-fit lid
    E().cut.push(op("back", "round", 0, 32, { dia:8 })); MF.rebuild(false); await settle();
    check(I().left.includes(3) && warnT().some(w => /^Opening 4 .* left out$/.test(w)) && I().shape.built, "an opening reaching the neck is left out, with a word", I().warn.find(w => /Opening 4/.test(w.t)) && I().warn.find(w => /Opening 4/.test(w.t)).s);
    await fresh({ shape:"round", w:90, d:60, h:36, lid:"twist" });
    check(warnT().includes("A twist lid needs a round box") && I().shape.lid === "press" && okPart(part("Box")) && okPart(part("Lid")), "an oval box's twist lid becomes press-fit, with a word");
    check(overlap(part("Box").solid, back(part("Lid"))) < 0.05, "the oval's press-fit lid, put on, touches nothing");
  }

  console.log("\nhexagonal, octagonal and round boxes with screwed lids");
  for (const [shape, over] of [["hex", { w:104, d:90 }], ["oct", { w:90, d:90 }], ["round", { w:90, d:70 }]]) {
    await fresh(Object.assign({ shape, h:40, lid:"screw", fasten:"insert", head:"sink", lipH:3, cut:[op("front", "btn", 0, 14, { dia:12.2, label:"GO" }), op("top", "round", 0, 0, { dia:16 })] }, over));
    const B = part("Box"), L = part("Lid"), S = I().shape;
    check(S.built && S.posts === 4 && okPart(B) && okPart(L) && I().lidPosts.at.length === 4, `${shape}: built with four screw posts, closed, on the bed`, `${S.posts} posts`);
    check(overlap(B.solid, back(L)) < 0.05, `${shape}: the lid, put on, touches nothing (its lip clear of the posts and walls)`, overlap(B.solid, back(L)).toFixed(3));
    const zf = shape === "round" ? 35 : 45;
    check(takes(B.solid, probe(-2, 13, zf - 3, 2, 15, zf + 1)) < 1e-6, `${shape}: the button's opening goes through the front`);
    const [px, py] = I().lidPosts.at[0], ins = MF.boxRoom.screw ? 0 : 0;
    check(takes(B.solid, probe(px - 0.6, 10, -py - 0.6, px + 0.6, 39.9, -py + 0.6)) < 1e-6 && takes(B.solid, probe(px - 3, 10, -py + 2.3, px - 2.6, 30, -py + 2.6)) >= 0, `${shape}: each post has its screw hole`);
    check(!warnT().some(w => /left out/.test(w)), `${shape}: nothing left out`, warnT().join("; "));
  }

  console.log("\nopenings on a hexagon's pointed sides");
  {
    await fresh({ shape:"hex", w:104, d:90, h:40, lid:"press", cut:[op("left", "round", 0, 14, { dia:8 }), op("left", "round", 16, 14, { dia:8 }), op("right", "round", -16, 14, { dia:8 })] });
    const G = MF.boxRoom.shape.geo(E());
    check(G.faces.left.breaks.length === 1 && G.faces.front.breaks.length === 0, "the left side has a corner in its middle, the front none");
    check(I().left.includes(0) && !I().left.includes(1) && !I().left.includes(2) && /across a corner/.test(I().warn.find(w => /Opening 1/.test(w.t)).s),
      "an opening on the point is left out, saying why; ones on the faces either side are cut", I().left.join(","));
    check(okPart(part("Box")) && overlap(part("Box").solid, back(part("Lid"))) < 0.05, "the hexagon builds, its lid fits");
  }

  console.log("\na sloped top");
  {
    await fresh({ shape:"slope", w:140, d:90, h:52, frontH:24, lid:"screw", fasten:"insert", head:"sink", lidThick:3.2, lipH:3,
      cut:[op("back", "usbc", 0, 14, { w:9.2, h:3.4, r:1.6 }), op("top", "round", -30, 10, { dia:16, label:"VOL" }), op("top", "rect", 20, -15, { w:40, h:20, r:1 })] });
    const B = part("Box"), L = part("Lid"), S = I().shape, sl = MF.boxRoom.shape.slope(E(), MF.boxRoom.shape.geo(E()));
    check(S.built && okPart(B) && okPart(L) && Math.abs(S.front - 24) < 1e-6 && Math.abs(S.angle - Math.atan(28/90)*180/Math.PI) < 1e-6, "built, 24 mm at the front, 52 at the back", `${S.angle.toFixed(1)}°`);
    const front = takes(B.solid, probe(-60, 26.5, 38, 60, 40, 44.5)), backH = takes(B.solid, probe(-60, 50, -44.5, 60, 51.8, -40));
    check(front < 1e-6 && backH > 10, "the front stops at the slope, the back stands tall", `${front.toFixed(3)} / ${backH.toFixed(1)} mm³`);
    check(overlap(B.solid, back(L)) < 0.05, "the lid, put on, sits on the slope touching nothing", overlap(B.solid, back(L)).toFixed(3));
    const lb = C.solidBounds(L.solid);
    check(Math.abs(lb.mn[1]) < 1e-3 && lb.mx[1] < 3.2 + 3 + 0.05, "the lid prints flat, face down", `${lb.mx[1].toFixed(2)} mm tall`);
    // the knob's hole square to the lid: in the lid as it prints, a straight hole up through it
    const c = (u, v, d) => { const q = sl.q, p = [u, sl.y0 + v*sl.k/q + d/q, -v/q + d*sl.k/q], { M:R, T } = L.pose; return [R[0]*p[0] + R[1]*p[1] + R[2]*p[2] + T[0], R[3]*p[0] + R[4]*p[1] + R[5]*p[2] + T[1], R[6]*p[0] + R[7]*p[1] + R[8]*p[2] + T[2]]; };
    const h = c(-30, 10, 1.6), cyl = C.extrudePolysAt([{ outer:C.ringCircle(7.6, 48).map(([x, y]) => [x + h[0], y - h[2]]), holes:[] }], 0.05, 3.15);
    check(takes(L.solid, cyl) < 0.02, "the lid's round hole is square to the lid (a straight 15.2 mm pin goes through it as it prints)", takes(L.solid, cyl).toFixed(4));
    check(!warnT().some(w => /left out|runs into/.test(w)), "nothing left out or in the slope's way", warnT().join("; "));
    E().cut.push(op("front", "round", 0, 22, { dia:8 })); MF.rebuild(false); await settle();
    check(warnT().some(w => /^Opening 4 .* runs into the sloped top$/.test(w)), "an opening up into the slope is pointed out", warnT().join("; "));
    E().frontH = 2; MF.rebuild(false); await settle();
    check(I().shape.front >= 52 - 90*Math.tan(40*Math.PI/180) - 1e-6 && I().shape.front >= E().floor + 6 && I().shape.angle <= 40 + 1e-6, "a front too low for the slope is raised (40° at most)", `${I().shape.front.toFixed(1)} mm, ${I().shape.angle.toFixed(1)}°`);
  }

  console.log("\na clamshell");
  {
    await fresh({ shape:"clam", w:96, d:60, h:34, lid:"screw", fasten:"insert", radius:6, lipH:3, cut:[op("front", "btn", 14, 18, { dia:12.2 }), op("front", "usbc", -20, 8, { w:9.2, h:3.4, r:1.6 })] });
    const Lo = part("Lower half"), Up = part("Upper half"), S = I().shape, hs = S.split;
    check(S.built && okPart(Lo) && okPart(Up) && !part("Box") && !part("Lid"), "two halves, closed, each on the bed", MF.parts.map(p => p.name).join(", "));
    const lb = C.solidBounds(Lo.solid);
    check(Math.abs(hs - Math.round((34 + 2.4)/2)) < 1e-6 && Math.abs(lb.mx[1] - (hs + 3)) < 0.01, "the lower half ends at the split, its lip 3 mm over it", `${hs} mm, lip to ${lb.mx[1].toFixed(2)}`);
    check(overlap(Lo.solid, back(Up)) < 0.05, "the upper half, put on, touches nothing", overlap(Lo.solid, back(Up)).toFixed(3));
    check(overlap(Lo.solid, back(Up, -0.3)) > 1, "0.3 mm lower it would sit on the lower half: they meet at the split");
    const [px, py] = I().lidPosts.at[0];
    check(takes(Lo.solid, probe(px - 1, -0.5, -py - 1, px + 1, hs, -py + 1)) < 1e-6, "a screw goes up through the lower half's post, from under the floor");
    check(takes(back(Up), probe(px - 0.8, hs + 0.2, -py - 0.8, px + 0.8, hs + 5, -py + 0.8)) < 1e-6 && takes(back(Up), probe(px - 0.8, 33, -py - 0.8, px + 0.8, 36.4, -py + 0.8)) > 0.5,
      "into the upper half's post, which is closed at the top");
    check(takes(Lo.solid, probe(9, 17, 27, 19, 19, 31)) < 1e-6 && takes(back(Up), probe(9, 17, 27, 19, 19, 31)) < 1e-6, "the button's opening across the split is cut in both halves (and the lip)");
    check(I().need.some(([n, w]) => n === 4 && /screws, \d+ mm long, from under the floor/.test(w)), "the screws from below are on the shopping list", I().need.map(n => n.join(" ")).join("; "));
  }

  // (round holes in the walls with pointed tops, as on any box: a flat top over a hole is a bridge the check counts)
  console.log("\nevery shape prints without support (the app's print check)");
  {
    const support = async () => { MF.print = null; await MF.printNow(); for (let i = 0; i < 300 && !MF.print; i++) await sleep(30); return MF.print ? Math.round(MF.print.overhang.area*10)/10 : -1; };
    for (const [name, over] of [["round, twist lid", { shape:"round", w:80, d:80, h:40, lid:"twist", cut:[op("front", "usbc", 0, 8, { w:9.2, h:3.4, r:1.6, label:"5V", labelPos:"above" }), op("top", "round", 0, 0, { dia:20 })] }],
      ["hexagon, screwed lid", { shape:"hex", w:104, d:90, h:40, lid:"screw", fasten:"insert", head:"sink", teardrop:true, cut:[op("front", "btn", 0, 14, { dia:12.2 })] }],
      ["octagon, press-fit lid", { shape:"oct", w:90, d:90, h:36, lid:"press", lipH:3, teardrop:true, cut:[op("right", "round", 0, 14, { dia:6, label:"LED" })] }],
      ["sloped top", { shape:"slope", w:140, d:90, h:52, frontH:24, lid:"screw", fasten:"insert", head:"sink", lidThick:3.2, cut:[op("top", "round", -30, 10, { dia:16, label:"VOL" })] }],
      ["clamshell", { shape:"clam", w:96, d:60, h:34, lid:"screw", fasten:"insert", teardrop:true, cut:[op("front", "btn", 14, 18, { dia:12.2 })] }]]){
      await fresh(over);
      const sup = await support();
      check(I().shape.built && sup >= 0 && sup < 3, `${name}: no support needed`, `${sup} mm² of overhang`);
    }
  }

  console.log("\nwhat a shape cannot have yet");
  {
    await fresh({ shape:"round", w:90, d:90, levels:[{ h:20 }], texture:"grooves", lid:"magnet" });
    const w = I().warn.find(x => x.t === "Not on a round box yet");
    check(w && /levels/.test(w.s) && /texture/.test(w.s) && /magnet lid/.test(w.s) && I().shape.lid === "press" && I().shape.built, "levels, a texture and a magnet lid are listed as left out; it builds with a press-fit lid", w && w.s);
  }

  console.log("\nthe box's plan, the build cached, saving and a hostile project");
  {
    await fresh({ shape:"oct", w:90, d:80, h:36, cornerCut:12, lid:"press", cut:[op("right", "round", 0, 14, { dia:8 })] });
    const svg = document.querySelector("svg.boxplan") || (() => { const d = document.createElement("div"); MF.boxRoom.planSVG ? d.appendChild(MF.boxRoom.planSVG()) : 0; return d.querySelector("svg"); })();
    const G = MF.boxRoom.shape.geo(E());
    check(Math.abs(G.cut - 12) < 1e-9 && Math.abs(Math.max(...G.outer.map(q => q[0])) - 45) < 1e-6, "the octagon's corners are cut 12 mm", G.cut);
    let runs = 0; const orig = C.csgRun; C.csgRun = function(){ runs++; return orig.apply(this, arguments); };
    MF.rebuild(false); await settle(); const same = runs;
    E().h = 40; MF.rebuild(false); await settle();
    C.csgRun = orig;
    check(same === 0 && runs === 1, "a build that changed nothing is not cut again; a change is", `${same}, then ${runs}`);
    const st = JSON.parse(MF.projectPayload()).state;
    Object.assign(st.base.enclosure, { shape:"slope", frontH:30, splitAt:21, cornerCut:9 });
    const load = async state => { const f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state })], "p.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
      Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle(); };
    await load(st);
    check(E().shape === "slope" && E().frontH === 30 && E().splitAt === 21 && E().cornerCut === 9 && I().shape.kind === "slope" && I().shape.built, "the shape and its numbers come back from a saved project");
    Object.assign(st.base.enclosure, { shape:"<img src=x>", frontH:1e9, splitAt:-4, cornerCut:"x", lid:"twist" });
    await load(st);
    check(E().shape === "rect" && E().frontH === 300 && E().splitAt === 0 && E().cornerCut === 0 && E().lid === "twist" && !I().shape && okPart(part("Box")),
      "hostile shape settings: back to a rectangle, numbers clamped; a twist lid on a rectangle is built press-fit", JSON.stringify({ s:E().shape, f:E().frontH, a:E().splitAt, c:E().cornerCut }));
  }

  check(env.errors.length === e0, "no page errors", env.errors.slice(e0).join(" | "));
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
