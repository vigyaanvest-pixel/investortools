/* Version-gated calendar sync from https://vigyaanvest.com/publicdata/ (no bundled fixtures),
   plus earnings/macro alert reconciliation -> desktop notifications.
   Ported from market-calendar's sync.ts + alerts.ts + timezone.ts. */

import { nowIso } from "../shared/format.js";

const DATA_BASE_URL = "https://vigyaanvest.com/publicdata";
const VERSION_URL = `${DATA_BASE_URL}/calendar-version.json`;
const CALENDAR_URL = `${DATA_BASE_URL}/calendar.json`;

const CACHE_KEY = "vvw-calendar";
const FIRED_KEY = "vvw-fired-alerts";

function isJson(res) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json");
}

async function fetchVersion() {
  try {
    const res = await fetch(VERSION_URL, { cache: "no-store" });
    if (!res.ok || !isJson(res)) return null;
    const data = await res.json();
    return data && typeof data.v === "string" && data.v ? data : null;
  } catch {
    return null;
  }
}

async function fetchCalendar() {
  try {
    const res = await fetch(CALENDAR_URL, { cache: "no-store" });
    if (!res.ok || !isJson(res)) return null;
    const data = await res.json();
    return data && typeof data.v === "string" && Array.isArray(data.events) ? data : null;
  } catch {
    return null;
  }
}

export async function getCalendarCache() {
  const got = await chrome.storage.local.get(CACHE_KEY);
  return got[CACHE_KEY] || null;
}

/** Sync from calendar.json (authoritative), gated on its embedded `v`.
   `calendar-version.json` is an OPTIONAL bandwidth optimization — when it's absent
   (the publicdata host serves an SPA fallback, not JSON) we just fetch calendar.json.
   Returns { changed, cache, error }. */
export async function syncCalendar(force = false) {
  const cached = await getCalendarCache();

  // Optional cheap pre-check: only skip the full fetch if a real version file matches the cache.
  const version = await fetchVersion();
  if (!force && version && cached && cached.version === version.v) {
    return { changed: false, cache: cached };
  }

  // Authoritative source.
  const payload = await fetchCalendar();
  if (!payload) {
    return { changed: false, cache: cached, error: "Calendar data unavailable at vigyaanvest.com/publicdata." };
  }
  if (!force && cached && cached.version === payload.v) {
    return { changed: false, cache: cached };
  }
  const cache = {
    version: payload.v,
    updated: payload.updated,
    events: payload.events,
    fetchedAt: nowIso(),
  };
  await chrome.storage.local.set({ [CACHE_KEY]: cache });
  return { changed: true, cache };
}

/* ---------- alerts ---------- */

/** Local epoch ms for `localTime` (HH:MM) on (dateStr - daysBefore). */
function alertFireAt(dateStr, daysBefore, localTime) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const [hh, mm] = String(localTime || "08:30").split(":").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d - (daysBefore || 0), hh || 0, mm || 0, 0, 0);
  const t = dt.getTime();
  return Number.isFinite(t) ? t : null;
}

function macroEnabled(ev, settings) {
  const f = settings.filters || {};
  if (ev.region === "US" && f.showUsMacro === false) return false;
  if (ev.region === "IN" && f.showInMacro === false) return false;
  if (ev.impact === "high" && f.impactHigh === false) return false;
  if (ev.impact === "med" && f.impactMed === false) return false;
  if (ev.impact === "low" && f.impactLow === false) return false;
  return true;
}

async function notify(id, title, message) {
  try {
    await chrome.notifications.create(id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
      title: `VigyaanVest · ${title}`,
      message,
    });
  } catch {
    /* notifications may be unavailable */
  }
}

/**
 * Compute & fire due alerts for watchlist earnings + visible macro events.
 * watchlist: [{ symbol, market }]  settings: { alert:{daysBefore,time}, filters:{...} }
 */
export async function reconcileAlerts(watchlist, settings) {
  const cache = await getCalendarCache();
  if (!cache || !Array.isArray(cache.events)) return { fired: 0 };

  const store = await chrome.storage.local.get(FIRED_KEY);
  const fired = new Set(store[FIRED_KEY] || []);
  const now = Date.now();
  const daysBefore = (settings.alert && settings.alert.daysBefore) ?? 1;
  const time = (settings.alert && settings.alert.time) || "08:30";
  const wlSet = new Set((watchlist || []).map((w) => `${w.symbol}:${w.market === "BSE" ? "BSE" : w.market === "NSE" ? "NSE" : "US"}`));

  let fireCount = 0;
  const toFire = [];

  for (const ev of cache.events) {
    if (ev.type === "earnings") {
      const mkt = ev.market === "NSE" ? "NSE" : "US";
      const key = `e:${ev.ticker}:${mkt}:${ev.releaseDate}`;
      if (fired.has(key)) continue;
      // only watchlist symbols (match either NSE or US flavour)
      const onList = wlSet.has(`${ev.ticker}:US`) || wlSet.has(`${ev.ticker}:NSE`) || wlSet.has(`${ev.ticker}:BSE`);
      if (!onList) continue;
      const at = alertFireAt(ev.releaseDate, daysBefore, time);
      if (at != null && at <= now && now - at < 36 * 3600000) {
        toFire.push({ key, title: `${ev.ticker} earnings`, msg: `${ev.companyName || ev.ticker} reports ${ev.releaseDate}${ev.reportWindow ? " · " + ev.reportWindow.toUpperCase() : ""}.` });
      }
    } else if (ev.type === "macro") {
      const key = `m:${ev.id}`;
      if (fired.has(key)) continue;
      if (!macroEnabled(ev, settings)) continue;
      const day = (ev.datetimeUTC || "").slice(0, 10);
      const at = alertFireAt(day, 0, time);
      if (at != null && at <= now && now - at < 36 * 3600000) {
        toFire.push({ key, title: ev.title, msg: `${ev.region} · ${ev.impact} impact${ev.forecast ? " · est " + ev.forecast : ""}.` });
      }
    }
  }

  for (const f of toFire) {
    await notify(f.key, f.title, f.msg);
    fired.add(f.key);
    fireCount++;
  }
  if (fireCount) await chrome.storage.local.set({ [FIRED_KEY]: [...fired].slice(-500) });
  return { fired: fireCount };
}
