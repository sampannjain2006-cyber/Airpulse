import React, { useState } from 'react';
import { listSupportedPollutants, getCatalogItem } from '../utils/pollutantCatalog';
import type { PollutantCatalogItem } from '../types/pollutant';

export const PollutantGuideView: React.FC = () => {
  const supported = listSupportedPollutants();
  const [selectedPollutantId, setSelectedPollutantId] = useState<string>('pm25');

  const currentItem: PollutantCatalogItem | null = getCatalogItem(selectedPollutantId);

  return (
    <div className="nature-page-container pollutant-guide-page">
      {/* Header */}
      <div className="guide-header">
        <div>
          <div className="guide-tag-row">
            <span className="nature-tag green">EDUCATIONAL REFERENCE</span>
            <span className="nature-tag teal">CPCB NAAQS &amp; WHO 2021</span>
          </div>
          <h1 className="page-heading">Ambient Pollutant Scientific Guide</h1>
          <p className="page-subheading">
            Authoritative definitions, emission origins, regulatory exposure standards, and health implications
          </p>
        </div>
      </div>

      {/* Pollutant Tabs Bar */}
      <div className="guide-pollutants-nav" role="tablist" aria-label="Select pollutant to view details">
        {supported.map((p) => {
          const isSelected = selectedPollutantId === p.id;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={isSelected}
              className={`guide-nav-tab ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedPollutantId(p.id)}
            >
              <span className="tab-symbol">{p.symbol}</span>
              <span className="tab-name">{p.displayName.split('(')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {currentItem && (
        <div className="guide-detail-layout">
          {/* Main Detail Card */}
          <article className="guide-main-card">
            <div className="guide-main-header">
              <div className="guide-symbol-badge">
                <span dangerouslySetInnerHTML={{ __html: currentItem.chemicalFormulaHtml }} />
              </div>
              <div className="guide-title-block">
                <span className="guide-id-tag">{currentItem.id.toUpperCase()} · CRITERIA AIR POLLUTANT</span>
                <h2 className="guide-pollutant-name">{currentItem.displayName}</h2>
                <p className="guide-short-desc">{currentItem.shortDescription}</p>
              </div>
            </div>

            <div className="guide-sections-grid">
              {/* What It Represents */}
              <div className="guide-section-box">
                <div className="section-box-header">
                  <span className="section-box-icon">🔬</span>
                  <h3>What It Represents</h3>
                </div>
                <p>{currentItem.whatItRepresents}</p>
                <div className="unit-info-chip">
                  <strong>Measurement Unit:</strong> {currentItem.units.standard} ({currentItem.units.notes})
                </div>
              </div>

              {/* Primary Sources in India */}
              <div className="guide-section-box">
                <div className="section-box-header">
                  <span className="section-box-icon">🏭</span>
                  <h3>Primary Sources in India</h3>
                </div>
                <ul className="guide-sources-list">
                  {currentItem.primarySources.map((src, i) => (
                    <li key={i}>{src}</li>
                  ))}
                </ul>
              </div>

              {/* Health Impact */}
              <div className="guide-section-box alert-box">
                <div className="section-box-header">
                  <span className="section-box-icon">🫁</span>
                  <h3>Health Relevance</h3>
                </div>
                <p>{currentItem.healthRelevance}</p>
              </div>

              {/* Environmental Relevance */}
              <div className="guide-section-box">
                <div className="section-box-header">
                  <span className="section-box-icon">🌿</span>
                  <h3>Environmental &amp; Ecological Impact</h3>
                </div>
                <p>{currentItem.environmentalRelevance}</p>
              </div>
            </div>

            {/* Regulatory Thresholds Table */}
            <div className="guide-standards-box">
              <h3 className="standards-title">Regulatory Thresholds &amp; Guidelines</h3>
              <div className="standards-table-wrapper">
                <table className="nature-table">
                  <thead>
                    <tr>
                      <th>Standard / Body</th>
                      <th>Time Horizon</th>
                      <th>Prescribed Threshold</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>CPCB NAAQS (India)</strong></td>
                      <td>24-Hour Average</td>
                      <td><code>{currentItem.regulatoryThresholds.cpcb_naaqs_24hr}</code></td>
                      <td><span className="status-badge mandatory">Mandatory Law</span></td>
                    </tr>
                    {currentItem.regulatoryThresholds.cpcb_naaqs_annual && (
                      <tr>
                        <td><strong>CPCB NAAQS (India)</strong></td>
                        <td>Annual Average</td>
                        <td><code>{currentItem.regulatoryThresholds.cpcb_naaqs_annual}</code></td>
                        <td><span className="status-badge mandatory">Mandatory Law</span></td>
                      </tr>
                    )}
                    <tr>
                      <td><strong>WHO 2021 Guidelines</strong></td>
                      <td>24-Hour Average</td>
                      <td><code>{currentItem.regulatoryThresholds.who_guideline_24hr}</code></td>
                      <td><span className="status-badge health">Health Target</span></td>
                    </tr>
                    {currentItem.regulatoryThresholds.who_guideline_annual && (
                      <tr>
                        <td><strong>WHO 2021 Guidelines</strong></td>
                        <td>Annual Average</td>
                        <td><code>{currentItem.regulatoryThresholds.who_guideline_annual}</code></td>
                        <td><span className="status-badge health">Health Target</span></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Context & Scientific Limitations */}
            {currentItem.limitationsAndContext && currentItem.limitationsAndContext.length > 0 && (
              <div className="guide-limitations-box">
                <h4>Contextual Considerations &amp; Measurement Limitations</h4>
                <ul>
                  {currentItem.limitationsAndContext.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Authoritative References */}
            <div className="guide-references-box">
              <h4>Authoritative Scientific References</h4>
              <div className="references-list">
                {currentItem.references.map((ref, idx) => (
                  <div key={idx} className="reference-item">
                    <span className="ref-org">{ref.organization}</span>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="ref-title">
                      {ref.title} ↗
                    </a>
                    <p className="ref-desc">{ref.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Right Column: Educational Concept Sidebar */}
          <aside className="guide-sidebar">
            <div className="sidebar-card">
              <span className="sidebar-icon">💡</span>
              <h3>Concentration vs. Air Quality Index (AQI)</h3>
              <p>
                A crucial distinction in environmental intelligence is the difference between
                <strong> physical mass concentration</strong> (e.g. 85 µg/m³ of PM2.5) and the
                <strong> Air Quality Index (AQI)</strong>.
              </p>
              <div className="sidebar-equation-box">
                <code>AQI = Sub-Index Function(Concentration)</code>
              </div>
              <p>
                The India National Air Quality Index (NAQI) normalizes individual concentrations of 8 pollutants
                into a dimensionless scale (0 to 500). The overarching AQI is governed by the <em>worst-performing</em> pollutant.
              </p>
            </div>

            <div className="sidebar-card">
              <span className="sidebar-icon">⚖️</span>
              <h3>CPCB NAQI 6-Tier Scale</h3>
              <div className="aqi-tiers-list">
                <div className="tier-row good">
                  <span className="tier-range">0 – 50</span>
                  <span className="tier-name">Good (Minimal Impact)</span>
                </div>
                <div className="tier-row satisfactory">
                  <span className="tier-range">51 – 100</span>
                  <span className="tier-name">Satisfactory (Minor Discomfort)</span>
                </div>
                <div className="tier-row moderate">
                  <span className="tier-range">101 – 200</span>
                  <span className="tier-name">Moderate (Breathing Discomfort)</span>
                </div>
                <div className="tier-row poor">
                  <span className="tier-range">201 – 300</span>
                  <span className="tier-name">Poor (Respiratory Illness Risk)</span>
                </div>
                <div className="tier-row very-poor">
                  <span className="tier-range">301 – 400</span>
                  <span className="tier-name">Very Poor (Severe on Prolonged)</span>
                </div>
                <div className="tier-row severe">
                  <span className="tier-range">401 – 500</span>
                  <span className="tier-name">Severe (Affects Healthy People)</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
