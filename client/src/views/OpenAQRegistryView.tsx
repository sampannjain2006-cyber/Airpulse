import React, { useState, useEffect } from 'react';
import { openaqApi } from '../api/openaq';
import type { OpenAQCoverageResponse, OpenAQLocation } from '../types/openaq';

interface OpenAQRegistryViewProps {
  onSelectStation?: (stationId: number) => void;
  onNavigateToLive?: () => void;
}

export const OpenAQRegistryView: React.FC<OpenAQRegistryViewProps> = ({
  onSelectStation,
  onNavigateToLive,
}) => {
  const [coverage, setCoverage] = useState<OpenAQCoverageResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState<'all' | 'dashboard'>('all');
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<OpenAQLocation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load coverage metadata on mount
  useEffect(() => {
    openaqApi
      .getCoverage()
      .then(setCoverage)
      .catch((err) => console.warn('[OpenAQ Registry] Coverage fetch failed:', err.message));
  }, []);

  // Load directory locations with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLocations();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, dashboardFilter]);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await openaqApi.getLocations({
        limit: 60,
        search: searchQuery.trim() || undefined,
        dashboard_only: dashboardFilter === 'dashboard',
      });
      setLocations(res.data || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to load OpenAQ registry locations');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nature-page-container registry-page">
      {/* Header Banner */}
      <div className="view-header-banner">
        <div className="header-meta-row">
          <span className="nature-tag green">OPENAQ API v3</span>
          <span className="nature-tag cyan">METADATA CATALOGUE</span>
        </div>
        <h1 className="page-heading">OpenAQ Monitoring Network Registry</h1>
        <p className="page-subheading">
          Explore registered ambient air quality monitoring stations across India from the global OpenAQ repository.
          Registry entries show geographic coverage and sensor parameters; live measurements depend on ground ingestion.
        </p>
      </div>

      {/* Coverage Statistics Bar */}
      {coverage && (
        <div className="registry-stats-grid">
          <div className="stat-card">
            <span className="stat-label">Registry Stations</span>
            <span className="stat-val">{coverage.total_locations.toLocaleString()}</span>
            <span className="stat-desc">Total Indian sites indexed in OpenAQ</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Dashboard Ingested</span>
            <span className="stat-val active">{coverage.dashboard_stations}</span>
            <span className="stat-desc">Active in AirPulse telemetry database</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Indian Cities</span>
            <span className="stat-val">{coverage.cities_count}</span>
            <span className="stat-desc">Urban clusters with registry sensors</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Data Freshness Window</span>
            <span className="stat-val">Last 48 Hours</span>
            <span className="stat-desc">Active telemetry ingestion threshold</span>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="registry-controls-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="nature-search-input"
            placeholder="Search by station name, city, or locality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search OpenAQ registry"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="filter-pill-group">
          <button
            className={`nature-filter-pill ${dashboardFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDashboardFilter('all')}
          >
            All Registry Sites
          </button>
          <button
            className={`nature-filter-pill ${dashboardFilter === 'dashboard' ? 'active' : ''}`}
            onClick={() => setDashboardFilter('dashboard')}
          >
            AirPulse Monitored Only ({coverage?.dashboard_stations || '40'})
          </button>
        </div>

        <div className="registry-count-indicator">
          {loading ? 'Searching…' : `Showing ${locations.length} of ${totalCount} sites`}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="nature-alert error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
          <button className="retry-btn" onClick={fetchLocations}>Retry</button>
        </div>
      )}

      {/* Registry Table / Grid */}
      <div className="registry-results-card">
        {loading ? (
          <div className="registry-loading-state">
            <div className="loading-spinner" />
            <p>Querying OpenAQ location catalog…</p>
          </div>
        ) : locations.length > 0 ? (
          <div className="registry-table-wrapper">
            <table className="nature-table registry-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Station Name</th>
                  <th>City / Locality</th>
                  <th>Coordinates</th>
                  <th>Sensors / Parameters</th>
                  <th>Source Provider</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const isDashboard = loc.is_dashboard_station;
                  return (
                    <tr key={loc.id} className={isDashboard ? 'dashboard-row' : ''}>
                      <td>
                        {isDashboard ? (
                          <span className="registry-badge monitored">● Active Monitored</span>
                        ) : (
                          <span className="registry-badge registry-only">○ Registry Metadata</span>
                        )}
                      </td>
                      <td className="station-name-cell">
                        <strong>{loc.name}</strong>
                        {loc.locality && <div className="locality-sub">{loc.locality}</div>}
                      </td>
                      <td>
                        <span className="city-name">{loc.city || '—'}</span>
                        {loc.country && <span className="country-sub">, {loc.country}</span>}
                      </td>
                      <td className="coords-cell">
                        {loc.latitude?.toFixed(4)}°N, {loc.longitude?.toFixed(4)}°E
                      </td>
                      <td>
                        <div className="sensor-chips">
                          {loc.sensors_summary && loc.sensors_summary.length > 0 ? (
                            loc.sensors_summary.map((param) => (
                              <span key={param} className="param-chip">{param.toUpperCase()}</span>
                            ))
                          ) : (
                            <span className="param-none">Telemetry pending</span>
                          )}
                        </div>
                      </td>
                      <td className="provider-cell">
                        {loc.provider_name || loc.owner_name || 'CPCB / OpenAQ'}
                      </td>
                      <td>
                        {isDashboard ? (
                          <button
                            className="nature-btn nature-btn-xs nature-btn-primary"
                            onClick={() => {
                              if (onSelectStation) onSelectStation(loc.id);
                              if (onNavigateToLive) onNavigateToLive();
                            }}
                          >
                            Live Map ↗
                          </button>
                        ) : (
                          <span className="text-muted text-xs">Registry Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="registry-empty-state">
            <span className="empty-icon">🌐</span>
            <h3>No registry locations matched</h3>
            <p>Try broadening your search term or switching to "All Registry Sites".</p>
            {searchQuery && (
              <button className="nature-btn nature-btn-sm nature-btn-secondary" onClick={() => setSearchQuery('')}>
                Clear Search Query
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
