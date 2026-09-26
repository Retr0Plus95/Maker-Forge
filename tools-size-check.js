// Size check (Session 11): the on-screen size vs the export parts, the Prusa/Orca 3MF, the Bambu 3MF and the STL.
//   node tools-size-check.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2] || "index.html"), win = env.window, document = win.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function settle(){ const MF=win.MakerForge, r0=MF.rev; for(let i=0;i<40&&MF.rev===r0&&!MF.busy;i++) await sleep(30); for(let i=0;i<400;i++){ if(!MF.busy){ await sleep(40); if(!MF.busy) return; } await sleep(25);} }
const bounds = pts => { const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9]; for(let i=0;i<pts.length;i+=3) for(let k=0;k<3;k++){ mn[k]=Math.min(mn[k],pts[i+k]); mx[k]=Math.max(mx[k],pts[i+k]); } return mx.map((v,k)=>(v-mn[k]).toFixed(2)).join(" x "); };
const xmlBounds = s => { const a=[]; s.replace(/<vertex x="([^"]+)" y="([^"]+)" z="([^"]+)"/g,(m,x,y,z)=>{a.push(+x,+y,+z);}); return bounds(a); };
(async()=>{
  await sleep(800); const MF=win.MakerForge, C=MF.core, st=MF.state;
  const cv=document.createElement("canvas"); cv.width=300; cv.height=300; const x=cv.getContext("2d");
  x.strokeStyle="#fff"; x.lineWidth=8; x.beginPath(); x.arc(150,150,120,0,7); x.stroke(); x.lineWidth=7; x.beginPath(); x.moveTo(92,190); x.lineTo(118,100); x.lineTo(142,190); x.stroke();
  const run = async (tag, setup) => {
    setup(); MF.rebuild(false); await settle(); MF.render && MF.render();
    const ex = MF.exportParts(), P = C.prepareParts(ex);
    const all = []; P.parts.forEach(p => { for (const v of p.pos) all.push(v); });
    const m3 = C.make3MF(P.parts, st.slots, "t")["3D/3dmodel.model"], bb = C.make3MF_BBL(P.parts, st.slots, "t")["3D/3dmodel.model"];
    const stl = new DataView(C.makeSTL(P.parts[0])), sp=[]; for(let t=0;t<stl.getUint32(80,true);t++) for(let k=0;k<9;k++) sp.push(stl.getFloat32(84+t*50+12+k*4,true));
    console.log(`${tag.padEnd(22)} readout ${document.querySelector("#stSize").textContent} | export ${bounds(all)} | 3mf ${xmlBounds(m3)} | bambu ${xmlBounds(bb)} | stl(part 1) ${bounds(sp)}`);
  };
  await run("tracer logo 60 mm", ()=>{ st.items=[{ id:1,name:"logo",src:cv,aspect:1,width:60,skip:[],smooth:1,mode:"flat",adjust:{bright:0,contrast:0,sat:0},rot90:0,crop:false,enabled:true,place:{c:[0,0,0],n:[0,1,0]} }]; st.active=0; st.base.type="tracer"; });
  const T = MF.tracer; console.log("   tracer dims", T.dims && T.dims.width.toFixed(2), "x", T.dims && T.dims.height.toFixed(2), "| SVG head:", C.outlineSVG ? String(C.outlineSVG(T.polys)).slice(0,230).replace(/\n/g," ") : "-");
  await run("flat shape 70x50", ()=>{ st.base.type="board"; });
  await run("name plate", ()=>{ st.base.type="nameplate"; });
  await run("lithophane 100", ()=>{ st.base.type="lithophane"; });
  process.exit(0);
})();
