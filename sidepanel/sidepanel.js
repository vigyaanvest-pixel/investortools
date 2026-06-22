/* Dock side panel — Symbol 360 reading the active tab's page (live page extraction). */
(function () {
  var HAS_CHROME = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
  var body = document.getElementById("body");
  var extract = document.getElementById("extract");
  var extractTxt = document.getElementById("extractTxt");
  var lastSig = "";

  // HTML-escape page-extracted / external strings before innerHTML injection (XSS guard)
  var ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; }); }

  function pill(cls, txt) { return '<span class="vv-pill ' + (cls || "") + '"><span class="dot"></span>' + esc(txt) + "</span>"; }
  function metric(l, v, cls) {
    var dash = (v == null || v === "—" || v === "") ? " dash" : "";
    return '<div class="vv-metric"><div class="lbl">' + esc(l) + '</div><div class="val ' + (cls || "") + dash + '">' + (v == null || v === "" ? "—" : esc(v)) + "</div></div>";
  }
  function hostFor(ctx) {
    if (ctx.site === "yahoo") return "finance.yahoo.com";
    if (ctx.site === "screener") return "screener.in";
    if (ctx.site === "nse") return "nseindia.com";
    if (ctx.site === "sec") return "sec.gov";
    return ctx.site || "page";
  }

  function renderEmpty() {
    extract.hidden = true;
    body.innerHTML =
      '<div class="empty"><h3>No stock page detected</h3>' +
      "<p>Open a company page and Symbol 360 reads its metrics here — local-first, nothing leaves your browser.</p>" +
      '<div class="sites">Yahoo Finance · Screener.in · NSE India · SEC EDGAR</div>' +
      '<button class="vv-btn primary" id="openWs" style="margin-top:18px;">Open full Trader Workspace →</button></div>';
    wireOpen();
  }

  function render(data) {
    var ctx = data.ctx || {};
    var m = data.metrics || {};
    if (!ctx.symbol || ctx.site === "none") { renderEmpty(); return; }
    var mkt = ctx.market || "US";
    var up = (m.changePercent || "").indexOf("-") === -1 && (m.changePercent || "").indexOf("−") === -1;
    var changeCls = m.changePercent ? (up ? "pos" : "neg") : "";
    extract.hidden = false;
    extractTxt.innerHTML = "Reading <b>" + esc(ctx.symbol) + "</b> from <b>" + esc(hostFor(ctx)) + "</b> · live page";

    body.innerHTML =
      '<div class="dhead"><div><div class="tk">' + esc(ctx.symbol) + '</div><div class="co">' + esc(data.companyName || ctx.companyName || "") + "</div></div>" +
        '<div class="px"><div class="v">' + esc(m.price || "—") + '</div><div class="c ' + changeCls + '">' + esc(m.changePercent || "—") + "</div></div></div>" +
      '<div class="dpills">' + pill(mkt === "US" ? "us" : "in", mkt) + pill("", m.source || "live page") + "</div>" +
      '<div class="srcline"><span>From the open page</span><span class="prov page">live page</span></div>' +
      '<div class="vv-metric-grid">' +
        metric("Price", m.price, changeCls) + metric("Change", m.changePercent, changeCls) +
        metric("Mkt Cap", m.marketCap) + metric("P/E", m.pe) +
        metric("ROE", m.roe) + metric("ROCE", m.roce) +
        metric("Debt/Eq", m.debtEquity) + metric("52-wk", m.week52Range) +
      "</div>" +
      (m.earningsDate ? '<div class="vv-metric" style="margin-top:8px;"><div class="lbl">Next earnings</div><div class="val">' + esc(m.earningsDate) + "</div></div>" : "") +
      '<div class="note">Dashes are fields this page doesn’t expose — open the full workspace for Yahoo / NSE / Finviz fundamentals and your thesis notes.</div>' +
      '<button class="vv-btn primary" id="openWs" style="width:100%;margin-top:16px;">Open ' + esc(ctx.symbol) + " in full terminal →</button>";
    body.setAttribute("data-symbol", ctx.symbol);
    wireOpen(ctx.symbol);
  }

  function wireOpen(symbol) {
    var btn = document.getElementById("openWs");
    if (btn) btn.addEventListener("click", function () {
      if (HAS_CHROME) chrome.runtime.sendMessage({ type: "OPEN_WORKSPACE", symbol: symbol || null }, function () { void chrome.runtime.lastError; });
    });
  }

  function refresh() {
    if (!HAS_CHROME) { renderEmpty(); return; }
    chrome.runtime.sendMessage({ type: "GET_PAGE_CONTEXT" }, function (data) {
      void chrome.runtime.lastError;
      if (!data) { renderEmpty(); return; }
      var sig = JSON.stringify([data.ctx && data.ctx.symbol, data.metrics]);
      if (sig === lastSig) return;
      lastSig = sig;
      render(data);
    });
  }

  refresh();
  setInterval(refresh, 1800);
  if (HAS_CHROME) {
    chrome.tabs.onActivated.addListener(refresh);
    chrome.storage.onChanged.addListener(function (c, area) { if (area === "session") refresh(); });
  }
})();
