/**
 * AQI math, banding and health advisories.
 * Pure functions only — fully unit-testable, zero I/O.
 */

export type AQIBand =
  'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'veryunhealthy' | 'hazardous';

/** US EPA PM2.5 breakpoints effective May 6, 2024 (µg/m³).
 * Source: https://aqs.epa.gov/aqsweb/documents/codetables/aqi_breakpoints.html
 * Apply to a 24-hour concentration or a PM NowCast, not an unqualified instant reading.
 */
const PM25_BREAKS: Array<[number, number, number, number]> = [
  [0.0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];

/** Piecewise-linear US EPA conversion: pollutant concentration -> AQI. */
export function concentrationToAQI(conc: number, breaks = PM25_BREAKS): number {
  if (!Number.isFinite(conc) || conc < 0)
    throw new RangeError('PM2.5 must be a finite, non-negative concentration');
  conc = Math.floor((conc + Number.EPSILON) * 10) / 10;
  for (const [cLo, cHi, aLo, aHi] of breaks) {
    if (conc >= cLo && conc <= cHi) {
      const aqi = ((aHi - aLo) / (cHi - cLo)) * (conc - cLo) + aLo;
      return Math.round(aqi);
    }
  }
  return 500;
}

export function aqiToBand(aqi: number): AQIBand {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'veryunhealthy';
  return 'hazardous';
}

export const BAND_META: Record<AQIBand, { label: string; color: string; emoji: string }> = {
  good: { label: 'Good', color: '#10b981', emoji: '😀' },
  moderate: { label: 'Moderate', color: '#f59e0b', emoji: '🙂' },
  sensitive: { label: 'Unhealthy for Sensitive Groups', color: '#f97316', emoji: '😷' },
  unhealthy: { label: 'Unhealthy', color: '#ef4444', emoji: '🤒' },
  veryunhealthy: { label: 'Very Unhealthy', color: '#a855f7', emoji: '😨' },
  hazardous: { label: 'Hazardous', color: '#fb7185', emoji: '☠️' },
};

export type HealthProfile = 'general' | 'asthma' | 'athlete' | 'elderly' | 'child';

export function advisoryFor(aqi: number, profile: HealthProfile): string {
  const band = aqiToBand(aqi);
  const base: Record<HealthProfile, Record<AQIBand, string>> = {
    general: {
      good: 'Air quality is generally acceptable. Consider local conditions and your own symptoms before outdoor activity.',
      moderate: 'Acceptable air. Unusually sensitive people should watch for symptoms.',
      sensitive: 'Sensitive individuals should reduce prolonged outdoor exertion.',
      unhealthy: 'Everyone may feel effects; sensitive groups should avoid outdoor exertion.',
      veryunhealthy: 'Health alert — risk of serious effects for everyone.',
      hazardous: 'Emergency conditions. Avoid all outdoor activity.',
    },
    asthma: {
      good: 'Pollution-related risk is generally low. Follow your asthma action plan and carry prescribed medication.',
      moderate: 'Carry your inhaler; symptoms possible with prolonged exertion.',
      sensitive: 'Keep rescue inhaler handy; consider moving exercise indoors.',
      unhealthy:
        'Reduce outdoor exertion and follow your asthma action plan. Seek medical advice if symptoms worsen.',
      veryunhealthy:
        'Avoid outdoor exertion and follow your clinician’s advice and prescribed treatment.',
      hazardous: 'Remain indoors with windows closed. Seek medical help if symptoms appear.',
    },
    athlete: {
      good: 'Ideal training conditions — go for it.',
      moderate: 'Training OK; listen to your breathing.',
      sensitive: 'Shift intense workouts indoors or to early morning.',
      unhealthy: 'Move all training indoors today.',
      veryunhealthy: 'No outdoor training. Indoor sessions only.',
      hazardous: 'Complete rest day — no outdoor activity at all.',
    },
    elderly: {
      good: 'Perfect conditions for your walk.',
      moderate: 'Short walks are fine; avoid peak traffic hours.',
      sensitive: 'Limit time outside; keep medications accessible.',
      unhealthy: 'Stay indoors as much as possible.',
      veryunhealthy: 'Remain indoors; monitor for breathing difficulty.',
      hazardous: 'Do not go outside. Consider an air purifier.',
    },
    child: {
      good: 'Great day for the playground.',
      moderate: 'Outdoor play OK; avoid busy roads.',
      sensitive: 'Reduce playtime outside; prefer indoor games.',
      unhealthy: 'Keep children indoors today.',
      veryunhealthy: 'Strictly indoor activities only.',
      hazardous: 'No outdoor time whatsoever.',
    },
  };
  return base[profile][band];
}
