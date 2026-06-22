/* VigyaanVest Trader Workspace — background service worker.
   Routes live-data requests, runs calendar sync + alert alarms, manages The Tape
   buffer, drives TTS, and serves page-extraction context to the Dock side panel. */

import { fetchQuote } from "./market-data.js";
import { syncCalendar, getCalendarCache, reconcileAlerts } from "./calendar-sync.js";
import { speakBatch, stopSpeech, getVoices } from "./tts.js";

const SETTINGS_KEY = "vvw-settings";
const WATCHLIST_KEY = "vvw-watchlist";
const TAPE_KEY = "vvw-tape";
const PAGECTX_KEY = "vvw-pagectx"; // session: { [tabId]: {ctx, metrics, ts} }
const TAPE_CAP = 60;

const ALARM_SYNC_AM = "vvw-sync-am";
const ALARM_SYNC_PM = "vvw-sync-pm";
const ALARM_ALERTS = "vvw-alerts";

/* ---------- lifecycle ---------- */
chrome.runtime.onInstalled.addListener(async () => {
  await setupAlarms();
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch {
    /* sidePanel may be unavailable */
  }
  // first sync attempt (best-effort)
  runSyncAndReconcile().catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarms();
  runSyncAndReconcile().catch(() => {});
});

// toolbar icon opens the full workspace tab
chrome.action.onClicked.addListener(() => openWorkspace());

async function setupAlarms() {
  await chrome.alarms.clearAll();
  scheduleDailyAlarm(ALARM_SYNC_AM, 8, 0);
  scheduleDailyAlarm(ALARM_SYNC_PM, 18, 0);
  chrome.alarms.create(ALARM_ALERTS, { periodInMinutes: 1 });
}

function scheduleDailyAlarm(name, hour, minute) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  chrome.alarms.create(name, { when: next.getTime(), periodInMinutes: 24 * 60 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_SYNC_AM || alarm.name === ALARM_SYNC_PM) runSyncAndReconcile().catch(() => {});
  else if (alarm.name === ALARM_ALERTS) runReconcileOnly().catch(() => {});
});

/* ---------- settings adapter ---------- */
async function loadFlatSettings() {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return got[SETTINGS_KEY] || {};
}
async function loadWatchlist() {
  const got = await chrome.storage.local.get(WATCHLIST_KEY);
  return got[WATCHLIST_KEY] || [];
}
function alertConfigFromFlat(flat) {
  const usMacro = flat.usRate !== false || flat.usCpi !== false || flat.usOther === true;
  const inMacro = flat.inRate !== false || flat.inCpi !== false;
  return {
    alert: { daysBefore: Number(flat.daysBefore != null ? flat.daysBefore : 1), time: flat.alertTime || "08:30" },
    filters: {
      showUsMacro: usMacro,
      showInMacro: inMacro,
      impactHigh: true,
      impactMed: true,
      impactLow: false,
    },
  };
}

async function runSyncAndReconcile() {
  const result = await syncCalendar(false);
  await runReconcileOnly();
  return result;
}
async function runReconcileOnly() {
  const [flat, watchlist] = await Promise.all([loadFlatSettings(), loadWatchlist()]);
  if (flat.squawk === undefined && !watchlist.length) return { fired: 0 };
  return reconcileAlerts(watchlist, alertConfigFromFlat(flat));
}

/* ---------- The Tape buffer ---------- */
async function pushTape(items) {
  if (!items || !items.length) return;
  const got = await chrome.storage.local.get(TAPE_KEY);
  const existing = got[TAPE_KEY] || [];
  const seen = new Set(existing.map((t) => t.hl));
  const fresh = [];
  for (const it of items) {
    const hl = (it.hl || "").trim();
    if (!hl || seen.has(hl)) continue;
    seen.add(hl);
    fresh.push({
      id: `${it.src || "src"}-${hl.slice(0, 40)}`,
      src: it.src || "News",
      ts: it.ts || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
      hl,
      tags: it.tags || [],
      cls: it.cls || "",
    });
  }
  if (!fresh.length) return;
  const merged = [...fresh, ...existing].slice(0, TAPE_CAP);
  await chrome.storage.local.set({ [TAPE_KEY]: merged });
}

/* ---------- open / focus workspace ---------- */
async function openWorkspace(symbol) {
  const url = chrome.runtime.getURL("workspace/index.html");
  if (symbol) {
    try {
      await chrome.storage.local.set({ "vvw-symbol": symbol });
    } catch {
      /* ignore */
    }
  }
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((t) => t.url && t.url.startsWith(url));
  if (existing && existing.id != null) {
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) await chrome.windows.update(existing.windowId, { focused: true });
    chrome.tabs.reload(existing.id);
  } else {
    await chrome.tabs.create({ url });
  }
}

/* ---------- message router ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;
  switch (msg.type) {
    case "FETCH_QUOTE":
      fetchQuote(msg.symbol, msg.market || "US").then(sendResponse).catch(() => sendResponse(null));
      return true;

    case "SYNC_CALENDAR":
      syncCalendar(Boolean(msg.force)).then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
      return true;

    case "GET_CALENDAR":
      getCalendarCache().then((cache) => sendResponse({ cache })).catch(() => sendResponse({ cache: null }));
      return true;

    case "RECONCILE_ALERTS":
      runReconcileOnly().then(sendResponse).catch(() => sendResponse({ fired: 0 }));
      return true;

    case "SPEAK":
      speakBatch(msg.texts || [], msg.settings || {}, { force: msg.force !== false }).then(sendResponse);
      return true;

    case "STOP_SPEAK":
      stopSpeech();
      sendResponse({ ok: true });
      return true;

    case "GET_VOICES":
      getVoices().then((voices) => sendResponse({ voices }));
      return true;

    case "GET_TAPE":
      chrome.storage.local.get(TAPE_KEY).then((g) => sendResponse({ tape: g[TAPE_KEY] || [] }));
      return true;

    case "TAPE_PUSH":
      pushTape(msg.items).then(() => sendResponse({ ok: true }));
      return true;

    case "PAGE_CONTEXT": {
      // content script reports detected context + extracted metrics for its tab
      const tabId = sender && sender.tab && sender.tab.id;
      if (tabId != null) {
        chrome.storage.session
          .set({ [PAGECTX_KEY + ":" + tabId]: { ...msg.payload, tabId, ts: Date.now() } })
          .then(() => sendResponse({ ok: true }))
          .catch(() => sendResponse({ ok: false }));
      } else {
        sendResponse({ ok: false });
      }
      return true;
    }

    case "GET_PAGE_CONTEXT":
      getActivePageContext().then(sendResponse).catch(() => sendResponse(null));
      return true;

    case "OPEN_WORKSPACE":
      openWorkspace(msg.symbol).then(() => sendResponse({ ok: true }));
      return true;

    default:
      return false;
  }
});

/** Latest detected page context for the active non-extension tab (for the Dock side panel). */
async function getActivePageContext() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || tab.id == null) return null;
  const key = PAGECTX_KEY + ":" + tab.id;
  const got = await chrome.storage.session.get(key);
  return got[key] || { ctx: { site: "none", symbol: null }, metrics: null, url: tab.url || "", tabId: tab.id };
}
