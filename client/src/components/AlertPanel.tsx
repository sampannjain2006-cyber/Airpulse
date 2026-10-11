import React, { useState, useEffect } from 'react';
import type { EnvironmentalAlert, AlertSummaryResponse } from '../types/alert';
import type { ContextualMeasurement } from '../types/pollutant';

interface AlertPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  observedAlerts: EnvironmentalAlert[];
  forecastAlerts: EnvironmentalAlert[];
  summary: AlertSummaryResponse | null;
  loading: boolean;
  error?: string | null;
  selectedThreshold: string;
  onSelectThreshold: (category: string) => void;
  onSelectStation?: (stationId: number) => void;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement) => void;
  mode: 'live' | 'historical' | 'forecast';
  selectedDate: string;
  selectedModel: string;
}

const THRESHOLD_OPTIONS = [
  { key: 'moderate', label: 'Moderate+ (Tier 3)' },
  { key: 'poor', label: 'Poor+ (Tier 4) · Default' },
  { key: 'very_poor', label: 'Very Poor+ (Tier 5)' },
  { key: 'severe', label: 'Severe Only (Tier 6)' },
];

export const AlertPanel: React.FC<AlertPanelProps> = ({
  isOpen,
  onToggle,
  observedAlerts,
  forecastAlerts,
  summary,
  loading,
  error,
  selectedThreshold,
  onSelectThreshold,
  onSelectStation,
  onOpenPollutantInfo,
  mode,
  selectedDate,
  selectedModel,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'observed' | 'forecast'>('all');
  const isHistorical = mode === 'historical';

  // Handle Escape key to close the drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggle();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  const totalObserved = observedAlerts.length;
  const totalForecast = forecastAlerts.length;
  const activeCount = (isHistorical ? 0 : totalObserved) + totalForecast;
  const criticalCount = summary
    ? summary.observed.high_severity_count + summary.forecast.high_severity_count
    : 0;

  // Filter based on active tab
  const displayAlerts =
    activeTab === 'observed'
      ? observedAlerts
      : activeTab === 'forecast'
      ? forecastAlerts
      : [...observedAlerts, ...forecastAlerts];

  return (
    <div
      className="alert-drawer-overlay"
      onClick={onToggle}
      role="dialog"
      aria-modal="true"
      aria-label="Environmental Alerts Drawer"
    >
      <div className="alert-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Panel Header */}
        <div className="alert-panel-header">
          <div className="alert-panel-header-left">
            <div className="alert-badge-wrap">
              <span className="alert-pulse-dot" aria-hidden="true" />
              <h2 className="alert-header-title">Environmental Alerts</h2>
            </div>
            <div className="alert-header-chips">
              <span className="alert-count-chip">
                {loading ? 'Evaluating…' : `${activeCount} Event${activeCount !== 1 ? 's' : ''}`}
              </span>
              {criticalCount > 0 && (
                <span className="alert-high-severity-chip" title="Events at Very Poor or Severe (Tier 5+)">
                  {criticalCount} Critical
                </span>
              )}
            </div>
          </div>

          <div className="alert-panel-header-right">
            {/* Threshold Configuration Selector */}
            <div className="threshold-selector-wrap">
              <label htmlFor="alert-rule-select" className="threshold-label">Threshold:</label>
              <select
                id="alert-rule-select"
                className="threshold-select"
                value={selectedThreshold}
                onChange={(e) => onSelectThreshold(e.target.value)}
                title="Configured minimum severity category that triggers an alert"
              >
                {THRESHOLD_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn-close-alert-panel"
              onClick={onToggle}
              title="Close Alerts Drawer (Esc)"
              aria-label="Close Alerts Drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="alert-tabs-bar" role="tablist" aria-label="Alert category filters">
          <button
            className={`alert-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            role="tab"
            aria-selected={activeTab === 'all'}
          >
            <span>All Alerts</span>
            <span className="tab-pill-count">{displayAlerts.length}</span>
          </button>
          <button
            className={`alert-tab-btn ${activeTab === 'observed' ? 'active' : ''}`}
            onClick={() => setActiveTab('observed')}
            role="tab"
            aria-selected={activeTab === 'observed'}
          >
            <span>Observed Ground Data</span>
            <span className="tab-pill-count">{totalObserved}</span>
          </button>
          <button
            className={`alert-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
            role="tab"
            aria-selected={activeTab === 'forecast'}
          >
            <span>5-Day Forecasts</span>
            <span className="tab-pill-count">{totalForecast}</span>
          </button>
        </div>

        {/* Historical Inactive Notice */}
        {isHistorical && (
          <div className="alert-historical-banner">
            <span className="hist-icon">ℹ</span>
            <div>
              <strong>Historical Inspection Mode ({selectedDate}):</strong>
              <span>
                {' '}Past exceedances are labeled as Historical Events. They do not constitute current active alerts.
              </span>
            </div>
          </div>
        )}

        {/* Alerts List Body */}
        <div className="alert-list-body">
          {error ? (
            <div className="alert-error-state">
              <div className="error-icon" aria-hidden="true">⚠️</div>
              <h4>Unable to Retrieve Environmental Alerts</h4>
              <p>
                The monitoring server could not return current telemetry alerts: {error}
              </p>
            </div>
          ) : loading ? (
            <div className="alert-loading-state">
              <div className="pulse-indicator healthy" style={{ margin: '0 auto 12px auto' }} />
              <span>Evaluating active ground telemetry and 5-day predictive forecasts against CPCB thresholds…</span>
            </div>
          ) : displayAlerts.length === 0 ? (
            <div className="alert-empty-state">
              <div className="empty-shield-icon" aria-hidden="true">🛡</div>
              <h4>No Active Alerts</h4>
              <p>
                No monitoring stations currently meet or exceed the selected threshold ({selectedThreshold.replace('_', ' ')}) for this time horizon.
              </p>
              <div className="empty-state-hint">
                Threshold criteria adhere to CPCB National Air Quality Index standards. You can adjust the sensitivity using the Threshold selector above.
              </div>
            </div>
          ) : (
            <div className="alert-cards-container">
              {displayAlerts.map((alert) => {
                const isObs = alert.alert_type === 'observed';
                const hasValidSubIndex =
                  alert.pollutant.sub_index != null &&
                  !isNaN(Number(alert.pollutant.sub_index));

                return (
                  <article
                    key={alert.id}
                    className={`alert-card tier-${alert.severity.level} ${alert.is_historical ? 'historical' : ''}`}
                    onClick={() => {
                      if (onSelectStation && alert.station.id) {
                        onSelectStation(alert.station.id);
                        onToggle();
                      }
                    }}
                  >
                    {/* Top Row: Type Badge + Severity Badge */}
                    <div className="alert-card-top">
                      <div className="alert-type-pill-wrap">
                        <span className={`alert-type-indicator ${isObs ? 'obs' : 'pred'}`}>
                          {isObs ? '● Observed Ground Data' : '🔮 5-Day ML Forecast'}
                        </span>
                        {alert.is_historical && (
                          <span className="alert-hist-tag">HISTORICAL EVENT</span>
                        )}
                      </div>

                      <div
                        className="alert-severity-badge"
                        style={{
                          backgroundColor: alert.severity.bg_color,
                          borderColor: alert.severity.color,
                          color: alert.severity.color,
                        }}
                      >
                        <span
                          className="alert-severity-dot"
                          style={{ backgroundColor: alert.severity.color }}
                        />
                        <strong>{alert.severity.category.toUpperCase()}</strong>
                        <span>Tier {alert.severity.level}/6</span>
                      </div>
                    </div>

                    {/* Main Station & Location Title */}
                    <div className="alert-station-info">
                      <div className="alert-station-name">{alert.station.name}</div>
                      <div className="alert-location-sub">
                        {alert.station.city}, {alert.station.state} · Code: <code>{alert.station.code}</code>
                      </div>
                    </div>

                    {/* Metric and Value Row */}
                    <div className="alert-metric-row">
                      <div className="alert-metric-box">
                        <span className="metric-box-label">Exceeding Pollutant:</span>
                        <button
                          type="button"
                          className="metric-box-val-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenPollutantInfo) {
                              onOpenPollutantInfo(alert.pollutant.id, {
                                metric: alert.pollutant.id,
                                pollutantName: alert.pollutant.name,
                                value: alert.pollutant.value,
                                unit: alert.pollutant.unit,
                                stationName: alert.station.name,
                                dateOrTimestamp: (alert.provenance.recorded_at || alert.provenance.target_date) ?? undefined,
                                source: alert.provenance.provider,
                                dataType: alert.alert_type,
                                severityCategory: alert.severity.category,
                                severityColor: alert.severity.color,
                              });
                            }
                          }}
                          title={`Click to inspect authoritative definitions for ${alert.pollutant.name}`}
                        >
                          <span className="p-name">{alert.pollutant.name}</span>
                          <span className="p-val">
                            {alert.pollutant.value} <small>{alert.pollutant.unit}</small> ⓘ
                          </span>
                        </button>
                      </div>

                      {hasValidSubIndex ? (
                        <div className="alert-subindex-box">
                          <span className="subindex-label">CPCB Sub-Index:</span>
                          <span className="subindex-val">{alert.pollutant.sub_index}</span>
                        </div>
                      ) : (
                        <div className="alert-subindex-box unavailable">
                          <span className="subindex-label">CPCB Sub-Index:</span>
                          <span className="subindex-val-unavailable">Sub-index unavailable</span>
                        </div>
                      )}

                      {!isObs && (
                        alert.pollutant.lower_bound != null && alert.pollutant.upper_bound != null ? (
                          <div className="alert-ci-box">
                            <span className="ci-label">Forecast CI:</span>
                            <span className="ci-val font-mono">
                              {alert.pollutant.lower_bound} – {alert.pollutant.upper_bound} µg/m³
                            </span>
                          </div>
                        ) : null
                      )}
                    </div>

                    {/* Explanation section: Clear non-technical trigger explanation */}
                    <div className="alert-rule-desc">
                      <span className="rule-icon" aria-hidden="true">⚠️</span>
                      <div className="rule-content">
                        <div className="rule-heading">
                          <strong>Exceeded Threshold:</strong> {alert.rule_triggered}
                        </div>
                        <div className="rule-detail">
                          {isObs
                            ? 'Based on authentic ground telemetry recorded by CPCB/OpenAQ sensors.'
                            : `Predicted by ${alert.provenance.model_name || 'machine learning ensemble'} based on historic patterns.`}
                          {alert.severity.health_implication && (
                            <span className="rule-health-note">
                              {' '}Impact: {alert.severity.health_implication}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Provenance & Timestamps */}
                    <div className="alert-card-footer">
                      <div className="alert-provenance-text">
                        {isObs ? (
                          <>
                            <span>Provider: <strong>{alert.provenance.provider}</strong></span>
                            <span className="footer-dot">·</span>
                            <span>Recorded:{' '}
                              <strong>
                                {alert.provenance.recorded_at
                                  ? new Date(alert.provenance.recorded_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Ground Sensor'}
                              </strong>
                            </span>
                          </>
                        ) : (
                          <>
                            <span>Model: <strong>{alert.provenance.model_name}</strong></span>
                            <span className="footer-dot">·</span>
                            <span>Target Date: <strong>{alert.provenance.target_date}</strong></span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        className="btn-locate-station"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStation && alert.station.id) {
                            onSelectStation(alert.station.id);
                            onToggle();
                          }
                        }}
                        title={`Locate ${alert.station.name} on the map`}
                      >
                        Locate on Map →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="alert-panel-footer">
          <span className="footer-rule-notice">
            CPCB NAQI Standards · Model: <strong>{selectedModel}</strong> · Verified Provenance
          </span>
          <button type="button" className="btn-close-alert-footer" onClick={onToggle}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
