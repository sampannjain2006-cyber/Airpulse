import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { HistoryObservation } from '../../types/observation';

const CHART_COLORS = {
  pm25: '#38bdf8',
  pm10: '#a78bfa',
  aqi:  '#f59e0b',
};

function formatXTick(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

interface Props {
  data: HistoryObservation[];
  series?: Array<'pm25' | 'pm10' | 'aqi'>;
  height?: number;
}

export function PollutantChart({ data, series = ['pm25', 'pm10'], height = 280 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>No historical data available for this station.</p>
        <p className="chart-empty-hint">Data will appear here once observations are ingested.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    t: d.recorded_at,
    pm25: d.pm25,
    pm10: d.pm10,
    aqi:  d.aqi,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="t"
          tickFormatter={formatXTick}
          tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          minTickGap={60}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          unit=" µg/m³"
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(13, 18, 31, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
          }}
          labelStyle={{ color: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          labelFormatter={(label: any) => new Date(label).toLocaleString('en-IN')}
          itemStyle={{ fontSize: 12, fontFamily: 'var(--font-mono)', padding: '2px 0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
        {series.includes('pm25') && (
          <Line type="monotone" dataKey="pm25" name="PM2.5" stroke={CHART_COLORS.pm25} dot={{ r: 3 }} strokeWidth={2} connectNulls />
        )}
        {series.includes('pm10') && (
          <Line type="monotone" dataKey="pm10" name="PM10" stroke={CHART_COLORS.pm10} dot={{ r: 3 }} strokeWidth={2} connectNulls />
        )}
        {series.includes('aqi') && (
          <Line type="monotone" dataKey="aqi" name="AQI" stroke={CHART_COLORS.aqi} dot={{ r: 3 }} strokeWidth={2} connectNulls />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
