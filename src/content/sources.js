(function initMarketSquawkSources(globalScope) {
  const BASE_PROVIDER_PATTERN = "\\b(RTTNews|Reuters|Dow Jones Newswires|MT Newswires|Benzinga|TheFly|TipRanks|MarketWatch|Investing\\.com|CNBC)\\b\\s*[-:]?\\s*";

  const SOURCE_PROFILES = [
    {
      id: "tradingview",
      name: "TradingView News Flow",
      hostnames: ["www.tradingview.com", "tradingview.com"],
      pathPrefixes: ["/news-flow/"],
      matchPatterns: ["https://www.tradingview.com/news-flow/*"],
      startUrl: "https://www.tradingview.com/news-flow/",
      selectors: [
        "a[data-id][data-index][href*='/news/']",
        "[data-qa-id='news-headline-card']",
        "a[href*='news.tradingview.com']",
        "[class*='card' i][data-id]",
        "[class*='article' i]",
        "tr",
        "[role='row']",
        "[data-rowkey]"
      ],
      titleSelectors: ["[class*='title' i]", "[data-qa-id*='headline' i]"],
      noise: ["custom feed", "news flow", "provider", "format"],
      providerPattern: BASE_PROVIDER_PATTERN
    },
    {
      id: "finviz",
      name: "Finviz",
      hostnames: ["finviz.com", "www.finviz.com"],
      pathPrefixes: ["/news"],
      matchPatterns: ["https://finviz.com/news*", "https://www.finviz.com/news*"],
      startUrl: "https://finviz.com/news",
      selectors: [
        ".news_table-row"
      ],
      titleSelectors: [".news_link-cell a.nn-tab-link", "a.nn-tab-link"],
      skipSelectors: ["use[href*='icons_blogs.svg']"],
      noise: ["ticker", "date", "source", "charts", "screener", "news", "blogs"],
      blockedHeadlinePatterns: [
        "\\bFinviz Elite\\b",
        "\\bpremium features\\b",
        "\\bReal-time quotes\\b",
        "\\badvanced visualizations\\b",
        "\\bbacktesting\\b",
        "\\bJoin thousands of traders\\b"
      ],
      providerPattern: BASE_PROVIDER_PATTERN
    },
    {
      id: "marketwatch",
      name: "MarketWatch",
      hostnames: ["www.marketwatch.com", "marketwatch.com"],
      pathPrefixes: ["/latest-news"],
      matchPatterns: ["https://www.marketwatch.com/latest-news*", "https://marketwatch.com/latest-news*"],
      startUrl: "https://www.marketwatch.com/latest-news?mod=home_ln",
      selectors: ["article", ".article__content", ".collection__elements a", "a[href*='/story/']"],
      titleSelectors: ["h1", "h2", "h3", ".article__headline", "a[href*='/story/']"],
      noise: ["latest news", "markets", "watchlist"],
      providerPattern: BASE_PROVIDER_PATTERN
    },
    {
      id: "zerodha-pulse",
      name: "Zerodha Pulse",
      hostnames: ["pulse.zerodha.com"],
      pathPrefixes: ["/"],
      matchPatterns: ["https://pulse.zerodha.com/*"],
      startUrl: "https://pulse.zerodha.com/",
      selectors: ["li.box.item", "li:has(a.title2)"],
      titleSelectors: ["h2.title a", "h2.title", "a.title2"],
      noise: ["trending", "news", "latest business", "google playstore", "apple store", "chrome addon store"],
      providerPattern: "\\b(NDTV Business|Economic Times|Moneycontrol|Business Standard|CNBC-TV18|Reuters|Mint|The Hindu BusinessLine|Financial Express)\\b\\s*[-\\u2014:]?\\s*",
      rowTolerancePx: 24
    }
  ];

  function normalizeHostname(hostname) {
    return String(hostname || "").toLowerCase().replace(/^www\./, "");
  }

  function profileMatchesUrl(profile, urlLike) {
    try {
      const url = new URL(urlLike);
      const host = normalizeHostname(url.hostname);
      return profile.hostnames.some((candidate) => normalizeHostname(candidate) === host) &&
        profile.pathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
    } catch (_error) {
      return false;
    }
  }

  function detectSourceForUrl(urlLike) {
    return SOURCE_PROFILES.find((profile) => profileMatchesUrl(profile, urlLike)) || null;
  }

  function getAllMatchPatterns() {
    return SOURCE_PROFILES.flatMap((profile) => profile.matchPatterns);
  }

  globalScope.MarketSquawkSources = {
    SOURCE_PROFILES,
    detectSourceForUrl,
    getAllMatchPatterns
  };
})(globalThis);
