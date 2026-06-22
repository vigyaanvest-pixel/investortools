/* Built-in sample dataset — used ONLY when the workspace runs outside the extension
   (no chrome.* runtime), so the UI is still demonstrable in a plain browser preview.
   Inside the extension this file is inert; data.js uses live storage instead. */
window.VVSAMPLE = (function () {
  var S = {
    NVDA: { s:"NVDA", co:"NVIDIA Corporation", mkt:"US", cur:"USD", last:"$124.30", chgAbs:"+2.93", chg:"+2.41%", up:true,
      price:"$124.30", today:"+2.41%", mktcap:"$3.05T", range:"39–141", avgvol:"248M", pe:"58.2", fwdpe:"31.4", roe:"115.7%", roce:"91.3%", de:"0.16", div:"0.03%",
      status:"Researching", sc:"b-research", grade:"A+ setup", setup:"Breakout", tape:2, news:true,
      next:"Earnings", cd:"3d", soon:true, earn:"Aug 28 · AMC", review:"Aug 25", overdue:false,
      bull:"AI capex cycle early; CUDA moat + networking attach lifts ASPs.", bear:"Hyperscaler digestion, custom silicon, export controls.",
      trigger:"Break & hold above $128 on volume.", stop:"$108 · −13%", tags:"AI · semiconductor · megacap", series:[40,52,61,58,74,90,86,104,124] },
    MU: { s:"MU", co:"Micron Technology", mkt:"US", cur:"USD", last:"$98.11", chgAbs:"+3.86", chg:"+4.10%", up:true,
      price:"$98.11", today:"+4.10%", mktcap:"$109B", range:"63–157", avgvol:"22M", pe:"21.4", fwdpe:"9.8", roe:"18.2%", roce:"14.1%", de:"0.31", div:"0.47%",
      status:"Ready", sc:"b-ready", grade:"Ready", setup:"Momentum", tape:1, news:true,
      next:"Earnings", cd:"2d", soon:true, earn:"Jun 18 · AMC", review:"Jun 16", overdue:false,
      bull:"Memory pricing recovery; HBM demand into AI buildout.", bear:"Deeply cyclical; capex heavy; pricing can roll over.",
      trigger:"Hold above $92 post-print.", stop:"$84 · −14%", tags:"memory · cyclical · HBM", series:[63,70,66,78,74,88,84,92,98] },
    AAPL: { s:"AAPL", co:"Apple Inc", mkt:"US", cur:"USD", last:"$212.48", chgAbs:"+1.31", chg:"+0.62%", up:true,
      price:"$212.48", today:"+0.62%", mktcap:"$3.21T", range:"164–237", avgvol:"58M", pe:"33.1", fwdpe:"30.2", roe:"147.4%", roce:"58.0%", de:"1.45", div:"0.44%",
      status:"Watching", sc:"b-watch", grade:"Watching", setup:"Pullback", tape:0, news:false,
      next:"Earnings", cd:"9d", soon:false, earn:"Jun 25 · AMC", review:"Jun 24", overdue:false,
      bull:"Services margin mix; vast install base; capital returns.", bear:"China demand soft; AI roadmap lagging peers.",
      trigger:"Reclaim $215 with volume.", stop:"$198 · −7%", tags:"megacap · consumer · services", series:[180,196,190,205,200,208,206,210,212] },
    AMD: { s:"AMD", co:"Advanced Micro Devices", mkt:"US", cur:"USD", last:"$162.04", chgAbs:"−2.00", chg:"−1.22%", up:false,
      price:"$162.04", today:"−1.22%", mktcap:"$262B", range:"94–227", avgvol:"45M", pe:"46.8", fwdpe:"28.1", roe:"7.1%", roce:"5.9%", de:"0.05", div:"—",
      status:"Watching", sc:"b-watch", grade:"Watching", setup:"Range", tape:0, news:false,
      next:"Earnings", cd:"21d", soon:false, earn:"Jul 29 · AMC", review:"Jul 20", overdue:false,
      bull:"MI300 ramp; data-center share gains.", bear:"Trails NVDA in software/ecosystem.",
      trigger:"Break $175 range top.", stop:"$148 · −9%", tags:"AI · semiconductor", series:[180,172,176,168,170,160,164,166,162] },
    TSLA: { s:"TSLA", co:"Tesla Inc", mkt:"US", cur:"USD", last:"$248.90", chgAbs:"−7.30", chg:"−2.85%", up:false,
      price:"$248.90", today:"−2.85%", mktcap:"$795B", range:"138–299", avgvol:"95M", pe:"71.0", fwdpe:"88.4", roe:"20.4%", roce:"16.2%", de:"0.08", div:"—",
      status:"Avoid", sc:"b-avoid", grade:"Avoid", setup:"Avoid", tape:0, news:false,
      next:"No alert", cd:"—", soon:false, earn:"Jul 23 · AMC", review:"—", overdue:false,
      bull:"Energy storage + FSD optionality.", bear:"Auto margins compressing; valuation rich.",
      trigger:"—", stop:"—", tags:"EV · high-beta", series:[290,275,282,268,272,255,260,252,249] },
    RELIANCE: { s:"RELIANCE", co:"Reliance Industries", mkt:"NSE", cur:"INR", last:"₹2,914", chgAbs:"+27", chg:"+0.94%", up:true,
      price:"₹2,914", today:"+0.94%", mktcap:"₹19.7L Cr", range:"2,221–3,217", avgvol:"9.1M", pe:"24.6", fwdpe:"21.0", roe:"8.9%", roce:"9.6%", de:"0.44", div:"0.35%",
      status:"Watching", sc:"b-watch", grade:"Watching", setup:"Pullback", tape:0, news:false,
      next:"Earnings", cd:"32d", soon:false, earn:"Jul 18 · BMO", review:"Jul 15", overdue:false,
      bull:"Jio + retail compounding; new energy optionality.", bear:"O2C cyclicality; capex intensity.",
      trigger:"Hold above ₹2,850.", stop:"₹2,680 · −8%", tags:"conglomerate · India", series:[2680,2740,2710,2800,2780,2860,2840,2900,2914] },
    INFY: { s:"INFY", co:"Infosys Ltd", mkt:"NSE", cur:"INR", last:"₹1,642", chgAbs:"+21", chg:"+1.31%", up:true,
      price:"₹1,642", today:"+1.31%", mktcap:"₹6.8L Cr", range:"1,351–1,953", avgvol:"7.4M", pe:"27.3", fwdpe:"23.8", roe:"31.8%", roce:"38.4%", de:"0.09", div:"2.10%",
      status:"Researching", sc:"b-research", grade:"Researching", setup:"Breakout", tape:0, news:false,
      next:"Earnings", cd:"5d", soon:true, earn:"Jun 21 · BMO", review:"Jun 12 · overdue", overdue:true,
      bull:"Deal pipeline strong; margin levers intact.", bear:"Discretionary IT spend soft near-term.",
      trigger:"Break ₹1,680 on results.", stop:"₹1,540 · −6%", tags:"IT services · India", series:[1520,1580,1560,1610,1590,1630,1620,1638,1642] },
    TCS: { s:"TCS", co:"Tata Consultancy Services", mkt:"NSE", cur:"INR", last:"₹3,880", chgAbs:"−16", chg:"−0.40%", up:false,
      price:"₹3,880", today:"−0.40%", mktcap:"₹14.0L Cr", range:"3,311–4,592", avgvol:"2.1M", pe:"29.1", fwdpe:"26.0", roe:"51.2%", roce:"60.1%", de:"0.07", div:"1.35%",
      status:"Passed", sc:"b-passed", grade:"Passed", setup:"Range", tape:0, news:false,
      next:"Reported", cd:"re-arm", soon:false, earn:"Apr 10 · done", review:"—", overdue:false,
      bull:"Best-in-class ROE; steady cash returns.", bear:"Growth maturing; large-cap law.",
      trigger:"—", stop:"—", tags:"IT services · India", series:[3960,3900,3930,3870,3890,3850,3870,3884,3880] },
    HDFCBANK: { s:"HDFCBANK", co:"HDFC Bank", mkt:"BSE", cur:"INR", last:"₹1,701", chgAbs:"+3", chg:"+0.18%", up:true,
      price:"₹1,701", today:"+0.18%", mktcap:"₹12.9L Cr", range:"1,363–1,795", avgvol:"12M", pe:"18.9", fwdpe:"16.4", roe:"16.7%", roce:"—", de:"—", div:"1.10%",
      status:"Passed", sc:"b-passed", grade:"Passed", setup:"—", tape:0, news:false,
      next:"—", cd:"—", soon:false, earn:"Jul 20 · BMO", review:"May 20", overdue:false,
      bull:"Merger synergies; deposit franchise.", bear:"NIM pressure; deposit competition.",
      trigger:"—", stop:"—", tags:"bank · India", series:[1680,1700,1690,1705,1698,1702,1699,1703,1701] }
  };
  var ORDER = ["NVDA","MU","AAPL","AMD","TSLA","RELIANCE","INFY","TCS","HDFCBANK"];
  var TAPE = [
    { cls:"reading", src:"Squawk · now reading", ts:"14:32", hl:"NVDA tops estimates, raises Q3 guidance on data-center demand", tags:["NVDA"] },
    { cls:"", src:"TradingView", ts:"14:31", hl:"Powell: inflation easing, Fed in no rush to cut further" },
    { cls:"macro", src:"⚑ US macro · FOMC", ts:"14:00", hl:"Fed holds rates at 4.25–4.50%, as expected" },
    { cls:"", src:"Finviz", ts:"13:52", hl:"Semis rally; AI names lead the tape into the close", tags:["NVDA","AMD","MU"] },
    { cls:"evt", src:"★ Watchlist event", ts:"13:40", hl:"MU reports after the close tomorrow — alert armed", tags:["MU"] },
    { cls:"", src:"MarketWatch", ts:"13:28", hl:"Morgan Stanley lifts MU target, cites pricing recovery", tags:["MU"] },
    { cls:"macro in", src:"⚑ India macro · RBI", ts:"12:10", hl:"RBI MPC minutes due Friday 17:00 IST" },
    { cls:"evt", src:"★ Watchlist event", ts:"09:45", hl:"AAPL reports in 9 days — review note pending", tags:["AAPL"] }
  ];
  var TAPE_BY = {
    NVDA:[{src:"Squawk · now",ts:"14:32",hl:"NVDA tops estimates, raises Q3 guidance"},{src:"Finviz",ts:"13:52",hl:"Semis rally; AI names lead into the close"}],
    MU:[{src:"MarketWatch",ts:"13:28",hl:"Morgan Stanley lifts MU target on pricing recovery"}]
  };
  var DAYS = [
    { dw:"Mon", dn:16, today:true, chips:[{c:"us",t:"FOMC begins"}] },
    { dw:"Tue", dn:17, chips:[{c:"us",t:"Retail Sales"}] },
    { dw:"Wed", dn:18, chips:[{c:"us",t:"FOMC decision"},{c:"earn",t:"★ MU"}] },
    { dw:"Thu", dn:19, chips:[{c:"earn",t:"★ NVDA"},{c:"us",t:"Claims"}] },
    { dw:"Fri", dn:20, chips:[{c:"in",t:"RBI minutes"},{c:"earn",t:"★ INFY"}] },
    { dw:"Mon", dn:23, chips:[] }, { dw:"Tue", dn:24, chips:[{c:"us",t:"Conf. Board"}] },
    { dw:"Wed", dn:25, chips:[{c:"earn",t:"★ AAPL"}] }, { dw:"Thu", dn:26, chips:[{c:"us",t:"GDP"}] },
    { dw:"Fri", dn:27, chips:[{c:"us",t:"PCE"}] }, { dw:"Mon", dn:30, chips:[] }, { dw:"Tue", dn:1, chips:[{c:"us",t:"ISM PMI"}] }
  ];
  var WEEK = [
    { dw:"Mon", dn:16, today:true, macros:[{t:"FOMC begins",r:"US",imp:"High",tm:"2-day meeting"}], bmo:[], amc:[{s:"LEN"},{s:"KBH"},{s:"LZB"}] },
    { dw:"Tue", dn:17, macros:[{t:"Retail Sales",r:"US",imp:"Med",tm:"8:30 ET · est +0.3%"}], bmo:[{s:"GES"}], amc:[{s:"PLAB"}] },
    { dw:"Wed", dn:18, macros:[{t:"FOMC Decision",r:"US",imp:"High",tm:"14:00 ET"}], bmo:[], amc:[{s:"MU",w:true,eps:"$1.14"},{s:"GIS"},{s:"JBL"}] },
    { dw:"Thu", dn:19, macros:[{t:"Jobless Claims",r:"US",imp:"Med",tm:"8:30 ET"}], bmo:[{s:"ACN"},{s:"DRI"}], amc:[{s:"NVDA",w:true,eps:"$0.64"},{s:"SMTC"}] },
    { dw:"Fri", dn:20, macros:[{t:"RBI MPC Minutes",r:"IN",imp:"Med",tm:"17:00 IST"}], bmo:[{s:"INFY",w:true,nse:true,eps:"₹16.20"},{s:"TCS",nse:true}], amc:[{s:"CCL"}] }
  ];
  var MONTHEV = {
    4:[{c:"us",t:"ADP"}], 6:[{c:"us",t:"Jobs report"},{c:"more",t:"+5"}], 11:[{c:"us",t:"CPI"}], 12:[{c:"earn",t:"INFY"},{c:"us",t:"PPI"}],
    16:[{c:"us",t:"FOMC begins"}], 18:[{c:"us",t:"FOMC"},{c:"earn",t:"MU"}], 19:[{c:"earn",t:"NVDA"},{c:"more",t:"+4"}], 20:[{c:"in",t:"RBI minutes"},{c:"earn",t:"INFY"}],
    24:[{c:"us",t:"Conf. Board"}], 25:[{c:"earn",t:"AAPL"}], 26:[{c:"us",t:"GDP"}], 27:[{c:"us",t:"PCE"}], 30:[{c:"in",t:"India IIP"}]
  };
  // raw event list for the calendar overlay (preview/demo only) — spans 3 months so navigation is demonstrable
  var EVENTS = [
    { id:"m1", type:"macro", title:"Fed rate decision (FOMC)", region:"US", datetimeUTC:"2026-06-17T18:00:00Z", impact:"high", forecast:null },
    { id:"e0", type:"earnings", ticker:"MU", companyName:"Micron", market:"US", releaseDate:"2026-06-18", reportWindow:"amc", epsForecast:1.14 },
    { id:"e1", type:"earnings", ticker:"NVDA", companyName:"NVIDIA", market:"US", releaseDate:"2026-06-25", reportWindow:"amc", epsForecast:0.64 },
    { id:"m2", type:"macro", title:"US jobs report (Nonfarm payrolls)", region:"US", datetimeUTC:"2026-07-02T12:30:00Z", impact:"high", forecast:null },
    { id:"m3", type:"macro", title:"US Fed meeting notes (FOMC minutes)", region:"US", datetimeUTC:"2026-07-08T18:00:00Z", impact:"med", forecast:null },
    { id:"m4", type:"macro", title:"RBI rate decision", region:"IN", datetimeUTC:"2026-07-08T06:00:00Z", impact:"med", forecast:null },
    { id:"m5", type:"macro", title:"US inflation (CPI)", region:"US", datetimeUTC:"2026-07-14T12:30:00Z", impact:"high", forecast:null },
    { id:"e2", type:"earnings", ticker:"INFY", companyName:"Infosys", market:"NSE", releaseDate:"2026-07-15", reportWindow:"bmo", epsForecast:16.2 },
    { id:"e3", type:"earnings", ticker:"TSLA", companyName:"Tesla", market:"US", releaseDate:"2026-07-22", reportWindow:"amc", epsForecast:null },
    { id:"e4", type:"earnings", ticker:"AAPL", companyName:"Apple", market:"US", releaseDate:"2026-07-30", reportWindow:"amc", epsForecast:null },
    { id:"e5", type:"earnings", ticker:"AMD", companyName:"Advanced Micro Devices", market:"US", releaseDate:"2026-08-04", reportWindow:"amc", epsForecast:null },
    { id:"e6", type:"earnings", ticker:"NVDA", companyName:"NVIDIA", market:"US", releaseDate:"2026-08-26", reportWindow:"amc", epsForecast:null }
  ];
  return { S:S, ORDER:ORDER, TAPE:TAPE, TAPE_BY:TAPE_BY, DAYS:DAYS, WEEK:WEEK, MONTHEV:MONTHEV, EVENTS:EVENTS, calMonthLabel:"June 2025", calToday:16 };
})();
