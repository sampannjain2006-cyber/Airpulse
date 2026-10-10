import React, { useState, useEffect } from 'react';
import type { Station } from '../types/station';
import type {
  RecommendationResponse,
} from '../types/recommendation';
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
    <div className="rec-modal-overlay" onClick={onClose}>
      <div className="rec-modal-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rec-modal-header">
          <div className="rec-header-left">
            <div className="rec-badge-row">
              <span className="rec-tag">FEATURE 10 · PUBLIC HEALTH GUIDANCE</span>
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
                  ? '🕒 HISTORICAL EVENT'
                  : isForecast
                  ? '⚡ 5-DAY ML FORECAST'
                  : isModelled
                  ? '🌐 GOOGLE MODELLED'
                  : '📡 OBSERVED GROUND DATA'}
              </span>
            </div>
            <h3 className="rec-title">
              Context-Aware Precaution Recommendations
            </h3>
            <span className="rec-subtitle">
              Verified exposure-reduction guidance based on CPCB NAQI (2014) &amp; WHO Global Guidelines (2021)
            </span>
          </div>

          <button className="btn-close-rec-modal" onClick={onClose} title="Close precautions modal">
            ✕
          </button>
        </div>

        {/* Context Status Bar */}
        <div className="rec-context-bar">
          <div className="rec-context-item">
            <span className="rec-context-label">Location:</span>
            <strong className="rec-context-val">
              {station ? `${station.name} (${station.city})` : 'Active Selection'}
            </strong>
          </div>

          <div className="rec-context-item">
            <span className="rec-context-label">Evaluating Pollutant:</span>
            <select
              className="rec-pollutant-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              title="Switch evaluated atmospheric pollutant"
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
            <div
              className="rec-severity-pill"
              style={{
                backgroundColor: context.severity.bg_color,
                borderColor: context.severity.color,
                color: context.severity.color,
              }}
            >
              <span
                className="rec-severity-dot"
                style={{ backgroundColor: context.severity.color }}
              />
              <strong>{context.severity.category.toUpperCase()}</strong>
              <span>Tier {context.severity.level}/6</span>
            </div>
          )}

          <div className="rec-context-item">
            <span className="rec-context-label">Time Horizon:</span>
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
                : 'Current Telemetry'}
            </span>
          </div>
        </div>

        {/* Historical Notice */}
        {isHistorical && (
          <div className="rec-historical-notice">
            <span className="hist-icon">ℹ</span>
            <div>
              <strong>Historical Analysis Mode ({selectedDate}):</strong>
              <span>
                {' '}These recommendations reflect verified criteria that applied to conditions on this past date. They do not constitute current active health alerts.
              </span>
            </div>
          </div>
        )}

        {/* Target Audience Filters */}
        <div className="rec-audience-tabs">
          {[
            { id: 'all', label: 'All Audiences' },
            { id: 'general_public', label: 'General Public' },
            { id: 'sensitive_groups', label: 'Sensitive Groups (Asthma, Elderly, Children)' },
            { id: 'outdoor_workers', label: 'Outdoor Workers & Transit' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`rec-tab-btn ${selectedAudience === tab.id ? 'active' : ''}`}
              onClick={() => setSelectedAudience(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="rec-modal-body">
          {loading ? (
            <div className="rec-loading-state">
              <span>Evaluating environmental severity against authoritative public health rules…</span>
            </div>
          ) : error ? (
            <div className="rec-error-state">
              <span className="error-icon">⚠️</span>
              <h4>Unable to Retrieve Recommendations</h4>
              <p>{error}</p>
            </div>
          ) : data?.status === 'unavailable' || recommendations.length === 0 ? (
            <div className="rec-empty-state">
              <div className="empty-shield-icon">🛡</div>
              <h4>No Verified Precaution Recommendations Available</h4>
              <p>
                {data?.reason ||
                  'No verified precaution recommendations are available for this selection. Environmental telemetry is either below triggering thresholds or currently unavailable.'}
              </p>
              <div className="rec-empty-hint">
                Threshold criteria strictly adhere to Central Pollution Control Board (CPCB) NAQI and WHO Air Quality Guidelines.
              </div>
            </div>
          ) : (
            <div className="rec-cards-list">
              {recommendations.map((rec) => {
                const isHighPriority = rec.priority === 1;
                return (
                  <div
                    key={rec.id}
                    className={`rec-card ${isHighPriority ? 'high-priority' : ''}`}
                  >
                    {/* Card Top Row */}
                    <div className="rec-card-top">
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
                        title={onOpenPollutantInfo ? `Click to inspect authoritative definitions for ${rec.applicable_pollutant}` : undefined}
                      >
                        {rec.applicable_pollutant} {onOpenPollutantInfo ? 'ⓘ' : ''}
                      </span>
                    </div>

                    {/* Card Title & Explanation */}
                    <h4 className="rec-card-title">{rec.title}</h4>
                    <p className="rec-card-explanation">{rec.explanation}</p>

                    {/* Rationale & Trigger Box */}
                    <div className="rec-rationale-box">
                      <div className="rationale-item">
                        <strong>Why This Applies:</strong> {rec.rationale}
                      </div>
                      <div className="trigger-item">
                        <strong>Trigger Condition:</strong> {rec.trigger_description}
                      </div>
                    </div>

                    {/* Scope & Limitation Disclaimer */}
                    {rec.disclaimer && (
                      <div className="rec-disclaimer-box">
                        <span className="disclaimer-icon">⚠️</span>
                        <span>{rec.disclaimer}</span>
                      </div>
                    )}

                    {/* Footer: Source Link & Citation */}
                    <div className="rec-card-footer">
                      <div className="rec-source-citation">
                        Source: <strong>{rec.source.name}</strong> ·{' '}
                        <em>{rec.source.document}</em>
                      </div>
                      <a
                        href={rec.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rec-source-link"
                        title={`Inspect authoritative reference at ${rec.source.url}`}
                      >
                        Authoritative Source ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="rec-modal-footer">
          <div className="rec-footer-disclaimer">
            <span>⚖ <strong>Regulatory &amp; Medical Scope:</strong> Recommendations are educational guidelines derived from published CPCB and WHO criteria. They do not constitute personalized medical diagnosis or treatment.</span>
          </div>
          <button className="btn-done-rec" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
