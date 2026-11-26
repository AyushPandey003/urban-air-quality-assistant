'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { AQIChart } from './AQIChart';
import type { HistoryPoint } from '@/lib/outlook';
import { AdvisoryPanel } from './AdvisoryPanel';
import { VoiceAssistant } from './VoiceAssistant';
import { getCitySnapshot, getHistory, type AirQualityReading } from '@/lib/openaq';
import LOCATIONS from '@/lib/locations.json';
import { concentrationToAQI, BAND_META, aqiToBand } from '@/lib/aqi';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <div className="panel h-[610px] animate-pulse" /> });

export function Dashboard() {
  const [location, setLocation] = useState(LOCATIONS[0]!);
  const [readings, setReadings] = useState<AirQualityReading[]>([]);
  const [selected, setSelected] = useState<AirQualityReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [snapshotTime, setSnapshotTime] = useState<string | null>(null);
  const [locationNote, setLocationNote] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null); setReadings([]); setSelected(null); setHistory([]); setSnapshotTime(null);
    getCitySnapshot(location.latitude, location.longitude).then(data => {
      if (!active) return;
      setSnapshotTime(data.generatedAt);
      const sorted = data.readings.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      setReadings(sorted); setSelected(sorted[0] ?? null);
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location, refresh]);

  useEffect(() => {
    setHistory([]); setHistoryError(null);
    if (!selected?.sensorId) { setHistoryLoading(false); return; }
    const controller = new AbortController();
    setHistoryLoading(true);
    getHistory(selected.sensorId, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setHistory(data);
        if (data.length && Date.parse(data[data.length - 1]!.time) < Date.now() - 12 * 3600000) setHistoryError('This station’s latest hourly data is over 12 hours old. Select a more recent station.');
      }
    }).catch(e => { if (!controller.signal.aborted) setHistoryError(e.message); }).finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [selected, refresh]);

  function changeLocation(next: typeof location) {
    setLocation(next); setReadings([]); setSelected(null); setHistory([]); setLoading(true); setError(null); setSearch(''); setLocationNote('');
  }
  function useMyLocation() {
    if (!navigator.geolocation) { setError('Geolocation is not supported in this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const distance = (city: typeof location) => Math.hypot((city.latitude - coords.latitude) * 111, (city.longitude - coords.longitude) * 111 * Math.cos(coords.latitude * Math.PI / 180));
      const nearest = [...LOCATIONS].sort((a, b) => distance(a) - distance(b))[0]!;
      if (distance(nearest) <= 50) {
        changeLocation(nearest);
        setLocationNote(`GPS matched to ${nearest.name}. GitHub Pages uses published city snapshots, not exact-location queries.`);
      } else setLocationNote('Your location is outside the eight supported cities. Please select a city to explore its published snapshot.');
      setLocating(false);
    }, e => { setError(e.message); setLocating(false); }, { timeout: 15000, maximumAge: 60000 });
  }
  const aqi = selected?.pm25 !== undefined ? concentrationToAQI(selected.pm25) : null;
  const band = aqi !== null ? BAND_META[aqiToBand(aqi)] : null;
  const average = useMemo(() => readings.length ? Math.round(readings.reduce((sum, r) => sum + concentrationToAQI(r.pm25!), 0) / readings.length) : null, [readings]);
  const filtered = readings.filter(r => r.location.toLowerCase().includes(search.toLowerCase()));

  return <main id="main" className="mx-auto max-w-[1440px] px-4 pb-8 pt-8 sm:px-8">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-6">
      <div><p className="eyebrow mb-3">YOUR EVERYDAY AIR COMPANION</p><h1 className="text-3xl font-semibold tracking-tight sm:text-[40px]">A clearer view.<span className="text-teal-300"> A better breath.</span></h1><p className="mt-3 text-sm text-slate-400">Explore the air around you. Make a little more room for life outside.</p></div>
      <span className="flex items-center gap-2 rounded-full border border-teal-300/15 bg-teal-300/5 px-3 py-2 text-[11px] text-teal-200"><span className="live-dot"/> {loading ? 'Loading city snapshots…' : error ? 'Snapshot unavailable' : 'OpenAQ snapshots · refreshed every 6h'}</span>
    </div>

    <div className="location-bar mb-6 flex flex-wrap items-center gap-3">
      <span className="text-xl text-teal-300" aria-hidden>⌖</span>
      <div><label htmlFor="map-location" className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">Exploring</label><select id="map-location" value={location.name} onChange={e => { const next = LOCATIONS.find(l => l.name === e.target.value); if (next) changeLocation(next); }} className="-ml-1 bg-transparent pr-6 text-sm font-medium text-white outline-none">
        {LOCATIONS.map(l => <option key={l.name}>{l.name}</option>)}
      </select></div>
      <span className="mx-2 hidden h-7 w-px bg-white/10 sm:block"/>
      <button className="quiet-button" onClick={useMyLocation} disabled={locating}>{locating ? 'Locating…' : '↗ Use my location'}</button>
      <div className="ml-auto flex items-center gap-4"><span className="hidden text-xs text-slate-500 sm:block" role="status">{loading ? 'Finding local observations…' : `${readings.length} monitors within 25 km`}</span><button onClick={() => setRefresh(v => v + 1)} disabled={loading} className="quiet-button" aria-label="Refresh air quality">↻ Refresh</button></div>
    </div>
    <p className="-mt-3 mb-6 text-[11px] leading-relaxed text-slate-500" role="status">{locationNote || `Static city data · scheduled refresh every 6 hours${snapshotTime ? ` · Snapshot fetched ${new Date(snapshotTime).toLocaleString()}` : ''}. Refresh reloads the latest published snapshot.`}</p>
    {error && <div role="alert" className="mb-6 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error} — Try another location or refresh.</div>}

    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="metric-card relative overflow-hidden" style={{ '--accent': band?.color ?? '#5eead4' } as React.CSSProperties}><span className="eyebrow">SELECTED STATION AQI</span><div className="mt-3 flex items-baseline gap-3"><strong className="text-5xl font-medium tracking-tight" style={{ color: band?.color }}>{loading ? '…' : aqi ?? '—'}</strong><span className="rounded-full bg-white/5 px-3 py-1 text-xs" style={{ color: band?.color }}>{band?.label ?? 'Awaiting data'}</span></div><p className="mt-3 truncate text-xs text-slate-400" title={selected?.location}>{selected?.location ?? `Looking around ${location.name}`}</p></div>
      <div className="metric-card"><span className="eyebrow">FINE PARTICLES · PM2.5</span><div className="mt-3 flex items-baseline gap-2"><strong className="text-4xl font-medium tracking-tight">{selected?.pm25?.toFixed(1) ?? '—'}</strong><span className="text-xs text-slate-500">µg/m³</span></div><p className="mt-4 text-xs text-slate-400">The primary pollutant behind this AQI</p></div>
      <div className="metric-card"><span className="eyebrow">NEARBY STATION AVERAGE</span><div className="mt-3 flex items-baseline gap-2"><strong className="text-4xl font-medium tracking-tight">{average ?? '—'}</strong><span className="text-xs text-slate-500">US AQI</span></div><p className="mt-4 text-xs text-slate-400">Across {readings.length} reporting monitors · not a city-wide index</p></div>
      <div className="metric-card"><span className="eyebrow">LAST STATION OBSERVATION</span><div className="mt-3 text-3xl font-medium tracking-tight">{selected ? new Date(selected.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}<span className="ml-2 text-xs text-slate-500">local</span></div><p className="mt-4 text-xs text-slate-400">{selected ? new Date(selected.updatedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : 'Waiting for the latest reading'} · source updates vary</p></div>
    </div>

    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="flex min-w-0 flex-col gap-6">
        <MapView latitude={location.latitude} longitude={location.longitude} readings={readings} selected={selected} onSelect={setSelected} loading={loading}/>
        <section className="panel" aria-label="Nearby stations"><div className="panel-heading flex-wrap gap-3"><div><span className="eyebrow">THE LOCAL PICTURE</span><h2>Nearby monitoring stations <span className="ml-1 text-sm text-slate-500">{readings.length.toString().padStart(2, '0')}</span></h2></div><input aria-label="Search stations" placeholder="Search stations…" value={search} onChange={e => setSearch(e.target.value)} className="w-44 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs outline-none focus:border-teal-300/50"/></div>
          <div className="max-h-[285px] overflow-y-auto px-2 pb-2">{filtered.map(r => { const value = concentrationToAQI(r.pm25!); const meta = BAND_META[aqiToBand(value)]; return <button key={r.location} onClick={() => setSelected(r)} aria-pressed={selected === r} className={`station-row ${selected === r ? 'active' : ''}`}><span className="grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-white/5 text-lg text-slate-400">⌖</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.location}</span><span className="mt-1 block text-[10px] text-slate-500">PM2.5 {r.pm25?.toFixed(1)} µg/m³ · {new Date(r.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span><span className="text-right"><strong className="block text-lg font-medium" style={{ color: meta.color }}>{value}</strong><span className="text-[9px] text-slate-500">{meta.label}</span></span><span className="ml-3 text-slate-600">↗</span></button>; })}{!filtered.length && <p className="p-6 text-center text-sm text-slate-500">{loading ? 'Discovering stations…' : search ? 'No stations match your search.' : 'No reporting monitors found nearby.'}</p>}</div>
        </section>
      </div>
      <aside className="flex min-w-0 flex-col gap-6" aria-label="Details and forecast">
        <AQIChart history={history} loading={historyLoading || loading} error={historyError} station={selected?.location}/>
        <AdvisoryPanel aqi={aqi}/>
        <VoiceAssistant reading={selected} history={history}/>
      </aside>
    </div>
    <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-white/5 pt-5 text-[11px] text-slate-500"><span>Made for a breath of fresh perspective.</span><span>OpenAQ observations · US EPA AQI · Not medical advice</span></footer>
  </main>;
}
