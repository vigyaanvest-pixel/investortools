**Epic:** #1

## 1. User story
As an investor, I want one Settings surface for appearance, the tape, calendar/alerts, and
research — plus export/import — so that I can tune the workspace and back up my data.

## 2. Business value
Settings consolidates options that lived in three extensions; export/import gives users
portability and trust (their data is theirs, local).

## 3. User workflow(s) — Given / When / Then
- **Change a setting:** Given Settings, When I change any control, Then it persists to
  `chrome.storage` and takes effect (e.g. theme, density, default view, tape voice/rate/
  volume/sources, alert days-before/time, macro toggles, research TradingView embed).
- **Sync now:** Given Data & sync, When I click "Sync now", Then the calendar syncs and the
  status line reports the result.
- **Export:** Given Data & sync, When I click "Export backup", Then a JSON of watchlist +
  edits + settings downloads.
- **Import:** Given a backup file, When I import (merge), Then new symbols/edits/settings are
  merged and the workspace reloads with them.

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] Every Settings control persists across reload.
- [ ] Theme / default view / density pickers reflect and update the current state.
- [ ] Tape settings (voice, rate, volume, top-N, smart wording, per-source toggles) persist and affect The Tape.
- [ ] Calendar settings (alert days-before, alert time, US/India macro toggles, market toggles) persist and affect alerts.
- [ ] Research settings (TradingView embed, page extraction) persist and affect Deck/Dock.
- [ ] "Sync now" runs a forced sync and shows version + event count, or a clear error.
- [ ] "Export backup" downloads a JSON containing watchlist, edits, and settings.
- [ ] "Import (merge)" adds new symbols/edits, merges settings, and reloads.
- [ ] Voice dropdown is populated from the browser's available voices.
- [ ] **Edge case:** importing an invalid/corrupt JSON shows "Import failed — invalid file." and changes nothing.
- [ ] **Edge case:** import does not delete existing symbols (merge semantics).
- [ ] **Edge case:** rate/volume range outputs display correctly (e.g. "1.1×", "80%").
- [ ] **Security:** imported JSON is validated/whitelisted to known keys before write (no arbitrary storage keys).
- [ ] **Security:** imported string fields are treated as untrusted on later render (escaped).
- [ ] **Security:** export contains only local app data — no tokens, no PII, nothing fetched from elsewhere.

## 5. Edge cases
Corrupt import; merge vs existing data; out-of-range values; no voices available; export with
empty watchlist.

## 6. Security cases
Import key whitelisting (no storage pollution); untrusted imported strings on render; export
contains no secrets; file handling stays client-side.

## 7. Dependencies
Story 01 (shell); affects Stories 02/04/05/06.

## 8. Notes / technical
`workspace.js` Settings section (`saveSettings`/`loadSettingsControls`, export/import,
`syncNow`); keys under `vvw-settings`; worker `SYNC_CALENDAR`/`GET_VOICES`.
