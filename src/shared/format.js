/* Small formatting helpers shared by the background worker. */

export function nowIso() {
  return new Date().toISOString();
}

/** Whole days from `iso` until now (negative = in the future). */
export function daysSince(iso) {
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return Infinity;
  return Math.floor((Date.now() - then) / 86400000);
}

/** "3d", "12h", "now", or "—" for a future date string (YYYY-MM-DD or ISO). */
export function countdownLabel(dateStr) {
  if (!dateStr) return "—";
  const target = new Date(dateStr).getTime();
  if (!Number.isFinite(target)) return "—";
  const ms = target - Date.now();
  if (ms < -86400000) return "—";
  const days = Math.round(ms / 86400000);
  if (days <= 0) {
    const hours = Math.max(0, Math.round(ms / 3600000));
    return hours <= 0 ? "today" : `${hours}h`;
  }
  return `${days}d`;
}

/** Format a Yahoo market-cap number (3.05e12 → "$3.05T"). */
export function fmtMarketCap(raw, sign) {
  if (raw == null || !Number.isFinite(raw)) return null;
  const s = sign || "";
  if (raw >= 1e12) return `${s}${(raw / 1e12).toFixed(2)}T`;
  if (raw >= 1e9) return `${s}${(raw / 1e9).toFixed(2)}B`;
  if (raw >= 1e6) return `${s}${(raw / 1e6).toFixed(2)}M`;
  return `${s}${raw.toFixed(0)}`;
}
