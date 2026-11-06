// The icon maker and AI help (Session 49): every icon draws in its filament's colour; an icon on a keychain and on a box's
// lid; it follows the filament colours; a project and a share link keep it, a hostile one is cleaned; "Describe your
// project" from the words alone and from an AI's plan (a stand-in: no key, nothing sent); the requests made to Claude and
// to Ollama (a stand-in fetch); the key never in a project; the panels.
//   node tools-iconai-test.js index.html
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };
(async () => {
  const env = require("./tools-test-env.js")(process.argv[2] || "index.html");
  const win = env.window, document = win.document, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function settle() {
    const MF = win.MakerForge, r0 = MF.rev;
    for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30);
    for (let i = 0; i < 3000; i++) { if (!MF.busy) { await sleep(40); if (!MF.busy) return true; } await sleep(25); }
    return false;
  }
  await sleep(900);
  const MF = win.MakerForge, C = MF.core, e0 = env.errors.length, IC = MF.icons, AIs = MF.ai;
  const closed = parts => parts.every(p => { const r = C.checkMesh(p.solid); return r.open === 0 && !r.nan && C.signedVolume(p.solid) > 0; });
  const bad = I => I.warn.filter(w => /does not fit|overlaps|screw post|left out|behind the lid|too tall|off the|runs past/i.test(w.t));
  const inp = document.querySelector("#projectInput") || document.querySelector('input[accept*="json"]');
  const openFile = async text => { const f = new win.File([text], "p.json", { type:"application/json" }), r0 = MF.rev;
    Object.defineProperty(inp, "files", { value:[f], configurable:true }); inp.dispatchEvent(new win.Event("change"));
    for (let i = 0; i < 100 && MF.rev === r0; i++) await sleep(30); return settle(); };
  const hexes = () => MF.state.slots.map(s => s.hex.toLowerCase());
  const colours = cv => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data, m = new Map();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250){ const k = "#" + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, "0")).join(""); m.set(k, (m.get(k) || 0) + 1); }
    return m; };

  console.log("the icons");
  {
    const keys = Object.keys(IC.list), empty = [], stray = [];
    for (const k of keys){
      const cv = IC.canvas({ badge:{ shape:"none" }, layers:[{ icon:k, slot:1 }] }, 120), m = colours(cv), n = [...m.values()].reduce((a, b) => a + b, 0);
      if (n < 120*120*0.03) empty.push(k);
      for (const [c, v] of m) if (c !== hexes()[1] && v > n*0.02) stray.push(`${k}:${c}`);
    }
    check(!empty.length && keys.length >= 50, `all ${keys.length} icons draw, each at least 3% of its square`, empty.join(", ") || "");
    check(!stray.length, "each draws only in its filament's colour", stray.slice(0, 4).join(", "));
    const r = IC.idea(IC.ideas[1][1]), cv = IC.canvas(r, 300), m = colours(cv), want = [r.badge.slot, ...r.layers.map(L => L.slot)].map(k => hexes()[k]);
    check(want.every(h => (m.get(h) || 0) > 300), "an idea of two icons on a badge: the badge's and both icons' colours all there", want.join(" "));
    const lab = IC.canvas(Object.assign({}, r, { label:{ text:"12 V", slot:1 } }), 300);
    check(lab.height > lab.width && lab.width === 300, "a word under it makes the picture taller", `${lab.width} × ${lab.height}`);
  }

  console.log("\nan icon on a plate");
  {
    const sel = document.querySelector("#objectSel"); sel.value = "board"; sel.dispatchEvent(new win.Event("change")); await settle(); MF.examples.drop(); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "art").click(); await sleep(60);
    const btn = [...document.querySelectorAll("#panel button")].find(b => /Make an icon/.test(b.textContent));
    btn && btn.click(); await sleep(200); await settle();
    const it = MF.state.items[MF.state.active];
    check(btn && it && it.icon && it.icon.layers.length === 1, "Make an icon on the Art tab adds an icon", it && it.name);
    const grp = !!document.querySelector("#panel .iconideas") && !!document.querySelector("#panel .iconpick");
    check(grp, "its Icon settings show");
    // an idea, then a new icon from the grid
    [...document.querySelectorAll("#panel .iconideas button")].find(b => b.textContent === "Smart home").click(); await sleep(50);
    check(MF.state.items[MF.state.active].icon.layers.map(L => L.icon).join() === "home,wifi", "an idea fills the recipe in", MF.state.items[MF.state.active].icon.layers.map(L => L.icon).join());
    document.querySelector("#panel .iconpick").click(); await sleep(50);
    const s2 = document.querySelector("#panel .icongrid input"); s2.value = "fan"; s2.dispatchEvent(new win.Event("input")); await sleep(20);
    const fb = document.querySelector('#panel .icongrid button[data-k="fan"]'); fb && fb.click(); await sleep(50); await settle();
    check(MF.state.items[MF.state.active].icon.layers[0].icon === "fan", "searching the grid for \"fan\" and picking it", MF.state.items[MF.state.active].icon.layers[0].icon);
    const d = MF.state.items[MF.state.active];
    check(d.solids && d.solids.length >= 2 && closed(MF.parts), "it prints on the plate in its colours", d.solids && `${d.solids.length} colour pieces`);
    // filament colours change: the picture follows
    const before = d.src; MF.state.slots[1].hex = "#00aa44"; MF.rebuild(false); await settle();
    check(d.src !== before && colours(d.src).has("#00aa44"), "a filament's colour changed: the icon is drawn again in it");
  }

  console.log("\nprojects, links and hostile files");
  {
    const prj = JSON.parse(MF.projectPayload()).state;
    const kept = prj.items.find(i => i.icon);
    check(kept && kept.icon.layers.length === 2 && !kept.src && !kept._iconSig, "a project keeps the recipe, not the picture", kept && JSON.stringify(kept.icon).length + " characters");
    const link = await MF.shareLink(); check(/#[pj]=/.test(link.url) && link.pics === 0, "a share link carries the icon (it is no picture)", `${link.pics} pictures left out`);
    const hostile = { app:"Maker Forge", v:6, state:Object.assign(JSON.parse(JSON.stringify(prj)), { items:[{ name:"x", icon:{ badge:{ shape:"<svg>", slot:99, ring:"yes" },
      layers:Array.from({ length:9 }, (_, i) => ({ icon:i ? "fan" : "nope", slot:-5, size:1e9, x:"1;alert(1)", y:-40, rot:9999 })), label:{ text:"<img src=x onerror=alert(1)>LONG LONG LONG LONG", slot:"2" } } }] }) };
    await openFile(JSON.stringify(hostile)); const clean = (MF.state.items.find(i => i.icon) || {}).icon || {};
    if (!clean.layers) clean.layers = [], clean.badge = {}, clean.label = { text:"" };
    check(clean.badge.shape === "circle" && clean.badge.slot <= 7 && clean.badge.ring === false && clean.layers.length === 4 && clean.layers.every(L => L.icon === "fan" && L.size === 1.4 && L.x === 0 && L.y === -1 && L.rot === 180 && L.slot === 0)
      && !/[<>]/.test(clean.label.text) && clean.label.text.length <= 16, "a hostile icon: shapes, numbers and words cleaned, unknown icons and the fifth on dropped", JSON.stringify(clean.layers[0]) + " " + JSON.stringify(clean.label.text));
  }

  console.log("\nan icon on a project box's lid");
  {
    const sel = document.querySelector("#objectSel"); sel.value = "enclosure"; sel.dispatchEvent(new win.Event("change")); await settle();
    MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[], w:100, d:70, h:35, lid:"screw" });
    MF.state.base.enclosure.logo = Object.assign(MF.state.base.enclosure.logo || {}, { on:true, width:36, x:0, y:0 });
    const it = await IC.add(IC.idea(IC.ideas[0][1])); MF.rebuild(false); await settle();
    const I = MF.enclosure, lid = MF.parts.filter(p => /lid/i.test(p.name));
    check(!I.warn.some(w => /No logo|Logo left off/.test(w.t)) && closed(MF.parts) && MF.parts.length >= 3, "inlaid into the lid in its filaments", `${MF.parts.length} parts: ${MF.parts.map(p => p.name).join(", ")}`);
  }

  console.log("\ndescribe your project: from the words");
  {
    const words = "ESP32 DevKit, 4-channel relay, LM2596 buck converter, OLED 0.96, two push buttons, 60 mm fan, cable gland";
    const plan = AIs.fromWords(words);
    check(plan.board === "esp32devkit" && plan.more.map(m => m.kind).sort().join() === "buck2596,relay4" && plan.openings.some(o => o.kind === "fan" && o.size === 60) && plan.openings.some(o => /^oled/.test(o.kind)) && plan.openings.find(o => /button|push/.test(o.kind + (MF.cutouts[o.kind].label || "").toLowerCase()) && o.count === 2),
      "each part of the words matched: the board, two modules, the screen, two buttons, the fan's size, the gland", plan.matched.join(" | ") + (plan.missed.length ? " / missed: " + plan.missed.join(", ") : ""));
    MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[], w:100, d:64, h:36 });
    const r = MF.enclosureApi ? null : MF.applyPlan ? MF.applyPlan(plan) : null;
    const q = MF.buildEnclosure(), I = MF.enclosure, E = MF.state.base.enclosure;
    check(r && r.ok && !bad(I).length && closed(q) && E.cut.filter(c => c.auto !== "ports").length === r.openings && E.w <= 256 && E.d <= 256,
      `filled in: ${r && r.boards} boards and modules, ${r && r.openings} openings, the box ${E.w} × ${E.d} × ${E.h} mm, nothing overlapping or off a wall`, bad(I).map(w => w.t).join("; "));
    const fails2 = [];
    for (const [name, w] of MF.recipes){
      MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] });
      const p2 = AIs.fromWords(w), r2 = MF.applyPlan(p2), q2 = MF.buildEnclosure();
      if (!r2.ok || bad(MF.enclosure).length || !closed(q2) || p2.missed.length) fails2.push(`${name}: ${r2.why || bad(MF.enclosure).map(x => x.t).join("; ") || (p2.missed.length ? "missed " + p2.missed.join(", ") : "open")}`);
    }
    check(!fails2.length, `all ${MF.recipes.length} ready-made descriptions fill in a clean box, every word recognised`, fails2.join(" | "));
    const none = MF.applyPlan(AIs.fromWords("a nice thing for my desk"));
    check(!none.ok && /matched/.test(none.why), "words with no parts in them: it says so and changes nothing", none.why);
  }

  console.log("\ndescribe your project: an AI's plan (a stand-in)");
  {
    const plan = { board:"pi", more:[{ kind:"relay2", level:1 }, { kind:"nonsense", level:0 }], openings:[{ kind:"fan", face:"left", count:1, size:80 }, { kind:"usbc", face:"diagonal", count:999, size:0 }, { kind:"<b>", face:"top", count:1, size:0 }],
      lid:"magnet", mount:"teleport", levels:9, notes:"<script>alert(1)</script>Check the fan's screws.", icon:{ badge:"hex", badgeFilament:1, ring:false, ringFilament:2, icons:[{ icon:"fan", filament:2, size:0.9, x:0, y:0, turn:0 }, { icon:"zzz", filament:3, size:0.4, x:0.4, y:0.4, turn:0 }], word:"", wordFilament:2 } };
    const c = AIs.cleanPlan(plan);
    check(c.board === "pi" && c.more.length === 1 && c.left.includes("nonsense") && c.left.includes("<b>") && c.left.length === 2 && c.openings.filter(o => o.kind === "usbc").length === 8 && c.openings.every(o => ["front","back","left","right","top","bottom"].includes(o.face))
      && c.mount === null && c.levels === 3 && c.icon && c.icon.layers.length === 1 && !/[<>]/.test(c.notes), "a plan checked like a project file: unknown names left out and named, counts and levels capped, faces and words cleaned",
      `${c.openings.length} openings, levels ${c.levels}, left out: ${c.left.join(", ")}`);
    MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] });
    const r = MF.applyPlan(Object.assign({}, plan, { openings:plan.openings.slice(0, 1), levels:1 })), q = MF.buildEnclosure(), I = MF.enclosure;
    check(r.ok && r.icon && MF.state.base.enclosure.logo.on && MF.state.base.enclosure.lid === "magnet" && MF.state.base.enclosure.levels.length === 1 && !bad(I).length && closed(q),
      "applied: a Pi on the floor, a relay on a level, an 80 mm fan on the left, a magnet lid, the icon on the lid", bad(I).map(w => w.t).join("; ") || `${MF.state.base.enclosure.w} × ${MF.state.base.enclosure.d} × ${MF.state.base.enclosure.h} mm`);
  }

  console.log("\nthe requests (a stand-in fetch: nothing leaves this test)");
  {
    const A = AIs.state, sent = []; const realFetch = win.fetch;
    win.fetch = async (url, o) => { sent.push({ url, o }); return { ok:true, status:200, json:async () => /11434/.test(url)
      ? { message:{ content:JSON.stringify({ hello:"hi" }) } } : { stop_reason:"end_turn", content:[{ type:"thinking", thinking:"" }, { type:"text", text:JSON.stringify({ hello:"hi" }) }] } }; };
    const schema = { type:"object", additionalProperties:false, required:["hello"], properties:{ hello:{ type:"string" } } };
    Object.assign(A, { provider:"claude", key:"sk-ant-test-key", model:"claude-opus-5-5", remember:false });
    const a = await AIs.ask("sys", "hello?", schema), q = sent[0], body = JSON.parse(q.o.body), h = q.o.headers;
    check(a.hello === "hi" && q.url === "https://api.anthropic.com/v1/messages" && h["x-api-key"] === "sk-ant-test-key" && h["anthropic-dangerous-direct-browser-access"] === "true" && h["anthropic-version"]
      && body.model === "claude-opus-5-5" && body.output_config.format.type === "json_schema" && body.output_config.format.schema === undefined ? false : body.output_config.format.schema.required[0] === "hello" && body.fallbacks === "default" && h["anthropic-beta"] === "server-side-fallback-2026-07-01" && !("temperature" in body),
      "Claude: the Messages API with the key, the browser header, the JSON schema and the fallback for a declined answer", `${body.model}, effort ${body.output_config.effort}`);
    win.fetch = async () => ({ ok:true, status:200, json:async () => ({ stop_reason:"refusal", content:[] }) });
    let msg = ""; try { await AIs.ask("s", "x", schema); } catch(e){ msg = e.message; }
    check(/would not answer/.test(msg), "a declined answer is said plainly", msg);
    win.fetch = async () => ({ ok:false, status:401, json:async () => ({ error:{ message:"invalid x-api-key" } }) });
    msg = ""; try { await AIs.ask("s", "x", schema); } catch(e){ msg = e.message; }
    check(/did not accept the API key/.test(msg), "a wrong key is said plainly", msg);
    win.fetch = async (url, o) => { sent.push({ url, o }); return { ok:true, status:200, json:async () => ({ message:{ content:JSON.stringify({ hello:"hi" }) } }) }; };
    Object.assign(A, { provider:"ollama", ollama:"http://localhost:11434", ollamaModel:"llama3.2" });
    const b = await AIs.ask("sys", "hello?", schema), q2 = sent[sent.length - 1], body2 = JSON.parse(q2.o.body);
    check(b.hello === "hi" && q2.url === "http://localhost:11434/api/chat" && body2.model === "llama3.2" && body2.format.required[0] === "hello" && body2.stream === false && !q2.o.headers["x-api-key"],
      "Ollama: its chat API on this computer with the schema, and no key", q2.url);
    // the key is never in a project or a link
    Object.assign(A, { provider:"claude", key:"sk-ant-secret-123" });
    const text = MF.projectPayload() + (await MF.shareLink()).url;
    let stored = ""; try { stored = win.localStorage.getItem("makerforge.ai") || ""; } catch(e){}
    check(!text.includes("sk-ant-secret") && !stored.includes("sk-ant-secret"), "the key is in no project, no link, and not stored unless Remember is ticked");
    win.fetch = realFetch;
  }

  console.log("\nthe panels with an AI (a stand-in)");
  {
    const A = AIs.state; Object.assign(A, { provider:"claude", key:"sk-ant-test" });
    A.hooks.ask = async (sys, prompt, schema) => schema.properties.board
      ? { board:"esp32devkit", more:[{ kind:"bme280", level:0 }], openings:[{ kind:"vent", face:"right", count:1, size:0 }], lid:"screw", mount:"none", levels:0, notes:"Keep the sensor away from the ESP32.", icon:{ badge:"circle", badgeFilament:1, ring:false, ringFilament:2, icons:[{ icon:"thermometer", filament:2, size:0.9, x:0, y:0, turn:0 }], word:"", wordFilament:2 } }
      : { badge:"rounded", badgeFilament:1, ring:true, ringFilament:3, icons:[{ icon:"snow", filament:2, size:0.9, x:0, y:0, turn:0 }], word:"COLD", wordFilament:2 };
    MF.state.base.enclosure = Object.assign(JSON.parse(JSON.stringify(MF.defaults.enclosure)), { mount:"none", cut:[] }); MF.rebuild(false); await settle();
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "make").click(); await sleep(60);
    const ta = document.querySelector("#encDesc"); ta.value = "an ESP32 weather station";
    const go = [...document.querySelectorAll("#panel button")].find(b => /Plan it with AI/.test(b.textContent)); go && go.click();
    for (let i = 0; i < 100 && !(MF.state.items.some(it => it.name === "Lid icon")); i++) await sleep(50); await settle();
    const E = MF.state.base.enclosure;
    check(go && E.board === "esp32devkit" && E.more.length === 1 && MF.state.items.some(it => it.name === "Lid icon" && it.icon.layers[0].icon === "thermometer") && E.logo.on, "Plan it with AI on the box's Make tab: the boards, a vent and a lid icon", go ? `${E.w} × ${E.d} × ${E.h} mm` : "no button");
    [...document.querySelectorAll("#tabs button")].find(b => b.dataset.k === "art").click(); await sleep(60);
    const t2 = document.querySelector("#aiIconTxt"); t2.value = "something cold";
    const g2 = [...document.querySelectorAll("#panel button")].find(b => /Design it \(/.test(b.textContent)); g2 && g2.click(); await sleep(300); await settle();
    const d = MF.state.items[MF.state.active];
    check(g2 && d.icon.layers[0].icon === "snow" && d.icon.label.text === "COLD" && d.icon.badge.ring, "Design it with AI on the Art tab", d.icon.layers.map(L => L.icon).join());
    document.querySelector("#settingsBtn").click(); await sleep(60);
    const modal = document.querySelector("#modal");
    check(/AI help/.test(modal.textContent) && modal.querySelector("#aiKey") && modal.querySelector("#aiKey").type === "password", "Settings has AI help, the key in a password box");
    modal.hidden = true; A.hooks.ask = null; Object.assign(A, { provider:"none", key:"" });
  }

  const errs = env.errors.slice(e0).filter(e => !/navigation|Not implemented: HTMLMediaElement/.test(e));
  check(!errs.length, "no page errors", errs.slice(0, 2).join(" | "));
  console.log(fails ? `\n${fails} FAILED` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
