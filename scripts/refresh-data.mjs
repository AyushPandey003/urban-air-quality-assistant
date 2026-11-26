import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { SnapshotSchema } from '../src/lib/snapshot-schema.ts';

const key = process.env.OPENAQ_API_KEY;
if (!key) throw new Error('OPENAQ_API_KEY is required. Add it as a repository Actions secret.');
const cities = JSON.parse(
  await readFile(new URL('../src/lib/locations.json', import.meta.url), 'utf8'),
);
const target = new URL('../public/data/air-quality.json', import.meta.url);
let previous = { cities: [] };
try {
  previous = JSON.parse(await readFile(target, 'utf8'));
} catch {
  /* First snapshot. */
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let nextRequest = 0;
async function load(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(Math.max(0, nextRequest - Date.now()));
    nextRequest = Date.now() + 1150; // Stay under 60 upstream requests/minute.
    const response = await fetch(`https://api.openaq.org/v3${path}`, {
      headers: { 'X-API-Key': key },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 429 || response.status >= 500) {
      await sleep(response.status === 429 ? 60000 : 5000);
      continue;
    }
    if (!response.ok) throw new Error(`OpenAQ HTTP ${response.status}`);
    return response.json();
  }
  throw new Error('OpenAQ unavailable after three attempts');
}
const output = [];
let succeeded = 0;
for (const city of cities) {
  const old = previous.cities.find((c) => c.name === city.name);
  try {
    const { results } = await load(
      `/locations?coordinates=${city.latitude},${city.longitude}&radius=25000&limit=100&parameters_id=2`,
    );
    if (!Array.isArray(results)) throw new Error('Invalid locations response');
    const stations = results
      .filter(
        (r) =>
          r.coordinates &&
          r.datetimeLast &&
          Date.parse(r.datetimeLast.utc) > Date.now() - 48 * 3600000 &&
          r.sensors.some((s) => s.parameter.name === 'pm25' && s.parameter.units === 'µg/m³'),
      )
      .sort((a, b) => b.datetimeLast.utc.localeCompare(a.datetimeLast.utc))
      .slice(0, 10);
    const readings = [];
    const history = {};
    for (const station of stations) {
      try {
        const latest = await load(`/locations/${station.id}/latest`);
        const reading = {
          location: station.name,
          lat: station.coordinates.latitude,
          lng: station.coordinates.longitude,
          updatedAt: station.datetimeLast.utc,
          provider: station.provider?.name,
          licenses: station.licenses ?? [],
        };
        for (const parameter of ['pm25', 'pm10']) {
          const sensor = station.sensors.find(
            (s) => s.parameter.name === parameter && s.parameter.units === 'µg/m³',
          );
          const measurement = latest.results.find(
            (m) =>
              m.sensorsId === sensor?.id &&
              m.value >= 0 &&
              Date.parse(m.datetime.utc) > Date.now() - 48 * 3600000,
          );
          if (measurement) {
            reading[parameter] = measurement.value;
            if (parameter === 'pm25') {
              reading.sensorId = sensor.id;
              reading.updatedAt = measurement.datetime.utc;
            }
          }
        }
        if (reading.pm25 === undefined) continue;
        readings.push(reading);
        try {
          const from = new Date(Date.now() - 48 * 3600000).toISOString();
          const hourly = await load(
            `/sensors/${reading.sensorId}/hours?limit=100&datetime_from=${encodeURIComponent(from)}`,
          );
          history[reading.sensorId] = hourly.results
            .filter(
              (r) =>
                r.parameter?.name === 'pm25' &&
                r.parameter.units === 'µg/m³' &&
                r.value >= 0 &&
                !r.flagInfo?.hasFlags,
            )
            .map((r) => ({ time: r.period.datetimeTo.utc, value: r.value }))
            .sort((a, b) => a.time.localeCompare(b.time));
        } catch {
          history[reading.sensorId] = old?.history?.[reading.sensorId] ?? [];
        }
      } catch (error) {
        console.warn(`${city.name}: one station unavailable (${error.message})`);
      }
    }
    if (!readings.length && old?.readings?.length)
      throw new Error('No recent station data; preserving previous snapshot');
    output.push({ ...city, generatedAt: new Date().toISOString(), readings, history });
    succeeded++;
    console.log(
      `${city.name}: ${readings.length} stations, ${Object.keys(history).length} hourly series`,
    );
  } catch (error) {
    console.warn(`${city.name}: ${error.message}`);
    if (old) output.push(old);
    else output.push({ ...city, generatedAt: null, readings: [], history: {} });
  }
}
if (!succeeded)
  throw new Error('All city refreshes failed; refusing to publish stale data as new.');
await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
const snapshot = { generatedAt: new Date().toISOString(), cities: output };
SnapshotSchema.parse(snapshot);
const temporary = new URL(`${target.href}.tmp`);
await writeFile(temporary, JSON.stringify(snapshot));
await rename(temporary, target);
console.log(
  `Saved ${output.length} cities (${succeeded} refreshed). No API credentials are included.`,
);
