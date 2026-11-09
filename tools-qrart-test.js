// A QR code on anything (Session 65): the Art tab's "A QR code" on a name plate and a plain box, read back with jsQR from the
// printed geometry (the top of every part rasterised, each in its filament's lightness), its settings saved, a hostile one.
//   node tools-qrart-test.js index.html
const jsQR = require("jsqr");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(1500);
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length;
  const settle = async () => { for (let i = 0; i < 40 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 4000 && MF.busy; i++) await sleep(30); await sleep(200); };
  const lum = hex => { const v = parseInt(hex.slice(1), 16); return 0.299*(v >> 16 & 255) + 0.587*(v >> 8 & 255) + 0.114*(v & 255); };
  // the model seen from above: the highest top-facing triangle at each pixel, in its filament's lightness
  const topImage = (px = 8) => {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    MF.parts.forEach(p => { const P = p.solid.pos; for (let i = 0; i < P.length; i += 3){ x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); z0 = Math.min(z0, P[i + 2]); z1 = Math.max(z1, P[i + 2]); } });
    const w = Math.ceil((x1 - x0)*px) + 2, h = Math.ceil((z1 - z0)*px) + 2, depth = new Float32Array(w*h).fill(-1e9), img = new Uint8ClampedArray(w*h*4).fill(255);
    for (const p of MF.parts){
      const P = p.solid.pos, X = p.solid.idx, L = lum(MF.state.slots[p.slot].hex);
      for (let t = 0; t < X.length; t += 3){
        const a = X[t]*3, b = X[t + 1]*3, c = X[t + 2]*3;
        const ny = (P[b + 2] - P[a + 2])*(P[c] - P[a]) - (P[b] - P[a])*(P[c + 2] - P[a + 2]); if (ny <= 1e-9) continue;
        const pt = k => [(P[k] - x0)*px + 1, (P[k + 2] - z0)*px + 1], A = pt(a), B = pt(b), Cc = pt(c), y = Math.max(P[a + 1], P[b + 1], P[c + 1]);
        const area = (B[0] - A[0])*(Cc[1] - A[1]) - (B[1] - A[1])*(Cc[0] - A[0]); if (Math.abs(area) < 1e-12) continue;
        for (let j = Math.max(0, Math.floor(Math.min(A[1], B[1], Cc[1]))); j <= Math.min(h - 1, Math.ceil(Math.max(A[1], B[1], Cc[1]))); j++)
          for (let i = Math.max(0, Math.floor(Math.min(A[0], B[0], Cc[0]))); i <= Math.min(w - 1, Math.ceil(Math.max(A[0], B[0], Cc[0]))); i++){
            const qx = i + 0.5, qy = j + 0.5, u = ((B[0] - qx)*(Cc[1] - qy) - (B[1] - qy)*(Cc[0] - qx))/area, v = ((Cc[0] - qx)*(A[1] - qy) - (Cc[1] - qy)*(A[0] - qx))/area;
            if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6 || y < depth[j*w + i]) continue;
            depth[j*w + i] = y; const o = (j*w + i)*4; img[o] = img[o + 1] = img[o + 2] = L; img[o + 3] = 255; }
      }
    }
    return { img, w, h };
  };
  const read = () => { const { img, w, h } = topImage(); const r = jsQR(img, w, h, { inversionAttempts:"attemptBoth" }); return r ? r.data : null; };
  const pick = async obj => { const sel = document.querySelector("#objectSel"); sel.value = obj; sel.dispatchEvent(new win.Event("change")); await settle(); };
  const art = async () => { [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "art").click(); await sleep(80); };
  const press = async re => { const b = [...document.querySelectorAll("#panel button")].find(b => re.test(b.textContent)); if (!b) { check(false, `a button ${re}`); return; } b.click(); await settle(); };

  for (const [obj, text, width] of [["nameplate", "https://forge.retr0plus.se/q", 34], ["box", "HELLO 123", 26]]) {
    console.log(`\non a ${obj}`);
    await pick(obj); await art(); await press(/^A QR code$/);
    const it = MF.state.items[MF.state.active];
    it.qr.text = text; it.width = width; it.qr = Object.assign({}, it.qr); it.solids = null; MF.render && MF.render(); MF.rebuild(false); await settle();
    const closed = MF.parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan; });
    const got = read();
    check(it.name === "QR code" && closed, "a QR code item, the model closed", MF.parts.map(p => p.name).join(", "));
    check(got === text, "it reads back from the printed geometry", JSON.stringify(got));
  }

  console.log("\nsaved and opened again; a hostile one");
  {
    const s0 = JSON.parse(MF.projectPayload()).state, it0 = s0.items.find(x => x.qr && x.qr.text === "HELLO 123");
    check(it0 && it0.qr.text === "HELLO 123" && !("_qrSig" in it0), "a project keeps the code's text, not its drawing");
    it0.qr = { text:"x".repeat(5000) + "<script>", ec:"Z", quiet:"no", evil:1 };
    const f = new win.File([JSON.stringify({ app:"Maker Forge", v:6, state:s0 })], "h.json", { type:"application/json" }), inp = document.querySelector("#projInput"), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change")); for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); await settle();
    const q = (MF.state.items.find(x => x.qr && /^xxx/.test(x.qr.text)) || {}).qr || {};
    check(q.text && q.text.length === 300 && !/[<>]/.test(q.text) && q.ec === "M" && q.quiet === true && !("evil" in q), "hostile text cut to 300 letters, markup out, settings safe", JSON.stringify({ n:(q.text || "").length, ec:q.ec, quiet:q.quiet }));
  }

  check(env.errors.length === e0, "no page errors", env.errors.slice(e0).join(" | "));
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
