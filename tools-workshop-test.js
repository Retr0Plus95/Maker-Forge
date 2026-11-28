// From the workshop (Session 94): the owner's own boxes as quick starts, as they made them, credited to their repositories;
// found by their words and the From the workshop chip; and a big box whose box and lid each fit the bed, but not side by side,
// printed on two plates instead of being "bigger than the print bed".
// Usage: node tools-workshop-test.js index.html
const path = require("path"), boot = require(path.resolve(__dirname, "tools-test-env.js"));
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const env = boot(process.argv[2] || "index.html"), win = env.window, document = win.document, all = s => [...document.querySelectorAll(s)];
  await sleep(800);
  const MF = win.MakerForge;
  const settle = async () => { const r0 = MF.rev; for (let i = 0; i < 40 && MF.rev === r0 && !MF.busy; i++) await sleep(30); for (let i = 0; i < 4000; i++){ if (!MF.busy){ await sleep(60); if (!MF.busy) return; } await sleep(25); } };
  // the quick start's tip shows as a notice: every notice since it was opened
  let notes = [];
  new win.MutationObserver(() => notes.push(document.querySelector("#notice").textContent)).observe(document.querySelector("#notice"), { childList:true, characterData:true, subtree:true });
  const open = async k => { notes = []; const b = all("#presetGallery button").find(x => x.dataset.k === k); b.click(); await settle(); await sleep(200); await settle(); };
  const lastNotice = () => notes.join(" | ");
  const checks = () => (MF.checks && MF.checks.list || []).map(r => r.t);
  const E = () => MF.state.base.enclosure, labels = () => E().cut.map(c => c.label).filter(Boolean);

  console.log("\nthe RGB lamp controller's box (Retr0Plus95/ESP32-LED-RGB-)");
  {
    await open("RGB lamp controller");
    const e = E();
    check(MF.state.base.type === "enclosure" && e.w === 171 && e.d === 91 && e.h === 50, "the owner's box, 171 × 91 × 50 mm", [e.w, e.d, e.h].join(" × "));
    check(e.board === "custom" && e.bw === 90 && e.bd === 70 && e.bsx === 84 && e.bsy === 64 && e.bscrew === "M2.5", "their 90 × 70 mm board on M2.5 posts 84 × 64 mm apart");
    check(e.cut.length === 12 && ["IR", "STATUS", "ON/OFF", "USB", "12V", "STRIP", "RGB LAMP"].every(l => labels().includes(l)), "its twelve openings, labelled as they made them", labels().join(", "));
    check(/Retr0Plus95\/ESP32-LED-RGB-/.test(lastNotice()), "the tip credits their repository", lastNotice().slice(0, 90));
    check(MF.state.slots[0].name === "Clear PETG (lens)" && MF.state.slots[1].name === "Grey PETG (box and lid)", "their filaments: clear PETG for the lens, grey for the box and lid");
    check(MF.parts.map(p => p.name).join() === "Box,Lid,Pilot light lenses (1)" && checks().includes("Every part is a closed mesh") && !checks().includes("Bigger than the print bed"), "box, lid and lens, closed, on the bed", MF.parts.map(p => p.name).join(", "));
  }

  console.log("\nthe four-channel bench supply's case (Retr0Plus95/FOUR-CHANNEL-PSU), two halves");
  for (const [k, n, want] of [["Bench supply (left)", 32, ["TRIP", "CH1 24V", "CH2 12V", "POWER"]], ["Bench supply (right)", 24, ["CH3 0-22V", "ON", "HOT"]]]){
    await open(k);
    const e = E(), joint = e.cut.find(c => c.kind === "rect" && c.w === 182 && c.h === 95);
    check(e.w === 151.5 && e.d === 222 && e.h === 122 && e.cut.length === n && want.every(l => labels().includes(l)), `${k}: 151.5 × 222 × 122 mm, ${n} openings`, labels().join(", "));
    check(!!joint && joint.face === (k.includes("left") ? "right" : "left"), "the big opening where the halves meet, on the inner side", joint && joint.face);
    check(/Retr0Plus95\/FOUR-CHANNEL-PSU/.test(lastNotice()), "the tip credits their repository");
    // box and lid each fit a 256 mm bed, but not side by side: one plate each, and the print check says they fit
    const box = MF.parts.find(p => p.name === "Box"), lid = MF.parts.find(p => p.name === "Lid");
    check(box && lid && box.plate != null && lid.plate != null && box.plate !== lid.plate, "the box and the lid on plates of their own", box && `${box.plate} / ${lid.plate}`);
    check(checks().includes("Fits the bed") && !checks().includes("Bigger than the print bed"), "the print check: it fits the bed (it said bigger than the bed)", checks().filter(t => /bed/i.test(t)).join(" / "));
  }

  console.log("\na box whose parts fit side by side stays on one plate");
  {
    await open("Project box");
    check(MF.parts.every(p => p.plate == null) && checks().includes("Fits the bed"), "the project box: one plate, as before", MF.parts.map(p => `${p.name}:${p.plate}`).join(" "));
  }

  console.log("\nfinding them in Start from");
  {
    const search = document.querySelector("#startSearch"), shown = s => all(s).filter(b => !b.hidden && !b.closest("[hidden]")).map(b => b.dataset.k);
    const type = async t => { search.value = t; search.dispatchEvent(new win.Event("input")); await sleep(20); };
    await type("psu");
    check(shown("#presetGallery button").join() === "PSU box,Bench supply (left),Bench supply (right)", "\"psu\" finds the bench supply halves and the PSU box", shown("#presetGallery button").join());
    await type("esp32");
    check(shown("#presetGallery button").includes("RGB lamp controller"), "\"esp32\" finds the RGB lamp controller");
    await type("");
    all(".startchips button").find(b => b.dataset.cat === "workshop").click(); await sleep(20);
    check(shown("#presetGallery button").join() === "RGB lamp controller,Bench supply (left),Bench supply (right)" && shown(".objcard").sort().join() === "birdhouse,flower,nock",
      "From the workshop: the owner's three boxes and their three objects", `${shown("#presetGallery button")} | ${shown(".objcard")}`);
    all(".startchips button").find(b => b.dataset.cat === "electronics").click(); await sleep(20);
    check(["RGB lamp controller", "Bench supply (left)", "Raspberry Pi case"].every(k => shown("#presetGallery button").includes(k)), "and among Electronics");
  }

  if (env.errors.length) check(false, "no page errors", env.errors[0].split("\n")[0]);
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
