import { HOUR_MS, normalizeHistory } from './data-policy';
import type { HistoryPoint } from './outlook';

/** EPA particle NowCast, as of the latest observation (not the snapshot fetch time).
 * Requires at least two observations in the latest three hours.
 * https://www.airnow.gov/aqi/aqi-basics/using-air-quality-index/
 */
export function pm25NowCast(history: HistoryPoint[]): number | undefined {
  const points = normalizeHistory(history);
  const latest = points.at(-1);
  if (!latest) return undefined;
  const lastHour = Math.floor(Date.parse(latest.time) / HOUR_MS);
  const recent = points
    .map((p) => ({ value: p.value, age: lastHour - Math.floor(Date.parse(p.time) / HOUR_MS) }))
    .filter((p) => p.age >= 0 && p.age < 12);
  if (recent.filter((p) => p.age < 3).length < 2) return undefined;
  const max = Math.max(...recent.map((p) => p.value));
  const min = Math.min(...recent.map((p) => p.value));
  const weight = max === 0 ? 1 : Math.max(0.5, min / max);
  const sum = recent.reduce((s, p) => s + p.value * weight ** p.age, 0);
  const divisor = recent.reduce((s, p) => s + weight ** p.age, 0);
  return Math.floor((sum / divisor + Number.EPSILON) * 10) / 10;
}
