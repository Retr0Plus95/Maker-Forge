// Looks and finding things (Session 92): the colour schemes (Retr0+, the owner's website, among them), your own colour, what's behind
// the model, Start from's tiles, kept in this browser and cleaned when read back; Start from's search, category chips, recent picks,
// New badges and regrouped objects.
// Usage: node tools-look-test.js index.html
const path = require("path"), boot = require(path.resolve(__dirname, "tools-test-env.js"));
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const file = process.argv[2] || "index.html";
  const env = boot(file), win = env.window, document = win.document, all = s => [...document.querySelectorAll(s)];
  await sleep(800);
  const MF = win.MakerForge, root = document.documentElement;
  const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 3000; i++){ if (!MF.busy){ await sleep(40); if (!MF.busy) return; } await sleep(25); } };
  const saved = () => JSON.parse(win.localStorage.getItem("makerforge.prefs") || "{}");
  const openSettings = async () => { document.querySelector("#settingsBtn").click(); await sleep(30); };
  const closeModal = () => { const m = document.querySelector("#modal"); if (m) m.hidden = true; };

  console.log("\ncolour schemes and backgrounds");
  {
    check(!root.hasAttribute("data-scheme") && !root.hasAttribute("data-backdrop"), "Maker Forge's own colours to start with");
    await openSettings();
    const names = all(".schemes button").map(b => b.dataset.scheme);
    check(names.join() === "forge,retro,forest,sunset,rose,ocean,graphite,custom", "eight schemes in Settings, Retr0+ (the website) among them", names.join());
    all(".schemes button").find(b => b.dataset.scheme === "retro").click(); await sleep(30);
    check(root.getAttribute("data-scheme") === "retro" && saved().scheme === "retro" && /retr0plus/.test(document.querySelector("#modal").textContent), "Retr0+: the page takes the website's scheme, kept in this browser, and says what it is");
    const sel = all("#modal select").find(s => [...s.options].some(o => o.value === "dots"));
    sel.value = "dots"; sel.dispatchEvent(new win.Event("change")); await sleep(20);
    check(root.getAttribute("data-backdrop") === "dots" && saved().backdrop === "dots", "the perfboard dots behind the model");
    await openSettings(); all(".schemes button").find(b => b.dataset.scheme === "custom").click(); await sleep(30);
    const col = document.querySelector("#lookAccent");
    check(!!col && !root.hasAttribute("data-scheme"), "your own colour: a colour picker");
    col.value = "#ffcc00"; col.dispatchEvent(new win.Event("input")); await sleep(20);
    check(root.style.getPropertyValue("--accent") === "#ffcc00" && root.style.getPropertyValue("--accent-ink") === "#101418" && saved().accent === "#ffcc00", "it sets the accent, with dark text on a light colour", root.style.getPropertyValue("--accent-ink"));
    col.value = "#202060"; col.dispatchEvent(new win.Event("input")); await sleep(20);
    check(root.style.getPropertyValue("--accent-ink") === "#ffffff", "and light text on a dark one");
    await openSettings(); all(".schemes button").find(b => b.dataset.scheme === "forest").click(); await sleep(30);
    check(root.getAttribute("data-scheme") === "forest" && !root.style.getPropertyValue("--accent"), "another scheme clears your colour from the page (it stays saved)", saved().accent);
    // Easy reading's "Back to normal" leaves the colours alone
    document.querySelector("#easyBtn").click(); await sleep(30);
    all("#modal button").find(b => /Back to normal/.test(b.textContent)).click(); await sleep(30);
    check(root.getAttribute("data-scheme") === "forest" && saved().scheme === "forest" && saved().backdrop === "dots", "Easy reading's Back to normal leaves the colours and the background alone");
    closeModal();
  }

  console.log("\nStart from: search, chips, recent, New, small pictures");
  {
    const sb = document.querySelector("#startsBody"), shown = s => all(s).filter(b => !b.hidden && !b.closest("[hidden]"));
    const search = document.querySelector("#startSearch"), type = async t => { search.value = t; search.dispatchEvent(new win.Event("input")); await sleep(20); };
    check(all("#presetGallery button").length === 31 && shown("#presetGallery button").length === 31, "all 31 quick starts, as before (the tests and tools find them the same way)");
    await type("lamp");
    const p = shown("#presetGallery button").map(b => b.dataset.k), o = shown(".objcard").map(b => b.dataset.k);
    check(p.join() === "Lithophane lamp" && o.includes("flower") && o.includes("lithophane") && !o.includes("nameplate"), "\"lamp\" finds the lithophane lamp, the lithophane and the flower lamp", `${p} | ${o}`);
    await type("arrow");
    check(shown(".objcard").map(b => b.dataset.k).join() === "nock" && document.querySelector("#presetGallery").hidden, "\"arrow\" finds the arrow nocks, and hides the quick starts' heading when none match");
    await type("zzqx");
    check(!document.querySelector("#startsNone").hidden, "nothing matching says so");
    await type("");
    all(".startchips button").find(b => b.dataset.cat === "workshop").click(); await sleep(20);
    check(shown(".objcard").map(b => b.dataset.k).sort().join() === "birdhouse,flower,nock" && !shown("#presetGallery button").length, "From the workshop: the owner's own projects (the flower lamp, the bird house, the nocks)");
    all(".startchips button").find(b => b.dataset.cat === "electronics").click(); await sleep(20);
    check(shown("#presetGallery button").map(b => b.dataset.k).includes("Raspberry Pi case") && shown(".objcard").map(b => b.dataset.k).sort().join() === "enclosure,phonecase", "Electronics: the boxes and cases, quick starts and objects");
    all(".startchips button").find(b => b.dataset.cat === "all").click(); await sleep(20);
    const heads = all("#startsBody .objcat").map(h => h.textContent);
    check(["Names and signs", "From a picture", "Gifts and décor", "Electronics", "Workshop and repair", "Hobbies and outdoors"].every(h => heads.includes(h)) && !heads.includes("Functional"),
      "the objects grouped by what they are for (\"Functional\" had eight)", heads.join(" | "));
    check(all(".objcard .newbadge").map(b => b.closest(".objcard").dataset.k).sort().join() === "birdhouse,flower,nock", "the newest objects carry a New badge");
    await type("nock"); search.dispatchEvent(new win.KeyboardEvent("keydown", { key:"Enter" })); await settle();
    check(MF.state.base.type === "nock", "Enter opens the first thing found");
    await type("");
    check(!document.querySelector("#recentBox").hidden && all("#recentRow button").map(b => b.dataset.recent)[0] === "object:nock" && saved().recent[0] === "object:nock",
      "what you opened lately is at the top, kept in this browser", JSON.stringify(saved().recent));
    await openSettings(); all("#modal .seg button").find(b => /Small pictures/.test(b.textContent)).click(); await sleep(30); closeModal();
    check(document.querySelector("#startsBody").classList.contains("small") && saved().tiles === "small", "small pictures: three to a row");
  }

  console.log("\nread back from this browser, cleaned");
  {
    const bad = JSON.stringify({ scheme:"<b>", accent:"red;}body{x", backdrop:5, tiles:"huge", recent:["object:nock", "<img src=x>", 7, "preset:Name keychain", "object:a/b"], ui:1.3, contrast:"high" });
    const env2 = boot(file, { storage:{ "makerforge.prefs":bad } }); await sleep(800);
    const r2 = env2.window.document.documentElement, MF2 = env2.window.MakerForge;
    const p2 = JSON.parse(env2.window.localStorage.getItem("makerforge.prefs") || "{}");
    check(!r2.hasAttribute("data-scheme") && !r2.hasAttribute("data-backdrop") && !r2.style.getPropertyValue("--accent") && r2.getAttribute("data-contrast") === "high",
      "odd saved values give the defaults (and the good ones, like high contrast, stay)");
    const rec = [...env2.window.document.querySelectorAll("#recentRow button")].map(b => b.dataset.recent);
    check(rec.join() === "object:nock,preset:Name keychain", "the recent picks keep only real ones", rec.join());
    const env3 = boot(file, { storage:{ "makerforge.prefs":JSON.stringify({ scheme:"retro", backdrop:"blueprint", contrast:"high" }) } }); await sleep(800);
    const r3 = env3.window.document.documentElement;
    check(r3.getAttribute("data-scheme") === "retro" && r3.getAttribute("data-backdrop") === "blueprint" && r3.getAttribute("data-contrast") === "high", "a saved scheme and background come back when the page opens, with high contrast on top");
    const css = env3.window.document.querySelector("style").textContent;
    check(/\[data-contrast="high"\]\[data-scheme="retro"\]\{--ink:#ffffff/.test(css) && /:root\[data-scheme="retro"\]\{[^}]*--bg:#150a24/.test(css), "the website's colours, and its own high contrast, are in the page's styles");
  }

  if (env.errors.length) check(false, "no page errors", env.errors[0].split("\n")[0]);
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
