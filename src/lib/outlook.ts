import { concentrationToAQI } from './aqi';
import { forecastIssue, HOUR_MS, normalizeHistory } from './data-policy';

export interface HistoryPoint {
  time: string;
  value: number;
}
export interface OutlookPoint {
  time: number;
  aqi: number;
  range: [number, number];
}

/** Experimental damped-trend estimate. No accuracy or calibrated probability claim. */
export function buildOutlook(input: HistoryPoint[], now = Date.now()): OutlookPoint[] {
  const history = normalizeHistory(input);
  if (forecastIssue(history, now)) return [];
  const recent = history.slice(-6);
  const last = recent[recent.length - 1]!;
  const level = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
  const elapsedHours = (Date.parse(last.time) - Date.parse(recent[0]!.time)) / HOUR_MS;
  const trend = (last.value - recent[0]!.value) / Math.max(elapsedHours, 1);
  const sigma = Math.sqrt(
    recent.reduce((sum, p) => sum + (p.value - level) ** 2, 0) / recent.length,
  );
  const hourly = new Map(history.map((p) => [Math.floor(Date.parse(p.time) / HOUR_MS), p.value]));
  const start = Math.max(Date.parse(last.time), Math.floor(now / HOUR_MS) * HOUR_MS);

  return Array.from({ length: 24 }, (_, i) => {
    const time = start + (i + 1) * HOUR_MS;
    const horizon = (time - Date.parse(last.time)) / HOUR_MS;
    const yesterday = hourly.get(Math.floor(time / HOUR_MS) - 24);
    const baseline = level + (trend * 0.8 * (1 - 0.8 ** horizon)) / 0.2;
    const value = Math.max(
      0,
      yesterday === undefined ? baseline : baseline * 0.65 + yesterday * 0.35,
    );
    const spread = Math.max(2, sigma) * Math.sqrt(1 + horizon / 6);
    return {
      time,
      aqi: concentrationToAQI(value),
      range: [concentrationToAQI(Math.max(0, value - spread)), concentrationToAQI(value + spread)],
    };
  });
}
