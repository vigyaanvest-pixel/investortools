**Epic:** #1

## 1. User story
As an investor researching a symbol, I want a focused terminal that pulls live price,
fundamentals, a chart, and my own thesis notes, so that I can size up a name without leaving
the workspace.

## 2. Business value
Deck is the Symbol 360 replacement — the core daily research surface; live data + editable
notes is the reason to open the app.

## 3. User workflow(s) — Given / When / Then
- **Focus:** Given the watchlist, When I click a symbol, Then Deck shows a loading skeleton
  then live quote + fundamentals (price, %chg, mkt cap, 52-wk, avg vol, P/E, fwd P/E, ROE,
  ROCE, D/E) with a source/provenance line.
- **Missing data:** Given a field a source doesn't expose, When the quote resolves, Then that
  field shows `—` (never a fabricated value).
- **Chart:** Given the Research setting "TradingView embed" is on, When Deck renders, Then a
  TradingView chart for the symbol shows; when off, a sparkline from the live daily series.
- **Edit notes:** Given Deck, When I edit setup/status/tags/thesis/review inline, Then the
  change saves per-symbol and is reflected in the rail and Grid.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] Clicking a watchlist row focuses that symbol and marks it active in the rail.
- [ ] A skeleton shows while the quote is being fetched.
- [ ] On resolve, price + absolute change + %change render with up/down color.
- [ ] Metric strip shows Mkt Cap, 52-wk, Avg Vol, P/E, Fwd P/E, ROE, ROCE, D/E.
- [ ] Any field unavailable from the source renders `—` (no fabricated numbers).
- [ ] Provenance line shows the source (e.g. "↑ Yahoo Finance") and a freshness age.
- [ ] US symbols resolve via Yahoo with Finviz filling gaps; India via Yahoo + Screener.in.
- [ ] TradingView embed renders when the setting is on; sparkline renders when off.
- [ ] Editing setup chip persists and re-highlights the chosen chip.
- [ ] Changing status persists and updates the rail dot + Grid badge.
- [ ] Adding/removing tags persists and re-renders the tag chips.
- [ ] Editing bull/bear/trigger/stop/review persists per symbol.
- [ ] Quick-links open the correct external source pages in a new tab.
- [ ] **Edge case:** a symbol that returns no data shows `—` across the strip and a clear source line, no crash.
- [ ] **Edge case:** rapidly switching symbols renders the last-clicked symbol's data (no stale overwrite).
- [ ] **Edge case:** Yahoo `quoteSummary` 401/429 still yields price+series from the chart endpoint.
- [ ] **Security:** all fetches occur in the background worker under `host_permissions` (no page-side cross-origin calls).
- [ ] **Security:** the ticker is sanitized before being placed in any request URL.
- [ ] **Security:** company name and any fetched strings are HTML-escaped before DOM injection (no XSS).
- [ ] **Security:** inline-edited note content is stored/rendered without executing markup.

## 5. Edge cases
No-data symbol; 401/429 from Yahoo; rapid symbol switching; non-US/India suffix; very long
company name; offline (degrade to cached/`—`).

## 6. Security cases
Cross-origin only in worker; ticker injection into URLs; XSS via company name; XSS via
contenteditable notes; provenance cannot be spoofed into a clickable script.

## 7. Dependencies
Story 01 (shell/persistence).

## 8. Notes / technical
`workspace.js` `renderCenter`/`focusDeck`; `data.js` `hydrate`; worker `FETCH_QUOTE`;
`src/background/market-data.js`. Cache: `vvw-quotes`.
