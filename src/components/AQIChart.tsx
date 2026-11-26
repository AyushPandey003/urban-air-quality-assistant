'use client';

import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { concentrationToAQI } from '@/lib/aqi';

import { buildOutlook, type HistoryPoint } from '@/lib/outlook';

export function AQIChart({ history, loading, error, station }: { history: HistoryPoint[]; loading: boolean; error: string | null; station?: string }) {
  const [mode, setMode] = useState<'forecast' | 'history'>('forecast');
  const outlook = useMemo(() => buildOutlook(history), [history]);
  const historical = history.slice(-24).map(p => ({ time: Date.parse(p.time), aqi: concentrationToAQI(p.value) }));
  const ready = history.length >= 12;
  const data = mode === 'forecast' ? outlook : historical;
  const formatTime = (value: number) => new Date(value).toLocaleTimeString([], { hour: 'numeric' });
  return <section className="panel" aria-label="24 hour AQI forecast">
    <div className="panel-heading flex-wrap gap-3">
      <div><span className="eyebrow">A LITTLE CLARITY FOR WHAT’S AHEAD</span><h2>Air quality outlook</h2></div>
      <div className="segmented"><button aria-pressed={mode === 'forecast'} onClick={() => setMode('forecast')}>Next 24h</button><button aria-pressed={mode === 'history'} onClick={() => setMode('history')}>History</button></div>
    </div>
    <div className="px-5 pb-5">
      <p className="mb-4 truncate text-xs text-slate-400" title={station}>{station ?? 'Choose a reporting station'}</p>
      <div className="h-[210px]" aria-label={mode === 'forecast' ? 'Estimated AQI over the next 24 hours' : 'Recent measured AQI'}>
        {loading ? <div className="chart-placeholder">Loading local hourly observations…</div> : error || !ready ? <div className="chart-placeholder">{error ?? 'Not enough recent hourly data for a reliable outlook.'}</div> : <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -20, right: 5, top: 10 }}>
            <defs><linearGradient id="outlook-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5eead4" stopOpacity={0.3}/><stop offset="100%" stopColor="#5eead4" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#23333d" strokeDasharray="3 5" />
            <XAxis dataKey="time" tickFormatter={formatTime} minTickGap={40} axisLine={false} tickLine={false} stroke="#768b99" fontSize={10} />
            <YAxis domain={[0, (max: number) => Math.max(100, Math.ceil(max / 50) * 50)]} axisLine={false} tickLine={false} stroke="#768b99" fontSize={10} />
            <Tooltip labelFormatter={v => new Date(Number(v)).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} contentStyle={{ background: '#10212a', border: '1px solid #2d414a', borderRadius: 12 }} />
            <ReferenceLine y={50} stroke="#34d399" strokeOpacity={0.3} strokeDasharray="4 4" />
            {mode === 'forecast' && <Area isAnimationActive={false} type="monotone" dataKey="range" name="Estimated range" stroke="none" fill="#5eead4" fillOpacity={0.08} />}
            <Area isAnimationActive={false} type="monotone" dataKey="aqi" name={mode === 'forecast' ? 'Estimated AQI' : 'Measured AQI'} stroke="#5eead4" strokeWidth={2.5} fill="url(#outlook-fill)" />
          </AreaChart>
        </ResponsiveContainer>}
      </div>
      <div className="mt-4 flex items-start gap-2 border-t border-white/5 pt-4 text-[11px] leading-relaxed text-slate-500"><span className="text-teal-300">ⓘ</span> {mode === 'forecast' ? 'Statistical estimate from this station’s recent PM2.5 observations, not an official forecast. Shading shows model variability, not a calibrated confidence interval.' : 'Hourly PM2.5 observations converted to US EPA AQI. Times shown in your local timezone.'}</div>
    </div>
  </section>;
}
