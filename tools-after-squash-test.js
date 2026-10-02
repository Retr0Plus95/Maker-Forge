// After a squash merge (Session 24): tools-after-squash.js on small throwaway repositories made the way this
// project works (a release branch built on the last one, which is then squash-merged), and on the real history of
// pull requests #8 and #9 when this clone has it.
//   node tools-after-squash-test.js
"use strict";
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync } = require("child_process");
const TOOL = path.join(__dirname, "tools-after-squash.js");
let fails = 0;
const check = (ok, what, got) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${what}${got !== undefined ? "  (" + got + ")" : ""}`); if (!ok) fails++; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "after-squash-"));
let dir;
const sh = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const ok = (...a) => { try { sh(...a); return true; } catch (e) { return false; } };
const tool = (...a) => {
  try { return { code: 0, out: execFileSync("node", [TOOL, ...a], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
};
const write = (f, s) => fs.writeFileSync(path.join(dir, f), s);
const read = f => fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), "utf8") : null;
const commit = msg => { sh("add", "-A"); sh("commit", "-q", "-m", msg); return sh("rev-parse", "HEAD"); };
const lines = n => Array.from({ length: n }, (_, i) => `line ${i + 1}`);

// main at "0.22"; p is the next release (0.23); b is the one after, started from p before p was merged (0.24)
function setup(name) {
  dir = path.join(tmp, name); fs.mkdirSync(dir);
  sh("init", "-q", "-b", "main"); sh("config", "user.name", "Test"); sh("config", "user.email", "test@example.invalid");
  sh("config", "commit.gpgsign", "false");
  const app = lines(30); app[0] = "version 0.22";
  write("app.txt", app.join("\n") + "\n"); write("CHANGELOG.md", "## 0.22\n"); write("old.txt", "old\n");
  commit("0.22");
  sh("checkout", "-q", "-b", "p");
  app[0] = "version 0.23"; app[10] = "speed"; write("app.txt", app.join("\n") + "\n");
  commit("p: speed");
  write("CHANGELOG.md", "## 0.23\n## 0.22\n"); commit("p: changelog");
  sh("checkout", "-q", "-b", "b");
  app[0] = "version 0.24"; app[10] = "speed, faster"; app[20] = "close-ups"; write("app.txt", app.join("\n") + "\n");
  write("CHANGELOG.md", "## 0.24\n## 0.23\n## 0.22\n"); fs.unlinkSync(path.join(dir, "old.txt"));
  commit("b: close-ups");
  return app;
}
const squash = (branch, msg) => { sh("checkout", "-q", "main"); sh("merge", "-q", "--squash", branch); return commit(msg); };
const tree = r => sh("rev-parse", `${r}^{tree}`);

// 1. the plain case: main gets p as one squashed commit
{
  setup("plain");
  const S = squash("p", "0.23 (#7)");
  check(tree(S) === tree("p"), "a squash merge copies the pull request's files into one new commit");
  sh("checkout", "-q", "b"); const B = sh("rev-parse", "HEAD");
  const normal = ok("merge-tree", "--write-tree", "b", "main");
  check(!normal, "it reproduces the problem: a normal merge of main into the next branch conflicts");
  const r = tool("--main", "main");
  check(r.code === 0 && /Merged/.test(r.out), "the tool merges main in with no conflict", r.out.split("\n")[0]);
  check(tree("HEAD") === tree(B) && sh("rev-parse", "HEAD^1") === B && sh("rev-parse", "HEAD^2") === S,
    "the files are exactly the branch's own, in a merge commit with the branch and main as its parents");
  check(read("old.txt") === null, "a file the branch deleted stays deleted");
  check(sh("status", "--porcelain") === "", "nothing is left half-done");
  check(ok("merge-tree", "--write-tree", "main", "HEAD") && sh("merge-base", "main", "HEAD") === S,
    "afterwards main and the branch merge cleanly (what Squash and merge needs)");
  const again = tool("--main", "main");
  check(again.code === 0 && /nothing to do/.test(again.out) && sh("rev-parse", "HEAD^2") === S, "run again, it does nothing");
}

// 2. main has moved on since (another fix): that comes in, the branch's work stays
{
  setup("moved");
  squash("p", "0.23 (#7)");
  write("README.md", "hello\n"); const fix = commit("a fix straight on main");
  sh("checkout", "-q", "b");
  const r = tool("--main", "main");
  check(r.code === 0 && read("README.md") === "hello\n" && /version 0\.24/.test(read("app.txt")) && sh("rev-parse", "HEAD^2") === fix,
    "main's newer change comes in and the branch keeps its own work");
}

// 3. the branch undid one of p's changes: a normal merge quietly puts it back; this one doesn't
{
  dir = path.join(tmp, "undo"); fs.mkdirSync(dir);
  sh("init", "-q", "-b", "main"); sh("config", "user.name", "Test"); sh("config", "user.email", "test@example.invalid");
  const app = lines(30); write("app.txt", app.join("\n") + "\n"); commit("start");
  sh("checkout", "-q", "-b", "p"); app[10] = "speed"; write("app.txt", app.join("\n") + "\n"); commit("p: speed");
  sh("checkout", "-q", "-b", "b"); app[10] = "line 11"; app[20] = "close-ups"; write("app.txt", app.join("\n") + "\n");
  commit("b: close-ups, and the speed line taken out again");
  squash("p", "speed (#7)"); sh("checkout", "-q", "b");
  const B = sh("rev-parse", "HEAD");
  const normalTree = sh("merge-tree", "--write-tree", "b", "main");
  const normalLine = sh("show", `${normalTree}:app.txt`).split("\n")[10];
  const r = tool("--main", "main");
  check(normalLine === "speed" && r.code === 0 && tree("HEAD") === tree(B) && read("app.txt").split("\n")[10] === "line 11",
    "a change the branch undid stays undone", `a normal merge gives "${normalLine}" with no conflict`);
}

// 4. a real conflict (main changed the same line differently afterwards): it stops, lists the file, changes nothing
{
  const app = setup("real");
  squash("p", "0.23 (#7)");
  const m = app.slice(); m[0] = "version 0.23"; m[10] = "speed"; m[20] = "a hot fix"; write("app.txt", m.join("\n") + "\n"); commit("hot fix on main");
  sh("checkout", "-q", "b"); const B = sh("rev-parse", "HEAD");
  const r = tool("--main", "main");
  check(r.code === 2 && /app\.txt/.test(r.out) && sh("rev-parse", "HEAD") === B && !ok("rev-parse", "-q", "--verify", "MERGE_HEAD") && sh("status", "--porcelain") === "",
    "a real conflict: it says which file, and leaves the branch as it was", r.out.trim().split("\n").pop().trim());
}

// 5. a branch that isn't built on a squashed one: nothing to do
{
  setup("independent");
  sh("checkout", "-q", "main"); sh("checkout", "-q", "-b", "other"); write("other.txt", "x\n"); commit("other work");
  sh("checkout", "-q", "main"); write("README.md", "hi\n"); commit("main moves on");
  sh("checkout", "-q", "other"); const O = sh("rev-parse", "HEAD");
  const r = tool("--main", "main");
  check(r.code === 0 && /normal merge/.test(r.out) && sh("rev-parse", "HEAD") === O, "a branch not built on a squashed one is left alone");
}

// 6. p was behind main when squashed, so main's commit has files no commit of b has: --from finds the place
{
  setup("behind");
  sh("checkout", "-q", "main"); write("README.md", "hi\n"); commit("main moves on first");
  const P = sh("rev-parse", "p");
  squash("p", "0.23 (#7)"); sh("checkout", "-q", "b"); const B = sh("rev-parse", "HEAD");
  const plain = tool("--main", "main");
  check(plain.code === 0 && sh("rev-parse", "HEAD") === B, "without the pull request's last commit it can't tell, and changes nothing");
  const r = tool("--main", "main", "--from", P);
  check(r.code === 0 && read("README.md") === "hi\n" && /version 0\.24/.test(read("app.txt")) && read("old.txt") === null,
    "with it (as the GitHub Action passes it) the merge is right");
}

// 7. --branch and --push, as the GitHub Action runs it: a fast-forward push, never forced
{
  setup("push");
  const remote = path.join(tmp, "push-remote.git");
  execFileSync("git", ["clone", "-q", "--bare", dir, remote]);
  squash("p", "0.23 (#7)");
  sh("remote", "add", "origin", remote); sh("push", "-q", "origin", "main"); sh("fetch", "-q", "origin");
  const before = sh("rev-parse", "origin/b");
  const r = tool("--branch", "b", "--push", "--trailer", "Test-Trailer: yes");
  sh("fetch", "-q", "origin");
  const after = sh("rev-parse", "origin/b");
  check(r.code === 0 && after !== before && sh("rev-parse", `${after}^1`) === before && tree(after) === tree(before),
    "with --branch and --push it updates the branch on the remote by adding one commit");
  check(/Test-Trailer: yes/.test(sh("log", "-1", "--format=%B", after)), "trailers go into the commit message");
}

// 8. bad input
{
  dir = path.join(tmp, "plain");
  write("app.txt", "changed\n");
  const r = tool("--main", "main");
  check(r.code === 1 && /uncommitted/.test(r.out), "it won't start with uncommitted changes");
  sh("checkout", "-q", "--", "app.txt");
  check(tool("--main", "nope").code === 1 && tool("--from").code === 1 && tool("--bogus").code === 1, "an unknown branch or option is refused");
}

// 9. the real pull requests: #8 after #7 was squashed, and #9 after #8 (when this clone has those commits)
{
  const real = [["7ce6d8a", "eea0209", "#8 (v0.24.0) after #7 was squash-merged"], ["a8ad830", "6499316", "#9 (v0.24.1) after #8 was squash-merged"]];
  dir = __dirname;
  if (real.every(([b, m]) => ok("cat-file", "-e", `${b}^{commit}`) && ok("cat-file", "-e", `${m}^{commit}`))) {
    dir = path.join(tmp, "history");
    execFileSync("git", ["clone", "-q", "--shared", "--no-checkout", __dirname, dir]);
    sh("config", "user.name", "Test"); sh("config", "user.email", "test@example.invalid");
    for (const [b, m, what] of real) {
      sh("checkout", "-q", "--detach", b);
      const normal = ok("merge-tree", "--write-tree", "HEAD", m);
      const r = tool("--main", m);
      check(!normal && r.code === 0 && tree("HEAD") === tree(b), `${what}: conflicted, and now merges with the branch's files unchanged`);
    }
  } else console.log("  --   the commits of #8 and #9 aren't in this clone; skipped");
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
