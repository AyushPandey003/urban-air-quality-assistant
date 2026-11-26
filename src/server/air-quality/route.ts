import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AirQualityReading } from '@/lib/openaq';

const BASE = 'https://api.openaq.org/v3';
const locationsSchema = z.object({ results: z.array(z.object({
  id: z.number(), name: z.string(), locality: z.string().nullable(),
  coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
  datetimeLast: z.object({ utc: z.string() }).nullable(),
  sensors: z.array(z.object({ id: z.number(), parameter: z.object({ name: z.string(), units: z.string() }) })),
})) });
const latestSchema = z.object({ results: z.array(z.object({
  sensorsId: z.number(), value: z.number(), datetime: z.object({ utc: z.string() }),
})) });

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (!params.has('lat') || !params.has('lng') || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'Valid lat and lng are required' }, { status: 400 });
  }
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAQ_API_KEY is not configured on the server' }, { status: 503 });
  async function load(path: string) {
    const response = await fetch(`${BASE}${path}`, {
      headers: { 'X-API-Key': apiKey! }, next: { revalidate: 600 }, signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`OpenAQ returned HTTP ${response.status}`);
    return response.json();
  }
  try {
    const { results } = locationsSchema.parse(await load(`/locations?coordinates=${lat},${lng}&radius=25000&limit=100&parameters_id=2`));
    // Locations include retired monitors. Only use stations reporting in the last 48h.
    const locations = results.filter(r => r.datetimeLast && Date.parse(r.datetimeLast.utc) >= Date.now() - 48 * 3600000)
      .sort((a, b) => b.datetimeLast!.utc.localeCompare(a.datetimeLast!.utc)).slice(0, 10);
    const settled = await Promise.allSettled(locations.map(async location => {
      const latest = latestSchema.parse(await load(`/locations/${location.id}/latest`));
      const reading: AirQualityReading = {
        location: location.name, city: location.locality ?? undefined,
        lat: location.coordinates.latitude, lng: location.coordinates.longitude,
        updatedAt: location.datetimeLast!.utc,
      };
      for (const parameter of ['pm25', 'pm10'] as const) {
        const sensor = location.sensors.find(s => s.parameter.name === parameter && s.parameter.units === 'µg/m³');
        const measurement = latest.results.find(m => m.sensorsId === sensor?.id && m.value >= 0 && Date.parse(m.datetime.utc) >= Date.now() - 48 * 3600000);
        if (measurement) {
          reading[parameter] = measurement.value;
          if (parameter === 'pm25') {
            reading.updatedAt = measurement.datetime.utc;
            reading.sensorId = sensor!.id;
          }
        }
      }
      return reading;
    }));
    const readings = settled.flatMap(result => result.status === 'fulfilled' && result.value.pm25 !== undefined ? [result.value] : []);
    if (!readings.length) throw new Error('No recent PM2.5 readings available nearby');
    return NextResponse.json(readings);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load OpenAQ data' }, { status: 502 });
  }
}
