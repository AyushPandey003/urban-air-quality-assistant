import { describe, expect, it } from 'vitest';
import { buildOutlook, type HistoryPoint } from './outlook';

const now = Date.parse('2026-11-26T08:00:00Z');
function series(base: number): HistoryPoint[] {
  return Array.from({ length: 48 }, (_, i) => ({
    time: new Date(now - (47 - i) * 3600000).toISOString(),
    value: base + 3 * Math.sin(i / 3),
  }));
}
describe('station outlook', () => {
  it('does not invent a forecast without observations', () =>
    expect(buildOutlook([], now)).toEqual([]));
  it('produces 24 future hourly estimates and ordered ranges', () => {
    const result = buildOutlook(series(20), now);
    expect(result).toHaveLength(24);
    result.forEach((p) => {
      expect(p.time).toBeGreaterThan(now);
      expect(p.range[0]).toBeLessThanOrEqual(p.aqi);
      expect(p.range[1]).toBeGreaterThanOrEqual(p.aqi);
      expect(p.aqi).toBeGreaterThanOrEqual(0);
      expect(p.aqi).toBeLessThanOrEqual(500);
    });
  });
  it('changes when a different station history is supplied', () => {
    expect(buildOutlook(series(10), now)[0]!.aqi).not.toBe(buildOutlook(series(80), now)[0]!.aqi);
  });
  it('starts in the future even when the latest observation is delayed', () => {
    expect(buildOutlook(series(20), now + 3 * 3600000)[0]!.time).toBe(now + 4 * 3600000);
  });
});
