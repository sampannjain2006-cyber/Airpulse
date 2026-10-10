import React from 'react';
import { getSeverity, CPCB_CATEGORIES, RULE_SOURCE } from '../utils/severityEngine';
import type { SeverityResult } from '../types/severity';

interface SeverityMeterProps {
  metric?: string;
  value: number | string | null | undefined;
  isPredicted?: boolean;
  dataType?: 'observed' | 'modelled' | 'predicted';
  modelName?: string | null;
  source?: string;
  targetDate?: string;
  recordedAt?: string;
  compact?: boolean;
  className?: string;
}

export const SeverityMeter: React.FC<SeverityMeterProps> = ({
  metric = 'pm25',
  value,
  isPredicted = false,
  dataType,
  modelName,
  source = 'OpenAQ',
  targetDate,
  recordedAt,
  compact = false,
  className = '',
}) => {
  const effectiveIsPredicted = isPredicted || dataType === 'predicted';
  const isModelled = dataType === 'modelled';
  const result: SeverityResult = getSeverity(metric, value, effectiveIsPredicted, modelName);

  if (result.status === 'unavailable' || result.value === null) {
    return (
      <div className={`severity-meter-container unavailable ${className}`}>
        <div className="severity-meter-header">
          <div className="severity-type-badge unavailable">
            <span className="dot gray" />
            <span className="type-text">
              {effectiveIsPredicted ? 'PREDICTED / ML FORECAST' : isModelled ? 'MODELLED / SPATIAL INTERPOLATION' : 'OBSERVED / GROUND MEASURED DATA'}
            </span>
          </div>
          <span className="severity-rule-tag">{RULE_SOURCE}</span>
        </div>

        <div className="severity-unavailable-body">
          <div className="severity-unavailable-icon">⚠</div>
          <div className="severity-unavailable-text">
            <strong>Data Unavailable</strong>
            <span>{result.reason || 'No concentration data for selected date or station.'}</span>
          </div>
        </div>
      </div>
    );
  }

  const activeLevel = result.severity_level || 1;
  const isForecast = result.is_predicted;

  const badgeClass = isForecast ? 'predicted' : isModelled ? 'modelled' : 'observed';
  const dotClass = isForecast ? 'purple' : isModelled ? 'amber' : 'cyan';
  const typeText = isForecast
    ? 'PREDICTED / ML FORECAST'
    : isModelled
    ? 'MODELLED / SPATIAL INTERPOLATION'
    : 'OBSERVED / GROUND MEASURED DATA';

  return (
    <div className={`severity-meter-container ${compact ? 'compact' : ''} ${className}`}>
      {/* Header Distinction Banner */}
      <div className="severity-meter-header">
        <div className={`severity-type-badge ${badgeClass}`}>
          <span className={`dot ${dotClass}`} />
          <span className="type-text">{typeText}</span>
          {isForecast && (
            <span className="model-chip">
              Model: {result.model_name === 'weighted_ensemble'
                ? 'Weighted Ensemble'
                : result.model_name === 'hist_gradient_boosting'
                ? 'HistGradientBoosting'
                : result.model_name === 'random_forest'
                ? 'Random Forest'
                : result.model_name || 'Ensemble'}
            </span>
          )}
          {isModelled && (
            <span className="model-chip modelled-chip">
              Provider: Google Air Quality
            </span>
          )}
        </div>
        <span className="severity-rule-tag">CPCB NAQI (2014)</span>
      </div>

      {/* Main Metric & Severity Category Badge */}
      <div className="severity-main-row">
        <div className="severity-val-col">
          <div className="severity-metric-label">
            {result.metric_display} {isForecast ? 'FORECAST' : 'CONCENTRATION'}
          </div>
          <div className="severity-numeric-val">
            {result.value} <span className="severity-unit">{result.unit}</span>
          </div>
        </div>

        <div className="severity-badge-col">
          <div
            className="severity-category-pill"
            style={{
              backgroundColor: result.bg_color,
              borderColor: result.color,
              color: result.color,
            }}
          >
            <span className="severity-pulse-dot" style={{ backgroundColor: result.color }} />
            <span className="severity-category-text">{result.category?.toUpperCase()}</span>
            <span className="severity-tier-num">Tier {result.severity_level}/6</span>
          </div>
          {result.aqi_sub_index != null && (
            <div className="severity-subindex-text">
              CPCB Sub-Index: <strong>{result.aqi_sub_index}</strong>
            </div>
          )}
        </div>
      </div>

      {/* 6-Stage Visual CPCB Severity Gauge */}
      <div className="severity-gauge-wrapper">
        <div className="severity-gauge-track">
          {CPCB_CATEGORIES.map((cat) => {
            const isCurrent = cat.level === activeLevel;
            const isPast = cat.level <= activeLevel;
            return (
              <div
                key={cat.level}
                className={`severity-gauge-segment segment-${cat.level} ${isCurrent ? 'active-segment' : ''} ${isPast ? 'filled-segment' : 'dimmed-segment'}`}
                style={{
                  backgroundColor: isCurrent ? cat.color : isPast ? `${cat.color}aa` : 'rgba(255,255,255,0.06)',
                  borderColor: isCurrent ? '#ffffff' : 'transparent',
                }}
                title={`${cat.name} (Tier ${cat.level}): ${cat.implication}`}
              >
                {isCurrent && <div className="segment-pointer-pin" style={{ backgroundColor: cat.color }} />}
              </div>
            );
          })}
        </div>

        {/* Level Legend Labels */}
        <div className="severity-gauge-labels">
          {CPCB_CATEGORIES.map((cat) => (
            <span
              key={cat.level}
              className={`gauge-label ${cat.level === activeLevel ? 'active-label' : ''}`}
              style={{ color: cat.level === activeLevel ? cat.color : undefined }}
            >
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Health / Impact Assessment */}
      {result.health_implication && (
        <div className="severity-impact-row">
          <span className="impact-icon">ℹ</span>
          <span className="impact-text">{result.health_implication}</span>
        </div>
      )}

      {/* Provenance & Audit Footer */}
      <div className="severity-meter-footer">
        {isForecast ? (
          <span>
            Target Date: <strong>{targetDate || 'Day +1'}</strong> · Standard: CPCB 24h Average
          </span>
        ) : (
          <span>
            Provider: <strong>{source}</strong> · {recordedAt ? `Observed: ${new Date(recordedAt).toLocaleString('en-IN')}` : 'Ground Telemetry'}
          </span>
        )}
      </div>
    </div>
  );
};
