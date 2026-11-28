# The Maker Forge suite on forge.retr0plus.se: Shaper and Bench, and the apps after them

*Written 2026-11-28 in one session across Maker-Forge, Maker-Forge-Bench and Website. Status: **draft for the owner's
review**. The fixes in section 3 are built and pushed; nothing else in this document is built yet.*

## 1. What the owner asked for, and why

**Asked (2026-11-28):** "Combine Shape and Bench under forge.retr0plus.se as two apps, and rename Maker Forge's Shape app to
Shaper. Start with a design: saved progress, shared code, security rules. Use themes from the website for the suite. There will
be other apps added to the suite later on; they should be in the roadmap somewhere." Then: "reuse any code wherever you see
fit", "find bugs along the way and security weaknesses and add ideas and improvements", and, on the one question asked,
**one shared address**, with "fix the problems first".

**Why, as far as the repositories say it:** Bench's design (2026-11-12) already describes Maker Forge as a hobbyist's SolidWorks:
separate apps, one project file (`forge-project.json`), one address, each useful on its own. Today the pieces are apart:
Shaper (still called Maker Forge) owns the whole of forge.retr0plus.se, Bench is not published at all, and the two only touch
through one list in the browser's storage (Bench's "Send to Shape"). The owner wants them to become one suite now, with
room for more apps, in the look of retr0plus.se.

**Who it is for:** makers using the apps (the owner first, then visitors with their own projects), on PC, phone and tablet.

## 2. Goals, non-goals and anti-goals

**Goals**
- One home at `forge.retr0plus.se/` and one folder per app: `/shaper/`, `/bench/`, later `/calc/`, `/circuit/` and so on.
- Saved work that survives the move, is never lost silently, and flows between apps where that helps (a board from Bench into
  Shaper's box maker; Shaper's printed parts into Bench's checklist; one Easy reading setting; one Claude key).
- One set of security rules every app must meet before it is published under the suite.
- Shared code written once: the look, Easy reading, storage, the project file, the cleaners, the few-requests-at-once queue.
- The website's look (purple board rev.A) across the suite.
- A roadmap entry for every app planned, and a checklist for adding one.

**Non-goals**
- Merging the apps' code into one program. Each stays its own repository, its own release, its own tests (Bench design §2 rule 1).
- Accounts, servers or sync. Everything stays in the visitor's browser (all three repositories promise this).
- Moving ShopFlow (PitBoard) here: see section 11.

**Anti-goals** (what would make this a failure even if it "works")
- Anyone's saved work lost: an old Maker Forge autosave, Bench's ticks, a share link that no longer opens.
- The weakest app setting the security for all of them (apps at one address share their saved data).
- Shaper no longer working as one file opened from disk, or offline.
- Anything loaded from another website without the visitor asking.
- A page that asks the host for more than a handful of files at once (one.com refuses the 11th).

## 3. Problems found and fixed first (built, tested, pushed)

The owner said "fix the problems first". Each was confirmed before it was fixed.

| # | Problem | Fix | Where | Tested |
|---|---|---|---|---|
| 1 | Bench straight from `src/` asks for ~60 scripts at once. Over HTTP/2 (as one.com serves) a stand-in that refuses the 11th request refused 42, and **Bench never started**. | `npm run build` packs it into `dist/bench/`: one script to start, the 3D view's pieces when it opens, hashed names. | Bench `tools/build.mjs` (esbuild, pinned) | `tests/browser/onecom.test.js`, `tests/unit/build.test.js` |
| 2 | Opening Bench's 3D view asked for all 32 part models at once: 8 refused, those parts quietly drawn as plain blocks. | A queue: 4 at a time, a refused one asked again after the host's wait. | Bench `src/fetchqueue.js` | unit tests; the browser test fails without it |
| 3 | Under forge.retr0plus.se's top `.htaccess`, a plain `Header set` in `/bench/` sends **both** policies (the browser obeys both: Bench can't reach GitHub or Claude); no `.htaccess` inherits Maker Forge's looser one. | The packed copy brings its own `.htaccess` with `Header always set` (and plain `Header set` for Cache-Control, as the top does), and the policy in the page too. | Bench `tools/build.mjs` | real Apache 2.4.58: one header of each |
| 4 | Maker Forge writes HTML in 164 places and had no Trusted Types; Bench does. At one address, the weaker app guards both apps' data. (Honestly: the site's rules already stopped an escaping slip from running a script; this is a second line.) | Trusted Types policies in the app (a cleaning `default`, `mf-url` for its own workers only, `mf-xml`, `mf-tpl`); the website's import asks for them only when the app makes them. | Maker Forge 0.67.1 `src/app.html`; Website `tools/import-maker-forge.py` | `CSP=site npm run check:browser`: every page under them, nothing of the app's cleaned, hostile HTML cleaned; the import on real Apache: 29 objects |

Found along the way: Maker Forge's own rule refused its helper thread when opened from disk (`blob:null/` against an origin
that reads `file://`); the normal browser check caught it and it was fixed before anything was pushed.

## 4. Approaches considered for the suite

**How shared code reaches each app** (the owner handed over the how: "reuse any code wherever you see fit"; this is my call):
- **A. One suite kit, copied into each app by its own build (chosen).** The kit's files live in one place; Shaper's `build.py`
  inlines them (Shaper stays one file, works offline), Bench's esbuild bundles them. Each app names the kit version it carries
  and a check fails if its copy differs. Trade-off: an update reaches an app at its next release, not instantly.
- **B. Shared files served at runtime from `/suite/`.** One copy, instant updates. Rejected: Shaper must work as one file
  opened from disk, and it adds requests at start (one.com's limit).
- **C. Each app copies what it likes.** No new place to keep. Rejected: three copies of Easy reading already drift (the
  website's `r0-prefs`, Shaper's `makerforge.prefs`, Bench's `bench.settings` have different switches and sizes).

**How apps share one address** (decided by the owner: one address, folders). The alternative, a subdomain per app, would wall
each app's data off but needs a messaging layer for every hand-off and more of one.com's three websites.

## 5. The address: what goes where

| Path | What | Notes |
|---|---|---|
| `/` | **The Maker Forge home** | The suite's front door: the apps, recent projects across them, "what's next", storage used, Easy reading. Its rules are the strictest (no blob:, no wasm). |
| `/shaper/` | **Maker Forge Shaper** (today's Maker Forge) | Its own `.htaccess` with today's rules plus Trusted Types. |
| `/bench/` | **Maker Forge Bench** | The packed copy from section 3. |
| `/calc/`, `/circuit/`, … | Later apps | Each its own folder and `.htaccess`, after the checklist in section 9. |

**Old links keep working:**
- A share link is `forge.retr0plus.se/#p=…` (or `#j=…`): the part after `#` never reaches the server, so **the home page
  itself** forwards any `#p=`/`#j=` to `/shaper/#…` before drawing anything. A test opens an old share link.
- Plain visits to `/` land on the home, with Shaper first.
- retr0plus.se's Launch button and terminal `cd app` go to `/shaper/` (`FORGE_APP_URL` in the website's `build-pages.py`);
  `/maker-forge/app/` still redirects there; `/api/forge` reads `/shaper/about.json`.
- Bench's "Send to Shape" (`SHAPE_URL`) opens `/shaper/`. Saved data is untouched by the move: storage belongs to the address
  (`forge.retr0plus.se`), not the folder.

**The name:** "Maker Forge" is the suite and its home; the apps are **Maker Forge Shaper** and **Maker Forge Bench**
("Shaper", "Bench"). Shaper's repository keeps its name (`Retr0Plus95/Maker-Forge`) so links, releases and the website's
import keep working; its README, title, manual and Start page say Shaper. Bench's docs and code say "Shape" in about 40
places: those become "Shaper".

## 6. Saved progress

**What is wrong today at one address** (measured in Chromium, 2026-11-28): the browser's small storage (localStorage) holds
about **5.2 million characters per address, shared by every app there**. Shaper's autosave may use 3.5 million of them,
leaving 1.7 million for Bench and every app after it; and Shaper's save is wrapped so that a full storage fails **silently**.
Bench returns "not saved" in the same case. With more apps this will lose someone's work.

**The plan:**
- **Small settings stay in localStorage; anything big goes to IndexedDB** (the browser's database, with room in the
  hundreds of MB). Shaper's autosave, recent projects and pictures move to an IndexedDB database `shaper`; Bench's drawings
  already sit in IndexedDB and its progress joins them. On first start the old `makerforge.project` is copied across, checked
  by reading it back, and only then removed. A save that fails is said in words ("This browser is full: Save to a file"), never
  swallowed.
- **Names:** each app keeps its own prefix and database: Shaper keeps `makerforge.*` (renaming it would risk the autosave of
  everyone who has one), Bench `bench.*`, new apps `<app>.*`. Shared things use `suite.*` and a database `suite`.
- **Shared between apps** (in the kit, section 7):
  - `suite.prefs`: Easy reading once for all apps: text size 100 to 175 %, high contrast, the clear font (Atkinson), less
    motion, light or dark. Read from each app's old setting on first start.
  - `suite.ai`: **one** Claude key (Bench roadmap 2.0's "one key for the whole suite"). Kept for this visit only unless
    Remember is ticked; only ever sent to `api.anthropic.com`. Today there are two copies (`makerforge.ai`, `bench.ai`); the first
    app to start under the kit moves a remembered one across and deletes both old copies.
  - `suite.printer`: the printer and its bed. Shaper has a printer list; Bench's Case tab asks "does it fit your printer?" on
    its own. One answer for both.
  - `suite` database, `projects`: one line per project (name, repo, what each app holds: Bench's ticks done of total, Shaper's
    parts printed), for the home's recent list and "what's next" ("3 parts left to solder, the case lid isn't printed yet").
  - **Hand-offs** go through an inbox per app (`suite.inbox.shaper`), cleaned by the receiving app as any outside data.
    Bench's Send to Shape writes `makerforge.parts` directly today; it moves to the inbox, and Shaper keeps reading the old
    place for a year.
- **The project file** stays the meeting point between apps and devices: `forge-project.json`, every app keeping sections it
  doesn't understand exactly as found (Bench's `project.js` already does; it becomes the kit's reader).
- **Backups:** "Save everything" on the home page writes one file with every app's saved work; "Open a backup" puts it back.
  Each app keeps its own "Forget everything", which clears only its own data; the home's clears the whole suite, listing what
  each app keeps before it does.

## 7. Shared code: the suite kit

What goes in it, and where each piece comes from ("reuse any code"):

| Kit file | What | Taken from |
|---|---|---|
| `theme.css` | The website's tokens (substrate `#150a24`, traces `#6d28d9`/`#a855f7`, gold pads `#d4a54a`/`#ffd88a`, silk `#ede7f6`, amber, red), edge-cut corners, buttons, panels, Easy reading classes, the seasons | Website `site/css/style.css` (tokens, "Edge-cut PCB", Easy reading, seasons sections) |
| `fonts/` | Chakra Petch, Share Tech Mono, IBM Plex Sans, Space Grotesk (logo), Atkinson Hyperlegible; OFL, with licences | Website `site/fonts/` (Shaper already builds fonts in; Bench ships Atkinson) |
| `suite-bar` | The top bar every app shows: the logo with its gold plus pad, the app's name, a switcher to the other apps and home, the Easy reading button | Website header + Easy reading panel, rebuilt with `createElement` only |
| `storage.js` | Prefixed localStorage, IndexedDB helpers, the move of old saves, quota errors in words, the storage meter | Bench `store.js`; new |
| `prefs.js`, `ai.js` | `suite.prefs` and `suite.ai` with their cleaners | Bench `settings.js`, `ai-settings.js`, `ai.js`; Shaper's `PREFS_DEFAULT` |
| `project.js` | Reads and writes `forge-project.json`, keeping unknown sections | Bench `project.js` |
| `tt.js`, `sanitize.js` | The Trusted Types policies; the SVG cleaner | Shaper's `TT` block (section 3); Bench `sanitize.js` |
| `fetchqueue.js` | Few requests at once to the site | Bench (section 3) |
| `checks/` | The one.com stand-in (HTTP/2, the 11th refused) and a rules check for each folder's `.htaccess` | Bench `tests/browser/onecom.js`; new |

Plain JavaScript modules with no page code where possible, so they run in Node for tests, as both apps already do.

## 8. The look: the website's themes across the suite

- **Default:** the website's dark purple board (its tokens, fonts and edge-cut corners). The home page also gets the printed
  perfboard dots and gold traces (`js/traces.js`). In the apps, the work area stays calm: no traces behind the 3D view or a
  drawing. That's my call, so the background never fights the model.
- **Easy reading** is the website's: text up to 175 %, high contrast, Atkinson, calm mode (no animation). Its switches are
  already what Shaper and Bench offer, with names to line up.
- **Seasons** follow the website: Halloween week and December, by date, with `?season=` to preview. On the home page and the
  app bar only; calm mode and high contrast turn them off.
- **Light or dark:** the website is dark only. Shaper and Bench both have a light theme today, used in a bright workshop and for
  printing. Proposal: a light "white solder mask" variant of the same tokens (white board, purple traces, gold pads). **The
  owner picks the look from mockups before anything is built** (the website's rule: show a small demo, then ask).
- Shaper's 3D view keeps its own bed and model colours (they show filament colours, which must stay true); only the panels
  around it change.

## 9. Security rules for every app in the suite

At one address, apps share their saved data, so **every app must meet the same baseline before it is published**:
- **Policy, per folder, in `.htaccess` with `Header always set`, and the same in the page:** `default-src 'none'`;
  `script-src 'self'` (plus `blob:` and `'wasm-unsafe-eval'` only where the app's checked downloads need them: Shaper);
  `require-trusted-types-for 'script'` with the app's named policies; `base-uri 'none'`; `form-action 'none'`;
  `frame-ancestors 'none'`; `connect-src 'self'` plus only the hosts the app talks to at the visitor's request (GitHub,
  `api.anthropic.com`, Ollama on the visitor's own computer); `img-src`/`font-src` self, `data:`, `blob:` as needed.
  `style-src 'unsafe-inline'` is allowed (both apps need it; styles can't run code, and nothing outside can be loaded).
- **No HTML from strings without a cleaner;** no `on…=` attributes; no inline scripts in the published copy.
- **Everything self-hosted and pinned**, checked by SHA-256 (Shaper's `AI_FIGURE`); nothing from another website unless the
  visitor asks (a GitHub link, their own Claude key).
- **Saved data:** each app only writes its own prefix and database, plus `suite.*` through the kit. Data from another app, a
  project file or a backup is cleaned like any outside data. Keys only in `suite.ai`, for this visit unless remembered.
- **Few requests at once:** each app's published copy passes the one.com stand-in (no refusals, at most 6 at once).
- **The deploy checks it:** a folder whose `.htaccess` lacks `always set` or Trusted Types, or whose page has an inline script,
  is not uploaded.
- **No cookies, analytics or trackers;** `Permissions-Policy` off for camera, microphone and location unless an app needs one
  (Bench's photos come from files).

**Adding an app** (the checklist the roadmap points to): useful on its own; its own repository; a build that makes one folder
with its `.htaccess`; the kit at a named version; the baseline above; Easy reading and the suite bar; its prefix and database;
the one.com test; an entry in the home's app list and the deploy's list.

## 10. Publishing: one updater for the whole site

`tools/forge-update.mjs` (Website) watches one repository today and uploads it to the site's root. It grows into the suite's
updater: `deploy/forge/update.json` lists the apps (`home`, `shaper`, `bench`, later others: repository, branch, folder, test,
build). Each app is checked and built on its own; a failing one keeps its last good copy while the others update. The site is
put together in `dist/forge/` (home at the root, each app in its folder) and uploaded in one go; the upload only ever removes
files it put there itself. The website's import becomes the Shaper step; Bench's step is `npm ci`, its tests, `npm run build`.

## 11. The roadmap

The suite's own `ROADMAP.md` (with the home, section 12) lists every app with its status, from Bench's "The apps in the suite"
and Shaper's roadmap:

| Part of a project | App | Status |
|---|---|---|
| The whole project | **Maker Forge** (home) | With this design |
| Design | **Shaper**: 3D-printed parts and boxes, parametric at 2.0 | Exists (Maker Forge 0.67) |
| Build | **Bench**: read the drawings and build the board | Exists (1.0.5), published with this design |
| Learn and plan | **Calc** (electronics calculators), **Pins** (a microcontroller's pins), **Parts** (what you have, what to buy) | Planned (Bench roadmap) |
| Design | **Circuit**: draw the circuit and lay out perfboard and stripboard | Planned, after Bench 1.0 |
| Build | **Labels**: bins, wires, front panels | Idea |
| Test | **Serial**: talk to the board and graph it | Idea |
| Share | **Journal** (a build notebook to retr0plus.se), **Live** (a stream page) | Idea |
| Shared, not an app | **The Maker Forge Library**: one set of parts every app reads (Shaper's 0.63 parts library, Bench's 3D parts) | Started |

**ShopFlow (PitBoard)** was cloned into this session too. It runs a car workshop on one PC on the shop's own network, with
customer data that must never leave it, so it can't live on forge.retr0plus.se. What the suite can borrow from it: a role
per device (1.7), a theme made only of tokens so a shop's own colours swap in with contrast checks (2.7), the calm-UI rule,
and its strict rules (no inline scripts, Origin checks). Whether it should be listed as a related app is the owner's call.

## 12. Ideas and improvements (the owner asked for them)

1. **What's next, across apps**, on the home page, from the projects list (Bench roadmap 2.0).
2. **One backup file** for the whole suite (section 6).
3. **A storage meter** on the home: how much each app keeps, with its Forget button.
4. **Ctrl+K across the suite:** Bench's "find anything" opens a part, a project or another app.
5. **One printer** for Shaper's plates and Bench's "fits your printer" (section 6).
6. **Bench → Shaper through the project file's `board` section**, so the box follows the board (Bench roadmap 2.0), and
   Shaper's printed parts into Bench's checklist.
7. **The suite bar's app switcher keeps the project:** switching to Bench with a project open in Shaper opens the same one.
8. **Offline install** of the whole suite later (a service worker per folder, so one app's update can't break another).
9. **A project page on retr0plus.se from `forge-project.json`** with "Open in Bench" and "Open in Shaper" (Bench roadmap 2.1).
10. **Shared "Your parts":** the boards Bench sends and the boards measured in Shaper in one list.

## 13. Bugs and weaknesses found, and what happens to each

| Found | Status |
|---|---|
| Bench didn't start on one.com (60 scripts) | Fixed (section 3, #1) |
| Bench's 3D parts partly missing on one.com | Fixed (#2) |
| Two policies at once in a folder under Maker Forge's | Fixed for Bench (#3); the deploy check in section 9 keeps it fixed |
| Maker Forge without Trusted Types next to Bench | Fixed (#4), on the site after the next forge-update |
| Maker Forge refused its own helper thread from disk (introduced and caught here) | Fixed before pushing |
| Shared 5.2 M-character storage; Shaper's autosave fails silently when it's full | In this design (section 6), first to build |
| The Claude key kept twice, in two apps' storage | In this design (`suite.ai`) |
| Share links in the address's `#` can't be redirected by the server | In this design (the home forwards them) |
| Bench's browser tests for 3D models, GitHub sources and a slow phone fail in this cloud container, on the untouched code as well (and pass or fail from run to run) | To look at in Bench: flaky timing with software 3D, not caused here |
| Bench's `package.json` says 0.1.0 while Bench is 1.0.5 | Small: set it at Bench's next release |
| The website's import can't run here (Hugging Face is blocked by this environment's network) | Tested with that one model skipped; the owner's desktop runs the real one |

## 14. The order of work

1. **Done:** the fixes (section 3): Bench and Website branches pushed; Maker Forge 0.67.1.
2. **The kit and saving** (section 6 and 7): the kit's first files; Shaper's autosave to IndexedDB with the move of old saves;
   failed saves said in words.
3. **The look:** mockups of the suite bar, the home and both apps in the website's theme, dark and the light proposal, for the
   owner to pick. Then `theme.css`.
4. **The move:** Shaper at `/shaper/`, the home at `/`, old links, the suite updater, Bench published.
5. **Shared settings:** `suite.prefs`, `suite.ai`, `suite.printer`, the projects list, the hand-off inbox.
6. **The roadmap** entries and the "adding an app" checklist.

Each step is its own release and pull request in each repository it touches (the owner's rule), with its HANDOFF/README notes.

## 15. Left to the builder

The kit's exact file layout and API names, the IndexedDB schema, how each app's build pins the kit version, the home page's
layout within the chosen look, and test names, following each repository's conventions.

## 16. Questions only the owner can answer

1. **Where the kit and the home page live:** a new public repository (my suggestion: `Retr0Plus95/Maker-Forge-Home`, MIT,
   holding the kit, the home page and the suite roadmap), or inside an existing one. The Website repository is private, so a
   kit there couldn't be copied into the public apps' builds.
2. **The look:** a light variant next to the dark purple board, or dark only like the website (decided from mockups).
3. **ShopFlow:** listed in the suite's roadmap as a related app, or left out.
