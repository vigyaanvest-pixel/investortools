/* The Tape — text-to-speech read-aloud (Squawk).
   Queue + smart-wording ported from market-squawk's background.js. */

const speechState = { queue: [], speaking: false, generation: 0 };

const COMPANY_HINTS = new Map([
  ["NVDA", "Nvidia"], ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["AMZN", "Amazon"],
  ["GOOGL", "Alphabet"], ["GOOG", "Alphabet"], ["META", "Meta"], ["TSLA", "Tesla"],
  ["AMD", "AMD"], ["NFLX", "Netflix"], ["MU", "Micron"], ["INFY", "Infosys"],
  ["TCS", "T C S"], ["RELIANCE", "Reliance"], ["HDFCBANK", "H D F C Bank"],
]);

export function formatForSpeech(headline) {
  let text = String(headline || "").trim();
  const tickers = [...text.matchAll(/\b([A-Z]{2,6})\b/g)].map((m) => m[1]).filter((t) => COMPANY_HINTS.has(t));
  const leadTicker = tickers[0];
  text = text
    .replace(/\bBRIEF[-:]\s*/i, "")
    .replace(/\bQ([1-4])\b/gi, "quarter $1")
    .replace(/\b([1-4])Q\b/gi, "$1 quarter")
    .replace(/\bEPS\b/g, "E P S")
    .replace(/\bRev\b/gi, "revenue")
    .replace(/\bVs\.?\b/gi, "versus")
    .replace(/\bUSD\b/g, "U S dollars")
    .replace(/\bM&A\b/g, "M and A")
    .replace(/\bCEO\b/g, "C E O")
    .replace(/\bCFO\b/g, "C F O")
    .replace(/\bYOY\b/g, "year over year")
    .replace(/\bY\/Y\b/g, "year over year")
    .replace(/\$(\d+(?:\.\d+)?)B\b/g, "$1 billion dollars")
    .replace(/\$(\d+(?:\.\d+)?)M\b/g, "$1 million dollars")
    .replace(/\b(\d+(?:\.\d+)?)B\b/g, "$1 billion")
    .replace(/\b(\d+(?:\.\d+)?)M\b/g, "$1 million")
    .replace(/\b1 quarter\b/gi, "first quarter")
    .replace(/\b2 quarter\b/gi, "second quarter")
    .replace(/\b3 quarter\b/gi, "third quarter")
    .replace(/\b4 quarter\b/gi, "fourth quarter")
    .replace(/\s+/g, " ")
    .trim();
  if (leadTicker && /revenue|E P S|earnings|guidance|forecast|sees|raises/i.test(text)) {
    const company = COMPANY_HINTS.get(leadTicker);
    if (company && !text.toLowerCase().startsWith(company.toLowerCase())) text = `${company}. ${text}`;
  }
  return text;
}

function getVoiceKey(v) {
  return `${v.extensionId || "native"}::${v.voiceName}`;
}

export function getVoices() {
  return new Promise((resolve) => {
    chrome.tts.getVoices((voices) => {
      resolve(
        (voices || [])
          .filter((v) => !v.lang || /^en[-_]/i.test(v.lang))
          .map((v) => ({ voiceKey: getVoiceKey(v), voiceName: v.voiceName, lang: v.lang || "" }))
      );
    });
  });
}

async function selectedVoiceOptions(settings) {
  const voices = await new Promise((resolve) => chrome.tts.getVoices(resolve));
  const sel = (voices || []).find((v) => settings.voiceKey && getVoiceKey(v) === settings.voiceKey)
    || (voices || []).find((v) => settings.voice && v.voiceName === settings.voice);
  if (!sel) return {};
  return { voiceName: sel.voiceName, extensionId: sel.extensionId || undefined, lang: sel.lang || undefined };
}

function speakOne(text, options) {
  chrome.tts.stop();
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => { if (!settled) { settled = true; resolve(); } };
    chrome.tts.speak(text, {
      enqueue: false,
      ...options,
      onEvent(e) {
        if (["end", "error", "interrupted", "cancelled"].includes(e.type)) settle();
      },
    }, () => { if (chrome.runtime.lastError) settle(); });
    setTimeout(settle, Math.max(6000, text.length * 95));
  });
}

async function drain() {
  if (speechState.speaking) return;
  const next = speechState.queue.shift();
  if (!next) return;
  speechState.speaking = true;
  const gen = speechState.generation;
  await speakOne(next.text, next.options);
  if (gen !== speechState.generation) return;
  speechState.speaking = false;
  void drain();
}

export function stopSpeech() {
  chrome.tts.stop();
  speechState.queue = [];
  speechState.speaking = false;
  speechState.generation += 1;
}

/** Speak a batch of headlines aloud, honouring workspace TTS settings. */
export async function speakBatch(texts, settings, { force = true } = {}) {
  const list = (texts || []).filter(Boolean);
  if (!list.length) return { ok: false };
  const voiceOptions = await selectedVoiceOptions(settings || {});
  const options = {
    rate: Number(settings && settings.rate) || 1.1,
    pitch: 1,
    volume: Number(settings && settings.vol) || 0.8,
    ...voiceOptions,
  };
  if (force) stopSpeech();
  const smart = !settings || settings.smart !== false;
  list.forEach((t) => speechState.queue.push({ text: smart ? formatForSpeech(t) : t, options }));
  void drain();
  return { ok: true, count: list.length };
}
