// After a squash merge (Session 24). The owner merges pull requests with "Squash and merge": a branch's work lands on
// main as one new commit, which git can't link to the branch's own commits. A branch built on top of that one (the
// next release, started while the last one waited for review) then shows a conflict on every line both of them
// touched, although nothing really disagrees.
//
// This merges main into such a branch from the right starting point: the newest commit of the branch whose files
// main already holds. Measured from there, only main's newer changes come in, and nothing the branch did is undone.
// It only ever adds a merge commit: no rebase, no force-push.
//
//   git fetch origin && node tools-after-squash.js        the current branch; check it, then push it yourself
//   node tools-after-squash.js --from <sha>               also: the merged pull request's last commit, when known
//   node tools-after-squash.js --branch <name> --push     check out origin/<name>, merge, and push (the GitHub Action)
//   --main <ref>       what to merge in (default origin/main)
//   --trailer "<line>" add a trailer line to the commit message (can be given more than once)
//   --dry-run          only say what it would do
// Exit codes: 0 merged or nothing to do, 2 real conflicts (the files are listed; merge those by hand), 1 anything else.
"use strict";
const { execFileSync } = require("child_process");

function git(...a) {
  return execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
}
function tryGit(...a) {
  try { return { ok: true, out: git(...a) }; }
  catch (e) { return { ok: false, out: String(e.stdout || "").trim(), err: String(e.stderr || "").trim(), code: e.status }; }
}
const short = c => c.slice(0, 7);
const isAncestor = (a, b) => tryGit("merge-base", "--is-ancestor", a, b).ok;

function parseArgs(argv) {
  const opt = { main: "origin/main", trailers: [] };
  const value = (i, name) => { if (i >= argv.length || argv[i].startsWith("--")) throw new Error(`${name} needs a value`); return argv[i]; };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") opt.from = value(++i, a);
    else if (a === "--branch") opt.branch = value(++i, a);
    else if (a === "--main") opt.main = value(++i, a);
    else if (a === "--trailer") opt.trailers.push(value(++i, a));
    else if (a === "--push") opt.push = true;
    else if (a === "--dry-run") opt.dry = true;
    else throw new Error(`unknown option ${a}`);
  }
  return opt;
}

// The newest commit of the branch whose exact files are on main: a squash merge copies a pull request's files
// into one new commit, so its files match the pull request's last commit (when the pull request was up to date).
function squashedBase(B, M) {
  const mb = tryGit("merge-base", B, M);
  const mainTrees = new Map();                       // tree → how recent on main (0 = newest)
  git("log", "--format=%T", "--topo-order", mb.ok ? `${mb.out}..${M}` : M).split("\n").filter(Boolean)
    .forEach((t, i) => { if (!mainTrees.has(t)) mainTrees.set(t, i); });
  let best = null;
  for (const line of git("log", "--format=%H %T", "--topo-order", `${M}..${B}`).split("\n").filter(Boolean)) {
    const [c, t] = line.split(" ");
    if (mainTrees.has(t) && (!best || mainTrees.get(t) < best.age)) best = { commit: c, age: mainTrees.get(t) };
  }
  return best && best.commit;
}

// With the merged pull request's last commit known: where the branch and that pull request part.
function baseFrom(B, M, from) {
  const H = tryGit("rev-parse", "--verify", `${from}^{commit}`);
  if (!H.ok) return null;
  const X = tryGit("merge-base", B, H.out);
  return X.ok && !isAncestor(X.out, M) ? X.out : null;
}

function run(opt) {
  const say = s => console.log(s);
  if (tryGit("status", "--porcelain", "--untracked-files=no").out) throw new Error("there are uncommitted changes: commit or stash them first");
  if (tryGit("rev-parse", "-q", "--verify", "MERGE_HEAD").ok) throw new Error("a merge is already in progress");
  const M = tryGit("rev-parse", "--verify", `${opt.main}^{commit}`);
  if (!M.ok) throw new Error(`can't find ${opt.main} (fetch it first: git fetch origin)`);
  let label;
  if (opt.branch) {
    const R = tryGit("rev-parse", "--verify", `origin/${opt.branch}^{commit}`);
    if (!R.ok) throw new Error(`can't find origin/${opt.branch}`);
    git("checkout", "-q", "--detach", R.out);
    label = opt.branch;
  } else label = git("rev-parse", "--abbrev-ref", "HEAD");
  const B = git("rev-parse", "HEAD");

  if (isAncestor(M.out, B)) { say(`${label}: already has everything on ${opt.main}; nothing to do.`); return 0; }
  const X = (opt.from && baseFrom(B, M.out, opt.from)) || squashedBase(B, M.out);
  if (!X) {
    say(`${label}: none of its work reached ${opt.main} through a squash merge, so a normal merge is the right one; nothing to do.`);
    return 0;
  }
  const subject = git("log", "-1", "--format=%s", X);
  say(`${label}: ${opt.main} already has this branch's work up to ${short(X)} ("${subject}").`);

  const mt = tryGit("merge-tree", "--write-tree", "--name-only", `--merge-base=${X}`, B, M.out);
  if (!mt.ok && mt.code !== 1) throw new Error(`git merge-tree failed: ${mt.err || mt.out}`);
  const lines = mt.out.split("\n"), T = lines[0];
  if (!mt.ok) {
    const files = []; for (const l of lines.slice(1)) { if (!l) break; if (!files.includes(l)) files.push(l); }
    say(`Even from there, these files really changed on both sides; merge them by hand:\n${files.map(f => "  " + f).join("\n")}`);
    if (opt.branch) git("checkout", "-q", "--detach", M.out);
    return 2;
  }
  if (opt.dry) { say(`Would merge ${opt.main} (${short(M.out)}) in with ${short(X)} as the starting point, with no conflicts.`); return 0; }

  // a real merge (so the commit has both parents), then the files exactly as worked out above
  tryGit("merge", "--no-ff", "--no-commit", "--no-verify", M.out);
  if (!tryGit("rev-parse", "-q", "--verify", "MERGE_HEAD").ok) throw new Error("git merge did not start");
  try {
    git("read-tree", "--reset", "-u", T);
    const msg = [`Merge ${opt.main.replace(/^origin\//, "")} into ${label} after a squash merge`, "",
      `${opt.main} already had this branch's work up to ${short(X)}, squash-merged as one new commit that git`,
      `could not link to it. Merged with ${short(X)} as the starting point, so only the newer changes on`,
      `${opt.main} came in and nothing this branch did was undone (tools-after-squash.js).`].join("\n");
    git("commit", "-q", "--no-verify", "-m", msg, ...opt.trailers.flatMap(t => ["--trailer", t]));
  } catch (e) { tryGit("merge", "--abort"); throw e; }
  const head = git("rev-parse", "HEAD");
  if (git("rev-parse", "HEAD^{tree}") !== T || git("rev-parse", "HEAD^1") !== B || git("rev-parse", "HEAD^2") !== M.out) throw new Error("the merge commit is not what was worked out");
  say(`Merged: ${short(head)}, no conflicts.`);

  if (opt.push) {
    const to = opt.branch || label;
    if (!to || to === "HEAD") throw new Error("not on a branch, so there is nowhere to push");
    const p = tryGit("push", "-q", "origin", `HEAD:refs/heads/${to}`);     // never forced: refused if the branch moved
    if (!p.ok) throw new Error(`push to ${to} refused: ${p.err}`);
    say(`Pushed to ${to}.`);
  }
  return 0;
}

if (require.main === module) {
  let code;
  try { code = run(parseArgs(process.argv.slice(2))); }
  catch (e) { console.error(`after-squash: ${e.message}`); code = 1; }
  process.exit(code);
}
module.exports = { run, parseArgs, squashedBase };
