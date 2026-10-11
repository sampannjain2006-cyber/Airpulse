import React, { useState, useEffect } from 'react';
import { openaqApi } from '../api/openaq';
import type { OpenAQCoverageResponse, OpenAQLocation } from '../types/openaq';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation?: (stationId: number) => void;
}

const PRESET_CITIES = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
];

export const OpenAQRegistryModal: React.FC<Props> = ({ isOpen, onClose, onSelectStation }) => {
  const [coverage, setCoverage] = useState<OpenAQCoverageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'nearby' | 'directory'>('nearby');

  // Nearby Search State
  const [latInput, setLatInput] = useState('28.6139');
  const [lonInput, setLonInput] = useState('77.2090');
  const [radiusKm, setRadiusKm] = useState('30');
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<OpenAQLocation[]>([]);
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  // Directory Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState<'all' | 'dashboard'>('all');
  const [dirLoading, setDirLoading] = useState(false);
  const [dirLocations, setDirLocations] = useState<OpenAQLocation[]>([]);
  const [totalDirCount, setTotalDirCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      openaqApi.getCoverage().then(setCoverage).catch(() => {});
      handleNearbySearch();
      loadDirectory();
    }
  }, [isOpen]);

  const handleNearbySearch = async () => {
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    const rKm = parseFloat(radiusKm) || 25;

    if (!isFinite(lat) || !isFinite(lon)) {
      setNearbyError('Please enter valid latitude and longitude coordinates.');
      return;
    }

    setNearbyLoading(true);
    setNearbyError(null);
    try {
      const res = await openaqApi.getNearby({
        lat,
        lon,
        radius: Math.round(rKm * 1000),
        limit: 25,
      });
      setNearbyResults(res.locations);
      setNearbyLoading(false);
    } catch (err: unknown) {
      let msg = 'Failed to load locations';
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: { error?: { message?: string } } } }).response;
        if (resp?.data?.error?.message) msg = resp.data.error.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setNearbyError(msg);
      setNearbyLoading(false);
    }
  };

  const loadDirectory = async () => {
    setDirLoading(true);
    try {
      const res = await openaqApi.getLocations({
        limit: 50,
        search: searchQuery || undefined,
        dashboard_only: dashboardFilter === 'dashboard',
      });
      setDirLocations(res.data);
      setTotalDirCount(res.total);
      setDirLoading(false);
    } catch {
      setDirLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'directory') {
      const timer = setTimeout(() => {
        loadDirectory();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, dashboardFilter, activeTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="openaq-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="openaq-modal-header">
          <div>
            <div className="openaq-modal-tag">OPENAQ V3 INDIA REGISTRY</div>
            <h2 className="openaq-modal-title">Expanded Environmental Station Coverage</h2>
          </div>
          <button className="btn-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Coverage Stats Banner */}
        {coverage && (
          <div className="coverage-metrics-grid">
            <div className="coverage-metric-card highlight">
              <span className="coverage-num">{coverage.total_locations}</span>
              <span className="coverage-label">Total Indian Locations</span>
              <span className="coverage-sublabel">OpenAQ v3 Verified</span>
            </div>
            <div className="coverage-metric-card">
              <span className="coverage-num">{coverage.dashboard_stations}</span>
              <span className="coverage-label">Active Dashboard Set</span>
              <span className="coverage-sublabel">Telemetry & Forecasts</span>
            </div>
            <div className="coverage-metric-card">
              <span className="coverage-num">{coverage.expanded_network_stations}</span>
              <span className="coverage-label">Expanded Network</span>
              <span className="coverage-sublabel">Available for Proximity</span>
            </div>
            <div className="coverage-metric-card">
              <span className="coverage-num">{coverage.cities_count}</span>
              <span className="coverage-label">Unique Cities</span>
              <span className="coverage-sublabel">Nationwide Spatial Index</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="openaq-modal-tabs">
          <button
            className={`openaq-tab-btn ${activeTab === 'nearby' ? 'active' : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            📍 PostGIS Nearby Station Search
          </button>
          <button
            className={`openaq-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            📋 Discovered Locations Directory ({totalDirCount || coverage?.total_locations || '764'})
          </button>
        </div>

        {/* TAB 1: PostGIS Proximity Search */}
        {activeTab === 'nearby' && (
          <div className="openaq-tab-content">
            <div className="nearby-controls-panel">
              <div className="presets-row">
                <span className="presets-label">City Presets:</span>
                {PRESET_CITIES.map((c) => (
                  <button
                    key={c.name}
                    className="preset-chip-btn"
                    onClick={() => {
                      setLatInput(String(c.lat));
                      setLonInput(String(c.lon));
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="nearby-inputs-row">
                <div className="input-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="modal-text-input"
                    value={latInput}
                    onChange={(e) => setLatInput(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="modal-text-input"
                    value={lonInput}
                    onChange={(e) => setLonInput(e.target.value)}
                  />
                </div>
                <div className="input-group small">
                  <label>Radius (km)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    className="modal-text-input"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary search-nearby-btn"
                  onClick={handleNearbySearch}
                  disabled={nearbyLoading}
                >
                  {nearbyLoading ? 'Searching…' : 'Find Nearby OpenAQ Stations'}
                </button>
              </div>

              {nearbyError && <div className="modal-error-banner">{nearbyError}</div>}
            </div>

            <div className="nearby-results-section">
              <div className="nearby-results-header">
                <h4>Nearby OpenAQ Stations ({nearbyResults.length} found within {radiusKm} km)</h4>
                <span className="postgis-indicator">Powered by PostGIS ST_DWithin &amp; ST_Distance</span>
              </div>

              <div className="nearby-results-list">
                {nearbyResults.map((loc) => (
                  <div key={loc.id} className="nearby-station-row">
                    <div className="nearby-station-left">
                      <div className="nearby-title-wrap">
                        <span className="nearby-station-name">{loc.name}</span>
                        {loc.is_dashboard_station ? (
                          <span className="badge-dashboard-set">Dashboard Display Set</span>
                        ) : (
                          <span className="badge-expanded-net">Expanded Network</span>
                        )}
                      </div>
                      <div className="nearby-station-loc">
                        {loc.locality ? `${loc.locality}, ` : ''}{loc.city}, {loc.state} · {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
                      </div>
                      <div className="nearby-sensors-row">
                        <span className="sensors-tag">Sensors ({loc.sensors_summary?.length || 0}):</span>
                        {loc.sensors_summary?.map((param) => (
                          <span key={param} className="sensor-chip">{param}</span>
                        ))}
                      </div>
                    </div>

                    <div className="nearby-station-right">
                      <div className="nearby-distance-pill">
                        <strong>{loc.distance_meters != null ? (loc.distance_meters / 1000).toFixed(2) : '—'}</strong> km
                      </div>
                      {loc.is_dashboard_station && onSelectStation && (
                        <button
                          className="btn-ghost view-station-btn"
                          onClick={() => {
                            onSelectStation(loc.id);
                            onClose();
                          }}
                        >
                          View in Dashboard →
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {nearbyResults.length === 0 && !nearbyLoading && (
                  <div className="nearby-empty-state">
                    No OpenAQ stations found within {radiusKm} km of these coordinates. Try expanding the search radius.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Discovered Locations Directory */}
        {activeTab === 'directory' && (
          <div className="openaq-tab-content">
            <div className="directory-filters-row">
              <input
                type="text"
                className="modal-search-input"
                placeholder="Filter by station name, locality or city (e.g. Rohini, Agra)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="filter-pill-group">
                <button
                  className={`filter-pill ${dashboardFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setDashboardFilter('all')}
                >
                  All 764 Discovered
                </button>
                <button
                  className={`filter-pill ${dashboardFilter === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setDashboardFilter('dashboard')}
                >
                  40 Dashboard Stations Only
                </button>
              </div>
            </div>

            <div className="directory-list-wrapper">
              {dirLoading ? (
                <div className="dir-loading-state">Loading OpenAQ directory…</div>
              ) : (
                <table className="directory-table">
                  <thead>
                    <tr>
                      <th>Station / Location</th>
                      <th>City / Region</th>
                      <th>Coordinates</th>
                      <th>Scope</th>
                      <th>Parameters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dirLocations.map((st) => (
                      <tr key={st.id}>
                        <td>
                          <strong>{st.name}</strong>
                          <div className="code-subtext">{st.station_code}</div>
                        </td>
                        <td>{st.locality ? `${st.locality}, ` : ''}{st.city}, {st.state}</td>
                        <td className="coords-cell">{st.latitude.toFixed(4)}°N, {st.longitude.toFixed(4)}°E</td>
                        <td>
                          {st.is_dashboard_station ? (
                            <span className="badge-dashboard-set">Dashboard</span>
                          ) : (
                            <span className="badge-expanded-net">Expanded</span>
                          )}
                        </td>
                        <td>
                          <div className="table-sensors-wrap">
                            {st.sensors_summary?.slice(0, 5).map((s) => (
                              <span key={s} className="sensor-chip small">{s}</span>
                            ))}
                            {(st.sensors_summary?.length || 0) > 5 && (
                              <span className="sensor-more">+{st.sensors_summary.length - 5}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="openaq-modal-footer">
          <span className="footer-transparency-note">
            Source: <strong>OpenAQ REST API v3</strong> · Country Filter: <code>iso=IN</code> · Quota Compliant (60 req/min)
          </span>
          <button className="btn-ghost" onClick={onClose}>Close Registry</button>
        </div>
      </div>
    </div>
  );
};
