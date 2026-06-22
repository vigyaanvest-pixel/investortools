**Epic:** #1

## 1. User story
As an investor with a watchlist, I want it as a sortable, filterable table with a detail
drawer, so that I can scan all my names at once and drill in.

## 2. Business value
Grid turns the watchlist into a screener — the "scan everything" complement to Deck's
single-symbol focus.

## 3. User workflow(s) — Given / When / Then
- **Scan:** Given Grid, When it renders, Then each row shows symbol, last, %chg, 5-day
  sparkline, P/E, ROE, D/E, setup, status, next event + countdown, and tape count.
- **Sort:** Given the table, When I click a sortable header, Then rows sort by that column
  and toggle asc/desc; the active sort caret shows.
- **Filter:** Given the filter rail, When I toggle market / status / signal filters, Then the
  table and the live counts update.
- **Drill:** Given a row, When I select it, Then the detail drawer shows snapshot + chart +
  thesis + tape mentions, and "Open in Deck" switches to Deck for that symbol.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] Each row renders symbol, company, last, %chg (colored), sparkline, P/E, ROE, D/E.
- [ ] Each row shows setup, status badge, next event + countdown, and tape count.
- [ ] Clicking a sortable header sorts by it; re-click reverses; caret shows the direction.
- [ ] Market filter (All/US/NSE/BSE) filters rows.
- [ ] Status checkboxes filter rows; counts beside each reflect the watchlist.
- [ ] Signal filters (event this week / in the tape / review overdue) filter correctly.
- [ ] "Watchlist health" shows average %chg and green count.
- [ ] Selecting a row opens the detail drawer with snapshot, chart, thesis, tape mentions.
- [ ] "Open in Deck" switches to Deck focused on that symbol.
- [ ] **Edge case:** all filters off → "No symbols match these filters." (no crash).
- [ ] **Edge case:** a symbol with no live data yet sorts/filters without error (treats `—` as missing).
- [ ] **Edge case:** sorting is stable for equal values.
- [ ] **Security:** company names and tape headlines in rows/drawer are HTML-escaped (no XSS).
- [ ] **Security:** no row action triggers a cross-origin request from the page context.

## 5. Edge cases
Empty result set; symbols lacking metrics; equal sort keys; very large watchlist; status
counts after edits.

## 6. Security cases
XSS via company/headline strings in table + drawer; safe numeric parsing of `—`/currency
strings; no injection via `data-sym` attribute.

## 7. Dependencies
Story 01 (shell), Story 02 (quotes), Story 05 (tape counts).

## 8. Notes / technical
`workspace.js` `renderRows`/`renderDetail`/`gridRows`/`updateGridSidebar`.
