// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  getCitySnapshot,
  invalidateSnapshot,
  loadSnapshot,
  readingAqi,
  readingMethod,
} from './openaq';
import { makeSnapshot, TEST_NOW } from '../test/fixtures';

beforeEach(() => {
  invalidateSnapshot();
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function mockSnapshot(data: unknown = makeSnapshot()) {
  const request = vi.fn().mockImplementation(async () => Response.json(data));
  vi.stubGlobal('fetch', request);
  return request;
}
it('validates, normalizes and derives station NowCast from one shared request', async () => {
  const request = mockSnapshot();
  const [city, second] = await Promise.all([
    getCitySnapshot(12.97, 77.59),
    getCitySnapshot(28.6139, 77.209),
  ]);
  expect(request).toHaveBeenCalledTimes(1);
  expect(second.name).toBe('Delhi');
  expect(city.readings[0]!.nowCast).toBe(18);
  expect(readingMethod(city.readings[0]!)).toBe('PM2.5 NowCast');
  expect(readingAqi(city.readings[0]!)).toBeGreaterThan(50);
});
it('labels an insufficient-history station as indicative rather than inventing a NowCast', async () => {
  const fixture = makeSnapshot();
  fixture.cities[0]!.history = { '1': [], '2': [] };
  mockSnapshot(fixture);
  const city = await getCitySnapshot(12.97, 77.59);
  expect(readingMethod(city.readings[0]!)).toBe('Indicative PM2.5 index');
  expect(readingAqi(city.readings[0]!)).toBeGreaterThan(50);
});
it('reuses cached data until explicit refresh or expiry', async () => {
  const request = mockSnapshot();
  await loadSnapshot();
  await loadSnapshot();
  expect(request).toHaveBeenCalledTimes(1);
  invalidateSnapshot();
  await loadSnapshot();
  expect(request).toHaveBeenCalledTimes(2);
  vi.setSystemTime(TEST_NOW + 61_000);
  await loadSnapshot();
  expect(request).toHaveBeenCalledTimes(3);
});
it('honors the GitHub Pages base path and never sends a credential', async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/urban-air-quality-assistant');
  const request = mockSnapshot();
  await loadSnapshot();
  expect(request.mock.calls[0]![0]).toBe('/urban-air-quality-assistant/data/air-quality.json');
  expect(request.mock.calls[0]![1]).not.toHaveProperty('headers');
});
it('rejects an unsupported location', async () => {
  mockSnapshot();
  await expect(getCitySnapshot(0, 0)).rejects.toThrow(/not included/);
});
it.each([
  { generatedAt: 'bad', cities: [] },
  { generatedAt: new Date(TEST_NOW).toISOString(), cities: [{ name: 'broken' }] },
])('rejects malformed published data', async (data) => {
  mockSnapshot(data);
  await expect(loadSnapshot()).rejects.toThrow(/invalid/);
});
it('rejects negative PM2.5 data', async () => {
  const data = makeSnapshot();
  data.cities[0]!.readings[0]!.pm25 = -1;
  mockSnapshot(data);
  await expect(loadSnapshot()).rejects.toThrow(/invalid/);
});
it('does not cache a failed request and allows retry', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(Response.json(makeSnapshot()));
  vi.stubGlobal('fetch', request);
  await expect(loadSnapshot()).rejects.toThrow(/unavailable/);
  await expect(loadSnapshot()).resolves.toHaveProperty('cities');
  expect(request).toHaveBeenCalledTimes(2);
});
it('cancels individual consumers without poisoning the shared cache', async () => {
  mockSnapshot();
  const controller = new AbortController();
  controller.abort();
  await expect(loadSnapshot(controller.signal)).rejects.toThrow();
  const pending = new AbortController();
  const result = loadSnapshot(pending.signal);
  pending.abort();
  await expect(result).rejects.toThrow();
  await expect(loadSnapshot()).resolves.toHaveProperty('cities');
});
