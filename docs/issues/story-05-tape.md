**Epic:** #1

## 1. User story
As an investor, I want a live news tape that streams headlines from the sites I have open and
can read the top ones aloud, so that I keep a pulse on the market while I work.

## 2. Business value
The Tape is the Market Squawk replacement; live headlines + read-aloud is a sticky,
differentiated feature and feeds the Grid's "in the news" signal.

## 3. User workflow(s) — Given / When / Then
- **Stream:** Given a supported news site is open (TradingView News Flow, Finviz,
  MarketWatch, Zerodha Pulse), When its content script scrapes headlines, Then they appear in
  the Deck right-rail tape (newest first, de-duplicated).
- **Macro/earnings highlights:** Given a synced calendar, When the tape builds, Then today's
  macro and near-term watchlist earnings show as tagged tape items.
- **Read aloud:** Given the Squawk ▶ control, When I turn it on, Then the top N headlines are
  spoken via the browser's voices using my voice/rate/volume/smart-wording settings; ▶ again
  stops.
- **Cross-reference:** Given a headline mentioning a watchlist ticker, When it streams, Then
  that symbol's tape count increments (visible in Grid/Deck).

## 4. Acceptance criteria (micro, tick-off-able)
- [ ] On a supported news site, headlines stream into the Deck tape within a few seconds.
- [ ] Headlines are de-duplicated and capped (no unbounded growth).
- [ ] Provider boilerplate/noise/timestamps are stripped from headline text.
- [ ] The tape updates live as new headlines appear (no manual refresh).
- [ ] Today's macro events and near-term watchlist earnings appear as tagged tape items.
- [ ] ▶ on reads the top N (Settings) headlines aloud; the bar shows "Squawk on".
- [ ] ▶ off stops speech immediately and shows "Squawk off".
- [ ] Voice / rate / volume / smart-wording settings affect playback.
- [ ] Disabling a source (Settings) stops it contributing (no headlines from it).
- [ ] A headline mentioning a watchlist ticker increments that symbol's tape count.
- [ ] **Edge case:** no news site open → tape shows a clear empty-state prompt, ▶ says "no headlines yet".
- [ ] **Edge case:** a site's markup changes / yields nothing → no crash, no garbage headlines.
- [ ] **Edge case:** very long headline is truncated/handled without breaking layout.
- [ ] **Security:** scraped headlines are HTML-escaped before injection into the tape/ticker/drawer (no XSS).
- [ ] **Security:** headline text is sanitized before being passed to `chrome.tts` (no control-string abuse).
- [ ] **Security:** the tape buffer stays local; headlines are never transmitted anywhere.
- [ ] **Security:** content scripts run only on the declared news-site match patterns.

## 5. Edge cases
No source open; empty/changed markup; duplicate headlines across sources; extremely long
headlines; rapid DOM mutation (observer throttling); source toggled off mid-session.

## 6. Security cases
**XSS via headline rendering (primary risk)**; TTS input sanitization; local-only buffer
(no exfiltration); match-pattern scoping; no reading of non-news pages.

## 7. Dependencies
Story 01 (shell), Story 08 (tape settings). Feeds Story 03 (tape counts).

## 8. Notes / technical
`src/content/{sources.js,squawk.js}`; worker `TAPE_PUSH`/`SPEAK`/`STOP_SPEAK`/`GET_VOICES`;
`src/background/tts.js`; `data.js` `buildTape`/`topHeadlines`; buffer `vvw-tape`.
