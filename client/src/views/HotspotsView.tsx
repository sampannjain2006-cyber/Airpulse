import React, { useState } from 'react';
import type { Hotspot } from '../types/hotspot';
import type { Station } from '../types/station';
import { MapView } from '../components/MapView';
import { formatValue } from '../utils/aqiUtils';
import type { ContextualMeasurement } from '../types/pollutant';

interface HotspotsViewProps {
  hotspots: Hotspot[];
  selectedHotspot: Hotspot | null;
  onSelectHotspot: (hotspot: Hotspot | null) => void;
  stations: Station[];
  onSelectStation: (station: Station) => void;
  loading: boolean;
  selectedDate: string;
  mode: 'live' | 'historical' | 'forecast';
  selectedModel: string;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement) => void;
}

export const HotspotsView: React.FC<HotspotsViewProps> = ({
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  stations,
  onSelectStation,
  loading,
  selectedDate,
  mode,
  selectedModel,
  onOpenPollutantInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'clusters' | 'algorithm'>('clusters');

  return (
    <div className="nature-page-container hotspots-page">
      {/* Header */}
      <div className="hotspots-header">
        <div>
          <div className="hotspots-tag-row">
            <span className="nature-tag red">POSTGIS DBSCAN</span>
            <span className="nature-tag green">SPATIAL CLUSTERING</span>
          </div>
          <h1 className="page-heading">Geospatial Pollution Hotspots</h1>
          <p className="page-subheading">
            Algorithmic density-based clustering detecting contiguous elevated PM2.5 zones across India
          </p>
        </div>

        <div className="hotspots-summary-pill">
          <span className="hotspot-pulse-dot" />
          <span className="summary-pill-text">
            {loading ? 'Analyzing spatial density…' : `${hotspots.length} Clusters Detected`}
          </span>
          <span className="summary-pill-date">({selectedDate})</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="hotspots-tabs-row">
        <button
          className={`nature-tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
          <span>Detected Clusters ({hotspots.length})</span>
        </button>
        <button
          className={`nature-tab-btn ${activeTab === 'algorithm' ? 'active' : ''}`}
          onClick={() => setActiveTab('algorithm')}
        >
          <span>DBSCAN Methodology &amp; Criteria</span>
        </button>
      </div>

      {activeTab === 'clusters' ? (
        <div className="hotspots-content-layout">
          {/* Left Column: Cluster Cards */}
          <aside className="hotspots-list-column">
            <div className="hotspot-list-heading">
              <span>Clusters on {selectedDate}</span>
              <span className="mode-badge">{mode === 'forecast' ? `Forecast (${selectedModel})` : 'Live Telemetry'}</span>
            </div>

            <div className="hotspots-scroll-area">
              {loading ? (
                <div className="hotspots-loading-state">
                  <div className="hotspots-loading-spinner" />
                  <p>Running PostGIS ST_ClusterDBSCAN spatial analysis…</p>
                </div>
              ) : hotspots.length > 0 ? (
                hotspots.map((hs) => {
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
                              <span className="station-dist-text">({Math.round(st.dist_to_center_km)} km)</span>
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
                  <h3>No Severe Clusters Detected</h3>
                  <p>
                    On <strong>{selectedDate}</strong>, no contiguous group of $\ge 2$ stations within 40km exceeded
                    the elevated particulate threshold ($\ge 60$ µg/m³).
                  </p>
                  <span className="empty-subtext">
                    This indicates acceptable air dispersal or sparse localized station readings.
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
                latestObservations={[]}
                selectedStation={null}
                onSelectStation={onSelectStation}
                mode={mode}
                selectedDate={selectedDate}
                hotspots={hotspots}
                selectedHotspot={selectedHotspot}
                onSelectHotspot={onSelectHotspot}
                height={460}
              />
            </div>

            {selectedHotspot && (
              <div className="selected-hotspot-banner">
                <div className="banner-cluster-info">
                  <span className="cluster-num">Cluster #{selectedHotspot.cluster_id}</span>
                  <span className="cluster-title">{selectedHotspot.title}</span>
                  <span className="cluster-coords">
                    Center: {selectedHotspot.center.latitude.toFixed(4)}°N, {selectedHotspot.center.longitude.toFixed(4)}°E
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
              <h2>PostGIS ST_ClusterDBSCAN Mathematical Formulation</h2>
              <p>Density-Based Spatial Clustering of Applications with Noise</p>
            </div>
          </div>

          <div className="methodology-grid">
            <div className="methodology-step">
              <span className="step-num">01</span>
              <h3>Elevated Concentration Filter</h3>
              <p>
                Only monitoring stations reporting <strong>PM2.5 $\ge 60$ µg/m³</strong> (the CPCB 24-hr NAAQS limit)
                are admitted into the clustering candidate set. Stations below this threshold are treated as non-elevated background.
              </p>
            </div>

            <div className="methodology-step">
              <span className="step-num">02</span>
              <h3>Spatial Distance Metric (Epsilon)</h3>
              <p>
                Epsilon is parameterized at <strong>$\varepsilon = 40,000$ meters (40 km)</strong> using ellipsoidal
                geodetic distance via PostGIS spherical geometry casts (`ST_ClusterDBSCAN(geom, eps := 40000, minpoints := 2)`).
              </p>
            </div>

            <div className="methodology-step">
              <span className="step-num">03</span>
              <h3>Minimum Station Density (MinPoints)</h3>
              <p>
                A valid regional cluster requires a minimum of <strong>$\ge 2$ distinct ground stations</strong> within
                the 40 km neighborhood. Isolated single-station spikes are classified as localized noise and excluded.
              </p>
            </div>

            <div className="methodology-step">
              <span className="step-num">04</span>
              <h3>Cluster Center &amp; Severity Scoring</h3>
              <p>
                The cluster centroid is computed via `ST_Centroid(ST_Collect(geom))`.
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
