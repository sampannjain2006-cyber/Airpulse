import React, { useState } from 'react';
import type { EnvironmentalAlert, AlertSummaryResponse } from '../types/alert';

interface AlertPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  observedAlerts: EnvironmentalAlert[];
  forecastAlerts: EnvironmentalAlert[];
  summary: AlertSummaryResponse | null;
  loading: boolean;
  selectedThreshold: string;
  onSelectThreshold: (category: string) => void;
  onSelectStation?: (stationId: number) => void;
  onOpenPollutantInfo?: (pollutantId: string, context?: any) => void;
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

  if (!isOpen) return null;

  const totalObserved = observedAlerts.length;
  const totalForecast = forecastAlerts.length;
  const activeCount = (isHistorical ? 0 : totalObserved) + totalForecast;

  // Filter based on active tab
  const displayAlerts =
    activeTab === 'observed'
      ? observedAlerts
      : activeTab === 'forecast'
      ? forecastAlerts
      : [...observedAlerts, ...forecastAlerts];

  return (
    <div className="alert-drawer-overlay">
      <div className="alert-drawer-panel">
        {/* Panel Header */}
        <div className="alert-panel-header">
          <div className="alert-panel-header-left">
            <div className="alert-badge-wrap">
              <span className="alert-pulse-dot" />
              <span className="alert-header-title">ENVIRONMENTAL ALERTS</span>
            </div>
            <span className="alert-count-chip">
              {loading ? 'EVALUATING…' : `${activeCount} QUALIFYING EVENT${activeCount !== 1 ? 'S' : ''}`}
            </span>
            {summary && (
              <span className="alert-high-severity-chip" title="Events at Very Poor or Severe (Tier 5+)">
                {summary.observed.high_severity_count + summary.forecast.high_severity_count} CRITICAL
              </span>
            )}
          </div>

          <div className="alert-panel-header-right">
            {/* Threshold Configuration Selector */}
            <div className="threshold-selector-wrap">
              <span className="threshold-label">Trigger Rule:</span>
              <select
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

            <button className="btn-close-alert-panel" onClick={onToggle} title="Close Alert Drawer">
              ✕
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="alert-tabs-bar">
          <button
            className={`alert-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Alerts</span>
            <span className="tab-pill-count">{displayAlerts.length}</span>
          </button>
          <button
            className={`alert-tab-btn ${activeTab === 'observed' ? 'active' : ''}`}
            onClick={() => setActiveTab('observed')}
          >
            <span>Observed Ground Telemetry</span>
            <span className="tab-pill-count">{totalObserved}</span>
          </button>
          <button
            className={`alert-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            <span>5-Day ML Forecasts</span>
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

        {/* Alerts List */}
        <div className="alert-list-body">
          {loading ? (
            <div className="alert-loading-state">
              <span>Evaluating environmental sensor streams against CPCB NAQI thresholds…</span>
            </div>
          ) : displayAlerts.length === 0 ? (
            <div className="alert-empty-state">
              <div className="empty-shield-icon">🛡</div>
              <h4>No Environmental Alerts Triggered</h4>
              <p>
                No reporting stations meet or exceed the configured <strong>{selectedThreshold.toUpperCase()}</strong> threshold for the selected time horizon.
              </p>
              <div className="empty-state-hint">
                Threshold rules follow the Central Pollution Control Board (CPCB) NAQI standard. You can adjust the trigger sensitivity using the selector above.
              </div>
            </div>
          ) : (
            <div className="alert-cards-container">
              {displayAlerts.map((alert) => {
                const isObs = alert.alert_type === 'observed';
                return (
                  <div
                    key={alert.id}
                    className={`alert-card tier-${alert.severity.level} ${alert.is_historical ? 'historical' : ''}`}
                    onClick={() => {
                      if (onSelectStation && alert.station.id) {
                        onSelectStation(alert.station.id);
                      }
                    }}
                  >
                    {/* Top Row: Type Badge + Severity Pill */}
                    <div className="alert-card-top">
                      <div className="alert-type-pill-wrap">
                        <span
                          className={`alert-type-indicator ${isObs ? 'obs' : 'pred'}`}
                        >
                          {isObs ? '📡 OBSERVED GROUND DATA' : '⚡ 5-DAY ML FORECAST'}
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
                                dateOrTimestamp: alert.provenance.recorded_at || alert.provenance.target_date,
                                source: alert.provenance.provider,
                                dataType: alert.alert_type,
                                severityCategory: alert.severity.category,
                                severityColor: alert.severity.color,
                              });
                            }
                          }}
                          title={`Click to inspect authoritative information for ${alert.pollutant.name}`}
                        >
                          <span className="p-name">{alert.pollutant.name}</span>
                          <span className="p-val">
                            {alert.pollutant.value} <small>{alert.pollutant.unit}</small> ⓘ
                          </span>
                        </button>
                      </div>

                      {alert.pollutant.sub_index != null && (
                        <div className="alert-subindex-box">
                          <span className="subindex-label">CPCB Sub-Index:</span>
                          <span className="subindex-val">{alert.pollutant.sub_index}</span>
                        </div>
                      )}

                      {!isObs && alert.pollutant.lower_bound != null && alert.pollutant.upper_bound != null && (
                        <div className="alert-ci-box">
                          <span className="ci-label">Forecast CI Range:</span>
                          <span className="ci-val font-mono">
                            {alert.pollutant.lower_bound} – {alert.pollutant.upper_bound} µg/m³
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rule Triggered Description */}
                    <div className="alert-rule-desc">
                      <span className="rule-icon">⚖</span>
                      <span>{alert.rule_triggered}</span>
                    </div>

                    {/* Footer: Provenance & Timestamps */}
                    <div className="alert-card-footer">
                      <div className="alert-provenance-text">
                        {isObs ? (
                          <>
                            Provider: <strong>{alert.provenance.provider}</strong> · Recorded:{' '}
                            {alert.provenance.recorded_at
                              ? new Date(alert.provenance.recorded_at).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Ground Sensor'}
                          </>
                        ) : (
                          <>
                            Model: <strong>{alert.provenance.model_name}</strong> · Target:{' '}
                            <strong>{alert.provenance.target_date}</strong>
                          </>
                        )}
                      </div>

                      <button
                        className="btn-locate-station"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectStation && alert.station.id) {
                            onSelectStation(alert.station.id);
                          }
                        }}
                      >
                        Locate on Map →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Footer */}
        <div className="alert-panel-footer">
          <span className="footer-rule-notice">
            CPCB NAQI Standards · Model: <strong>{selectedModel}</strong> · Pure Observation/Forecast Separation
          </span>
          <button className="btn-close-alert-footer" onClick={onToggle}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
