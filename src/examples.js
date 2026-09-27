/* ---------- built-in examples (Session 19) ----------
   Every quick start and object opens with a finished example, so people can see what it makes before
   they add a picture of their own. The pictures are drawn here with the canvas, from code written for
   Maker Forge (MIT, like the rest of the app): decals in a few flat colours that match the example's
   filaments exactly, so each colour becomes one clean part, and soft greys for the lithophanes, the
   tea light and the photo of a part. Each drawing works in its own size (w × h) and is scaled to the
   canvas, and never relies on clip(): what must stay inside a shape is cut free with destination-out. */
const EXAMPLE_ART = (function(){
  const TAU = Math.PI*2;
  // a small, repeatable random number generator (mulberry32), so every example is the same each time
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const circle = (x, cx, cy, r, begin = true) => { if (begin) x.beginPath(); x.moveTo(cx + r, cy); x.arc(cx, cy, r, 0, TAU); x.closePath(); };
  const ellipse = (x, cx, cy, rx, ry, rot = 0, begin = true) => { if (begin) x.beginPath(); x.moveTo(cx + rx*Math.cos(rot), cy + rx*Math.sin(rot)); x.ellipse(cx, cy, rx, ry, rot, 0, TAU); x.closePath(); };
  function poly(x, pts, begin = true){ if (begin) x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); }
  function line(x, pts, begin = true){ if (begin) x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); }
  // a smooth closed (or open) curve through the points (Catmull-Rom as Béziers)
  function smooth(x, pts, closed = true, begin = true){
    const n = pts.length, P = i => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    if (begin) x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < (closed ? n : n - 1); i++){
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      x.bezierCurveTo(p1[0] + (p2[0] - p0[0])/6, p1[1] + (p2[1] - p0[1])/6, p2[0] - (p3[0] - p1[0])/6, p2[1] - (p3[1] - p1[1])/6, p2[0], p2[1]);
    }
    if (closed) x.closePath();
  }
  function rrect(x, X, Y, w, h, r, begin = true){
    r = Math.min(r, w/2, h/2); if (begin) x.beginPath();
    x.moveTo(X + r, Y); x.lineTo(X + w - r, Y); x.arc(X + w - r, Y + r, r, -Math.PI/2, 0);
    x.lineTo(X + w, Y + h - r); x.arc(X + w - r, Y + h - r, r, 0, Math.PI/2);
    x.lineTo(X + r, Y + h); x.arc(X + r, Y + h - r, r, Math.PI/2, Math.PI);
    x.lineTo(X, Y + r); x.arc(X + r, Y + r, r, Math.PI, Math.PI*1.5); x.closePath();
  }
  function star(x, cx, cy, R, r, n = 5, rot = -Math.PI/2, begin = true){
    const pts = []; for (let i = 0; i < 2*n; i++){ const a = rot + i*Math.PI/n, q = i % 2 ? r : R; pts.push([cx + Math.cos(a)*q, cy + Math.sin(a)*q]); }
    poly(x, pts, begin);
  }
  // a pine tree: tiers that step in, on a short trunk; by is the ground, h the height, w the width
  function pine(x, cx, by, h, w, tiers = 4, begin = true){
    const R = [[cx, by - h]];
    for (let i = 1; i <= tiers; i++){
      const f = i/tiers, y = by - h*0.16 - h*0.84*(1 - f)*0.98, hw = w/2*(0.28 + 0.72*f);
      R.push([cx + hw, y]); if (i < tiers) R.push([cx + hw*0.45, y - h*0.015]);
    }
    R.push([cx + w*0.07, by - h*0.16], [cx + w*0.07, by]);
    const L = R.slice(1).reverse().map(([px, py]) => [2*cx - px, py]);
    poly(x, R.concat(L), begin);
  }
  // a mountain ridge: through the given peaks and dips, roughened by midpoint displacement
  function ridge(rnd, pts, rough, depth){
    let out = pts.map(p => p.slice());
    for (let k = 0, d = rough; k < depth; k++, d *= 0.55){
      const n = [out[0]];
      for (let i = 1; i < out.length; i++){ const a = out[i - 1], b = out[i]; n.push([(a[0] + b[0])/2, (a[1] + b[1])/2 + (rnd() - 0.5)*d], b); }
      out = n;
    }
    return out;
  }
  // the part of an ellipse between two heights, as one closed shape (instead of clipping to it)
  function ellipseBand(x, cx, cy, rx, ry, y0, y1, begin = true){
    y0 = Math.max(y0, cy - ry); y1 = Math.min(y1, cy + ry); if (y1 <= y0) return;
    const n = 64, half = y => rx*Math.sqrt(Math.max(0, 1 - ((y - cy)/ry)**2)), pts = [];
    for (let i = 0; i <= n; i++){ const y = y0 + (y1 - y0)*i/n; pts.push([cx + half(y), y]); }
    for (let i = n; i >= 0; i--){ const y = y0 + (y1 - y0)*i/n; pts.push([cx - half(y), y]); }
    poly(x, pts, begin);
  }
  // the snow on a peak of a ridge: the ridge down to `depth` below the peak each side, and a ragged line back
  function snowCap(x, pts, peakX, depth, rnd, begin = true){
    let k = 0; for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][0] - peakX) < Math.abs(pts[k][0] - peakX)) k = i;
    const y0 = pts[k][1] + depth, cross = (i, j) => { const a = pts[i], b = pts[j], t = (y0 - a[1])/(b[1] - a[1]); return [a[0] + (b[0] - a[0])*t, y0]; };
    let l = k; while (l > 0 && pts[l - 1][1] < y0) l--; let r = k; while (r < pts.length - 1 && pts[r + 1][1] < y0) r++;
    if (l === 0 || r === pts.length - 1) return;
    const left = cross(l, l - 1), right = cross(r, r + 1), out = [left, ...pts.slice(l, r + 1), right], n = 6;
    for (let i = 1; i < n; i++){ const t = i/n; out.push([right[0] + (left[0] - right[0])*t, y0 - (i % 2 ? depth*0.35 : 0) - rnd()*depth*0.15]); }
    poly(x, out, begin);
  }
  function fill(x, colour){ x.fillStyle = colour; x.fill(); }
  function stroke(x, colour, w, cap = "round"){ x.strokeStyle = colour; x.lineWidth = w; x.lineCap = cap; x.lineJoin = "round"; x.stroke(); }
  // everything outside the shape is erased (the shape is drawn by fn, which must not begin a new path)
  function keepInside(x, W, H, fn){
    x.save(); x.globalCompositeOperation = "destination-out";
    x.beginPath(); x.rect(-2, -2, W + 4, H + 4); fn(); x.fillStyle = "#000"; x.fill("evenodd"); x.restore();
  }
  async function font(x, weight, size, family){
    try { if (document.fonts && document.fonts.load) await document.fonts.load(`${weight} ${size}px "${family}"`); } catch (e){}
    x.font = `${weight} ${size}px "${family}", sans-serif`;
  }
  function snowflake(x, cx, cy, r){
    x.beginPath();
    for (let k = 0; k < 6; k++){
      const a = k*Math.PI/3, c = Math.cos(a), s = Math.sin(a);
      x.moveTo(cx, cy); x.lineTo(cx + c*r, cy + s*r);
      for (const f of [0.55]){ const bx = cx + c*r*f, by = cy + s*r*f;
        for (const t of [-1, 1]){ const b = a + t*Math.PI/4; x.moveTo(bx, by); x.lineTo(bx + Math.cos(b)*r*0.35, by + Math.sin(b)*r*0.35); } }
    }
  }
  function bolt(x, cx, cy, h, begin = true){
    const u = h/10;
    poly(x, [[cx + 1.6*u, cy - 5*u], [cx - 2.6*u, cy + 0.6*u], [cx - 0.1*u, cy + 0.6*u], [cx - 1.6*u, cy + 5*u], [cx + 2.8*u, cy - 1*u], [cx + 0.3*u, cy - 1*u]], begin);
  }

  const A = {};

  /* ---- small pictures beside a name ---- */
  A.ladybug = { name:"Ladybird", w:380, h:300, draw(x){
    const R = "#d1495b", K = "#22303c", CR = "#f4f1ea";
    x.beginPath();                                          // legs and feelers
    for (const s of [-1, 1]) for (const k of [0, 1, 2]){ const lx = 150 + k*70; x.moveTo(lx, 150); x.lineTo(lx - 12 + k*10, 150 + s*135); }
    x.moveTo(60, 130); x.quadraticCurveTo(30, 90, 18, 52); x.moveTo(60, 170); x.quadraticCurveTo(30, 210, 18, 248);
    stroke(x, K, 13);
    circle(x, 18, 52, 14); circle(x, 18, 248, 14, false); fill(x, K);
    circle(x, 88, 150, 62); fill(x, K);                     // head
    ellipse(x, 212, 150, 150, 128); fill(x, R);             // wing cases
    line(x, [[92, 150], [360, 150]]); stroke(x, K, 11, "butt");
    x.beginPath(); for (const [sx, sy, r] of [[170, 88, 25], [262, 84, 20], [322, 122, 13], [170, 212, 25], [262, 216, 20], [322, 178, 13], [118, 150, 0]]) if (r) circle(x, sx, sy, r, false);
    fill(x, K);
    circle(x, 62, 118, 12); circle(x, 62, 182, 12, false); fill(x, CR);   // eyes
  } };
  A.moon = { name:"Moon and stars", w:320, h:320, draw(x){
    const G = "#edae49";
    circle(x, 138, 164, 128); fill(x, G);
    x.save(); x.globalCompositeOperation = "destination-out"; circle(x, 196, 128, 112); fill(x, "#000"); x.restore();
    x.beginPath(); star(x, 250, 222, 40, 17, 5, -Math.PI/2, false); star(x, 262, 64, 27, 11, 5, -Math.PI/2, false); star(x, 196, 292, 17, 7, 5, -Math.PI/2, false); fill(x, G);
  } };

  /* ---- an iron-on patch: mountains at sunrise, in a stitched border ---- */
  A.patch = { name:"Mountain patch", w:700, h:500, async draw(x, W, H){
    const CR = "#f4f1ea", GOLD = "#f2a541", TEAL = "#2a9d8f", NAVY = "#1d3557", rnd = rng(7);
    x.fillStyle = GOLD; circle(x, 438, 176, 74); x.fill();
    x.beginPath(); for (let k = 0; k < 9; k++){ const a = Math.PI + k*Math.PI/8, r0 = 94, r1 = 124; x.moveTo(438 + Math.cos(a)*r0, 176 + Math.sin(a)*r0); x.lineTo(438 + Math.cos(a)*r1, 176 + Math.sin(a)*r1); }
    stroke(x, GOLD, 12);
    const back = ridge(rnd, [[30, 300], [150, 190], [215, 232], [300, 104], [388, 214], [470, 250], [560, 160], [672, 270]], 26, 4);
    poly(x, back.concat([[672, 372], [30, 372]])); fill(x, TEAL);
    x.beginPath(); snowCap(x, back, 300, 62, rnd, false); snowCap(x, back, 560, 42, rnd, false); snowCap(x, back, 150, 30, rnd, false); fill(x, CR);   // snow on the peaks
    x.beginPath(); for (let k = 0; k < 15; k++){ const tx = 50 + k*43 + (rnd() - 0.5)*14, h = 66 + rnd()*62; pine(x, tx, 378, h, h*0.52, 4, false); } fill(x, NAVY);
    x.beginPath(); x.moveTo(30, 372); x.lineTo(672, 372); stroke(x, NAVY, 14, "butt");
    await font(x, 400, 94, "Bebas Neue"); x.fillStyle = CR; x.textAlign = "center"; x.textBaseline = "alphabetic";
    if ("letterSpacing" in x) x.letterSpacing = "10px";
    x.fillText("EXPLORE", W/2 + 5, 452);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
    keepInside(x, W, H, () => rrect(x, 26, 26, W - 52, H - 52, 58, false));
    rrect(x, 20, 20, W - 40, H - 40, 64); stroke(x, CR, 16);
  } };

  /* ---- a winged car badge ---- */
  A.wings = { name:"Winged badge", w:950, h:320, draw(x, W, H){
    const SILVER = "#c9ccd1", RED = "#d62839", GUN = "#5c6670", cx = W/2;
    for (const s of [-1, 1]){
      const F = [0, 1, 2, 3].map(k => { const y0 = 92 + k*52, len = 350 - k*62, tipY = y0 - 46 + k*14, t = 22 - k*2;
        return { x0:cx + s*96, y0, x1:cx + s*(96 + len), tipY, t }; });
      x.beginPath();
      for (const f of F){
        x.moveTo(f.x0, f.y0 - f.t);
        x.quadraticCurveTo((f.x0 + f.x1)/2, f.y0 - f.t - 6, f.x1 - s*f.t, f.tipY - f.t*0.55);
        x.quadraticCurveTo(f.x1 + s*f.t*0.9, f.tipY, f.x1 - s*f.t*0.4, f.tipY + f.t*0.8);
        x.quadraticCurveTo((f.x0 + f.x1)/2, f.y0 + f.t + 4, f.x0, f.y0 + f.t);
        x.closePath();
      }
      fill(x, SILVER);
      x.beginPath(); for (const f of F){ x.moveTo(f.x0 + s*20, f.y0); x.quadraticCurveTo((f.x0 + f.x1)/2, f.y0 - 2, f.x1 - s*f.t*1.6, f.tipY + 2); }
      stroke(x, GUN, 6);
    }
    const shield = (r, begin = true) => { const top = 22 + (112 - r)*0.9, bot = 304 - (112 - r)*1.1;
      if (begin) x.beginPath(); x.moveTo(cx - r, top + 16); x.quadraticCurveTo(cx - r*0.5, top - 4, cx, top + 10); x.quadraticCurveTo(cx + r*0.5, top - 4, cx + r, top + 16);
      x.lineTo(cx + r, 150); x.quadraticCurveTo(cx + r*0.9, 250, cx, bot); x.quadraticCurveTo(cx - r*0.9, 250, cx - r, 150); x.closePath(); };
    shield(112); fill(x, SILVER);
    shield(94); fill(x, RED);
    bolt(x, cx, 160, 170); fill(x, SILVER);
  } };

  /* ---- a Christmas bauble: tree, star and snow ---- */
  A.xmas = { name:"Christmas tree", w:600, h:600, draw(x, W, H){
    const CR = "#f7f7f2", GREEN = "#1f7a4d", GOLD = "#e0b43c", cx = 300, rnd = rng(12);
    x.beginPath();
    const tier = (top, bot, hw) => { x.moveTo(cx, top); x.quadraticCurveTo(cx + hw*0.35, top + (bot - top)*0.5, cx + hw, bot); x.quadraticCurveTo(cx, bot + 26, cx - hw, bot); x.quadraticCurveTo(cx - hw*0.35, top + (bot - top)*0.5, cx, top); x.closePath(); };
    tier(120, 250, 105); tier(180, 345, 150); tier(250, 450, 195); fill(x, GREEN);
    rrect(x, cx - 26, 452, 52, 46, 6); fill(x, GOLD);
    // snow on the ground
    x.beginPath(); x.moveTo(0, 505); x.quadraticCurveTo(160, 470, 300, 492); x.quadraticCurveTo(450, 512, 600, 480); x.lineTo(600, 600); x.lineTo(0, 600); x.closePath(); fill(x, CR);
    // garland and baubles
    x.beginPath(); x.moveTo(cx - 80, 222); x.quadraticCurveTo(cx, 250, cx + 90, 205); x.moveTo(cx - 124, 330); x.quadraticCurveTo(cx, 360, cx + 138, 300); x.moveTo(cx - 170, 430); x.quadraticCurveTo(cx, 455, cx + 180, 400);
    stroke(x, CR, 9);
    x.beginPath(); for (const [bx, by, r] of [[cx - 40, 190, 13], [cx + 52, 270, 15], [cx - 70, 300, 14], [cx + 30, 380, 15], [cx - 120, 410, 15], [cx + 120, 350, 13], [cx + 86, 435, 14]]) circle(x, bx, by, r, false); fill(x, GOLD);
    x.beginPath(); for (const [bx, by, r] of [[cx + 30, 170, 10], [cx - 20, 280, 11], [cx + 100, 250, 10], [cx - 150, 380, 11], [cx - 10, 420, 12]]) circle(x, bx, by, r, false); fill(x, CR);
    star(x, cx, 104, 52, 22); fill(x, GOLD);
    x.beginPath(); for (const [fx, fy, r] of [[112, 170, 34], [488, 150, 30], [86, 330, 22], [512, 318, 26], [170, 76, 16], [438, 64, 18]]) snowflake(x, fx, fy, r);
    stroke(x, CR, 8);
    x.beginPath(); for (let k = 0; k < 18; k++){ const a = rnd()*TAU, r = 120 + rnd()*150; const px = cx + Math.cos(a)*r, py = 300 + Math.sin(a)*r*0.9; if (py < 470 && Math.abs(px - cx) > 60 + (py - 100)*0.5) circle(x, px, py, 5 + rnd()*4, false); }
    fill(x, CR);
    keepInside(x, W, H, () => circle(x, 300, 300, 272, false));
    circle(x, 300, 300, 284); stroke(x, GOLD, 22);
  } };

  /* ---- a tea light: a moonlit forest through an arched window (dark prints thick, so the light shows through the pale parts) ---- */
  A.moonForest = { name:"Moonlit forest", w:540, h:660, draw(x, W, H){
    const rnd = rng(3), arch = begin => { if (begin) x.beginPath(); x.moveTo(40, 640); x.lineTo(40, 290); x.arc(270, 290, 230, Math.PI, 0); x.lineTo(500, 640); x.closePath(); };
    let g = x.createLinearGradient(0, 60, 0, 520); g.addColorStop(0, "#6e6e6e"); g.addColorStop(0.7, "#bdbdbd"); g.addColorStop(1, "#e2e2e2");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(360, 210, 40, 360, 210, 190); g.addColorStop(0, "rgba(255,255,255,0.75)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    circle(x, 360, 210, 62); fill(x, "#ffffff");
    x.beginPath(); for (let k = 0; k < 40; k++){ const sx = 60 + rnd()*420, sy = 70 + rnd()*260; if (Math.hypot(sx - 360, sy - 210) > 110) star(x, sx, sy, 5 + rnd()*6, 2, 4, 0, false); } fill(x, "#ffffff");
    const far = ridge(rnd, [[0, 420], [120, 330], [230, 390], [340, 310], [460, 380], [540, 350]], 30, 4);
    poly(x, far.concat([[540, 660], [0, 660]])); fill(x, "#7a7a7a");
    x.beginPath(); for (let k = 0; k < 12; k++){ const tx = 30 + k*44 + rnd()*20, h = 90 + rnd()*60; pine(x, tx, 480, h, h*0.45, 5, false); } fill(x, "#454545");
    x.beginPath(); x.moveTo(0, 470); x.quadraticCurveTo(270, 440, 540, 480); x.lineTo(540, 660); x.lineTo(0, 660); x.closePath(); fill(x, "#454545");
    // the cabin with a lit window
    poly(x, [[300, 520], [300, 470], [352, 430], [404, 470], [404, 520]]); fill(x, "#101010");
    rrect(x, 340, 470, 26, 24, 3); fill(x, "#ffffff");
    x.beginPath(); for (const [tx, h] of [[70, 230], [150, 180], [470, 250], [230, 150], [510, 170]]) pine(x, tx, 610, h, h*0.46, 6, false); fill(x, "#0c0c0c");
    x.fillStyle = "#000000"; x.fillRect(0, 600, W, 60);
    keepInside(x, W, H, () => arch(false));
    arch(true); stroke(x, "#000000", 22);
  } };

  /* ---- a tea light: a forest silhouette in a dark filament; lit from inside it stands black against the glow ---- */
  A.forestSilhouette = { name:"Forest silhouette", w:760, h:420, draw(x, W, H){
    const K = "#2b2d42", rnd = rng(31);
    x.beginPath();
    // the ground and the trees, kept clear of the picture's edge (a decal leaves out whatever touches it, as
    // background), with a clearing for the deer
    x.moveTo(20, 400); x.lineTo(20, 372); for (let k = 0; k <= 16; k++) x.lineTo(20 + k*45, 372 - Math.sin(k*0.9)*8 - 6); x.lineTo(740, 400); x.closePath();
    for (const [tx, h] of [[82, 200], [128, 150], [170, 255], [214, 170], [258, 225], [300, 140], [342, 205], [392, 160], [436, 120], [652, 150], [690, 215]])
      pine(x, tx + (rnd() - 0.5)*8, 380, h, h*0.42, 6, false);
    fill(x, K);
    // a deer on the ground
    x.beginPath(); x.moveTo(470, 372); x.lineTo(474, 330); x.quadraticCurveTo(470, 312, 486, 306); x.lineTo(540, 304); x.quadraticCurveTo(556, 306, 558, 296);
    x.lineTo(566, 268); x.lineTo(582, 262); x.lineTo(590, 272); x.lineTo(574, 280); x.lineTo(568, 312); x.lineTo(556, 330); x.lineTo(552, 372); x.lineTo(544, 372); x.lineTo(542, 334);
    x.lineTo(500, 336); x.lineTo(494, 372); x.lineTo(486, 372); x.lineTo(484, 338); x.lineTo(478, 372); x.closePath(); fill(x, K);
    x.beginPath(); x.moveTo(570, 266); x.lineTo(562, 236); x.lineTo(552, 226); x.moveTo(562, 240); x.lineTo(572, 224); x.moveTo(578, 262); x.lineTo(588, 234); x.lineTo(600, 226); x.moveTo(586, 240); x.lineTo(582, 222); stroke(x, K, 5);
    // a crescent moon and a few birds
    circle(x, 610, 80, 46); fill(x, K); x.save(); x.globalCompositeOperation = "destination-out"; circle(x, 630, 66, 42); fill(x, "#000"); x.restore();
    x.beginPath(); for (const [bx, by, s] of [[200, 60, 18], [240, 86, 13], [276, 50, 11], [410, 110, 12]]){ x.moveTo(bx - s, by); x.quadraticCurveTo(bx - s/2, by - s*0.7, bx, by); x.quadraticCurveTo(bx + s/2, by - s*0.7, bx + s, by); }
    stroke(x, K, 6);
  } };

  /* ---- plastic canvas: a ginger cat, one square per stitch (34 × 34) ---- */
  A.pixelCat = { name:"Pixel cat", w:340, h:340, draw(x){
    const N = 34, S = 10, CR = "#f4f1ea", K = "#22303c", R = "#d1495b", O = "#edae49";
    // the left half is worked out cell by cell and mirrored, so the face is exactly symmetric
    const tri = (px, py, a, b, c) => { const d = (p, q, r) => (p[0] - r[0])*(q[1] - r[1]) - (q[0] - r[0])*(p[1] - r[1]); const P = [px, py];
      const d1 = d(P, a, b), d2 = d(P, b, c), d3 = d(P, c, a); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
    const head = (i, j) => { const dx = (i + 0.5 - 17)/13.6, dy = (j + 0.5 - 20.5)/11; return dx*dx + dy*dy <= 1; };
    const ear = (i, j) => { const c = i < 17 ? i + 0.5 : 33.5 - i; return tri(c, j + 0.5, [4.6, 2.6], [3.2, 14], [13.5, 10]); };
    const inner = (i, j) => { const c = i < 17 ? i + 0.5 : 33.5 - i; return tri(c, j + 0.5, [5.6, 6.2], [5, 12.5], [10.4, 10.6]); };
    const shape = (i, j) => i >= 0 && j >= 0 && i < N && j < N && (head(i, j) || ear(i, j));
    const g = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
      let c = shape(i, j) ? O : CR;
      if (c === O && (!shape(i - 1, j) || !shape(i + 1, j) || !shape(i, j - 1) || !shape(i, j + 1))) c = K;
      else if (c === O && inner(i, j) && !head(i, j)) c = R;
      g[j*N + i] = c;
    }
    const set = (i, j, c) => { g[j*N + i] = c; g[j*N + (N - 1 - i)] = c; };      // left cell and its mirror
    for (const [i, j] of [[16, 10], [16, 11], [16, 12], [16, 13], [12, 11], [12, 12], [12, 13], [13, 13]]) set(i, j, K);   // stripes on the forehead
    for (let j = 16; j <= 20; j++) for (let i = 9; i <= 12; i++) if (!((j === 16 || j === 20) && (i === 9 || i === 12))) set(i, j, K);   // eyes
    set(10, 17, CR); set(10, 16, K);                                                     // a glint in each
    for (let j = 22; j <= 26; j++) for (let i = 12; i <= 16; i++){ const dx = (i + 0.5 - 17)/5.2, dy = (j + 0.5 - 24.5)/2.9; if (dx*dx + dy*dy <= 1) set(i, j, CR); }   // muzzle
    set(15, 22, R); set(16, 22, R); set(16, 23, R);                                      // nose
    set(16, 24, K); set(15, 25, K); set(14, 25, K); set(13, 24, K);                      // mouth
    set(16, 26, R);                                                                      // tongue
    for (let i = 1; i <= 8; i++){ set(i, 22 - (i < 4 ? 1 : 0), K); set(i, 25 + (i < 4 ? 1 : 0), K); }                 // whiskers
    set(8, 22, R); set(9, 22, R);                                                        // rosy cheeks
    for (const c of [CR, O, K, R]){ x.beginPath(); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (g[j*N + i] === c) x.rect(i*S, j*S, S, S); fill(x, c); }
  } };

  /* ---- a bobble head's face ---- */
  A.face = { name:"Happy face", w:500, h:460, draw(x){
    const K = "#2b2d42", COR = "#e07a5f", HAIR = "#6b4226", SKIN = "#f2c9a0";
    x.beginPath(); x.moveTo(20, 150); x.bezierCurveTo(40, 20, 460, 20, 480, 150); x.bezierCurveTo(420, 96, 360, 120, 330, 92); x.bezierCurveTo(300, 130, 200, 128, 160, 96); x.bezierCurveTo(120, 126, 60, 110, 20, 150); x.closePath(); fill(x, HAIR);
    x.beginPath(); x.moveTo(120, 188); x.quadraticCurveTo(160, 160, 200, 182); x.moveTo(300, 182); x.quadraticCurveTo(340, 160, 380, 188); stroke(x, HAIR, 16);
    ellipse(x, 162, 252, 34, 44); ellipse(x, 338, 252, 34, 44, 0, false); fill(x, K);
    circle(x, 174, 234, 12); circle(x, 350, 234, 12, false); fill(x, SKIN);
    ellipse(x, 104, 322, 40, 26); ellipse(x, 396, 322, 40, 26, 0, false); fill(x, COR);
    x.beginPath(); x.moveTo(176, 330); x.quadraticCurveTo(250, 420, 324, 330); x.quadraticCurveTo(250, 372, 176, 330); x.closePath(); fill(x, K);
    x.beginPath(); x.moveTo(214, 368); x.quadraticCurveTo(250, 392, 286, 368); x.quadraticCurveTo(250, 404, 214, 368); x.closePath(); fill(x, COR);
  } };

  /* ---- a gingerbread cookie (the cutter follows its outline) ---- */
  A.gingerbread = { name:"Gingerbread", w:520, h:620, draw(x){
    const B = "#b5651d", I = "#fff8ee";
    x.beginPath(); circle(x, 260, 128, 100, false);
    x.moveTo(170, 230); x.quadraticCurveTo(260, 205, 350, 230); x.lineTo(470, 262); x.quadraticCurveTo(515, 290, 480, 336); x.lineTo(350, 330);
    x.lineTo(348, 420); x.lineTo(412, 548); x.quadraticCurveTo(420, 600, 364, 596); x.lineTo(262, 470); x.lineTo(156, 596); x.quadraticCurveTo(100, 600, 108, 548);
    x.lineTo(172, 420); x.lineTo(170, 330); x.lineTo(40, 336); x.quadraticCurveTo(5, 290, 50, 262); x.closePath(); fill(x, B);
    x.beginPath(); circle(x, 226, 108, 13, false); circle(x, 294, 108, 13, false); for (const by of [268, 330, 392]) circle(x, 260, by, 15, false); fill(x, I);
    x.beginPath(); x.moveTo(214, 150); x.quadraticCurveTo(260, 188, 306, 150);
    for (const [ax, dir] of [[80, 1], [440, -1]]){ x.moveTo(ax, 276); for (let k = 0; k < 4; k++) x.quadraticCurveTo(ax + dir*6, 290 + k*10, ax, 300 + k*10); }
    for (const [lx, dir] of [[140, 1], [380, -1]]){ x.moveTo(lx, 560); for (let k = 0; k < 4; k++) x.quadraticCurveTo(lx + dir*(k*8 + 6), 548 - k*8, lx + dir*(k*8 + 12), 562 - k*8); }
    stroke(x, I, 9);
  } };

  /* ---- a photo of a bracket on white paper, for the tracer ---- */
  A.bracket = { name:"Bracket on paper", w:1200, h:900, draw(x, W, H){
    const rnd = rng(21);
    let g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#f5f3ef"); g.addColorStop(1, "#e8e5de");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(W*0.45, H*0.45, 250, W*0.5, H*0.5, 850); g.addColorStop(0, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(120,110,100,0.07)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const shape = (dx, dy, begin = true) => {
      if (begin) x.beginPath();
      x.moveTo(250 + dx, 300 + dy); x.lineTo(770 + dx, 300 + dy); x.arc(770 + dx, 420 + dy, 120, -Math.PI/2, 0); x.lineTo(890 + dx, 560 + dy);
      x.arc(820 + dx, 560 + dy, 70, 0, Math.PI); x.lineTo(750 + dx, 470 + dy); x.quadraticCurveTo(750 + dx, 440 + dy, 720 + dx, 440 + dy);
      x.lineTo(310 + dx, 440 + dy); x.arc(310 + dx, 370 + dy, 70, Math.PI/2, Math.PI*1.5); x.closePath();
    };
    const holes = (dx, dy) => { circle(x, 310 + dx, 370 + dy, 30, false); circle(x, 820 + dx, 568 + dy, 30, false); circle(x, 770 + dx, 400 + dy, 44, false);
      x.moveTo(430 + dx, 350 + dy); x.lineTo(610 + dx, 350 + dy); x.arc(610 + dx, 370 + dy, 20, -Math.PI/2, Math.PI/2); x.lineTo(430 + dx, 390 + dy); x.arc(430 + dx, 370 + dy, 20, Math.PI/2, Math.PI*1.5); x.closePath(); };
    for (let k = 4; k >= 1; k--){ shape(2 + k*1.5, 3 + k*2); holes(2 + k*1.5, 3 + k*2); x.fillStyle = "rgba(60,55,50,0.05)"; x.fill("evenodd"); }   // a soft contact shadow
    shape(0, 0); holes(0, 0);
    g = x.createLinearGradient(250, 300, 890, 630); g.addColorStop(0, "#5b6b7c"); g.addColorStop(0.45, "#3f4c5a"); g.addColorStop(1, "#2c3640");
    x.fillStyle = g; x.fill("evenodd");
    shape(0, 0); stroke(x, "rgba(255,255,255,0.28)", 4);
    x.beginPath(); for (let k = 0; k < 900; k++){ const px = rnd()*W, py = rnd()*H; x.rect(px, py, 2, 2); } x.fillStyle = "rgba(0,0,0,0.035)"; x.fill();
  } };

  /* ---- a lightbox: sunset over layered hills ---- */
  A.sunsetHills = { name:"Sunset hills", w:1200, h:800, draw(x, W, H){
    const CR = "#f6f4ee", K = "#241f1c", RED = "#d1495b", GOLD = "#edae49", rnd = rng(5);
    x.fillStyle = RED; x.fillRect(0, 0, W, H);
    x.fillStyle = GOLD; x.fillRect(0, 260, W, H);
    x.beginPath(); for (const [y, h] of [[220, 12], [190, 9], [165, 7]]) x.rect(0, y, W, h); fill(x, GOLD);
    circle(x, 760, 470, 150); fill(x, CR);
    x.beginPath(); for (const [y, h] of [[430, 10], [470, 14], [512, 18], [560, 22]]) x.rect(560, y, 400, h); fill(x, GOLD);
    poly(x, ridge(rnd, [[0, 520], [180, 440], [380, 500], [560, 420], [820, 520], [1000, 450], [1200, 500]], 30, 5).concat([[1200, 800], [0, 800]])); fill(x, RED);
    smooth(x, [[0, 600], [200, 560], [420, 610], [640, 570], [900, 640], [1200, 580], [1200, 800], [0, 800]], true); fill(x, K);
    x.beginPath(); for (let k = 0; k < 18; k++){ const tx = 20 + k*68 + rnd()*20, h = 70 + rnd()*90; pine(x, tx, 620 + Math.sin(k)*20, h, h*0.45, 4, false); } fill(x, K);
    x.beginPath(); for (const [bx, by, s] of [[300, 200, 26], [352, 230, 20], [396, 184, 16], [900, 150, 22], [950, 178, 16]]){ x.moveTo(bx - s, by); x.quadraticCurveTo(bx - s/2, by - s*0.6, bx, by); x.quadraticCurveTo(bx + s/2, by - s*0.6, bx + s, by); }
    stroke(x, K, 7);
  } };

  /* ---- a circuit board: an LED heart ---- */
  A.ledHeart = { name:"LED heart board", w:1200, h:800, async draw(x, W, H){
    const K = "#111111";
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
    const at = (s, t) => [545 + s*16*Math.pow(Math.sin(t), 3), 388 - s*(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t))];
    const heart = s => { const pts = []; for (let i = 0; i < 72; i++) pts.push(at(s, i/72*TAU)); return pts; };
    smooth(x, heart(16.5)); stroke(x, K, 14);          // + rail
    smooth(x, heart(10.5)); stroke(x, K, 14);          // - rail
    // fourteen LEDs across the rails, none at the dip or the point where the rails crowd together
    x.beginPath();
    for (let i = 0; i < 14; i++){
      const k = i % 7, t0 = 0.55 + k*(Math.PI - 1.25)/6, t = i < 7 ? t0 : TAU - t0, p = at(13.5, t), a0 = at(10.5, t), a1 = at(16.5, t), a = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
      for (const f of [-1, 1]){ x.save(); x.translate(p[0] + Math.cos(a)*f*22, p[1] + Math.sin(a)*f*22); x.rotate(a); rrect(x, -13, -16, 26, 32, 5, false); x.restore(); }
    }
    fill(x, K);
    // the chip, its pads and the traces out to the rails, the button and the coin cell
    const chipX = 985, chipY = 330, pad = (k, s) => [chipX + s*75, chipY - 77 + k*56];
    x.beginPath(); for (let k = 0; k < 4; k++) for (const s of [-1, 1]) rrect(x, chipX + s*75 - 20, chipY - 90 + k*56, 40, 26, 8, false); fill(x, K);
    rrect(x, chipX - 55, chipY - 110, 110, 220, 10); stroke(x, K, 6);
    circle(x, chipX - 30, chipY - 85, 9); fill(x, K);
    const rail = at(16.5, Math.PI/2), low = at(16.5, 2.75), left = at(16.5, TAU - 2.2);
    x.beginPath();
    x.moveTo(...pad(0, -1)); x.lineTo(rail[0] + 60, pad(0, -1)[1]); x.lineTo(rail[0], rail[1]);
    x.moveTo(...pad(3, -1)); x.lineTo(800, pad(3, -1)[1]);
    x.moveTo(...pad(1, 1)); x.lineTo(1120, pad(1, 1)[1]); x.lineTo(1120, 164);
    x.moveTo(...pad(2, 1)); x.lineTo(1100, pad(2, 1)[1]); x.lineTo(1100, 580);
    x.moveTo(200, 681); x.lineTo(200, 640); x.lineTo(left[0], left[1]);
    x.moveTo(250, 681); x.lineTo(250, 660); x.lineTo(300, 610);
    x.moveTo(784, 620); x.lineTo(836, 620); x.moveTo(884, 620); x.lineTo(990, 620); x.moveTo(736, 620); x.lineTo(640, 620); x.lineTo(low[0], low[1]);
    stroke(x, K, 12);
    // vias through to the back: rings
    x.beginPath(); circle(x, 800, pad(3, -1)[1], 18, false); circle(x, 300, 610, 18, false); stroke(x, K, 12);
    // coin cell pads, a button, a header and two resistors
    circle(x, 1100, 650, 70); stroke(x, K, 18); circle(x, 1100, 650, 26); fill(x, K);
    x.beginPath(); for (const [rx, ry] of [[1080, 110], [1120, 110], [1080, 150], [1120, 150]]) rrect(x, rx - 14, ry - 14, 28, 28, 4, false); fill(x, K);
    x.beginPath(); for (let k = 0; k < 4; k++) circle(x, 200 + k*50, 700, 19, false); fill(x, K);
    x.beginPath(); for (let k = 0; k < 4; k++) circle(x, 200 + k*50, 700, 8, false); fill(x, "#ffffff");
    x.beginPath(); for (const rx of [760, 860]){ rrect(x, rx - 36, 606, 24, 28, 5, false); rrect(x, rx + 12, 606, 24, 28, 5, false); } fill(x, K);
    await font(x, 400, 46, "Orbitron"); x.fillStyle = K; x.textAlign = "left"; x.textBaseline = "alphabetic"; x.fillText("MAKER FORGE", 70, 110);
    await font(x, 400, 26, "Orbitron"); x.fillText("LED HEART  V1.0", 74, 150);
  } };

  /* ---- a photo frame's bottom border: a garland round a word ---- */
  A.garland = { name:"Family garland", w:1100, h:165, async draw(x, W, H){
    const NAVY = "#3d405b", COR = "#e07a5f", SAGE = "#81b29a";
    await font(x, 400, 104, "Pacifico"); x.fillStyle = NAVY; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("Family", W/2, 72);
    const vine = s => {
      const x0 = W/2 + s*220, x1 = W/2 + s*520;
      x.beginPath(); x.moveTo(x0, 90); x.bezierCurveTo(x0 + s*80, 40, x0 + s*160, 140, x0 + s*220, 80); x.bezierCurveTo(x0 + s*250, 50, x1 - s*20, 70, x1, 84); stroke(x, SAGE, 8);
      x.beginPath();
      for (const [t, up] of [[0.12, 1], [0.3, -1], [0.48, 1], [0.66, -1], [0.84, 1]]){
        const lx = x0 + (x1 - x0)*t, ly = 86 + (t < 0.5 ? Math.sin(t*9)*18 : -4);
        ellipse(x, lx + s*14, ly - up*20, 24, 11, s*up*0.7, false);
      }
      fill(x, SAGE);
      x.beginPath(); for (const [t, r] of [[0.2, 30], [0.58, 34], [0.95, 26]]){ const fx = x0 + (x1 - x0)*t, fy = 84 + (t > 0.9 ? -2 : t < 0.4 ? -8 : 12);
        for (let k = 0; k < 5; k++){ const a = k*TAU/5 - Math.PI/2; circle(x, fx + Math.cos(a)*r*0.52, fy + Math.sin(a)*r*0.52, r*0.46, false); } }
      fill(x, COR);
      x.beginPath(); for (const [t, r] of [[0.2, 30], [0.58, 34], [0.95, 26]]){ const fx = x0 + (x1 - x0)*t, fy = 84 + (t > 0.9 ? -2 : t < 0.4 ? -8 : 12); circle(x, fx, fy, r*0.28, false); }
      fill(x, NAVY);
    };
    vine(-1); vine(1);
  } };

  /* ---- a jigsaw: hot-air balloons over the hills ---- */
  A.balloons = { name:"Hot-air balloons", w:1200, h:900, draw(x, W, H){
    const SKY = "#8ecae6", CR = "#fdf0d5", RED = "#e63946", GREEN = "#2a9d8f", rnd = rng(11);
    x.fillStyle = SKY; x.fillRect(0, 0, W, H);
    circle(x, 1010, 150, 80); fill(x, CR);
    const cloud = (cx, cy, s) => { for (const [dx, dy, r] of [[-1.1, 0.2, 0.55], [-0.45, -0.25, 0.75], [0.35, -0.35, 0.85], [1.05, 0.05, 0.6], [0, 0.25, 0.7]]) circle(x, cx + dx*s, cy + dy*s, r*s, false);
      x.rect(cx - 1.1*s, cy + 0.1*s, 2.15*s, 0.7*s); };
    x.beginPath(); cloud(230, 170, 70); cloud(760, 110, 50); cloud(560, 330, 40); cloud(1080, 380, 44); fill(x, CR);
    // hills
    smooth(x, [[0, 680], [180, 620], [420, 670], [700, 600], [960, 660], [1200, 610], [1200, 900], [0, 900]]); fill(x, GREEN);
    smooth(x, [[0, 780], [260, 720], [560, 770], [840, 730], [1200, 790], [1200, 900], [0, 900]]); fill(x, CR);
    smooth(x, [[0, 820], [300, 790], [600, 830], [900, 800], [1200, 840], [1200, 900], [0, 900]]); fill(x, GREEN);
    x.beginPath(); for (let k = 0; k < 9; k++){ const tx = 60 + k*140 + rnd()*40, ty = 650 + Math.sin(k*1.7)*24; circle(x, tx, ty - 26, 26, false); x.rect(tx - 5, ty - 10, 10, 30); } fill(x, GREEN);
    const balloon = (cx, cy, r, body, stripe, basket) => {
      const env = (begin = true) => { if (begin) x.beginPath(); x.moveTo(cx, cy + r*1.32); x.bezierCurveTo(cx - r*0.55, cy + r*1.0, cx - r*1.12, cy + r*0.48, cx - r*1.02, cy - r*0.1);
        x.bezierCurveTo(cx - r*0.9, cy - r*1.12, cx + r*0.9, cy - r*1.12, cx + r*1.02, cy - r*0.1); x.bezierCurveTo(cx + r*1.12, cy + r*0.48, cx + r*0.55, cy + r*1.0, cx, cy + r*1.32); x.closePath(); };
      env(); fill(x, body);
      x.beginPath();
      for (const f of [-0.62, 0, 0.62]){ const w = r*0.17; x.moveTo(cx + f*r*0.2, cy + r*1.3); x.bezierCurveTo(cx + f*r*1.25 - w, cy + r*0.5, cx + f*r*1.25 - w, cy - r*0.4, cx + f*r*0.9 - w*0.4, cy - r*0.86);
        x.lineTo(cx + f*r*0.9 + w*0.4, cy - r*0.86); x.bezierCurveTo(cx + f*r*1.25 + w, cy - r*0.4, cx + f*r*1.25 + w, cy + r*0.5, cx + f*r*0.2, cy + r*1.3); x.closePath(); }
      fill(x, stripe);
      x.beginPath(); x.moveTo(cx - r*0.26, cy + r*1.3); x.lineTo(cx - r*0.2, cy + r*1.66); x.moveTo(cx + r*0.26, cy + r*1.3); x.lineTo(cx + r*0.2, cy + r*1.66); stroke(x, basket, Math.max(5, r*0.05));
      rrect(x, cx - r*0.25, cy + r*1.64, r*0.5, r*0.34, r*0.06); fill(x, basket);
    };
    balloon(420, 330, 150, RED, CR, RED);
    balloon(830, 470, 95, GREEN, CR, GREEN);
    balloon(170, 520, 60, CR, RED, RED);
    balloon(1010, 250, 48, RED, CR, RED);
  } };

  /* ---- a kids' puzzle: a happy whale ---- */
  A.whale = { name:"Happy whale", w:1200, h:1000, draw(x, W, H){
    const SKY = "#bde0fe", SEA = "#219ebc", NAVY = "#023047", GOLD = "#ffb703";
    x.fillStyle = SKY; x.fillRect(0, 0, W, H);
    circle(x, 190, 180, 100); fill(x, GOLD);
    x.beginPath(); for (let k = 0; k < 10; k++){ const a = k*TAU/10; x.moveTo(190 + Math.cos(a)*130, 180 + Math.sin(a)*130); x.lineTo(190 + Math.cos(a)*170, 180 + Math.sin(a)*170); } stroke(x, GOLD, 18);
    // the sea, with a wavy top
    x.beginPath(); x.moveTo(0, 600); for (let k = 0; k <= 12; k++){ const px = k*100; x.quadraticCurveTo(px + 50, 570, px + 100, 600); } x.lineTo(W, H); x.lineTo(0, H); x.closePath(); fill(x, SEA);
    // the whale: body, tail, flipper
    x.beginPath(); x.moveTo(230, 560); x.bezierCurveTo(240, 330, 560, 270, 760, 380); x.bezierCurveTo(860, 440, 900, 520, 930, 560);
    x.bezierCurveTo(970, 500, 1000, 420, 1080, 380); x.bezierCurveTo(1060, 470, 1080, 520, 1140, 560); x.bezierCurveTo(1060, 580, 1000, 600, 960, 660);
    x.bezierCurveTo(900, 760, 560, 800, 380, 740); x.bezierCurveTo(260, 700, 225, 640, 230, 560); x.closePath(); fill(x, NAVY);
    x.beginPath(); x.moveTo(300, 640); x.bezierCurveTo(420, 720, 700, 730, 880, 650); x.bezierCurveTo(800, 770, 480, 790, 330, 700); x.closePath(); fill(x, SKY);
    x.beginPath(); for (let k = 0; k < 5; k++){ x.moveTo(420 + k*90, 690 + (k === 0 || k === 4 ? -6 : 8)); x.lineTo(420 + k*90, 745 - Math.abs(k - 2)*12); } stroke(x, NAVY, 10);
    circle(x, 380, 520, 34); fill(x, SKY); circle(x, 388, 526, 16); fill(x, NAVY);
    x.beginPath(); x.moveTo(280, 600); x.quadraticCurveTo(330, 640, 380, 610); stroke(x, SKY, 12);
    ellipse(x, 300, 578, 26, 14); fill(x, GOLD);
    // the spout
    x.beginPath(); x.moveTo(520, 330); x.bezierCurveTo(520, 250, 440, 220, 400, 250); x.moveTo(520, 330); x.bezierCurveTo(520, 250, 600, 220, 640, 250); x.moveTo(520, 330); x.lineTo(520, 200); stroke(x, SEA, 22);
    x.beginPath(); circle(x, 400, 250, 22, false); circle(x, 640, 250, 22, false); circle(x, 520, 190, 26, false); fill(x, SEA);
    // a fish and a starfish
    ellipse(x, 1000, 830, 60, 36); fill(x, GOLD); poly(x, [[950, 830], [900, 800], [900, 860]]); fill(x, GOLD); circle(x, 1030, 822, 8); fill(x, NAVY);
    star(x, 170, 880, 60, 26, 5, -Math.PI/2); fill(x, GOLD);
    x.beginPath(); for (const [bx, by, r] of [[1050, 740, 14], [1080, 690, 10], [1060, 650, 7], [240, 790, 10], [270, 755, 7]]) circle(x, bx, by, r, false); stroke(x, SKY, 6);
  } };

  /* ---- a lithophane: a lighthouse at sunset ---- */
  A.lighthouse = { name:"Lighthouse", w:1000, h:750, draw(x, W, H){
    const rnd = rng(8), hor = 440;
    let g = x.createLinearGradient(0, 0, 0, hor); g.addColorStop(0, "#2e2e2e"); g.addColorStop(0.55, "#8a8a8a"); g.addColorStop(1, "#e6e6e6");
    x.fillStyle = g; x.fillRect(0, 0, W, hor);
    g = x.createRadialGradient(690, hor - 20, 10, 690, hor - 20, 330); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, hor);
    circle(x, 690, hor - 16, 44); fill(x, "#ffffff");
    // streaks of cloud, lit from below
    for (const [cx, cy, w, h, a] of [[300, 150, 380, 26, 0.5], [640, 230, 460, 20, 0.45], [820, 120, 300, 18, 0.4], [180, 300, 300, 16, 0.35], [760, 330, 380, 12, 0.3]]){
      g = x.createLinearGradient(0, cy - h, 0, cy + h); g.addColorStop(0, `rgba(40,40,40,${a})`); g.addColorStop(1, `rgba(230,230,230,${a})`);
      ellipse(x, cx, cy, w/2, h); x.fillStyle = g; x.fill();
    }
    g = x.createLinearGradient(0, hor, 0, H); g.addColorStop(0, "#9a9a9a"); g.addColorStop(1, "#262626");
    x.fillStyle = g; x.fillRect(0, hor, W, H - hor);
    x.beginPath(); for (let k = 0; k < 26; k++){ const y = hor + 6 + k*k*0.5, w = 30 + k*7 + rnd()*20; x.rect(690 - w/2 + (rnd() - 0.5)*30, y, w, 3 + k*0.25); } x.fillStyle = "rgba(255,255,255,0.85)"; x.fill();
    x.beginPath(); for (let k = 0; k < 120; k++){ const y = hor + 10 + rnd()*(H - hor), w = 10 + (y - hor)*0.15*rnd(); x.rect(rnd()*W, y, w, 2 + (y - hor)*0.012); } x.fillStyle = "rgba(20,20,20,0.35)"; x.fill();
    // the cliff and the lighthouse on it
    smooth(x, [[-20, 390], [120, 372], [260, 360], [380, 380], [450, 440], [470, 520], [520, 600], [600, 690], [640, 780], [-20, 780]]); x.fillStyle = "#1c1c1c"; x.fill();
    x.beginPath(); for (let k = 0; k < 60; k++){ const px = rnd()*420, py = 372 + (px > 300 ? (px - 300)*0.5 : 0) + rnd()*12; x.moveTo(px, py); x.lineTo(px + (rnd() - 0.5)*10, py - 10 - rnd()*14); } stroke(x, "#1c1c1c", 3);
    const tower = (b0, b1, t0, t1, y0, y1) => poly(x, [[t0, y0], [t1, y0], [b1, y1], [b0, y1]]);
    tower(206, 294, 222, 278, 150, 372); x.fillStyle = "#e8e8e8"; x.fill();
    for (const [y0, y1] of [[190, 230], [270, 310], [340, 372]]){ const at = y => [222 - (y - 150)/222*16, 278 + (y - 150)/222*16]; const [a0, a1] = at(y0), [c0, c1] = at(y1); poly(x, [[a0, y0], [a1, y0], [c1, y1], [c0, y1]]); x.fillStyle = "#3a3a3a"; x.fill(); }
    x.fillStyle = "#2a2a2a"; x.fillRect(210, 138, 80, 14); x.fillRect(222, 90, 56, 6);
    x.fillStyle = "#ffffff"; x.fillRect(228, 96, 44, 42);
    poly(x, [[216, 92], [284, 92], [250, 60]]); x.fillStyle = "#2a2a2a"; x.fill();
    for (const s of [-1, 1]){ g = x.createLinearGradient(250, 116, 250 + s*520, 116); g.addColorStop(0, "rgba(255,255,255,0.75)"); g.addColorStop(1, "rgba(255,255,255,0)");
      poly(x, [[250, 112], [250 + s*520, 60], [250 + s*520, 190], [250, 122]]); x.fillStyle = g; x.fill(); }
    poly(x, [[300, 372], [300, 330], [340, 304], [380, 330], [380, 376]]); x.fillStyle = "#3a3a3a"; x.fill();
    x.fillStyle = "#f4f4f4"; x.fillRect(328, 340, 16, 16);
    x.beginPath(); for (const [bx, by, s] of [[520, 170, 14], [560, 200, 10], [590, 160, 8], [450, 230, 9]]){ x.moveTo(bx - s, by); x.quadraticCurveTo(bx - s/2, by - s*0.7, bx, by); x.quadraticCurveTo(bx + s/2, by - s*0.7, bx + s, by); } stroke(x, "#202020", 3.5);
  } };

  /* ---- a lithophane lamp: a panorama round the cylinder, night over a lake ---- */
  A.nightLake = { name:"Night lake", w:1650, h:600, draw(x, W, H){
    const rnd = rng(19), hor = 390;
    let g = x.createLinearGradient(0, 0, 0, hor); g.addColorStop(0, "#1a1a1a"); g.addColorStop(0.6, "#555555"); g.addColorStop(1, "#b0b0b0");
    x.fillStyle = g; x.fillRect(0, 0, W, hor);
    g = x.createRadialGradient(1180, 120, 30, 1180, 120, 260); g.addColorStop(0, "rgba(255,255,255,0.7)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, W, hor);
    circle(x, 1180, 120, 50); fill(x, "#ffffff");
    x.beginPath(); for (let k = 0; k < 160; k++){ const sx = rnd()*W, sy = rnd()*300; if (Math.hypot(sx - 1180, sy - 120) > 90) circle(x, sx, sy, 1.2 + rnd()*rnd()*3.5, false); } fill(x, "#ffffff");
    poly(x, ridge(rnd, [[0, 280], [160, 200], [330, 250], [520, 150], [700, 240], [900, 190], [1080, 260], [1300, 170], [1480, 240], [1650, 280]], 40, 5).concat([[1650, hor], [0, hor]]));
    x.fillStyle = "#7c7c7c"; x.fill();
    poly(x, ridge(rnd, [[0, 330], [220, 270], [420, 320], [640, 260], [880, 330], [1100, 280], [1350, 330], [1650, 300]], 30, 5).concat([[1650, hor], [0, hor]]));
    x.fillStyle = "#4e4e4e"; x.fill();
    x.beginPath(); for (let k = 0; k < 70; k++){ const tx = k*24 + rnd()*14, h = 26 + rnd()*40; pine(x, tx, hor + 2, h, h*0.42, 4, false); } x.fillStyle = "#2c2c2c"; x.fill();
    // the lake: a darker, softer copy of the sky, and the moon's path on it
    g = x.createLinearGradient(0, hor, 0, H); g.addColorStop(0, "#8e8e8e"); g.addColorStop(1, "#2a2a2a"); x.fillStyle = g; x.fillRect(0, hor, W, H - hor);
    x.beginPath(); for (let k = 0; k < 22; k++){ const y = hor + 8 + k*k*0.42, w = 20 + k*6 + rnd()*18; x.rect(1180 - w/2 + (rnd() - 0.5)*24, y, w, 2 + k*0.2); } x.fillStyle = "rgba(255,255,255,0.8)"; x.fill();
    x.beginPath(); for (let k = 0; k < 20; k++){ const tx = 30 + rnd()*1590, h = 30 + rnd()*30; x.rect(tx - 1, hor + 4, 2, h*0.4); } x.fillStyle = "rgba(40,40,40,0.4)"; x.fill();
    // the near shore with tall pines, and a cabin with a warm window
    smooth(x, [[0, 540], [240, 500], [520, 530], [700, 560], [900, 600], [0, 600]], true); x.fillStyle = "#101010"; x.fill();
    smooth(x, [[1000, 600], [1250, 560], [1450, 520], [1650, 540], [1650, 600]], true); x.fillStyle = "#101010"; x.fill();
    x.beginPath(); for (const [tx, h] of [[60, 300], [140, 230], [210, 270], [1480, 280], [1560, 330], [1620, 220], [620, 150]]) pine(x, tx, 560, h, h*0.42, 6, false); x.fillStyle = "#0a0a0a"; x.fill();
    poly(x, [[330, 530], [330, 480], [385, 440], [440, 480], [440, 530]]); x.fillStyle = "#0a0a0a"; x.fill();
    x.fillStyle = "#ffffff"; x.fillRect(372, 486, 24, 22);
    g = x.createRadialGradient(384, 497, 4, 384, 497, 70); g.addColorStop(0, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(300, 420, 170, 160);
  } };

  /* ---- lid logos for the project boxes ---- */
  A.gearBolt = { name:"Gear and bolt", w:420, h:420, draw(x){
    const GOLD = "#edae49", CR = "#f4f1ea", cx = 210, cy = 210;
    x.beginPath(); const teeth = 10;
    for (let k = 0; k < teeth*2; k++){ const a0 = k*Math.PI/teeth, a1 = (k + 1)*Math.PI/teeth, r = k % 2 ? 170 : 205;
      const f = k % 2 ? 0 : 0.12; x[k ? "lineTo" : "moveTo"](cx + Math.cos(a0 + f)*r, cy + Math.sin(a0 + f)*r); x.lineTo(cx + Math.cos(a1 - f)*r, cy + Math.sin(a1 - f)*r); }
    x.closePath(); circle(x, cx, cy, 128, false); x.fillStyle = GOLD; x.fill("evenodd");
    bolt(x, cx, cy, 220); fill(x, CR);
  } };
  A.battery = { name:"Battery", w:440, h:240, draw(x){
    const GOLD = "#edae49", CR = "#f4f1ea";
    rrect(x, 16, 20, 372, 200, 34); rrect(x, 46, 50, 312, 140, 14, false); x.fillStyle = CR; x.fill("evenodd");
    rrect(x, 388, 82, 38, 76, 10); fill(x, CR);
    x.save(); x.translate(202, 120); x.rotate(Math.PI/2); bolt(x, 0, 0, 230); x.restore(); fill(x, GOLD);
  } };

  /* ---- a phone case back: a retro sunset with palms ---- */
  A.retroSunset = { name:"Retro sunset", w:600, h:1000, draw(x, W, H){
    const DARK = "#2b2d42", CR = "#f4f1ea", COR = "#ef476f", GOLD = "#ffd166";
    ellipseBand(x, 300, 520, 250, 250, 200, 560); fill(x, GOLD);
    ellipseBand(x, 300, 520, 250, 250, 560, 780); fill(x, COR);      // the lower half of the sun turns coral
    x.save(); x.globalCompositeOperation = "destination-out"; x.beginPath();
    for (let k = 0; k < 7; k++){ const y = 520 + k*34, h = 6 + k*3.2; x.rect(0, y, W, h); } x.fillStyle = "#000"; x.fill(); x.restore();
    x.beginPath(); for (let k = 0; k < 5; k++){ const y = 800 + k*42, w = 540 - k*60; x.moveTo(300 - w/2, y); for (let i = 0; i <= 8; i++) x.quadraticCurveTo(300 - w/2 + (i + 0.5)*w/8, y - 14, 300 - w/2 + (i + 1)*w/8, y); } stroke(x, CR, 10);
    x.beginPath(); for (const [sx, sy, r] of [[90, 140, 16], [480, 90, 22], [540, 300, 12], [70, 400, 12], [260, 70, 10], [400, 200, 9]]) star(x, sx, sy, r, r*0.4, 4, 0, false); fill(x, CR);
    // two palm trees
    const palm = (bx, by, top, lean) => {
      x.beginPath(); x.moveTo(bx - 16, by); x.quadraticCurveTo(bx + lean*0.3, (by + top)/2, bx + lean - 8, top); x.lineTo(bx + lean + 8, top); x.quadraticCurveTo(bx + lean*0.3 + 22, (by + top)/2, bx + 16, by); x.closePath(); fill(x, DARK);
      const tx = bx + lean, ty = top; x.beginPath();
      for (const [a, len] of [[-2.7, 190], [-2.2, 170], [-1.5, 120], [-0.9, 170], [-0.4, 190], [0.3, 150], [2.8, 150]]){
        const ex = tx + Math.cos(a)*len, ey = ty + Math.sin(a)*len*0.7 + len*0.25, mx = tx + Math.cos(a)*len*0.5, my = ty + Math.sin(a)*len*0.5 - 30;
        x.moveTo(tx, ty); x.quadraticCurveTo(mx - Math.sin(a)*22, my + 14, ex, ey); x.quadraticCurveTo(mx + Math.sin(a)*22, my - 10, tx, ty); x.closePath(); }
      fill(x, DARK);
      circle(x, tx - 8, ty + 14, 12); circle(x, tx + 12, ty + 16, 12, false); fill(x, DARK);
    };
    palm(120, 990, 470, 60); palm(500, 990, 620, -50);
  } };

  /* ---- a flat shape: a fox sticker ---- */
  A.fox = { name:"Fox", w:600, h:600, draw(x){
    const K = "#22303c", OR = "#e76f51", CR = "#f4f1ea";
    poly(x, [[300, 520], [120, 330], [90, 90], [230, 200], [300, 180], [370, 200], [510, 90], [480, 330]]);
    x.lineJoin = "round"; fill(x, OR); x.lineWidth = 30; x.strokeStyle = OR; x.stroke();
    poly(x, [[122, 130], [210, 212], [150, 250]]); poly(x, [[478, 130], [390, 212], [450, 250]], false); fill(x, K);
    x.beginPath(); x.moveTo(300, 530); x.lineTo(140, 360); x.quadraticCurveTo(220, 340, 300, 400); x.quadraticCurveTo(380, 340, 460, 360); x.closePath(); fill(x, CR);
    ellipse(x, 222, 312, 22, 30, -0.4); ellipse(x, 378, 312, 22, 30, 0.4, false); fill(x, K);
    circle(x, 230, 302, 8); circle(x, 386, 302, 8, false); fill(x, CR);
    ellipse(x, 300, 500, 36, 26); fill(x, K);
  } };

  /* ---- a plaque: a topographic map, contour lines coloured by height ---- */
  A.topo = { name:"Contour map", w:900, h:700, async draw(x, W, H){
    const TEAL = "#2a9d8f", GOLD = "#e9c46a", CR = "#f4f1ea", G = 5, gw = Math.ceil(W/G) + 1, gh = Math.ceil(H/G) + 1;
    const peaks = [[340, 280, 140, 1], [660, 380, 100, 0.74], [200, 520, 80, 0.28], [740, 130, 70, 0.22]];
    const h = new Float32Array(gw*gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++){
      const px = i*G, py = j*G; let v = 0.025*Math.sin(px/60 + py/95) + 0.02*Math.cos(px/38 - py/52);
      for (const [cx, cy, r, a] of peaks) v += a*Math.exp(-((px - cx)**2 + (py - cy)**2)/(2*r*r));
      h[j*gw + i] = v;
    }
    const levels = 12, lo = 0.07, hi = 1.0;
    for (let L = 0; L < levels; L++){
      const iso = lo + (hi - lo)*L/levels; x.beginPath();
      for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++){
        const v = [h[j*gw + i], h[j*gw + i + 1], h[(j + 1)*gw + i + 1], h[(j + 1)*gw + i]], P = [[i*G, j*G], [(i + 1)*G, j*G], [(i + 1)*G, (j + 1)*G], [i*G, (j + 1)*G]];
        const cut = [];
        for (let e = 0; e < 4; e++){ const a = v[e], b = v[(e + 1) % 4]; if ((a < iso) !== (b < iso)){ const t = (iso - a)/(b - a), p = P[e], q = P[(e + 1) % 4]; cut.push([p[0] + (q[0] - p[0])*t, p[1] + (q[1] - p[1])*t]); } }
        for (let c = 0; c + 1 < cut.length; c += 2){ x.moveTo(cut[c][0], cut[c][1]); x.lineTo(cut[c + 1][0], cut[c + 1][1]); }
      }
      stroke(x, L < 4 ? TEAL : L < 8 ? GOLD : CR, L % 4 === 3 ? 12 : 7);
    }
    // clear room for the name and the compass
    x.save(); x.globalCompositeOperation = "destination-out"; x.beginPath(); rrect(x, 26, 560, 330, 118, 18, false); circle(x, 806, 598, 74, false); x.fillStyle = "#000"; x.fill(); x.restore();
    x.beginPath(); circle(x, 340, 280, 10, false); circle(x, 660, 380, 9, false); fill(x, CR);
    poly(x, [[806, 548], [830, 622], [806, 604], [782, 622]]); fill(x, CR);
    circle(x, 806, 598, 58); stroke(x, CR, 7);
    await font(x, 700, 58, "Oswald"); x.fillStyle = CR; x.textAlign = "left"; x.textBaseline = "alphabetic"; x.fillText("MAKER PEAK", 46, 662);
    await font(x, 700, 30, "Oswald"); x.fillStyle = GOLD; x.fillText("1 842 M  ·  46°N 8°E", 48, 600);
    keepInside(x, W, H, () => rrect(x, 8, 8, W - 16, H - 16, 30, false));
  } };

  /* ---- a pot of cacti, for a cylinder ---- */
  A.cacti = { name:"Cactus garden", w:800, h:600, draw(x){
    const GREEN = "#4f8a4b", TERRA = "#c8553d", PINK = "#f28fad", CR = "#f4ecdf";
    const pot = (cx, top, w, h) => { poly(x, [[cx - w/2, top + 30], [cx + w/2, top + 30], [cx + w*0.4, top + h], [cx - w*0.4, top + h]]); fill(x, TERRA); rrect(x, cx - w/2 - 12, top, w + 24, 40, 8); fill(x, TERRA);
      x.beginPath(); x.moveTo(cx - w*0.3, top + 70); x.lineTo(cx + w*0.3, top + 70); stroke(x, CR, 8); };
    // a tall one with arms
    x.beginPath(); rrect(x, 180, 110, 70, 310, 35, false); rrect(x, 110, 220, 50, 120, 25, false); rrect(x, 130, 310, 90, 44, 22, false); rrect(x, 270, 170, 50, 120, 25, false); rrect(x, 220, 262, 90, 44, 22, false); fill(x, GREEN);
    x.beginPath(); for (const px of [200, 230]){ x.moveTo(px, 140); x.lineTo(px, 400); } stroke(x, CR, 5);
    pot(215, 400, 190, 180);
    // a round one with a flower
    x.beginPath(); ellipse(x, 430, 340, 95, 82, 0, false); fill(x, GREEN);
    x.beginPath(); for (const a of [-0.6, -0.2, 0.2, 0.6]){ x.moveTo(430 + a*120, 270); x.quadraticCurveTo(430 + a*150, 340, 430 + a*110, 410); } stroke(x, CR, 5);
    x.beginPath(); for (let k = 0; k < 6; k++){ const a = k*TAU/6; ellipse(x, 430 + Math.cos(a)*26, 250 + Math.sin(a)*26, 26, 14, a, false); } fill(x, PINK); circle(x, 430, 250, 13); fill(x, CR);
    pot(430, 400, 200, 180);
    // a paddle one
    x.beginPath(); ellipse(x, 640, 330, 58, 90, 0, false); ellipse(x, 590, 220, 40, 60, -0.5, false); ellipse(x, 700, 210, 40, 62, 0.45, false); fill(x, GREEN);
    x.beginPath(); for (const [px, py] of [[630, 300], [650, 360], [620, 390], [660, 280], [590, 210], [700, 200], [715, 240]]) circle(x, px, py, 5, false); fill(x, CR);
    x.beginPath(); for (const [px, py] of [[590, 158], [712, 148]]) circle(x, px, py, 16, false); fill(x, PINK);
    pot(640, 400, 180, 180);
  } };

  /* ---- a coaster: a bee on honeycomb ---- */
  A.bee = { name:"Honey bee", w:620, h:620, draw(x, W, H){
    const DARK = "#2b2118", CR = "#fff8e7", AMBER = "#c9731c", HONEY = "#f4b942", cx = 310, cy = 310;
    x.beginPath();
    const r = 44, dx = r*Math.sqrt(3);
    for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++){
      const hx = cx + i*dx + (j % 2 ? dx/2 : 0), hy = cy + j*r*1.5, d = Math.hypot(hx - cx, hy - cy);
      if (d > 280 || d < 60) continue;
      const pts = []; for (let k = 0; k < 6; k++){ const a = Math.PI/6 + k*Math.PI/3; pts.push([hx + Math.cos(a)*(r - 8), hy + Math.sin(a)*(r - 8)]); }
      poly(x, pts, false);
    }
    stroke(x, AMBER, 9);
    // the bee: wings, body with stripes, head, feelers
    x.beginPath(); ellipse(x, cx - 70, cy - 90, 70, 44, -0.9, false); ellipse(x, cx + 70, cy - 90, 70, 44, 0.9, false); fill(x, CR);
    x.beginPath(); ellipse(x, cx - 70, cy - 90, 70, 44, -0.9, false); ellipse(x, cx + 70, cy - 90, 70, 44, 0.9, false); stroke(x, DARK, 8);
    ellipse(x, cx, cy + 20, 92, 118); fill(x, HONEY);
    x.beginPath(); for (const [y, w] of [[-10, 26], [50, 26], [106, 20]]) ellipseBand(x, cx, cy + 20, 92, 118, cy + y, cy + y + w, false); fill(x, DARK);
    ellipse(x, cx, cy + 20, 92, 118); stroke(x, DARK, 9);
    poly(x, [[cx, cy + 162], [cx - 16, cy + 132], [cx + 16, cy + 132]]); fill(x, DARK);
    circle(x, cx, cy - 106, 58); fill(x, DARK);
    circle(x, cx - 22, cy - 116, 12); circle(x, cx + 22, cy - 116, 12, false); fill(x, CR);
    x.beginPath(); x.moveTo(cx - 20, cy - 158); x.quadraticCurveTo(cx - 40, cy - 210, cx - 70, cy - 214); x.moveTo(cx + 20, cy - 158); x.quadraticCurveTo(cx + 40, cy - 210, cx + 70, cy - 214); stroke(x, DARK, 9);
    circle(x, cx - 72, cy - 214, 12); circle(x, cx + 72, cy - 214, 12, false); fill(x, DARK);
  } };

  return A;
})();

/* Which example goes with which Start button: the picture, its width on the model (mm), settings for the
   picture and the object, and filaments picked to match the drawing (applied only while nobody has
   changed the filaments). paint: painter steps for the shapes that show off the painter instead. view: how
   the example is shown ("flip": turned over, when the picture is on the side that prints on the bed;
   "layout": the parts laid out as they print). */
const EXAMPLES = {
  "Name keychain":   { art:"ladybug", base:{ nameplate:{ pic:{ on:true, item:0, side:"left", size:1.15, colour:true, gap:2, cutout:false } } } },
  "Double-sided tag":{ art:"moon", base:{ nameplate:{ pic:{ on:true, item:0, side:"right", size:1, colour:true, gap:1.5, cutout:false } } } },
  "Iron-on patch":   { art:"patch", width:68, slots:[["#1d3557","Navy"],["#f4f1ea","Cream"],["#f2a541","Marigold"],["#2a9d8f","Teal"]] },
  "Car badge":       { art:"wings", width:92, slots:[["#16181d","Black"],["#c9ccd1","Silver"],["#d62839","Red"],["#5c6670","Gunmetal"]] },
  "Ornament":        { art:"xmas", width:54, slots:[["#b3122b","Red"],["#f7f7f2","Snow"],["#1f7a4d","Green"],["#e0b43c","Gold"]] },
  "Tea light":       { art:"forestSilhouette", width:60, item:{ mode:"flat", height:1.2, quality:"high" }, slots:[["#f3eee4","Ivory"],["#2b2d42","Night blue"]],
    note:"Here the forest is printed in a dark filament: lit from inside, it stands out black against the glow. A photo works too, as a relief that glows through its thin parts." },
  "Plastic canvas":  { art:"pixelCat", slots:[["#f4f1ea","Cream"],["#22303c","Charcoal"],["#d1495b","Red"],["#edae49","Ginger"]] },
  "Bobble head":     { art:"face", width:30, item:{ mode:"flat", height:0.6, quality:"high" },
    slots:[["#f2c9a0","Skin"],["#2b2d42","Navy"],["#e07a5f","Coral"],["#6b4226","Brown"]] },
  "Cookie cutter":   { art:"gingerbread", width:80 },
  "Trace a part":    { art:"bracket", base:{ tracer:{ size:80 } } },
  "Lightbox":        { art:"sunsetHills", view:"layout", slots:[["#f6f4ee","Diffuser"],["#241f1c","Frame"],["#d1495b","Red"],["#edae49","Gold"]] },
  "Circuit board":   { art:"ledHeart", slots:[["#0f5132","Solder mask"],["#e8c26a","Copper"],["#f2f4f3","Silkscreen"]] },
  "Photo frame":     { art:"garland", width:110, slots:[["#f4f1ea","Cream"],["#3d405b","Navy"],["#e07a5f","Coral"],["#81b29a","Sage"]] },
  "Jigsaw puzzle":   { art:"balloons", slots:[["#8ecae6","Sky blue"],["#fdf0d5","Cream"],["#e63946","Red"],["#2a9d8f","Green"]] },
  "Kids' puzzle":    { art:"whale", slots:[["#bde0fe","Pale blue"],["#219ebc","Sea blue"],["#023047","Navy"],["#ffb703","Sunflower"]] },
  "Lithophane":      { art:"lighthouse", slots:[["#f7f5ef","White"]] },
  "Lithophane lamp": { art:"nightLake", slots:[["#f7f5ef","White"]] },
  "Project box":     { art:"gearBolt", view:"flip", base:{ enclosure:{ logo:{ on:true, mode:"inlay", width:30, x:0, y:0, depth:0.6 } } },
    slots:[["#f4f1ea","Cream"],["#22303c","Charcoal"],["#d1495b","Red"],["#edae49","Gold"]] },
  "Power bank box":  { art:"battery", view:"flip", base:{ enclosure:{ logo:{ on:true, mode:"inlay", width:40, x:0, y:0, depth:0.6 } } },
    slots:[["#f4f1ea","Cream"],["#22303c","Charcoal"],["#d1495b","Red"],["#edae49","Gold"]] },
  "Phone case":      { art:"retroSunset", view:"flip", base:{ phonecase:{ logo:{ on:true, mode:"inlay", width:54, x:0, y:-25, depth:0.6 } } },
    slots:[["#2b2d42","Black TPU"],["#f4f1ea","Cream TPU"],["#ef476f","Coral TPU"],["#ffd166","Yellow TPU"]] },
  // objects that have no quick start of their own
  "Flat shape":      { art:"fox", width:52, base:{ board:{ shape:"circle", w:64, thick:2, hole:false } }, slots:[["#f4f1ea","Cream"],["#22303c","Charcoal"],["#e76f51","Fox orange"],["#2a9d8f","Teal"]] },
  "Plaque":          { art:"topo", width:86, slots:[["#1f2a33","Slate"],["#2a9d8f","Teal"],["#e9c46a","Gold"],["#f4f1ea","Cream"]] },
  "Cactus pot":      { art:"cacti", width:56, slots:[["#f4ecdf","Cream"],["#4f8a4b","Green"],["#c8553d","Terracotta"],["#f28fad","Pink"]] },
  "Coaster":         { art:"bee", width:62, place:"top", slots:[["#f4b942","Honey"],["#2b2118","Dark brown"],["#fff8e7","Cream"],["#c9731c","Amber"]] },
  "Vase":            { slots:[["#264653","Deep teal"],["#2a9d8f","Teal"],["#e9c46a","Gold"],["#f4a261","Apricot"]],
    paint:[ { k:"gradient", a:0, b:1, from:20, to:32, ends:true }, { k:"stripes", slot:2, gap:255, from:50, to:78, every:6, width:2.5 },
      { k:"stripes", slot:3, gap:255, from:81, to:91, every:20, width:10 } ] },
  "Planet":          { slots:[["#1d6fa3","Ocean"],["#3a9d5d","Green"],["#f4f1ea","Ice"],["#e9c46a","Sand"]],
    paint:[ { k:"noise", slots:[0, 0, 0, 3, 1, 1, 0], scale:14, seed:4 }, { k:"stripes", slot:2, gap:255, from:67.3, to:71, every:20, width:4 }, { k:"stripes", slot:2, gap:255, from:-1, to:2.7, every:20, width:4 } ] }
};
// the example each object opens with (the quick starts use their own name)
const EXAMPLE_FOR_TYPE = { nameplate:"Name keychain", board:"Flat shape", frame:"Photo frame", box:"Plaque", tracer:"Trace a part", lithophane:"Lithophane",
  jigsaw:"Jigsaw puzzle", cutter:"Cookie cutter", pcb:"Circuit board", lightbox:"Lightbox", canvas:"Plastic canvas", bobble:"Bobble head", shell:"Tea light",
  turned:"Vase", enclosure:"Project box", phonecase:"Phone case", cylinder:"Cactus pot", hex:"Coaster", sphere:"Planet" };
