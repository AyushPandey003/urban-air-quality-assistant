'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { readingAqi, readingMethod, type AirQualityReading } from '@/lib/openaq';
import { BAND_META, aqiToBand } from '@/lib/aqi';
import { visibleStations } from '@/lib/map-markers';

export default function MapView({
  latitude,
  longitude,
  readings,
  selected,
  onSelect,
  loading,
}: {
  latitude: number;
  longitude: number;
  readings: AirQualityReading[];
  selected: AirQualityReading | null;
  onSelect: (reading: AirQualityReading) => void;
  loading: boolean;
}) {
  const mapRef = useRef<MapRef>(null);
  const [mode, setMode] = useState<'stations' | 'heatmap'>('stations');
  const [light, setLight] = useState(false);
  const [zoom, setZoom] = useState(10.3);
  const markers = useMemo(
    () => visibleStations(readings, selected?.sensorId, zoom),
    [readings, selected?.sensorId, zoom],
  );
  useEffect(() => {
    mapRef.current?.easeTo({
      center: [selected?.lng ?? longitude, selected?.lat ?? latitude],
      zoom: 10.3,
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600,
    });
  }, [latitude, longitude, selected]);
  const geojson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: readings.map((r) => ({
        type: 'Feature' as const,
        properties: { aqi: readingAqi(r) },
        geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
      })),
    }),
    [readings],
  );
  return (
    <section className="panel overflow-hidden" aria-label="Air quality map">
      <div className="panel-heading flex-wrap gap-3">
        <div>
          <span className="eyebrow">YOUR NEIGHBOURHOOD, IN FOCUS</span>
          <h2>Air quality explorer</h2>
        </div>
        <div className="segmented" aria-label="Map display">
          <button aria-pressed={mode === 'stations'} onClick={() => setMode('stations')}>
            Stations
          </button>
          <button aria-pressed={mode === 'heatmap'} onClick={() => setMode('heatmap')}>
            Heatmap
          </button>
        </div>
      </div>
      <div className="relative h-[440px] sm:h-[510px]">
        <Map
          ref={mapRef}
          workerUrl={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/vendor/maplibre-worker.mjs`}
          initialViewState={{ latitude, longitude, zoom: 10.3 }}
          onZoomEnd={(event) => setZoom(event.viewState.zoom)}
          dragRotate={false}
          pitchWithRotate={false}
          touchPitch={false}
          maxPitch={0}
          mapStyle={`https://basemaps.cartocdn.com/gl/${light ? 'positron' : 'dark-matter'}-gl-style/style.json`}
          attributionControl={{ compact: true }}
        >
          <NavigationControl position="top-right" />
          {mode === 'heatmap' && (
            <Source id="aqi" type="geojson" data={geojson}>
              <Layer
                id="aqi-heat"
                type="circle"
                paint={{
                  'circle-radius': 65,
                  'circle-blur': 0.8,
                  'circle-opacity': 0.5,
                  'circle-color': [
                    'step',
                    ['get', 'aqi'],
                    '#10b981',
                    51,
                    '#f59e0b',
                    101,
                    '#f97316',
                    151,
                    '#ef4444',
                    201,
                    '#a855f7',
                    301,
                    '#fb7185',
                  ],
                }}
              />
            </Source>
          )}
          {markers.map((r) => {
            const aqi = readingAqi(r);
            const band = BAND_META[aqiToBand(aqi)];
            return (
              <Marker
                key={`${r.location}:${r.lat}`}
                latitude={r.lat}
                longitude={r.lng}
                anchor="center"
              >
                <button
                  className={`map-marker ${selected?.sensorId === r.sensorId ? 'is-selected' : ''}`}
                  style={{ '--marker-color': band.color } as CSSProperties}
                  onClick={() => onSelect(r)}
                  aria-label={`${r.location}, ${readingMethod(r)} ${aqi}`}
                  aria-pressed={selected?.sensorId === r.sensorId}
                  title={`${r.location} · ${band.label}`}
                >
                  {aqi}
                </button>
              </Marker>
            );
          })}
        </Map>
        <div className="map-badge left-4 top-4">
          <span className="live-dot" />
          {loading ? 'Finding monitors…' : `${readings.length} reporting stations`}
        </div>
        <button
          className="map-badge bottom-10 right-3 hover:text-emerald-300"
          onClick={() => setLight((v) => !v)}
        >
          {light ? '☾ Dark map' : '☀ Light map'}
        </button>
        {!loading && readings.length === 0 && (
          <div className="absolute inset-x-6 top-24 rounded-xl bg-slate-950/90 p-5 text-center text-sm text-slate-300">
            No recent readings here. Try another city or refresh.
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-5 py-4">
        <p className="text-xs text-slate-400">
          {mode === 'heatmap'
            ? 'Station AQI halos · not an interpolated pollution surface'
            : markers.length < readings.length
              ? 'Nearby markers grouped for clarity. Zoom in or use the complete station list.'
              : 'Select a station to explore its local forecast'}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          {Object.values(BAND_META).map((b) => (
            <span key={b.label} className="flex items-center gap-1.5">
              <i
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: b.color }}
              />
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
