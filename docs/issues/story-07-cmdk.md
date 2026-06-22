**Epic:** #1

## 1. User story
As an investor, I want a ⌘K palette to jump to any watchlist symbol or add a new ticker, so
that navigation and watchlist-building are instant and keyboard-driven.

## 2. Business value
⌘K is the speed layer — fast symbol switching and frictionless add — that makes the workspace
feel like a pro terminal.

## 3. User workflow(s) — Given / When / Then
- **Open:** Given the workspace, When I press ⌘K / Ctrl-K (or click the search affordance),
  Then the palette opens focused on the input.
- **Filter & jump:** Given the palette, When I type, Then it filters watchlist symbols by
  ticker/company; Enter (or click) opens the highlighted one in Deck.
- **Add:** Given I type a ticker not on the watchlist, When I choose "Add", Then it's added
  (market parsed from `.NS`/`.BO`/`:NSE`/`:BSE`, default US), persisted, and opened in Deck
  with a live fetch.
- **Keyboard:** Given results, When I press ↑/↓, Then the highlight moves; Esc closes.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] ⌘K / Ctrl-K toggles the palette; clicking the header search opens it.
- [ ] The input is auto-focused on open.
- [ ] Typing filters watchlist rows by ticker and company name.
- [ ] A typed ticker not on the watchlist shows an "Add <TICKER>" row.
- [ ] ↑/↓ move the active row; Enter opens it; Esc closes the palette.
- [ ] Choosing "Add" adds the symbol, persists `vvw-watchlist`, and opens it in Deck.
- [ ] `TCS.NS` / `RELIANCE.BO` / `INFY:NSE` parse to the correct market; bare ticker → US.
- [ ] Adding a symbol triggers a live quote fetch (skeleton → data).
- [ ] **Edge case:** adding an already-present symbol just focuses it (no duplicate).
- [ ] **Edge case:** empty/whitespace/invalid input adds nothing.
- [ ] **Edge case:** lowercase / surrounding spaces are normalized.
- [ ] **Security:** ticker input is sanitized to `[A-Z0-9.:]` before use in storage or request URLs.
- [ ] **Security:** symbol/company text rendered in the palette is HTML-escaped (no XSS).

## 5. Edge cases
Duplicate add; empty/invalid input; case/whitespace; market-suffix variants; very long input;
no matches.

## 6. Security cases
Ticker sanitization (injection into URL/storage); XSS via rendered company names in results.

## 7. Dependencies
Story 01 (shell), Story 02 (fetch on add).

## 8. Notes / technical
`workspace.js` ⌘K section (`openK`/`renderK`/`chooseItem`); `data.js` `addSymbol`.
