import type { CSSProperties } from 'react';
import { BAND_META, aqiToBand } from '@/lib/aqi';
import { freshness } from '@/lib/data-policy';
import { readingAqi, readingMethod, type AirQualityReading } from '@/lib/openaq';

export function AirQualityMetrics({
  selected,
  readings,
  loading,
}: {
  selected: AirQualityReading | null;
  readings: AirQualityReading[];
  loading: boolean;
}) {
  const aqi = selected ? readingAqi(selected) : null;
  const band = aqi === null ? null : BAND_META[aqiToBand(aqi)];
  const recent = readings.filter((r) => freshness(r.updatedAt) !== 'stale');
  const average = recent.length
    ? Math.round(recent.reduce((sum, r) => sum + readingAqi(r), 0) / recent.length)
    : null;
  const age = freshness(selected?.updatedAt ?? null);
  return (
    <section
      aria-label="Air quality summary"
      className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy={loading}
    >
      <div
        className="metric-card relative overflow-hidden"
        style={{ '--accent': band?.color ?? '#5eead4' } as CSSProperties}
      >
        <h2 className="eyebrow">
          Selected station · {selected ? readingMethod(selected) : 'PM2.5 index'}
        </h2>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <strong className="text-5xl font-medium tracking-tight" style={{ color: band?.color }}>
            {loading ? '…' : (aqi ?? '—')}
          </strong>
          <span
            className="rounded-full bg-white/5 px-3 py-1 text-xs"
            style={{ color: band?.color }}
          >
            {age === 'stale' ? 'Stale observation' : (band?.label ?? 'Awaiting data')}
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-300">
          {selected?.location ?? 'Choose a reporting station'}
        </p>
      </div>
      <div className="metric-card">
        <h2 className="eyebrow">Fine particles · PM2.5</h2>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-4xl font-medium tracking-tight">
            {selected?.pm25.toFixed(1) ?? '—'}
          </strong>
          <span className="text-xs text-slate-400">µg/m³</span>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Latest reported concentration; not a 24-hour average
        </p>
      </div>
      <div className="metric-card">
        <h2 className="eyebrow">Nearby station average</h2>
        <div className="mt-3 flex items-baseline gap-2">
          <strong className="text-4xl font-medium tracking-tight">{average ?? '—'}</strong>
          <span className="text-xs text-slate-400">US EPA scale</span>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          {recent.length} non-stale monitors · not an official city-wide AQI
        </p>
      </div>
      <div className="metric-card">
        <h2 className="eyebrow">Last station observation</h2>
        <div className="mt-3 text-3xl font-medium tracking-tight">
          {selected
            ? new Date(selected.updatedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
          <span className="ml-2 text-xs text-slate-400">local</span>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          {selected
            ? new Date(selected.updatedAt).toLocaleDateString([], {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'Waiting for a reading'}{' '}
          · {age}
        </p>
      </div>
    </section>
  );
}
