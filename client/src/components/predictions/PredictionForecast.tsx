import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { StationForecastResponse } from '../../types/prediction';
import { getSeverity } from '../../utils/severityEngine';

interface Props {
  data: StationForecastResponse | null;
  loading: boolean;
}

export function PredictionForecast({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="forecast-card loading">
        <div className="forecast-header">
          <div className="forecast-title-wrap">
            <span className="forecast-tag">ML INFERENCE</span>
            <h4 className="forecast-title">5-Day ML Forecast</h4>
          </div>
        </div>
        <div className="forecast-loading">Running XGBoost inference…</div>
      </div>
    );
  }

  if (!data) return null;

  if (data.status === 'insufficient_data') {
    return (
      <div className="forecast-card insufficient">
        <div className="forecast-header">
          <div className="forecast-title-wrap">
            <span className="forecast-tag insufficient">HONEST DATA POLICY</span>
            <h4 className="forecast-title">5-Day ML Forecast (XGBoost)</h4>
          </div>
          <span className="forecast-badge insufficient">Insufficient Historical Data</span>
        </div>

        <div className="forecast-notice-box">
          <div className="forecast-notice-icon">ℹ️</div>
          <div className="forecast-notice-content">
            <div className="forecast-notice-title">
              Prediction unavailable — insufficient historical data for this station.
            </div>
            <div className="forecast-notice-desc">
              This monitoring station has fewer than 14 days of historical daily observations in
              the OpenAQ network. In accordance with AIRPULSE project guidelines, forecasts are only
              generated from authentic observed patterns; no synthetic or placeholder data is fabricated.
            </div>
          </div>
        </div>

        <div className="forecast-meta-row">
          <span className="forecast-meta-chip">Provider: OpenAQ</span>
          <span className="forecast-meta-chip">Algorithm: XGBoost</span>
          <span className="forecast-meta-chip">Target: PM2.5</span>
          <span className="forecast-meta-chip">Threshold: ≥ 14 Days</span>
        </div>
      </div>
    );
  }

  // Format chart data: include observed point if available, followed by predicted points
  const chartPoints: any[] = [];

  if (data.last_observed) {
    chartPoints.push({
      dateLabel: 'Observed',
      fullDate: data.last_observed.date,
      observed: data.last_observed.value,
      predicted: data.last_observed.value, // anchor line
      lower: data.last_observed.value,
      upper: data.last_observed.value,
      isObserved: true,
    });
  }

  data.forecast.forEach((f) => {
    chartPoints.push({
      dateLabel: `Day ${f.day}`,
      fullDate: f.date,
      observed: null,
      predicted: f.predicted_value,
      lower: f.lower_bound,
      upper: f.upper_bound,
      isObserved: false,
    });
  });

  return (
    <div className="forecast-card">
      {/* Header */}
      <div className="forecast-header">
        <div className="forecast-title-wrap">
          <span className="forecast-tag available">ML FORECAST ENGINE</span>
          <h4 className="forecast-title">5-Day ML Forecast</h4>
        </div>
        <div className="forecast-status-wrap">
          <span className="forecast-badge available">● {data.model_display_name || data.model} Active</span>
          <span className="forecast-horizon-pill">Horizon: 5 Days</span>
        </div>
      </div>

      {/* Daily Breakdown Grid */}
      <div className="forecast-grid">
        {data.last_observed && (() => {
          const baseSeverity = getSeverity('pm25', data.last_observed.value, false);
          return (
            <div className="forecast-cell observed">
              <div className="forecast-cell-header">
                <span className="forecast-cell-step">Baseline</span>
                <span className="forecast-cell-type observed">Observed</span>
              </div>
              <div className="forecast-cell-val">
                {data.last_observed.value} <small>µg/m³</small>
              </div>
              <div className="forecast-cell-date">{data.last_observed.date}</div>
              {baseSeverity.status === 'valid' && (
                <div
                  className="forecast-cell-severity"
                  style={{
                    color: baseSeverity.color,
                    background: baseSeverity.bg_color,
                    border: `1px solid ${baseSeverity.color}44`,
                    borderRadius: 4,
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    marginTop: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {baseSeverity.category}
                </div>
              )}
            </div>
          );
        })()}

        {data.forecast.map((f) => {
          const predSeverity = getSeverity('pm25', f.predicted_value, true, data.model);
          return (
            <div key={f.day} className="forecast-cell predicted">
              <div className="forecast-cell-header">
                <span className="forecast-cell-step">Day {f.day}</span>
                <span className="forecast-cell-type predicted">Predicted</span>
              </div>
              <div className="forecast-cell-val">
                {f.predicted_value} <small>µg/m³</small>
              </div>
              <div className="forecast-cell-date">{f.date}</div>
              <div className="forecast-cell-ci">
                ± {(f.upper_bound - f.predicted_value).toFixed(0)} range
              </div>
              {predSeverity.status === 'valid' && (
                <div
                  className="forecast-cell-severity"
                  style={{
                    color: predSeverity.color,
                    background: predSeverity.bg_color,
                    border: `1px solid ${predSeverity.color}44`,
                    borderRadius: 4,
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    marginTop: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {predSeverity.category}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="forecast-chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartPoints} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id="predictionArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
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
              formatter={(val: any, name: any, item: any) => {
                if (name === 'Observed Baseline') {
                  return [`${val} µg/m³ (Measured)`, 'Observed Baseline'];
                }
                const low = item.payload.lower;
                const high = item.payload.upper;
                return [
                  `${val} µg/m³ [CI: ${low} - ${high}]`,
                  `${data.model_display_name || 'ML'} Forecast (Predicted)`,
                ];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 4 }} />
            <Area
              type="monotone"
              dataKey="upper"
              fill="url(#predictionArea)"
              stroke="none"
              name="Uncertainty Range"
            />
            <Line
              type="monotone"
              dataKey="observed"
              name="Observed Baseline"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#ffffff' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name={`${data.model_display_name || 'ML'} 5-Day Forecast`}
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#a78bfa', strokeWidth: 1, stroke: '#ffffff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Metadata & Technical Specs */}
      <div className="forecast-meta-footer">
        <div className="forecast-meta-chips">
          <span className="forecast-meta-chip">Model: {data.model_display_name || data.model} v{data.model_version || '1.0.0'}</span>
          <span className="forecast-meta-chip">Target: PM2.5</span>
          <span className="forecast-meta-chip">Data: OpenAQ Real Observations</span>
          {data.metrics && (
            <span className="forecast-meta-chip highlight">
              Validation: MAE {data.metrics.mae} µg/m³ · RMSE {data.metrics.rmse} µg/m³ · R² {data.metrics.r2}
            </span>
          )}
        </div>
        <p className="forecast-explanation">
          {data.explanation ||
            'Forecast generated using a machine learning model trained on real historical OpenAQ observations. Future values are model-derived estimates and clearly distinguished from measured observations.'}
        </p>
      </div>
    </div>
  );
}

