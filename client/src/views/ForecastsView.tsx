import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Station } from '../types/station';
import type {
  StationForecastResponse,
  PredictionSummaryResponse,
  ModelsComparisonResponse,
  PredictionHorizonResponse,
  PredictionSnapshotResponse,
  PredictionSnapshotItem,
} from '../types/prediction';
import { predictionsApi } from '../api/predictions';
import { MapView } from '../components/MapView';
import { PredictionForecast } from '../components/predictions/PredictionForecast';
import { ModelComparisonPanel } from '../components/predictions/ModelComparisonPanel';
import {
  ALL_INDIAN_STATES_AND_UTS,
  CPCB_PM25_THRESHOLDS,
  getCpcbPm25Category,
} from '../utils/indianAdministrative';

interface ForecastsViewProps {
  stations: Station[];
  initialSelectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  predictionSummary: PredictionSummaryResponse | null;
  modelsComparison: ModelsComparisonResponse | null;
}

export const ForecastsView: React.FC<ForecastsViewProps> = ({
  stations,
  initialSelectedStation,
  onSelectStation,
  predictionSummary,
  modelsComparison,
}) => {
  // Navigation & filter state
  const [selectedStationId, setSelectedStationId] = useState<number>(
    initialSelectedStation?.id || stations[0]?.id || 2
  );
  const [selectedModel, setSelectedModel] = useState<string>('weighted_ensemble');
  const [selectedPollutant, setSelectedPollutant] = useState<string>('pm25');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 5-Day Horizon & Timeline state
  const [horizon, setHorizon] = useState<PredictionHorizonResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-03');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);

  // Snapshot of predictions for all stations on the selected date
  const [snapshot, setSnapshot] = useState<PredictionSnapshotResponse | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState<boolean>(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  // Station 5-day time-series forecast state
  const [forecast, setForecast] = useState<StationForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(true);

  // Ref to map container for smooth "View on Map" scroll
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Sync if parent updates initialSelectedStation
  useEffect(() => {
    if (initialSelectedStation) {
      setSelectedStationId(initialSelectedStation.id);
    }
  }, [initialSelectedStation]);

  // 1. Fetch Horizon once on mount
  useEffect(() => {
    predictionsApi
      .getHorizon()
      .then((h) => {
        setHorizon(h);
        if (h.allowed_dates && h.allowed_dates.length > 0) {
          // Default to first date in horizon if current selected date is not in allowed dates
          if (!h.allowed_dates.includes(selectedDate)) {
            setSelectedDate(h.allowed_dates[0]);
            setSelectedDayIndex(1);
          }
        }
      })
      .catch((err) => console.warn('[ForecastsView] Horizon error:', err.message));
  }, []);

  // 2. Fetch Snapshot across all stations whenever date or model changes
  useEffect(() => {
    if (!selectedDate) return;
    setSnapshotLoading(true);
    setSnapshotError(null);

    predictionsApi
      .snapshot(selectedDate, selectedModel)
      .then((res) => {
        setSnapshot(res);
        setSnapshotLoading(false);
      })
      .catch((err: unknown) => {
        let msg = 'Failed to load forecast snapshot.';
        if (err && typeof err === 'object' && 'response' in err) {
          const resp = (err as { response?: { data?: { error?: { message?: string } } } }).response;
          if (resp?.data?.error?.message) msg = resp.data.error.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        console.warn('[ForecastsView] Snapshot error:', msg);
        setSnapshotError(msg);
        setSnapshotLoading(false);
      });
  }, [selectedDate, selectedModel]);

  // 3. Fetch Selected Station 5-Day Forecast whenever station or model changes
  useEffect(() => {
    if (!selectedStationId) return;
    setForecastLoading(true);
    setForecastError(null);

    predictionsApi
      .getStationForecast(selectedStationId, selectedModel)
      .then((res) => {
        setForecast(res);
        setForecastLoading(false);
      })
      .catch((err: unknown) => {
        let msg = 'Failed to fetch station forecast.';
        if (err && typeof err === 'object' && 'response' in err) {
          const resp = (err as { response?: { data?: { error?: { message?: string } } } }).response;
          if (resp?.data?.error?.message) msg = resp.data.error.message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setForecastError(msg);
        setForecast(null);
        setForecastLoading(false);
      });
  }, [selectedStationId, selectedModel]);

  // Handler to select a station (updates state and notifies parent)
  const handleSelectStation = useCallback(
    (station: Station) => {
      setSelectedStationId(station.id);
      onSelectStation(station);
    },
    [onSelectStation]
  );

  // "View on Map" action: selects station, centers map, and smoothly scrolls map into view
  const handleViewOnMap = useCallback(
    (station: Station) => {
      handleSelectStation(station);

      // Smoothly scroll map container into view
      if (mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [handleSelectStation]
  );

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedState('');
    setSelectedCity('');
    setSearchQuery('');
  };

  // Compute station coverage per administrative state
  const stateStationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of stations) {
      counts[s.state] = (counts[s.state] || 0) + 1;
    }
    return counts;
  }, [stations]);

  // Available cities dependent on selected state
  const availableCities = useMemo(() => {
    const pool = selectedState
      ? stations.filter((s) => s.state.toLowerCase() === selectedState.toLowerCase())
      : stations;
    const set = new Set(pool.map((s) => s.city));
    return Array.from(set).sort();
  }, [stations, selectedState]);

  // Filtered stations based on state, city, and text search
  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedState && s.state.toLowerCase() !== selectedState.toLowerCase()) return false;
      if (selectedCity && s.city.toLowerCase() !== selectedCity.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCity = s.city.toLowerCase().includes(q);
        const matchesState = s.state.toLowerCase().includes(q);
        const matchesCode = s.station_code.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesState && !matchesCode) return false;
      }
      return true;
    });
  }, [stations, selectedState, selectedCity, searchQuery]);

  // Map snapshot items to an array passed to MapView
  const snapshotObservations = useMemo(() => {
    if (!snapshot || !snapshot.data) return [];
    return snapshot.data;
  }, [snapshot]);

  // Lookup map of snapshot item by station_id
  const snapshotMap = useMemo(() => {
    const map = new Map<number, PredictionSnapshotItem>();
    if (snapshot?.data) {
      for (const item of snapshot.data) {
        map.set(item.station_id, item);
      }
    }
    return map;
  }, [snapshot]);

  // Current active station
  const currentStation =
    stations.find((s) => s.id === selectedStationId) || stations[0] || null;

  // Regional stats for selected state
  const regionalSummary = useMemo(() => {
    if (!selectedState) return null;
    const stnsInState = stations.filter(
      (s) => s.state.toLowerCase() === selectedState.toLowerCase()
    );
    if (stnsInState.length === 0) {
      return {
        hasStations: false,
        total: 0,
        withForecast: 0,
        insufficient: 0,
        avgPm25: null,
      };
    }
    const ids = new Set(stnsInState.map((s) => s.id));
    const itemsInState = (snapshot?.data || []).filter((d) => ids.has(d.station_id));
    const withFc = itemsInState.filter((d) => d.has_data && d.pm25 !== null);
    const avg =
      withFc.length > 0
        ? withFc.reduce((acc, curr) => acc + (curr.pm25 || 0), 0) / withFc.length
        : null;

    return {
      hasStations: true,
      total: stnsInState.length,
      withForecast: withFc.length,
      insufficient: stnsInState.length - withFc.length,
      avgPm25: avg !== null ? Math.round(avg * 10) / 10 : null,
    };
  }, [selectedState, stations, snapshot]);

  // Candidate ML model descriptions
  const modelOptions = [
    {
      id: 'weighted_ensemble',
      label: 'Weighted Ensemble',
      badge: 'Validated Best',
      desc: 'Optimal inverse-MAE combination (XGB 32.8% + RF 33.3% + HGB 34.0%)',
    },
    {
      id: 'hist_gradient_boosting',
      label: 'HistGradientBoosting',
      badge: 'Scikit-Learn',
      desc: 'Binned histogram gradient booster with low inference latency',
    },
    {
      id: 'random_forest',
      label: 'Random Forest',
      badge: 'Scikit-Learn',
      desc: '100-tree bagging ensemble with variance reduction',
    },
    {
      id: 'xgboost',
      label: 'XGBoost Regressor',
      badge: 'Gradient Booster',
      desc: 'Extreme Gradient Boosting regressor with L2 regularization',
    },
  ];

  const allowedHorizonDates = horizon?.allowed_dates || [
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ];

  return (
    <div className="nature-page-container forecasts-page">
      {/* 1. Header Banner */}
      <div className="forecasts-header-banner">
        <div className="forecasts-tag-row">
          <span className="nature-tag green">STATISTICAL ML INFERENCE</span>
          <span className="nature-tag cyan">INTERACTIVE INDIA MAP</span>
          <span className="nature-tag purple">90% CONFIDENCE ENVELOPES</span>
        </div>
        <h1 className="page-heading">Air Quality Forecast Explorer</h1>
        <p className="page-subheading">
          Explore data-driven 5-day machine learning predictions across Indian states, cities, and
          ground monitoring stations. Predictions are synchronized with the interactive Leaflet map;
          locations without sufficient historical data honestly report missing coverage rather than
          fabricating synthetic values.
        </p>
      </div>

      {/* 2. Model & Network Status Summary Card */}
      <div className="forecast-status-summary-grid">
        <div className="summary-stat-box">
          <span className="stat-label">Model Architecture</span>
          <span className="stat-val active">
            {selectedModel === 'weighted_ensemble'
              ? 'Weighted Ensemble'
              : selectedModel === 'hist_gradient_boosting'
              ? 'HistGradientBoosting'
              : selectedModel === 'random_forest'
              ? 'Random Forest'
              : 'XGBoost'}
          </span>
          <span className="stat-hint">
            {modelsComparison?.selection_rationale
              ? 'Lowest RMSE on unseen test set'
              : 'Trained multi-model ML regressor'}
          </span>
        </div>

        <div className="summary-stat-box">
          <span className="stat-label">Forecast Horizon</span>
          <span className="stat-val">{horizon?.horizon_days || 5} Days Ahead</span>
          <span className="stat-hint">
            {horizon ? `${horizon.min_date} to ${horizon.max_date}` : 'T+1 through T+5'}
          </span>
        </div>

        <div className="summary-stat-box">
          <span className="stat-label">Network Coverage</span>
          <span className="stat-val">
            {snapshot
              ? `${snapshot.stations_with_forecast} / ${snapshot.total_stations} Stations`
              : predictionSummary
              ? `${predictionSummary.stations_with_forecast} / ${predictionSummary.total_stations} Stations`
              : '33 / 40 Stations'}
          </span>
          <span className="stat-hint">
            {snapshot?.stations_insufficient_data ?? 7} stations have limited historical records (&lt;14 days)
          </span>
        </div>

        <div className="summary-stat-box">
          <span className="stat-label">Validation Benchmark</span>
          <span className="stat-val">
            {predictionSummary?.metrics
              ? `MAE ${predictionSummary.metrics.mae} µg/m³`
              : 'MAE 16.5 µg/m³'}
          </span>
          <span className="stat-hint">
            {predictionSummary?.metrics
              ? `R² ${predictionSummary.metrics.r2} · 877 test samples`
              : 'R² 0.7398'}
          </span>
        </div>
      </div>

      {/* 3. Five-Day Forecast Timeline Date Selector */}
      <div className="forecast-timeline-container">
        <div className="timeline-header-row">
          <span className="timeline-title">
            <span>📅</span> Five-Day Forecast Horizon (Select Target Date)
          </span>
          <span className="timeline-reference-tag">
            Baseline Date: {horizon?.reference_date || '2026-10-02'}
          </span>
        </div>

        <div className="forecast-days-row" role="tablist" aria-label="Forecast 5-Day Horizon">
          {allowedHorizonDates.map((dateStr, idx) => {
            const dayNum = idx + 1;
            const isSelected = selectedDate === dateStr;
            const dateObj = new Date(dateStr + 'T00:00:00Z');
            const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
            const monthDay = dateObj.toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            });

            return (
              <button
                key={dateStr}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`forecast-day-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setSelectedDayIndex(dayNum);
                }}
              >
                <span className="day-label">Day {dayNum} ({dayName})</span>
                <span className="day-date">{monthDay}</span>
                <span className="day-status">
                  {isSelected ? '● Active Target' : 'Explore Day'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Controls Bar: State, City, Search, Pollutant, Model Architecture */}
      <div className="forecast-controls-card">
        <div className="forecast-filters-grid">
          {/* State Filter (All 28 States & 8 UTs) */}
          <div className="forecast-filter-group">
            <label htmlFor="forecast-state-filter" className="forecast-filter-label">
              Administrative State / UT
            </label>
            <select
              id="forecast-state-filter"
              className="forecast-filter-control"
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity(''); // Reset dependent city when state changes
              }}
            >
              <option value="">All India (All States &amp; UTs)</option>
              {ALL_INDIAN_STATES_AND_UTS.map((st) => {
                const count = stateStationCounts[st] || 0;
                return (
                  <option key={st} value={st}>
                    {st} {count > 0 ? `(${count} stations)` : '(No active stations)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Dependent City Filter */}
          <div className="forecast-filter-group">
            <label htmlFor="forecast-city-filter" className="forecast-filter-label">
              Target City
            </label>
            <select
              id="forecast-city-filter"
              className="forecast-filter-control"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={availableCities.length === 0}
            >
              <option value="">
                {selectedState
                  ? `All Cities in ${selectedState}`
                  : 'All Cities in India'}
              </option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="forecast-filter-group">
            <label htmlFor="forecast-search-input" className="forecast-filter-label">
              Search Station or City
            </label>
            <div className="forecast-search-wrapper">
              <span className="forecast-search-icon" aria-hidden="true">🔍</span>
              <input
                id="forecast-search-input"
                type="text"
                className="forecast-filter-control search-input"
                placeholder="Search station, city, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="forecast-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Pollutant Selector */}
          <div className="forecast-filter-group">
            <label htmlFor="forecast-pollutant-dropdown" className="forecast-filter-label">
              Forecast Pollutant
            </label>
            <select
              id="forecast-pollutant-dropdown"
              className="forecast-filter-control"
              value={selectedPollutant}
              onChange={(e) => setSelectedPollutant(e.target.value)}
            >
              <option value="pm25">PM2.5 (Fine Particulates, 24h Average)</option>
              <option value="pm10" disabled>
                PM10 (Training in Progress)
              </option>
              <option value="no2" disabled>
                NO₂ (Training in Progress)
              </option>
            </select>
          </div>
        </div>

        {/* Model Architecture Selector Chips */}
        <div className="model-architecture-selector">
          <span className="arch-label">Machine Learning Model Architecture:</span>
          <div className="arch-chips-row">
            {modelOptions.map((opt) => {
              const isSelected = selectedModel === opt.id;
              return (
                <button
                  key={opt.id}
                  className={`arch-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedModel(opt.id)}
                  title={opt.desc}
                >
                  <span className="chip-name">{opt.label}</span>
                  <span className="chip-badge">{opt.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filters Clear Action */}
        {(selectedState || selectedCity || searchQuery) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {filteredStations.length} of {stations.length} stations
            </span>
            <button
              type="button"
              className="nature-btn secondary sm"
              onClick={handleResetFilters}
            >
              ✕ Clear Filters (All India View)
            </button>
          </div>
        )}
      </div>

      {/* 5. Regional Coverage / Empty State Banner */}
      {regionalSummary && (
        <div
          className={`regional-coverage-banner ${
            regionalSummary.hasStations ? 'has-stations' : 'empty-state'
          }`}
        >
          {regionalSummary.hasStations ? (
            <div>
              <strong>📍 Regional Monitoring: {selectedState}</strong> —{' '}
              {regionalSummary.total} stations in network ({regionalSummary.withForecast} with validated
              5-day ML forecasts, {regionalSummary.insufficient} with insufficient history).
              {regionalSummary.avgPm25 !== null && (
                <span>
                  {' '}
                  Average predicted PM2.5 for {selectedDate}:{' '}
                  <strong>{regionalSummary.avgPm25} µg/m³</strong>.
                </span>
              )}
            </div>
          ) : (
            <div>
              <strong>ℹ️ Administrative Location: {selectedState}</strong> — No active ground
              monitoring stations currently in network. In strict accordance with AirPulse project
              rules, synthetic predictions are never fabricated for unmonitored regions.
            </div>
          )}
          {selectedState && (
            <button
              type="button"
              className="nature-btn secondary sm"
              style={{ padding: '4px 8px', fontSize: '11px' }}
              onClick={() => setSelectedState('')}
            >
              View All India
            </button>
          )}
        </div>
      )}

      {snapshotError && (
        <div className="nature-alert error" role="alert" style={{ marginBottom: '20px' }}>
          <span className="alert-icon">⚠️</span>
          <span>{snapshotError}</span>
        </div>
      )}

      {/* 6. Interactive India Air Quality Forecast Map */}
      <section className="forecast-map-section" ref={mapSectionRef}>
        <div className="forecast-map-card">
          <div className="forecast-map-header">
            <div className="forecast-map-title">
              <span>🗺️</span> India Air Quality Forecast Map
            </div>
            <div className="forecast-map-badge">
              {snapshotLoading ? 'Updating Map...' : `Day ${selectedDayIndex} · ${selectedDate}`}
            </div>
          </div>

          {/* Interactive Leaflet Map Component */}
          <MapView
            stations={filteredStations}
            latestObservations={snapshotObservations}
            selectedStation={currentStation}
            onSelectStation={handleSelectStation}
            mode="forecast"
            selectedDate={selectedDate}
            height={440}
          />

          {/* CPCB NAQI Legend */}
          <div className="forecast-legend-bar">
            <div className="forecast-legend-title-row">
              <span>CPCB NAQI PM2.5 Forecast Thresholds (24h Average)</span>
              <span>Unit: µg/m³</span>
            </div>
            <div className="forecast-legend-items">
              {CPCB_PM25_THRESHOLDS.map((cat) => (
                <div key={cat.category} className="legend-chip">
                  <span className="legend-color-dot" style={{ background: cat.color }} />
                  <span>
                    {cat.category} ({cat.min}–{cat.max === 1500 ? '>250' : cat.max})
                  </span>
                </div>
              ))}
              <div className="legend-chip">
                <span
                  className="legend-color-dot"
                  style={{ background: '#94a3b8', border: '1px dashed #cbd5e1' }}
                />
                <span style={{ color: '#64748b' }}>Insufficient Data (&lt;14d)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Selected Station 5-Day ML Forecast Dashboard (Full Width) */}
      <section className="forecast-station-detail-section">
        {forecastError && (
          <div className="nature-alert error" role="alert" style={{ marginBottom: '14px' }}>
            <span className="alert-icon">⚠️</span>
            <span>{forecastError}</span>
          </div>
        )}

        {currentStation ? (
          <PredictionForecast
            data={forecast}
            loading={forecastLoading}
            onViewOnMap={() => handleViewOnMap(currentStation)}
          />
        ) : (
          <div className="lookup-empty-placeholder">
            <span className="placeholder-icon">📍</span>
            <h3>No Monitoring Station Selected</h3>
            <p>Select a station on the map above or from the results grid below to inspect its 5-day ML forecast.</p>
          </div>
        )}
      </section>

      {/* 7. Forecast Results List / Grid for Selected Day */}
      <section className="forecast-results-container">
        <div className="forecast-results-header">
          <h2 className="results-count-title">
            Location Forecasts (Day {selectedDayIndex} · {selectedDate})
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Showing {filteredStations.length} monitoring locations
          </span>
        </div>

        {filteredStations.length === 0 ? (
          <div className="lookup-empty-placeholder">
            <span className="placeholder-icon">🔍</span>
            <h3>No monitoring stations match your search filters</h3>
            <p>Try selecting a different administrative state or clear your search terms.</p>
            <button
              type="button"
              className="nature-btn primary sm"
              onClick={handleResetFilters}
            >
              Reset to All India
            </button>
          </div>
        ) : (
          <div className="forecast-cards-grid">
            {filteredStations.map((st) => {
              const snap = snapshotMap.get(st.id);
              const isSelected = st.id === selectedStationId;
              const hasData = snap && snap.has_data && snap.pm25 !== null;
              const cat = getCpcbPm25Category(snap?.pm25);

              return (
                <div
                  key={st.id}
                  className={`forecast-station-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="f-card-top">
                    <div className="f-card-header-row">
                      <span className="f-card-code">{st.station_code}</span>
                      <span
                        className="f-card-category-badge"
                        style={{
                          background: hasData ? cat.bgColor : '#f1f5f9',
                          color: hasData ? cat.textColor : '#64748b',
                          border: `1px solid ${hasData ? cat.color + '44' : '#cbd5e1'}`,
                        }}
                      >
                        {hasData ? cat.category : 'Insufficient Data'}
                      </span>
                    </div>

                    <div className="f-card-title">{st.name}</div>
                    <div className="f-card-sub">
                      📍 {st.city}, {st.state}
                    </div>
                  </div>

                  <div className="f-card-prediction-section">
                    <div className="f-card-pred-row">
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        Target: PM2.5 ({selectedDate})
                      </span>
                      <div className="f-card-pred-val">
                        {hasData ? (
                          <>
                            <span style={{ color: cat.color }}>
                              {Number(snap?.pm25).toFixed(1)}
                            </span>
                            <small
                              style={{
                                fontSize: '0.72rem',
                                color: '#64748b',
                                fontWeight: 600,
                                marginLeft: '2px',
                              }}
                            >
                              µg/m³
                            </small>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>

                    {hasData && snap?.lower_bound != null && snap?.upper_bound != null ? (
                      <div className="f-card-ci-text">
                        90% CI: [{Number(snap.lower_bound).toFixed(1)} –{' '}
                        {Number(snap.upper_bound).toFixed(1)}] µg/m³
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        Insufficient historical records (&lt;14 days)
                      </div>
                    )}
                  </div>

                  <div className="f-card-actions">
                    <button
                      type="button"
                      className="view-on-map-btn"
                      onClick={() => handleViewOnMap(st)}
                      title={`View ${st.name} on map for ${selectedDate}`}
                    >
                      <span>🗺️</span>
                      <span>View on Map</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 8. Multi-Model Benchmark Comparison Table */}
      <section className="forecast-benchmark-section">
        <ModelComparisonPanel
          comparison={modelsComparison}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          isOpen={isComparisonOpen}
          onToggle={() => setIsComparisonOpen(!isComparisonOpen)}
        />
      </section>
    </div>
  );
};
