'use client';

import { useEffect, useRef, useState } from 'react';
import { LOCATIONS, nearestSupportedCity, type Location } from '@/lib/locations';

export function useCityLocation() {
  const [location, setLocation] = useState<Location>(LOCATIONS[0]!);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState('');
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  function choose(next: Location) {
    generation.current++;
    setLocation(next);
    setLocating(false);
    setNote('');
  }
  function locate() {
    if (!navigator.geolocation) {
      setNote('Geolocation is not supported. Please choose a city.');
      return;
    }
    const request = ++generation.current;
    setLocating(true);
    setNote('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (request !== generation.current) return;
        const nearest = nearestSupportedCity(coords);
        if (nearest) {
          setLocation(nearest);
          setNote(
            `GPS matched to ${nearest.name}. Only published city snapshots are used; your coordinates are not sent to our servers.`,
          );
        } else
          setNote(
            'Your location is outside our supported cities. Please choose a city to explore.',
          );
        setLocating(false);
      },
      () => {
        if (request !== generation.current) return;
        setNote(
          'Location access was unavailable or denied. You can still choose any supported city.',
        );
        setLocating(false);
      },
      { timeout: 15_000, maximumAge: 60_000 },
    );
  }
  return { location, choose, locate, locating, note };
}
