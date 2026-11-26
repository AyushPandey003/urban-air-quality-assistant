import type { AirQualityReading } from './openaq';

/** Keep 44px controls separated at the current zoom; every station remains in the list. */
export function visibleStations(
  readings: AirQualityReading[],
  selectedId: number | undefined,
  zoom: number,
): AirQualityReading[] {
  const worldSize = 512 * 2 ** zoom;
  const project = (reading: AirQualityReading) => {
    const sine = Math.sin((Math.max(-85, Math.min(85, reading.lat)) * Math.PI) / 180);
    return {
      x: ((reading.lng + 180) / 360) * worldSize,
      y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize,
    };
  };
  const ordered = [...readings].sort(
    (a, b) => Number(b.sensorId === selectedId) - Number(a.sensorId === selectedId),
  );
  const accepted: Array<{ reading: AirQualityReading; x: number; y: number }> = [];
  for (const reading of ordered) {
    const point = project(reading);
    if (accepted.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= 56))
      accepted.push({ reading, ...point });
  }
  return accepted.map((point) => point.reading);
}
