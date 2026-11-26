import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAirQuality } from './useAirQuality';
import { invalidateSnapshot } from '@/lib/openaq';
import { makeSnapshot } from '../test/fixtures';
const bengaluru = { name: 'Bengaluru', latitude: 12.97, longitude: 77.59 };
const delhi = { name: 'Delhi', latitude: 28.6139, longitude: 77.209 };
afterEach(() => {
  invalidateSnapshot();
  vi.unstubAllGlobals();
});
it('updates station selection and history without another network request', async () => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json(makeSnapshot(Date.now())));
  vi.stubGlobal('fetch', fetchMock);
  const { result, rerender } = renderHook(({ city }) => useAirQuality(city), {
    initialProps: { city: bengaluru },
  });
  await waitFor(() => expect(result.current.selected?.location).toBe('Alpha station'));
  act(() => result.current.selectStation(2));
  expect(result.current.selected?.location).toBe('Beta station');
  expect(result.current.history[0]?.value).toBe(45);
  rerender({ city: delhi });
  await waitFor(() => expect(result.current.selected?.location).toBe('Delhi station'));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  act(() => result.current.refresh());
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});
it('recovers after a failed snapshot request', async () => {
  const fetchMock = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(Response.json(makeSnapshot(Date.now())));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useAirQuality(bengaluru));
  await waitFor(() => expect(result.current.error).toBe('offline'));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.selected?.location).toBe('Alpha station'));
  expect(result.current.error).toBeNull();
});
it('does not allow a late response to replace the newly selected city', async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    ),
  );
  const { result, rerender } = renderHook(({ city }) => useAirQuality(city), {
    initialProps: { city: bengaluru },
  });
  rerender({ city: delhi });
  await act(async () => resolve(Response.json(makeSnapshot(Date.now()))));
  await waitFor(() => expect(result.current.selected?.location).toBe('Delhi station'));
});
