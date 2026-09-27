// Copies the fonts the app uses from the @fontsource test dependencies into fonts/, one woff2 file per
// font, weight and alphabet, and writes fonts/LICENSES.md. build.py packs fonts/ into index.html, so the
// app never downloads a font. Run it after adding a font to FONTS in src/app.html:
//   npm i -D --save-exact @fontsource/<id>@5.3.0 && node tools-fonts.js && python3 build.py
"use strict";
const fs = require("fs"), path = require("path");
const root = __dirname, out = path.join(root, "fonts"), NM = path.join(root, "node_modules", "@fontsource");
const app = fs.readFileSync(path.join(root, "src", "app.html"), "utf8");
const list = /const FONTS = \[([\s\S]*?)\n\];/.exec(app);
if (!list) throw new Error("FONTS not found in src/app.html");
// the lettering fonts at the weight each is used in, and the Easy reading font (regular and bold)
const faces = [...list[1].matchAll(/\{ n:"([^"]+)", w:(\d+)/g)].map(m => [m[1], [+m[2]]]).concat([["Atkinson Hyperlegible", [400, 700]]]);
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (/\.woff2$/.test(f)) fs.unlinkSync(path.join(out, f));
const licences = [], used = new Set();
let bytes = 0, files = 0;
for (const [family, weights] of faces) {
  const id = family.toLowerCase().replace(/ /g, "-"), dir = path.join(NM, id);
  if (!fs.existsSync(dir)) throw new Error(`missing @fontsource/${id}: npm i -D --save-exact @fontsource/${id}@5.3.0`);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "metadata.json"), "utf8")), pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  if (meta.family !== family) throw new Error(`${id}: the package's family is "${meta.family}", the app says "${family}"`);
  for (const w of weights) {
    // every alphabet the font has at this weight, as listed in the package's own CSS
    const css = fs.readFileSync(path.join(dir, `${w}.css`), "utf8");
    for (const m of css.matchAll(/url\(\.\/files\/([a-z0-9-]+-normal\.woff2)\)/g)) {
      const src = path.join(dir, "files", m[1]);
      fs.copyFileSync(src, path.join(out, m[1])); bytes += fs.statSync(src).size; files++;
    }
  }
  const L = meta.license || {};
  licences.push(`| ${family} | ${weights.join(", ")} | ${L.type || pkg.license} | ${(L.attribution || "").replace(/\|/g, "/")} |`);
  used.add(L.type || pkg.license);
}
const texts = { "OFL-1.1": "pacifico", "Apache-2.0": "satisfy" };   // a package whose LICENSE file is that licence's full text
let md = `# Fonts\n\nThese fonts are built into \`index.html\` by \`build.py\`. They are the Google Fonts families as packaged by\n` +
  `[Fontsource](https://fontsource.org) 5.3.0 (\`@fontsource/<name>\` on npm), copied here by \`node tools-fonts.js\`: one\n` +
  `WOFF2 file per font, weight and alphabet, unchanged. Each file also carries its copyright and licence in its own name table.\n\n` +
  `| Font | Weights | Licence | Copyright |\n| --- | --- | --- | --- |\n${licences.join("\n")}\n`;
for (const t of [...used].sort()) {
  if (!texts[t]) throw new Error(`no licence text known for ${t}`);
  md += `\n## ${t === "OFL-1.1" ? "SIL Open Font License 1.1" : "Apache License 2.0"}\n\n\`\`\`\n${fs.readFileSync(path.join(NM, texts[t], "LICENSE"), "utf8").trim()}\n\`\`\`\n`;
}
fs.writeFileSync(path.join(out, "LICENSES.md"), md);
console.log(`fonts/: ${files} files, ${(bytes / 1024).toFixed(0)} KB, ${faces.length} fonts; licences: ${[...used].join(", ")}`);
