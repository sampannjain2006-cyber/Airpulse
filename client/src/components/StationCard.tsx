import React from 'react';
import type { Observation } from '../types/observation';
import type { Station } from '../types/station';
import { formatValue, formatRelativeTime, isStale } from '../utils/aqiUtils';
import { getSeverity } from '../utils/severityEngine';
import type { ContextualMeasurement } from '../types/pollutant';

export interface StationCardObservation extends Partial<Observation> {
  data_type?: 'observed' | 'predicted';
  has_data?: boolean;
  model_name?: string;
}

export interface StationCardProps {
  observation?: Observation | StationCardObservation;
  station?: Station;
  isSelected?: boolean;
  onClick?: () => void;
  mode?: 'live' | 'historical' | 'forecast';
  selectedDate?: string;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement) => void;
}

export const StationCard: React.FC<StationCardProps> = ({
  observation: obs,
  station,
  isSelected = false,
  onClick,
  mode = 'live',
  selectedDate,
  onOpenPollutantInfo,
}) => {
  const extraObs = obs as StationCardObservation | undefined;
  const isForecast = mode === 'forecast' || extraObs?.data_type === 'predicted';
  const hasData = obs && extraObs?.has_data !== false && (obs.pm25 !== null || obs.aqi !== null);
  const stale = !isForecast && obs?.recorded_at ? isStale(obs.recorded_at) : false;

  const stationName = obs?.station_name || station?.name || 'Monitoring Station';
  const city = obs?.city || station?.city || 'India';
  const state = obs?.state || station?.state || '';
  const stationCode = obs?.station_code || station?.station_code;
  const source = obs?.source || station?.source_type || 'OpenAQ';

  const pm25Val = obs?.pm25 != null ? Number(obs.pm25) : null;
  const aqiVal = obs?.aqi != null ? Number(obs.aqi) : null;

  // Derive CPCB severity level from real data
  const severity = hasData
    ? pm25Val !== null
      ? getSeverity('pm25', pm25Val, isForecast, extraObs?.model_name)
      : aqiVal !== null
      ? getSeverity('aqi', aqiVal, false)
      : null
    : null;

  // Pollutants present in real observation
  const availablePollutants: Array<{
    id: string;
    label: string;
    val: number | null | undefined;
    unit: string;
  }> = [];

  if (obs) {
    if (obs.pm25 != null) availablePollutants.push({ id: 'pm25', label: 'PM2.5', val: obs.pm25, unit: 'µg/m³' });
    if (obs.pm10 != null) availablePollutants.push({ id: 'pm10', label: 'PM10', val: obs.pm10, unit: 'µg/m³' });
    if (obs.no2 != null) availablePollutants.push({ id: 'no2', label: 'NO₂', val: obs.no2, unit: 'µg/m³' });
    if (obs.so2 != null) availablePollutants.push({ id: 'so2', label: 'SO₂', val: obs.so2, unit: 'µg/m³' });
    if (obs.o3 != null) availablePollutants.push({ id: 'o3', label: 'O₃', val: obs.o3, unit: 'µg/m³' });
    if (obs.co != null) availablePollutants.push({ id: 'co', label: 'CO', val: obs.co, unit: 'mg/m³' });
  }

  return (
    <article
      className={`nature-station-card ${isSelected ? 'selected' : ''} ${!hasData ? 'no-readings' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-pressed={isSelected}
      aria-label={`Station ${stationName}, ${city}, ${state}`}
    >
      {/* Top Meta Bar */}
      <div className="card-top-bar">
        <div className="station-identity">
          <div className="station-code-chip">{stationCode || 'STN'}</div>
          <div className="station-source-pill">{source.toUpperCase()}</div>
        </div>

        {/* Severity / Status Chip */}
        {hasData && severity && severity.status === 'valid' ? (
          <div
            className="card-severity-tag"
            style={{
              backgroundColor: severity.bg_color,
              color: severity.color,
              borderColor: `${severity.color}66`,
            }}
          >
            <span className="severity-pulse-dot" style={{ backgroundColor: severity.color }} />
            <span className="severity-text">{severity.category?.toUpperCase()}</span>
            <span className="severity-tier">T{severity.severity_level}</span>
          </div>
        ) : (
          <div className="card-severity-tag inactive">
            <span className="dot gray" />
            <span className="severity-text">PENDING READINGS</span>
          </div>
        )}
      </div>

      {/* Station Name & Location */}
      <div className="station-heading-group">
        <h3 className="station-name-title" title={stationName}>
          {stationName}
        </h3>
        <p className="station-geo-sub">
          📍 {city}{state ? `, ${state}` : ''}
        </p>
      </div>

      {/* Primary Measurement Highlight */}
      {hasData ? (
        <div className="primary-metric-highlight">
          <div className="metric-badge-container">
            <span className="primary-metric-label">
              {isForecast ? '5-Day Predicted PM2.5' : aqiVal !== null ? 'CPCB NAQI Index' : 'Dominant: PM2.5'}
            </span>
            <div className="primary-metric-value-row">
              <span className="primary-val-num">
                {aqiVal !== null ? Math.round(aqiVal) : pm25Val !== null ? Math.round(pm25Val) : '—'}
              </span>
              <span className="primary-val-unit">
                {aqiVal !== null ? 'Index' : 'µg/m³'}
              </span>
            </div>
          </div>
          <div className="primary-metric-implication">
            {severity?.health_implication || (aqiVal !== null ? 'CPCB Ambient Standard' : 'Particulate matter')}
          </div>
        </div>
      ) : (
        <div className="no-data-card-banner">
          <span className="banner-icon">ℹ️</span>
          <div className="banner-text">
            <strong>No current ground readings</strong>
            <span>Readings pending from station sensor</span>
          </div>
        </div>
      )}

      {/* Available Pollutants Grid (Only measured parameters) */}
      {hasData && availablePollutants.length > 0 && (
        <div className="card-pollutants-row">
          {availablePollutants.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className={`pollutant-mini-pill ${onOpenPollutantInfo ? 'interactive' : ''}`}
              onClick={(e) => {
                if (onOpenPollutantInfo) {
                  e.stopPropagation();
                  onOpenPollutantInfo(p.id, {
                    metric: p.id,
                    pollutantName: p.label,
                    value: p.val,
                    unit: p.unit,
                    stationName,
                    dateOrTimestamp: obs?.recorded_at || selectedDate,
                    source,
                    dataType: isForecast ? 'predicted' : 'observed',
                  });
                }
              }}
              title={onOpenPollutantInfo ? `Click to inspect ${p.label} info` : undefined}
            >
              <span className="pill-name">{p.label}</span>
              <span className="pill-val">{formatValue(p.val, p.unit)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Card Footer: Timestamp & Freshness */}
      <div className="card-footer-meta">
        <span className={`freshness-indicator ${stale ? 'stale' : hasData ? 'fresh' : 'idle'}`}>
          {hasData
            ? stale
              ? `⚠ Stale · ${formatRelativeTime(obs?.recorded_at)}`
              : `● Live · ${formatRelativeTime(obs?.recorded_at)}`
            : 'Station Registered'}
        </span>
        <span className="select-action-hint">
          {isSelected ? '✓ Selected' : 'Click to inspect →'}
        </span>
      </div>
    </article>
  );
};

export const StationCardSkeleton: React.FC = () => {
  return (
    <div className="nature-station-card skeleton" aria-hidden="true">
      <div className="card-top-bar">
        <div className="skeleton-box chip" />
        <div className="skeleton-box badge" />
      </div>
      <div className="skeleton-box title" />
      <div className="skeleton-box subtitle" />
      <div className="skeleton-box metric-block" />
      <div className="card-footer-meta">
        <div className="skeleton-box footer-left" />
        <div className="skeleton-box footer-right" />
      </div>
    </div>
  );
};
