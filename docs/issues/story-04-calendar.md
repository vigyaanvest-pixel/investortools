**Epic:** #1

## 1. User story
As an investor, I want a synced earnings + macro calendar with a forward ribbon, a full
month/week overlay, and alerts before events I care about, so that I'm never blindsided by a
print or a rate decision.

## 2. Business value
Calendar is the Market Calendar replacement; it connects the watchlist to upcoming catalysts
and drives the per-symbol countdowns shown everywhere.

## 3. User workflow(s) — Given / When / Then
- **Sync:** Given the worker, When it runs (08:00, 18:00, on open, or "Sync now"), Then it
  version-checks `vigyaanvest.com/publicdata` and only downloads the full calendar if the
  version changed; the cache + "synced" label update.
- **Ribbon:** Given Deck, When the calendar is present, Then the forward ribbon shows the next
  ~12 trading days with macro chips and ★ watchlist-earnings chips, today highlighted.
- **Overlay:** Given the ribbon, When I open the full calendar, Then a Month/Week view shows
  earnings + US/India macro; clicking a watchlist ★ opens that symbol in Deck.
- **Alerts:** Given alerts enabled, When an event is within "days before" at the alert time,
  Then a desktop notification fires once per event.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] Sync is version-gated: unchanged version does not re-download the full payload.
- [ ] A successful sync stores the cache and updates the "synced · <version>" label.
- [ ] "Sync now" forces a sync and reports event count or a clear error.
- [ ] When the feed is unavailable, the UI shows a clear message and does not fabricate events.
- [ ] Forward ribbon shows the next ~12 trading days (weekends skipped), today highlighted.
- [ ] Ribbon chips show US macro, India macro, and ★ watchlist earnings.
- [ ] Calendar overlay Month view renders the current month grid (Mon-start) with events.
- [ ] Calendar overlay Week view renders the current week's macros + BMO/AMC earnings.
- [ ] Clicking a watchlist ★ in the overlay opens that symbol in Deck.
- [ ] Each watchlist symbol's next earnings drives its Deck/rail/Grid countdown (`Nd`/`today`).
- [ ] Earnings alert fires once per event, honoring "days before" and "alert time".
- [ ] Macro alert fires for enabled regions/categories, once per event.
- [ ] A fired alert is de-duplicated (not repeated on subsequent checks).
- [ ] **Edge case:** feed 404/empty → no events, clear message, no crash, no stale data shown.
- [ ] **Edge case:** version present but payload version mismatch → treated as unavailable.
- [ ] **Edge case:** month grid correct across month boundaries / leap years.
- [ ] **Edge case:** timezone — alert time is interpreted in the user's local time.
- [ ] **Security:** event titles/tickers are HTML-escaped before injection into ribbon/overlay/tape.
- [ ] **Security:** only `vigyaanvest.com/publicdata` is fetched for the calendar (no arbitrary URL).
- [ ] **Security:** notifications contain no user PII.

## 5. Edge cases
Feed down/empty; version mismatch; month/leap boundaries; DST/timezone; many events on one
day; symbol with multiple future earnings rows.

## 6. Security cases
XSS via event titles; fixed-origin fetch only; JSON shape validation before use; notification
content has no PII; alarm storms (1-min check stays cheap).

## 7. Dependencies
Story 01 (shell), Story 08 (alert settings).

## 8. Notes / technical
`src/background/calendar-sync.js` (`syncCalendar`, `reconcileAlerts`); `data.js`
`buildCalendar`; alarms `vvw-sync-am/pm`, `vvw-alerts`; cache `vvw-calendar`;
`vvw-fired-alerts`.
