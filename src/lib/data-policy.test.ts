import { describe, expect, it } from 'vitest';
import { forecastIssue, freshness, HOUR_MS, normalizeHistory } from './data-policy';
import { pm25NowCast } from './nowcast';
import { distanceKm, nearestSupportedCity } from './locations';
const now = Date.parse('2026-11-26T08:00:00Z');
const point = (age: number, value = 20) => ({
  time: new Date(now - age * HOUR_MS).toISOString(),
  value,
});
const history = Array.from({ length: 12 }, (_, i) => point(11 - i));

describe('freshness and eligibility policy', () => {
  it.each([
    [null, 'unavailable'],
    ['invalid', 'unavailable'],
    [point(1).time, 'recent'],
    [point(9).time, 'delayed'],
    [point(25).time, 'stale'],
    [point(-2).time, 'stale'],
  ] as const)('classifies %s as %s', (time, expected) =>
    expect(freshness(time, now)).toBe(expected),
  );
  it('sorts, deduplicates, and filters invalid observations', () => {
    expect(
      normalizeHistory([
        point(1),
        point(0),
        point(1, 30),
        { time: 'bad', value: 3 },
        point(2, -1),
        point(3, NaN),
      ]),
    ).toEqual([point(1, 30), point(0)]);
  });
  it('requires a sufficient, recent, reasonably continuous series', () => {
    expect(forecastIssue(history, now)).toBeNull();
    expect(forecastIssue([], now)).toMatch(/12 valid/);
    expect(forecastIssue(history, now + 13 * HOUR_MS)).toMatch(/12 hours old/);
    expect(forecastIssue(history, now - 2 * HOUR_MS)).toMatch(/future/);
    expect(forecastIssue([...history.slice(0, 11), point(-6)], now + 6 * HOUR_MS)).toMatch(
      /large gaps/,
    );
  });
});
describe('PM NowCast', () => {
  it('requires two of the most recent three hours', () => {
    expect(pm25NowCast([])).toBeUndefined();
    expect(pm25NowCast([point(0), point(4)])).toBeUndefined();
    expect(pm25NowCast([point(0), point(2)])).toBe(20);
  });
  it('preserves constant and zero concentrations', () => {
    expect(pm25NowCast(history)).toBe(20);
    expect(pm25NowCast(history.map((p) => ({ ...p, value: 0 })))).toBe(0);
  });
  it('uses an exponential weight of at least 0.5 and actual hourly gaps', () => {
    expect(pm25NowCast([point(0, 100), point(1, 0)])).toBe(66.6);
    expect(pm25NowCast([point(0, 100), point(2, 0)])).toBe(80);
  });
  it('ignores samples older than the 12-hour window', () => {
    expect(pm25NowCast([...history, point(12, 1000)])).toBe(20);
  });
});
describe('supported geolocation', () => {
  it('matches Bengaluru without transferring coordinates', () =>
    expect(nearestSupportedCity({ latitude: 12.97, longitude: 77.59 })?.name).toBe('Bengaluru'));
  it('rejects unsupported regions', () =>
    expect(nearestSupportedCity({ latitude: 51.5, longitude: -0.12 })).toBeNull());
  it('computes symmetric great-circle distances', () => {
    const a = { latitude: 0, longitude: 0 },
      b = { latitude: 0, longitude: 1 };
    expect(distanceKm(a, a)).toBe(0);
    expect(distanceKm(a, b)).toBeCloseTo(111.19, 1);
    expect(distanceKm(a, b)).toBe(distanceKm(b, a));
  });
});
