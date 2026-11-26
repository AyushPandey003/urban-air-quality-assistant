'use client';

import { useId, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { NearViewport } from './NearViewport';
import { concentrationToAQI } from '@/lib/aqi';
import { buildOutlook, type HistoryPoint } from '@/lib/outlook';

const ChartGraphic = dynamic(() => import('./ChartGraphic'), { ssr: false });

interface Props {
  history: HistoryPoint[];
  loading: boolean;
  error: string | null;
  station?: string;
}
const formatFullTime = (time: number) =>
  new Date(time).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export function AQIChart({ history, loading, error, station }: Props) {
  const [mode, setMode] = useState<'forecast' | 'history'>('forecast');
  const fillId = `outlook-${useId().replace(/:/g, '')}`;
  const outlook = useMemo(() => buildOutlook(history), [history]);
  const historical = useMemo(
    () =>
      history
        .slice(-24)
        .map((p) => ({ time: Date.parse(p.time), aqi: concentrationToAQI(p.value) })),
    [history],
  );
  const data = mode === 'forecast' ? outlook : historical;
  const message = loading
    ? 'Loading local hourly observations…'
    : mode === 'forecast'
      ? (error ?? (!outlook.length ? 'Choose a station with enough recent hourly data.' : null))
      : !historical.length
        ? 'No hourly observations are available at this station.'
        : null;
  const min = data.length ? Math.min(...data.map((p) => p.aqi)) : null;
  const max = data.length ? Math.max(...data.map((p) => p.aqi)) : null;

  return (
    <section className="panel" aria-label="24 hour AQI forecast" aria-busy={loading}>
      <div className="panel-heading flex-wrap gap-3">
        <div>
          <span className="eyebrow">A little clarity for what’s ahead</span>
          <h2>Air quality outlook</h2>
        </div>
        <div className="segmented" role="group" aria-label="Chart period">
          <button aria-pressed={mode === 'forecast'} onClick={() => setMode('forecast')}>
            Next 24h
          </button>
          <button aria-pressed={mode === 'history'} onClick={() => setMode('history')}>
            History
          </button>
        </div>
      </div>
      <div className="px-5 pb-5">
        <p className="mb-3 text-xs text-slate-300">{station ?? 'Choose a reporting station'}</p>
        <figure>
          <figcaption className="mb-3 text-xs text-slate-300" aria-live="polite">
            {message ??
              `${mode === 'forecast' ? 'Estimated' : 'Hourly indicative'} PM2.5 index: ${min}–${max} on the US EPA scale. Times are local.`}
          </figcaption>
          <div className="h-[210px]" aria-hidden="true">
            {message ? (
              <div className="chart-placeholder">{message}</div>
            ) : (
              <NearViewport>
                <ChartGraphic data={data} mode={mode} fillId={fillId} />
              </NearViewport>
            )}
          </div>
        </figure>
        {!message && (
          <details className="mt-4 text-xs text-slate-300">
            <summary className="min-h-11 cursor-pointer py-3 text-teal-200">
              View hourly data table
            </summary>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left">
                <caption className="sr-only">
                  {mode === 'forecast' ? 'Estimated future index' : 'Historical hourly index'} for{' '}
                  {station}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-2">
                      Local date and time
                    </th>
                    <th scope="col" className="py-2">
                      PM2.5 index
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((point) => (
                    <tr key={point.time} className="border-t border-white/10">
                      <th scope="row" className="py-2 font-normal">
                        {formatFullTime(point.time)}
                      </th>
                      <td className="py-2">{point.aqi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
        <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
          {mode === 'forecast'
            ? 'Experimental statistical estimate, not an official forecast. Shading shows model variability, not a calibrated confidence interval. Forecast accuracy has not been independently validated.'
            : 'Hourly PM2.5 converted to the 2024 US EPA scale for comparison, not official daily AQI. The station summary uses PM NowCast when sufficient history is available.'}
        </p>
      </div>
    </section>
  );
}
