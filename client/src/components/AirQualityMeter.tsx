import React from 'react';
import type { Observation } from '../types/observation';
import type { Station } from '../types/station';
import type { ContextualMeasurement } from '../types/pollutant';
import { getSeverity, CPCB_CATEGORIES, RULE_SOURCE } from '../utils/severityEngine';
import { formatValue } from '../utils/aqiUtils';

interface AirQualityMeterProps {
  observation?: Observation | null;
  station?: Station | null;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement) => void;
  className?: string;
}

export const AirQualityMeter: React.FC<AirQualityMeterProps> = ({
  observation,
  station,
  onOpenPollutantInfo,
  className = '',
}) => {
  const hasAqi = observation?.aqi != null && !isNaN(Number(observation.aqi));
  const hasPm25 = observation?.pm25 != null && !isNaN(Number(observation.pm25));
  const hasPm10 = observation?.pm10 != null && !isNaN(Number(observation.pm10));

  // Determine primary metric and severity evaluation
  let primaryMetric = 'aqi';
  let primaryValue: number | null = null;
  let isAuthoritativeAqi = false;

  if (hasAqi) {
    primaryMetric = 'aqi';
    primaryValue = Number(observation!.aqi);
    isAuthoritativeAqi = true;
  } else if (hasPm25) {
    primaryMetric = 'pm25';
    primaryValue = Number(observation!.pm25);
  } else if (hasPm10) {
    primaryMetric = 'pm10';
    primaryValue = Number(observation!.pm10);
  }

  const severity = primaryValue !== null
    ? getSeverity(primaryMetric, primaryValue, false)
    : null;

  const isAvailable = severity && severity.status === 'valid' && severity.value !== null;
  const activeLevel = isAvailable ? severity.severity_level || 1 : null;
  const subIndex = severity?.aqi_sub_index ?? (isAuthoritativeAqi ? primaryValue : null);

  // Gauge pointer calculation across 0-500 scale
  const pointerPercent = subIndex !== null
    ? Math.min(100, Math.max(0, (subIndex / 500) * 100))
    : activeLevel !== null
    ? ((activeLevel - 0.5) / 6) * 100
    : 0;

  if (!isAvailable) {
    return (
      <div className={`aqi-meter-card unavailable ${className}`}>
        <div className="aqi-meter-top">
          <div className="aqi-badge-group">
            <span className="aqi-type-tag unavailable">
              <span className="status-dot gray" />
              <span>AQI UNAVAILABLE</span>
            </span>
            <span className="aqi-standard-tag">{RULE_SOURCE}</span>
          </div>
        </div>

        <div className="aqi-unavailable-banner">
          <span className="warn-icon">⚠️</span>
          <div>
            <strong>Air Quality Index (AQI) Unavailable</strong>
            <p>
              This station currently reports no active particulate telemetry (PM2.5 or PM10) required to compute
              an official CPCB NAQI rating. Check individual pollutant readings below.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`aqi-meter-card ${className}`}>
      {/* Top Meta Bar */}
      <div className="aqi-meter-top">
        <div className="aqi-badge-group">
          <span className={`aqi-type-tag ${isAuthoritativeAqi ? 'authoritative' : 'subindex'}`}>
            <span className={`status-dot ${isAuthoritativeAqi ? 'cyan' : 'green'}`} />
            <span>
              {isAuthoritativeAqi
                ? 'OFFICIAL CPCB NAQI (AUTHORITATIVE)'
                : 'PRIMARY INDICATOR: CPCB PM2.5 SUB-INDEX'}
            </span>
          </span>

          {!isAuthoritativeAqi && (
            <span className="aqi-notice-chip" title="Full multi-pollutant AQI requires 3+ parameters">
              AQI unavailable (Single-pollutant telemetry)
            </span>
          )}
        </div>

        <div className="aqi-meter-actions">
          {onOpenPollutantInfo && (
            <button
              type="button"
              className="aqi-guide-btn"
              onClick={() =>
                onOpenPollutantInfo(primaryMetric, {
                  metric: primaryMetric,
                  pollutantName: severity.metric_display,
                  value: severity.value,
                  unit: severity.unit || 'µg/m³',
                  stationName: station?.name || 'Monitoring Station',
                  dateOrTimestamp: observation?.recorded_at,
                  source: observation?.source || station?.source_type || 'OpenAQ',
                  dataType: 'observed',
                  severityCategory: severity.category,
                  severityColor: severity.color,
                })
              }
              title={`Open scientific guide for ${severity.metric_display}`}
            >
              <span>ⓘ</span>
              <span>{severity.metric_display} Guide</span>
            </button>
          )}
          <span className="aqi-standard-tag">CPCB NAQI (2014)</span>
        </div>
      </div>

      {/* Main Metric Value and Category Row */}
      <div className="aqi-primary-value-row">
        <div className="aqi-numeric-box">
          <div className="aqi-metric-title">
            {isAuthoritativeAqi ? 'Air Quality Index' : `${severity.metric_display} Concentration`}
          </div>
          <div className="aqi-big-number">
            {isAuthoritativeAqi ? (
              Math.round(severity.value!)
            ) : (
              <>
                {formatValue(severity.value, '')}
                <small className="aqi-unit-inline">{severity.unit}</small>
              </>
            )}
          </div>
          {!isAuthoritativeAqi && subIndex !== null && (
            <div className="aqi-calculated-subindex">
              CPCB Sub-Index: <strong>{subIndex}</strong> (Calculated)
            </div>
          )}
        </div>

        <div className="aqi-category-box">
          <div
            className="aqi-category-pill"
            style={{
              backgroundColor: severity.bg_color,
              borderColor: severity.color,
              color: severity.color,
            }}
          >
            <span className="category-pulse-dot" style={{ backgroundColor: severity.color }} />
            <span className="category-name">{severity.category?.toUpperCase()}</span>
            <span className="tier-tag">Tier {severity.severity_level}/6</span>
          </div>
          <div className="category-health-desc">{severity.health_implication}</div>
        </div>
      </div>

      {/* Horizontal 6-Segment CPCB Gauge Bar */}
      <div className="aqi-gauge-container">
        <div className="aqi-gauge-track-wrap">
          {/* Animated/Positioned Pointer Pin */}
          <div
            className="aqi-gauge-pointer"
            style={{
              left: `${pointerPercent}%`,
              borderColor: `${severity.color} transparent transparent transparent`,
            }}
            title={`${severity.category} (Index: ${subIndex || severity.value})`}
          >
            <div className="pointer-value-bubble" style={{ backgroundColor: severity.color }}>
              {subIndex || Math.round(severity.value!)}
            </div>
          </div>

          {/* 6 Segments */}
          <div className="aqi-gauge-track">
            {CPCB_CATEGORIES.map((cat) => {
              const isCurrent = cat.level === activeLevel;
              const isFilled = activeLevel !== null && cat.level <= activeLevel;
              return (
                <div
                  key={cat.level}
                  className={`gauge-segment seg-${cat.level} ${isCurrent ? 'active' : ''} ${isFilled ? 'filled' : 'dimmed'}`}
                  style={{
                    backgroundColor: cat.color,
                    opacity: isCurrent ? 1 : isFilled ? 0.85 : 0.22,
                  }}
                  title={`${cat.name} (Tier ${cat.level}): ${cat.implication}`}
                />
              );
            })}
          </div>
        </div>

        {/* Segment Labels Under Track */}
        <div className="aqi-gauge-labels-row">
          {CPCB_CATEGORIES.map((cat) => {
            const isCurrent = cat.level === activeLevel;
            return (
              <div
                key={cat.level}
                className={`gauge-label-col ${isCurrent ? 'active' : ''}`}
                style={{ color: isCurrent ? cat.color : undefined }}
              >
                <span className="gauge-label-text">{cat.name}</span>
                <span className="gauge-label-range">
                  {cat.level === 1 && '0–50'}
                  {cat.level === 2 && '51–100'}
                  {cat.level === 3 && '101–200'}
                  {cat.level === 4 && '201–300'}
                  {cat.level === 5 && '301–400'}
                  {cat.level === 6 && '401–500'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
