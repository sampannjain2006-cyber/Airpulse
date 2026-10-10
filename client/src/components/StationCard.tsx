import type { Observation } from '../types/observation';
import { AqiBadge } from './AqiBadge';
import { formatValue, formatRelativeTime, isStale } from '../utils/aqiUtils';
import { getSeverity } from '../utils/severityEngine';

interface Props {
  observation: Observation | (any & { has_data?: boolean; data_type?: string });
  isSelected?: boolean;
  onClick?: () => void;
  mode?: 'live' | 'historical' | 'forecast';
  selectedDate?: string;
}

export function StationCard({ observation: obs, isSelected, onClick, mode = 'live', selectedDate }: Props) {
  const isForecast = mode === 'forecast' || obs.data_type === 'predicted';
  const hasData = obs.has_data !== false && (obs.pm25 !== null || obs.aqi !== null);
  const stale = !isForecast && isStale(obs.recorded_at);

  const pm25Val = obs.pm25 != null ? Number(obs.pm25) : null;
  const aqiVal = obs.aqi != null ? Number(obs.aqi) : null;
  const severity = hasData
    ? (pm25Val !== null
        ? getSeverity('pm25', pm25Val, isForecast, obs.model_name)
        : (aqiVal !== null ? getSeverity('aqi', aqiVal, false) : null))
    : null;

  return (
    <div
      className={`station-card${isSelected ? ' selected' : ''}${!hasData ? ' station-no-data' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', opacity: hasData ? 1 : 0.65 }}
    >
      <div className="station-card-header">
        <div>
          <div className="station-card-name">{obs.station_name}</div>
          <div className="station-card-location">{obs.city}, {obs.state}</div>
        </div>
        {hasData ? (
          isForecast ? (
            <div className="card-badge-group">
              <span className="forecast-badge-pill">
                {pm25Val != null ? `PM2.5: ${Math.round(pm25Val)}` : 'FORECAST'}
              </span>
              {severity && severity.status === 'valid' && (
                <span
                  className="severity-card-chip"
                  style={{
                    backgroundColor: severity.bg_color,
                    color: severity.color,
                    border: `1px solid ${severity.color}55`,
                  }}
                >
                  {severity.category?.toUpperCase()}
                </span>
              )}
            </div>
          ) : (
            <div className="card-badge-group">
              {aqiVal !== null ? (
                <AqiBadge aqi={aqiVal} size="sm" />
              ) : severity && severity.status === 'valid' ? (
                <span
                  className="severity-card-chip"
                  style={{
                    backgroundColor: severity.bg_color,
                    color: severity.color,
                    border: `1px solid ${severity.color}55`,
                  }}
                >
                  {Math.round(pm25Val!)} µg/m³ · {severity.category?.toUpperCase()}
                </span>
              ) : (
                <span className="badge-no-data">DATA UNAVAILABLE</span>
              )}
            </div>
          )
        ) : (
          <span className="badge-no-data">DATA UNAVAILABLE</span>
        )}
      </div>

      {hasData ? (
        <div className="station-card-pollutants">
          <div className="pollutant-item">
            <span className="pollutant-label">{isForecast ? 'PM2.5 (Pred)' : 'PM2.5'}</span>
            <span className="pollutant-value">{formatValue(obs.pm25, 'µg/m³')}</span>
          </div>
          <div className="pollutant-item">
            <span className="pollutant-label">{isForecast ? 'CI Range' : 'PM10'}</span>
            <span className="pollutant-value">
              {isForecast && obs.lower_bound != null && obs.upper_bound != null
                ? `±${Math.round((obs.upper_bound - obs.lower_bound) / 2)}`
                : formatValue(obs.pm10, 'µg/m³')}
            </span>
          </div>
          <div className="pollutant-item">
            <span className="pollutant-label">{isForecast ? 'Severity' : 'NO₂'}</span>
            <span
              className="pollutant-value"
              style={isForecast && severity?.color ? { color: severity.color, fontWeight: 700 } : undefined}
            >
              {isForecast ? (severity?.category || '—') : formatValue(obs.no2, 'µg/m³')}
            </span>
          </div>
          <div className="pollutant-item">
            <span className="pollutant-label">{isForecast ? 'Model' : 'O₃'}</span>
            <span className="pollutant-value">{isForecast ? (obs.model_name || 'Ensemble') : formatValue(obs.o3, 'µg/m³')}</span>
          </div>
        </div>
      ) : (
        <div className="station-card-unavailable">
          <span>Data unavailable for selected date {selectedDate ? `(${selectedDate})` : ''}</span>
        </div>
      )}

      <div className="station-card-footer">
        {isForecast ? (
          <>
            <span className="source-badge forecast-src">
              {obs.model_name === 'weighted_ensemble'
                ? 'Weighted Ensemble'
                : obs.model_name === 'hist_gradient_boosting'
                ? 'HistGradientBoosting'
                : obs.model_name === 'random_forest'
                ? 'Random Forest'
                : obs.model_name || 'ML Forecast'}
            </span>
            <span className="freshness-badge">Target: {obs.prediction_date || selectedDate}</span>
          </>
        ) : (
          <>
            <span className={`freshness-badge${stale ? ' stale' : ''}`}>
              {hasData
                ? `${stale ? '⚠ Stale · ' : ''}Recorded: ${formatRelativeTime(obs.recorded_at)}`
                : 'No ground observations'}
            </span>
            <span className="source-badge">{obs.source || 'OpenAQ'}</span>
          </>
        )}
      </div>
    </div>
  );
}

