**Epic:** #1 · _(label: type: task — QA/verification)_

## 1. Goal
Validate the published build of the VigyaanVest Trader Workspace **end-to-end on a real
browser** (Chrome **and** Edge), against the epic's acceptance criteria — the part that
static review can't cover (live data, alarms, TTS, side panel, no SW-console errors).

## 2. Workflow — trigger → behavior
- **Given** the repo is checked out, **When** an agent runs the steps below, **Then** every
  acceptance checkbox in §5 is verified pass/fail and screenshots are captured for the store.

## 3. Setup
```
git clone https://github.com/vigyaanvest-pixel/investortools.git
cd investortools
npm install            # installs puppeteer (devDependency) + esbuild
npm run build          # produces dist/  (minified, runtime-only)
```

## 4. How to test

### A) Automated smoke test (puppeteer load-unpacked)
Runs the live checks that map to the epic AC and prints a pass/fail summary; exit code 0 = all passed.
```
npm run smoke                 # Chrome (headful)
$env:BROWSER="edge"; npm run smoke   # Edge (PowerShell)   — or  BROWSER=edge npm run smoke (bash)
```
- Note the XSS regression check in the smoke test must now **PASS** (metric values were routed
  through `esc()`); flag it if it fails.
- Capture the full console summary in the issue.

### B) Manual load-unpacked (do for BOTH Chrome and Edge)
1. Open `chrome://extensions` (or `edge://extensions`) → enable **Developer mode**.
2. **Load unpacked** → select the **`dist/`** folder (or the repo root for the source build).
3. Click the toolbar icon → the **Trader Workspace** tab opens.
4. Open the service-worker console (Inspect views: service worker) → confirm **no errors**.
5. Walk each surface per §5.
6. While open, capture **1280×800 screenshots**: Deck, Grid, Calendar overlay, The Tape, Dock side panel (shot list in `STORE_LISTING.md`).

## 5. Acceptance criteria (tick-off while testing the running extension)
- [ ] Loads unpacked in **Chrome** with **no service-worker console errors**.
- [ ] Loads unpacked in **Edge** with **no service-worker console errors**.
- [ ] `npm run smoke` exits 0 on Chrome (all checks pass).
- [ ] `npm run smoke` (BROWSER=edge) exits 0 on Edge.
- [ ] **Deck:** focusing a watchlist symbol shows a skeleton then a **live** quote + fundamentals; missing fields render `—` (not fabricated).
- [ ] **Deck:** chart renders (TradingView embed on, or sparkline off); inline edits (status/setup/tags/thesis) persist across reload.
- [ ] **Grid:** rows show live %chg/sparkline/P-E/next-event/tape count; header sort + market/status/signal filters work; detail drawer + "Open in Deck" work.
- [ ] **Calendar:** "Sync now" pulls from `vigyaanvest.com/publicdata`; ribbon + Month/Week overlay render; a watchlist ★ opens that symbol in Deck.
- [ ] **Alerts:** an earnings/macro alert within the configured window fires a desktop notification (once).
- [ ] **The Tape:** open TradingView News Flow / Finviz / MarketWatch / Zerodha Pulse → headlines stream into the Deck rail within seconds.
- [ ] **Squawk:** ▶ reads the top N headlines aloud; ▶ again stops; voice/rate/volume settings take effect.
- [ ] **Dock:** on a Yahoo/Screener/NSE page the side panel shows "live page" metrics; "Open in full terminal" opens the workspace on that symbol.
- [ ] **⌘K:** opens, filters, and adds a new ticker (`TCS.NS`, `RELIANCE.BO`, `AAPL`) with a live fetch.
- [ ] **Settings:** all controls persist across reload; Export downloads JSON; Import (merge) restores it.
- [ ] **Security (XSS regression):** a crafted headline/company name containing `<img onerror=…>` renders as inert text — no element, no handler fires (smoke test asserts this).
- [ ] **Cross-browser:** no feature hard-fails on Edge (side panel present, or graceful overlay fallback).
- [ ] **Privacy URL** loads: https://investortools.vigyaanvest.com/privacy.html (and github.io mirror).
- [ ] Screenshots (1280×800) captured for Deck / Grid / Calendar / Tape / Dock and attached.

## 6. Edge cases to probe
No-data symbol; Yahoo 401/429 (chart fallback still shows price); feed down (no fabricated events);
no news site open (tape empty-state); older Edge without `sidePanel` (overlay fallback); offline.

## 7. Security cases
XSS via headline/company/page-extracted strings (must be escaped); content scripts only on declared
match patterns; all third-party fetches from the worker; no PII in notifications; no remote code.

## 8. Deliverable
Comment on this issue with: smoke-test summary (Chrome + Edge exit codes), the §5 checklist ticked,
any failures with repro, and the 5 store screenshots attached.
