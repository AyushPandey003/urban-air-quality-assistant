export const TEST_NOW = Date.parse('2026-11-26T08:00:00Z');
export function makeSnapshot(now = TEST_NOW) {
  const time = new Date(now).toISOString();
  const history = (value: number) =>
    Array.from({ length: 48 }, (_, i) => ({
      time: new Date(now - (47 - i) * 3_600_000).toISOString(),
      value,
    }));
  const station = (sensorId: number, location: string, pm25: number, lat: number, lng: number) => ({
    sensorId,
    location,
    pm25,
    lat,
    lng,
    updatedAt: time,
    provider: 'Test provider',
  });
  return {
    generatedAt: time,
    cities: [
      {
        name: 'Bengaluru',
        latitude: 12.97,
        longitude: 77.59,
        generatedAt: time,
        readings: [
          station(1, 'Alpha station', 18, 12.97, 77.59),
          station(2, 'Beta station', 45, 12.98, 77.58),
        ],
        history: { '1': history(18), '2': history(45) },
      },
      {
        name: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        generatedAt: time,
        readings: [station(3, 'Delhi station', 80, 28.61, 77.2)],
        history: { '3': history(80) },
      },
    ],
  };
}
