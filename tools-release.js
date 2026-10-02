// Releases (Session 27): every version of the app as a file to download, so anyone can pick an earlier one.
// Each version's last commit on main gets a GitHub Release, tagged v<version>, with that commit's index.html
// attached as maker-forge-<version>.html and its CHANGELOG.md section as the notes. Run by
// .github/workflows/release.yml after each merge to main; --backfill also releases earlier versions with none.
//   node tools-release.js [--backfill] [--dry-run]      (needs the gh command and GH_TOKEN, except --dry-run)
"use strict";
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 256 << 20, stdio: ["ignore", "pipe", "pipe"] }).trim();
const tryGit = (...a) => { try { return git(...a); } catch (e) { return null; } };
const args = process.argv.slice(2), backfill = args.includes("--backfill"), dry = args.includes("--dry-run");
const ref = tryGit("rev-parse", "--verify", "origin/main") ? "origin/main" : "HEAD";

// each version's last commit on main (the newest commit whose package.json says that version)
function versionsOnMain() {
  const seen = new Map();
  for (const c of git("log", "--first-parent", "--format=%H", ref).split("\n").filter(Boolean)) {
    const pkg = tryGit("show", `${c}:package.json`); if (!pkg) continue;
    let v; try { v = JSON.parse(pkg).version; } catch (e) { continue; }
    if (!/^\d+\.\d+\.\d+$/.test(v || "") || seen.has(v)) continue;
    if (tryGit("cat-file", "-e", `${c}:index.html`) === null) continue;
    seen.set(v, { version: v, commit: c, date: git("log", "-1", "--format=%cs", c) });
  }
  return [...seen.values()];                               // newest first
}
// that version's part of CHANGELOG.md (a heading "## 0.24" covers 0.24.0), from that commit, else from today's
function notesFor(v, commit) {
  // "## 0.24.1", or "## 0.24" for 0.24.0, or "## 0.17" for a 0.17.1 the changelog folds into 0.17
  const names = [v, v.replace(/\.0$/, ""), v.split(".").slice(0, 2).join(".")].map(x => x.replace(/\./g, "\\."));
  const re = new RegExp(`^## (?:${names.join("|")})(?![\\d.])[^\\n]*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
  const m = re.exec(tryGit("show", `${commit}:CHANGELOG.md`) || "") || re.exec(tryGit("show", `${ref}:CHANGELOG.md`) || "");
  const body = m ? m[1].trim() : "See CHANGELOG.md.";
  return `${body}\n\n**To use this version:** download \`maker-forge-${v}.html\` below and open it in your browser. ` +
    `Projects saved in one version open in later ones.`;
}
const released = () => {
  if (dry) return new Set();
  const out = execFileSync("gh", ["release", "list", "--limit", "500", "--json", "tagName", "--jq", ".[].tagName"], { encoding: "utf8" });
  return new Set(out.split("\n").filter(Boolean));
};

const all = versionsOnMain();
if (!all.length) { console.log("no versions found on " + ref); process.exit(0); }
const have = released(), todo = (backfill ? all : all.slice(0, 1)).filter(r => !have.has("v" + r.version));
console.log(`${all.length} versions on ${ref} (${all.map(r => r.version).join(", ")}); to release: ${todo.map(r => r.version).join(", ") || "none"}`);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-"));
for (const r of todo.slice().reverse()) {                    // oldest first, so the newest ends up "latest"
  const file = path.join(dir, `maker-forge-${r.version}.html`), notes = path.join(dir, `notes-${r.version}.md`);
  fs.writeFileSync(file, execFileSync("git", ["show", `${r.commit}:index.html`], { maxBuffer: 256 << 20 }));
  fs.writeFileSync(notes, notesFor(r.version, r.commit));
  const latest = r === all[0];
  const cmd = ["release", "create", "v" + r.version, file, "--target", r.commit, "--title", `Maker Forge ${r.version} (${r.date})`, "--notes-file", notes, `--latest=${latest}`];
  if (dry) { console.log(`would run: gh ${cmd.map(a => /\s/.test(a) ? JSON.stringify(a) : a).join(" ")}\n${fs.readFileSync(notes, "utf8").split("\n").slice(0, 3).map(l => "    " + l.slice(0, 120)).join("\n")}`); continue; }
  execFileSync("gh", cmd, { stdio: "inherit" });
  console.log(`released ${r.version}`);
}
fs.rmSync(dir, { recursive: true, force: true });
