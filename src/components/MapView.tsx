'use client';

import { useEffect, useMemo, useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AirQualityReading } from '@/lib/openaq';
import { concentrationToAQI, BAND_META, aqiToBand } from '@/lib/aqi';

export default function MapView({ latitude, longitude, readings, selected, onSelect, loading }: {
  latitude: number; longitude: number; readings: AirQualityReading[];
  selected: AirQualityReading | null; onSelect: (reading: AirQualityReading) => void; loading: boolean;
}) {
  const [view, setView] = useState({ latitude, longitude, zoom: 10.3 });
  const [mode, setMode] = useState<'stations' | 'heatmap'>('stations');
  const [light, setLight] = useState(false);
  useEffect(() => { setView({ latitude, longitude, zoom: 10.3 }); }, [latitude, longitude]);
  useEffect(() => {
    if (selected) setView(v => ({ ...v, latitude: selected.lat, longitude: selected.lng }));
  }, [selected]);
  const geojson = useMemo(() => ({ type: 'FeatureCollection' as const, features: readings.map(r => ({
    type: 'Feature' as const, properties: { aqi: concentrationToAQI(r.pm25!) },
    geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
  })) }), [readings]);
  return (
    <section className="panel overflow-hidden" aria-label="Air quality map">
      <div className="panel-heading flex-wrap gap-3">
        <div><span className="eyebrow">YOUR NEIGHBOURHOOD, IN FOCUS</span><h2>Air quality explorer</h2></div>
        <div className="segmented" aria-label="Map display">
          <button aria-pressed={mode === 'stations'} onClick={() => setMode('stations')}>Stations</button>
          <button aria-pressed={mode === 'heatmap'} onClick={() => setMode('heatmap')}>Heatmap</button>
        </div>
      </div>
      <div className="relative h-[440px] sm:h-[510px]">
        <Map {...view} onMove={e => setView(e.viewState)} mapStyle={`https://basemaps.cartocdn.com/gl/${light ? 'positron' : 'dark-matter'}-gl-style/style.json`} attributionControl={true}>
          <NavigationControl position="top-right" />
          {mode === 'heatmap' && <Source id="aqi" type="geojson" data={geojson}><Layer id="aqi-heat" type="circle" paint={{
            'circle-radius': 65, 'circle-blur': 0.8, 'circle-opacity': 0.5,
            'circle-color': ['step', ['get', 'aqi'], '#10b981', 51, '#f59e0b', 101, '#f97316', 151, '#ef4444', 201, '#a855f7', 301, '#881337'],
          }} /></Source>}
          {readings.map(r => {
            const aqi = concentrationToAQI(r.pm25!);
            const band = BAND_META[aqiToBand(aqi)];
            return <Marker key={`${r.location}:${r.lat}`} latitude={r.lat} longitude={r.lng} anchor="center">
              <button className={`map-marker ${selected === r ? 'is-selected' : ''}`} style={{ '--marker-color': band.color } as React.CSSProperties} onClick={() => onSelect(r)} aria-label={`${r.location}, AQI ${aqi}`} title={`${r.location} · ${band.label}`}>{aqi}</button>
            </Marker>;
          })}
        </Map>
        <div className="map-badge left-4 top-4"><span className="live-dot" />{loading ? 'Finding monitors…' : `${readings.length} reporting stations`}</div>
        <button className="map-badge bottom-10 right-3 hover:text-emerald-300" onClick={() => setLight(v => !v)}>{light ? '☾ Dark map' : '☀ Light map'}</button>
        {!loading && readings.length === 0 && <div className="absolute inset-x-6 top-24 rounded-xl bg-slate-950/90 p-5 text-center text-sm text-slate-300">No recent readings here. Try another city or refresh.</div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-5 py-4">
        <p className="text-xs text-slate-400">{mode === 'heatmap' ? 'Station AQI halos · not an interpolated pollution surface' : 'Select a station to explore its local forecast'}</p>
        <div className="flex gap-3 text-[10px] text-slate-400">{[{ label: 'Good', color: '#10b981' }, { label: 'Moderate', color: '#f59e0b' }, { label: 'Unhealthy', color: '#ef4444' }, { label: 'Hazardous', color: '#a855f7' }].map(b => <span key={b.label} className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full" style={{ background: b.color }} />{b.label}</span>)}</div>
      </div>
    </section>
  );
}
