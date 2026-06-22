/* ===== VigyaanVest Workspace controller — Deck / Grid / Settings, ⌘K, filters =====
   Adapted from the design prototype to the live data layer (window.VVDATA):
   live quotes via the worker, real calendar + tape, TTS, side-panel dock, chrome.storage. */
(function () {
  var D = window.VVDATA;
  var SETUPS = ["Breakout", "Pullback", "Momentum", "Range", "Avoid"];
  var STATUSES = ["Watching", "Researching", "Ready", "Passed", "Avoid"];
  var HAS_CHROME = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
  var SET = {};                 // settings cache
  var fetched = {};             // symbols hydrated this session
  var winId = null;             // cached window id (for synchronous sidePanel.open in the dock gesture)
  var byId = function (id) { return document.getElementById(id); };
  if (HAS_CHROME && chrome.windows && chrome.windows.getCurrent) {
    try { chrome.windows.getCurrent(function (w) { if (w) winId = w.id; void chrome.runtime.lastError; }); } catch (e) {}
  }
  // HTML-escape any externally-sourced or user-entered string before innerHTML injection (XSS guard)
  var ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; }); }

  /* ---------------- prefs storage ---------------- */
  function getPrefs() {
    var keys = ["vvw-settings", "vvw-density", "vvw-view-default", "vvw-view", "vvw-read"];
    return new Promise(function (res) {
      if (HAS_CHROME) { chrome.storage.local.get(keys, function (d) { res(d); }); }
      else {
        var d = {}; keys.forEach(function (k) { try { d[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { d[k] = localStorage.getItem(k); } });
        res(d);
      }
    });
  }
  function setPref(k, v) {
    if (HAS_CHROME) { var o = {}; o[k] = v; chrome.storage.local.set(o); }
    else { try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); } catch (e) {} }
  }

  /* ---------------- view switching ---------------- */
  function setView(name) {
    ["deck", "grid", "settings"].forEach(function (v) { byId("view-" + v).classList.toggle("on", v === name); });
    document.querySelectorAll(".viewseg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-view") === name); });
    setPref("vvw-view", name);
    if (name === "deck") focusDeck(D.getSymbol());
    if (name === "grid") renderGrid();
  }
  document.querySelector(".viewseg").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-view]"); if (b) setView(b.getAttribute("data-view"));
  });

  /* ---------------- DECK ---------------- */
  function statCls(s) { return { Watching: "b-watch", Researching: "b-research", Ready: "b-ready", Passed: "b-passed", Avoid: "b-avoid" }[s] || "b-watch"; }
  function statusSelect(d) { return '<span class="statpill"><span class="dot"></span><select data-edit="status" title="Change status">' + STATUSES.map(function (o) { return "<option" + (o === d.status ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></span>"; }
  function tagList(d) { return (d.tags || "").split(/[,·]/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function tagsHTML(d) { return tagList(d).map(function (t) { return '<span class="tagchip">' + esc(t) + '<button class="x" data-deltag="' + esc(t) + '" title="Remove">×</button></span>'; }).join("") + '<input class="taginput" placeholder="type a tag, ↵" aria-label="Add tag" />'; }
  function refreshTags() { document.querySelectorAll("[data-tagedit]").forEach(function (box) { box.innerHTML = tagsHTML(D.S[D.getSymbol()]); }); }
  function addTag(k, raw) { var l = tagList(D.S[k]); raw.split(",").forEach(function (p) { var t = p.trim(); if (t && l.indexOf(t) < 0) l.push(t); }); D.saveEdit(k, { tags: l.join(", ") }); }
  function delTag(k, t) { D.saveEdit(k, { tags: tagList(D.S[k]).filter(function (x) { return x !== t; }).join(", ") }); }

  var railFilter = "";
  function renderRail(active) {
    var q = railFilter.trim().toUpperCase();
    var order = D.ORDER.filter(function (k) {
      if (!q) return true;
      var w = D.S[k];
      return k.indexOf(q) >= 0 || (w.co || "").toUpperCase().indexOf(q) >= 0 || (w.tags || "").toUpperCase().indexOf(q) >= 0;
    });
    byId("wlct").textContent = q ? (order.length + "/" + D.ORDER.length) : D.ORDER.length;
    byId("wl").innerHTML = order.map(function (k) {
      var w = D.S[k];
      var ev = w.cd === "—" ? w.next : (w.next + " · " + w.cd);
      return '<div class="wlrow' + (k === active ? " active" : "") + '" data-sym="' + k + '">' +
        '<div class="s"><span class="dot" style="background:' + (D.DOT[w.status] || "#858481") + '"></span>' + esc(w.s) + "</div>" +
        '<div class="px">' + w.last + "</div>" +
        '<div class="chg ' + (w.up ? "pos" : "neg") + '">' + w.chg + "</div>" +
        '<div class="ev"><span class="cd">' + ev + "</span></div></div>";
    }).join("") || '<div style="padding:14px 12px;font-size:11.5px;color:var(--text-3);">No symbols match “' + esc(railFilter) + '”.</div>';
  }
  (function () {
    var f = byId("wlFilter");
    if (f) f.addEventListener("input", function () { railFilter = this.value; renderRail(D.getSymbol()); });
  })();
  function srcLabel(d) { return d.mkt === "US" ? "Yahoo Finance" : d.mkt === "NSE" ? "NSE India" : "BSE India"; }
  function host(d) { return d.mkt === "US" ? "finviz.com/quote.ashx?t=" + d.s : "screener.in/company/" + d.s; }
  function ageLabel(ts) {
    if (!ts) return "just now";
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return s + "s ago";
    var m = Math.round(s / 60); if (m < 60) return m + "m ago";
    return Math.round(m / 60) + "h ago";
  }
  function tvSymbol(d) { var b = d.s.toUpperCase(); return d.mkt === "NSE" ? "NSE:" + b : d.mkt === "BSE" ? "BSE:" + b : "NASDAQ:" + b; }

  function cell(l, v, cls, loading) {
    if (loading) return '<div class="mc"><div class="l">' + l + '</div><div class="v skel">000.0</div></div>';
    var dash = (v === "—" || v == null) ? " dash" : "";
    return '<div class="mc"><div class="l">' + l + '</div><div class="v ' + (cls || "") + dash + '">' + (v == null ? "—" : esc(v)) + "</div></div>";
  }
  function renderCenter(k, loading) {
    var d = D.S[k];
    var mp = d.mkt === "US" ? "us" : "in";
    var cp = D.chartPaths(d.series, 520, 200, 12);
    var stroke = d.up ? "var(--pos)" : "var(--neg)";
    var chips = SETUPS.map(function (s) { return '<span class="schip' + (s === d.setup ? " active" : "") + '" data-setup="' + s + '">' + s + "</span>"; }).join("");
    var gradePill = d.grade === "A+ setup" ? '<span class="vv-pill pos"><span class="dot"></span>A+ setup</span>' : "";
    var tapeNote = d.tape > 0 ? '<span class="lead">·</span> mentioned <b>' + d.tape + "×</b> in the tape today" : "";
    var provTxt, provCls;
    if (loading) { provTxt = "fetching from " + srcLabel(d) + "…"; provCls = "prov loading"; }
    else { provTxt = "↑ " + (d.source || srcLabel(d)) + " · " + ageLabel(d.fetchedAt); provCls = "prov"; }
    var headPx = loading
      ? '<span class="px"><div class="v skel">000.00</div><div class="c skel" style="margin-top:5px;">+0.0%</div></span>'
      : '<span class="px"><div class="v">' + d.last + '</div><div class="c ' + (d.up ? "pos" : "neg") + '">' + d.chgAbs + " · " + d.chg + "</div></span>";

    // chart: TradingView embed when enabled, else local sparkline from live series
    var chartInner;
    if (loading) chartInner = '<div class="chart-skel"><span class="spin"></span>Fetching daily candles from ' + srcLabel(d) + "…</div>";
    else if (SET.tvEmbed !== false && HAS_CHROME) {
      var theme = (window.VV && window.VV.get() === "midnight") ? "dark" : "light";
      var src = "https://www.tradingview.com/widgetembed/?symbol=" + encodeURIComponent(tvSymbol(d)) + "&interval=D&theme=" + theme + "&style=1&locale=en&hide_top_toolbar=1&save_image=0&hide_legend=1";
      chartInner = '<iframe title="TradingView chart" src="' + src + '" style="width:100%;height:190px;border:0;display:block;" referrerpolicy="no-referrer"></iframe>';
    } else {
      chartInner = '<svg viewBox="0 0 520 200" width="100%" height="190" preserveAspectRatio="none" style="display:block;">' +
        '<defs><linearGradient id="g' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + stroke + '" stop-opacity="0.18"/><stop offset="1" stop-color="' + stroke + '" stop-opacity="0"/></linearGradient></defs>' +
        '<g stroke="var(--border)" stroke-width="0.5"><line x1="0" y1="50" x2="520" y2="50"/><line x1="0" y1="100" x2="520" y2="100"/><line x1="0" y1="150" x2="520" y2="150"/></g>' +
        '<path d="' + cp.area + '" fill="url(#g' + k + ')" stroke="none"/>' +
        '<path d="' + cp.line + '" fill="none" stroke="' + stroke + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    byId("center").innerHTML =
      '<div class="sym-head"><span class="tk">' + esc(d.s) + '</span><span class="co">' + esc(d.co || "") + "</span>" + headPx + "</div>" +
      '<div class="verdict"><span class="vv-pill ' + mp + '"><span class="dot"></span>' + d.mkt + " · " + d.cur + "</span>" +
        statusSelect(d) + gradePill +
        (d.cd !== "—" && d.next === "Earnings" ? '<span class="lead">·</span> Earnings in <b style="color:var(--green-light);">' + d.cd + "</b>" : "") + tapeNote + "</div>" +
      '<div class="srcline"><span>Market data &amp; fundamentals</span><span class="' + provCls + '">' + provTxt + "</span></div>" +
      '<div class="mstrip">' +
        cell("Price", d.price, d.up ? "pos" : "neg", loading) + cell("Today", d.today, d.up ? "pos" : "neg", loading) + cell("Mkt Cap", d.mktcap, "", loading) + cell("52-wk", d.range, "", loading) + cell("Avg Vol", d.avgvol, "", loading) +
        cell("P/E TTM", d.pe, "", loading) + cell("Fwd P/E", d.fwdpe, "", loading) + cell("ROE", d.roe, d.roe === "—" ? "" : "pos", loading) + cell("ROCE", d.roce, "", loading) + cell("Debt/Eq", d.de, "", loading) +
      "</div>" +
      '<div class="grid2">' +
        '<div class="panel"><div class="panel-h"><span class="t">Chart · Daily</span><span class="meta">' + (loading ? "pulling…" : (SET.tvEmbed !== false && HAS_CHROME ? "TradingView · 1D" : srcLabel(d) + " · 1D")) + "</span></div>" +
          '<div class="chart-wrap">' + chartInner + "</div>" +
          '<div class="setup-chips">' + chips + "</div></div>" +
        '<div class="panel"><div class="panel-h"><span class="t">Thesis</span><span class="meta">your notes · local</span></div>' +
          '<div class="kv"><div class="row"><span class="k bull">Bull</span><span class="val ed" contenteditable="true" data-edit="bull">' + esc(d.bull) + "</span></div>" +
          '<div class="row"><span class="k bear">Bear</span><span class="val ed" contenteditable="true" data-edit="bear">' + esc(d.bear) + "</span></div>" +
          '<div class="row"><span class="k">Trigger</span><span class="val ed" contenteditable="true" data-edit="trigger">' + esc(d.trigger) + "</span></div>" +
          '<div class="row"><span class="k">Stop</span><span class="val mono ed" contenteditable="true" data-edit="stop">' + esc(d.stop) + "</span></div></div></div>" +
      "</div>" +
      '<div class="grid2" style="grid-template-columns:1fr 1fr;margin-bottom:0;">' +
        '<div class="panel"><div class="panel-h"><span class="t">Events &amp; review</span><span class="meta"' + (d.overdue ? ' style="color:var(--warn);"' : "") + ">" + (d.overdue ? "review overdue" : "your notes · local") + "</span></div>" +
          '<div class="kv"><div class="row"><span class="k">Earnings</span><span class="val mono">' + esc(d.earn) + "</span></div>" +
          '<div class="row"><span class="k">Review</span><span class="val mono ed" contenteditable="true" data-edit="review"' + (d.overdue ? ' style="color:var(--warn);"' : "") + ">" + esc(d.review) + "</span></div>" +
          '<div class="row"><span class="k">Next</span><span class="val">' + d.next + (d.cd !== "—" ? " · " + d.cd : "") + "</span></div></div></div>" +
        '<div class="panel"><div class="panel-h"><span class="t">Quick links</span><span class="meta">open source page</span></div>' +
          '<div class="kv" style="gap:7px;"><div class="setup-chips" style="padding:2px 0 0;">' +
            (d.mkt === "US"
              ? '<a class="schip" target="_blank" rel="noopener" href="https://finance.yahoo.com/quote/' + d.s + '">↗ Yahoo</a><a class="schip" target="_blank" rel="noopener" href="https://finviz.com/quote.ashx?t=' + d.s + '">↗ Finviz</a><a class="schip" target="_blank" rel="noopener" href="https://www.tradingview.com/symbols/' + d.s + '">↗ TradingView</a><a class="schip" target="_blank" rel="noopener" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&ticker=' + d.s + '">↗ SEC</a>'
              : '<a class="schip" target="_blank" rel="noopener" href="https://www.screener.in/company/' + d.s + '/">↗ Screener.in</a><a class="schip" target="_blank" rel="noopener" href="https://www.nseindia.com/get-quotes/equity?symbol=' + d.s + '">↗ NSE</a><a class="schip" target="_blank" rel="noopener" href="https://www.tradingview.com/symbols/' + tvSymbol(d).replace(":", "-") + '">↗ TradingView</a>') + "</div>" +
            '<div class="row" style="margin-top:4px;align-items:flex-start;"><span class="k">Tags</span><div class="tagedit" data-tagedit>' + tagsHTML(d) + "</div></div></div></div>" +
      "</div>";
    byId("center").scrollTop = 0;
  }
  function deckOn() { return byId("view-deck").classList.contains("on"); }
  function focusDeck(k) {
    if (!D.S[k]) k = D.ORDER[0];
    if (!k) return;
    D.setSymbol(k); renderRail(k);
    var rec = D.S[k];
    var need = !fetched[k];
    renderCenter(k, need && rec.last === "—");
    if (need) {
      fetched[k] = 1;
      D.hydrate(k).then(function () {
        if (D.getSymbol() === k && deckOn()) renderCenter(k, false);
        renderRail(D.getSymbol());
      });
    }
  }
  byId("wl").addEventListener("click", function (e) {
    var r = e.target.closest(".wlrow"); if (r) focusDeck(r.getAttribute("data-sym"));
  });

  // inline editing
  function bindEdits(scope) {
    scope.addEventListener("click", function (e) {
      var del = e.target.closest("[data-deltag]"); if (del) { delTag(D.getSymbol(), del.getAttribute("data-deltag")); refreshTags(); return; }
      var chip = e.target.closest(".schip[data-setup]"); if (!chip) return;
      var k = D.getSymbol(); D.saveEdit(k, { setup: chip.getAttribute("data-setup") });
      scope.querySelectorAll(".schip[data-setup]").forEach(function (c) { c.classList.toggle("active", c === chip); });
    });
    scope.addEventListener("keydown", function (e) {
      if (!e.target.classList.contains("taginput")) return;
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); var v = e.target.value.replace(/,/g, ""); if (v.trim()) { addTag(D.getSymbol(), v); refreshTags(); var ni = scope.querySelector(".taginput"); if (ni) ni.focus(); } }
      else if (e.key === "Backspace" && !e.target.value) { var l = tagList(D.S[D.getSymbol()]); if (l.length) { delTag(D.getSymbol(), l[l.length - 1]); refreshTags(); var ni2 = scope.querySelector(".taginput"); if (ni2) ni2.focus(); } }
    });
    scope.addEventListener("change", function (e) {
      var sel = e.target.closest('select[data-edit="status"]'); if (!sel) return;
      var k = D.getSymbol(); D.saveEdit(k, { status: sel.value, sc: statCls(sel.value) }); renderRail(k);
      if (byId("view-grid").classList.contains("on")) renderRows();
    });
    scope.addEventListener("focusout", function (e) {
      var ti = e.target.closest(".taginput"); if (ti) { if (ti.value.trim()) { addTag(D.getSymbol(), ti.value); refreshTags(); } return; }
      var ed = e.target.closest("[contenteditable][data-edit]"); if (!ed) return;
      var k = D.getSymbol(), f = ed.getAttribute("data-edit"), patch = {}; patch[f] = ed.textContent.trim() || "—"; D.saveEdit(k, patch);
    });
  }
  bindEdits(byId("center"));
  bindEdits(byId("detail"));

  /* ---------------- The Tape + ribbon ---------------- */
  // The Tape only fills while a supported news site is open in a tab — these links open them.
  var TAPE_SOURCES = [
    { name: "TradingView", url: "https://www.tradingview.com/news-flow/" },
    { name: "Finviz", url: "https://finviz.com/news" },
    { name: "MarketWatch", url: "https://www.marketwatch.com/latest-news?mod=home_ln" },
    { name: "Zerodha Pulse", url: "https://pulse.zerodha.com/" },
  ];
  function sourceLinks() {
    return TAPE_SOURCES.map(function (s) { return '<a href="' + s.url + '" target="_blank" rel="noopener">↗ ' + esc(s.name) + "</a>"; }).join("");
  }
  function renderTapeSources() {
    var el = byId("tapeSources"); if (!el) return;
    el.innerHTML = '<span class="lbl">Open a source to feed the tape</span>' + sourceLinks();
  }
  function renderStream() {
    byId("stream").innerHTML = D.TAPE.map(function (t) {
      var tags = (t.tags || []).map(function (x) { return '<span class="vv-pill" style="font-size:8.5px;padding:1px 7px;"><span class="dot"></span>' + esc(x) + "</span>"; }).join("");
      return '<div class="ti ' + (t.cls || "") + '"><div class="meta"><span class="src">' + esc(t.src) + '</span><span class="ts">' + esc(t.ts) + "</span></div>" +
        '<div class="hl">' + esc(t.hl) + "</div>" + (tags ? '<div class="tags">' + tags + "</div>" : "") + "</div>";
    }).join("") || '<div style="padding:18px;font-size:12px;color:var(--text-3);line-height:1.7;">No headlines yet. Open a supported news site and they’ll stream in here:<div class="tape-sources" style="margin-top:10px;">' + sourceLinks() + "</div></div>";
  }
  function renderRibbon() {
    byId("days").innerHTML = D.DAYS.map(function (d) {
      var chips = d.chips.map(function (c) { return '<span class="chip ' + c.c + '">' + c.t + "</span>"; }).join("");
      return '<div class="dcol' + (d.today ? " today" : "") + '"><div class="dh"><span class="dw">' + d.dw + '</span><span class="dn">' + d.dn + "</span></div>" + chips + "</div>";
    }).join("");
  }

  /* ---------------- GRID ---------------- */
  function parseNum(s) {
    if (s == null) return NaN;
    var t = String(s).replace(/[$₹,%\s]/g, "").replace(/L|Cr|T|B|M/g, "");
    var n = parseFloat(t); return isNaN(n) ? NaN : n;
  }
  function cdDays(s) { if (!s || s === "—") return Infinity; if (s === "today") return 0; var m = String(s).match(/(\d+)\s*d/); return m ? +m[1] : Infinity; }
  var SORTKEY = { last: function (r) { return parseNum(r.last); }, chg: function (r) { return parseNum(r.chg) * (r.up ? 1 : -1); },
    pe: function (r) { return parseNum(r.pe); }, roe: function (r) { return parseNum(r.roe); }, de: function (r) { return parseNum(r.de); },
    cd: function (r) { return cdDays(r.cd); }, tape: function (r) { return r.tape || 0; }, sym: function (r) { return r.s; } };

  var GF = { market: "All", status: {}, signals: { event: false, tape: false, overdue: false } };
  STATUSES.forEach(function (s) { GF.status[s] = true; });
  var GS = { key: "chg", dir: -1 };

  function gridRows() {
    var rows = D.ORDER.map(function (k) { return D.S[k]; });
    rows = rows.filter(function (r) {
      if (GF.market !== "All" && r.mkt !== GF.market) return false;
      if (!GF.status[r.status]) return false;
      if (GF.signals.event && !(r.next === "Earnings" && cdDays(r.cd) <= 7)) return false;
      if (GF.signals.tape && !(r.tape > 0)) return false;
      if (GF.signals.overdue && !r.overdue) return false;
      return true;
    });
    var f = SORTKEY[GS.key];
    if (f) rows.sort(function (a, b) { var x = f(a), y = f(b); if (x === y) return 0; return (x < y ? -1 : 1) * GS.dir; });
    return rows;
  }
  function spark(series, up) {
    var p = D.chartPaths(series, 48, 16, 2).line;
    return '<svg viewBox="0 0 48 16" width="48" height="16" preserveAspectRatio="none"><path d="' + p + '" fill="none" stroke="' + (up ? "var(--pos)" : "var(--neg)") + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function updateGridSidebar() {
    var counts = { Watching: 0, Researching: 0, Ready: 0, Passed: 0, Avoid: 0, event: 0, tape: 0, overdue: 0 };
    var sum = 0, green = 0, n = 0;
    D.ORDER.forEach(function (k) {
      var r = D.S[k];
      counts[r.status] = (counts[r.status] || 0) + 1;
      if (r.next === "Earnings" && cdDays(r.cd) <= 7) counts.event++;
      if (r.tape > 0) counts.tape++;
      if (r.overdue) counts.overdue++;
      var c = parseNum(r.chg); if (!isNaN(c)) { sum += r.up ? c : -c; n++; if (r.up && c !== 0) green++; }
    });
    document.querySelectorAll("[data-ct]").forEach(function (el) { var k = el.getAttribute("data-ct"); el.textContent = counts[k] || 0; });
    var big = byId("healthBig");
    if (n) { var avg = sum / n; big.textContent = (avg >= 0 ? "+" : "") + avg.toFixed(1) + "%"; big.className = "big " + (avg >= 0 ? "pos" : "neg"); byId("healthSub").textContent = "avg today · " + green + " of " + n + " green"; }
    else { big.textContent = "—"; big.className = "big"; byId("healthSub").textContent = "avg today"; }
  }
  function renderRows() {
    var rows = gridRows();
    var tb = byId("rows");
    updateGridSidebar();
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="12" class="noresult">No symbols match these filters.</td></tr>'; return; }
    tb.innerHTML = rows.map(function (r) {
      var off = (r.status === "Avoid" || r.status === "Passed") ? " off" : "";
      return '<tr data-sym="' + r.s + '"' + (r.news ? ' class="news-on"' : "") + ">" +
        '<td class="l"><span class="star' + off + '">★</span></td>' +
        '<td class="l"><div class="sym">' + esc(r.s) + '</div><div class="co">' + esc(r.co || "") + "</div></td>" +
        '<td class="num">' + r.last + "</td>" +
        '<td class="num ' + (r.up ? "pos" : "neg") + '">' + r.chg + "</td>" +
        "<td>" + spark(r.series, r.up) + "</td>" +
        '<td class="num">' + r.pe + "</td>" +
        '<td class="num">' + r.roe + "</td>" +
        '<td class="num">' + r.de + "</td>" +
        '<td class="l setup">' + esc(r.setup) + "</td>" +
        '<td class="l"><span class="badge ' + r.sc + '">' + r.status + "</span></td>" +
        '<td class="l"><span style="font-size:11px;color:var(--text-dim);">' + r.next + '</span> <span class="cd' + (r.soon ? " soon" : "") + '">' + r.cd + "</span></td>" +
        '<td><span class="tape-n ' + (r.tape > 0 ? "hot" : "zero") + '">' + (r.tape || "·") + "</span></td></tr>";
    }).join("");
    var sel = D.getSymbol();
    var selRow = tb.querySelector('tr[data-sym="' + sel + '"]') || tb.querySelector("tr[data-sym]");
    if (selRow) { selRow.classList.add("sel"); renderDetail(selRow.getAttribute("data-sym")); }
  }
  function renderDetail(k) {
    var r = D.S[k];
    var tape = D.TAPE_BY[k] || [];
    var tapeHtml = tape.length ? tape.map(function (t) { return '<div class="tmention"><div class="m"><span class="src">' + esc(t.src) + '</span><span class="ts">' + esc(t.ts) + '</span></div><div class="hl">' + esc(t.hl) + "</div></div>"; }).join("") : '<div style="font-size:11.5px;color:var(--text-3);">No mentions in today’s tape.</div>';
    var mp = r.mkt === "US" ? '<span class="vv-pill us"><span class="dot"></span>US</span>' : '<span class="vv-pill in"><span class="dot"></span>' + r.mkt + "</span>";
    var cp = D.chartPaths(r.series, 320, 110, 8);
    var stroke = r.up ? "var(--pos)" : "var(--neg)";
    byId("detail").innerHTML =
      '<div class="dh"><div class="top"><span class="tk">' + esc(r.s) + '</span><span class="co">' + esc(r.co || "") + "</span>" +
        '<span class="px"><div class="v">' + r.last + '</div><div class="c ' + (r.up ? "pos" : "neg") + '">' + r.chg + "</div></span></div>" +
        '<div class="pills">' + mp + statusSelect(r) + '<span class="vv-pill"><span class="dot"></span>' + esc(r.setup) + "</span></div></div>" +
      '<div class="dsec"><div class="t">Snapshot</div><div class="dmetrics">' +
        '<div class="dm"><div class="l">P/E</div><div class="v">' + r.pe + "</div></div>" +
        '<div class="dm"><div class="l">ROE</div><div class="v pos">' + r.roe + "</div></div>" +
        '<div class="dm"><div class="l">D/E</div><div class="v">' + r.de + "</div></div></div></div>" +
      '<div class="dsec"><div class="t">Chart · daily</div><div class="dchart"><svg viewBox="0 0 320 110" width="100%" height="96" preserveAspectRatio="none">' +
        '<defs><linearGradient id="dg' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + stroke + '" stop-opacity="0.16"/><stop offset="1" stop-color="' + stroke + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + cp.area + '" fill="url(#dg' + k + ')" stroke="none"/>' +
        '<path d="' + cp.line + '" fill="none" stroke="' + stroke + '" stroke-width="1.6"/></svg></div></div>' +
      '<div class="dsec"><div class="t">Thesis</div><div class="kv">' +
        '<div class="r"><span class="k bull">Bull</span><span class="val">' + esc(r.bull) + "</span></div>" +
        '<div class="r"><span class="k bear">Bear</span><span class="val">' + esc(r.bear) + "</span></div></div></div>" +
      '<div class="dsec"><div class="t">Events &amp; review</div><div class="kv">' +
        '<div class="r"><span class="k">Earnings</span><span class="val num">' + esc(r.earn) + "</span></div>" +
        '<div class="r"><span class="k">Review</span><span class="val num"' + (r.overdue ? ' style="color:var(--warn);"' : "") + ">" + esc(r.review) + "</span></div></div></div>" +
      '<div class="dsec"><div class="t">In the tape · today</div>' + tapeHtml + "</div>" +
      '<div class="dsec"><div class="t">Tags</div><div class="tagedit" data-tagedit>' + tagsHTML(r) + "</div></div>" +
      '<button class="vv-btn primary openbtn" data-open="' + k + '">Open ' + r.s + " in Deck →</button>";
  }
  function renderGrid() { renderTicker(); renderRows(); }

  document.querySelector("#view-grid thead tr").addEventListener("click", function (e) {
    var th = e.target.closest("th[data-sort]"); if (!th) return;
    var key = th.getAttribute("data-sort");
    if (GS.key === key) GS.dir = -GS.dir; else { GS.key = key; GS.dir = -1; }
    document.querySelectorAll("#view-grid thead th").forEach(function (h) { h.classList.remove("sorted"); var a = h.querySelector(".ar"); if (a) a.remove(); });
    th.classList.add("sorted");
    th.insertAdjacentHTML("beforeend", '<span class="ar">' + (GS.dir < 0 ? "▾" : "▴") + "</span>");
    renderRows();
  });
  byId("rows").addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-sym]"); if (!tr) return;
    this.querySelectorAll("tr").forEach(function (x) { x.classList.remove("sel"); });
    tr.classList.add("sel");
    D.setSymbol(tr.getAttribute("data-sym"));
    renderDetail(tr.getAttribute("data-sym"));
  });
  byId("detail").addEventListener("click", function (e) {
    var b = e.target.closest("[data-open]"); if (b) { D.setSymbol(b.getAttribute("data-open")); setView("deck"); }
  });
  byId("mktseg").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
    GF.market = b.textContent.trim(); renderRows();
  });
  document.querySelectorAll("[data-status]").forEach(function (c) {
    c.addEventListener("change", function () { GF.status[c.getAttribute("data-status")] = c.checked; renderRows(); });
  });
  document.querySelectorAll("[data-signal]").forEach(function (c) {
    c.addEventListener("change", function () { GF.signals[c.getAttribute("data-signal")] = c.checked; renderRows(); });
  });
  function renderTicker() {
    var news = D.TAPE.filter(function (t) { return t.cls !== "macro" && t.cls !== "macro in"; }).slice(0, 8);
    byId("tickerLbl").textContent = news.length + " in the news now";
    if (!news.length) { byId("track").innerHTML = '<span class="it"><span class="src">Tape</span><b>·</b> open a news site to populate the tape</span>'; return; }
    var one = news.map(function (n) { return '<span class="it"><span class="src">' + esc(n.src) + '</span><b>·</b> ' + esc(n.hl) + "</span>"; }).join("");
    byId("track").innerHTML = one + one;
  }

  /* ---------------- ⌘K palette ---------------- */
  var back = byId("cmdkBack"), input = byId("cmdkInput"), list = byId("cmdkList");
  var act = 0, items = [];
  function openK() { back.classList.add("on"); input.value = ""; renderK(""); setTimeout(function () { input.focus(); }, 20); }
  function closeK() { back.classList.remove("on"); }
  function renderK(q) {
    q = q.trim().toUpperCase().replace(/[^A-Z0-9.:]/g, "");
    items = [];
    if (q && !D.S[q]) items.push({ add: q });
    D.ORDER.forEach(function (k) { var d = D.S[k]; if (!q || k.indexOf(q) >= 0 || (d.co || "").toUpperCase().indexOf(q) >= 0) items.push({ sym: k }); });
    act = 0;
    if (!items.length) { list.innerHTML = '<div class="cmdk-empty">Type a ticker to add it</div>'; return; }
    list.innerHTML = items.map(function (it, i) {
      var a = i === 0 ? " act" : "";
      if (it.add) return '<div class="cmdk-row add' + a + '" data-add="' + it.add + '" data-i="' + i + '"><span class="plus">+</span><span><span class="sy">Add ' + it.add + '</span> <span class="cn">fetch quote from Yahoo / NSE</span></span><span class="addhint">new</span></div>';
      var d = D.S[it.sym];
      return '<div class="cmdk-row' + a + '" data-sym="' + esc(it.sym) + '" data-i="' + i + '"><span class="dot" style="background:' + (D.DOT[d.status] || "#858481") + '"></span><span><span class="sy">' + esc(d.s) + '</span> <span class="cn">' + esc(d.co || "") + '</span></span><span class="px">' + d.last + '</span><span class="chg ' + (d.up ? "pos" : "neg") + '">' + d.chg + "</span></div>";
    }).join("");
  }
  function moveK(delta) {
    if (!items.length) return;
    act = (act + delta + items.length) % items.length;
    list.querySelectorAll(".cmdk-row").forEach(function (r, i) { r.classList.toggle("act", i === act); });
    var el = list.children[act]; if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }
  function chooseItem(it) {
    if (!it) return;
    var k = it.add ? D.addSymbol(it.add) : it.sym;
    if (!k) return;
    D.setSymbol(k); closeK(); setView("deck");
  }
  input.addEventListener("input", function () { renderK(input.value); });
  list.addEventListener("click", function (e) {
    var r = e.target.closest("[data-add],[data-sym]"); if (!r) return;
    chooseItem(r.hasAttribute("data-add") ? { add: r.getAttribute("data-add") } : { sym: r.getAttribute("data-sym") });
  });
  byId("cmdkBack").addEventListener("click", function (e) { if (e.target === this) closeK(); });
  document.querySelector(".cmd").addEventListener("click", openK);
  document.querySelectorAll("[data-add-open]").forEach(function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); openK(); }); });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); back.classList.contains("on") ? closeK() : openK(); return; }
    if (!back.classList.contains("on")) return;
    if (e.key === "Escape") { e.preventDefault(); closeK(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); moveK(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveK(-1); }
    else if (e.key === "Enter") { e.preventDefault(); chooseItem(items[act]); }
  });

  /* ---------------- SETTINGS ---------------- */
  function saveSettings() {
    document.querySelectorAll("#view-settings [data-set]").forEach(function (el) {
      SET[el.getAttribute("data-set")] = (el.type === "checkbox") ? el.checked : el.value;
    });
    setPref("vvw-settings", SET);
  }
  function loadSettingsControls() {
    document.querySelectorAll("#view-settings [data-set]").forEach(function (el) {
      var k = el.getAttribute("data-set"); if (!(k in SET)) return;
      if (el.type === "checkbox") el.checked = SET[k]; else el.value = SET[k];
    });
    syncOutputs();
  }
  function syncOutputs() {
    var r = document.querySelector('[data-set="rate"]'), ro = byId("rateOut"); if (r && ro) ro.textContent = parseFloat(r.value).toFixed(1) + "×";
    var v = document.querySelector('[data-set="vol"]'), vo = byId("volOut"); if (v && vo) vo.textContent = Math.round(v.value * 100) + "%";
  }
  var sv = byId("view-settings");
  sv.addEventListener("input", function () { syncOutputs(); saveSettings(); });
  sv.addEventListener("change", function (e) {
    saveSettings();
    var t = e.target;
    if (t && t.getAttribute && t.getAttribute("data-set") === "squawk") { if (t.checked) startSquawk(); else stopSquawk(); }
    if (t && t.getAttribute && t.getAttribute("data-set") === "tvEmbed" && deckOn()) renderCenter(D.getSymbol(), false);
  });

  // theme picks
  function syncThemePicks() {
    var t = window.VV ? window.VV.get() : "light";
    document.querySelectorAll("[data-theme-set]").forEach(function (b) { b.classList.toggle("sel", b.getAttribute("data-theme-set") === t); });
  }
  document.querySelectorAll("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { if (window.VV) window.VV.set(b.getAttribute("data-theme-set")); syncThemePicks(); if (deckOn()) renderCenter(D.getSymbol(), false); });
  });
  document.querySelectorAll("[data-defview]").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-defview"); setPref("vvw-view-default", v);
      document.querySelectorAll("[data-defview]").forEach(function (x) { x.classList.toggle("sel", x === b); });
      setView(v);
    });
  });
  function applyDensity(d) { document.querySelector(".shell").setAttribute("data-density", d); document.querySelectorAll("[data-dens]").forEach(function (b) { b.classList.toggle("sel", b.getAttribute("data-dens") === d); }); }
  document.querySelectorAll("[data-dens]").forEach(function (b) {
    b.addEventListener("click", function () { var d = b.getAttribute("data-dens"); setPref("vvw-density", d); applyDensity(d); });
  });

  // sync now
  var syncBtn = byId("syncNow");
  if (syncBtn) syncBtn.addEventListener("click", function () {
    var st = byId("syncStatus"); st.textContent = "Syncing from vigyaanvest.com/publicdata…";
    if (!HAS_CHROME) { st.textContent = "Preview mode — sync runs inside the extension."; return; }
    chrome.runtime.sendMessage({ type: "SYNC_CALENDAR", force: true }, function (r) {
      void chrome.runtime.lastError;
      if (r && r.cache) { st.textContent = "Synced · " + r.cache.version + " · " + (r.cache.events ? r.cache.events.length : 0) + " events"; updateSyncMeta(r.cache); }
      else st.textContent = (r && r.error) ? r.error : "Sync failed — data source unavailable.";
    });
  });
  function updateSyncMeta(cache) {
    if (!cache) return;
    var el = byId("cvSynced"); if (el) el.innerHTML = '<span class="dot"></span>synced · ' + cache.version;
  }

  // export / import
  byId("exportBtn") && byId("exportBtn").addEventListener("click", function () {
    if (!HAS_CHROME) return;
    chrome.storage.local.get(["vvw-watchlist", "vvw-edits", "vvw-settings", "vvw-quotes"], function (d) {
      var payload = { app: "VigyaanVest Trader Workspace", version: "1.0.0", exportedAt: new Date().toISOString(),
        watchlist: d["vvw-watchlist"] || [], edits: d["vvw-edits"] || {}, settings: d["vvw-settings"] || {} };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "vigyaanvest-workspace-backup.json"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  });
  byId("importBtn") && byId("importBtn").addEventListener("click", function () { byId("importFile").click(); });
  byId("importFile") && byId("importFile").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0]; if (!file || !HAS_CHROME) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var p = JSON.parse(reader.result);
        chrome.storage.local.get(["vvw-watchlist", "vvw-edits"], function (d) {
          var wl = d["vvw-watchlist"] || [], have = new Set(wl.map(function (w) { return w.symbol; }));
          (p.watchlist || []).forEach(function (w) { if (!have.has(w.symbol)) { wl.push(w); have.add(w.symbol); } });
          var edits = Object.assign({}, d["vvw-edits"] || {}, p.edits || {});
          var save = { "vvw-watchlist": wl, "vvw-edits": edits };
          if (p.settings) save["vvw-settings"] = Object.assign({}, p.settings);
          chrome.storage.local.set(save, function () { byId("syncStatus").textContent = "Imported · reloading…"; setTimeout(function () { location.reload(); }, 600); });
        });
      } catch (err) { byId("syncStatus").textContent = "Import failed — invalid file."; }
    };
    reader.readAsText(file);
  });

  /* ---------------- Squawk / TTS ---------------- */
  // Read-memory: remember which headlines have been spoken so ▶ doesn't repeat them.
  var READ = [];
  function readKey(s) { return String(s || "").trim().toLowerCase().slice(0, 160); }
  function isRead(s) { return READ.indexOf(readKey(s)) >= 0; }
  function markRead(list) {
    list.forEach(function (s) { var k = readKey(s); if (READ.indexOf(k) < 0) READ.push(k); });
    if (READ.length > 400) READ = READ.slice(READ.length - 400);
    setPref("vvw-read", READ);
  }
  function startSquawk() {
    SET.squawk = true; var sw = document.querySelector('[data-set="squawk"]'); if (sw) sw.checked = true;
    byId("squawkBar").classList.add("on");
    var n = Number(SET.topN) || 5;
    var all = D.topHeadlines(n);
    var remember = SET.memory !== false;
    var texts = remember ? all.filter(function (t) { return !isRead(t); }) : all;
    if (!all.length) { byId("squawkInfo").innerHTML = "<b>Squawk on</b> · no headlines yet — open a news site"; return; }
    if (remember && !texts.length) { byId("squawkInfo").innerHTML = "<b>Squawk on</b> · all caught up — no new headlines (turn off “Remember” to repeat)"; return; }
    byId("squawkInfo").innerHTML = "<b>Squawk on</b> · reading " + texts.length + " headline" + (texts.length > 1 ? "s" : "") + " aloud";
    if (remember) markRead(texts);
    if (!HAS_CHROME) return;
    chrome.runtime.sendMessage({ type: "SPEAK", texts: texts, settings: SET, force: true }, function () { void chrome.runtime.lastError; });
  }
  function stopSquawk() {
    SET.squawk = false; var sw = document.querySelector('[data-set="squawk"]'); if (sw) sw.checked = false;
    byId("squawkBar").classList.remove("on");
    byId("squawkInfo").innerHTML = "<b>Squawk off</b> · tap ▶ to read the tape aloud";
    if (HAS_CHROME) chrome.runtime.sendMessage({ type: "STOP_SPEAK" }, function () { void chrome.runtime.lastError; });
  }
  byId("squawkPlay").addEventListener("click", function () { if (SET.squawk) stopSquawk(); else startSquawk(); });
  (function () {
    var sf = byId("squawkForget");
    if (sf) sf.addEventListener("click", function () {
      READ = []; setPref("vvw-read", []);
      var o = sf.textContent; sf.textContent = "Read history cleared ✓"; setTimeout(function () { sf.textContent = o; }, 1500);
    });
  })();
  function loadVoices() {
    if (!HAS_CHROME) return;
    chrome.runtime.sendMessage({ type: "GET_VOICES" }, function (r) {
      void chrome.runtime.lastError;
      if (!r || !r.voices || !r.voices.length) return;
      var sel = document.querySelector('[data-set="voice"]'); if (!sel) return;
      var cur = SET.voice || "";
      sel.innerHTML = '<option value="">System default</option>' + r.voices.map(function (v) { return '<option value="' + v.voiceName + '"' + (v.voiceName === cur ? " selected" : "") + ">" + v.voiceName + (v.lang ? " · " + v.lang : "") + "</option>"; }).join("");
    });
  }

  /* ---------------- CALENDAR OVERLAY ---------------- */
  var calMode = "month";
  var DWk = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONFULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var calRef = new Date(); calRef.setHours(0, 0, 0, 0);
  function cpad(n) { return (n < 10 ? "0" : "") + n; }
  function cymd(d) { return d.getFullYear() + "-" + cpad(d.getMonth() + 1) + "-" + cpad(d.getDate()); }
  function evDate(e) { return e.type === "earnings" ? e.releaseDate : (e.datetimeUTC || "").slice(0, 10); }
  var CAL_LEGEND = '<div class="cv-legend"><span><span class="star">★</span> Watchlist earnings (click to open)</span><span><i style="background:var(--us);"></i> US Fed / macro</span><span><i style="background:var(--in);"></i> India RBI / macro</span></div>';

  function renderCal() {
    document.querySelectorAll("#cvSeg button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-cv") === calMode); });
    byId("cvRange").textContent = calMode === "month" ? (MONFULL[calRef.getMonth()] + " " + calRef.getFullYear()) : weekRangeLabel();
    byId("cvBody").innerHTML = calMode === "month" ? monthHTML() : weekHTML();
  }
  function eventsByDay(year, month) {
    var map = {};
    D.events().forEach(function (e) {
      var ds = evDate(e); if (!ds) return;
      var dt = new Date(ds + "T00:00:00");
      if (isNaN(dt) || dt.getMonth() !== month || dt.getFullYear() !== year) return;
      var dom = dt.getDate(); (map[dom] = map[dom] || []);
      if (e.type === "macro") map[dom].push({ c: e.region === "IN" ? "in" : "us", t: e.title.replace(/\(.*?\)/, "").trim() });
      else map[dom].push({ c: "earn", t: e.ticker, sym: D.S[e.ticker] ? e.ticker : null });
    });
    return map;
  }
  function monthHTML() {
    var year = calRef.getFullYear(), month = calRef.getMonth();
    var first = new Date(year, month, 1); var lead = (first.getDay() + 6) % 7; // Mon-start
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevDays = new Date(year, month, 0).getDate();
    var cells = [];
    for (var i = lead - 1; i >= 0; i--) cells.push({ n: prevDays - i, out: true });
    for (var d = 1; d <= daysInMonth; d++) cells.push({ n: d });
    var trail = 1; while (cells.length % 7 !== 0) cells.push({ n: trail++, out: true });
    var evmap = eventsByDay(year, month);
    var now = new Date(); var isCur = now.getMonth() === month && now.getFullYear() === year;
    var rows = "";
    cells.forEach(function (c, idx) {
      if (idx % 7 === 0) rows += (idx ? "</div>" : "") + '<div class="cv-mrow">';
      var evs = (!c.out && evmap[c.n]) ? evmap[c.n].map(function (e) {
        var lbl = e.c === "earn" ? "★ " + esc(e.t) : esc(e.t);
        var attr = (e.c === "earn" && e.sym) ? ' data-cal-sym="' + esc(e.sym) + '"' : "";
        return '<span class="ev ' + e.c + '"' + attr + ">" + lbl + "</span>";
      }).join("") : "";
      rows += '<div class="cv-cell' + (c.out ? " out" : "") + (!c.out && isCur && c.n === now.getDate() ? " today" : "") + '"><span class="dn">' + c.n + "</span>" + evs + "</div>";
    });
    rows += "</div>";
    return '<div class="cv-month"><div class="cv-mhead"><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div></div>' + rows + "</div>" + CAL_LEGEND;
  }
  function tkHTML(e) {
    var nse = e.nse ? '<span class="vv-pill in" style="font-size:8.5px;padding:1px 6px;"><span class="dot"></span>NSE</span>' : "";
    var star = e.w ? '<span class="star">★</span>' : "";
    var eps = e.eps ? '<span class="eps">' + esc(e.eps) + "</span>" : "";
    var attr = D.S[e.s] ? ' data-cal-sym="' + esc(e.s) + '"' : "";
    return '<div class="cv-tk' + (e.w ? " watch" : "") + '"' + attr + ">" + star + nse + '<span class="ts">' + esc(e.s) + "</span>" + eps + "</div>";
  }
  function weekData(ref) {
    var monday = new Date(ref); var shift = (monday.getDay() + 6) % 7; monday.setDate(monday.getDate() - shift);
    var todayStr = cymd(new Date()); var days = [];
    for (var i = 0; i < 5; i++) {
      var wd = new Date(monday); wd.setDate(monday.getDate() + i); var wds = cymd(wd);
      var macros = [], bmo = [], amc = [];
      D.events().forEach(function (e) {
        if (evDate(e) !== wds) return;
        if (e.type === "macro") macros.push({ t: e.title, r: e.region === "IN" ? "IN" : "US", imp: e.impact === "high" ? "High" : e.impact === "med" ? "Med" : "Low", tm: e.forecast ? "est " + e.forecast : "" });
        else { var tk = { s: e.ticker, w: !!D.S[e.ticker], nse: e.market === "NSE", eps: e.epsForecast != null ? String(e.epsForecast) : "" }; if (e.reportWindow === "bmo") bmo.push(tk); else amc.push(tk); }
      });
      days.push({ dw: DWk[wd.getDay()], dn: wd.getDate(), today: wds === todayStr, macros: macros, bmo: bmo, amc: amc });
    }
    return days;
  }
  function weekRangeLabel() { var w = weekData(calRef); return MONFULL[calRef.getMonth()].slice(0, 3) + " " + w[0].dn + " – " + w[w.length - 1].dn; }
  function weekHTML() {
    var cols = weekData(calRef).map(function (d) {
      var macros = d.macros.map(function (m) {
        var cls = "cv-macro" + (m.r === "IN" ? " india" : "");
        var rp = '<span class="vv-pill ' + (m.r === "US" ? "us" : "in") + '" style="font-size:8.5px;padding:1px 6px;"><span class="dot"></span>' + (m.r === "US" ? "US" : "India") + "</span>";
        var ip = '<span class="vv-pill ' + (m.imp === "High" ? "high" : "med") + '" style="font-size:8.5px;padding:1px 6px;"><span class="dot"></span>' + m.imp + "</span>";
        return '<div class="' + cls + '"><div class="mt">' + esc(m.t) + rp + ip + '</div><div class="mm">' + esc(m.tm) + "</div></div>";
      }).join("");
      var bmo = d.bmo.length ? '<div class="cv-grp"><div class="cv-gl">Before open</div>' + d.bmo.map(tkHTML).join("") + "</div>" : "";
      var amc = d.amc.length ? '<div class="cv-grp"><div class="cv-gl">After close</div>' + d.amc.map(tkHTML).join("") + "</div>" : "";
      var none = (!d.macros.length && !d.bmo.length && !d.amc.length) ? '<div style="font-size:10.5px;color:var(--text-3);padding:8px 2px;">—</div>' : "";
      return '<div class="cv-col"><div class="cv-wh' + (d.today ? " today" : "") + '"><span class="wd">' + d.dw + '</span><span class="wn">' + d.dn + "</span></div>" + macros + bmo + amc + none + "</div>";
    }).join("");
    return '<div class="cv-week">' + cols + "</div>" + CAL_LEGEND;
  }
  function openCal() { calRef = new Date(); calRef.setHours(0, 0, 0, 0); renderCal(); byId("calOverlay").classList.add("on"); }
  function closeCal() { byId("calOverlay").classList.remove("on"); }
  byId("calExpand").addEventListener("click", function (e) { e.stopPropagation(); openCal(); });
  document.querySelector(".ribbon").addEventListener("click", openCal);
  byId("calClose").addEventListener("click", closeCal);
  byId("cvSeg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { calMode = b.getAttribute("data-cv"); renderCal(); } });
  byId("cvNav").addEventListener("click", function (e) {
    var b = e.target.closest("[data-cv-nav]"); if (!b) return;
    var nav = b.getAttribute("data-cv-nav");
    if (nav === "today") { calRef = new Date(); calRef.setHours(0, 0, 0, 0); }
    else { var dir = nav === "prev" ? -1 : 1; if (calMode === "month") calRef.setMonth(calRef.getMonth() + dir); else calRef.setDate(calRef.getDate() + dir * 7); }
    renderCal();
  });
  byId("cvBody").addEventListener("click", function (e) {
    var el = e.target.closest("[data-cal-sym]"); if (!el) return;
    D.setSymbol(el.getAttribute("data-cal-sym")); closeCal(); setView("deck");
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && byId("calOverlay").classList.contains("on")) closeCal(); });

  /* ---------------- DOCK (real side panel, with overlay fallback) ---------------- */
  function dm(l, v, cls) { var dash = (v === "—" || v == null) ? " dash" : ""; return '<div class="dm"><div class="l">' + l + '</div><div class="v ' + (cls || "") + dash + '">' + (v == null ? "—" : v) + "</div></div>"; }
  function dockPageHTML(d) {
    var logo = d.mkt === "US" ? "finviz" : "screener.in";
    return '<div class="dp-bar"><span class="dp-logo">' + logo + '</span><span class="dp-sym">' + esc(d.s) + " · " + esc(d.co || "") + '</span><span class="dp-px ' + (d.up ? "pos" : "neg") + '">' + d.last + " " + d.chg + "</span></div>" +
      '<div class="dp-body"><div class="dp-chart"></div>' +
        '<div class="dp-grid"><div class="dp-tile"></div><div class="dp-tile"></div><div class="dp-tile"></div><div class="dp-tile"></div></div>' +
        '<div class="dp-rows"><div class="dp-row l"></div><div class="dp-row m"></div><div class="dp-row l"></div><div class="dp-row s"></div><div class="dp-row m"></div></div></div>';
  }
  function dockPanelHTML(d) {
    var mp = d.mkt === "US" ? "us" : "in";
    var cp = D.chartPaths(d.series, 320, 96, 8);
    var stroke = d.up ? "var(--pos)" : "var(--neg)";
    return '<div class="dock-bar">' +
        '<div class="dock-brand"><span class="v">V</span> Symbol 360 <span class="mode">docked</span></div>' +
        '<button class="ibtn" id="dockExpand" title="Expand to full terminal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>' +
        '<button class="ibtn" id="dockClose" title="Close dock">✕</button></div>' +
      '<div class="dock-extract"><span class="d"></span>Reading <b>' + esc(d.s) + "</b> from <b>" + host(d) + "</b> · local-first, nothing sent</div>" +
      '<div class="dock-body vv-scroll">' +
        '<div class="dock-head"><div><div class="tk">' + esc(d.s) + '</div><div class="co">' + esc(d.co || "") + "</div></div>" +
          '<div class="px"><div class="v">' + d.last + '</div><div class="c ' + (d.up ? "pos" : "neg") + '">' + d.chg + "</div></div></div>" +
        '<div class="dock-pills"><span class="vv-pill ' + mp + '"><span class="dot"></span>' + d.mkt + " · " + d.cur + '</span><span class="vv-pill"><span class="dot"></span>' + esc(d.status) + '</span><span class="vv-pill"><span class="dot"></span>' + esc(d.setup) + "</span></div>" +
        '<div class="srcline" style="margin:14px 0 8px;"><span>From the open page</span><span class="prov page">live page</span></div>' +
        '<div class="dmetrics">' + dm("Price", d.price, d.up ? "pos" : "neg") + dm("Today", d.today, d.up ? "pos" : "neg") + dm("Mkt Cap", d.mktcap) + dm("P/E", d.pe) + dm("ROE", d.roe, d.roe === "—" ? "" : "pos") + dm("Debt/Eq", d.de) + "</div>" +
        '<div class="dock-note">Dashes are fields this page doesn’t expose — open Yahoo / NSE for the rest.</div>' +
        '<div class="dock-sec"><div class="dock-t">Chart · daily <span class="prov page" style="float:right;">live page</span></div><div class="dchart"><svg viewBox="0 0 320 96" width="100%" height="86" preserveAspectRatio="none"><defs><linearGradient id="dk' + d.s + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + stroke + '" stop-opacity="0.16"/><stop offset="1" stop-color="' + stroke + '" stop-opacity="0"/></linearGradient></defs><path d="' + cp.area + '" fill="url(#dk' + d.s + ')"/><path d="' + cp.line + '" fill="none" stroke="' + stroke + '" stroke-width="1.6"/></svg></div></div>' +
        '<div class="dock-sec"><div class="dock-t">Thesis · your notes</div><div class="kv"><div class="r"><span class="k bull">Bull</span><span class="val">' + esc(d.bull) + '</span></div><div class="r"><span class="k bear">Bear</span><span class="val">' + esc(d.bear) + "</span></div></div></div>" +
        '<button class="vv-btn primary" id="dockToTerminal" style="width:100%;margin-top:14px;">Expand to full terminal →</button>' +
      "</div>";
  }
  function openDockOverlay() {
    var d = D.S[D.getSymbol()];
    byId("dockPage").innerHTML = dockPageHTML(d);
    byId("dockPanel").innerHTML = dockPanelHTML(d);
    byId("dockOverlay").classList.add("on");
    byId("dockBtn").classList.add("on");
  }
  function closeDockOverlay() { byId("dockOverlay").classList.remove("on"); byId("dockBtn").classList.remove("on"); }
  byId("dockBtn").addEventListener("click", function () {
    // The in-app preview overlay (faithful to the design, shows the focused symbol).
    // The live Chrome side panel — reading whatever stock page you're on — opens from
    // Chrome's own side-panel control; openSidePanel() below tries it opportunistically.
    if (byId("dockOverlay").classList.contains("on")) { closeDockOverlay(); return; }
    if (HAS_CHROME && chrome.sidePanel && chrome.sidePanel.open && winId != null) {
      try {
        var p = chrome.sidePanel.open({ windowId: winId });
        if (p && p.then) p.catch(function () { openDockOverlay(); });
        else openDockOverlay();
        return;
      } catch (e) { /* gesture/availability issue → overlay */ }
    }
    openDockOverlay();
  });
  byId("dockPanel").addEventListener("click", function (e) {
    if (e.target.closest("#dockClose")) closeDockOverlay();
    else if (e.target.closest("#dockExpand") || e.target.closest("#dockToTerminal")) { closeDockOverlay(); setView("deck"); }
  });

  /* ---------------- clocks ---------------- */
  function startClocks() {
    function fmt(tz) { try { return new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }); } catch (e) { return "—"; } }
    function tick() { byId("clkNY").textContent = fmt("America/New_York"); byId("clkIST").textContent = fmt("Asia/Kolkata"); }
    tick(); setInterval(tick, 15000);
  }

  /* ---------------- live data updates from worker ---------------- */
  function onDataUpdate() {
    renderStream();
    renderRibbon();
    if (byId("view-grid").classList.contains("on")) renderGrid();
    if (deckOn()) renderRail(D.getSymbol());
    if (byId("calOverlay").classList.contains("on")) renderCal();
  }

  /* ---------------- boot ---------------- */
  D.ready.then(function () {
    return getPrefs();
  }).then(function (prefs) {
    SET = (prefs && prefs["vvw-settings"]) || {};
    READ = (prefs && prefs["vvw-read"]) || [];
    var density = (prefs && prefs["vvw-density"]) || "comfortable";
    var defv = (prefs && prefs["vvw-view-default"]) || "deck";
    var startView = (prefs && prefs["vvw-view"]) || defv;

    syncThemePicks();
    applyDensity(density);
    document.querySelectorAll("[data-defview]").forEach(function (x) { x.classList.toggle("sel", x.getAttribute("data-defview") === defv); });
    loadSettingsControls();
    loadVoices();
    startClocks();
    renderTapeSources();
    renderStream();
    renderRibbon();
    if (SET.squawk) startSquawk(); else stopSquawk();
    D.subscribe(onDataUpdate);
    setView(startView);
  });
})();
