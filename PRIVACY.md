# Privacy Policy — VigyaanVest Trader Workspace

_Last updated: 2026-06-20_

VigyaanVest Trader Workspace ("the extension") is a **local-first** research and workflow
tool. It does **not** have a backend of its own, does **not** require an account, and does
**not** collect, transmit, sell, or share your personal information. There is **no
analytics, no tracking, and no advertising**.

## What is stored, and where

All of your data is stored **locally in your browser** via `chrome.storage` and never sent
to VigyaanVest:

- Your **watchlist** (ticker symbols + market).
- Your **notes** — status, setup, tags, thesis (bull/bear/trigger/stop), review notes.
- Your **settings**, theme, default view, and density.
- **Cached** quotes, the public calendar, and the recent headline ("Tape") buffer.

You can export this data to a JSON file or import it from one, entirely on your device.
Uninstalling the extension removes this local data.

## Network requests the extension makes

The extension calls the following **third-party public endpoints**. The only information
sent is what's necessary for the request itself (typically a ticker symbol, or a plain GET
for shared public data). No personal data, identifiers, or browsing history is transmitted.

| Endpoint | Why | What is sent |
| --- | --- | --- |
| `query1/query2.finance.yahoo.com`, `finance.yahoo.com` | Quotes, charts, fundamentals, earnings dates | The ticker symbol you focus |
| `finviz.com` | US fundamentals (fallback) | The ticker symbol |
| `www.screener.in` | India fundamentals | The ticker symbol |
| `vigyaanvest.com/publicdata` | Shared public earnings/macro calendar | Nothing (a public GET) |
| `www.tradingview.com` | Optional in-panel chart embed | The ticker symbol (in the embed URL) |

These services have their own privacy policies; requests to them are subject to those.

## Reading the page you're viewing

- **The Tape (headlines):** on supported news sites (TradingView News Flow, Finviz,
  MarketWatch, Zerodha Pulse) the extension reads **visible headlines** from the page you
  are already viewing and keeps them in a **local** buffer for the Tape. Headlines are not
  sent anywhere.
- **The Dock (page metrics):** on a stock page (Yahoo Finance, Screener.in, NSE, SEC) the
  extension reads visible metrics from the page you are viewing to show them in the side
  panel. This stays **local** to your browser.

The extension does not read pages other than these, and does not run on arbitrary websites.

## Read-aloud (text-to-speech)

The "read aloud" feature uses your **browser's built-in speech voices** (`chrome.tts`).
Headline text is spoken locally; nothing is uploaded for synthesis.

## Permissions

See [PERMISSIONS.md](PERMISSIONS.md) for a per-permission justification.

## Children

The extension is a general financial-research tool and is not directed at children.

## Changes

We may update this policy; material changes will be reflected here with a new date.

## Disclaimer

This is a research and workflow tool only and does **not** constitute investment advice,
recommendations, or portfolio management. Market data is sourced from third-party public
endpoints and may be delayed, incomplete, or inaccurate.

## Contact

Questions about privacy: **support@vigyaanvest.com** · https://vigyaanvest.com
_(Confirm/replace this address before publishing.)_
