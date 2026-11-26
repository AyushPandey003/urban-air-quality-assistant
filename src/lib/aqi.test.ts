import { describe, it, expect } from 'vitest';
import { concentrationToAQI, aqiToBand, advisoryFor } from './aqi';

describe('2024 EPA PM2.5 breakpoints', () => {
  it.each([
    [0, 0],
    [9, 50],
    [9.1, 51],
    [35.4, 100],
    [35.5, 101],
    [55.4, 150],
    [55.5, 151],
    [125.4, 200],
    [125.5, 201],
    [225.4, 300],
    [225.5, 301],
    [325.4, 500],
    [1000, 500],
  ])('concentration %s maps to index %s', (value, expected) => {
    expect(concentrationToAQI(value)).toBe(expected);
  });
  it('truncates decimal concentrations before interpolation', () => {
    expect(concentrationToAQI(9.099)).toBe(50);
    expect(concentrationToAQI(35.499)).toBe(100);
  });
  it.each([-1, NaN, Infinity, -Infinity])(
    'rejects invalid concentration %s instead of reporting Good',
    (value) => {
      expect(() => concentrationToAQI(value)).toThrow(RangeError);
    },
  );
  it('is monotonic throughout the breakpoint range, including decimal gaps', () => {
    let previous = -1;
    for (let i = 0; i <= 3300; i++) {
      const value = concentrationToAQI(i / 10);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });
});
describe('banding and guidance', () => {
  it.each([
    [0, 'good'],
    [50, 'good'],
    [51, 'moderate'],
    [100, 'moderate'],
    [101, 'sensitive'],
    [150, 'sensitive'],
    [151, 'unhealthy'],
    [200, 'unhealthy'],
    [201, 'veryunhealthy'],
    [300, 'veryunhealthy'],
    [301, 'hazardous'],
    [500, 'hazardous'],
  ] as const)('index %s maps to %s', (value, band) => expect(aqiToBand(value)).toBe(band));
  it('provides guidance for every health profile and band', () => {
    for (const value of [10, 75, 125, 175, 250, 400]) {
      for (const profile of ['general', 'asthma', 'athlete', 'elderly', 'child'] as const)
        expect(advisoryFor(value, profile).length).toBeGreaterThan(10);
    }
  });
});
