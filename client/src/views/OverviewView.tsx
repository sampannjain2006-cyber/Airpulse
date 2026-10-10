import React from 'react';
import type { Station } from '../types/station';
import type { Observation } from '../types/observation';
import type { Hotspot } from '../types/hotspot';
import type { PredictionSummaryResponse } from '../types/prediction';
import { MapView } from '../components/MapView';
import { PollutantChart } from '../components/charts/PollutantChart';
import type { HistoryObservation } from '../types/observation';
import type { AppView } from '../components/Navbar';
import { getAqiInfo } from '../utils/aqiUtils';

interface OverviewViewProps {
  stations: Station[];
  latestObs: Observation[];
  hotspots: Hotspot[];
  predictionSummary: PredictionSummaryResponse | null;
  historySample: HistoryObservation[];
  onNavigate: (view: AppView) => void;
  onSelectStation: (station: Station) => void;
  onOpenLookup: () => void;
  onOpenRegistry: () => void;
  onOpenPollutantInfo: (pollutantId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stations,
  latestObs,
  hotspots,
  predictionSummary,
  historySample,
  onNavigate,
  onSelectStation,
  onOpenLookup,
  onOpenRegistry,
  onOpenPollutantInfo,
}) => {
  const activeObsCount = latestObs.filter((o) => o.pm25 !== null || o.aqi !== null).length;

  // Filter stations that have valid PM2.5 or AQI
  const stationsWithData = latestObs
    .filter((o) => o.pm25 !== null || o.aqi !== null)
    .slice(0, 6);

  return (
    <div className="nature-page-container overview-page">
      {/* Hero Section */}
      <section className="overview-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>Real-Time Environmental Intelligence · India</span>
          </div>
          <h1 className="hero-title">
            Empowering Clean Air Decisions Across India
          </h1>
          <p className="hero-description">
            AirPulse tracks authentic ambient air telemetry, detects spatial pollution hotspots via PostGIS,
            and serves short-term statistical forecasts using trained multi-model ensembles.
            No fabricated data. Powered by CPCB standards and OpenAQ ground sensors.
          </p>

          <div className="hero-actions">
            <button className="nature-btn nature-btn-primary" onClick={() => onNavigate('live')}>
              <span>Explore Live Map</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button className="nature-btn nature-btn-secondary" onClick={() => onNavigate('forecast')}>
              <span>5-Day Forecasts</span>
            </button>
            <button className="nature-btn nature-btn-ghost" onClick={onOpenLookup}>
              <span>Address Lookup</span>
            </button>
          </div>
        </div>

        {/* Telemetry Snapshot Cards Grid */}
        <div className="overview-metrics-grid">
          <div className="metric-card" onClick={() => onNavigate('live')} role="button" tabIndex={0}>
            <div className="metric-card-header">
              <span className="metric-label">Monitored Stations</span>
              <span className="metric-icon">🏢</span>
            </div>
            <div className="metric-value-row">
              <span className="metric-main-value">{stations.length}</span>
              <span className="metric-badge success">{activeObsCount} Active</span>
            </div>
            <p className="metric-hint">Official CPCB & OpenAQ telemetry stations across India</p>
          </div>

          <div className="metric-card" onClick={() => onNavigate('hotspots')} role="button" tabIndex={0}>
            <div className="metric-card-header">
              <span className="metric-label">DBSCAN Hotspots</span>
              <span className="metric-icon">🔥</span>
            </div>
            <div className="metric-value-row">
              <span className="metric-main-value">{hotspots.length}</span>
              <span className="metric-badge warning">Spatial Clusters</span>
            </div>
            <p className="metric-hint">Clusters detected using PostGIS ST_ClusterDBSCAN (ε=40km)</p>
          </div>

          <div className="metric-card" onClick={() => onNavigate('forecast')} role="button" tabIndex={0}>
            <div className="metric-card-header">
              <span className="metric-label">ML Forecasting</span>
              <span className="metric-icon">🔮</span>
            </div>
            <div className="metric-value-row">
              <span className="metric-main-value">
                {predictionSummary ? `${predictionSummary.stations_with_forecast}/${predictionSummary.total_stations}` : '5-Day'}
              </span>
              <span className="metric-badge info">Weighted Ensemble</span>
            </div>
            <p className="metric-hint">Trained XGBoost, Random Forest & HistGradientBoosting models</p>
          </div>

          <div className="metric-card" onClick={() => onOpenPollutantInfo('pm25')} role="button" tabIndex={0}>
            <div className="metric-card-header">
              <span className="metric-label">Tracked Pollutants</span>
              <span className="metric-icon">🍃</span>
            </div>
            <div className="metric-value-row">
              <span className="metric-main-value">6</span>
              <span className="metric-badge standard">CPCB NAAQS</span>
            </div>
            <p className="metric-hint">PM2.5, PM10, NO₂, SO₂, CO, and Ground-Level O₃</p>
          </div>
        </div>
      </section>

      {/* Main Grid: Interactive Map Preview & Live Telemetry Spotlight */}
      <section className="overview-main-grid">
        {/* Left Column: Interactive Map Preview */}
        <div className="overview-map-card">
          <div className="section-card-header">
            <div>
              <h2 className="section-card-title">Live India Station Map Preview</h2>
              <p className="section-card-subtitle">Real-time ground station network and ambient measurements</p>
            </div>
            <button className="nature-btn nature-btn-sm nature-btn-secondary" onClick={() => onNavigate('live')}>
              Full Map View ↗
            </button>
          </div>

          <div className="overview-map-wrapper">
            <MapView
              stations={stations}
              latestObservations={latestObs}
              selectedStation={null}
              onSelectStation={(st) => {
                onSelectStation(st);
                onNavigate('live');
              }}
              mode="live"
              hotspots={hotspots}
              height={350}
            />
          </div>

          <div className="overview-map-footer">
            <span className="footer-legend-item">
              <span className="legend-dot good" /> Good / Satisfactory (&lt;60 µg/m³)
            </span>
            <span className="footer-legend-item">
              <span className="legend-dot moderate" /> Moderate (61–90 µg/m³)
            </span>
            <span className="footer-legend-item">
              <span className="legend-dot poor" /> Poor / Severe (&gt;90 µg/m³)
            </span>
            <span className="footer-legend-item">
              <span className="legend-dot inactive" /> Telemetry Idle
            </span>
          </div>
        </div>

        {/* Right Column: Active Station Feed & Historical Trend Preview */}
        <div className="overview-side-column">
          {/* Active Readings Highlights */}
          <div className="overview-panel-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-card-title">Active Station Readings</h3>
                <p className="section-card-subtitle">Latest verified ground observations</p>
              </div>
              <button className="nature-link-btn" onClick={() => onNavigate('live')}>
                View all ({stations.length})
              </button>
            </div>

            <div className="overview-station-feed">
              {stationsWithData.length > 0 ? (
                stationsWithData.map((obs) => {
                  const station = stations.find((s) => s.id === obs.station_id);
                  const aqiInfo = obs.aqi ? getAqiInfo(obs.aqi) : null;
                  return (
                    <div
                      key={obs.station_id}
                      className="overview-feed-item"
                      onClick={() => {
                        if (station) onSelectStation(station);
                        onNavigate('live');
                      }}
                    >
                      <div className="feed-item-header">
                        <span className="feed-station-name">{obs.station_name}</span>
                        <span className="feed-station-city">{obs.city || 'India'}</span>
                      </div>
                      <div className="feed-item-values">
                        {obs.pm25 !== null && (
                          <div className="feed-val-chip">
                            <span className="feed-val-label">PM2.5</span>
                            <span className="feed-val-num">{Math.round(obs.pm25)} µg/m³</span>
                          </div>
                        )}
                        {obs.aqi !== null && aqiInfo && (
                          <div
                            className="feed-aqi-chip"
                            style={{ backgroundColor: `${aqiInfo.color}18`, color: aqiInfo.color }}
                          >
                            <span>AQI {Math.round(obs.aqi)}</span>
                            <span className="feed-aqi-cat">· {aqiInfo.category}</span>
                          </div>
                        )}
                        {obs.pm10 !== null && (
                          <div className="feed-val-chip muted">
                            <span className="feed-val-label">PM10</span>
                            <span className="feed-val-num">{Math.round(obs.pm10)} µg/m³</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-feed-notice">
                  <p>Telemetry sync in progress.</p>
                  <span className="empty-feed-hint">Stations are currently refreshing from OpenAQ.</span>
                </div>
              )}
            </div>
          </div>

          {/* Historical Trend Preview */}
          <div className="overview-panel-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-card-title">Historical Observations Trend</h3>
                <p className="section-card-subtitle">Sample multi-day PM2.5 & PM10 timeline</p>
              </div>
              <button className="nature-link-btn" onClick={() => onNavigate('historical')}>
                Interactive Explorer ↗
              </button>
            </div>

            <div className="overview-chart-container">
              {historySample.length > 0 ? (
                <PollutantChart data={historySample} height={180} />
              ) : (
                <div className="chart-preview-placeholder">
                  <span>Select any station in Live Monitoring or Historical Trends to inspect time-series.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Navigation Cards Section */}
      <section className="overview-features-section">
        <h2 className="features-section-heading">Platform Capabilities & Deep Dives</h2>
        <div className="overview-features-grid">
          <div className="feature-nav-card" onClick={() => onNavigate('live')} role="button" tabIndex={0}>
            <div className="feature-card-icon">📍</div>
            <h3 className="feature-card-title">Live Monitoring & Telemetry</h3>
            <p className="feature-card-desc">
              Inspect interactive Leaflet maps with synchronized station popups, real ground observations, and CPCB NAQI severity ratings.
            </p>
            <span className="feature-card-link">Launch Live Map →</span>
          </div>

          <div className="feature-nav-card" onClick={() => onNavigate('historical')} role="button" tabIndex={0}>
            <div className="feature-card-icon">📈</div>
            <h3 className="feature-card-title">Historical Trend Analysis</h3>
            <p className="feature-card-desc">
              Examine multi-year particulate trends using high-resolution Recharts time-series visualizations with exact timestamps and units.
            </p>
            <span className="feature-card-link">Explore History →</span>
          </div>

          <div className="feature-nav-card" onClick={() => onNavigate('forecast')} role="button" tabIndex={0}>
            <div className="feature-card-icon">🔮</div>
            <h3 className="feature-card-title">Multi-Model ML Forecasts</h3>
            <p className="feature-card-desc">
              Evaluate 5-day predictive curves across XGBoost, Random Forest, HistGradientBoosting, and our Weighted Ensemble with confidence bounds.
            </p>
            <span className="feature-card-link">Inspect Forecasts →</span>
          </div>

          <div className="feature-nav-card" onClick={() => onNavigate('hotspots')} role="button" tabIndex={0}>
            <div className="feature-card-icon">🔥</div>
            <h3 className="feature-card-title">PostGIS DBSCAN Hotspots</h3>
            <p className="feature-card-desc">
              Automated spatial density clustering identifying contiguous regional pollution pockets across Indian municipal boundaries.
            </p>
            <span className="feature-card-link">View Hotspots →</span>
          </div>

          <div className="feature-nav-card" onClick={() => onNavigate('pollutants')} role="button" tabIndex={0}>
            <div className="feature-card-icon">📖</div>
            <h3 className="feature-card-title">Authoritative Pollutant Guide</h3>
            <p className="feature-card-desc">
              Learn the science, sources, and health impacts of PM2.5, PM10, NO₂, SO₂, CO, and O₃ mapped directly to CPCB and WHO thresholds.
            </p>
            <span className="feature-card-link">Read Guide →</span>
          </div>

          <div className="feature-nav-card" onClick={onOpenRegistry} role="button" tabIndex={0}>
            <div className="feature-card-icon">🌐</div>
            <h3 className="feature-card-title">OpenAQ Network Registry</h3>
            <p className="feature-card-desc">
              Discover all indexed Indian air quality monitoring stations, coordinate registries, and ground sensor metadata.
            </p>
            <span className="feature-card-link">Open Registry →</span>
          </div>
        </div>
      </section>

      {/* Attribution & Honest Data Standards Banner */}
      <section className="overview-attribution-banner">
        <div className="attribution-content">
          <div className="attribution-icon">🌱</div>
          <div className="attribution-text">
            <h4 className="attribution-title">Honest Data & Scientific Integrity Policy</h4>
            <p className="attribution-desc">
              AirPulse guarantees that all environmental measurements displayed are derived strictly from authentic
              CPCB and OpenAQ telemetry. In areas or periods where ground measurements are unavailable, AirPulse
              honestly displays missing data rather than fabricating synthetic or misleading values.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
