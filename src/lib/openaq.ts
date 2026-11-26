/** Static OpenAQ snapshots, refreshed by GitHub Actions every six hours. */
import { z } from 'zod';
import type { HistoryPoint } from './outlook';

export const LatLng = z.object({ lat: z.number(), lng: z.number() });
export type LatLng = z.infer<typeof LatLng>;
const ReadingSchema = z.object({
  location: z.string(), city: z.string().optional(), lat: z.number(), lng: z.number(),
  pm25: z.number().optional(), pm10: z.number().optional(), sensorId: z.number().optional(), updatedAt: z.string(),
});
export type AirQualityReading = z.infer<typeof ReadingSchema>;
const SnapshotSchema = z.object({ generatedAt: z.string(), cities: z.array(z.object({
  name: z.string(), latitude: z.number(), longitude: z.number(), generatedAt: z.string().nullable(),
  readings: z.array(ReadingSchema), history: z.record(z.array(z.object({ time: z.string(), value: z.number() }))),
})) });
export async function loadSnapshot(signal?: AbortSignal) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const response = await fetch(`${base}/data/air-quality.json`, { cache: 'no-cache', signal });
  if (!response.ok) throw new Error('City snapshots are unavailable. Please try again after the next refresh.');
  return SnapshotSchema.parse(await response.json());
}
export async function getCitySnapshot(lat: number, lng: number) {
  const snapshot = await loadSnapshot();
  const city = snapshot.cities.find(c => Math.abs(c.latitude - lat) < 0.01 && Math.abs(c.longitude - lng) < 0.01);
  if (!city) throw new Error('This location is not included in the published city snapshots');
  return city;
}
export async function getLatest(lat: number, lng: number): Promise<AirQualityReading[]> {
  return (await getCitySnapshot(lat, lng)).readings;
}
export async function getHistory(sensor: number, signal?: AbortSignal): Promise<HistoryPoint[]> {
  const snapshot = await loadSnapshot(signal);
  for (const city of snapshot.cities) if (city.history[sensor]) return city.history[sensor]!;
  return [];
}
