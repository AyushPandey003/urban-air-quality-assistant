/**
 * Lightweight Holt's double exponential smoothing — runs fully in the
 * browser on fetched (or bundled) time series. Deterministic, unit-testable,
 * no server or Python needed. Swap for TensorFlow.js later if you want
 * a neural model — the interface stays the same.
 */

export interface ForecastPoint {
  t: number; // hours ahead (1..horizon)
  value: number;
  lower: number;
  upper: number;
}

export function holtForecast(
  series: number[],
  horizon = 24,
  alpha = 0.6,
  beta = 0.2,
): number[] {
  if (series.length < 2) {
    return Array.from({ length: horizon }, () => series[0] ?? 0);
  }
  let level = series[0]!;
  let trend = series[1]! - series[0]!;
  for (let i = 1; i < series.length; i++) {
    const prev = level;
    level = alpha * series[i]! + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, h) => level + (h + 1) * trend);
}

/** Holt forecast + naive ±1σ band from residuals. */
export function forecastWithBand(
  series: number[],
  horizon = 24,
): ForecastPoint[] {
  const fitted = holtForecast(series.slice(0, -1), 1);
  const residuals = series.slice(1).map((v, i) => v - (fitted[i] ?? v));
  const sigma = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length, 1),
  );
  const preds = holtForecast(series, horizon);
  return preds.map((value, i) => ({
    t: i + 1,
    value: Math.max(0, Math.round(value)),
    lower: Math.max(0, Math.round(value - sigma)),
    upper: Math.round(value + sigma),
  }));
}
