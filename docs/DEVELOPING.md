# Developing — VigyaanVest Trader Workspace

Internal notes for building, packaging, and the architecture. (End-user install lives in the
top-level `README.md`.)

## Run from source (no build)
The extension runs unbuilt — `Load unpacked` the repo root (`manifest.json` is at root).

## Build & package
```
npm install        # esbuild (+ puppeteer for the smoke test)
npm run build      # -> dist/  (JS minified with esbuild; imports/paths preserved)
npm run package    # -> dist/ + trader-workspace.zip  (forward-slash entries, manifest at root)
npm run smoke      # puppeteer load-unpacked checks (BROWSER=edge for Edge)
```
- esbuild is transform-only (no bundling) so the module service worker + content scripts stay
  as separate files with their relative imports. If esbuild isn't installed locally, the build
  reuses the copy in the sibling `public-tools/{investor-overlay,market-calendar}` checkouts.
- `dist/` is runtime-only (no comments, `tools/`, `node_modules`, `package.json`, docs).
- `trader-workspace.zip` is both the **public download** (served by Pages at
  `investortools.vigyaanvest.com/trader-workspace.zip`) and the **store upload** (manifest at zip root).

## Lightweight & cross-browser
- No server. Works on Chrome and Edge (Chromium MV3). Only network traffic is HTTPS API calls
  (Yahoo / Finviz / Screener quotes, `vigyaanvest.com/publicdata` calendar, TradingView chart).
- Event-driven service worker (no persistent page): wakes on alarms (calendar sync 08:00/18:00,
  1-min alert check), messages, and headline pushes.
- Uses only Chrome+Edge APIs (`runtime/storage/tabs/windows/alarms/notifications/tts/action/sidePanel`);
  `sidePanel` is guarded with an in-app overlay fallback for older Edge.

## Architecture
```
manifest.json                MV3: action, side_panel, module service worker, content scripts
assets/  styles/             icons + brand marks; theme.css (tokens) + workspace.css
index.html  privacy.html     GitHub Pages landing + privacy policy (served at the custom domain)
workspace/
  index.html / workspace.js  the Trader Workspace tab (Deck / Grid / Settings / ⌘K / Calendar)
  data.js                    live data layer (window.VVDATA) over chrome.storage + worker
  sample.js                  sample dataset (preview/demo fallback only)
sidepanel/                   the Dock — reads the active tab's stock page
src/
  shared/    symbols.js, format.js, theme.js
  background/ service-worker.js, market-data.js (Yahoo/Finviz/Screener),
             calendar-sync.js (publicdata sync + alerts), tts.js (Squawk)
  content/   page-extract.js (Dock), sources.js + squawk.js (tape scraper)
tools/       build.mjs (minify), zip.ps1 (package), smoke-test.mjs
docs/        this file, PRD.md, issues/, STORE_LISTING.md, PERMISSIONS.md
```

### Data-flow seams
- **Quote:** workspace → `FETCH_QUOTE` → worker (`market-data.js`) → patch → `data.js` merge.
- **Calendar:** worker `syncCalendar` (fetches `calendar.json` directly, gated on its `v`) → `chrome.storage(vvw-calendar)` → `data.js` buildCalendar.
- **Tape:** news tab (`squawk.js`) → `TAPE_PUSH` → worker buffer (`vvw-tape`) → `data.js` buildTape.
- **Dock:** stock tab (`page-extract.js`) → `PAGE_CONTEXT` → worker session → `GET_PAGE_CONTEXT`.

### Honesty about data
All third-party fetches run in the worker under `host_permissions`. Public endpoints can
rate-limit or change markup; the UI degrades to `—` rather than faking values. All
externally-sourced strings are HTML-escaped before rendering (XSS guard).

## Store submission
See `docs/STORE_LISTING.md` (listing copy + screenshot shot-list) and `docs/PERMISSIONS.md`
(per-permission justifications). Privacy policy is live at
`investortools.vigyaanvest.com/privacy.html`.
