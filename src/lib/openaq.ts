/** Credential-free, validated static snapshots. One shared request serves all views. */
import { SnapshotSchema, type AirQualityReading, type Snapshot } from './snapshot-schema';
export type { AirQualityReading } from './snapshot-schema';
import { concentrationToAQI } from './aqi';
import { DATA_POLICY, normalizeHistory } from './data-policy';
import { pm25NowCast } from './nowcast';

let cached: Promise<Snapshot> | null = null;
let expiresAt = 0;

export function invalidateSnapshot() {
  cached = null;
  expiresAt = 0;
}

export async function loadSnapshot(signal?: AbortSignal): Promise<Snapshot> {
  signal?.throwIfAborted();
  if (!cached || Date.now() >= expiresAt) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const request = fetch(`${base}/data/air-quality.json`, {
      cache: 'no-cache',
      signal: AbortSignal.timeout(15_000),
    }).then(async (response) => {
      if (!response.ok)
        throw new Error('City snapshots are unavailable. Please try again after the next refresh.');
      const parsed = SnapshotSchema.safeParse(await response.json());
      if (!parsed.success)
        throw new Error(
          'The published snapshot is invalid. Please try again after the next refresh.',
        );
      return parsed.data;
    });
    cached = request;
    expiresAt = Date.now() + DATA_POLICY.snapshotCacheMs;
    void request.catch(() => {
      if (cached === request) invalidateSnapshot();
    });
  }
  // A cancelled view must not abort the shared request used by other views.
  const snapshot = await cached;
  signal?.throwIfAborted();
  return snapshot;
}

export async function getCitySnapshot(lat: number, lng: number, signal?: AbortSignal) {
  const snapshot = await loadSnapshot(signal);
  const city = snapshot.cities.find(
    (c) => Math.abs(c.latitude - lat) < 0.01 && Math.abs(c.longitude - lng) < 0.01,
  );
  if (!city) throw new Error('This location is not included in the published city snapshots');
  const history = Object.fromEntries(
    Object.entries(city.history).map(([sensor, points]) => [sensor, normalizeHistory(points)]),
  );
  const readings: AirQualityReading[] = city.readings.map((r) => ({
    ...r,
    nowCast: pm25NowCast(history[r.sensorId] ?? []),
  }));
  return {
    ...city,
    history,
    readings: readings.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  };
}

export function readingAqi(reading: AirQualityReading): number {
  return concentrationToAQI(reading.nowCast ?? reading.pm25);
}
export function readingMethod(reading: AirQualityReading): string {
  return reading.nowCast !== undefined ? 'PM2.5 NowCast' : 'Indicative PM2.5 index';
}
export type CitySnapshot = Awaited<ReturnType<typeof getCitySnapshot>>;
