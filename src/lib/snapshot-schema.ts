import { z } from 'zod';

// CSP forbids dynamic evaluation. Avoid Zod's optional JIT capability probe entirely,
// rather than triggering a caught policy violation or allowing unsafe-eval.
z.config({ jitless: true });

const Timestamp = z.string().datetime();
export const ReadingSchema = z.object({
  location: z.string().min(1),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  pm25: z.number().finite().nonnegative(),
  pm10: z.number().finite().nonnegative().optional(),
  sensorId: z.number().int().positive(),
  provider: z.string().optional(),
  updatedAt: Timestamp,
});
export type AirQualityReading = z.infer<typeof ReadingSchema> & { nowCast?: number };
export const SnapshotSchema = z.object({
  generatedAt: Timestamp,
  cities: z.array(
    z.object({
      name: z.string().min(1),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      generatedAt: Timestamp.nullable(),
      readings: z.array(ReadingSchema),
      history: z.record(
        z.string(),
        z.array(z.object({ time: Timestamp, value: z.number().finite().nonnegative() })),
      ),
    }),
  ),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
