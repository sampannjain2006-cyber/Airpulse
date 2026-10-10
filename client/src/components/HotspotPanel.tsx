import React from 'react';
import type { Hotspot } from '../types/hotspot';

interface HotspotPanelProps {
  hotspots: Hotspot[];
  selectedHotspot: Hotspot | null;
  onSelectHotspot: (hotspot: Hotspot | null) => void;
  onSelectStation?: (stationId: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  mode: 'live' | 'historical' | 'forecast';
  selectedDate: string;
  selectedModel: string;
  loading?: boolean;
  onOpenPollutantInfo?: (pollutantId: string, context?: any) => void;
  onOpenRecommendations?: (params: any) => void;
}

export const HotspotPanel: React.FC<HotspotPanelProps> = ({
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  onSelectStation,
  isOpen,
  onToggle,
  mode,
  selectedDate,
  selectedModel,
  loading = false,
  onOpenPollutantInfo,
  onOpenRecommendations,
}) => {
  const isForecast = mode === 'forecast';

  return (
    <div className={`hotspot-panel-card ${isOpen ? 'open' : 'collapsed'}`}>
      {/* Header */}
      <div className="hotspot-panel-header" onClick={onToggle}>
        <div className="hotspot-header-left">
          <div className="hotspot-badge-row">
            <span className="hotspot-tag">FEATURE 7 · POSTGIS DBSCAN</span>
            <span className={`hotspot-mode-chip ${isForecast ? 'predicted' : 'observed'}`}>
              <span className={`hotspot-dot ${isForecast ? 'purple' : 'cyan'}`} />
              {isForecast ? 'PREDICTED HOTSPOTS' : 'OBSERVED HOTSPOTS'}
            </span>
          </div>
          <h3 className="hotspot-panel-title">
            Geospatial Pollution Hotspots
            <span className="hotspot-count-chip">
              {loading ? 'Analyzing…' : `${hotspots.length} DETECTED`}
            </span>
          </h3>
          <span className="hotspot-panel-subtitle">
            Spatial clusters of $\ge 2$ distinct stations within 40km with elevated PM2.5 on {selectedDate}
          </span>
        </div>

        <div className="hotspot-header-right">
          <button className="hotspot-toggle-btn" title={isOpen ? 'Collapse panel' : 'Expand panel'}>
            {isOpen ? 'Collapse ▲' : 'Inspect Hotspots ▼'}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="hotspot-panel-body">
          {/* Method and threshold explanation bar */}
          <div className="hotspot-config-bar">
            <span className="config-item"><strong>Algorithm:</strong> PostGIS <code>ST_ClusterDBSCAN</code> (3857)</span>
            <span className="config-separator">·</span>
            <span className="config-item"><strong>Cluster Radius ($\epsilon$):</strong> 40 km</span>
            <span className="config-separator">·</span>
            <span className="config-item"><strong>Min Stations:</strong> 2 distinct</span>
            <span className="config-separator">·</span>
            <span className="config-item"><strong>Threshold:</strong> PM2.5 $\ge$ 60 µg/m³</span>
            {isForecast && (
              <>
                <span className="config-separator">·</span>
                <span className="config-item purple"><strong>Model:</strong> {selectedModel}</span>
              </>
            )}
          </div>

          {loading ? (
            <div className="hotspot-loading-state">
              Computing PostGIS spatial clusters for {selectedDate}…
            </div>
          ) : hotspots.length > 0 ? (
            <div className="hotspot-cards-list">
              {hotspots.map((h) => {
                const isSelected = selectedHotspot?.id === h.id;
                const radiusKm = Math.round((h.actual_cluster_radius_meters / 1000) * 10) / 10;

                return (
                  <div
                    key={h.id}
                    className={`hotspot-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectHotspot(isSelected ? null : h)}
                  >
                    {/* Top Row: Title, Severity Pill & HDII */}
                    <div className="hotspot-card-top">
                      <div className="hotspot-card-title-group">
                        <span className="hotspot-flame-icon">🔥</span>
                        <div>
                          <h4 className="hotspot-title">{h.title}</h4>
                          <span className="hotspot-id-sub">{h.id}</span>
                        </div>
                      </div>

                      <div className="hotspot-card-badges">
                        <div
                          className="hotspot-severity-pill"
                          style={{
                            backgroundColor: h.severity.bg_color,
                            color: h.severity.color,
                            borderColor: h.severity.color,
                          }}
                        >
                          <span className="severity-dot" style={{ backgroundColor: h.severity.color }} />
                          <strong>{h.severity.category?.toUpperCase()}</strong>
                          <span>Tier {h.severity.severity_level}/6</span>
                        </div>

                        <div className="hotspot-hdii-badge" title={h.scoring.formula}>
                          HDII: <strong>{h.scoring.value}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Metric Grid */}
                    <div className="hotspot-metrics-grid">
                      <div
                        className={`hotspot-metric-cell ${onOpenPollutantInfo ? 'clickable-pollutant-cell' : ''}`}
                        onClick={(e) => {
                          if (onOpenPollutantInfo) {
                            e.stopPropagation();
                            onOpenPollutantInfo('pm25', {
                              metric: 'pm25',
                              pollutantName: 'PM2.5',
                              value: h.avg_pm25,
                              unit: 'µg/m³',
                              stationName: `${h.title} (${h.station_count} stations)`,
                              dateOrTimestamp: h.date,
                              source: isForecast ? `AIRPULSE ML Forecast (${selectedModel})` : 'OpenAQ Ground Stations Telemetry',
                              dataType: isForecast ? 'predicted' : 'observed',
                              severityCategory: h.severity.category,
                              severityColor: h.severity.color,
                            });
                          }
                        }}
                        title="Click to view PM2.5 standards & context for this hotspot"
                      >
                        <span className="h-metric-label">Average PM2.5 ⓘ</span>
                        <span className="h-metric-val">{h.avg_pm25.toFixed(1)} <small>µg/m³</small></span>
                      </div>
                      <div className="hotspot-metric-cell">
                        <span className="h-metric-label">Peak PM2.5</span>
                        <span className="h-metric-val peak">{h.max_pm25.toFixed(1)} <small>µg/m³</small></span>
                      </div>
                      <div className="hotspot-metric-cell">
                        <span className="h-metric-label">Qualifying Stations</span>
                        <span className="h-metric-val">{h.station_count} <small>distinct</small></span>
                      </div>
                      <div className="hotspot-metric-cell">
                        <span className="h-metric-label">Cluster Extent</span>
                        <span className="h-metric-val">{radiusKm} <small>km radius</small></span>
                      </div>
                    </div>

                    {/* Contributing Stations List */}
                    <div className="contributing-stations-row">
                      <span className="contrib-label">Contributing Stations:</span>
                      <div className="contrib-chips-wrap">
                        {h.contributing_stations.map((st) => (
                          <button
                            key={st.station_id}
                            className="contrib-station-chip"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectStation) onSelectStation(st.station_id);
                            }}
                            title={`Focus station ${st.name} (PM2.5: ${st.pm25} µg/m³, ${st.dist_to_center_km}km from centroid)`}
                          >
                            <span className="st-name">{st.name}</span>
                            <span className="st-pm25">{Math.round(st.pm25)} µg/m³</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="hotspot-card-footer">
                      <span className="hotspot-source-text">
                        Source: {h.source} · Centroid: ({h.center.latitude.toFixed(4)}°N, {h.center.longitude.toFixed(4)}°E)
                      </span>
                      {onOpenRecommendations && (
                        <button
                          className="btn-hotspot-rec-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecommendations({
                              pollutant: 'pm25',
                              value: h.avg_pm25,
                              mode,
                              selectedDate,
                              selectedModel,
                              dataType: isForecast ? 'predicted' : 'observed',
                            });
                          }}
                          title="View verified precaution recommendations for this hotspot cluster"
                        >
                          🛡 Precautions →
                        </button>
                      )}
                      <button
                        className="btn-focus-hotspot"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHotspot(h);
                        }}
                      >
                        {isSelected ? '✓ Centered on Map' : 'Center on Map →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hotspot-empty-card">
              <span className="empty-icon">✓</span>
              <div className="empty-text">
                <h4>No qualifying pollution hotspots detected for the selected date.</h4>
                <p>
                  No spatial cluster of $\ge 2$ distinct monitoring stations within 40 km exceeded the PM2.5 60 µg/m³ threshold on {selectedDate}.
                  Individual isolated stations with elevated readings are not classified as regional hotspots per CPCB spatial criteria.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
