**Epic:** #1

## 1. User story
As an active investor, I want one workspace with Deck / Grid / Settings views, my theme,
and a watchlist that persists, so that I have a single home that remembers my setup.

## 2. Business value
The shell is the container that makes "3 tools → 1" real; persistence is what makes daily
return-use frictionless.

## 3. User workflow(s) — Given / When / Then
- **Open:** Given the extension is installed, When I click the toolbar icon, Then the Trader
  Workspace opens in a tab (existing tab is focused/reloaded, not duplicated).
- **Switch views:** Given the workspace is open, When I click Deck / Grid / Settings, Then
  the active view shows and the choice is remembered for next open.
- **Theme:** Given any view, When I toggle Light/Midnight, Then the whole UI re-themes and
  the choice persists across the workspace and the side panel.
- **Persistence:** Given I edited my watchlist/notes/settings, When I reopen the workspace,
  Then my data is restored from `chrome.storage`.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] Clicking the toolbar icon opens `workspace/index.html` in a tab.
- [ ] A second click focuses the existing workspace tab instead of opening a duplicate.
- [ ] Deck / Grid / Settings segmented control switches the visible view.
- [ ] The last-used view is restored on reopen.
- [ ] "Default view" (Settings) controls the first view on a fresh open.
- [ ] Light/Midnight toggle re-themes all surfaces; no hard-coded colors remain (tokens only).
- [ ] Theme persists across reload and is shared with the side panel.
- [ ] Density (Comfortable/Compact) applies and persists.
- [ ] NY + IST clocks render and update at least once a minute.
- [ ] Watchlist, per-symbol edits, settings, theme, view, density survive a full reload.
- [ ] First run seeds a default watchlist and writes `vvw-watchlist` to storage.
- [ ] **Edge case:** empty/corrupt stored JSON falls back to defaults without a crash.
- [ ] **Edge case:** opening a second workspace tab manually still resolves to one focused tab.
- [ ] **Security:** only `chrome.storage` keys prefixed `vvw-*` are written; no PII is stored.
- [ ] **Security:** no remotely-hosted code is loaded; all scripts are packaged-local.
- [ ] **Security:** stored values are treated as untrusted on read (no `eval`, no HTML injection of stored strings without escaping).

## 5. Edge cases
Corrupt/empty storage; duplicate workspace tabs; first-run with no stored data; very long
watchlist; storage quota pressure.

## 6. Security cases
Storage namespace isolation; no PII; no remote code; stored-string handling (XSS on render);
theme/value tampering does not break boot.

## 7. Dependencies
None (foundational).

## 8. Notes / technical
`workspace/{index.html,workspace.js,data.js}`, `src/shared/theme.js`, service-worker
`OPEN_WORKSPACE`. Keys: `vvw-watchlist`, `vvw-edits`, `vvw-settings`, `vvw-theme`,
`vvw-view`, `vvw-view-default`, `vvw-density`, `vvw-symbol`.
