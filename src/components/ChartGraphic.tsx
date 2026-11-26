'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
const formatTime = (time: number) => new Date(time).toLocaleTimeString([], { hour: 'numeric' });

export default function ChartGraphic({
  data,
  mode,
  fillId,
}: {
  data: { time: number; aqi: number; range?: [number, number] }[];
  mode: 'forecast' | 'history';
  fillId: string;
}) {
  const formatFullTime = (time: number) =>
    new Date(time).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: -20, right: 5, top: 10 }} accessibilityLayer={false}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#344650" strokeDasharray="3 5" />
        <XAxis
          dataKey="time"
          tickFormatter={formatTime}
          minTickGap={40}
          axisLine={false}
          tickLine={false}
          stroke="#a2b4bf"
          fontSize={12}
        />
        <YAxis
          domain={[0, (maximum: number) => Math.max(100, Math.ceil(maximum / 50) * 50)]}
          axisLine={false}
          tickLine={false}
          stroke="#a2b4bf"
          fontSize={12}
        />
        <Tooltip
          labelFormatter={(value) => formatFullTime(Number(value))}
          contentStyle={{
            background: '#10212a',
            border: '1px solid #52666f',
            borderRadius: 12,
          }}
        />
        <ReferenceLine y={50} stroke="#34d399" strokeOpacity={0.3} strokeDasharray="4 4" />
        {mode === 'forecast' && (
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="range"
            name="Model variability"
            stroke="none"
            fill="#5eead4"
            fillOpacity={0.08}
          />
        )}
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="aqi"
          name={mode === 'forecast' ? 'Estimated index' : 'Hourly index'}
          stroke="#5eead4"
          strokeWidth={2.5}
          fill={`url(#${fillId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
