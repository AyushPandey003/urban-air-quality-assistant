import { expect, it } from 'vitest';
import { answerQuestion } from './assistant';
import { makeSnapshot, TEST_NOW } from '../test/fixtures';
const fixture = makeSnapshot();
const reading = fixture.cities[0]!.readings[0]!;
const history = fixture.cities[0]!.history['1']!;
it('asks for a station instead of inventing data', () =>
  expect(answerQuestion('air quality', null, [], TEST_NOW)).toMatch(/Choose a city/));
it('explains supported questions for unknown input', () =>
  expect(answerQuestion('write a poem', reading, history, TEST_NOW)).toMatch(/I can explain/));
it('grounds an AQI answer in the selected station and states snapshot cadence', () => {
  const answer = answerQuestion('air quality', reading, history, TEST_NOW);
  expect(answer).toContain('Alpha station');
  expect(answer).toContain('Indicative PM2.5 index');
  expect(answer).toContain('six hours');
});
it('uses NowCast when available', () =>
  expect(answerQuestion('air quality', { ...reading, nowCast: 20 }, history, TEST_NOW)).toContain(
    'PM2.5 NowCast',
  ));
it('withholds actionable advice when the observation is stale', () =>
  expect(answerQuestion('can I run', reading, history, TEST_NOW + 25 * 3_600_000)).toMatch(
    /stale/,
  ));
it('includes a medical limitation with outdoor guidance', () =>
  expect(answerQuestion('can I run', reading, history, TEST_NOW)).toContain('not medical advice'));
it('does not invent forecasts with inadequate history', () =>
  expect(answerQuestion('outlook', reading, [], TEST_NOW)).toContain('12 valid'));
it('qualifies forecasts and does not promise validated accuracy', () => {
  const answer = answerQuestion('forecast', reading, history, TEST_NOW);
  expect(answer).toContain('Alpha station');
  expect(answer).toContain('not an official forecast');
  expect(answer).toContain('not been independently validated');
});
