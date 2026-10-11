import React, { useState, useEffect, useCallback } from 'react';
import type { Hotspot } from '../types/hotspot';
import type { Station } from '../types/station';
import type { Observation } from '../types/observation';
import { MapView } from '../components/MapView';
import { formatValue } from '../utils/aqiUtils';
import type { ContextualMeasurement } from '../types/pollutant';
import { hotspotsApi } from '../api/hotspots';

interface HotspotsViewProps {
  hotspots: Hotspot[];
  selectedHotspot: Hotspot | null;
  onSelectHotspot: (hotspot: Hotspot | null) => void;
  stations: Station[];
  latestObservations?: Observation[];
  onSelectStation: (station: Station) => void;
  loading: boolean;
  selectedDate: string;
  mode: 'live' | 'historical' | 'forecast';
  selectedModel: string;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement) => void;
}

export const HotspotsView: React.FC<HotspotsViewProps> = ({
  hotspots: initialHotspots,
  selectedHotspot,
  onSelectHotspot,
  stations,
  latestObservations = [],
  onSelectStation,
  loading: initialLoading,
  selectedDate: initialSelectedDate,
  mode: initialMode,
  selectedModel,
  onOpenPollutantInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'clusters' | 'algorithm'>('clusters');
  const [currentMode, setCurrentMode] = useState<'live' | 'forecast'>(
    initialMode === 'forecast' ? 'forecast' : 'live'
  );
  const [currentDate, setCurrentDate] = useState<string>(
    initialHotspots[0]?.date || '2026-10-07'
  );
  const [activeHotspots, setActiveHotspots] = useState<Hotspot[]>(initialHotspots);
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  // Sync with initialHotspots on first load or parent update
  useEffect(() => {
    if (initialHotspots && initialHotspots.length > 0) {
      setActiveHotspots(initialHotspots);
      if (initialHotspots[0]?.date) {
        setCurrentDate(initialHotspots[0].date);
      }
    }
  }, [initialHotspots]);

  // Fetch hotspots for selected date and mode
  const fetchHotspotsData = useCallback(async (modeToFetch: 'live' | 'forecast', dateToFetch?: string) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await hotspotsApi.list({
        mode: modeToFetch,
        date: dateToFetch,
        model: selectedModel,
      });
      setActiveHotspots(res.hotspots || []);
      if (res.date) {
        setCurrentDate(res.date);
      }
      setBackendMessage(res.message || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load hotspot data from server';
      setFetchError(msg);
      setActiveHotspots([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel]);

  const handleModeChange = (newMode: 'live' | 'forecast') => {
    setCurrentMode(newMode);
    onSelectHotspot(null);
    if (newMode === 'live') {
      fetchHotspotsData('live');
    } else {
      fetchHotspotsData('forecast', '2026-10-12');
    }
  };

  const handleDateChange = (newDate: string) => {
    setCurrentDate(newDate);
    onSelectHotspot(null);
    fetchHotspotsData(currentMode, newDate);
  };

  const displayDate = currentDate || initialSelectedDate;

  return (
    <div className="nature-page-container hotspots-page">
      {/* Header */}
      <div className="hotspots-header">
        <div>
          <div className="hotspots-tag-row">
            <span className="nature-tag green">SPATIAL CLUSTERING</span>
            <span className="nature-tag cyan">POSTGIS DBSCAN</span>
            <span className="nature-tag purple">PM2.5 THRESHOLD ≥ 60 µg/m³</span>
          </div>
          <h1 className="page-heading">Geospatial Pollution Hotspots</h1>
          <p className="page-subheading">
            Algorithmic density-based clustering detecting contiguous elevated PM2.5 zones across India
          </p>
        </div>

        <div className="hotspots-summary-pill">
          <span className="hotspot-pulse-dot" />
          <span className="summary-pill-text">
            {isLoading ? 'Analyzing spatial density…' : `${activeHotspots.length} Clusters Detected`}
          </span>
          <span className="summary-pill-date">({displayDate})</span>
        </div>
      </div>

      {/* Mode & Date Filter Controls */}
      <div className="forecast-controls-card" style={{ marginBottom: '16px', padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#74c69d', textTransform: 'uppercase' }}>
              Data Mode:
            </span>
            <div style={{ display: 'flex', background: '#081c15', borderRadius: '8px', padding: '2px', border: '1px solid #2d6a4f' }}>
              <button
                type="button"
                onClick={() => handleModeChange('live')}
                style={{
                  background: currentMode === 'live' ? '#2d6a4f' : 'transparent',
                  color: currentMode === 'live' ? '#ffffff' : '#95d5b2',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🌿 Ground Observations (Live)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('forecast')}
                style={{
                  background: currentMode === 'forecast' ? '#2d6a4f' : 'transparent',
                  color: currentMode === 'forecast' ? '#ffffff' : '#95d5b2',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🔮 ML Forecast Clusters (5-Day)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label htmlFor="hotspot-date-select" style={{ fontSize: '12px', fontWeight: 600, color: '#74c69d' }}>
              Target Date:
            </label>
            {currentMode === 'live' ? (
              <select
                id="hotspot-date-select"
                className="nature-input"
                style={{ padding: '6px 10px', fontSize: '12px', minWidth: '180px' }}
                value={currentDate}
                onChange={(e) => handleDateChange(e.target.value)}
              >
                <option value="2026-10-07">2026-10-07 (Latest Observations)</option>
                <option value="2026-05-01">2026-05-01 (Historical)</option>
                <option value="2026-04-30">2026-04-30 (Historical)</option>
                <option value="2026-04-25">2026-04-25 (Historical)</option>
              </select>
            ) : (
              <select
                id="hotspot-date-select"
                className="nature-input"
                style={{ padding: '6px 10px', fontSize: '12px', minWidth: '180px' }}
                value={currentDate}
                onChange={(e) => handleDateChange(e.target.value)}
              >
                <option value="2026-10-12">2026-10-12 (Forecast Day 1)</option>
                <option value="2026-10-13">2026-10-13 (Forecast Day 2)</option>
                <option value="2026-10-14">2026-10-14 (Forecast Day 3)</option>
                <option value="2026-10-15">2026-10-15 (Forecast Day 4)</option>
                <option value="2026-10-16">2026-10-16 (Forecast Day 5)</option>
              </select>
            )}

            <button
              type="button"
              className="nature-btn secondary sm"
              onClick={() => fetchHotspotsData(currentMode, currentDate)}
              title="Refresh hotspot cluster analysis"
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="hotspots-tabs-row">
        <button
          className={`nature-tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
          <span>Detected Clusters ({activeHotspots.length})</span>
        </button>
        <button
          className={`nature-tab-btn ${activeTab === 'algorithm' ? 'active' : ''}`}
          onClick={() => setActiveTab('algorithm')}
        >
          <span>Clustering Methodology &amp; Criteria</span>
        </button>
      </div>

      {fetchError && (
        <div className="nature-alert error" role="alert" style={{ marginBottom: '16px' }}>
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Unable to load hotspot data</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>{fetchError}</p>
          </div>
          <button
            type="button"
            className="nature-btn secondary sm"
            onClick={() => fetchHotspotsData(currentMode, currentDate)}
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === 'clusters' ? (
        <div className="hotspots-content-layout">
          {/* Left Column: Cluster Cards */}
          <aside className="hotspots-list-column">
            <div className="hotspot-list-heading">
              <span>Clusters on {displayDate}</span>
              <span className="mode-badge">
                {currentMode === 'forecast' ? `ML Forecast (${selectedModel})` : 'Ground Measured'}
              </span>
            </div>

            <div className="hotspots-scroll-area">
              {isLoading ? (
                <div className="hotspots-loading-state">
                  <div className="hotspots-loading-spinner" />
                  <p>Analyzing regional pollution patterns with PostGIS DBSCAN…</p>
                </div>
              ) : activeHotspots.length > 0 ? (
                activeHotspots.map((hs) => {
                  const isSelected = selectedHotspot?.id === hs.id;
                  return (
                    <article
                      key={hs.id}
                      className={`hotspot-cluster-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectHotspot(isSelected ? null : hs)}
                    >
                      <div className="cluster-card-header">
                        <span className="cluster-badge">Cluster #{hs.cluster_id}</span>
                        <span
                          className="cluster-severity-pill"
                          style={{
                            backgroundColor: hs.severity?.bg_color || 'rgba(239, 68, 68, 0.12)',
                            color: hs.severity?.color || '#dc2626',
                            cursor: onOpenPollutantInfo ? 'pointer' : 'default',
                          }}
                          onClick={(e) => {
                            if (onOpenPollutantInfo) {
                              e.stopPropagation();
                              onOpenPollutantInfo('pm25');
                            }
                          }}
                          title="Click to view PM2.5 standards"
                        >
                          {hs.severity?.category || 'ELEVATED'}
                        </span>
                      </div>

                      <h3 className="cluster-card-title">{hs.title}</h3>

                      <div className="cluster-stats-grid">
                        <div className="cluster-stat-item">
                          <span className="stat-item-label">Avg PM2.5</span>
                          <span className="stat-item-val">{formatValue(hs.avg_pm25, 'µg/m³')}</span>
                        </div>
                        <div className="cluster-stat-item">
                          <span className="stat-item-label">Peak PM2.5</span>
                          <span className="stat-item-val peak">{formatValue(hs.max_pm25, 'µg/m³')}</span>
                        </div>
                        <div className="cluster-stat-item">
                          <span className="stat-item-label">Station Count</span>
                          <span className="stat-item-val">{hs.station_count} stations</span>
                        </div>
                        <div className="cluster-stat-item">
                          <span className="stat-item-label">Radius</span>
                          <span className="stat-item-val">{Math.round((hs.actual_cluster_radius_meters || hs.radius_meters) / 1000)} km</span>
                        </div>
                      </div>

                      {/* Contributing Stations list */}
                      <div className="cluster-stations-summary">
                        <span className="stations-summary-label">Contributing Ground Stations:</span>
                        <div className="contributing-stations-list">
                          {hs.contributing_stations.map((st) => (
                            <div
                              key={st.station_id}
                              className="contributing-station-chip"
                              onClick={(e) => {
                                e.stopPropagation();
                                const found = stations.find((s) => s.id === st.station_id);
                                if (found) onSelectStation(found);
                              }}
                              title={`Click to inspect ${st.name}`}
                            >
                              <span className="station-name-text">{st.name}</span>
                              <span className="station-pm-text">{Math.round(st.pm25)} µg/m³</span>
                              {st.dist_to_center_km != null && (
                                <span className="station-dist-text">({Math.round(st.dist_to_center_km)} km)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="hotspots-empty-state">
                  <span className="empty-icon">🍃</span>
                  <h3>No Qualifying Clusters Found</h3>
                  <p>
                    {backendMessage || (
                      <>
                        On <strong>{displayDate}</strong>, no contiguous group of ≥ 2 stations within 40 km exceeded
                        the elevated particulate threshold (≥ 60 µg/m³ PM2.5).
                      </>
                    )}
                  </p>
                  <span className="empty-subtext">
                    This indicates acceptable air dispersal or sparse localized station readings across the evaluated spatial radius.
                  </span>
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Spatial Map */}
          <section className="hotspots-map-section">
            <div className="hotspots-map-container">
              <MapView
                stations={stations}
                latestObservations={latestObservations}
                selectedStation={null}
                onSelectStation={onSelectStation}
                mode={currentMode}
                selectedDate={displayDate}
                hotspots={activeHotspots}
                selectedHotspot={selectedHotspot}
                onSelectHotspot={onSelectHotspot}
                height={480}
              />
            </div>

            {selectedHotspot && (
              <div className="selected-hotspot-banner">
                <div className="banner-cluster-info">
                  <span className="cluster-num">Cluster #{selectedHotspot.cluster_id}</span>
                  <span className="cluster-title">{selectedHotspot.title}</span>
                  <span className="cluster-coords">
                    Center: {selectedHotspot.center.latitude.toFixed(4)}°N, {selectedHotspot.center.longitude.toFixed(4)}°E · Radius: {Math.round(selectedHotspot.actual_cluster_radius_meters / 1000)} km
                  </span>
                </div>
                <button className="banner-dismiss-btn" onClick={() => onSelectHotspot(null)}>
                  Clear Selection ✕
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Algorithm & Criteria Tab */
        <div className="hotspots-methodology-card">
          <div className="methodology-header">
            <span className="methodology-icon">📐</span>
            <div>
              <h2>Regional Density-Based Spatial Clustering</h2>
              <p>PostGIS ST_ClusterDBSCAN (EPSG:3857 Metric Web Mercator Projection)</p>
            </div>
          </div>

          <div className="methodology-grid">
            <div className="methodology-step">
              <span className="step-num">01</span>
              <h3>Elevated Concentration Filter</h3>
              <p>
                Only monitoring stations reporting <strong>PM2.5 ≥ 60 µg/m³</strong> (the CPCB 24-hr NAAQS limit)
                are admitted into the clustering candidate set. Stations below this threshold are treated as non-elevated background.
              </p>
            </div>

            <div className="methodology-step">
              <span className="step-num">02</span>
              <h3>Spatial Distance Metric (Epsilon)</h3>
              <p>
                Epsilon is parameterized at <strong>ε = 40,000 meters (40 km)</strong> using ellipsoidal
                geodetic distance with a clustering radius threshold of 40 km and a minimum of 2 stations.
              </p>
            </div>

            <div className="methodology-step">
              <span className="step-num">03</span>
              <h3>Minimum Station Density (MinPoints)</h3>
              <p>
                A valid regional cluster requires a minimum of <strong>≥ 2 distinct ground stations</strong> within
                the 40 km neighborhood. Isolated single-station spikes are classified as localized noise and excluded.
              </p>
            </div>

            <div className="methodology-step">
              <span className="step-num">04</span>
              <h3>Cluster Center &amp; Severity Scoring</h3>
              <p>
                The cluster centroid is computed via <code>ST_Centroid(ST_Collect(geom))</code>.
                Severity scoring incorporates average PM2.5 scaled logarithmically by station count:
                <code>Score = Avg(PM2.5) × (1 + log₂(N))</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
