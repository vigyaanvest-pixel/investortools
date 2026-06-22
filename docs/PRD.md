# PRD — VigyaanVest Trader Workspace

**Status:** v1.0 candidate · **Owner:** VigyaanVest · **Last updated:** 2026-06-20
**Repo:** `vigyaanvest-pixel/investortools` · extension at repo root

---

## 1. Summary

VigyaanVest Trader Workspace is a Chrome/Edge (MV3) browser extension that unifies three
existing VigyaanVest extensions — **Symbol 360** (research overlay), **Market Calendar**,
and **Market Squawk** (headline reader) — into **one connected pro-trader workspace**.
It implements the approved design prototype in `public-tools/VigyaanVest Plugin Designs/`.

It is **local-first** (no backend, no account), **serverless**, and works identically on
Chrome and Edge. All third-party data comes from public HTTPS endpoints called from the
background service worker.

## 2. Problem & opportunity

Active retail investors juggle several single-purpose extensions (research, calendar, news)
that don't share a watchlist, theme, or context. Switching between them is friction; nothing
ties a symbol's research to its upcoming earnings or its live news mentions.

**Opportunity:** one terminal where the watchlist drives research (Deck), screening (Grid),
the event calendar, and the live news tape — with read-aloud and a page-reading side panel —
so the user stays in one surface.

## 3. Goals & success metrics (KPIs)

| Goal | KPI |
| --- | --- |
| Consolidate 3 tools into 1 | 1 extension replaces 3; install footprint < 100 KB packaged |
| Faithful to the approved design | All design surfaces (Deck/Grid/Settings/⌘K/Calendar/Tape/Dock) shipped |
| Real, honest data | Live quotes/fundamentals/calendar/news; missing fields show `—`, never faked |
| Zero-friction, private | No server, no account, no tracking; loads/works offline-degraded |
| Cross-browser | Loads + core flows pass on current Chrome **and** Edge |
| Store-ready | Passes Web Store + Edge Add-ons review; privacy + permission justifications complete |

**Non-goals (v1):** trade execution, portfolio/P&L tracking, real-time streaming quotes,
push/cloud sync, accounts, AI features.

## 4. Users

- **Primary:** active retail investor / swing trader tracking a watchlist across US + India.
- **Secondary:** researcher who reads stock pages and wants a quick metric/side-panel reader.

## 5. Scope (v1)

Deck (live single-symbol research) · Grid (watchlist screener) · Calendar (sync + ribbon +
overlay + alerts) · The Tape (live headlines + TTS) · Dock side panel (page extraction) ·
⌘K (jump/add symbol) · Settings (+ export/import) · App shell (theme/density/persistence) ·
Packaging (minified, cross-browser, store-ready).

## 6. Key decisions (locked)

- **Vanilla HTML/CSS/JS, no framework, no build step to run** (build only minifies for store).
- **Live wiring**, not mock data: Yahoo Finance (quote+chart) primary; Finviz (US) /
  Screener.in (India) fill gaps; calendar from `vigyaanvest.com/publicdata` (version-gated);
  TTS via `chrome.tts`; page extraction + headline scraping via content scripts.
- **Local-first**: all state in `chrome.storage`; no backend; no analytics.
- **Markets:** US ($), NSE (₹), BSE (₹).
- **License:** proprietary (VigyaanVest owns the reused code).
- **Scope = the 3 design extensions only** (not nasdaq-halt-monitor).

## 7. Architecture (reference)

MV3 module service worker (router + alarms + notifications + tape buffer + page-context),
content scripts (page-extract; squawk headline scraper), workspace tab + side panel,
`window.VVDATA` data layer over `chrome.storage`. See `README.md`.

## 8. Data sourcing & honesty

Yahoo `quoteSummary` may 401 without a crumb → fall back to the chart endpoint + vendor
scrape; any field not available renders as `—`. Calendar uses only the public data feed
(no bundled fixtures). All cross-origin fetches run in the worker under `host_permissions`.

## 9. Risks

- **XSS:** fetched company names / scraped headlines / page-extracted values are rendered
  into the DOM — must be HTML-escaped (tracked as a security AC across stories). *(Known gap
  in the current build: several render paths use `innerHTML` without escaping.)*
- **Third-party fragility:** public endpoints can rate-limit or change markup → degrade to
  `—`; never block the UI.
- **Store review:** broad host permissions require clear justifications (provided).

## 10. Epic & stories

See `[Epic] Unified Trader Workspace v1.0` and its 9 stories (this PRD is the epic's
reference doc). Definition of done = all stories accepted + KPIs in §3 met.
