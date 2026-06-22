/* The Tape (Squawk) — scrapes headlines from the open news site and streams them to
   the worker's tape buffer. Reuses the source profiles from sources.js.
   Condensed from market-squawk's content.js. */
(function () {
  "use strict";
  const Sources = globalThis.MarketSquawkSources;
  if (!Sources) return;
  const profile = Sources.detectSourceForUrl(window.location.href);
  if (!profile) return;

  const seen = new Set();
  const providerRe = profile.providerPattern ? new RegExp(profile.providerPattern, "i") : null;
  const blockedRes = (profile.blockedHeadlinePatterns || []).map((p) => new RegExp(p, "i"));
  const noise = new Set((profile.noise || []).map((s) => s.toLowerCase()));

  function normalize(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }
  function clean(raw) {
    let t = normalize(raw);
    if (providerRe) t = t.replace(providerRe, "");
    t = t.replace(/\b\d{1,2}:\d{2}\s*(AM|PM)?\b/gi, "").replace(/\b\d+\s*(sec|min|hour|h|m)s?\s*ago\b/gi, "");
    return normalize(t);
  }
  function titleFor(node) {
    for (const sel of profile.titleSelectors || []) {
      const el = node.querySelector ? node.querySelector(sel) : null;
      if (el && (el.innerText || el.textContent)) return el.innerText || el.textContent;
    }
    return node.innerText || node.textContent || "";
  }
  function acceptable(t) {
    if (!t || t.length < 18 || t.length > 280) return false;
    if (noise.has(t.toLowerCase())) return false;
    for (const re of blockedRes) if (re.test(t)) return false;
    return true;
  }

  function scrape() {
    const nodes = [];
    for (const sel of profile.selectors || []) {
      try { document.querySelectorAll(sel).forEach((n) => nodes.push(n)); } catch { /* bad selector */ }
      if (nodes.length) break;
    }
    const fresh = [];
    const ts = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    for (const node of nodes.slice(0, 40)) {
      const hl = clean(titleFor(node));
      if (!acceptable(hl) || seen.has(hl)) continue;
      seen.add(hl);
      // surface any cashtag-style tickers for the Grid/Deck cross-reference
      const tags = [...hl.matchAll(/\b([A-Z]{2,5})\b/g)].map((m) => m[1]).filter((x) => /^(NVDA|AAPL|MSFT|AMZN|GOOGL|META|TSLA|AMD|MU|NFLX|INFY|TCS|RELIANCE|HDFCBANK)$/.test(x));
      fresh.push({ src: profile.name, ts, hl, tags: [...new Set(tags)].slice(0, 3), cls: "" });
    }
    if (fresh.length) {
      try { chrome.runtime.sendMessage({ type: "TAPE_PUSH", items: fresh.slice(0, 12) }); } catch { /* worker asleep */ }
    }
  }

  scrape();
  const obs = new MutationObserver(() => {
    clearTimeout(obs._t);
    obs._t = setTimeout(scrape, 1500);
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
})();
