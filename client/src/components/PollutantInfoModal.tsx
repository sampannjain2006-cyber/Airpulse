import React, { useState, useEffect } from 'react';
import type { ContextualMeasurement, PollutantCatalogItem } from '../types/pollutant';
import { POLLUTANT_CATALOG, listSupportedPollutants, getCatalogItem } from '../utils/pollutantCatalog';

interface PollutantInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPollutantId?: string;
  contextualMeasurement?: ContextualMeasurement | null;
}

export const PollutantInfoModal: React.FC<PollutantInfoModalProps> = ({
  isOpen,
  onClose,
  initialPollutantId = 'pm25',
  contextualMeasurement = null,
}) => {
  const [selectedId, setSelectedId] = useState<string>(initialPollutantId);
  const supportedList = listSupportedPollutants();

  useEffect(() => {
    if (initialPollutantId) {
      const clean = initialPollutantId.toLowerCase().replace(/[^a-z0-9]/g, '');
      const valid = clean === 'pm2_5' ? 'pm25' : clean;
      if (POLLUTANT_CATALOG[valid]) {
        setSelectedId(valid);
      }
    }
  }, [initialPollutantId, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentPollutant: PollutantCatalogItem | null = getCatalogItem(selectedId);

  // Check if contextual measurement applies to the selected pollutant
  const cleanContextMetric = contextualMeasurement?.metric
    ? contextualMeasurement.metric.toLowerCase().replace(/[^a-z0-9]/g, '')
    : null;
  const isContextRelevant = cleanContextMetric && (cleanContextMetric === selectedId || (cleanContextMetric === 'pm2_5' && selectedId === 'pm25'));

  return (
    <div className="pollutant-modal-overlay" onClick={onClose}>
      <div
        className="pollutant-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pollutant-modal-title"
      >
        {/* Modal Header */}
        <div className="pollutant-modal-header">
          <div className="pollutant-modal-header-left">
            <span className="pollutant-header-badge">AIRPULSE REFERENCE CATALOG</span>
            <h3 id="pollutant-modal-title" className="pollutant-modal-title">
              Atmospheric Pollutant Information &amp; Standards
            </h3>
          </div>
          <button className="btn-close-pollutant-modal" onClick={onClose} title="Close reference modal (Esc)">
            ✕
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="pollutant-tab-bar">
          {supportedList.map((p) => {
            const isTabActive = p.id === selectedId;
            return (
              <button
                key={p.id}
                className={`pollutant-tab-btn ${isTabActive ? 'active' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="pollutant-tab-symbol">{p.symbol}</span>
                <span className="pollutant-tab-unit">{p.units.standard}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="pollutant-modal-body">
          {!currentPollutant ? (
            <div className="pollutant-unavailable-card">
              <span className="unavail-icon">⚠</span>
              <h4>Pollutant Information Unavailable</h4>
              <p>The requested pollutant identifier is not supported or lacks verified regulatory metadata.</p>
            </div>
          ) : (
            <>
              {/* Contextual Live Snapshot (if opened from a card, grid, hotspot, or lookup) */}
              {isContextRelevant && contextualMeasurement && (
                <div className="pollutant-context-banner">
                  <div className="context-banner-header">
                    <span className="context-live-pill">
                      {contextualMeasurement.dataType === 'predicted' ? (
                        <>⚡ ACTIVE FORECAST CONTEXT</>
                      ) : contextualMeasurement.dataType === 'modelled' ? (
                        <>🌐 ACTIVE MODELLED CONTEXT</>
                      ) : (
                        <>📡 ACTIVE GROUND OBSERVATION CONTEXT</>
                      )}
                    </span>
                    {contextualMeasurement.stationName && (
                      <span className="context-station-tag">{contextualMeasurement.stationName}</span>
                    )}
                  </div>
                  <div className="context-banner-metrics">
                    <div className="context-val-box">
                      <span className="ctx-label">Measurement Value:</span>
                      <span className="ctx-val">
                        {contextualMeasurement.value !== null && contextualMeasurement.value !== undefined
                          ? `${Number(contextualMeasurement.value).toFixed(1)} ${contextualMeasurement.unit}`
                          : 'Unavailable (No Reading)'}
                      </span>
                    </div>

                    <div className="context-val-box">
                      <span className="ctx-label">Status &amp; Source:</span>
                      <span className="ctx-val">
                        {contextualMeasurement.source || 'OpenAQ Ground Station'}
                      </span>
                    </div>

                    {contextualMeasurement.dateOrTimestamp && (
                      <div className="context-val-box">
                        <span className="ctx-label">Timestamp / Date:</span>
                        <span className="ctx-val font-mono">{contextualMeasurement.dateOrTimestamp}</span>
                      </div>
                    )}

                    {contextualMeasurement.severityCategory && (
                      <div className="context-val-box">
                        <span className="ctx-label">CPCB NAQI Tier:</span>
                        <span
                          className="ctx-severity-chip"
                          style={{
                            color: contextualMeasurement.severityColor || '#38bdf8',
                            borderColor: contextualMeasurement.severityColor || '#38bdf8',
                          }}
                        >
                          {contextualMeasurement.severityCategory}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Distinction Banner: Concentration vs AQI vs Severity */}
              <div className="aqi-distinction-callout">
                <div className="distinction-icon">ℹ</div>
                <div className="distinction-content">
                  <strong>Critical Distinction: Concentration vs. AQI vs. Severity Meter</strong>
                  <p>
                    <strong>Concentration ({currentPollutant.units.standard})</strong> is the physical mass of pollutant measured or modelled per unit volume of air. 
                    <strong> AQI</strong> is a dimensionless normalized sub-index (0–500) computed using official CPCB piecewise breakpoints.
                    The <strong>AIRPULSE Severity Meter</strong> maps concentrations into CPCB NAQI standard categories (Good to Severe) with explicit provenance labeling (Observed vs Modelled vs Predicted).
                  </p>
                </div>
              </div>

              {/* Main Information Grid */}
              <div className="pollutant-info-grid">
                {/* Left Column: Overview, Sources, Health */}
                <div className="pollutant-info-col">
                  {/* Overview Card */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">🔬</span>
                      <span>Overview &amp; Definition</span>
                    </div>
                    <div className="pollutant-hero-title">
                      <h4 dangerouslySetInnerHTML={{ __html: currentPollutant.chemicalFormulaHtml }} />
                      <span className="pollutant-hero-name">{currentPollutant.displayName}</span>
                    </div>
                    <p className="pollutant-short-desc">{currentPollutant.shortDescription}</p>
                    <div className="pollutant-rep-box">
                      <strong>What this measurement represents:</strong>
                      <p>{currentPollutant.whatItRepresents}</p>
                    </div>
                  </div>

                  {/* Primary Sources */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">🏭</span>
                      <span>Primary Atmospheric Emission Sources</span>
                    </div>
                    <ul className="pollutant-sources-list">
                      {currentPollutant.primarySources.map((src, i) => (
                        <li key={i}>{src}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Health Relevance */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">🫁</span>
                      <span>Health Relevance &amp; Physiological Impact</span>
                    </div>
                    <p className="section-card-text">{currentPollutant.healthRelevance}</p>
                  </div>

                  {/* Environmental Relevance */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">🌱</span>
                      <span>Environmental &amp; Ecological Impact</span>
                    </div>
                    <p className="section-card-text">{currentPollutant.environmentalRelevance}</p>
                  </div>
                </div>

                {/* Right Column: Units, Regulatory Thresholds, Limitations, References */}
                <div className="pollutant-info-col">
                  {/* Units & Standards */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">⚖</span>
                      <span>Units &amp; Provider Reporting</span>
                    </div>
                    <div className="units-table">
                      <div className="unit-row">
                        <span className="unit-label">AIRPULSE Standard Unit:</span>
                        <span className="unit-val highlight">{currentPollutant.units.standard}</span>
                      </div>
                      <div className="unit-row">
                        <span className="unit-label">OpenAQ Ground Observation:</span>
                        <span className="unit-val">{currentPollutant.units.openaq}</span>
                      </div>
                      <div className="unit-row">
                        <span className="unit-label">Google Air Quality API:</span>
                        <span className="unit-val">{currentPollutant.units.google}</span>
                      </div>
                    </div>
                    <p className="unit-note">{currentPollutant.units.notes}</p>
                  </div>

                  {/* Regulatory Thresholds */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">🏛</span>
                      <span>Regulatory Standards vs Health Guidelines</span>
                    </div>
                    <div className="thresholds-list">
                      {currentPollutant.regulatoryThresholds.cpcb_naaqs_24hr && (
                        <div className="threshold-item cpcb">
                          <span className="th-badge">India CPCB NAAQS (24-hr)</span>
                          <span className="th-val">{currentPollutant.regulatoryThresholds.cpcb_naaqs_24hr}</span>
                        </div>
                      )}
                      {currentPollutant.regulatoryThresholds.cpcb_naaqs_annual && (
                        <div className="threshold-item cpcb">
                          <span className="th-badge">India CPCB NAAQS (Annual)</span>
                          <span className="th-val">{currentPollutant.regulatoryThresholds.cpcb_naaqs_annual}</span>
                        </div>
                      )}
                      {currentPollutant.regulatoryThresholds.who_guideline_24hr && (
                        <div className="threshold-item who">
                          <span className="th-badge">WHO Air Quality Guideline (24-hr)</span>
                          <span className="th-val">{currentPollutant.regulatoryThresholds.who_guideline_24hr}</span>
                        </div>
                      )}
                      {currentPollutant.regulatoryThresholds.who_guideline_annual && (
                        <div className="threshold-item who">
                          <span className="th-badge">WHO Air Quality Guideline (Annual)</span>
                          <span className="th-val">{currentPollutant.regulatoryThresholds.who_guideline_annual}</span>
                        </div>
                      )}
                      {currentPollutant.regulatoryThresholds.cpcb_aqi_breakpoint_good && (
                        <div className="threshold-item good">
                          <span className="th-badge">CPCB NAQI 'Good' Breakpoint</span>
                          <span className="th-val">{currentPollutant.regulatoryThresholds.cpcb_aqi_breakpoint_good}</span>
                        </div>
                      )}
                    </div>
                    <div className="standards-disclaimer">
                      * CPCB NAAQS are legally mandated ambient standards under the Air (Prevention and Control of Pollution) Act, 1981. WHO Guideline levels are global health benchmarks, not statutory Indian regulations.
                    </div>
                  </div>

                  {/* Limitations and Context */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">⚠</span>
                      <span>Measurement Limitations &amp; Context</span>
                    </div>
                    <ul className="pollutant-limitations-list">
                      {currentPollutant.limitationsAndContext.map((lim, i) => (
                        <li key={i}>{lim}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Authoritative Citations & References */}
                  <div className="pollutant-section-card">
                    <div className="section-card-title">
                      <span className="sec-icon">📖</span>
                      <span>Authoritative Citations &amp; Sources</span>
                    </div>
                    <div className="references-list">
                      {currentPollutant.references.map((ref, i) => (
                        <div key={i} className="reference-item">
                          <div className="ref-org">{ref.organization}</div>
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ref-title-link"
                          >
                            <span>{ref.title}</span>
                            <span className="external-arrow">↗</span>
                          </a>
                          <div className="ref-desc">{ref.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pollutant-modal-footer">
          <div className="footer-provenance-info">
            <span>Data Provenance: OpenAQ Ground Observations · Google Modelled API · AIRPULSE ML Multi-Model Ensemble</span>
          </div>
          <button className="btn-done" onClick={onClose}>
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
