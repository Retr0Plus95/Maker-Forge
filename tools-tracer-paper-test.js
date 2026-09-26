const boot = require("./tools-test-env.js");
const env = boot(process.argv[2]);
const win = env.window, document = win.document;
const sleep = ms => new Promise(r=>setTimeout(r,ms));
async function settle(){ const MF=win.MakerForge, s0=MF.rev;
  for(let i=0;i<400;i++){ await sleep(40); if(MF.rev>s0 && !MF.busy){ await sleep(40); if(!MF.busy) return; } } }
(async()=>{
  await sleep(700);
  const MF = win.MakerForge, C = MF.core;
  // A4 portrait (210 x 297 mm) photographed at an angle: paper corners land on a skewed quad
  const W=1000, H=760, quad=[[250,70],[760,120],[830,700],[170,650]];
  const toPaper = C.homography(quad, [[0,0],[210,0],[210,297],[0,297]]);
  const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  const c=cv.getContext("2d"); c._ensure();
  let seed=11; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  // bracket 60 x 30 mm at (75..135, 120..150) mm, corner radius 3, holes 8 mm and 5 mm
  const inBracket=(u,v)=>{ const lx=u-75, ly=v-120; if(lx<0||lx>60||ly<0||ly>30) return false;
    const r=3, cx=Math.min(Math.max(lx,r),60-r), cy=Math.min(Math.max(ly,r),30-r); if(Math.hypot(lx-cx,ly-cy)>r) return false;
    if(Math.hypot(lx-15,ly-15)<4) return false; if(Math.hypot(lx-45,ly-15)<2.5) return false; return true; };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const [u,v]=C.applyH(toPaper,x+0.5,y+0.5), o=(y*W+x)*4, n=(rnd()-0.5)*14;
    const onPaper = u>=0&&u<=210&&v>=0&&v<=297;
    const val = !onPaper ? 105+n : inBracket(u,v) ? 55+n : 238+n;
    c.data[o]=val; c.data[o+1]=val; c.data[o+2]=onPaper?val:val+12; c.data[o+3]=255;
  }
  const st=MF.state;
  st.items.push({ id:991, name:"angled A4 photo", src:cv, aspect:W/H, width:60, skip:[], smooth:1, mode:"flat",
    adjust:{bright:0,contrast:0,sat:0}, rot90:0, crop:false, enabled:true, place:{c:[0,0,0],n:[0,1,0]} });
  st.active=st.items.length-1;
  st.base.type="tracer";
  Object.assign(st.base.tracer,{ scaleFrom:"paper", paper:"A4", method:"threshold", snap:0.5, holeClear:0, size:999, strokes:[] },
    JSON.parse(process.env.TRACER || "{}"));
  const report = async tag => {
    MF.rebuild(false); await settle();
    const p=MF.parts[0]; if(!p){ console.log(tag, "-> no part"); return null; }
    const b=C.solidBounds(p.solid), r=C.checkMesh(p.solid);
    document.querySelectorAll("#tabs button").forEach(bt=>{ if(bt.dataset.k==="make") bt.click(); }); await sleep(150);
    const holes=[...document.querySelectorAll("#panel table.stats tr")].map(tr=>tr.textContent).filter(t=>/Hole/.test(t)).map(t=>t.replace(/\s+/g," ").trim());
    const area = r.volume / st.base.tracer.thick;      // plan area of the traced part, holes excluded
    const truth = 60*30 - (4-Math.PI)*9 - Math.PI*16 - Math.PI*6.25;
    const dm = MF.tracer && MF.tracer.dims, row = k => [...document.querySelectorAll("#panel table.stats tr")].map(tr=>tr.textContent.replace(/\s+/g," ").trim()).find(t=>t.startsWith(k)) || "";
    console.log(`${tag.padEnd(26)} bbox ${b.size[0].toFixed(2)} x ${b.size[2].toFixed(2)} mm | fitted ${dm ? dm.width.toFixed(2)+" x "+dm.height.toFixed(2) : "-"} mm | area ${area.toFixed(1)} mm2 vs true ${truth.toFixed(1)} (${((area/truth-1)*100).toFixed(2)}%)`);
    console.log(`${"".padEnd(26)} table: ${row("Width")} | ${row("Height")} | ${holes.join(" | ")}`);
    return b;
  };
  console.log("(the user typed a wrong measurement of 999 mm on purpose: paper mode must ignore it)");
  await report("paper, threshold");
  st.base.tracer.method="background"; await report("paper, background removal");
  // hand edit: erase the right-hand 15 mm of the bracket (paper mm -> normalised straightened coords)
  const u0=(120)/210, u1=(140)/210, v=(135)/297;
  const pts=[]; for(let k=0;k<=20;k++){ const t=k/20; pts.push([u0+(u1-u0)*t, v-0.03+0.06*((k%2))]); }
  st.base.tracer.strokes=[{ m:"erase", r:12/210, pts }];
  await report("after erasing right end");
  st.base.tracer.strokes=[];
  await report("strokes cleared");
  // CAD outline files
  const zipOk = typeof MF.core.outlineSVG === "function";
  console.log("CAD writers available:", zipOk, "| errors:", env.errors.filter(e=>!/navigation/.test(e)).length);
  process.exit(0);
})();
