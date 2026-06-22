/* Live market data — Yahoo Finance (quote + chart), Finviz (US), Screener.in (India).
   Runs in the background service worker (host_permissions defeat CORS).
   Ported from investor-overlay's metrics/{yahoo,finviz,screener}.ts and reshaped
   to the workspace symbol record consumed by data.js / workspace.js. */

import {
  yahooSymbolForMarket,
  currencyForMarket,
  currencySign,
  sourceLabel,
} from "../shared/symbols.js";
import { fmtMarketCap, countdownLabel } from "../shared/format.js";

const YAHOO_HOSTS = [
  "https://query2.finance.yahoo.com",
  "https://query1.finance.yahoo.com",
];

/* ---------- tiny parse helpers ---------- */
function pickRaw(obj, key) {
  const f = obj && obj[key];
  return f && typeof f.raw === "number" ? f.raw : null;
}
function pickFmt(obj, key) {
  const f = obj && obj[key];
  return f && f.fmt != null ? f.fmt : null;
}
function fmtVol(raw) {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (raw >= 1e9) return `${(raw / 1e9).toFixed(1)}B`;
  if (raw >= 1e6) return `${Math.round(raw / 1e6)}M`;
  if (raw >= 1e3) return `${Math.round(raw / 1e3)}K`;
  return String(raw);
}
function decodeHtml(t) {
  return t.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}
function escapeRe(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------- Yahoo: chart (series + 1d fallback) ---------- */
async function fetchYahooChart(symbol, market) {
  const ySym = yahooSymbolForMarket(symbol, market);
  const path = `/v8/finance/chart/${encodeURIComponent(ySym)}?range=3mo&interval=1d`;
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const json = await res.json();
      const r = json && json.chart && json.chart.result && json.chart.result[0];
      if (!r) continue;
      const meta = r.meta || {};
      const closesRaw = (r.indicators && r.indicators.quote && r.indicators.quote[0] && r.indicators.quote[0].close) || [];
      // downsample the daily closes to ~24 points for a clean sparkline
      const closes = closesRaw.filter((v) => typeof v === "number" && Number.isFinite(v));
      let series = closes;
      if (closes.length > 24) {
        const step = closes.length / 24;
        series = [];
        for (let i = 0; i < 24; i++) series.push(closes[Math.floor(i * step)]);
        series.push(closes[closes.length - 1]);
      }
      return {
        companyName: meta.longName || meta.shortName || null,
        currency: meta.currency || null,
        regularMarketPrice: typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null,
        previousClose: typeof meta.chartPreviousClose === "number" ? meta.chartPreviousClose : null,
        low52: typeof meta.fiftyTwoWeekLow === "number" ? meta.fiftyTwoWeekLow : null,
        high52: typeof meta.fiftyTwoWeekHigh === "number" ? meta.fiftyTwoWeekHigh : null,
        series: series.length >= 2 ? series.map((v) => Math.round(v * 100) / 100) : null,
      };
    } catch {
      /* try next host */
    }
  }
  return null;
}

/* ---------- Yahoo: quoteSummary (fundamentals + earnings) ---------- */
async function fetchYahooSummary(symbol, market) {
  const ySym = yahooSymbolForMarket(symbol, market);
  const modules = "price,summaryDetail,financialData,defaultKeyStatistics,calendarEvents";
  const path = `/v10/finance/quoteSummary/${encodeURIComponent(ySym)}?modules=${modules}&formatted=true`;
  for (const host of YAHOO_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const json = await res.json();
      const r = json && json.quoteSummary && json.quoteSummary.result && json.quoteSummary.result[0];
      if (r) return r;
    } catch {
      /* try next host */
    }
  }
  return null;
}

/* ---------- Finviz (US) ---------- */
function snapshotValue(html, label) {
  const re = new RegExp(
    `<div class="snapshot-td-label">${escapeRe(label)}<\\/div><\\/td><td[\\s\\S]*?<div class="snapshot-td-content"><b>([\\s\\S]*?)<\\/b>`,
    "i"
  );
  const m = html.match(re);
  if (!m) return null;
  const cleaned = decodeHtml(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  return cleaned && cleaned !== "-" ? cleaned : null;
}
async function fetchFinviz(symbol) {
  const norm = symbol.toUpperCase().replace(/[^A-Z0-9.-]/g, "");
  if (!norm) return null;
  try {
    const res = await fetch(`https://finviz.com/quote.ashx?t=${encodeURIComponent(norm)}&p=d`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return {
      marketCap: snapshotValue(html, "Market Cap"),
      pe: snapshotValue(html, "P/E"),
      fwdpe: snapshotValue(html, "Forward P/E"),
      roe: snapshotValue(html, "ROE"),
      de: snapshotValue(html, "Debt/Eq"),
      avgvol: snapshotValue(html, "Avg Volume"),
      earnings: snapshotValue(html, "Earnings"),
    };
  } catch {
    return null;
  }
}

/* ---------- Screener.in (India) ---------- */
function topRatioValue(html, keyword) {
  const start = html.indexOf('id="top-ratios"');
  if (start === -1) return null;
  const end = html.indexOf("</ul>", start);
  const section = end !== -1 ? html.slice(start, end) : html;
  const items = section.split(/<li[\s>]/i);
  for (const item of items) {
    if (!item.toLowerCase().includes(keyword.toLowerCase())) continue;
    const m = item.match(/class="number"[^>]*>([\s\S]*?)<\/span>/);
    if (m) return m[1].replace(/<[^>]+>/g, "").trim() || null;
  }
  return null;
}
async function fetchScreener(symbol) {
  const base = symbol.toUpperCase().replace(/\.(NS|BO)$/, "");
  try {
    const res = await fetch(`https://www.screener.in/company/${encodeURIComponent(base)}/`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return {
      roce: topRatioValue(html, "ROCE"),
      roe: topRatioValue(html, "ROE"),
      marketCap: topRatioValue(html, "Market Cap"),
      pe: topRatioValue(html, "Stock P/E") || topRatioValue(html, "P/E"),
    };
  } catch {
    return null;
  }
}

/* ---------- earnings shaping ---------- */
function shapeEarnings(summary) {
  const cal = summary && summary.calendarEvents && summary.calendarEvents.earnings;
  const dateField = cal && cal.earningsDate && cal.earningsDate[0];
  const epoch = dateField && typeof dateField.raw === "number" ? dateField.raw * 1000 : null;
  const epsEst = pickFmt(cal && cal.earningsAverage ? cal : null, "earningsAverage");
  if (!epoch) {
    return { earn: "—", next: "No earnings date yet", cd: "—", soon: false, earnIso: null, epsEst };
  }
  const d = new Date(epoch);
  const mon = d.toLocaleString("en-US", { month: "short" });
  const earn = `${mon} ${d.getDate()}`;
  const cd = countdownLabel(d.toISOString());
  const days = Math.round((epoch - Date.now()) / 86400000);
  return {
    earn,
    next: "Earnings",
    cd,
    soon: days >= 0 && days <= 7,
    earnIso: d.toISOString().slice(0, 10),
    epsEst,
  };
}

/* ---------- public: fetch + merge into a workspace symbol patch ---------- */
export async function fetchQuote(symbol, market) {
  const sign = currencySign(market);
  const [summary, chart, vendor] = await Promise.all([
    fetchYahooSummary(symbol, market),
    fetchYahooChart(symbol, market),
    market === "US" ? fetchFinviz(symbol) : fetchScreener(symbol),
  ]);

  const price = summary ? summary.price : null;
  const detail = summary ? summary.summaryDetail : null;
  const fin = summary ? summary.financialData : null;

  // price + change (summary preferred, chart fallback)
  let priceRaw = pickRaw(price, "regularMarketPrice");
  let prevClose = pickRaw(price, "regularMarketPreviousClose");
  if (priceRaw == null && chart) priceRaw = chart.regularMarketPrice;
  if (prevClose == null && chart) prevClose = chart.previousClose;
  const changeRaw = pickRaw(price, "regularMarketChange");
  let chgPct = pickRaw(price, "regularMarketChangePercent");
  if (chgPct == null && priceRaw != null && prevClose) chgPct = ((priceRaw - prevClose) / prevClose) * 100;
  const up = chgPct == null ? true : chgPct >= 0;

  const lastStr = priceRaw != null ? `${sign}${priceRaw.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—";
  const chgStr = chgPct != null ? `${chgPct >= 0 ? "+" : ""}${chgPct.toFixed(2)}%` : "—";
  let chgAbs = "—";
  if (changeRaw != null) chgAbs = `${changeRaw >= 0 ? "+" : "−"}${Math.abs(changeRaw).toFixed(2)}`;
  else if (priceRaw != null && prevClose != null) chgAbs = `${priceRaw - prevClose >= 0 ? "+" : "−"}${Math.abs(priceRaw - prevClose).toFixed(2)}`;

  // 52-week range
  const low52 = pickRaw(detail, "fiftyTwoWeekLow") ?? (chart ? chart.low52 : null);
  const high52 = pickRaw(detail, "fiftyTwoWeekHigh") ?? (chart ? chart.high52 : null);
  const range =
    low52 != null && high52 != null
      ? `${Math.round(low52).toLocaleString("en-US")}–${Math.round(high52).toLocaleString("en-US")}`
      : "—";

  // fundamentals (Yahoo preferred; vendor fills gaps)
  const mktcap = fmtMarketCap(pickRaw(price, "marketCap"), sign) || (vendor && vendor.marketCap) || "—";
  const pe = pickFmt(detail, "trailingPE") || (vendor && vendor.pe) || "—";
  const fwdpe = pickFmt(detail, "forwardPE") || (vendor && vendor.fwdpe) || "—";
  const roeRaw = pickRaw(fin, "returnOnEquity");
  const roe = roeRaw != null ? `${(roeRaw * 100).toFixed(1)}%` : (vendor && vendor.roe) || "—";
  const roce = (vendor && vendor.roce) || "—";
  const deRaw = pickRaw(fin, "debtToEquity");
  const de = deRaw != null ? (deRaw > 5 ? (deRaw / 100).toFixed(2) : deRaw.toFixed(2)) : (vendor && vendor.de) || "—";
  const divRaw = pickRaw(detail, "dividendYield");
  const div = divRaw != null ? `${(divRaw <= 1 ? divRaw * 100 : divRaw).toFixed(2)}%` : "—";
  const avgvol = fmtVol(pickRaw(detail, "averageVolume")) || (vendor && vendor.avgvol) || "—";

  const earnings = shapeEarnings(summary);

  const companyName = (price && (price.longName || price.shortName)) || (chart && chart.companyName) || null;

  const source = summary ? sourceLabel(market) : chart ? "Yahoo Finance" : vendor ? (market === "US" ? "Finviz" : "Screener.in") : "unavailable";

  return {
    co: companyName || undefined,
    mkt: market,
    cur: currencyForMarket(market),
    last: lastStr,
    chg: chgStr,
    chgAbs,
    up,
    price: lastStr,
    today: chgStr,
    mktcap,
    range,
    avgvol,
    pe,
    fwdpe,
    roe,
    roce,
    de,
    div,
    series: chart && chart.series ? chart.series : null,
    earn: earnings.earn,
    next: earnings.next,
    cd: earnings.cd,
    soon: earnings.soon,
    earnIso: earnings.earnIso,
    epsEst: earnings.epsEst || null,
    source,
    fetchedAt: Date.now(),
  };
}
