'use client';

import { useState } from 'react';
import { BAND_META, aqiToBand } from '@/lib/aqi';
import { freshness } from '@/lib/data-policy';
import { readingAqi, type AirQualityReading } from '@/lib/openaq';

export function StationList({
  readings,
  selected,
  onSelect,
  loading,
}: {
  readings: AirQualityReading[];
  selected: AirQualityReading | null;
  onSelect: (reading: AirQualityReading) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState('');
  const filtered = readings.filter((r) => r.location.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="panel" aria-label="Nearby stations" aria-busy={loading}>
      <div className="panel-heading flex-wrap gap-3">
        <div>
          <span className="eyebrow">The local picture</span>
          <h2>
            Nearby monitoring stations{' '}
            <span className="ml-1 text-sm text-slate-400">
              {readings.length.toString().padStart(2, '0')}
            </span>
          </h2>
        </div>
        <label className="text-xs text-slate-400">
          Search stations
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Station name…"
            className="mt-1 block min-h-11 w-44 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm focus:border-teal-300"
          />
        </label>
      </div>
      <div className="max-h-80 overflow-y-auto px-2 pb-2">
        {filtered.map((reading) => {
          const value = readingAqi(reading);
          const band = BAND_META[aqiToBand(value)];
          const active = selected?.sensorId === reading.sensorId;
          return (
            <button
              key={reading.sensorId}
              onClick={() => onSelect(reading)}
              aria-pressed={active}
              className={`station-row ${active ? 'active' : ''}`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-white/5 text-lg text-slate-300"
                aria-hidden="true"
              >
                ⌖
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{reading.location}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  PM2.5 {reading.pm25.toFixed(1)} µg/m³ · {freshness(reading.updatedAt)}
                  {reading.provider ? ` · ${reading.provider}` : ''}
                </span>
              </span>
              <span className="text-right">
                <strong className="block text-lg font-medium" style={{ color: band.color }}>
                  {value}
                </strong>
                <span className="text-xs text-slate-300">{band.label}</span>
              </span>
              <span className="ml-1 text-slate-400" aria-hidden="true">
                ↗
              </span>
            </button>
          );
        })}
        {!filtered.length && (
          <p className="p-6 text-center text-sm text-slate-400" role="status">
            {loading
              ? 'Discovering stations…'
              : search
                ? 'No stations match your search.'
                : 'No reporting monitors found nearby.'}
          </p>
        )}
      </div>
    </section>
  );
}
