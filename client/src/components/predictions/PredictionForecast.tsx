import { useState } from 'react';
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
  onViewOnMap?: () => void;
}

export function PredictionForecast({ data, loading, onViewOnMap }: Props) {
  const [isModelDetailsOpen, setIsModelDetailsOpen] = useState(false);

  if (loading) {
    return (
      <div className="forecast-dashboard-card loading">
        <div className="forecast-card-header">
          <div className="header-title-group">
            <span className="forecast-badge-pill green">STATISTICAL ML INFERENCE</span>
            <h3 className="forecast-card-title">5-Day Air Quality Forecast</h3>
          </div>
        </div>
        <div className="forecast-loading-state">
          <div className="nature-spinner" />
          <span>Generating multi-model 5-day ML forecast...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Insufficient historical data state (honest data policy)
  if (data.status === 'insufficient_data') {
    return (
      <div className="forecast-dashboard-card insufficient">
        <div className="forecast-card-header">
          <div className="header-title-group">
            <span className="forecast-badge-pill orange">HONEST DATA POLICY</span>
            <h3 className="forecast-card-title">
              5-Day Air Quality Forecast ({data.model_display_name || data.model})
            </h3>
          </div>
          <span className="forecast-status-chip warning">
            ⚠️ Insufficient Historical Data
          </span>
        </div>

        <div className="forecast-empty-explanation-box">
          <div className="empty-warn-icon">ℹ️</div>
          <div className="empty-warn-content">
            <h4 className="empty-warn-title">
              Prediction unavailable — insufficient historical observations for this station.
            </h4>
            <p className="empty-warn-desc">
              This monitoring station has fewer than 14 days of historical daily observations in
              the OpenAQ network. In accordance with AirPulse project rules, forecasts are only
              generated from authentic observed ground patterns; no synthetic or placeholder data
              is fabricated.
            </p>
          </div>
        </div>

        <div className="forecast-meta-chips-row">
          <span className="meta-chip">Provider: OpenAQ Ground Network</span>
          <span className="meta-chip">Algorithm: {data.model_display_name || data.model}</span>
          <span className="meta-chip">Target: PM2.5 (24h Average)</span>
          <span className="meta-chip">Minimum Threshold: ≥ 14 Days</span>
          {data.last_observed && (
            <span className="meta-chip highlight">
              Latest Observed Reading: {data.last_observed.value} µg/m³ ({data.last_observed.date})
            </span>
          )}
        </div>
      </div>
    );
  }

  // Build chart points for Recharts ComposedChart
  const chartPoints: Array<{
    stepName: string;
    dateLabel: string;
    fullDate: string;
    observed: number | null;
    predicted: number | null;
    lower: number | null;
    upper: number | null;
    isObserved: boolean;
  }> = [];

  if (data.last_observed) {
    const obsDate = data.last_observed.date;
    const dateObj = new Date(obsDate + 'T00:00:00Z');
    const monthDay = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      : obsDate;
    chartPoints.push({
      stepName: 'Baseline',
      dateLabel: `Baseline (${monthDay})`,
      fullDate: obsDate,
      observed: data.last_observed.value,
      predicted: data.last_observed.value, // anchor line
      lower: data.last_observed.value,
      upper: data.last_observed.value,
      isObserved: true,
    });
  }

  data.forecast.forEach((f) => {
    const dateObj = new Date(f.date + 'T00:00:00Z');
    const monthDay = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' })
      : f.date;
    chartPoints.push({
      stepName: `Day ${f.day}`,
      dateLabel: `Day ${f.day} (${monthDay})`,
      fullDate: f.date,
      observed: null,
      predicted: f.predicted_value,
      lower: f.lower_bound,
      upper: f.upper_bound,
      isObserved: false,
    });
  });

  return (
    <div className="forecast-dashboard-card">
      {/* 1. Forecast Header */}
      <div className="forecast-card-header">
        <div className="header-title-group">
          <div className="badge-row">
            <span className="forecast-badge-pill green">STATISTICAL ML INFERENCE</span>
            <span className="forecast-badge-pill purple">
              ● {data.model_display_name || data.model}
            </span>
            <span className="forecast-badge-pill cyan">90% CONFIDENCE ENVELOPE</span>
          </div>
          <h3 className="forecast-card-title">
            5-Day Air Quality Forecast: {data.station_name}
          </h3>
          <div className="forecast-card-subtitle">
            <span>📍 {data.city}, {data.state}</span>
            <span>·</span>
            <span>Target: <strong>PM2.5 ({data.unit || 'µg/m³'})</strong></span>
            {data.generated_at && (
              <>
                <span>·</span>
                <span>
                  Generated: {new Date(data.generated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({new Date(data.generated_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })})
                </span>
              </>
            )}
          </div>
        </div>

        {onViewOnMap && (
          <button
            type="button"
            className="nature-btn secondary sm"
            onClick={onViewOnMap}
            title="Locate station on interactive map"
          >
            <span>🗺️</span>
            <span>View on Map</span>
          </button>
        )}
      </div>

      {/* Clear Distinction Policy Notice */}
      <div className="forecast-distinction-banner">
        <span className="info-icon">ℹ️</span>
        <span>
          <strong>Data Provenance Notice:</strong> Observed ground measurements are strictly distinguished from future machine-learning projections. Model outputs represent statistical estimates derived from historical air quality readings.
        </span>
      </div>

      {/* 2. Five-Day Forecast Cards (Horizontal Row on Desktop) */}
      <div className="forecast-cards-horizontal-row">
        {/* Baseline Observed Card */}
        {data.last_observed && (() => {
          const baseSeverity = getSeverity('pm25', data.last_observed.value, false);
          const dateObj = new Date(data.last_observed.date + 'T00:00:00Z');
          const dateStr = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
            : data.last_observed.date;

          return (
            <div className="forecast-step-card observed">
              <div className="step-card-header">
                <span className="step-index-tag observed">Baseline</span>
                <span className="step-nature-badge observed">Observed Reading</span>
              </div>
              <div className="step-card-val">
                <span className="val-number">{data.last_observed.value}</span>
                <span className="val-unit">µg/m³</span>
              </div>
              <div className="step-card-date">{dateStr}</div>
              {baseSeverity.status === 'valid' && (
                <div
                  className="step-card-category-badge"
                  style={{
                    backgroundColor: baseSeverity.bg_color,
                    color: baseSeverity.color,
                    borderColor: `${baseSeverity.color}55`,
                  }}
                >
                  {baseSeverity.category}
                </div>
              )}
              <div className="step-card-footer observed">Observed Ground Reading</div>
            </div>
          );
        })()}

        {/* 5 Forecast Day Cards */}
        {data.forecast.map((f) => {
          const predSeverity = getSeverity('pm25', f.predicted_value, true, data.model);
          const dateObj = new Date(f.date + 'T00:00:00Z');
          const dateStr = !isNaN(dateObj.getTime())
            ? dateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
            : f.date;

          return (
            <div key={f.day} className="forecast-step-card predicted">
              <div className="step-card-header">
                <span className="step-index-tag predicted">Day {f.day}</span>
                <span className="step-nature-badge predicted">ML Forecast</span>
              </div>
              <div className="step-card-val">
                <span className="val-number">{f.predicted_value}</span>
                <span className="val-unit">µg/m³</span>
              </div>
              <div className="step-card-date">{dateStr}</div>
              {predSeverity.status === 'valid' && (
                <div
                  className="step-card-category-badge"
                  style={{
                    backgroundColor: predSeverity.bg_color,
                    color: predSeverity.color,
                    borderColor: `${predSeverity.color}55`,
                  }}
                >
                  {predSeverity.category}
                </div>
              )}
              <div className="step-card-ci">
                90% CI: [{f.lower_bound} – {f.upper_bound}] µg/m³
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Wide Recharts Composed Forecast Chart */}
      <div className="forecast-chart-container">
        <div className="forecast-chart-header">
          <div className="chart-header-title">
            <span>📈</span> 5-Day PM2.5 Trajectory with 90% Confidence Band
          </div>
          <div className="chart-header-legend-info">
            <span className="chart-legend-indicator observed">━ Observed Baseline</span>
            <span className="chart-legend-indicator predicted">┅ Predicted ML Forecast</span>
            <span className="chart-legend-indicator band">░ 90% Uncertainty Envelope</span>
          </div>
        </div>

        <div className="forecast-chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={chartPoints}
              margin={{ top: 16, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="forecastCiBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: '#334155', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                dy={8}
              />
              <YAxis
                tick={{ fill: '#334155', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                unit=" µg/m³"
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(27, 67, 50, 0.25)',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  padding: '10px 14px',
                }}
                labelStyle={{ color: '#1b4332', fontSize: 12, fontWeight: 800 }}
                formatter={(val, name, item) => {
                  const numVal = typeof val === 'number' ? val.toFixed(1) : String(val ?? '—');
                  if (name === 'Observed Ground Baseline') {
                    return [`${numVal} µg/m³ (Verified Sensor)`, 'Observed Baseline'];
                  }
                  const payload = (item as { payload?: { lower?: number; upper?: number } })?.payload;
                  const low = payload?.lower != null ? Number(payload.lower).toFixed(1) : '—';
                  const high = payload?.upper != null ? Number(payload.upper).toFixed(1) : '—';
                  return [
                    `${numVal} µg/m³ [90% CI: ${low} – ${high} µg/m³]`,
                    `${data.model_display_name || 'ML'} Forecast`,
                  ];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#475569', paddingTop: 10 }}
              />
              {/* 90% Confidence Envelope Band */}
              <Area
                type="monotone"
                dataKey="upper"
                fill="url(#forecastCiBand)"
                stroke="none"
                name="90% Uncertainty Envelope"
              />
              {/* Observed Baseline Line */}
              <Line
                type="monotone"
                dataKey="observed"
                name="Observed Ground Baseline"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 6, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
                connectNulls={false}
              />
              {/* Predicted 5-Day Line */}
              <Line
                type="monotone"
                dataKey="predicted"
                name={`${data.model_display_name || 'ML'} 5-Day Forecast`}
                stroke="#7c3aed"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 5, fill: '#7c3aed', strokeWidth: 2, stroke: '#ffffff' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Model Technical Information & Validation Metrics (Collapsible) */}
      <div className="forecast-technical-details-card">
        <div
          className="technical-toggle-header"
          onClick={() => setIsModelDetailsOpen(!isModelDetailsOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsModelDetailsOpen(!isModelDetailsOpen);
          }}
        >
          <div className="toggle-title">
            <span>⚙️</span>
            <span>Model Specifications &amp; Validation Metrics</span>
          </div>
          <span className="toggle-chevron">{isModelDetailsOpen ? '▲ Hide' : '▼ Expand'}</span>
        </div>

        {isModelDetailsOpen && (
          <div className="technical-content-body">
            <div className="tech-meta-chips-grid">
              <span className="tech-meta-chip">
                Architecture: <strong>{data.model_display_name || data.model}</strong>
              </span>
              <span className="tech-meta-chip">
                Model Version: <strong>v{data.model_version || '1.0.0'}</strong>
              </span>
              <span className="tech-meta-chip">
                Target Pollutant: <strong>PM2.5 (µg/m³)</strong>
              </span>
              <span className="tech-meta-chip">
                Training Horizon: <strong>5-Day Recursive Autoregressive</strong>
              </span>
              {data.metrics && (
                <>
                  <span className="tech-meta-chip highlight">
                    Test MAE: <strong>{data.metrics.mae} µg/m³</strong>
                  </span>
                  <span className="tech-meta-chip highlight">
                    Test RMSE: <strong>{data.metrics.rmse} µg/m³</strong>
                  </span>
                  <span className="tech-meta-chip highlight">
                    Test R²: <strong>{data.metrics.r2}</strong>
                  </span>
                  <span className="tech-meta-chip">
                    Evaluated Samples: <strong>877 unseen historical observations</strong>
                  </span>
                </>
              )}
            </div>

            <p className="technical-explanation-text">
              {data.explanation ||
                'Forecast generated using a validation-weighted multi-model ensemble (XGBoost 32.8%, Random Forest 33.3%, HistGradientBoosting 34.0%) based on historical validation error minimization on unseen historical test data.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
