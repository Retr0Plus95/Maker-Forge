// Tracer extras (Session 11): the back plate (outline / circle / rectangle; raised, flush inlay, engraved;
// "the size is the whole plate"), the hollow cover, and the finished-size readout.
//   node tools-tracer-plate-test.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html");
const win = env.window, document = win.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
async function settle(){ const MF = win.MakerForge, r0 = MF.rev; for (let i=0;i<40 && MF.rev===r0 && !MF.busy;i++) await sleep(30); for (let i=0;i<400;i++){ if (!MF.busy){ await sleep(40); if (!MF.busy) return; } await sleep(25); } }
(async () => {
  await sleep(800);
  const MF = win.MakerForge, C = MF.core, st = MF.state;
  // a white ring logo with a letter inside, on a transparent 300 px picture
  const cv = document.createElement("canvas"); cv.width = 300; cv.height = 300; const x = cv.getContext("2d");
  x.strokeStyle = "#fff"; x.lineWidth = 8; x.beginPath(); x.arc(150,150,120,0,7); x.stroke();
  x.lineWidth = 7; x.beginPath(); x.moveTo(92,190); x.lineTo(118,100); x.lineTo(142,190); x.stroke();
  st.items = [{ id:1, name:"logo", src:cv, aspect:1, width:60, skip:[], smooth:1, mode:"flat", adjust:{bright:0,contrast:0,sat:0}, rot90:0, crop:false, enabled:true, place:{c:[0,0,0],n:[0,1,0]} }];
  st.active = 0; st.base.type = "tracer";
  const T = st.base.tracer;
  const run = async over => { Object.assign(T, { extra:"none", sizeOf:"part", plateShape:"outline", plateMargin:3, plateThick:2, plateMode:"raised", inlay:0.6, wall:1.6, cap:1.2, size:60, thick:5 }, over);
    MF.rebuild(false); await settle(); return MF.parts; };
  const closed = P => P.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const B = p => C.solidBounds(p.solid).size, vol = p => C.checkMesh(p.solid).volume, f2 = a => a.map(v => v.toFixed(2)).join(" × ");
  let P = await run({});
  const solidVol = vol(P[0]);
  check(P.length === 1 && Math.abs(B(P[0])[0] - 60) < 0.05, "just the shape: one part, 60 mm across, as before", f2(B(P[0])));
  check(MF.tracer.finished && Math.abs(MF.tracer.finished[0] - 60) < 0.05 && Math.abs(MF.tracer.finished[2] - 5) < 1e-6, "finished size readout", f2(MF.tracer.finished));
  P = await run({ extra:"plate" });
  const plate = P.find(p => p.name === "Back plate"), logo = P.find(p => p.name === "Traced part");
  check(P.length === 2 && closed(P), "raised plate: logo and plate, both closed", P.map(p => p.name).join(" + "));
  check(Math.abs(B(plate)[0] - 66) < 0.15 && Math.abs(B(plate)[1] - 2) < 1e-6, "plate follows the outline with a 3 mm margin, 2 mm thick", f2(B(plate)));
  check(Math.abs(C.solidBounds(logo.solid).mn[1] - 2) < 1e-6 && Math.abs(MF.tracer.finished[2] - 7) < 1e-6, "logo stands on the plate: 7 mm overall", f2(MF.tracer.finished));
  check(plate.slot === T.plateSlot && logo.slot !== plate.slot, "plate has its own colour", `${logo.slot} / ${plate.slot}`);
  P = await run({ extra:"plate", sizeOf:"whole" });
  check(Math.abs(MF.tracer.finished[0] - 60) < 0.15, "size = whole plate: the plate is the typed 60 mm", f2(MF.tracer.finished));
  P = await run({ extra:"plate", plateShape:"circle", sizeOf:"whole" });
  check(closed(P) && Math.abs(MF.tracer.finished[0] - 60) < 0.3 && Math.abs(MF.tracer.finished[1] - 60) < 0.3, "circle plate, whole size 60", f2(MF.tracer.finished));
  P = await run({ extra:"plate", plateShape:"rect", plateRadius:4 });
  check(closed(P) && Math.abs(MF.tracer.finished[0] - 66) < 0.3, "rectangle plate with a 3 mm margin", f2(MF.tracer.finished));
  const raisedPlate = vol(P.find(p => p.name === "Back plate"));
  P = await run({ extra:"plate", plateShape:"rect", plateRadius:4, plateMode:"flush" });
  check(P.length === 2 && closed(P) && Math.abs(MF.tracer.finished[2] - 2) < 1e-6, "flush inlay: two colours, one flat 2 mm face", f2(MF.tracer.finished));
  const fl = P.find(p => p.name === "Traced part"), fp = P.find(p => p.name === "Back plate");
  check(Math.abs((vol(fl) + vol(fp)) - raisedPlate) < raisedPlate * 0.01, "logo exactly fills its pocket", `${(vol(fl)+vol(fp)).toFixed(0)} vs ${raisedPlate.toFixed(0)} mm³`);
  P = await run({ extra:"plate", plateShape:"rect", plateRadius:4, plateMode:"engraved" });
  check(P.length === 1 && closed(P) && vol(P[0]) < raisedPlate - 10, "engraved: one plate with the logo cut in", `${vol(P[0]).toFixed(0)} mm³`);
  P = await run({ extra:"hollow" });
  check(P.length === 1 && closed(P) && Math.abs(vol(P[0]) - solidVol) < solidVol * 0.05, "strokes thinner than two walls stay solid", `${vol(P[0]).toFixed(0)} vs ${solidVol.toFixed(0)} mm³`);
  P = await run({ extra:"hollow", wall:0.4 });
  check(closed(P) && vol(P[0]) < solidVol * 0.9 && Math.abs(B(P[0])[1] - 5) < 1e-6, "0.4 mm walls hollow the ring out, same 5 mm depth", `${vol(P[0]).toFixed(0)} vs ${solidVol.toFixed(0)} mm³`);
  // a filled shape (a lid for a round thing): 50 mm disc, 10 mm deep, 1.6 mm walls, 1.2 mm top
  const disc = document.createElement("canvas"); disc.width = disc.height = 300; const dx = disc.getContext("2d");
  dx.fillStyle = "#fff"; dx.beginPath(); dx.arc(150,150,140,0,7); dx.fill();
  st.items = [Object.assign({}, st.items[0], { id:2, name:"disc", src:disc, solids:null })]; for (const k of ["_imgKey","_srcCv","_srcSig"]) delete st.items[0][k];
  P = await run({ size:50, thick:10 }); const discVol = vol(P[0]);
  P = await run({ size:50, thick:10, extra:"hollow" });
  const want = Math.PI*25*25*1.2 + Math.PI*(25*25 - 23.4*23.4)*8.8;
  check(closed(P) && Math.abs(vol(P[0]) - want) < want * 0.04, "disc cover: cap plus ring wall, as calculated", `${vol(P[0]).toFixed(0)} vs ${want.toFixed(0)} (solid ${discVol.toFixed(0)}) mm³`);
  P = await run({ extra:"hollow", wall:0.8, thick:12 });
  check(closed(P), "hollow cover with thin walls, 12 mm deep", `${vol(P[0]).toFixed(0)} mm³`);
  // the panel: step "＋" shows its controls and the finished size
  MF.setTab && MF.setTab("make"); await sleep(50);
  const txt = document.querySelector("#panel") ? document.querySelector("#panel").textContent : document.body.textContent;
  check(/Back plate or hollow cover/.test(document.body.innerHTML) && /Finished model/.test(document.body.innerHTML), "the panel has the new step and the finished size");
  const errs = env.errors.filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0,3).map(e => e.split("\n")[0]).join(" / "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed"); process.exit(fails ? 1 : 0);
})();
