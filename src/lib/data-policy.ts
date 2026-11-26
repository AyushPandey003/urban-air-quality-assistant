import type { HistoryPoint } from './outlook';

export const HOUR_MS = 3_600_000;
export const DATA_POLICY = {
  snapshotCacheMs: 60_000,
  snapshotDelayHours: 8,
  staleHours: 24,
  forecastMaxAgeHours: 12,
  forecastMinPoints: 12,
  forecastMaxGapHours: 3,
} as const;

export function freshness(time: string | null, now = Date.now()) {
  if (!time || !Number.isFinite(Date.parse(time))) return 'unavailable';
  const age = now - Date.parse(time);
  if (age < -HOUR_MS || age > DATA_POLICY.staleHours * HOUR_MS) return 'stale';
  return age > DATA_POLICY.snapshotDelayHours * HOUR_MS ? 'delayed' : 'recent';
}

/** Deduplicate hourly observations; never silently treat gaps as adjacent hours. */
export function normalizeHistory(history: HistoryPoint[]): HistoryPoint[] {
  const hours = new Map<number, HistoryPoint>();
  for (const point of history) {
    const time = Date.parse(point.time);
    if (Number.isFinite(time) && Number.isFinite(point.value) && point.value >= 0) {
      hours.set(Math.floor(time / HOUR_MS), point);
    }
  }
  return [...hours.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

export function forecastIssue(history: HistoryPoint[], now = Date.now()): string | null {
  const points = normalizeHistory(history);
  if (points.length < DATA_POLICY.forecastMinPoints)
    return 'At least 12 valid hourly observations are needed for an outlook.';
  const last = Date.parse(points[points.length - 1]!.time);
  if (last > now + HOUR_MS) return 'The station has an invalid future observation time.';
  if (now - last > DATA_POLICY.forecastMaxAgeHours * HOUR_MS)
    return 'Hourly observations are over 12 hours old. Try a more recent station.';
  const recent = points.slice(-DATA_POLICY.forecastMinPoints);
  if (
    recent.some(
      (point, i) =>
        i > 0 &&
        Date.parse(point.time) - Date.parse(recent[i - 1]!.time) >
          DATA_POLICY.forecastMaxGapHours * HOUR_MS,
    )
  ) {
    return 'Recent hourly observations have large gaps; an outlook would be unreliable.';
  }
  return null;
}
