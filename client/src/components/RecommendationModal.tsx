import React, { useState, useEffect } from 'react';
import type { Station } from '../types/station';
import type { RecommendationResponse } from '../types/recommendation';
import { recommendationsApi } from '../api/recommendations';

interface RecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  station?: Station | null;
  pollutant?: string;
  value?: number | null;
  severityTier?: number | null;
  mode: 'live' | 'historical' | 'forecast';
  selectedDate: string;
  selectedModel: string;
  dataType?: 'observed' | 'predicted' | 'modelled';
  onOpenPollutantInfo?: (pollutantId: string) => void;
}

export const RecommendationModal: React.FC<RecommendationModalProps> = ({
  isOpen,
  onClose,
  station,
  pollutant = 'pm25',
  value,
  severityTier,
  mode,
  selectedDate,
  selectedModel,
  dataType,
  onOpenPollutantInfo,
}) => {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>(pollutant || 'pm25');

  // Synchronize metric with prop
  useEffect(() => {
    if (pollutant) setSelectedMetric(pollutant);
  }, [pollutant]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Fetch recommendations whenever modal opens or context changes
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setLoading(true);
    setError(null);

    recommendationsApi
      .get({
        station_id: station?.id,
        pollutant: selectedMetric,
        value: value != null ? value : undefined,
        severity_tier: severityTier != null ? severityTier : undefined,
        mode,
        date: selectedDate,
        model: selectedModel,
        data_type: dataType,
        target_audience: selectedAudience !== 'all' ? selectedAudience : undefined,
      })
      .then((res) => {
        if (isCancelled) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[Recommendations] Fetch error:', err.message);
        setError(err.response?.data?.error?.message || err.message || 'Failed to evaluate recommendations.');
        setData(null);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    station?.id,
    selectedMetric,
    value,
    severityTier,
    mode,
    selectedDate,
    selectedModel,
    dataType,
    selectedAudience,
  ]);

  if (!isOpen) return null;

  const isHistorical = mode === 'historical';
  const isForecast = mode === 'forecast' || dataType === 'predicted';
  const isModelled = dataType === 'modelled';

  const recommendations = data?.recommendations || [];
  const context = data?.context;

  return (
    <div
      className="rec-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rec-modal-title"
      aria-describedby="rec-modal-description"
    >
      <div className="rec-modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="rec-modal-header">
          <div className="rec-header-left">
            <div className="rec-badge-row">
              <span className="rec-tag">PUBLIC HEALTH GUIDANCE</span>
              <span
                className={`rec-context-chip ${
                  isHistorical
                    ? 'historical'
                    : isForecast
                    ? 'forecast'
                    : isModelled
                    ? 'modelled'
                    : 'observed'
                }`}
              >
                {isHistorical
                  ? '🕒 HISTORICAL RECORD'
                  : isForecast
                  ? '🔮 5-DAY FORECAST'
                  : isModelled
                  ? '🌐 AMBIENT ESTIMATE'
                  : '● OBSERVED AIR QUALITY'}
              </span>
            </div>
            <h2 className="rec-title" id="rec-modal-title">
              Health Precautions &amp; Actions
            </h2>
            <p className="rec-subtitle" id="rec-modal-description">
              Verified exposure-reduction guidance based on CPCB NAQI &amp; WHO health guidelines
            </p>
          </div>

          <button
            type="button"
            className="btn-close-rec-modal"
            onClick={onClose}
            title="Close precautions modal (Esc)"
            aria-label="Close Precaution Recommendations"
          >
            ✕
          </button>
        </header>

        {/* Location & Context Summary Bar */}
        <div
          className="rec-context-bar"
          role="region"
          aria-label="Monitoring Station and Pollutant Summary"
        >
          <div className="rec-context-card">
            <span className="rec-context-label">
              <span className="rec-context-icon" aria-hidden="true">📍</span> Monitoring Station
            </span>
            <strong
              className="rec-context-val"
              title={station ? `${station.name}, ${station.city}, ${station.state}` : 'Active Selection'}
            >
              {station ? `${station.name} (${station.city})` : 'Active Selection / Regional'}
            </strong>
          </div>

          <div className="rec-context-card">
            <label htmlFor="rec-pollutant-dropdown" className="rec-context-label">
              <span className="rec-context-icon" aria-hidden="true">🔬</span> Evaluated Pollutant
            </label>
            <select
              id="rec-pollutant-dropdown"
              className="rec-pollutant-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              title="Switch evaluated atmospheric pollutant"
              aria-label="Select evaluated atmospheric pollutant"
            >
              <option value="pm25">PM2.5 (Fine Particulates)</option>
              <option value="pm10">PM10 (Coarse Particulates)</option>
              <option value="no2">NO₂ (Nitrogen Dioxide)</option>
              <option value="so2">SO₂ (Sulfur Dioxide)</option>
              <option value="co">CO (Carbon Monoxide)</option>
              <option value="o3">O₃ (Ground-level Ozone)</option>
            </select>
          </div>

          {context?.severity && (
            <div className="rec-context-card severity-card">
              <span className="rec-context-label">
                <span className="rec-context-icon" aria-hidden="true">🛡️</span> Air Quality Severity
              </span>
              <div
                className={`rec-severity-pill tier-${context.severity.level}`}
                style={{
                  backgroundColor: context.severity.bg_color,
                  borderColor: context.severity.color,
                }}
              >
                <span
                  className="rec-severity-dot"
                  style={{ backgroundColor: context.severity.color }}
                  aria-hidden="true"
                />
                <strong
                  className="rec-severity-name"
                  style={{ color: context.severity.color }}
                >
                  {context.severity.category.toUpperCase()}
                </strong>
                <span className="rec-severity-tier">Tier {context.severity.level}/6</span>
              </div>
            </div>
          )}

          <div className="rec-context-card">
            <span className="rec-context-label">
              <span className="rec-context-icon" aria-hidden="true">⏱️</span> Time Horizon
            </span>
            <span className="rec-context-val font-mono">
              {isForecast
                ? `Forecast: ${selectedDate} (${selectedModel})`
                : isHistorical
                ? `Historical: ${selectedDate}`
                : context?.date_or_timestamp
                ? new Date(context.date_or_timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Current Readings'}
            </span>
          </div>
        </div>

        {/* Historical Notice */}
        {isHistorical && (
          <div className="rec-historical-notice" role="note">
            <span className="hist-icon" aria-hidden="true">ℹ</span>
            <div className="hist-text-wrap">
              <strong>Historical Analysis Mode ({selectedDate}):</strong>
              <span>
                {' '}These recommendations reflect verified criteria that applied to conditions on this past date. They do not constitute current active health alerts.
              </span>
            </div>
          </div>
        )}

        {/* Target Audience Filters */}
        <div
          className="rec-audience-tabs"
          role="tablist"
          aria-label="Filter recommendations by target demographic"
        >
          {[
            { id: 'all', label: 'All Audiences' },
            { id: 'general_public', label: 'General Public' },
            { id: 'sensitive_groups', label: 'Sensitive Groups (Asthma, Elderly, Children)' },
            { id: 'outdoor_workers', label: 'Outdoor Workers & Transit' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rec-tab-btn ${selectedAudience === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedAudience(tab.id)}
              role="tab"
              aria-selected={selectedAudience === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="rec-modal-body">
          {loading ? (
            <div className="rec-loading-state" role="status">
              <div className="pulse-indicator healthy" style={{ margin: '0 auto 12px auto' }} />
              <span>Evaluating environmental severity against authoritative public health rules…</span>
            </div>
          ) : error ? (
            <div className="rec-error-state" role="alert">
              <span className="error-icon" aria-hidden="true">⚠️</span>
              <h4>Unable to Retrieve Recommendations</h4>
              <p>{error}</p>
            </div>
          ) : data?.status === 'unavailable' || recommendations.length === 0 ? (
            <div className="rec-empty-state">
              <div className="empty-shield-icon" aria-hidden="true">🛡</div>
              <h4>No Active Precautions Required</h4>
              <p>
                {data?.reason ||
                  'Current air quality measurements are within acceptable thresholds for this pollutant and demographic group. No special protective measures are mandated.'}
              </p>
              <div className="rec-empty-hint">
                Threshold criteria strictly adhere to Central Pollution Control Board (CPCB) NAQI guidelines and WHO Air Quality standards.
              </div>
            </div>
          ) : (
            <div className="rec-cards-list">
              {recommendations.map((rec) => {
                const isHighPriority = rec.priority === 1;
                return (
                  <article
                    key={rec.id}
                    className={`rec-card priority-${rec.priority} ${isHighPriority ? 'high-priority' : ''}`}
                  >
                    {/* Card Top Row */}
                    <header className="rec-card-top">
                      <div className="rec-priority-wrap">
                        <span className={`rec-priority-badge p${rec.priority}`}>
                          {rec.priority === 1
                            ? 'Priority 1 · Immediate Exposure Reduction'
                            : rec.priority === 2
                            ? 'Priority 2 · Protective Guidance'
                            : 'Priority 3 · Advance Precautionary Planning'}
                        </span>
                        <span className="rec-audience-chip">
                          {rec.target_audience === 'general_public'
                            ? 'General Public'
                            : rec.target_audience === 'sensitive_groups'
                            ? 'Sensitive Groups'
                            : rec.target_audience === 'outdoor_workers'
                            ? 'Outdoor Workers'
                            : 'All Audiences'}
                        </span>
                      </div>

                      <span
                        className={`rec-pollutant-badge ${onOpenPollutantInfo ? 'clickable' : ''}`}
                        onClick={() => {
                          if (onOpenPollutantInfo) {
                            onOpenPollutantInfo(selectedMetric);
                          }
                        }}
                        role={onOpenPollutantInfo ? 'button' : undefined}
                        tabIndex={onOpenPollutantInfo ? 0 : undefined}
                        onKeyDown={(e) => {
                          if (onOpenPollutantInfo && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onOpenPollutantInfo(selectedMetric);
                          }
                        }}
                        title={
                          onOpenPollutantInfo
                            ? `Click to inspect authoritative definitions for ${rec.applicable_pollutant}`
                            : undefined
                        }
                      >
                        {rec.applicable_pollutant} {onOpenPollutantInfo ? 'ⓘ' : ''}
                      </span>
                    </header>

                    {/* Card Title & Recommended Action */}
                    <div className="rec-card-body-content">
                      <h3 className="rec-card-title">{rec.title}</h3>
                      <div className="rec-action-container">
                        <span className="rec-action-label">Recommended Action:</span>
                        <p className="rec-card-explanation">{rec.explanation}</p>
                      </div>
                    </div>

                    {/* Rationale & Trigger Box */}
                    <div className="rec-rationale-box">
                      <div className="rationale-item">
                        <strong className="rationale-heading">Why This Applies:</strong>
                        <span className="rationale-desc">{rec.rationale}</span>
                      </div>
                      <div className="trigger-item">
                        <strong className="trigger-heading">Trigger Condition:</strong>
                        <span className="trigger-desc">{rec.trigger_description}</span>
                      </div>
                    </div>

                    {/* Scope & Limitation Disclaimer */}
                    {rec.disclaimer && (
                      <div className="rec-disclaimer-box" role="alert">
                        <div className="disclaimer-header-row">
                          <span className="disclaimer-icon" aria-hidden="true">⚠️</span>
                          <strong className="disclaimer-heading">CRITICAL SAFETY LIMITATION</strong>
                        </div>
                        <p className="disclaimer-text">{rec.disclaimer}</p>
                      </div>
                    )}

                    {/* Footer: Source Link & Citation */}
                    <footer className="rec-card-footer">
                      <div className="rec-source-citation">
                        <span className="rec-source-prefix">Authoritative Source:</span>{' '}
                        <strong className="rec-source-name">{rec.source.name}</strong> ·{' '}
                        <span className="rec-source-doc">{rec.source.document}</span>
                      </div>
                      <a
                        href={rec.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rec-source-link"
                        title={`Inspect authoritative reference from ${rec.source.name}`}
                      >
                        <span>Official Reference</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="rec-modal-footer">
          <div className="rec-footer-disclaimer">
            <span className="disclaimer-symbol" aria-hidden="true">⚖</span>
            <span>
              <strong>Regulatory &amp; Medical Scope:</strong> Recommendations are educational guidelines derived from published CPCB and WHO criteria. They do not constitute personalized medical diagnosis or treatment.
            </span>
          </div>
          <button type="button" className="btn-done-rec" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};
