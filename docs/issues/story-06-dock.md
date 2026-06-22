**Epic:** #1

## 1. User story
As an investor browsing a stock page, I want a side panel that reads that page's metrics, so
that I get Symbol 360 context without leaving the page I'm on.

## 2. Business value
The Dock preserves Symbol 360's original "read the open page" mechanic and is the bridge from
casual browsing into the full workspace.

## 3. User workflow(s) — Given / When / Then
- **Read page:** Given I'm on a supported stock page (Yahoo Finance, Screener.in, NSE, SEC),
  When the side panel is open, Then it shows the symbol + metrics extracted from that page,
  labelled "live page".
- **Missing fields:** Given a field the page doesn't expose, When the panel renders, Then it
  shows `—` and a note that other sources have the rest.
- **Expand:** Given the panel, When I click "Open in full terminal", Then the workspace opens
  focused on that symbol.
- **Empty:** Given a non-stock page, When the panel is open, Then it shows a clear "no stock
  page detected" state with a button to open the workspace.
- **In-app dock:** Given the workspace dock button, When the side panel can't open, Then the
  in-app dock preview overlay shows the focused symbol.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] On a Yahoo Finance quote page, the panel shows the symbol + price/metrics from the page.
- [ ] On Screener.in, it shows the company's metrics (incl. ROCE where present).
- [ ] On NSE / SEC pages, it shows what those pages expose (symbol + available fields).
- [ ] Fields not present on the page render `—`, with a "live page" provenance label.
- [ ] The panel refreshes when the active tab changes or its content updates.
- [ ] "Open in full terminal" opens/focuses the workspace on that symbol.
- [ ] A non-stock page shows the empty state with an "open workspace" button.
- [ ] The workspace dock button opens the side panel when available, else the overlay preview.
- [ ] **Edge case:** SPA navigation within Yahoo updates the detected symbol.
- [ ] **Edge case:** restricted pages (chrome://, extension pages) show the empty state, no error.
- [ ] **Edge case:** older Edge without `sidePanel` → dock button falls back to the overlay (no crash).
- [ ] **Security:** the content script reads only the declared stock-site match patterns.
- [ ] **Security:** extracted page values are HTML-escaped before injection into the panel (no XSS).
- [ ] **Security:** page context is keyed per tab in `chrome.storage.session` and not exposed cross-tab.
- [ ] **Security:** the panel performs no cross-origin fetch of its own (display of page-read data only).

## 5. Edge cases
SPA navigation; restricted/system pages; site markup changes; Edge without sidePanel; tab
switch race; page with partial data.

## 6. Security cases
Match-pattern scoping; XSS via page-extracted strings; per-tab session isolation; no
cross-origin fetch from the panel; no leaking one tab's data to another.

## 7. Dependencies
Story 01 (shell), Story 02 (symbol focus on expand).

## 8. Notes / technical
`src/content/page-extract.js`; worker `PAGE_CONTEXT`/`GET_PAGE_CONTEXT`/`OPEN_WORKSPACE`;
`sidepanel/{index.html,sidepanel.js}`; session key `vvw-pagectx:<tabId>`.
