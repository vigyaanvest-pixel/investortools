/* VigyaanVest Workspace — live data layer.
   Exposes window.VVDATA with the same surface the controller (workspace.js) expects,
   but backed by chrome.storage + the background worker for live quotes / calendar / tape.
   When run outside the extension (e.g. a plain preview), it falls back to a built-in
   sample dataset so the UI still renders. */
window.VVDATA = (function () {
  var HAS_CHROME = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

  /* ---------------- shared primitives ---------------- */
  var DOT = { Watching: "#2f8a4e", Researching: "#2f6db0", Ready: "#578861", Passed: "#858481", Avoid: "#c4433b" };

  function chartPaths(series, w, h, pad) {
    pad = pad || 6;
    if (!series || series.length < 2) series = [1, 1];
    var min = Math.min.apply(null, series), max = Math.max.apply(null, series);
    var rng = (max - min) || 1, n = series.length;
    var pts = series.map(function (v, i) {
      var x = pad + (i / (n - 1)) * (w - pad * 2);
      var y = pad + (1 - (v - min) / rng) * (h - pad * 2);
      return [x, y];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ");
    var area = line + " L" + pts[n - 1][0].toFixed(1) + "," + (h - pad) + " L" + pts[0][0].toFixed(1) + "," + (h - pad) + " Z";
    return { line: line, area: area };
  }

  /* ---------------- default watchlist (markets) ---------------- */
  var DEFAULT_WL = [
    { symbol: "NVDA", market: "US" }, { symbol: "MU", market: "US" }, { symbol: "AAPL", market: "US" },
    { symbol: "AMD", market: "US" }, { symbol: "TSLA", market: "US" }, { symbol: "RELIANCE", market: "NSE" },
    { symbol: "INFY", market: "NSE" }, { symbol: "TCS", market: "NSE" }, { symbol: "HDFCBANK", market: "BSE" },
  ];

  function flatSeries() { var a = []; for (var i = 0; i < 9; i++) a.push(100); return a; }
  function makeRecord(symbol, market) {
    var cur = market === "US" ? "USD" : "INR";
    return {
      s: symbol, co: "Fetching…", mkt: market, cur: cur,
      last: "—", chgAbs: "—", chg: "—", up: true,
      price: "—", today: "—", mktcap: "—", range: "—", avgvol: "—",
      pe: "—", fwdpe: "—", roe: "—", roce: "—", de: "—", div: "—",
      status: "Watching", sc: "b-watch", grade: "Watching", setup: "—", tape: 0, news: false,
      next: "No earnings date yet", cd: "—", soon: false, earn: "—", review: "—", overdue: false,
      bull: "—", bear: "—", trigger: "—", stop: "—", tags: "",
      series: flatSeries(),
    };
  }

  /* ---------------- state ---------------- */
  var api = {
    S: {}, ORDER: [], TAPE: [], TAPE_BY: {}, DAYS: [], WEEK: [], MONTHEV: {},
    DOT: DOT, chartPaths: chartPaths,
  };
  var current = "NVDA";
  var EDITS = {}, QUOTES = {}, CAL = null, TAPEBUF = [];
  var subscribers = [];

  /* ---------------- storage helpers ---------------- */
  function sget(keys) { return new Promise(function (r) { chrome.storage.local.get(keys, r); }); }
  function sset(obj) { return new Promise(function (r) { chrome.storage.local.set(obj, r); }); }
  function sendMsg(m) { return new Promise(function (r) { try { chrome.runtime.sendMessage(m, function (resp) { void chrome.runtime.lastError; r(resp); }); } catch (e) { r(null); } }); }

  /* ---------------- patch / edits ---------------- */
  function applyPatch(symbol, patch) {
    var rec = api.S[symbol]; if (!rec || !patch) return;
    Object.keys(patch).forEach(function (k) {
      if (patch[k] !== undefined && patch[k] !== null) rec[k] = patch[k];
    });
  }
  function saveEdit(k, patch) {
    Object.assign(api.S[k], patch);
    EDITS[k] = Object.assign(EDITS[k] || {}, patch);
    if (HAS_CHROME) sset({ "vvw-edits": EDITS });
  }
  api.saveEdit = saveEdit;

  /* ---------------- symbol focus ---------------- */
  api.getSymbol = function () { return api.S[current] ? current : (api.ORDER[0] || current); };
  api.setSymbol = function (s) { current = s; if (HAS_CHROME) sset({ "vvw-symbol": s }); };

  /* ---------------- add / remove ---------------- */
  api.addSymbol = function (symbol, market) {
    symbol = (symbol || "").toUpperCase().replace(/[^A-Z0-9.:]/g, "");
    if (!symbol) return null;
    market = market || "US";
    if (/\.NS$|:NSE$/.test(symbol)) { market = "NSE"; symbol = symbol.replace(/\.NS$|:NSE$/, ""); }
    else if (/\.BO$|:BSE$/.test(symbol)) { market = "BSE"; symbol = symbol.replace(/\.BO$|:BSE$/, ""); }
    if (api.S[symbol]) return symbol;
    api.S[symbol] = makeRecord(symbol, market);
    api.ORDER.push(symbol);
    if (HAS_CHROME) {
      sset({ "vvw-watchlist": api.ORDER.map(function (s) { return { symbol: s, market: api.S[s].mkt }; }) });
    }
    return symbol;
  };
  api.removeSymbol = function (symbol) {
    if (!api.S[symbol]) return;
    delete api.S[symbol];
    api.ORDER = api.ORDER.filter(function (s) { return s !== symbol; });
    if (HAS_CHROME) sset({ "vvw-watchlist": api.ORDER.map(function (s) { return { symbol: s, market: api.S[s].mkt }; }) });
  };

  /* ---------------- live hydrate ---------------- */
  api.hydrate = function (symbol) {
    var rec = api.S[symbol];
    if (!rec) return Promise.resolve(null);
    if (!HAS_CHROME) return Promise.resolve(rec); // sample already populated
    return sendMsg({ type: "FETCH_QUOTE", symbol: symbol, market: rec.mkt }).then(function (patch) {
      if (patch) {
        applyPatch(symbol, patch);
        if (EDITS[symbol]) Object.assign(rec, EDITS[symbol]); // user edits win
        QUOTES[symbol] = patch;
        sset({ "vvw-quotes": QUOTES });
      }
      return patch;
    });
  };

  /* ---------------- calendar build ---------------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  var DW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function eventsOn(dateStr) {
    if (!CAL || !CAL.events) return [];
    return CAL.events.filter(function (e) {
      var d = e.type === "earnings" ? e.releaseDate : (e.datetimeUTC || "").slice(0, 10);
      return d === dateStr;
    });
  }
  function isWatched(ticker) { return !!api.S[ticker]; }

  function buildCalendar() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todayStr = ymd(today);

    // ---- forward ribbon: next 12 trading days ----
    var days = [], cursor = new Date(today), count = 0;
    while (days.length < 12 && count < 30) {
      count++;
      var dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) {
        var ds = ymd(cursor), chips = [];
        eventsOn(ds).forEach(function (e) {
          if (e.type === "macro") chips.push({ c: e.region === "IN" ? "in" : "us", t: e.title.replace(/\(.*?\)/, "").trim() });
          else if (e.type === "earnings" && isWatched(e.ticker)) chips.push({ c: "earn", t: "★ " + e.ticker });
        });
        days.push({ dw: DW[dow], dn: cursor.getDate(), today: ds === todayStr, chips: chips.slice(0, 3) });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    api.DAYS = days;

    // ---- current week (Mon–Fri) ----
    var monday = new Date(today); var shift = (monday.getDay() + 6) % 7; monday.setDate(monday.getDate() - shift);
    var week = [];
    for (var i = 0; i < 5; i++) {
      var wd = new Date(monday); wd.setDate(monday.getDate() + i); var wds = ymd(wd);
      var macros = [], bmo = [], amc = [];
      eventsOn(wds).forEach(function (e) {
        if (e.type === "macro") {
          macros.push({ t: e.title, r: e.region === "IN" ? "IN" : "US", imp: e.impact === "high" ? "High" : e.impact === "med" ? "Med" : "Low", tm: e.forecast ? "est " + e.forecast : "" });
        } else if (e.type === "earnings") {
          var tk = { s: e.ticker, w: isWatched(e.ticker), nse: e.market === "NSE", eps: e.epsForecast != null ? String(e.epsForecast) : "" };
          if (e.reportWindow === "bmo") bmo.push(tk); else amc.push(tk);
        }
      });
      week.push({ dw: DW[wd.getDay()], dn: wd.getDate(), today: wds === todayStr, macros: macros, bmo: bmo, amc: amc });
    }
    api.WEEK = week;

    // ---- month grid events keyed by day-of-month ----
    var monthEv = {};
    if (CAL && CAL.events) {
      CAL.events.forEach(function (e) {
        var ds = e.type === "earnings" ? e.releaseDate : (e.datetimeUTC || "").slice(0, 10);
        var d = new Date(ds + "T00:00:00");
        if (isNaN(d) || d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear()) return;
        var dom = d.getDate();
        (monthEv[dom] = monthEv[dom] || []);
        if (e.type === "macro") monthEv[dom].push({ c: e.region === "IN" ? "in" : "us", t: e.title.replace(/\(.*?\)/, "").trim() });
        else if (isWatched(e.ticker)) monthEv[dom].push({ c: "earn", t: e.ticker });
      });
    }
    api.MONTHEV = monthEv;
    api._calMonthLabel = MON[today.getMonth()] + " " + today.getFullYear();
    api._calToday = today.getDate();

    // ---- merge next earnings into each symbol ----
    api.ORDER.forEach(function (sym) {
      if (!CAL || !CAL.events) return;
      var future = CAL.events
        .filter(function (e) { return e.type === "earnings" && e.ticker === sym && e.releaseDate >= todayStr; })
        .sort(function (a, b) { return a.releaseDate < b.releaseDate ? -1 : 1; })[0];
      if (future) {
        var d = new Date(future.releaseDate + "T00:00:00");
        var diff = Math.round((d - today) / 86400000);
        var rec = api.S[sym];
        rec.next = "Earnings";
        rec.cd = diff <= 0 ? "today" : diff + "d";
        rec.soon = diff >= 0 && diff <= 7;
        rec.earn = MON[d.getMonth()] + " " + d.getDate() + (future.reportWindow ? " · " + future.reportWindow.toUpperCase() : "");
      }
    });
  }
  api.buildCalendar = buildCalendar;
  // full synced event list (for the calendar overlay's month/week navigation)
  api.events = function () { return (CAL && CAL.events) ? CAL.events : []; };

  /* ---------------- tape build ---------------- */
  function buildTape(buf) {
    TAPEBUF = buf || TAPEBUF || [];
    var items = [];
    // synthesize macro + watchlist-earnings highlights from the calendar
    var today = new Date(); today.setHours(0, 0, 0, 0); var todayStr = ymd(today);
    if (CAL && CAL.events) {
      // upcoming macro (next ~14 days) + upcoming watchlist earnings (next ~45 days),
      // so the tape shows context immediately even before a news site is opened.
      CAL.events.forEach(function (e) {
        if (e.type === "macro") {
          var ds = (e.datetimeUTC || "").slice(0, 10);
          if (ds < todayStr) return;
          var md = new Date(ds + "T00:00:00"); var mdiff = Math.round((md - today) / 86400000);
          if (mdiff > 14) return;
          var when = mdiff <= 0 ? "today" : mdiff === 1 ? "tomorrow" : "in " + mdiff + " days";
          items.push({ cls: e.region === "IN" ? "macro in" : "macro", src: (e.region === "IN" ? "⚑ India macro" : "⚑ US macro"), ts: MON[md.getMonth()] + " " + md.getDate(), hl: e.title + " · " + when + (e.forecast ? " · est " + e.forecast : ""), tags: [] });
        } else if (e.type === "earnings" && isWatched(e.ticker) && e.releaseDate >= todayStr) {
          var d = new Date(e.releaseDate + "T00:00:00"); var diff = Math.round((d - today) / 86400000);
          if (diff <= 45) items.push({ cls: "evt", src: "★ Watchlist event", ts: MON[d.getMonth()] + " " + d.getDate(), hl: e.ticker + " reports in " + (diff <= 0 ? "today" : diff + " days") + (e.reportWindow ? " (" + e.reportWindow.toUpperCase() + ")" : ""), tags: [e.ticker] });
        }
      });
    }
    // live scraped headlines from open news tabs
    TAPEBUF.forEach(function (t) { items.push({ cls: t.cls || "", src: t.src, ts: t.ts, hl: t.hl, tags: t.tags || [] }); });

    api.TAPE = items;
    // tape mentions keyed by symbol (Grid drawer) + per-symbol tape counts
    var by = {};
    api.ORDER.forEach(function (s) { api.S[s].tape = 0; api.S[s].news = false; });
    items.forEach(function (t) {
      (t.tags || []).forEach(function (tag) {
        if (!api.S[tag]) return;
        (by[tag] = by[tag] || []).push({ src: t.src, ts: t.ts, hl: t.hl });
        api.S[tag].tape++; api.S[tag].news = true;
      });
    });
    api.TAPE_BY = by;
  }
  api.buildTape = buildTape;
  api.topHeadlines = function (n) {
    return api.TAPE.filter(function (t) { return t.cls !== "macro" && t.cls !== "macro in"; }).slice(0, n || 5).map(function (t) { return t.hl; });
  };

  /* ---------------- subscribe to background updates ---------------- */
  api.subscribe = function (cb) { subscribers.push(cb); };
  function emit() { subscribers.forEach(function (cb) { try { cb(); } catch (e) {} }); }

  /* ---------------- init ---------------- */
  function init() {
    if (!HAS_CHROME) {
      // sample fallback so the UI renders in a plain browser preview
      var SAMPLE = window.VVSAMPLE || null;
      if (SAMPLE) {
        api.S = SAMPLE.S; api.ORDER = SAMPLE.ORDER; api.TAPE = SAMPLE.TAPE; api.TAPE_BY = SAMPLE.TAPE_BY;
        api.DAYS = SAMPLE.DAYS; api.WEEK = SAMPLE.WEEK; api.MONTHEV = SAMPLE.MONTHEV;
        api._calMonthLabel = SAMPLE.calMonthLabel; api._calToday = SAMPLE.calToday;
        CAL = SAMPLE.EVENTS ? { events: SAMPLE.EVENTS } : null; // feeds api.events() for the overlay
        current = api.ORDER[0];
      }
      return Promise.resolve();
    }
    return sget(["vvw-watchlist", "vvw-edits", "vvw-quotes", "vvw-symbol", "vvw-tape", "vvw-calendar"]).then(function (d) {
      var wl = (d["vvw-watchlist"] && d["vvw-watchlist"].length) ? d["vvw-watchlist"] : DEFAULT_WL;
      if (!d["vvw-watchlist"]) sset({ "vvw-watchlist": wl });
      EDITS = d["vvw-edits"] || {};
      QUOTES = d["vvw-quotes"] || {};
      CAL = d["vvw-calendar"] || null;
      api.ORDER = wl.map(function (w) { return w.symbol; });
      wl.forEach(function (w) {
        api.S[w.symbol] = makeRecord(w.symbol, w.market);
        if (QUOTES[w.symbol]) applyPatch(w.symbol, QUOTES[w.symbol]);
        if (EDITS[w.symbol]) Object.assign(api.S[w.symbol], EDITS[w.symbol]);
      });
      current = (d["vvw-symbol"] && api.S[d["vvw-symbol"]]) ? d["vvw-symbol"] : api.ORDER[0];
      buildCalendar();
      buildTape(d["vvw-tape"] || []);

      // live updates from the worker (tape + calendar sync)
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local") return;
        var touched = false;
        if (changes["vvw-tape"]) { buildTape(changes["vvw-tape"].newValue || []); touched = true; }
        if (changes["vvw-calendar"]) { CAL = changes["vvw-calendar"].newValue || null; buildCalendar(); buildTape(TAPEBUF); touched = true; }
        if (touched) emit();
      });

      // kick a calendar sync in the background
      sendMsg({ type: "SYNC_CALENDAR", force: false }).then(function (r) {
        if (r && r.cache) { CAL = r.cache; buildCalendar(); buildTape(TAPEBUF); emit(); }
      });
    });
  }

  api.ready = init();
  return api;
})();
