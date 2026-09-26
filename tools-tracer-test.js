// Measurement mode: a 60 x 30 mm bracket (corner radius 3, holes 8 and 5 mm) photographed from
// straight above on a plain background, square to the frame and turned by a few degrees. The user
// types the one real measurement (60 mm wide); holes and height must follow from it.
//   node tools-tracer-test.js index.html            TRACER='{"smooth":0}' node tools-tracer-test.js index.html
const boot = require("./tools-test-env.js");
const env = boot(process.argv[2]);
const win = env.window, document = win.document;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function settle(){ const MF=win.MakerForge, s0=MF.rev;
  for(let i=0;i<400;i++){ await sleep(40); if(MF.rev>s0 && !MF.busy){ await sleep(40); if(!MF.busy) return; } } }
function photo(deg, pxmm){
  const W=Math.round(90*pxmm), H=Math.round(60*pxmm), a=deg*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const x=cv.getContext("2d"); x._ensure();
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  for(let y=0;y<H;y++)for(let i=0;i<W;i++){
    const X=(i+0.5)/pxmm-45, Y=(y+0.5)/pxmm-30, u=X*c+Y*s+30, v=-X*s+Y*c+15;     // bracket frame, 0..60 x 0..30
    let on = u>=0&&u<=60&&v>=0&&v<=30;
    if (on){ const r=3, cx=Math.min(Math.max(u,r),60-r), cy=Math.min(Math.max(v,r),30-r); if (Math.hypot(u-cx,v-cy)>r) on=false; }
    if (on && (Math.hypot(u-15,v-15)<4 || Math.hypot(u-45,v-15)<2.5)) on=false;
    const n=(rnd()-0.5)*14, val = on ? 55+n : 230+n, o=(y*W+i)*4;
    x.data[o]=val; x.data[o+1]=val; x.data[o+2]=on?val:val+10; x.data[o+3]=255;
  }
  return cv;
}
(async()=>{
  await sleep(700);
  const MF = win.MakerForge, st = MF.state;
  const run = async (tag, deg, pxmm) => {
    const cv = photo(deg, pxmm);
    st.items = [{ id:990, name:tag, src:cv, aspect:cv.width/cv.height, width:60, skip:[], smooth:1, mode:"flat",
      adjust:{bright:0,contrast:0,sat:0}, rot90:0, crop:false, enabled:true, place:{c:[0,0,0],n:[0,1,0]} }];
    st.active = 0; st.base.type = "tracer";
    Object.assign(st.base.tracer, { scaleFrom:"measure", sizeAxis:"width", size:60, method:"background", snap:0.5, holeClear:0.2, strokes:[] },
      JSON.parse(process.env.TRACER || "{}"));
    MF.rebuild(false); await settle();
    document.querySelectorAll("#tabs button").forEach(bt=>{ if(bt.dataset.k==="make") bt.click(); }); await sleep(150);
    const rows = [...document.querySelectorAll("#panel table.stats tr")].map(tr=>tr.textContent.replace(/\s+/g," ").trim()).filter(t=>/^(Width|Height|Hole|Outermost)/.test(t));
    const dm = MF.tracer && MF.tracer.dims;
    console.log(`${tag.padEnd(22)} ${rows.join(" | ")}${dm && Math.abs(dm.angle) >= 0.5 ? ` | turned ${dm.angle.toFixed(1)}°` : ""}`);
  };
  console.log("true part: 60.00 x 30.00 mm, holes 8.00 / 5.00 mm (made with 0.2 mm clearance)");
  await run("straight, 5 px/mm", 0, 5);
  await run("turned 4°, 5 px/mm", 4, 5);
  await run("turned -11°, 4 px/mm", -11, 4);
  // regression (v0.11.3): a flat-coloured graphic whose brightness lands exactly on the automatic
  // threshold used to vanish ("Nothing was traced") because the dark test was strict
  {
    const cv = document.createElement("canvas"); cv.width = 240; cv.height = 180;
    const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 240, 180);
    x.fillStyle = "#195aaa"; x.beginPath(); x.arc(120, 90, 75, 0, Math.PI * 2); x.fill();
    st.items = [{ id:992, name:"flat disc", src:cv, aspect:240/180, width:60, skip:[], smooth:1, mode:"flat",
      adjust:{bright:0,contrast:0,sat:0}, rot90:0, crop:false, enabled:true, place:{c:[0,0,0],n:[0,1,0]} }];
    st.active = 0;
    Object.assign(st.base.tracer, { method:"threshold", polarity:"auto", autoThr:true, size:40, sizeAxis:"width" });
    MF.rebuild(false); await settle();
    const dm = MF.tracer && MF.tracer.dims;
    console.log(`flat disc, threshold     ${MF.parts.length ? "traced" : "NOTHING TRACED"}${dm ? ` | ${dm.width.toFixed(2)} x ${dm.height.toFixed(2)} mm (typed 40)` : ""}`);
  }
  console.log("errors:", env.errors.filter(e=>!/navigation/.test(e)).length);
  process.exit(0);
})();
