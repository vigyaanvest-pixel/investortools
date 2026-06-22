/* Symbol + market helpers (shared by the background worker).
   Markets in this workspace: "US" | "NSE" | "BSE".
   Ported/condensed from investor-overlay symbol-resolver.ts. */

/** Normalise a free-typed ticker into { symbol, market }. Honours .NS/.BO and :NSE/:BSE suffixes. */
export function parseTicker(raw, fallbackMarket) {
  let t = String(raw || "").toUpperCase().replace(/[^A-Z0-9.:]/g, "");
  let market = fallbackMarket || "US";
  if (/\.NS$|:NSE$/.test(t)) {
    market = "NSE";
    t = t.replace(/\.NS$|:NSE$/, "");
  } else if (/\.BO$|:BSE$/.test(t)) {
    market = "BSE";
    t = t.replace(/\.BO$|:BSE$/, "");
  }
  return { symbol: t, market };
}

/** Yahoo Finance symbol for a market (AAPL, TCS.NS, RELIANCE.BO). */
export function yahooSymbolForMarket(symbol, market) {
  const base = String(symbol || "").toUpperCase().replace(/\.(NS|BO)$/, "");
  if (market === "NSE") return `${base}.NS`;
  if (market === "BSE") return `${base}.BO`;
  return base;
}

/** TradingView symbol for a market (NASDAQ:AAPL, NSE:TCS, BSE:RELIANCE). */
export function tradingViewSymbol(symbol, market) {
  const base = String(symbol || "").toUpperCase().replace(/\.(NS|BO)$/, "");
  if (market === "NSE") return `NSE:${base}`;
  if (market === "BSE") return `BSE:${base}`;
  return `NASDAQ:${base}`;
}

/** Currency + symbol for a market. */
export function currencyForMarket(market) {
  return market === "US" ? "USD" : "INR";
}
export function currencySign(market) {
  return market === "US" ? "$" : "₹";
}

/** Human label of where a quote/fundamentals come from. */
export function sourceLabel(market) {
  return market === "US" ? "Yahoo Finance" : market === "NSE" ? "NSE India" : "BSE India";
}
