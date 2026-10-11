import React, { useState, useMemo } from 'react';
import { listSupportedPollutants, getCatalogItem } from '../utils/pollutantCatalog';
import type { PollutantCatalogItem } from '../types/pollutant';

type PollutantCategory = 'all' | 'particulate' | 'gas' | 'toxic';

export const PollutantGuideView: React.FC = () => {
  const supported = listSupportedPollutants();
  const [selectedPollutantId, setSelectedPollutantId] = useState<string>('pm25');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<PollutantCategory>('all');

  // Filtered pollutants based on search query and category
  const filteredPollutants = useMemo(() => {
    return supported.filter((p) => {
      // Category filter
      if (activeCategory === 'particulate') {
        if (p.id !== 'pm25' && p.id !== 'pm10') return false;
      } else if (activeCategory === 'gas') {
        if (!['no2', 'so2', 'co', 'o3', 'nh3'].includes(p.id)) return false;
      } else if (activeCategory === 'toxic') {
        if (p.id !== 'pb') return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.id.toLowerCase().includes(q) ||
        p.symbol.toLowerCase().includes(q) ||
        p.displayName.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
      );
    });
  }, [supported, searchQuery, activeCategory]);

  // Ensure selected pollutant is in the filtered list if available
  const effectiveSelectedId = useMemo(() => {
    if (filteredPollutants.some((p) => p.id === selectedPollutantId)) {
      return selectedPollutantId;
    }
    return filteredPollutants.length > 0 ? filteredPollutants[0].id : '';
  }, [filteredPollutants, selectedPollutantId]);

  const currentItem: PollutantCatalogItem | null = effectiveSelectedId
    ? getCatalogItem(effectiveSelectedId)
    : null;

  return (
    <div className="nature-page-container pollutant-guide-page">
      {/* Header */}
      <div className="guide-header">
        <div>
          <div className="guide-tag-row">
            <span className="nature-tag green">SCIENTIFIC REFERENCE CATALOG</span>
            <span className="nature-tag teal">CPCB NAAQS &amp; WHO 2021 STANDARDS</span>
          </div>
          <h1 className="page-heading">Ambient Pollutant Reference Catalog</h1>
          <p className="page-subheading">
            Authoritative definitions, emission origins, regulatory exposure thresholds, and public health impact profiles for criteria air pollutants.
          </p>
        </div>
      </div>

      {/* Catalog Search & Category Filter Toolbar */}
      <div className="catalog-search-toolbar">
        <div className="catalog-search-input-wrap">
          <span className="catalog-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Search pollutant by name, formula, or emission source..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search criteria pollutants catalog"
          />
        </div>

        <div className="catalog-category-filters" role="group" aria-label="Filter pollutants by type">
          <button
            type="button"
            className={`catalog-filter-chip ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Pollutants ({supported.length})
          </button>
          <button
            type="button"
            className={`catalog-filter-chip ${activeCategory === 'particulate' ? 'active' : ''}`}
            onClick={() => setActiveCategory('particulate')}
          >
            Particulates (PM2.5, PM10)
          </button>
          <button
            type="button"
            className={`catalog-filter-chip ${activeCategory === 'gas' ? 'active' : ''}`}
            onClick={() => setActiveCategory('gas')}
          >
            Gaseous Pollutants (NO₂, SO₂, O₃, CO, NH₃)
          </button>
          <button
            type="button"
            className={`catalog-filter-chip ${activeCategory === 'toxic' ? 'active' : ''}`}
            onClick={() => setActiveCategory('toxic')}
          >
            Toxic Elements (Lead Pb)
          </button>
        </div>
      </div>

      {/* Pollutant Tabs Bar */}
      {filteredPollutants.length > 0 ? (
        <div className="guide-pollutants-nav" role="tablist" aria-label="Select criteria air pollutant">
          {filteredPollutants.map((p) => {
            const isSelected = effectiveSelectedId === p.id;
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
      ) : (
        <div className="catalog-empty-state">
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
          <h3>No Criteria Pollutants Match Your Search</h3>
          <p>
            No catalog entries match <strong>&quot;{searchQuery}&quot;</strong> under the selected category filter.
          </p>
          <button
            type="button"
            className="google-btn-primary"
            style={{ marginTop: '12px' }}
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
          >
            Reset Filters &amp; View All Pollutants
          </button>
        </div>
      )}

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
