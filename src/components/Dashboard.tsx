'use client';

import dynamic from 'next/dynamic';
import { useAirQuality } from '@/hooks/useAirQuality';
import { useCityLocation } from '@/hooks/useCityLocation';
import { freshness } from '@/lib/data-policy';
import { readingAqi } from '@/lib/openaq';
import { AQIChart } from './AQIChart';
import { AdvisoryPanel } from './AdvisoryPanel';
import { AirQualityMetrics } from './AirQualityMetrics';
import { LocationBar } from './LocationBar';
import { NearViewport } from './NearViewport';
import { StationList } from './StationList';
import { VoiceAssistant } from './VoiceAssistant';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="panel grid h-[610px] place-items-center" role="status">
      Loading the interactive map…
    </div>
  ),
});

export function Dashboard() {
  const city = useCityLocation();
  const air = useAirQuality(city.location);
  const selectStation = (reading: Parameters<typeof readingAqi>[0]) =>
    air.selectStation(reading.sensorId);
  const guidanceAqi =
    air.selected && freshness(air.selected.updatedAt) !== 'stale' ? readingAqi(air.selected) : null;

  return (
    <main id="main" className="mx-auto max-w-[1440px] px-4 pb-8 pt-8 sm:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-3">Your everyday air companion</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[40px]">
            A clearer view.<span className="text-teal-300"> A better breath.</span>
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Explore the air around you. Make informed choices about time outside.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/5 px-3 py-2 text-xs text-teal-200">
          <span className="live-dot" aria-hidden="true" />
          {air.loading
            ? 'Loading city snapshots…'
            : air.error
              ? 'Snapshot unavailable'
              : 'OpenAQ snapshots · scheduled every 6h'}
        </span>
      </div>
      <LocationBar
        location={city.location}
        onChange={city.choose}
        onLocate={city.locate}
        locating={city.locating}
        onRefresh={air.refresh}
        loading={air.loading}
        stationCount={air.readings.length}
        snapshotTime={air.snapshotTime}
        note={city.note}
      />
      {air.error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {air.error} Choose another city or use Refresh to retry.
        </div>
      )}
      <AirQualityMetrics readings={air.readings} selected={air.selected} loading={air.loading} />
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <NearViewport
            id="map-viewport"
            fallback={
              <div className="panel grid h-[610px] place-items-center" role="status">
                The map loads as you scroll.
              </div>
            }
          >
            <MapView
              latitude={city.location.latitude}
              longitude={city.location.longitude}
              readings={air.readings}
              selected={air.selected}
              onSelect={selectStation}
              loading={air.loading}
            />
          </NearViewport>
          <StationList
            key={city.location.name}
            readings={air.readings}
            selected={air.selected}
            onSelect={selectStation}
            loading={air.loading}
          />
        </div>
        <aside className="flex min-w-0 flex-col gap-6" aria-label="Details and forecast">
          <AQIChart
            history={air.history}
            loading={air.loading}
            error={air.historyError}
            station={air.selected?.location}
          />
          <AdvisoryPanel aqi={guidanceAqi} />
          <VoiceAssistant
            key={`${city.location.name}:${air.selected?.sensorId ?? 'none'}`}
            reading={air.selected}
            history={air.history}
          />
        </aside>
      </div>
      <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-400">
        <span>OpenAQ and contributing providers · US EPA PM2.5 scale (2024)</span>
        <span>NowCast where history permits; otherwise indicative index · Not medical advice</span>
      </footer>
    </main>
  );
}
