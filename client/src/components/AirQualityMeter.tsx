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

/**
 * Calibrate the 0-500 CPCB NAQI sub-index scale to the 6 equal-width gauge segments.
 * Segments:
 * 1. Good: 0–50       -> [0%, 16.67%]
 * 2. Satisfactory: 51–100 -> [16.67%, 33.33%]
 * 3. Moderate: 101–200 -> [33.33%, 50.00%]
 * 4. Poor: 201–300     -> [50.00%, 66.67%]
 * 5. Very Poor: 301–400-> [66.67%, 83.33%]
 * 6. Severe: 401–500   -> [83.33%, 100.00%]
 */
function getCpcbPointerPercent(subIndex: number | null, tierLevel: number | null): number {
  if (subIndex === null || isNaN(subIndex)) {
    if (tierLevel !== null && tierLevel >= 1 && tierLevel <= 6) {
      return ((tierLevel - 0.5) / 6) * 100;
    }
    return 0;
  }
  const val = Math.max(0, Math.min(500, subIndex));
  const segWidth = 100 / 6;

  if (val <= 50) {
    return (val / 50) * segWidth;
  } else if (val <= 100) {
    return segWidth + ((val - 50) / 50) * segWidth;
  } else if (val <= 200) {
    return 2 * segWidth + ((val - 100) / 100) * segWidth;
  } else if (val <= 300) {
    return 3 * segWidth + ((val - 200) / 100) * segWidth;
  } else if (val <= 400) {
    return 4 * segWidth + ((val - 300) / 100) * segWidth;
  } else {
    return 5 * segWidth + ((val - 400) / 100) * segWidth;
  }
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
  let primaryMetric = 'pm25';
  let primaryValue: number | null = null;
  let isAuthoritativeAqi = false;

  if (hasPm25) {
    // PM2.5 is the primary target pollutant for AirPulse
    primaryMetric = 'pm25';
    primaryValue = Number(observation!.pm25);
    if (hasAqi) isAuthoritativeAqi = true;
  } else if (hasAqi) {
    primaryMetric = 'aqi';
    primaryValue = Number(observation!.aqi);
    isAuthoritativeAqi = true;
  } else if (hasPm10) {
    primaryMetric = 'pm10';
    primaryValue = Number(observation!.pm10);
  }

  const severity = primaryValue !== null
    ? getSeverity(primaryMetric, primaryValue, false)
    : null;

  const isAvailable = severity && severity.status === 'valid' && severity.value !== null;
  const activeLevel = isAvailable ? severity.severity_level || 1 : null;
  const subIndex = severity?.aqi_sub_index ?? (isAuthoritativeAqi ? Number(observation?.aqi) : null);

  const pointerPercent = getCpcbPointerPercent(subIndex, activeLevel);

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
            <strong>Air Quality Readings Unavailable</strong>
            <p>
              This station currently reports no active particulate measurements (PM2.5 or PM10) required to compute
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
                ? 'OFFICIAL CPCB NAQI (MULTI-POLLUTANT)'
                : 'PRIMARY CONCENTRATION: GROUND PM2.5'}
            </span>
          </span>

          {!isAuthoritativeAqi && (
            <span className="aqi-notice-chip" title="Full multi-pollutant AQI requires ≥3 parameters with PM10 or PM2.5">
              Overall AQI unavailable (Single-pollutant reading)
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
            {primaryMetric === 'pm25'
              ? 'PM2.5 Concentration (24h Ground Average)'
              : primaryMetric === 'aqi'
              ? 'Official Air Quality Index'
              : `${severity.metric_display} Concentration`}
          </div>

          <div className="aqi-big-number">
            {primaryMetric === 'aqi' ? (
              Math.round(severity.value!)
            ) : (
              <>
                <span className="aqi-value-text">{formatValue(severity.value, '')}</span>
                <span className="aqi-unit-inline">{severity.unit || 'µg/m³'}</span>
              </>
            )}
          </div>

          <div className="aqi-subindex-row">
            {subIndex !== null && (
              <span className="aqi-calculated-subindex">
                CPCB PM2.5 Sub-Index: <strong>{subIndex}</strong> (Calculated)
              </span>
            )}
            {isAuthoritativeAqi && observation?.aqi != null && (
              <span className="aqi-authoritative-badge">
                · Official Multi-Pollutant AQI: <strong>{Math.round(Number(observation.aqi))}</strong>
              </span>
            )}
          </div>
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
          {/* Calibrated Position Pointer Pin */}
          <div
            className="aqi-gauge-pointer"
            style={{
              left: `${pointerPercent}%`,
              color: severity.color,
            }}
            title={`${severity.category} (Sub-Index: ${subIndex ?? severity.value})`}
          >
            <div className="pointer-value-bubble" style={{ backgroundColor: severity.color }}>
              {subIndex ?? Math.round(severity.value!)}
            </div>
            <div className="pointer-pin-arrow" style={{ borderTopColor: severity.color }} />
          </div>

          {/* 6 Equal-Width CPCB Segments */}
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
