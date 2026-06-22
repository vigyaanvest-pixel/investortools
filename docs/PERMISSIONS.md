# Permission Justifications — VigyaanVest Trader Workspace

For the Chrome Web Store / Edge Add-ons "permission justification" fields. Copy each
justification into the matching field at submission.

## Single purpose

> A single connected trader research workspace: it shows quotes, fundamentals, an earnings
> & macro calendar, and a live news headline stream ("The Tape") for the stocks on the
> user's watchlist, plus a side panel that reads metrics from the stock page the user is
> viewing. All data is local-first; there is no account and no backend.

## API permissions

| Permission | Justification |
| --- | --- |
| `storage` | Save the user's watchlist, notes, settings, theme, and cached quotes/calendar/tape locally on the device. |
| `alarms` | Run the twice-daily calendar sync and a periodic check that fires the user's earnings/macro alerts. |
| `notifications` | Show desktop reminders for upcoming watchlist earnings and macro events the user opted into. |
| `tabs` | Open/focus the single Workspace tab, and detect which supported site the active tab is on (to power The Tape and the Dock). No browsing history is collected. |
| `tts` | Read the top headlines aloud using the browser's built-in speech voices ("Squawk"). |
| `sidePanel` | Provide the "Dock" — a side panel that shows research for the stock page the user is viewing. |

## Host permissions

| Host | Justification |
| --- | --- |
| `query1/query2.finance.yahoo.com`, `finance.yahoo.com` | Fetch quotes, charts, fundamentals, and earnings dates for the user's symbols (from the background worker, to avoid CORS). |
| `finviz.com` | Fetch US fundamentals as a fallback/supplement to Yahoo. |
| `www.screener.in` | Fetch India (NSE/BSE) fundamentals. |
| `www.nseindia.com` | Read metrics from an NSE quote page the user is viewing (Dock). |
| `www.sec.gov` | Read filing context from a SEC page the user is viewing (Dock). |
| `www.tradingview.com` | Read headlines from TradingView News Flow (Tape) and embed the chart widget. |
| `www.marketwatch.com`, `marketwatch.com` | Read headlines from MarketWatch's latest-news page (Tape). |
| `pulse.zerodha.com` | Read headlines from Zerodha Pulse (Tape, India). |
| `vigyaanvest.com` | Fetch the shared public earnings/macro calendar (`/publicdata`). |

## Remote code

> No remotely-hosted code is used or executed. All scripts are bundled in the package.
> The only external content is the optional TradingView chart, shown in a sandboxed
> `<iframe>` (display only).

## Data handling disclosures (store form)

- Does the extension collect user data? **No** — data is stored locally and is not
  transmitted to the developer.
- Sold to third parties? **No.** Used for advertising/credit/loans? **No.**
- See [PRIVACY.md](PRIVACY.md).
