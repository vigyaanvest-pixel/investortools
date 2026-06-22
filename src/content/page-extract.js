/* Page extraction — reads metrics off the open Yahoo / Screener / NSE / SEC page and
   reports them to the worker so the Dock side panel can show "live page" data.
   Ported from investor-overlay's detectors + extractors (vanilla, no build step). */
(function () {
  "use strict";

  function textOf(el) {
    if (!el) return null;
    const t = (el.innerText || el.textContent || "").trim();
    return t || null;
  }
  function safe(fn) {
    try { return fn(); } catch { return null; }
  }
  function findTableValue(re) {
    const cells = document.querySelectorAll("td");
    for (const cell of cells) {
      const label = (cell.innerText || cell.textContent || "").trim();
      if (re.test(label)) {
        const next = cell.nextElementSibling;
        if (next) return (next.innerText || next.textContent || "").trim() || null;
      }
    }
    return null;
  }

  /* ---------- detect ---------- */
  function detect(url) {
    if (/finance\.yahoo\.com/.test(url)) {
      const m = url.match(/\/quote\/([^/?#]+)/i);
      let sym = m && m[1] ? m[1].toUpperCase() : null;
      let market = "US";
      if (sym && sym.endsWith(".NS")) { market = "NSE"; sym = sym.replace(/\.NS$/, ""); }
      else if (sym && sym.endsWith(".BO")) { market = "BSE"; sym = sym.replace(/\.BO$/, ""); }
      return { site: "yahoo", symbol: sym, market };
    }
    if (/screener\.in/.test(url)) {
      const m = url.match(/\/company\/([^/?#]+)/i);
      return { site: "screener", symbol: m && m[1] ? m[1].toUpperCase() : null, market: "NSE" };
    }
    if (/nseindia\.com/.test(url)) {
      let sym = null;
      try { sym = new URL(url).searchParams.get("symbol"); } catch { /* ignore */ }
      return { site: "nse", symbol: sym ? sym.toUpperCase() : null, market: "NSE" };
    }
    if (/sec\.gov/.test(url)) {
      let sym = null;
      try { const u = new URL(url); sym = u.searchParams.get("ticker") || u.searchParams.get("CIK"); } catch { /* ignore */ }
      return { site: "sec", symbol: sym ? sym.toUpperCase() : null, market: "US" };
    }
    return { site: "none", symbol: null, market: null };
  }

  /* ---------- extract ---------- */
  function extractYahoo(ctx) {
    if (!ctx.companyName) {
      const h1 = document.querySelector("h1");
      if (h1 && h1.textContent) ctx.companyName = h1.textContent.trim().replace(/\s*\([^)]+\)\s*$/, "").trim() || null;
    }
    const low = safe(() => textOf(document.querySelector('fin-streamer[data-field="fiftyTwoWeekLow"]')));
    const high = safe(() => textOf(document.querySelector('fin-streamer[data-field="fiftyTwoWeekHigh"]')));
    return {
      price: safe(() => textOf(document.querySelector('fin-streamer[data-field="regularMarketPrice"]') || document.querySelector('[data-testid="qsp-price"]'))),
      changePercent: safe(() => textOf(document.querySelector('fin-streamer[data-field="regularMarketChangePercent"]') || document.querySelector('[data-testid="qsp-price-change-percent"]'))),
      marketCap: safe(() => textOf(document.querySelector('fin-streamer[data-field="marketCap"]')) || findTableValue(/^Market Cap/i)),
      pe: safe(() => textOf(document.querySelector('fin-streamer[data-field="trailingPE"]')) || findTableValue(/^PE Ratio|^P\/E Ratio/i)),
      week52Range: (low && high) ? `${low} – ${high}` : safe(() => findTableValue(/52.?[Ww]eek.?[Rr]ange/)),
      roe: safe(() => findTableValue(/Return on Equity/i) || findTableValue(/^ROE$/i)),
      debtEquity: safe(() => findTableValue(/Total Debt\/Equity/i) || findTableValue(/^Debt\/Equity/i)),
      earningsDate: safe(() => textOf(document.querySelector('[data-testid="EARNINGS_DATE-value"]')) || findTableValue(/^Earnings Date/i)),
      source: "Yahoo Finance",
    };
  }
  function extractScreener(ctx) {
    ctx.companyName = safe(() => textOf(document.querySelector("h1")));
    function topRatio(keyword) {
      const items = document.querySelectorAll("#top-ratios li");
      for (const li of items) if (li.textContent && li.textContent.includes(keyword)) return textOf(li.querySelector(".number"));
      return null;
    }
    return {
      price: safe(() => topRatio("Current Price")),
      marketCap: safe(() => topRatio("Market Cap")),
      pe: safe(() => topRatio("Stock P/E") || topRatio("P/E")),
      roce: safe(() => topRatio("ROCE")),
      roe: safe(() => topRatio("ROE")),
      debtEquity: safe(() => findTableValue(/^Debt to equity$|^D\/E$/i) || findTableValue(/Debt to equity/i)),
      source: "Screener.in",
    };
  }
  function extractNse(ctx) {
    if (!ctx.companyName) { const h1 = document.querySelector("h1"); if (h1) ctx.companyName = (h1.textContent || "").trim() || null; }
    return {
      price: safe(() => textOf(document.querySelector("#lastPrice") || document.querySelector('[class*="lastPrice"]'))),
      source: "NSE India",
    };
  }

  function extract(ctx) {
    if (ctx.site === "none" || !ctx.symbol) return null;
    let partial = {};
    if (ctx.site === "yahoo") partial = extractYahoo(ctx);
    else if (ctx.site === "screener") partial = extractScreener(ctx);
    else if (ctx.site === "nse") partial = extractNse(ctx);
    else if (ctx.site === "sec") partial = { source: "SEC EDGAR" };
    return {
      price: partial.price || null,
      changePercent: partial.changePercent || null,
      marketCap: partial.marketCap || null,
      pe: partial.pe || null,
      week52Range: partial.week52Range || null,
      roe: partial.roe || null,
      roce: partial.roce || null,
      debtEquity: partial.debtEquity || null,
      earningsDate: partial.earningsDate || null,
      source: partial.source || ctx.site,
    };
  }

  function report() {
    const ctx = detect(window.location.href);
    ctx.companyName = ctx.companyName || null;
    const metrics = extract(ctx);
    try {
      chrome.runtime.sendMessage({
        type: "PAGE_CONTEXT",
        payload: { ctx, metrics, companyName: ctx.companyName, url: window.location.href },
      });
    } catch { /* worker may be asleep */ }
  }

  // initial + on SPA navigation + when DOM settles
  report();
  let last = window.location.href;
  setInterval(() => {
    if (window.location.href !== last) { last = window.location.href; report(); }
  }, 1500);
  const obs = new MutationObserver(() => {
    clearTimeout(obs._t);
    obs._t = setTimeout(report, 1200);
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
})();
