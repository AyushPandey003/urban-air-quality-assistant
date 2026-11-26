import { describe, it, expect } from 'vitest';
import { holtForecast, forecastWithBand } from './forecast';

describe('holtForecast', () => {
  it('returns constant series for flat input', () => {
    const out = holtForecast([50, 50, 50, 50, 50], 5);
    expect(out).toHaveLength(5);
    out.forEach((v) => expect(v).toBeCloseTo(50, 0));
  });
  it('captures upward trend', () => {
    const out = holtForecast([10, 20, 30, 40, 50], 3);
    expect(out[2]!).toBeGreaterThan(out[0]!);
    expect(out[0]!).toBeGreaterThan(50); // continues past 50
  });
  it('handles single-point series without crashing', () => {
    expect(holtForecast([42], 3)).toEqual([42, 42, 42]);
  });
  it('forecasts correct horizon length', () => {
    expect(holtForecast([1, 2, 3], 24)).toHaveLength(24);
  });
});

describe('forecastWithBand', () => {
  const series = Array.from({ length: 48 }, (_, i) => 60 + 10 * Math.sin(i / 6) + i * 0.3);
  it('produces lower <= value <= upper', () => {
    for (const p of forecastWithBand(series, 24)) {
      expect(p.lower).toBeLessThanOrEqual(p.value);
      expect(p.value).toBeLessThanOrEqual(p.upper);
    }
  });
  it('never predicts negative AQI', () => {
    forecastWithBand(series, 24).forEach((p) => expect(p.lower).toBeGreaterThanOrEqual(0));
  });
});
