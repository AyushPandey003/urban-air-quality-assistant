// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('rejects invalid sensor identifiers', async () => {
  expect((await GET(new NextRequest('http://localhost/api/air-quality/history?sensor=-1'))).status).toBe(400);
});
it('reports missing credentials', async () => {
  vi.stubEnv('OPENAQ_API_KEY', '');
  expect((await GET(new NextRequest('http://localhost/api/air-quality/history?sensor=55'))).status).toBe(503);
});
it('sorts hourly observations and excludes invalid or flagged data', async () => {
  vi.stubEnv('OPENAQ_API_KEY', 'test');
  const point = (value: number, time: string, hasFlags = false) => ({ value, parameter: { name: 'pm25', units: 'µg/m³' }, period: { datetimeTo: { utc: time } }, flagInfo: { hasFlags } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [
    point(12, '2026-11-26T02:00:00Z'), point(10, '2026-11-26T01:00:00Z'),
    point(-1, '2026-11-26T03:00:00Z'), point(40, '2026-11-26T04:00:00Z', true),
  ] })));
  const response = await GET(new NextRequest('http://localhost/api/air-quality/history?sensor=55'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual([{ time: '2026-11-26T01:00:00Z', value: 10 }, { time: '2026-11-26T02:00:00Z', value: 12 }]);
});
