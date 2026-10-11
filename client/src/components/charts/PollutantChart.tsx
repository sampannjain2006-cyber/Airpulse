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

const NATURE_CHART_COLORS = {
  pm25: '#2d6a4f', // Forest Green
  pm10: '#0284c7', // Sky Blue
  aqi:  '#d97706', // Warm Amber
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
      <div className="nature-chart-empty">
        <span className="empty-chart-icon">🌱</span>
        <p className="empty-chart-text">No historical air quality records for this station.</p>
        <span className="empty-chart-hint">Readings will populate once ground sensor logs are synchronized.</span>
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
      <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={formatXTick}
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--color-border-strong)' }}
          minTickGap={60}
        />
        <YAxis
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'var(--font-sans)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--color-border-strong)' }}
          unit=" µg/m³"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            boxShadow: 'var(--shadow-md)',
            color: 'var(--color-text-primary)',
            padding: '10px 14px',
          }}
          labelStyle={{ color: 'var(--color-forest)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}
          labelFormatter={(label: unknown) => (typeof label === 'string' || typeof label === 'number' ? new Date(label).toLocaleString('en-IN') : String(label))}
          itemStyle={{ fontSize: 12, padding: '2px 0' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingTop: 10 }} />
        {series.includes('pm25') && (
          <Line
            type="monotone"
            dataKey="pm25"
            name="PM2.5 (µg/m³)"
            stroke={NATURE_CHART_COLORS.pm25}
            strokeWidth={2.5}
            dot={{ r: 3, fill: NATURE_CHART_COLORS.pm25 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        )}
        {series.includes('pm10') && (
          <Line
            type="monotone"
            dataKey="pm10"
            name="PM10 (µg/m³)"
            stroke={NATURE_CHART_COLORS.pm10}
            strokeWidth={2}
            dot={{ r: 2.5, fill: NATURE_CHART_COLORS.pm10 }}
            connectNulls
          />
        )}
        {series.includes('aqi') && (
          <Line
            type="monotone"
            dataKey="aqi"
            name="AQI (CPCB)"
            stroke={NATURE_CHART_COLORS.aqi}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 2.5, fill: NATURE_CHART_COLORS.aqi }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
