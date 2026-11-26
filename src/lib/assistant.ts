import { advisoryFor, aqiToBand, BAND_META } from './aqi';
import { forecastIssue, freshness } from './data-policy';
import { readingAqi, readingMethod, type AirQualityReading } from './openaq';
import { buildOutlook, type HistoryPoint } from './outlook';
import { parseIntent } from './speech';

/** Deterministic answers grounded only in the selected station's published data. */
export function answerQuestion(
  question: string,
  reading: AirQualityReading | null,
  history: HistoryPoint[],
  now = Date.now(),
): string {
  const { intent } = parseIntent(question);
  if (intent === 'unknown')
    return 'I can explain air quality, general outdoor-activity guidance, or the statistical outlook. Try “What is the air quality?”';
  if (!reading) return 'Choose a city with a reporting monitoring station first.';
  if (freshness(reading.updatedAt, now) === 'stale')
    return 'This station’s observation is stale. Choose a more recent station before using its data for outdoor decisions.';
  const aqi = readingAqi(reading);
  const band = BAND_META[aqiToBand(aqi)];
  if (intent === 'forecast') {
    const issue = forecastIssue(history, now);
    if (issue) return issue;
    const forecast = buildOutlook(history, now);
    return `At ${reading.location}, the experimental next-24-hour PM2.5 index estimate ranges from ${Math.min(...forecast.map((p) => p.aqi))} to ${Math.max(...forecast.map((p) => p.aqi))}. This is not an official forecast and its accuracy has not been independently validated.`;
  }
  if (intent === 'advisory')
    return `General guidance for ${reading.location}: ${advisoryFor(aqi, 'general')} This is not medical advice.`;
  return `At ${reading.location}, the ${readingMethod(reading)} is ${aqi}, ${band.label}. The latest reported PM2.5 concentration is ${reading.pm25.toFixed(1)} micrograms per cubic meter. Observed ${new Date(reading.updatedAt).toLocaleString()}; published city snapshots refresh approximately every six hours.`;
}
