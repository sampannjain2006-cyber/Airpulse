import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Station, StateHierarchyItem } from '../types/station';
import type { Observation, StationCurrentConditionResponse } from '../types/observation';
import type { Hotspot } from '../types/hotspot';
import { stationsApi } from '../api/stations';
import { observationsApi } from '../api/observations';
import { MapView } from '../components/MapView';
import { StationCard, StationCardSkeleton } from '../components/StationCard';
import { AirQualityMeter } from '../components/AirQualityMeter';
import { formatValue } from '../utils/aqiUtils';
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

  // Authoritative State & City Hierarchy (Task 1)
  const [hierarchy, setHierarchy] = useState<StateHierarchyItem[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [hierarchyError, setHierarchyError] = useState<string | null>(null);

  // Dynamic station list when filtering by State or City (Task 1)
  const [dynamicStations, setDynamicStations] = useState<Station[] | null>(null);
  const [stationsFetching, setStationsFetching] = useState(false);

  // Current condition telemetry with Google Air Quality fallback (Task 3)
  const [currentCondition, setCurrentCondition] = useState<StationCurrentConditionResponse | null>(null);
  const [currentConditionLoading, setCurrentConditionLoading] = useState(false);
  const [currentConditionError, setCurrentConditionError] = useState<string | null>(null);
  const [lastTelemetryRefresh, setLastTelemetryRefresh] = useState<string | null>(null);

  // 1. Fetch authoritative hierarchy on mount
  useEffect(() => {
    let isMounted = true;
    setHierarchyLoading(true);
    setHierarchyError(null);
    stationsApi
      .getHierarchy()
      .then((res) => {
        if (isMounted) {
          setHierarchy(res.states || []);
          setHierarchyLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setHierarchyError(err instanceof Error ? err.message : 'Failed to load station hierarchy');
          setHierarchyLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch stations when state or city filter changes
  useEffect(() => {
    if (selectedState === 'all' && selectedCity === 'all') {
      setDynamicStations(null);
      return;
    }

    let isMounted = true;
    setStationsFetching(true);

    stationsApi
      .list({
        state: selectedState !== 'all' ? selectedState : undefined,
        city: selectedCity !== 'all' ? selectedCity : undefined,
      })
      .then((res) => {
        if (isMounted) {
          const list = res.stations || [];
          setDynamicStations(list);
          setStationsFetching(false);

          // If current selected station is no longer in filtered list, select first match
          if (selectedStation && !list.some((s) => s.id === selectedStation.id)) {
            onSelectStation(list[0] || null);
          } else if (!selectedStation && list.length > 0) {
            onSelectStation(list[0]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[LiveMonitoringView] Filtered stations fetch error:', err);
          setStationsFetching(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedState, selectedCity]);

  // 3. Fetch station current condition (OpenAQ with Google fallback) whenever station changes
  const refreshStationCondition = useCallback(
    async (stationId: number) => {
      setCurrentConditionLoading(true);
      setCurrentConditionError(null);
      try {
        const res = await observationsApi.getCurrentCondition(stationId);
        setCurrentCondition(res);
        setLastTelemetryRefresh(
          new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to retrieve current condition';
        setCurrentConditionError(msg);
      } finally {
        setCurrentConditionLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedStation) {
      refreshStationCondition(selectedStation.id);
    } else {
      setCurrentCondition(null);
    }
  }, [selectedStation, refreshStationCondition]);

  // Active station list: uses dynamic filtered stations when state/city active, otherwise dashboard 40
  const activeStations = dynamicStations !== null ? dynamicStations : stations;

  // Map latest observations by station_id
  const obsMap = useMemo(() => {
    return new Map(latestObs.map((o) => [o.station_id, o]));
  }, [latestObs]);

  // Available states from authoritative hierarchy (with station count)
  const availableStates = useMemo(() => {
    if (hierarchy.length > 0) {
      return hierarchy.map((h) => ({ state: h.state, count: h.station_count }));
    }
    const map = new Map<string, number>();
    stations.forEach((s) => {
      if (s.state) {
        const normalized = s.state.trim();
        map.set(normalized, (map.get(normalized) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => a.state.localeCompare(b.state));
  }, [hierarchy, stations]);

  // Available cities dependent strictly on selectedState (TASK 1 FIX)
  const availableCities = useMemo(() => {
    if (selectedState === 'all') {
      // If all states allowed, gather all distinct cities across all states
      if (hierarchy.length > 0) {
        const cityMap = new Map<string, number>();
        hierarchy.forEach((st) => {
          st.cities.forEach((c) => {
            cityMap.set(c.city, (cityMap.get(c.city) || 0) + c.station_count);
          });
        });
        return Array.from(cityMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      const cityMap = new Map<string, number>();
      stations.forEach((s) => {
        if (s.city) {
          const c = s.city.trim();
          cityMap.set(c, (cityMap.get(c) || 0) + 1);
        }
      });
      return Array.from(cityMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Specific state selected: restrict cities ONLY to cities belonging to that state
    if (hierarchy.length > 0) {
      const stateItem = hierarchy.find(
        (h) => h.state.toLowerCase() === selectedState.toLowerCase()
      );
      if (stateItem) {
        return stateItem.cities.map((c) => ({ name: c.city, count: c.station_count }));
      }
    }

    // Fallback using active station list
    const cityMap = new Map<string, number>();
    stations.forEach((s) => {
      if (s.city && s.state?.toLowerCase() === selectedState.toLowerCase()) {
        const c = s.city.trim();
        cityMap.set(c, (cityMap.get(c) || 0) + 1);
      }
    });
    return Array.from(cityMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [hierarchy, stations, selectedState]);

  // Reset selectedCity when state changes if current city is no longer valid for new state (TASK 1)
  useEffect(() => {
    if (selectedCity !== 'all') {
      const cityStillAvailable = availableCities.some(
        (c) => c.name.toLowerCase() === selectedCity.toLowerCase()
      );
      if (!cityStillAvailable) {
        setSelectedCity('all');
      }
    }
  }, [selectedState, availableCities, selectedCity]);

  // Filtered stations based on search, state, dependent city, and active-only
  const filteredStations = useMemo(() => {
    return activeStations.filter((s) => {
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
  }, [activeStations, searchQuery, selectedState, selectedCity, filterActiveOnly, obsMap]);

  // Selected station observation (uses current condition from Google fallback if present, else latestObs)
  const selectedObservation = useMemo(() => {
    if (!selectedStation) return null;
    const fallbackObs = obsMap.get(selectedStation.id) || null;

    if (currentCondition && currentCondition.status === 'success') {
      return {
        id: selectedStation.id,
        station_id: selectedStation.id,
        station_code: selectedStation.station_code,
        station_name: selectedStation.name,
        city: selectedStation.city,
        state: selectedStation.state,
        latitude: selectedStation.latitude,
        longitude: selectedStation.longitude,
        recorded_at: currentCondition.recorded_at || fallbackObs?.recorded_at || '',
        aqi: currentCondition.aqi !== undefined ? currentCondition.aqi : fallbackObs?.aqi ?? null,
        aqi_category: currentCondition.aqi_category || fallbackObs?.aqi_category || null,
        pm25: currentCondition.pm25 !== undefined ? currentCondition.pm25 : fallbackObs?.pm25 ?? null,
        pm10: currentCondition.pm10 !== undefined ? currentCondition.pm10 : fallbackObs?.pm10 ?? null,
        no2: currentCondition.no2 !== undefined ? currentCondition.no2 : fallbackObs?.no2 ?? null,
        so2: currentCondition.so2 !== undefined ? currentCondition.so2 : fallbackObs?.so2 ?? null,
        co: currentCondition.co !== undefined ? currentCondition.co : fallbackObs?.co ?? null,
        o3: currentCondition.o3 !== undefined ? currentCondition.o3 : fallbackObs?.o3 ?? null,
        temperature: currentCondition.temperature !== undefined ? currentCondition.temperature : fallbackObs?.temperature ?? null,
        humidity: currentCondition.humidity !== undefined ? currentCondition.humidity : fallbackObs?.humidity ?? null,
        pressure: currentCondition.pressure !== undefined ? currentCondition.pressure : fallbackObs?.pressure ?? null,
        source: currentCondition.source || fallbackObs?.source || 'OpenAQ',
        ingested_at: currentCondition.recorded_at || fallbackObs?.ingested_at || '',
      };
    }
    return fallbackObs;
  }, [selectedStation, obsMap, currentCondition]);

  const hasSelectedReadings =
    selectedObservation && (selectedObservation.pm25 !== null || selectedObservation.aqi !== null);

  // Provenance flags (Task 3)
  const isModelledFallback = currentCondition?.data_type === 'modelled';
  const isObservedLive = currentCondition?.data_type === 'observed' && currentCondition.is_fresh;
  const isTelemetryStale =
    currentCondition?.status === 'stale' ||
    (!currentCondition && selectedObservation?.recorded_at && (Date.now() - new Date(selectedObservation.recorded_at).getTime()) > 24 * 3600 * 1000);

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
    setDynamicStations(null);
  };

  return (
    <div className="nature-page-container live-monitoring-page">
      {/* Page Header Bar */}
      <div className="monitoring-header-bar">
        <div className="header-bar-left">
          <div className="monitoring-tag-row">
            <span className="nature-tag green">LIVE AIR QUALITY</span>
            <span className="nature-tag cyan">CPCB NAQI STANDARD</span>
          </div>
          <h1 className="page-heading">Live Monitoring &amp; Station Network</h1>
          <p className="page-subheading">
            Ground-level air quality observations from official monitoring stations across India.
            Select a station from the map or list below to inspect live measurements and air quality meter.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="monitoring-stats-pill">
          <span className="pill-dot green" />
          <span className="pill-primary">{stations.length} Monitoring Stations</span>
          <span className="pill-secondary">· {latestObs.filter((o) => o.pm25 !== null).length} Reporting Live</span>
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

          {/* State Selector covering all states in authoritative hierarchy */}
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
              disabled={hierarchyLoading}
            >
              <option value="all">All States &amp; UTs ({availableStates.length})</option>
              {availableStates.map(({ state: st, count }) => (
                <option key={st} value={st}>
                  {st} {count > 0 ? `(${count} stn)` : '(0 stn)'}
                </option>
              ))}
            </select>
          </div>

          {/* Dependent City Selector (Strictly filtered by selected state) */}
          <div className="filter-select-group">
            <label htmlFor="city-filter-select" className="filter-field-label">Monitoring City:</label>
            <select
              id="city-filter-select"
              className="nature-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              aria-label="Filter by city"
              disabled={availableCities.length === 0 || hierarchyLoading}
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
            {stationsFetching && <span className="stations-loading-pill"> ⏳ Updating stations...</span>}
          </div>

          {isFiltersActive && (
            <button className="clear-filters-btn" onClick={handleResetFilters}>
              Reset all filters ✕
            </button>
          )}
        </div>
      </div>

      {hierarchyError && (
        <div className="nature-alert warning" role="alert" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon">⚠️</span>
          <span>Station hierarchy notice: {hierarchyError}</span>
        </div>
      )}

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
              <h2 className="map-section-title">National Air Quality Map</h2>
            </div>
            <div className="map-legend-pills">
              <span className="legend-chip"><span className="dot good" /> Good (&lt;30)</span>
              <span className="legend-chip"><span className="dot satisfactory" /> Satisfactory (31–60)</span>
              <span className="legend-chip"><span className="dot moderate" /> Moderate (61–90)</span>
              <span className="legend-chip"><span className="dot poor" /> Poor (91–120)</span>
              <span className="legend-chip"><span className="dot severe" /> Very Poor / Severe (&gt;120)</span>
              <span className="legend-chip"><span className="dot gray" /> Awaiting Readings</span>
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
                    <span className="station-source-chip">
                      {isModelledFallback ? 'GOOGLE AIR QUALITY' : selectedStation.source_type.toUpperCase()}
                    </span>
                    {isModelledFallback ? (
                      <span className="live-telemetry-badge modelled">
                        ◆ Modelled Air Quality (Google Fallback)
                      </span>
                    ) : isObservedLive ? (
                      <span className="live-telemetry-badge live">
                        ● Live Data Available (OpenAQ)
                      </span>
                    ) : (isTelemetryStale || hasSelectedReadings) ? (
                      <span className="live-telemetry-badge stale">
                        ⚠️ Recent Data (&gt;24h)
                      </span>
                    ) : (
                      <span className="live-telemetry-badge offline">
                        ○ Readings Unavailable
                      </span>
                    )}
                    {lastTelemetryRefresh && (
                      <span className="last-refresh-chip">
                        Updated: {lastTelemetryRefresh}
                      </span>
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
                  <button
                    className="nature-btn nature-btn-sm nature-btn-secondary btn-refresh-telemetry"
                    onClick={() => refreshStationCondition(selectedStation.id)}
                    disabled={currentConditionLoading}
                    title="Refresh telemetry condition (OpenAQ with Google Air Quality fallback)"
                  >
                    {currentConditionLoading ? 'Refreshing...' : '🔄 Refresh Telemetry'}
                  </button>
                  {onOpenRecommendations && (
                    <button
                      className="nature-btn nature-btn-sm nature-btn-secondary btn-station-rec-action"
                      onClick={() =>
                        onOpenRecommendations({
                          station: selectedStation,
                          pollutant: 'pm25',
                          value: selectedObservation?.pm25,
                          dataType: isModelledFallback ? 'modelled' : 'observed',
                        })
                      }
                      title="View verified precaution recommendations based on this station's air quality readings"
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
                          dataType: isModelledFallback ? 'modelled' : 'observed',
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

              {/* Telemetry Warning / Current Condition Error Notice */}
              {currentConditionError && (
                <div className="nature-alert warning" role="alert" style={{ margin: '0.75rem 0' }}>
                  <span className="alert-icon">⚠️</span>
                  <span>Telemetry status: {currentConditionError}</span>
                </div>
              )}

              {/* Google Modelled Fallback Notice (Task 3) */}
              {isModelledFallback && (
                <div className="google-modelled-alert-banner">
                  <div className="alert-banner-header">
                    <span className="nature-tag cyan">GOOGLE AIR QUALITY API FALLBACK</span>
                    <span className="modelled-timestamp">
                      Timestamp: {currentCondition?.recorded_at ? new Date(currentCondition.recorded_at).toLocaleString('en-IN') : 'Current Hour'}
                    </span>
                  </div>
                  <p className="alert-banner-text">
                    <strong>Modelled Environmental Estimate:</strong> {currentCondition?.fallback_reason || 'OpenAQ ground observation missing or stale (>24h). Displaying Google spatial modelled surface estimate.'}
                  </p>
                  <div className="alert-provenance-tags">
                    <span className="prov-tag">Data Type: Modelled Spatial Surface</span>
                    <span className="prov-tag">NAQI Category: {currentCondition?.aqi_category || 'CPCB Standard'}</span>
                    <span className="prov-tag">Cost Safeguard: Cached (15-min TTL)</span>
                  </div>
                </div>
              )}

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
                      Monitored Air Quality Parameters ({activePollutants.length + activeWeather.length}):
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
                        <div className="metric-cell-subtext">Ambient Weather</div>
                      </div>
                    ))}
                  </div>

                  {/* Compact Footer with Recorded Timestamp & Ingestion Freshness */}
                  <div className="inspector-footer-meta">
                    <div className="meta-item">
                      <span className="meta-label">Data Provenance:</span>
                      <strong className="meta-value">
                        {isModelledFallback
                          ? 'Modelled Air Quality (Google API fallback)'
                          : selectedObservation?.source || selectedStation.source_type || 'OpenAQ ground observation'}
                      </strong>
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
                          : 'Recorded Reading'}
                      </strong>
                    </div>
                    <span className="meta-sep">·</span>
                    <div className="meta-item">
                      <span className="meta-label">Data Freshness:</span>
                      <strong className="meta-value">
                        {isModelledFallback
                          ? 'Current Modelled Estimate'
                          : isObservedLive
                          ? 'Fresh Ground Reading'
                          : 'Recent (>24h ago)'}
                      </strong>
                    </div>
                    {lastTelemetryRefresh && (
                      <>
                        <span className="meta-sep">·</span>
                        <div className="meta-item">
                          <span className="meta-label">Updated:</span>
                          <strong className="meta-value">{lastTelemetryRefresh}</strong>
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
                    Ground observations are currently offline or pending sensor synchronization for{' '}
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
                  view live air quality and inspect the CPCB air quality meter.
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
              Interactive air quality overview with real-time pollutant measurements and CPCB thresholds.
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
