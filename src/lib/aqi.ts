/**
 * AQI math, banding and health advisories.
 * Pure functions only — fully unit-testable, zero I/O.
 */

export type AQIBand =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'veryunhealthy'
  | 'hazardous';

export interface Pollutant {
  parameter: 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co';
  value: number; // µg/m³ (ppm for CO is converted upstream)
  unit: string;
}

/** US EPA breakpoints for PM2.5 (µg/m³, 24h) — most common reference. */
const PM25_BREAKS: Array<[number, number, number, number]> = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 500.4, 301, 500],
];

/** Piecewise-linear US EPA conversion: pollutant concentration -> AQI. */
export function concentrationToAQI(conc: number, breaks = PM25_BREAKS): number {
  for (const [cLo, cHi, aLo, aHi] of breaks) {
    if (conc >= cLo && conc <= cHi) {
      const aqi = ((aHi - aLo) / (cHi - cLo)) * (conc - cLo) + aLo;
      return Math.round(aqi);
    }
  }
  return conc > 500 ? 500 : 0;
}

export function aqiToBand(aqi: number): AQIBand {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'veryunhealthy';
  return 'hazardous';
}

export const BAND_META: Record<
  AQIBand,
  { label: string; color: string; emoji: string }
> = {
  good: { label: 'Good', color: '#10b981', emoji: '😀' },
  moderate: { label: 'Moderate', color: '#f59e0b', emoji: '🙂' },
  sensitive: { label: 'Unhealthy for Sensitive Groups', color: '#f97316', emoji: '😷' },
  unhealthy: { label: 'Unhealthy', color: '#ef4444', emoji: '🤒' },
  veryunhealthy: { label: 'Very Unhealthy', color: '#a855f7', emoji: '😨' },
  hazardous: { label: 'Hazardous', color: '#881337', emoji: '☠️' },
};

export type HealthProfile = 'general' | 'asthma' | 'athlete' | 'elderly' | 'child';

export function advisoryFor(aqi: number, profile: HealthProfile): string {
  const band = aqiToBand(aqi);
  const base: Record<HealthProfile, Record<AQIBand, string>> = {
    general: {
      good: 'Air quality is excellent — perfect day to be outside.',
      moderate: 'Acceptable air. Unusually sensitive people should watch for symptoms.',
      sensitive: 'Sensitive individuals should reduce prolonged outdoor exertion.',
      unhealthy: 'Everyone may feel effects; sensitive groups should avoid outdoor exertion.',
      veryunhealthy: 'Health alert — risk of serious effects for everyone.',
      hazardous: 'Emergency conditions. Avoid all outdoor activity.',
    },
    asthma: {
      good: 'Great day for you — enjoy outdoor activities.',
      moderate: 'Carry your inhaler; symptoms possible with prolonged exertion.',
      sensitive: 'Keep rescue inhaler handy; consider moving exercise indoors.',
      unhealthy: 'Stay indoors; asthma attacks likely outdoors.',
      veryunhealthy: 'Do not go outside. Use prescribed preventers.',
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
