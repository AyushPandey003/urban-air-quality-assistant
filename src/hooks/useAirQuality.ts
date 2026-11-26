'use client';

import { useEffect, useReducer, useState } from 'react';
import { getCitySnapshot, invalidateSnapshot, type CitySnapshot } from '@/lib/openaq';
import { forecastIssue } from '@/lib/data-policy';
import type { Location } from '@/lib/locations';
type State =
  | { phase: 'loading'; city: string }
  | { phase: 'ready'; city: string; data: CitySnapshot }
  | { phase: 'error'; city: string; error: string };
type Action = State;
const reducer = (_state: State, action: Action): State => action;

/** Owns request cancellation, view selection and refresh; components only render data. */
export function useAirQuality(location: Location) {
  const [state, dispatch] = useReducer(reducer, { phase: 'loading', city: location.name });
  const [version, refreshVersion] = useReducer((v: number) => v + 1, 0);
  const [sensor, setSensor] = useState<number | null>(null);
  const { name, latitude, longitude } = location;

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ phase: 'loading', city: name });
    getCitySnapshot(latitude, longitude, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) dispatch({ phase: 'ready', city: name, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          dispatch({
            phase: 'error',
            city: name,
            error: error instanceof Error ? error.message : 'Could not load city data',
          });
      });
    return () => controller.abort();
  }, [name, latitude, longitude, version]);

  const data = state.city === name && state.phase === 'ready' ? state.data : null;
  const readings = data?.readings ?? [];
  const selected = readings.find((r) => r.sensorId === sensor) ?? readings[0] ?? null;
  const history = selected ? (data?.history[selected.sensorId] ?? []) : [];
  return {
    readings,
    selected,
    history,
    selectStation: (id: number) => setSensor(id),
    loading: state.city !== name || state.phase === 'loading',
    error: state.city === name && state.phase === 'error' ? state.error : null,
    snapshotTime: data?.generatedAt ?? null,
    historyError: selected ? forecastIssue(history) : null,
    refresh: () => {
      invalidateSnapshot();
      refreshVersion();
    },
  };
}
