// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const request = () => new NextRequest('http://localhost/api/air-quality?lat=12.97&lng=77.59');

it('rejects invalid coordinates', async () => {
  expect((await GET(new NextRequest('http://localhost/api/air-quality?lat=999&lng=0'))).status).toBe(400);
});
it('reports a missing server key', async () => {
  vi.stubEnv('OPENAQ_API_KEY', '');
  expect((await GET(request())).status).toBe(503);
});
it('joins v3 latest values with sensor metadata and excludes retired stations', async () => {
  vi.stubEnv('OPENAQ_API_KEY', 'test-secret');
  const station = { id: 1, name: 'Station', locality: null, coordinates: { latitude: 12.97, longitude: 77.59 }, datetimeLast: { utc: new Date().toISOString() }, sensors: [{ id: 55, parameter: { name: 'pm25', units: 'µg/m³' } }] };
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ results: [station, { ...station, id: 2, datetimeLast: { utc: '2018-01-01T00:00:00Z' } }] }))
    .mockResolvedValueOnce(Response.json({ results: [{ sensorsId: 55, value: 19, datetime: station.datetimeLast }] }));
  vi.stubGlobal('fetch', fetchMock);
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{ location: 'Station', lat: 12.97, lng: 77.59, pm25: 19, sensorId: 55, updatedAt: station.datetimeLast.utc }]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('reports upstream authentication errors', async () => {
  vi.stubEnv('OPENAQ_API_KEY', 'test-secret');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
  const response = await GET(request());
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'OpenAQ returned HTTP 401' });
});
