/* Theme persistence shared by the workspace + side panel.
   Uses chrome.storage.local when available (syncs across surfaces) and falls back to
   localStorage in a plain preview. Mirrors the design's vv-shared.js window.VV API. */
(function () {
  var HAS_CHROME = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
  var KEY = "vvw-theme";
  var cached = "light";

  function applyDom(t) {
    if (t === "midnight") document.documentElement.setAttribute("data-theme", "midnight");
    else document.documentElement.removeAttribute("data-theme");
    document.querySelectorAll("[data-vv-themetoggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", t === "midnight" ? "true" : "false");
    });
  }
  function persist(t) {
    if (HAS_CHROME) { try { chrome.storage.local.set({ "vvw-theme": t }); } catch (e) {} }
    else { try { localStorage.setItem(KEY, t); } catch (e) {} }
  }

  window.VV = {
    get: function () { return cached; },
    set: function (t) { cached = t; applyDom(t); persist(t); },
    toggle: function () { window.VV.set(cached === "midnight" ? "light" : "midnight"); },
  };

  // initial load (async in chrome, sync in fallback)
  if (HAS_CHROME) {
    try {
      chrome.storage.local.get("vvw-theme", function (d) {
        cached = d && d["vvw-theme"] ? d["vvw-theme"] : "light";
        applyDom(cached);
      });
      chrome.storage.onChanged.addListener(function (c, area) {
        if (area === "local" && c["vvw-theme"]) { cached = c["vvw-theme"].newValue || "light"; applyDom(cached); }
      });
    } catch (e) { applyDom(cached); }
  } else {
    try { cached = localStorage.getItem(KEY) || "light"; } catch (e) {}
    applyDom(cached);
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyDom(cached);
    document.querySelectorAll("[data-vv-themetoggle]").forEach(function (b) {
      b.addEventListener("click", function () { window.VV.toggle(); });
    });
  });
})();
