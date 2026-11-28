// The website's copy of the app (Session 93): its styles come from app.css, which the website lets a browser keep for a week,
// while the scripts get a new name each release. A browser that kept last release's app.css ran 0.69 with 0.68's styles, and
// Start from's new Find box and chips showed as blank white boxes on many rows. Now the styles carry their release and the page
// fetches its own when they don't match. This serves the page split the way the website does, in real Chromium:
//   * last release's styles kept: the page fetches app.css?v=<this release> once, drops the old one, and Start from looks right;
//   * this release's styles: nothing is fetched again.
// Usage: node tools-stylecache-check.js index.html   (part of check:browser)
//   OLD=some/older/index.html   use that file's styles as the kept copy (else this release's, without its stamp and Start from's new rules)
// Pictures land in browser-check/ (git-ignored).
const path = require("path"), fs = require("fs"), { chromium } = require("playwright");
const NM = path.join(__dirname, "node_modules");
const LIBS = [[/three@[\d.]+\/build\/three\.min\.js/, "three/build/three.min.js"], [/OrbitControls\.js/, "three/examples/js/controls/OrbitControls.js"],
  [/earcut@[\d.]+\/dist\/earcut\.min\.js/, "earcut/dist/earcut.min.js"], [/jszip@[\d.]+\/dist\/jszip\.min\.js/, "jszip/dist/jszip.min.js"]];
let fails = 0;
const check = (ok, what, detail) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail !== undefined ? `  (${detail})` : ""}`); if (!ok) fails++; };

// what the website's importer does: every <style> into app.css, a <link> to it after the title
const split = src => {
  const css = [...src.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  const html = src.replace(/<style>[\s\S]*?<\/style>\n?/g, "").replace("</title>", '</title>\n<link rel="stylesheet" href="app.css">');
  return { css, html };
};

(async () => {
  const file = path.resolve(process.argv[2] || "index.html"), OUT = path.join(__dirname, "browser-check");
  fs.mkdirSync(OUT, { recursive:true });
  const page0 = split(fs.readFileSync(file, "utf8"));
  const version = (page0.html.match(/id="verBadge">v([^<]+)</) || [])[1];
  const kept = process.env.OLD ? split(fs.readFileSync(path.resolve(process.env.OLD), "utf8")).css
    : page0.css.replace(/:root\{--mf-styles:"[^"]*"\}\n?/, "").replace(/^\.start(search|chips)[^\n]*\n/gm, "");
  check(!!version && kept !== page0.css, "the page split the way the website does, with an older copy of its styles", version);

  const b = await chromium.launch({ args:["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] });
  const visit = async (name, keptCss) => {
    const ctx = await b.newContext({ viewport:{ width:1280, height:800 }, colorScheme:"dark" }), page = await ctx.newPage();
    const asked = [], errors = [];
    page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.route(/cdn\.jsdelivr\.net|huggingface\.co/, r => { const u = r.request().url(), l = LIBS.find(([re]) => re.test(u)); if (!l) return r.abort();
      return r.fulfill({ status:200, contentType:"application/javascript", headers:{ "access-control-allow-origin":"*" }, body:fs.readFileSync(path.join(NM, l[1])) }); });
    await page.route("http://forge.test/**", r => {
      const u = new URL(r.request().url());
      if (u.pathname === "/") return r.fulfill({ status:200, contentType:"text/html", body:page0.html });
      if (u.pathname === "/app.css"){ asked.push(u.search); return r.fulfill({ status:200, contentType:"text/css", body:u.search ? page0.css : keptCss }); }
      return r.fulfill({ status:404, body:"" });
    });
    await page.goto("http://forge.test/");
    await page.waitForFunction(() => window.MakerForge && window.MakerForge.rev > 0 && !window.MakerForge.busy, null, { timeout:90000 });
    await page.waitForTimeout(700);
    const look = await page.evaluate(() => {
      const cs = e => getComputedStyle(e), chips = [...document.querySelectorAll(".startchips button")], input = document.querySelector("#startSearch");
      const field = cs(document.documentElement).getPropertyValue("--field").trim();
      const probe = document.createElement("i"); probe.style.background = field; document.body.append(probe); const fieldRGB = cs(probe).backgroundColor; probe.remove();
      return { links:[...document.querySelectorAll('link[rel~="stylesheet"]')].map(l => l.getAttribute("href")), stamp:cs(document.documentElement).getPropertyValue("--mf-styles").trim(),
        rows:new Set(chips.map(c => c.offsetTop)).size, chips:chips.length, radius:cs(chips[1]).borderTopLeftRadius, chipBg:cs(chips[1]).backgroundColor, chipInk:cs(chips[1]).color,   // [0] is All, chosen
        inputBg:cs(input).backgroundColor, inputRadius:cs(input).borderTopLeftRadius, fieldRGB };
    });
    await page.locator(".sidebar, #starts, aside").first().screenshot({ path:path.join(OUT, `stylecache-${name}.png`) }).catch(() => page.screenshot({ path:path.join(OUT, `stylecache-${name}.png`) }));
    await ctx.close();
    return { look, asked, errors };
  };

  console.log("\nlast release's styles kept in the browser");
  {
    const { look, asked, errors } = await visit("kept", kept);
    check(asked.filter(q => q === `?v=${version}`).length === 1, "the page fetches this release's styles once, under a new address", asked.join(" "));
    check(look.links.length === 1 && look.links[0] === `app.css?v=${version}`, "and drops the old copy", look.links.join(" "));
    check(look.stamp.replace(/"/g, "") === "v" + version, "the styles now are this release's", look.stamp);
    check(look.chips > 5 && look.rows === 1 && look.radius === "999px", "the chips are round and on one row (they were blank boxes on many)", `${look.chips} chips, ${look.rows} row(s), ${look.radius}`);
    check(look.chipBg === look.fieldRGB && look.chipInk !== look.chipBg && look.inputBg === look.fieldRGB && look.inputRadius === "10px", "the Find box and the chips take the page's colours", `${look.chipBg} / ${look.chipInk}, box ${look.inputBg}`);
    check(!errors.length, "no page errors", errors[0]);
  }
  console.log("\nthis release's styles");
  {
    const { look, asked, errors } = await visit("fresh", page0.css);
    check(asked.length === 1 && asked[0] === "" && look.links.join() === "app.css", "nothing fetched again", asked.join(" ") + " | " + look.links.join(" "));
    check(look.rows === 1 && look.radius === "999px", "Start from as it should be");
    check(!errors.length, "no page errors", errors[0]);
  }
  await b.close();
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
