import React, { useState, useEffect, useMemo } from 'react';
import type { WasteReuseEntry, WasteReuseMetadata } from '../types/wasteReuse';
import { wasteReuseApi } from '../api/wasteReuse';

interface WasteReuseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WasteReuseModal: React.FC<WasteReuseModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<WasteReuseEntry[]>([]);
  const [metadata, setMetadata] = useState<WasteReuseMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<WasteReuseEntry | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all');
  const [selectedReceiving, setSelectedReceiving] = useState<string>('all');

  // Load catalog on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([wasteReuseApi.list(), wasteReuseApi.getMetadata()])
      .then(([listRes, metaRes]) => {
        if (!isMounted) return;
        setEntries(listRes.data || []);
        setMetadata(metaRes.metadata || null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load industrial waste reuse catalog.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEntry) {
          setSelectedEntry(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedEntry, onClose]);

  // Client-side filtering
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedOrigin !== 'all' && item.origin_industry !== selectedOrigin) {
        return false;
      }
      if (selectedReceiving !== 'all' && item.receiving_industry !== selectedReceiving) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesOrigin = item.origin_industry.toLowerCase().includes(q);
        const matchesReceiving = item.receiving_industry.toLowerCase().includes(q);
        const matchesApp = item.application.toLowerCase().includes(q);
        const matchesCat = item.category_label.toLowerCase().includes(q);
        if (!matchesName && !matchesOrigin && !matchesReceiving && !matchesApp && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedCategory, selectedOrigin, selectedReceiving, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedOrigin('all');
    setSelectedReceiving('all');
  };

  if (!isOpen) return null;

  return (
    <div className="waste-reuse-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="waste-reuse-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="waste-reuse-header">
          <div className="waste-reuse-header-title-wrap">
            <div className="waste-reuse-header-badge">
              <span className="waste-reuse-dot amber" />
              <span>CIRCULAR ENVIRONMENTAL INTELLIGENCE</span>
            </div>
            <h2 className="waste-reuse-modal-title">
              Industrial Waste Reuse &amp; Pollution Prevention
            </h2>
            <p className="waste-reuse-modal-subtitle">
              Educational decision-support guide for verified industrial by-product recovery pathways, mandatory testing,
              and circular utilization under Indian statutory frameworks (CPCB, MoEFCC, BIS, IRC, AERB, BEE).
            </p>
          </div>
          <button className="waste-reuse-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="waste-reuse-body">
          {/* Overview Banner */}
          <div className="waste-reuse-overview-card">
            <div className="overview-icon-col">
              <div className="overview-icon-badge">♻️</div>
            </div>
            <div className="overview-text-col">
              <h3 className="overview-heading">Responsible Industrial Resource Recovery &amp; Waste Hierarchy</h3>
              <p className="overview-desc">
                In an environmentally sound circular economy, industrial by-products that satisfy rigorous chemical, physical,
                and leaching standards can serve as secondary raw materials, reducing landfill volumes and curbing the extraction
                of virgin natural resources (e.g., natural limestone, gypsum, and river sand). However, <strong>potential reuse is
                not confirmed suitability</strong>: uncharacterized, hazardous, or contaminated materials must never be repurposed without accredited laboratory verification and statutory consent.
              </p>
              <div className="overview-principles-row">
                <span className="overview-pill">
                  <span className="bullet green">●</span> Established &amp; Conditional Pathways
                </span>
                <span className="overview-pill">
                  <span className="bullet amber">●</span> Mandatory TCLP &amp; Chemical Testing
                </span>
                <span className="overview-pill">
                  <span className="bullet cyan">●</span> CPCB / MoEFCC Statutory Rules
                </span>
                <span className="overview-pill">
                  <span className="bullet red">●</span> Zero Uncontained Discharge
                </span>
              </div>
            </div>
          </div>

          {/* If detail is selected, show detail inspector */}
          {selectedEntry ? (
            <div className="waste-reuse-detail-view">
              <div className="detail-view-nav">
                <button
                  className="btn-back-to-catalog"
                  onClick={() => setSelectedEntry(null)}
                >
                  ← Back to Waste Stream Directory
                </button>
                <div className="detail-view-status-tag">
                  <span
                    className={`status-badge ${
                      selectedEntry.verification_status === 'ESTABLISHED_REGULATORY_PATHWAY'
                        ? 'established'
                        : 'conditional'
                    }`}
                  >
                    {selectedEntry.status_label}
                  </span>
                </div>
              </div>

              <div className="detail-hero-card">
                <span className="detail-category-label">{selectedEntry.category_label}</span>
                <h3 className="detail-stream-name">{selectedEntry.name}</h3>
                <div className="detail-pathway-summary">
                  <div className="pathway-step">
                    <span className="pathway-step-label">GENERATING INDUSTRY</span>
                    <span className="pathway-step-val">{selectedEntry.origin_industry}</span>
                  </div>
                  <div className="pathway-arrow">➔</div>
                  <div className="pathway-step">
                    <span className="pathway-step-label">ELIGIBLE RECEIVING INDUSTRY</span>
                    <span className="pathway-step-val">{selectedEntry.receiving_industry}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid">
                {/* Process of Origin */}
                <div className="detail-section-card">
                  <h4 className="detail-section-title">
                    <span className="sec-icon">🏭</span> Generating Process of Origin
                  </h4>
                  <p className="detail-section-body">{selectedEntry.origin_process}</p>
                </div>

                {/* Primary Potential Applications */}
                <div className="detail-section-card">
                  <h4 className="detail-section-title">
                    <span className="sec-icon">⚙️</span> Potential Reuse &amp; Recovery Applications
                  </h4>
                  <p className="detail-section-body">{selectedEntry.application}</p>
                </div>

                {/* Required Pretreatment & Testing */}
                <div className="detail-section-card full-width">
                  <h4 className="detail-section-title">
                    <span className="sec-icon">🔬</span> Mandatory Pretreatment, Quality Checks &amp; Laboratory Testing
                  </h4>
                  <p className="detail-section-intro">
                    Before any industrial stream can be accepted as secondary raw material, the generator and user must verify conformity through accredited laboratory assays:
                  </p>
                  <ul className="detail-checklist">
                    {selectedEntry.pretreatment_requirements.map((req, idx) => (
                      <li key={idx} className="checklist-item">
                        <span className="check-bullet">✓</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contamination & Health Concerns */}
                <div className="detail-section-card">
                  <h4 className="detail-section-title">
                    <span className="sec-icon">⚠️</span> Contamination Risks &amp; Environmental Safety Concerns
                  </h4>
                  <ul className="detail-warning-list">
                    {selectedEntry.contamination_risks.map((risk, idx) => (
                      <li key={idx} className="warning-item">
                        <span className="warn-bullet">!</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Conditions Under Which Reuse is Strictly Unsuitable */}
                <div className="detail-section-card caution-card">
                  <h4 className="detail-section-title caution-title">
                    <span className="sec-icon">🛑</span> Conditions Under Which Reuse is Strictly Unsuitable
                  </h4>
                  <ul className="detail-unsuitable-list">
                    {selectedEntry.unsuitable_conditions.map((cond, idx) => (
                      <li key={idx} className="unsuitable-item">
                        <span className="unsuitable-bullet">✕</span>
                        <span>{cond}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Applicable Indian Standards & Regulations */}
                <div className="detail-section-card full-width">
                  <h4 className="detail-section-title">
                    <span className="sec-icon">📜</span> Applicable Indian Regulatory Standards &amp; Guidelines
                  </h4>
                  <div className="standards-list">
                    {selectedEntry.regulatory_standards.map((std, idx) => (
                      <div key={idx} className="standard-chip">
                        <span className="std-badge">REGULATORY REQUIREMENT</span>
                        <span className="std-text">{std}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authoritative Citation & Limitations */}
                <div className="detail-section-card full-width reference-card">
                  <div className="reference-row">
                    <div className="ref-info">
                      <span className="ref-label">AUTHORITATIVE STATUTORY CITATION:</span>
                      <strong className="ref-name">{selectedEntry.authoritative_source}</strong>
                      <span className="ref-limitations">
                        <strong>Technical Limitations:</strong> {selectedEntry.limitations}
                      </span>
                    </div>
                    <a
                      href={selectedEntry.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-external-source"
                    >
                      Visit Official Portal ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Directory & Filter View */
            <div className="waste-reuse-directory-view">
              {/* Filter Controls Bar */}
              <div className="waste-reuse-filter-bar">
                <div className="filter-input-wrap">
                  <svg className="filter-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="waste-search-input"
                    placeholder="Search by by-product, origin, or receiving industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="btn-clear-search" onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>

                <div className="filter-select-group">
                  <div className="select-wrap">
                    <label className="select-label">CATEGORY</label>
                    <select
                      className="waste-filter-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="all">All Categories</option>
                      {metadata?.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="select-wrap">
                    <label className="select-label">ORIGINATING INDUSTRY</label>
                    <select
                      className="waste-filter-select"
                      value={selectedOrigin}
                      onChange={(e) => setSelectedOrigin(e.target.value)}
                    >
                      <option value="all">All Origin Industries</option>
                      {metadata?.origin_industries.map((orig) => (
                        <option key={orig} value={orig}>
                          {orig}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="select-wrap">
                    <label className="select-label">RECEIVING INDUSTRY</label>
                    <select
                      className="waste-filter-select"
                      value={selectedReceiving}
                      onChange={(e) => setSelectedReceiving(e.target.value)}
                    >
                      <option value="all">All Receiving Industries</option>
                      {metadata?.receiving_industries.map((rec) => (
                        <option key={rec} value={rec}>
                          {rec}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(selectedCategory !== 'all' || selectedOrigin !== 'all' || selectedReceiving !== 'all' || searchQuery) && (
                    <button className="btn-reset-filters" onClick={handleClearFilters}>
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Status Counters Bar */}
              <div className="waste-reuse-meta-bar">
                <span className="results-count">
                  Showing <strong>{filteredEntries.length}</strong> of <strong>{entries.length}</strong> verified industrial by-product streams
                </span>
                <div className="status-legend">
                  <span className="legend-chip established">
                    <span className="bullet green">●</span> Established Statutory ({metadata?.verification_status_counts.established || 0})
                  </span>
                  <span className="legend-chip conditional">
                    <span className="bullet amber">●</span> Conditional Approval ({metadata?.verification_status_counts.conditional || 0})
                  </span>
                </div>
              </div>

              {/* Loading / Error States */}
              {loading && <div className="waste-reuse-loading">Loading verified industrial waste streams…</div>}
              {error && <div className="waste-reuse-error">Error loading catalog: {error}</div>}

              {/* Catalog Cards Grid */}
              {!loading && !error && filteredEntries.length === 0 && (
                <div className="waste-reuse-empty">
                  <p>No industrial waste streams match the selected criteria.</p>
                  <button className="btn-primary" onClick={handleClearFilters}>Clear Filters</button>
                </div>
              )}

              <div className="waste-stream-grid">
                {filteredEntries.map((stream) => (
                  <div
                    key={stream.id}
                    className="waste-stream-card"
                    onClick={() => setSelectedEntry(stream)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedEntry(stream);
                    }}
                  >
                    <div className="card-top-row">
                      <span className="card-category-tag">{stream.category_label}</span>
                      <span
                        className={`card-status-badge ${
                          stream.verification_status === 'ESTABLISHED_REGULATORY_PATHWAY'
                            ? 'established'
                            : 'conditional'
                        }`}
                      >
                        {stream.verification_status === 'ESTABLISHED_REGULATORY_PATHWAY'
                          ? 'Established Pathway'
                          : 'Conditional Approval'}
                      </span>
                    </div>

                    <h4 className="card-stream-name">{stream.name}</h4>

                    <div className="card-pathway-box">
                      <div className="pathway-line">
                        <span className="line-label">Origin:</span>
                        <span className="line-val">{stream.origin_industry}</span>
                      </div>
                      <div className="pathway-line">
                        <span className="line-label">Receives:</span>
                        <span className="line-val">{stream.receiving_industry}</span>
                      </div>
                    </div>

                    <p className="card-app-summary">
                      {stream.application}
                    </p>

                    <div className="card-footer-row">
                      <span className="standards-badge">
                        {stream.regulatory_standards.length} Indian Standards Verified
                      </span>
                      <span className="card-inspect-link">
                        Inspect Requirements →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pollution Prevention & Environmental Principles Card */}
          <div className="pollution-prevention-card">
            <h4 className="prev-card-title">
              <span className="sec-icon">🌱</span> Principles of Pollution Prevention &amp; Virgin Resource Conservation
            </h4>
            <div className="prev-card-content">
              <p>
                Recovering eligible industrial by-products prevents vast quantities of solid mineral wastes from occupying
                unlined industrial ponds and dumps, safeguarding groundwater recharge zones from heavy metal percolation.
                Substituting industrial by-products into cement, concrete, and civil road bases mitigates the energy-intensive
                quarrying of virgin limestone, natural mineral gypsum, and river bed sand.
              </p>
              <p className="prev-card-subtext">
                <strong>Crucial Environmental Boundary:</strong> Reuse does not automatically eliminate pollution. Improper
                application, lack of required aging, or use of contaminated materials can introduce new environmental liabilities.
                All reuse must be supported by statutory consent conditions and certified quality monitoring.
              </p>
            </div>
          </div>

          {/* Statutory & Safety Notice Box */}
          <div className="statutory-disclaimer-box">
            <div className="disclaimer-title-row">
              <span className="disclaimer-icon">⚖️</span>
              <span className="disclaimer-heading">STATUTORY DISCLAIMER &amp; REGULATORY NOTICE</span>
            </div>
            <p className="disclaimer-text">
              The information in this module is provided solely for educational intelligence and decision support under
              relevant CPCB, MoEFCC, BIS, and IRC standards. It does not constitute statutory environmental approval,
              a commercial waste trading exchange, or a substitute for site-specific laboratory characterization (such as TCLP leaching tests)
              and formal Consent to Establish (CTE) / Consent to Operate (CTO) authorizations from competent State Pollution Control Boards
              under the Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
