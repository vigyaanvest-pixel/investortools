## 1. Business value & outcome

**Problem / who it's for.** Active retail investors (US + India) juggle three separate
VigyaanVest extensions — Symbol 360 (research), Market Calendar, and Market Squawk (news) —
that don't share a watchlist, theme, or context. This epic unifies them into **one connected
trader workspace**.

**Value / ROI.** One install replaces three; the watchlist drives research, screening, the
event calendar, and the live news tape in a single surface. Less friction, higher daily
engagement, a cleaner story for the store listing and for porting to India.

**Strategic rationale / moat.** A connected, local-first, privacy-respecting terminal
(no account, no server, no tracking) is differentiated from cloud SaaS terminals and is
cheap to operate. It also showcases the VigyaanVest brand across markets.

**Success metrics (KPIs).**
- 1 extension replaces 3; packaged size **< 100 KB**.
- All design surfaces shipped (Deck / Grid / Settings / ⌘K / Calendar / The Tape / Dock).
- Live data with honest gaps (missing fields render `—`, never faked).
- Core flows pass on current **Chrome and Edge**; **no server** required.
- Passes Chrome Web Store + Edge Add-ons review (privacy + permission justifications done).

## 2. Scope — what this epic delivers

App shell + persistence · Deck live research · Grid screener · Calendar sync + alerts ·
The Tape + Squawk TTS · Dock side panel (page extraction) · ⌘K + add-symbol ·
Settings + export/import · Packaging, cross-browser & store readiness.

**Explicitly not in scope (v1):** trade execution, portfolio/P&L, real-time streaming,
accounts, cloud sync, AI features, nasdaq-halt-monitor.

## 3. Key decisions (locked)

- Vanilla HTML/CSS/JS, no framework; build step only **minifies** for the store.
- Live data: Yahoo (quote+chart) primary; Finviz (US) / Screener.in (India) fill gaps;
  calendar from `vigyaanvest.com/publicdata` (version-gated); TTS via `chrome.tts`.
- Local-first: all state in `chrome.storage`; no backend; no analytics.
- Markets: US ($), NSE (₹), BSE (₹). License: **proprietary**.
- All cross-origin fetches run in the MV3 service worker under `host_permissions`.

## 4. Stories

Tracked as **native sub-issues** of this epic (see the *Sub-issues* panel). For reference:

| # | Story |
| --- | --- |
| #2 | App shell, navigation, theming & local persistence |
| #3 | Deck — live single-symbol research terminal |
| #4 | Grid — watchlist screener |
| #5 | Calendar — sync, forward ribbon, overlay & alerts |
| #6 | The Tape — live headlines & Squawk read-aloud |
| #7 | Dock — side panel page extraction (Symbol 360) |
| #8 | ⌘K command palette & add symbol |
| #9 | Settings & data portability (export / import) |
| #10 | Packaging, cross-browser & store readiness |
| #11 | End-to-end browser test (Chrome + Edge) |

## 5. Out of scope / fast-follow

- **Security hardening (fast-follow, high priority):** HTML-escape all externally-sourced
  strings (company names, headlines, page-extracted values) before DOM injection — a known
  XSS gap in the current build; each story carries the escaping AC.
- Real-time streaming quotes; market picker in ⌘K; CSV export; column show/hide.
- Compressing the brand logo further; optional minify hardening.

## 6. References

- PRD: `public-tools/vigyaanvest-workspace/docs/PRD.md`
- Design prototype: `public-tools/VigyaanVest Plugin Designs/` (`VigyaanVest Workspace.html` + `HANDOFF.md`)
- Build/architecture: `public-tools/vigyaanvest-workspace/README.md`
- Privacy / permissions / listing: `PRIVACY.md`, `PERMISSIONS.md`, `STORE_LISTING.md`

## 7. Definition of Done (epic)

All 9 stories accepted (every acceptance checkbox ticked on a real Chrome **and** Edge
load-unpacked), KPIs in §1 instrumented/verified, security ACs (HTML-escaping) passing,
and `dist.zip` validated (manifest at root, < 100 KB) and ready for store submission.
