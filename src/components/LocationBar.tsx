'use client';

import { LOCATIONS, type Location } from '@/lib/locations';
import { freshness } from '@/lib/data-policy';

interface Props {
  location: Location;
  onChange: (location: Location) => void;
  onLocate: () => void;
  locating: boolean;
  onRefresh: () => void;
  loading: boolean;
  stationCount: number;
  snapshotTime: string | null;
  note: string;
}
export function LocationBar({
  location,
  onChange,
  onLocate,
  locating,
  onRefresh,
  loading,
  stationCount,
  snapshotTime,
  note,
}: Props) {
  const status = freshness(snapshotTime);
  return (
    <>
      <div className="location-bar mb-6 flex flex-wrap items-center gap-3">
        <span className="text-xl text-teal-300" aria-hidden="true">
          ⌖
        </span>
        <div>
          <label
            htmlFor="map-location"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Exploring
          </label>
          <select
            id="map-location"
            value={location.name}
            onChange={(event) => {
              const next = LOCATIONS.find((city) => city.name === event.target.value);
              if (next) onChange(next);
            }}
            className="-ml-1 min-h-11 bg-transparent pr-6 text-sm font-medium text-white"
          >
            {LOCATIONS.map((city) => (
              <option key={city.name}>{city.name}</option>
            ))}
          </select>
        </div>
        <span className="mx-2 hidden h-7 w-px bg-white/10 sm:block" aria-hidden="true" />
        <button className="quiet-button" onClick={onLocate} disabled={locating}>
          {locating ? 'Locating…' : '↗ Use my location'}
        </button>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-xs text-slate-400 sm:block">
            {loading ? 'Loading observations…' : `${stationCount} monitors within 25 km`}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="quiet-button"
            aria-label="Refresh air quality"
          >
            ↻ Refresh
          </button>
        </div>
      </div>
      <p className="-mt-3 mb-6 text-xs leading-relaxed text-slate-400" role="status">
        {note ||
          `Static city snapshots · scheduled every 6 hours${snapshotTime ? ` · Fetched ${new Date(snapshotTime).toLocaleString()}` : ''}. Refresh reloads published data.`}
        {status === 'delayed' && ' The scheduled refresh is delayed.'}
        {status === 'stale' &&
          ' Warning: the snapshot is stale; check observation times before acting.'}
      </p>
    </>
  );
}
