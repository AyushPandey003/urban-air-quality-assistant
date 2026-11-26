import { expect, it } from 'vitest';
import { visibleStations } from './map-markers';
import { makeSnapshot } from '../test/fixtures';
const readings = makeSnapshot().cities[0]!.readings;
it('declutters nearby touch targets and gives the selected station priority', () => {
  expect(visibleStations(readings, 1, 10.3).map((r) => r.sensorId)).toEqual([1]);
  expect(visibleStations(readings, 2, 10.3).map((r) => r.sensorId)).toEqual([2]);
});
it('reveals markers at closer zoom levels and handles an empty city', () => {
  expect(visibleStations(readings, undefined, 16)).toHaveLength(2);
  expect(visibleStations([], undefined, 10)).toEqual([]);
});
