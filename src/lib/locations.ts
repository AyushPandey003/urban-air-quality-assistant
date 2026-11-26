import LOCATIONS from './locations.json';
export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export { LOCATIONS };
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat = radians(b.latitude - a.latitude);
  const lng = radians(b.longitude - a.longitude);
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function nearestSupportedCity(coords: {
  latitude: number;
  longitude: number;
}): Location | null {
  const nearest = LOCATIONS.reduce(
    (best, city) => (distanceKm(coords, city) < distanceKm(coords, best) ? city : best),
    LOCATIONS[0]!,
  );
  return distanceKm(coords, nearest) <= 50 ? nearest : null;
}
