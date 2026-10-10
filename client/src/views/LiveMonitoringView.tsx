import React, { useState, useMemo, useEffect } from 'react';
import type { Station } from '../types/station';
import type { Observation } from '../types/observation';
import type { Hotspot } from '../types/hotspot';
import { MapView } from '../components/MapView';
import { StationCard, StationCardSkeleton } from '../components/StationCard';
import { AirQualityMeter } from '../components/AirQualityMeter';
import { formatValue, formatRelativeTime } from '../utils/aqiUtils';
import type { ContextualMeasurement } from '../types/pollutant';
import type { AppView } from '../components/Navbar';
import type { AnalyzedRoute } from '../types/route';

interface LiveMonitoringViewProps {
  stations: Station[];
  latestObs: Observation[];
  selectedStation: Station | null;
  onSelectStation: (station: Station | null) => void;
  hotspots: Hotspot[];
  selectedHotspot: Hotspot | null;
  onSelectHotspot: (hotspot: Hotspot | null) => void;
  loading: boolean;
  error: string | null;
  onOpenPollutantInfo: (pollutantId: string, context?: ContextualMeasurement) => void;
  onNavigate: (view: AppView) => void;
  routes?: AnalyzedRoute[];
  selectedRouteIndex?: number;
  onSelectRouteIndex?: (idx: number) => void;
  routeOrigin?: { latitude: number; longitude: number; name: string } | null;
  routeDestination?: { latitude: number; longitude: number; name: string } | null;
  onOpenStore?: (override?: {
    station?: Station | null;
    pollutant?: string;
    value?: number | null;
    severityTier?: number | null;
    dataType?: 'observed' | 'predicted' | 'modelled';
  }) => void;
  onOpenRecommendations?: (override?: {
    station?: Station | null;
    pollutant?: string;
    value?: number | null;
    severityTier?: number | null;
    dataType?: 'observed' | 'predicted' | 'modelled';
  }) => void;
}

// Complete list of all 28 Indian States and 8 Union Territories
const ALL_INDIAN_STATES_AND_UTS = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
].sort();

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  stations,
  latestObs,
  selectedStation,
  onSelectStation,
  hotspots,
  selectedHotspot,
  onSelectHotspot,
  loading,
  error,
  onOpenPollutantInfo,
  onNavigate,
  routes = [],
  selectedRouteIndex = 0,
  onSelectRouteIndex,
  routeOrigin = null,
  routeDestination = null,
  onOpenStore,
  onOpenRecommendations,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  // Map latest observations by station_id
  const obsMap = useMemo(() => {
    return new Map(latestObs.map((o) => [o.station_id, o]));
  }, [latestObs]);

  // Count active stations per state in current dataset
  const stationsCountByState = useMemo(() => {
    const map = new Map<string, number>();
    stations.forEach((s) => {
      if (s.state) {
        const normalized = s.state.trim();
        map.set(normalized, (map.get(normalized) || 0) + 1);
      }
    });
    return map;
  }, [stations]);

  // Compute dependent cities for selected state from real station data
  const availableCities = useMemo(() => {
    const cityMap = new Map<string, number>();
    stations.forEach((s) => {
      if (s.city) {
        const matchesState =
          selectedState === 'all' ||
          s.state?.toLowerCase() === selectedState.toLowerCase();
        if (matchesState) {
          const c = s.city.trim();
          cityMap.set(c, (cityMap.get(c) || 0) + 1);
        }
      }
    });
    return Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stations, selectedState]);

  // Reset selectedCity when state changes if current city is no longer valid
  useEffect(() => {
    if (selectedCity !== 'all') {
      const cityStillAvailable = availableCities.some((c) => c.name === selectedCity);
      if (!cityStillAvailable) {
        setSelectedCity('all');
      }
    }
  }, [selectedState, availableCities, selectedCity]);

  // Filtered stations based on search, state, dependent city, and active-only
  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.station_code.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedState !== 'all' && s.state.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }

      if (selectedCity !== 'all' && s.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }

      if (filterActiveOnly) {
        const obs = obsMap.get(s.id);
        const hasData = obs && (obs.pm25 !== null || obs.aqi !== null);
        if (!hasData) return false;
      }

      return true;
    });
  }, [stations, searchQuery, selectedState, selectedCity, filterActiveOnly, obsMap]);

  const selectedObservation = selectedStation ? obsMap.get(selectedStation.id) : null;
  const hasSelectedReadings = selectedObservation && (selectedObservation.pm25 !== null || selectedObservation.aqi !== null);

  // Active Pollutants: only render cards for pollutants with valid measurements
  const activePollutants = useMemo(() => {
    if (!selectedObservation) return [];
    const list = [
      { id: 'pm25', label: 'PM2.5', name: 'Fine Particulates (≤2.5µm)', val: selectedObservation.pm25, unit: 'µg/m³' },
      { id: 'pm10', label: 'PM10', name: 'Coarse Particulates (≤10µm)', val: selectedObservation.pm10, unit: 'µg/m³' },
      { id: 'no2', label: 'NO₂', name: 'Nitrogen Dioxide', val: selectedObservation.no2, unit: 'µg/m³' },
      { id: 'so2', label: 'SO₂', name: 'Sulfur Dioxide', val: selectedObservation.so2, unit: 'µg/m³' },
      { id: 'o3', label: 'O₃', name: 'Ground-level Ozone', val: selectedObservation.o3, unit: 'µg/m³' },
      { id: 'co', label: 'CO', name: 'Carbon Monoxide', val: selectedObservation.co, unit: 'mg/m³' },
    ];
    return list.filter((p) => p.val !== null && !isNaN(Number(p.val)));
  }, [selectedObservation]);

  // Active Weather: only render when actual telemetry exists
  const activeWeather = useMemo(() => {
    if (!selectedObservation) return [];
    const list = [
      { label: 'Temperature', val: selectedObservation.temperature, unit: '°C', icon: '🌡️' },
      { label: 'Humidity', val: selectedObservation.humidity, unit: '%', icon: '💧' },
    ];
    return list.filter((w) => w.val !== null && !isNaN(Number(w.val)));
  }, [selectedObservation]);

  // Determine if telemetry timestamp is older than 24 hours
  const isDataStale = useMemo(() => {
    if (!selectedObservation?.recorded_at) return false;
    const recordedTime = new Date(selectedObservation.recorded_at).getTime();
    if (isNaN(recordedTime)) return false;
    const ageHours = (Date.now() - recordedTime) / (1000 * 60 * 60);
    return ageHours > 24;
  }, [selectedObservation]);

  const isFiltersActive =
    searchQuery.trim() !== '' ||
    selectedState !== 'all' ||
    selectedCity !== 'all' ||
    filterActiveOnly;

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedState('all');
    setSelectedCity('all');
    setFilterActiveOnly(false);
  };

  return (
    <div className="nature-page-container live-monitoring-page">
      {/* Page Header Bar */}
      <div className="monitoring-header-bar">
        <div className="header-bar-left">
          <div className="monitoring-tag-row">
            <span className="nature-tag green">LIVE GROUND TELEMETRY</span>
            <span className="nature-tag cyan">CPCB NAQI STANDARD</span>
          </div>
          <h1 className="page-heading">Live Telemetry &amp; Station Network</h1>
          <p className="page-subheading">
            Authentic ground telemetry from official CPCB &amp; OpenAQ monitoring stations across India.
            Select a station from the map or list below to inspect live measurements and air quality meter.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="monitoring-stats-pill">
          <span className="pill-dot green" />
          <span className="pill-primary">{stations.length} Stations Indexed</span>
          <span className="pill-secondary">· {latestObs.filter((o) => o.pm25 !== null).length} Active Feeds</span>
        </div>
      </div>

      {/* Comprehensive Filter Controls Bar (State, Dependent City, Search, Active) */}
      <div className="monitoring-filters-card">
        <div className="filters-inputs-grid">
          {/* Search Box */}
          <div className="nature-search-box">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search station, city or station code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search monitoring stations"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')} title="Clear search">
                ✕
              </button>
            )}
          </div>

          {/* State Selector covering all 28 States and 8 UTs */}
          <div className="filter-select-group">
            <label htmlFor="state-filter-select" className="filter-field-label">State / UT:</label>
            <select
              id="state-filter-select"
              className="nature-select"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('all'); // Reset dependent city on state change
              }}
              aria-label="Filter by state or union territory"
            >
              <option value="all">All States &amp; UTs (36)</option>
              {ALL_INDIAN_STATES_AND_UTS.map((st) => {
                const count = stationsCountByState.get(st) || 0;
                return (
                  <option key={st} value={st}>
                    {st} {count > 0 ? `(${count} stn)` : '(0 stn)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Dependent City Selector */}
          <div className="filter-select-group">
            <label htmlFor="city-filter-select" className="filter-field-label">Monitoring City:</label>
            <select
              id="city-filter-select"
              className="nature-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filter by city"
              disabled={availableCities.length === 0}
            >
              <option value="all">
                {selectedState === 'all'
                  ? `All Cities (${availableCities.length})`
                  : `All Cities in ${selectedState} (${availableCities.length})`}
              </option>
              {availableCities.map(({ name, count }) => (
                <option key={name} value={name}>
                  {name} ({count} {count === 1 ? 'station' : 'stations'})
                </option>
              ))}
            </select>
          </div>

          {/* Active Readings Checkbox */}
          <label className="nature-checkbox-label">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
            />
            <span>Active Readings Only</span>
          </label>
        </div>

        {/* Filters Status Bar */}
        <div className="filters-status-bar">
          <div className="filtered-count-text">
            Showing <strong>{filteredStations.length}</strong> of <strong>{stations.length}</strong> stations
            {selectedState !== 'all' && ` in ${selectedState}`}
            {selectedCity !== 'all' && ` (${selectedCity})`}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>

          {isFiltersActive && (
            <button className="clear-filters-btn" onClick={handleResetFilters}>
              Reset all filters ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="nature-alert error" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: Interactive Map & Station Inspector DIRECTLY BELOW THE MAP */}
      <section className="monitoring-map-and-meter-section">
        {/* Map Container */}
        <div className="monitoring-map-wrapper">
          <div className="map-wrapper-header">
            <div className="map-title-row">
              <span className="map-section-badge">INTERACTIVE MAP</span>
              <h2 className="map-section-title">National Telemetry &amp; Spatial Distribution</h2>
            </div>
            <div className="map-legend-pills">
              <span className="legend-chip"><span className="dot good" /> Good (&lt;30)</span>
              <span className="legend-chip"><span className="dot satisfactory" /> Satisfactory (31–60)</span>
              <span className="legend-chip"><span className="dot moderate" /> Moderate (61–90)</span>
              <span className="legend-chip"><span className="dot poor" /> Poor (91–120)</span>
              <span className="legend-chip"><span className="dot severe" /> Very Poor / Severe (&gt;120)</span>
              <span className="legend-chip"><span className="dot gray" /> Pending Telemetry</span>
            </div>
          </div>

          <MapView
            stations={filteredStations}
            latestObservations={latestObs}
            selectedStation={selectedStation}
            onSelectStation={(s) => onSelectStation(s)}
            mode="live"
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={onSelectHotspot}
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRouteIndex={onSelectRouteIndex}
            routeOrigin={routeOrigin}
            routeDestination={routeDestination}
            height={380}
          />
        </div>

        {/* Station Details Panel & Air Quality Meter DIRECTLY BELOW THE MAP */}
        <div className="station-details-and-meter-panel">
          {selectedStation ? (
            <article className="selected-station-inspector-card">
              {/* Header with identity & navigation actions */}
              <div className="inspector-header">
                <div className="inspector-identity">
                  <div className="inspector-chips-row">
                    <span className="station-code-chip">{selectedStation.station_code}</span>
                    <span className="station-source-chip">{selectedStation.source_type.toUpperCase()}</span>
                    {hasSelectedReadings ? (
                      <span className={`live-telemetry-badge ${isDataStale ? 'stale' : 'live'}`}>
                        {isDataStale ? '⚠️ Historical Telemetry' : '● Live Ingestion'}
                      </span>
                    ) : (
                      <span className="live-telemetry-badge offline">○ Offline</span>
                    )}
                  </div>
                  <h3 className="inspector-station-name">{selectedStation.name}</h3>
                  <div className="inspector-coords-row">
                    <span className="inspector-loc">📍 {selectedStation.city}, {selectedStation.state}</span>
                    <span className="inspector-geo">
                      {selectedStation.latitude?.toFixed(4)}°N, {selectedStation.longitude?.toFixed(4)}°E
                    </span>
                  </div>
                </div>

                <div className="inspector-actions">
                  {onOpenRecommendations && (
                    <button
                      className="nature-btn nature-btn-sm nature-btn-secondary btn-station-rec-action"
                      onClick={() =>
                        onOpenRecommendations({
                          station: selectedStation,
                          pollutant: 'pm25',
                          value: selectedObservation?.pm25,
                          dataType: 'observed',
                        })
                      }
                      title="View verified precaution recommendations based on this station's telemetry"
                    >
                      🛡 Precautions ↗
                    </button>
                  )}
                  {onOpenStore && (
                    <button
                      className="nature-btn nature-btn-sm nature-btn-secondary btn-station-store-action"
                      onClick={() =>
                        onOpenStore({
                          station: selectedStation,
                          pollutant: 'pm25',
                          value: selectedObservation?.pm25,
                          dataType: 'observed',
                        })
                      }
                      title="Open destination-aware accessories store for this station"
                    >
                      🛍 Protection Gear &amp; Store ↗
                    </button>
                  )}
                  <button
                    className="nature-btn nature-btn-sm nature-btn-secondary"
                    onClick={() => onNavigate('historical')}
                    title="View historical time series for this station"
                  >
                    Historical Trend ↗
                  </button>
                  <button
                    className="nature-btn nature-btn-sm nature-btn-secondary"
                    onClick={() => onNavigate('forecast')}
                    title="View 5-day ML forecast for this station"
                  >
                    5-Day Forecast ↗
                  </button>
                  <button
                    className="inspector-close-btn"
                    onClick={() => onSelectStation(null)}
                    title="Deselect station"
                    aria-label="Close station inspection"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Air Quality Meter Component (Horizontal Segmented CPCB Gauge) */}
              <div className="inspector-meter-section">
                <AirQualityMeter
                  observation={selectedObservation}
                  station={selectedStation}
                  onOpenPollutantInfo={onOpenPollutantInfo}
                />
              </div>

              {/* Pollutants Measurement Grid (Displayed only when readings exist) */}
              {hasSelectedReadings && (activePollutants.length > 0 || activeWeather.length > 0) ? (
                <div className="inspector-pollutants-section">
                  <div className="pollutants-section-top">
                    <div className="pollutants-grid-title">
                      Verified Sensor Telemetry ({activePollutants.length + activeWeather.length} Parameters Active):
                    </div>
                    <span className="pollutants-grid-hint">Click parameter for scientific CPCB threshold guide</span>
                  </div>

                  <div className="inspector-pollutant-grid">
                    {/* Active Pollutants */}
                    {activePollutants.map((pollutant) => (
                      <div
                        key={pollutant.id}
                        className="inspector-metric-cell clickable"
                        onClick={() => {
                          onOpenPollutantInfo(pollutant.id, {
                            metric: pollutant.id,
                            pollutantName: pollutant.label,
                            value: pollutant.val,
                            unit: pollutant.unit,
                            stationName: selectedStation.name,
                            dateOrTimestamp: selectedObservation?.recorded_at,
                            source: selectedObservation?.source || selectedStation.source_type,
                            dataType: 'observed',
                          });
                        }}
                        title={`Inspect CPCB scientific guide for ${pollutant.label}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            onOpenPollutantInfo(pollutant.id, {
                              metric: pollutant.id,
                              pollutantName: pollutant.label,
                              value: pollutant.val,
                              unit: pollutant.unit,
                              stationName: selectedStation.name,
                              dateOrTimestamp: selectedObservation?.recorded_at,
                              source: selectedObservation?.source || selectedStation.source_type,
                              dataType: 'observed',
                            });
                          }
                        }}
                      >
                        <div className="metric-cell-top">
                          <span className="metric-cell-label">{pollutant.label}</span>
                          <span className="metric-info-icon" title="View health standard">ⓘ</span>
                        </div>
                        <div className="metric-cell-val-row">
                          <span className="metric-cell-value">{formatValue(pollutant.val, '')}</span>
                          <span className="metric-cell-unit">{pollutant.unit}</span>
                        </div>
                        <div className="metric-cell-subtext">{pollutant.name}</div>
                      </div>
                    ))}

                    {/* Active Meteorological Sensors (only when actual readings exist) */}
                    {activeWeather.map((weather) => (
                      <div key={weather.label} className="inspector-metric-cell weather-cell">
                        <div className="metric-cell-top">
                          <span className="metric-cell-label">{weather.label}</span>
                          <span className="weather-icon">{weather.icon}</span>
                        </div>
                        <div className="metric-cell-val-row">
                          <span className="metric-cell-value">{formatValue(weather.val, '')}</span>
                          <span className="metric-cell-unit">{weather.unit}</span>
                        </div>
                        <div className="metric-cell-subtext">Ambient Telemetry</div>
                      </div>
                    ))}
                  </div>

                  {/* Compact Footer with Recorded Timestamp & Ingestion Freshness */}
                  <div className="inspector-footer-meta">
                    <div className="meta-item">
                      <span className="meta-label">Source Provider:</span>
                      <strong className="meta-value">{selectedObservation?.source || selectedStation.source_type || 'OpenAQ'}</strong>
                    </div>
                    <span className="meta-sep">·</span>
                    <div className="meta-item">
                      <span className="meta-label">Observation Timestamp:</span>
                      <strong className="meta-value">
                        {selectedObservation?.recorded_at
                          ? new Date(selectedObservation.recorded_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Recorded Telemetry'}
                      </strong>
                    </div>
                    <span className="meta-sep">·</span>
                    <div className="meta-item">
                      <span className="meta-label">Pipeline Ingestion:</span>
                      <strong className="meta-value">{formatRelativeTime(selectedObservation?.ingested_at)}</strong>
                    </div>
                    {isDataStale && (
                      <>
                        <span className="meta-sep">·</span>
                        <div className="meta-item stale-warning-pill">
                          <span>⚠️ Stale Telemetry (&gt;24h ago)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : !hasSelectedReadings ? (
                <div className="inspector-no-data-notice">
                  <div className="no-data-icon">📡</div>
                  <h4>No current readings available for this station</h4>
                  <p>
                    Ground observations are currently offline or pending ingestion from the provider for{' '}
                    <strong>{selectedStation.name}</strong>.
                  </p>
                  <span className="honest-policy-badge">
                    Honest Data Policy: Unobserved pollutant values are never simulated or fabricated.
                  </span>
                </div>
              ) : null}
            </article>
          ) : (
            <div className="monitoring-empty-prompt">
              <span className="prompt-icon">📍</span>
              <div className="prompt-content">
                <h4>No Station Selected</h4>
                <p>
                  Click any station marker on the map above or choose from the 40 monitoring cards below to
                  view live telemetry and inspect the CPCB air quality meter.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: 40 Monitoring Station Cards Grid */}
      <section className="monitoring-cards-section">
        <div className="cards-section-header">
          <div>
            <h2 className="cards-section-title">
              Monitoring Station Cards ({filteredStations.length} of {stations.length} Stations)
            </h2>
            <p className="cards-section-subtitle">
              Interactive telemetry overview with real-time pollutant measurements and CPCB thresholds.
            </p>
          </div>

          {filteredStations.length < stations.length && (
            <span className="filter-active-note">
              Filtered subset displayed based on active state, city, or search criteria.
            </span>
          )}
        </div>

        {/* Station Cards Responsive Grid */}
        <div className="responsive-station-cards-grid">
          {loading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <StationCardSkeleton key={idx} />
            ))
          ) : filteredStations.length > 0 ? (
            filteredStations.map((station) => {
              const obs = obsMap.get(station.id);
              return (
                <StationCard
                  key={station.id}
                  station={station}
                  observation={obs}
                  isSelected={selectedStation?.id === station.id}
                  onClick={() => {
                    onSelectStation(station);
                    // Smoothly scroll map & meter into view
                    const mapSection = document.querySelector('.monitoring-map-and-meter-section');
                    if (mapSection) {
                      mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  mode="live"
                  onOpenPollutantInfo={onOpenPollutantInfo}
                />
              );
            })
          ) : (
            <div className="empty-stations-notice-card">
              <span className="empty-icon">🔍</span>
              <h3>No monitoring stations match your filters</h3>
              <p>
                No stations found for the selected state ({selectedState !== 'all' ? selectedState : 'All'}), city, or search term.
              </p>
              <button className="nature-btn nature-btn-primary" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
