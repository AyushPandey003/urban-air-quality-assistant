import { concentrationToAQI } from './aqi';

export interface HistoryPoint { time: string; value: number }

/** Damped trend with a previous-day seasonal component when hourly data exists. */
export function buildOutlook(history: HistoryPoint[], now = Date.now()) {
  const values = history.map(p => p.value);
  const recent = values.slice(-6);
  const level = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1);
  const trend = (recent[recent.length - 1]! - recent[0]!) / Math.max(recent.length - 1, 1);
  const sigma = Math.sqrt(recent.reduce((s, v) => s + (v - level) ** 2, 0) / Math.max(recent.length, 1));
  const last = history[history.length - 1];
  if (!last) return [];
  const start = Math.max(Date.parse(last.time), Math.floor(now / 3600000) * 3600000);
  return Array.from({ length: 24 }, (_, i) => {
    const time = new Date(start + (i + 1) * 3600000);
    const yesterday = history.find(p => Math.abs(Date.parse(p.time) - (time.getTime() - 24 * 3600000)) < 30 * 60000);
    const baseline = level + trend * 0.8 * (1 - 0.8 ** (i + 1)) / 0.2;
    const value = Math.max(0, yesterday ? baseline * 0.65 + yesterday.value * 0.35 : baseline);
    const spread = Math.max(2, sigma) * Math.sqrt(1 + i / 6);
    // EPA PM2.5 breakpoints use concentrations truncated to one decimal place.
    const toAQI = (v: number) => concentrationToAQI(Math.floor(Math.max(0, v) * 10) / 10);
    return { time: time.getTime(), aqi: toAQI(value), range: [toAQI(value - spread), toAQI(value + spread)] };
  });
}

