// The lamp's web pages (firmware/RGBLampController/web_page.h) in a real browser, against a fake lamp:
// every control sends what the firmware expects, the page follows the lamp's state, nothing is loaded from
// anywhere else, and it fits a phone. Saves the screenshots used in the README to images/.
//   node test/web_page_test.js            (needs Playwright with Chromium)
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const header = fs.readFileSync(path.join(root, "firmware/RGBLampController/web_page.h"), "utf8");
const page = name => {
  const m = header.match(new RegExp(name + `\\[\\] = R"HTML\\(([\\s\\S]*?)\\)HTML";`));
  if (!m) throw new Error(name + " not found in web_page.h");
  return m[1];
};
const LAMP = page("LAMP_PAGE"), WIFI = page("WIFI_PAGE");

const effects = ["Solid", "Jump 3", "Jump 7", "Fade 3", "Fade 7", "Smooth", "Flash", "Strobe", "Breathe"];
let st = { on: true, hex: "#ffa046", bri: 180, effect: 0, effects, speed: 5, sleep: 0, sleepLeft: 0, setup: false,
           ssid: "Home Wi-Fi", ip: "192.168.1.42", rssi: -54, version: "1.0.0" };
const posts = [];
let scans = 0;
const server = http.createServer((req, res) => {
  const send = (type, body) => { res.writeHead(200, { "Content-Type": type }); res.end(body); };
  if (req.method === "POST" && req.url === "/api/set") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      const p = Object.fromEntries(new URLSearchParams(body));
      posts.push(p);
      if (p.on !== undefined) st.on = p.on === "1";
      if (p.hex) { st.hex = p.hex; st.on = true; }
      if (p.bri) st.bri = +p.bri;
      if (p.effect !== undefined) st.effect = +p.effect;
      if (p.speed) st.speed = +p.speed;
      if (p.sleep !== undefined) { st.sleep = +p.sleep; st.sleepLeft = st.sleep * 60; }
      send("application/json", JSON.stringify(st));
    });
    return;
  }
  if (req.url === "/" || req.url === "/lamp") return send("text/html", LAMP);
  if (req.url === "/wifi") return send("text/html", WIFI);
  if (req.url === "/api/state") return send("application/json", JSON.stringify(st));
  if (req.url === "/scan") return send("application/json", ++scans < 2 ? '{"busy":true}' : '{"busy":false,"nets":["Home Wi-Fi","Neighbour 5G"]}');
  res.writeHead(404); res.end();
});

let fails = 0;
const check = (ok, what) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}`); if (!ok) fails++; };

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const tab = await ctx.newPage();
  const errors = [], foreign = [];
  tab.on("pageerror", e => errors.push(e.message));
  tab.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  tab.on("request", r => { if (!r.url().startsWith(base)) foreign.push(r.url()); });

  console.log("lamp page");
  await tab.goto(base + "/");
  await tab.waitForFunction(() => document.querySelectorAll("#fx button").length === 9);
  check(true, "the nine effects appear");
  check(await tab.$eval("#hexv", e => e.textContent) === "#FFA046", "shows the lamp's colour");

  await tab.click("#pw");
  await tab.waitForFunction(() => document.body.className === "off");
  check(posts.at(-1).on === "0", "power button sends on=0 and the page shows off");
  await tab.click("#pw");
  await tab.waitForFunction(() => document.body.className === "on");

  await tab.click("#fx button:nth-child(6)");
  await tab.waitForFunction(() => document.querySelector("#fx button:nth-child(6)").getAttribute("aria-pressed") === "true");
  check(posts.at(-1).effect === "5", "effect Smooth sends effect=5 and is shown pressed");

  await tab.$eval("#bri", e => { e.value = 128; e.dispatchEvent(new Event("input")); });
  await tab.waitForTimeout(400);
  check(posts.at(-1).bri === "128", "brightness slider sends bri=128 (after a short pause)");
  check(await tab.$eval("#briv", e => e.textContent) === "50 %", "brightness shows 50 %");

  await tab.click("#sw button:nth-child(8)");
  await tab.waitForTimeout(150);
  check(posts.at(-1).hex === "#0000ff", "a colour dot sends its colour");

  await tab.selectOption("#slp", "30");
  await tab.waitForFunction(() => /min left/.test(document.getElementById("slpv").textContent));
  check(posts.at(-1).sleep === "30", "sleep timer sends sleep=30 and shows the time left");

  // the lamp changes by remote: the page follows within one poll
  st.hex = "#00ff00"; st.effect = 0; st.bri = 200; st.sleep = 0; st.sleepLeft = 0;
  await tab.waitForFunction(() => document.getElementById("hexv").textContent === "#00FF00", null, { timeout: 4000 });
  check(true, "the page follows a change made with the remote");

  const wide = await tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check(wide, "fits a 390 px phone without sideways scrolling");
  await tab.setViewportSize({ width: 320, height: 700 });
  check(await tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "fits a 320 px phone too");
  await tab.setViewportSize({ width: 390, height: 844 });

  // a nice state for the README picture
  st = Object.assign(st, { on: true, hex: "#ff7a2e", bri: 190, effect: 0, speed: 4, sleep: 60, sleepLeft: 2940 });
  await tab.reload();
  await tab.waitForFunction(() => document.querySelectorAll("#fx button").length === 9);
  await tab.waitForTimeout(400);
  fs.mkdirSync(path.join(root, "images"), { recursive: true });
  await tab.screenshot({ path: path.join(root, "images/web-page.png"), fullPage: true });

  console.log("Wi-Fi page");
  await tab.goto(base + "/wifi");
  await tab.waitForFunction(() => document.querySelectorAll("#nets option").length === 2, null, { timeout: 5000 });
  check(true, "networks found by the scan are offered");
  check(await tab.$eval("#ssid", e => e.maxLength === 32) && await tab.$eval("#pass", e => e.maxLength === 63), "name up to 32 and password up to 63 characters");
  await tab.check("#sh");
  check(await tab.$eval("#pass", e => e.type) === "text", "show password works");
  await tab.uncheck("#sh");
  await tab.fill("#ssid", "Home Wi-Fi");
  await tab.screenshot({ path: path.join(root, "images/web-wifi.png"), fullPage: true });

  check(!errors.length, "no script errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  check(!foreign.length, "nothing loaded from other websites" + (foreign.length ? ": " + foreign.join(" ") : ""));
  await browser.close();
  server.close();
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
