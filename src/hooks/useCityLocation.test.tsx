import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCityLocation } from './useCityLocation';
import { LOCATIONS } from '@/lib/locations';
afterEach(() => vi.unstubAllGlobals());
it('degrades gracefully without geolocation', () => {
  vi.stubGlobal('navigator', {});
  const { result } = renderHook(() => useCityLocation());
  act(() => result.current.locate());
  expect(result.current.note).toMatch(/not supported/);
});
it('matches a supported city without issuing any network request', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (success: (value: unknown) => void) =>
        success({ coords: { latitude: 28.6139, longitude: 77.209 } }),
    },
  });
  const { result } = renderHook(() => useCityLocation());
  act(() => result.current.locate());
  expect(result.current.location.name).toBe('Delhi');
  expect(result.current.note).toMatch(/not sent/);
  expect(fetchMock).not.toHaveBeenCalled();
});
it('does not let an old GPS callback override a manual city choice', () => {
  let success!: (value: unknown) => void;
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (callback: typeof success) => {
        success = callback;
      },
    },
  });
  const { result } = renderHook(() => useCityLocation());
  act(() => result.current.locate());
  expect(result.current.locating).toBe(true);
  act(() => result.current.choose(LOCATIONS[2]!));
  act(() => success({ coords: { latitude: 28.6139, longitude: 77.209 } }));
  expect(result.current.location.name).toBe('Mumbai');
  expect(result.current.locating).toBe(false);
});
it('explains unsupported regions and permission denial', () => {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (success: (value: unknown) => void) =>
        success({ coords: { latitude: 51.5, longitude: 0 } }),
    },
  });
  const { result, unmount } = renderHook(() => useCityLocation());
  act(() => result.current.locate());
  expect(result.current.note).toMatch(/outside/);
  unmount();
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition: (_success: unknown, error: () => void) => error() },
  });
  const second = renderHook(() => useCityLocation());
  act(() => second.result.current.locate());
  expect(second.result.current.note).toMatch(/denied/);
});
