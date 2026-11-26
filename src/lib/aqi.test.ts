import { describe, it, expect } from 'vitest';
import { concentrationToAQI, aqiToBand, advisoryFor } from './aqi';

describe('concentrationToAQI (US EPA PM2.5)', () => {
  it('maps clean air to Good', () => {
    expect(concentrationToAQI(0)).toBe(0);
    expect(concentrationToAQI(12)).toBe(50);
  });
  it('maps moderate band', () => {
    const aqi = concentrationToAQI(23.7);
    expect(aqi).toBeGreaterThan(50);
    expect(aqi).toBeLessThanOrEqual(100);
  });
  it('caps at 500 for extreme values', () => {
    expect(concentrationToAQI(1000)).toBe(500);
  });
  it('is monotonic', () => {
    let prev = -1;
    for (let c = 0; c <= 300; c += 5) {
      const a = concentrationToAQI(c);
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
  });
});

describe('aqiToBand', () => {
  it.each([
    [0, 'good'], [50, 'good'],
    [51, 'moderate'], [100, 'moderate'],
    [101, 'sensitive'], [150, 'sensitive'],
    [151, 'unhealthy'], [200, 'unhealthy'],
    [201, 'veryunhealthy'], [300, 'veryunhealthy'],
    [301, 'hazardous'], [500, 'hazardous'],
  ] as const)('AQI %i -> %s', (aqi, band) => {
    expect(aqiToBand(aqi)).toBe(band);
  });
});

describe('advisoryFor', () => {
  it('never returns empty string for any profile x band combination', () => {
    const aqis = [10, 75, 125, 175, 250, 400];
    const profiles = ['general', 'asthma', 'athlete', 'elderly', 'child'] as const;
    for (const aqi of aqis)
      for (const p of profiles)
        expect(advisoryFor(aqi, p).length).toBeGreaterThan(10);
  });
  it('asthmatics get stricter advice at AQI 120 than general public', () => {
    expect(advisoryFor(120, 'asthma')).toMatch(/inhaler|indoors/i);
    expect(advisoryFor(120, 'general')).toMatch(/exertion/i);
  });
});
