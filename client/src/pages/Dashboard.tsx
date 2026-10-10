import { useEffect, useState, useCallback } from 'react';
import type { Station } from '../types/station';
import type { Observation, HistoryObservation } from '../types/observation';
import { stationsApi } from '../api/stations';
import { observationsApi } from '../api/observations';
import { predictionsApi } from '../api/predictions';
import type { StationForecastResponse, PredictionSummaryResponse } from '../types/prediction';
import { MapView } from '../components/MapView';
import { StationCard } from '../components/StationCard';
import { PollutantChart } from '../components/charts/PollutantChart';
import { PredictionForecast } from '../components/predictions/PredictionForecast';
import { ModelComparisonPanel } from '../components/predictions/ModelComparisonPanel';
import { DateNavigator, type DashboardMode } from '../components/DateNavigator';
import { SeverityMeter } from '../components/SeverityMeter';
import { OpenAQRegistryModal } from '../components/OpenAQRegistryModal';
import { LocationLookupModal } from '../components/LocationLookupModal';
import { HotspotPanel } from '../components/HotspotPanel';
import { PollutantInfoModal } from '../components/PollutantInfoModal';
import { AlertPanel } from '../components/AlertPanel';
import { RecommendationModal } from '../components/RecommendationModal';
import type { ContextualMeasurement } from '../types/pollutant';
import { openaqApi } from '../api/openaq';
import { hotspotsApi } from '../api/hotspots';
import { alertsApi } from '../api/alerts';
import type { OpenAQCoverageResponse } from '../types/openaq';
import type { Hotspot } from '../types/hotspot';
import type { EnvironmentalAlert, AlertSummaryResponse, UnifiedAlertsResponse } from '../types/alert';
import { formatValue, formatRelativeTime } from '../utils/aqiUtils';
import type { ModelsComparisonResponse } from '../types/prediction';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

export function Dashboard() {
  const [stations, setStations] = useState<Station[]>([]);
  const [latestObs, setLatestObs] = useState<Observation[]>([]);
  const [snapshotData, setSnapshotData] = useState<any[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [history, setHistory] = useState<HistoryObservation[]>([]);
  const [stationsState, setStationsState] = useState<LoadState>('idle');
  const [dataState, setDataState] = useState<LoadState>('idle');
  const [historyState, setHistoryState] = useState<LoadState>('idle');
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [forecast, setForecast] = useState<StationForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [predictionSummary, setPredictionSummary] = useState<PredictionSummaryResponse | null>(null);
  const [modelsComparison, setModelsComparison] = useState<ModelsComparisonResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('weighted_ensemble');
  const [isCompOpen, setIsCompOpen] = useState<boolean>(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState<boolean>(false);
  const [isLookupOpen, setIsLookupOpen] = useState<boolean>(false);
  const [openaqCoverage, setOpenaqCoverage] = useState<OpenAQCoverageResponse | null>(null);

  // Geospatial Hotspots states (Feature 7)
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [isHotspotPanelOpen, setIsHotspotPanelOpen] = useState<boolean>(true);
  const [hotspotsLoading, setHotspotsLoading] = useState<boolean>(false);


  // Pollutant Reference & Standards Modal states (Feature 8)
  const [isPollutantModalOpen, setIsPollutantModalOpen] = useState<boolean>(false);
  const [selectedPollutantId, setSelectedPollutantId] = useState<string>('pm25');
  const [contextualMeasurement, setContextualMeasurement] = useState<ContextualMeasurement | null>(null);

  const handleOpenPollutantInfo = (pollutantId: string, context?: ContextualMeasurement) => {
    setSelectedPollutantId(pollutantId || 'pm25');
    setContextualMeasurement(context || null);
    setIsPollutantModalOpen(true);
  };

  // Environmental Alerts & Automated Monitoring (Feature 9)
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState<boolean>(false);
  const [observedAlerts, setObservedAlerts] = useState<EnvironmentalAlert[]>([]);
  const [forecastAlerts, setForecastAlerts] = useState<EnvironmentalAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummaryResponse | null>(null);
  const [alertThreshold, setAlertThreshold] = useState<string>('poor');
  const [alertsLoading, setAlertsLoading] = useState<boolean>(false);

  // Context-Aware Precaution Recommendations (Feature 10)
  const [isRecModalOpen, setIsRecModalOpen] = useState<boolean>(false);
  const [recContextOverride, setRecContextOverride] = useState<{
    station?: Station | null;
    pollutant?: string;
    value?: number | null;
    severityTier?: number | null;
    mode?: DashboardMode;
    selectedDate?: string;
    selectedModel?: string;
    dataType?: 'observed' | 'predicted' | 'modelled';
  } | null>(null);

  const handleOpenRecommendations = (override?: {
    station?: Station | null;
    pollutant?: string;
    value?: number | null;
    severityTier?: number | null;
    mode?: DashboardMode;
    selectedDate?: string;
    selectedModel?: string;
    dataType?: 'observed' | 'predicted' | 'modelled';
  }) => {
    setRecContextOverride(override || null);
    setIsRecModalOpen(true);
  };

  // Date selection states (Feature 1)
  const [mode, setMode] = useState<DashboardMode>('live');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-02');
  const [histMinDate, setHistMinDate] = useState<string>('2016-01-30');
  const [histMaxDate, setHistMaxDate] = useState<string>('2026-10-02');
  const [allowedForecastDates, setAllowedForecastDates] = useState<string[]>([
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ]);
  const [forecastRefDate, setForecastRefDate] = useState<string>('2026-10-02');

  // Load Date Ranges and Horizon on Mount
  useEffect(() => {
    observationsApi
      .dateRange()
      .then((res) => {
        if (res.min_date) setHistMinDate(res.min_date);
        if (res.max_date) {
          setHistMaxDate(res.max_date);
          setSelectedDate(res.max_date);
        }
      })
      .catch(() => {});

    predictionsApi
      .getHorizon()
      .then((res) => {
        if (res.allowed_dates && res.allowed_dates.length > 0) {
          setAllowedForecastDates(res.allowed_dates);
        }
        if (res.reference_date) {
          setForecastRefDate(res.reference_date);
        }
      })
      .catch(() => {});
  }, []);

  const loadStations = useCallback(async () => {
    setStationsState('loading');
    setStationsError(null);
    try {
      const res = await stationsApi.list({ city: cityFilter || undefined });
      setStations(res.stations);
      setStationsState('loaded');
    } catch (err: any) {
      setStationsError(err.response?.data?.error?.message || err.message);
      setStationsState('error');
    }
  }, [cityFilter]);

  // Load Data based on Current Mode, Selected Date & Selected Model
  const loadActiveData = useCallback(async () => {
    setDataState('loading');
    setDataError(null);
    try {
      if (mode === 'live') {
        const res = await observationsApi.latest({ city: cityFilter || undefined, limit: 100 });
        setLatestObs(res.data);
        setSnapshotData([]);
      } else if (mode === 'historical') {
        const res = await observationsApi.snapshot(selectedDate);
        setSnapshotData(res.data);
      } else if (mode === 'forecast') {
        const res = await predictionsApi.snapshot(selectedDate, selectedModel);
        setSnapshotData(res.data);
      }
      setDataState('loaded');
    } catch (err: any) {
      setDataError(err.response?.data?.error?.message || err.message);
      setDataState('error');
    }
  }, [mode, selectedDate, selectedModel, cityFilter]);

  const loadHistory = useCallback(async (stationId: number) => {
    setHistoryState('loading');
    setHistory([]);
    try {
      const res = await observationsApi.history({ station_id: stationId });
      setHistory(res.data);
      setHistoryState('loaded');
    } catch {
      setHistoryState('error');
    }
  }, []);

  useEffect(() => {
    loadStations();
    predictionsApi
      .getSummary(selectedModel)
      .then(setPredictionSummary)
      .catch(() => {});
    predictionsApi
      .getModelsComparison()
      .then(setModelsComparison)
      .catch(() => {});
    openaqApi
      .getCoverage()
      .then(setOpenaqCoverage)
      .catch(() => {});
  }, [loadStations, selectedModel]);

  useEffect(() => {
    loadActiveData();
  }, [loadActiveData]);

  // Load Hotspots whenever mode, selectedDate or selectedModel changes
  useEffect(() => {
    setHotspotsLoading(true);
    hotspotsApi
      .list({
        date: selectedDate,
        mode,
        model: selectedModel,
      })
      .then((res) => {
        setHotspots(res.hotspots || []);
        setHotspotsLoading(false);
      })
      .catch((err) => {
        console.warn('[Hotspots] Fetch failed:', err.message);
        setHotspots([]);
        setHotspotsLoading(false);
      });
  }, [mode, selectedDate, selectedModel]);

  // Load Environmental Alerts (Feature 9)
  useEffect(() => {
    let isCancelled = false;
    setAlertsLoading(true);

    Promise.all([
      alertsApi.list({
        type: 'all',
        date: selectedDate,
        model: selectedModel,
        min_severity: alertThreshold,
        is_historical: mode === 'historical',
      }),
      alertsApi.summary({
        observed_date: mode === 'historical' ? selectedDate : undefined,
        forecast_date: mode === 'forecast' ? selectedDate : undefined,
        model: selectedModel,
        min_severity: alertThreshold,
        is_historical: mode === 'historical',
      }),
    ])
      .then(([listRes, summaryRes]) => {
        if (isCancelled) return;
        const unified = listRes as UnifiedAlertsResponse;
        setObservedAlerts(unified.observed?.alerts || []);
        setForecastAlerts(unified.forecast?.alerts || []);
        setAlertSummary(summaryRes);
        setAlertsLoading(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[Alerts] Fetch failed:', err.message);
        setObservedAlerts([]);
        setForecastAlerts([]);
        setAlertsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [mode, selectedDate, selectedModel, alertThreshold]);

  useEffect(() => {
    if (selectedStation) {
      loadHistory(selectedStation.id);
      setForecastLoading(true);
      predictionsApi
        .getStationForecast(selectedStation.id, selectedModel)
        .then((res) => {
          setForecast(res);
          setForecastLoading(false);
        })
        .catch(() => {
          setForecast(null);
          setForecastLoading(false);
        });
    } else {
      setHistory([]);
      setHistoryState('idle');
      setForecast(null);
      setForecastLoading(false);
    }
  }, [selectedStation, selectedModel, loadHistory]);


  const handleSearch = () => {
    setCityFilter(cityInput.trim());
    setSelectedStation(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClear = () => {
    setCityInput('');
    setCityFilter('');
    setSelectedStation(null);
  };

  const handleModeChange = (newMode: DashboardMode) => {
    setMode(newMode);
    setSelectedStation(null);
    setSelectedHotspot(null);
    if (newMode === 'live') {
      setSelectedDate(histMaxDate);
    } else if (newMode === 'historical') {
      setSelectedDate(histMaxDate);
    } else if (newMode === 'forecast') {
      setSelectedDate(allowedForecastDates[0] || '2026-10-03');
    }
  };

  // Compile active observation / prediction map
  const activeItems = mode === 'live' ? latestObs : snapshotData;
  const activeMap = new Map(activeItems.map((o) => [o.station_id, o]));
  const selectedItem = selectedStation ? activeMap.get(selectedStation.id) : null;

  const countWithData = mode === 'live'
    ? latestObs.length
    : snapshotData.filter((s) => s.has_data).length;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        {/* ROW 1: BRAND & PLATFORM STATUS */}
        <div className="dashboard-header-brand-row">
          <div className="header-brand">
            <div className="brand-title-wrap">
              <h1 className="brand-title">AIRPULSE</h1>
              <span className="brand-version-tag">v0.1.0</span>
            </div>
            <div className="brand-divider" />
            <span className="brand-subtitle">Environmental Intelligence</span>
          </div>

          <div className="header-platform-status">
            <div className="platform-status-badge">
              <span className="platform-status-dot" />
              <span className="platform-status-label">SYSTEM OPERATIONAL</span>
              <span className="platform-status-sep">/</span>
              <span className="platform-status-mode">{mode.toUpperCase()} MODE</span>
            </div>
          </div>
        </div>

        {/* ROW 2: DEDICATED STATION FILTER CONTROLS */}
        <div className="dashboard-filters-bar">
          <div className="filter-controls-group">
            <span className="filter-bar-title">
              <svg className="filter-title-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              FILTER STATIONS:
            </span>
            <div className="search-input-wrap">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Filter by city (e.g. Delhi, Mumbai)"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Filter stations by city"
              />
            </div>
            <button className="btn-primary" onClick={handleSearch} title="Apply city filter">Filter</button>
            {cityFilter && (
              <button className="btn-ghost" onClick={handleClear} title="Clear city filter">Clear</button>
            )}
            {cityFilter && (
              <div className="active-filter-chip" title="Active filter query">
                <span className="chip-label">Filtered by:</span>
                <span className="chip-val">{cityFilter}</span>
                <button className="btn-chip-remove" onClick={handleClear} aria-label="Remove filter" title="Remove filter">✕</button>
              </div>
            )}
          </div>

          <div className="filter-stats-group">
            <span className="station-count-stat">
              Showing <strong>{stations.length}</strong> station{stations.length !== 1 ? 's' : ''} <span className="stat-muted">({countWithData} with telemetry)</span>
            </span>
          </div>
        </div>

        {/* ROW 3: DEDICATED FEATURE-STATUS INDICATORS ROW */}
        <div className="dashboard-feature-status-bar">
          <div className="feature-status-inner">
            <div className="telemetry-status-pill">
              <span className="telemetry-status-dot" />
              <span className="telemetry-status-text">NETWORK ONLINE</span>
              <span className="telemetry-status-separator">/</span>
              <span className="telemetry-status-count">{stations.length} STATIONS</span>
            </div>
            {predictionSummary && (
              <div className="telemetry-status-pill forecast-pill">
                <span className="telemetry-status-dot purple" />
                <span className="telemetry-status-text purple">5-DAY FORECAST</span>
                <span className="telemetry-status-separator">/</span>
                <span className="telemetry-status-count">
                  {predictionSummary.stations_with_forecast}/{predictionSummary.total_stations} AVAILABLE
                </span>
              </div>
            )}
            {openaqCoverage && (
              <button
                className="telemetry-status-pill openaq-btn-pill"
                onClick={() => setIsRegistryOpen(true)}
                title="Inspect OpenAQ expanded Indian monitoring network & PostGIS nearby search"
              >
                <span className="telemetry-status-dot blue" />
                <span className="telemetry-status-text">OPENAQ REGISTRY</span>
                <span className="telemetry-status-separator">/</span>
                <span className="telemetry-status-count">
                  {openaqCoverage.total_locations} DISCOVERED
                </span>
              </button>
            )}
            <button
              className="telemetry-status-pill geo-lookup-btn-pill"
              onClick={() => setIsLookupOpen(true)}
              title="Resolve any Indian location with Google Geocoding + Air Quality API and OpenAQ proximity lookup"
            >
              <span className="telemetry-status-dot cyan" />
              <span className="telemetry-status-text">GEO LOOKUP</span>
              <span className="telemetry-status-separator">/</span>
              <span className="telemetry-status-count">GOOGLE + OPENAQ</span>
            </button>
            <button
              className="telemetry-status-pill hotspot-btn-pill"
              onClick={() => setIsHotspotPanelOpen(!isHotspotPanelOpen)}
              title="Toggle Geospatial Pollution Hotspots panel (PostGIS ST_ClusterDBSCAN)"
            >
              <span className="telemetry-status-dot red" />
              <span className="telemetry-status-text">HOTSPOTS</span>
              <span className="telemetry-status-separator">/</span>
              <span className="telemetry-status-count">
                {hotspotsLoading ? 'SCANNING…' : `${hotspots.length} DETECTED`}
              </span>
            </button>
            <button
              className="telemetry-status-pill pollutant-info-btn-pill"
              onClick={() => handleOpenPollutantInfo('pm25')}
              title="Inspect authoritative pollutant definitions, CPCB/WHO standards, and concentration vs AQI guide"
            >
              <span className="telemetry-status-dot teal" />
              <span className="telemetry-status-text">POLLUTANT GUIDE</span>
              <span className="telemetry-status-separator">/</span>
              <span className="telemetry-status-count">CPCB + WHO</span>
            </button>
            <button
              className="telemetry-status-pill alert-btn-pill"
              onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
              title="Automated Environmental Alerts & Threshold Monitoring (CPCB NAQI Standards)"
            >
              <span className={`telemetry-status-dot ${((mode === 'historical' ? 0 : observedAlerts.length) + forecastAlerts.length) > 0 ? 'red pulse' : 'emerald'}`} />
              <span className="telemetry-status-text">ALERTS</span>
              <span className="telemetry-status-separator">/</span>
              <span className="telemetry-status-count">
                {alertsLoading
                  ? 'SCANNING…'
                  : `${(mode === 'historical' ? 0 : observedAlerts.length) + forecastAlerts.length} ${mode === 'historical' ? 'RECORDED' : 'ACTIVE'}`}
              </span>
            </button>
            <button
              className="telemetry-status-pill rec-btn-pill"
              onClick={() => handleOpenRecommendations()}
              title="Context-Aware Environmental Precaution Recommendations (WHO & CPCB Public Health Guidance)"
            >
              <span className="telemetry-status-dot green" />
              <span className="telemetry-status-text">PRECAUTIONS</span>
              <span className="telemetry-status-separator">/</span>
              <span className="telemetry-status-count">WHO + CPCB</span>
            </button>
          </div>
        </div>
      </header>

      {/* Date Navigator Bar (Feature 1) */}
      <DateNavigator
        mode={mode}
        onModeChange={handleModeChange}
        selectedDate={selectedDate}
        onDateChange={(d) => {
          setSelectedDate(d);
          setSelectedStation(null);
          setSelectedHotspot(null);
        }}
        historicalMinDate={histMinDate}
        historicalMaxDate={histMaxDate}
        allowedForecastDates={allowedForecastDates}
        referenceDate={forecastRefDate}
        totalStations={stations.length}
        stationsWithData={countWithData}
        isLoading={dataState === 'loading'}
        activeModelName={selectedModel === 'weighted_ensemble' ? 'Weighted Ensemble' : selectedModel === 'hist_gradient_boosting' ? 'HistGradientBoosting' : selectedModel === 'random_forest' ? 'Random Forest' : 'XGBoost'}
      />

      {/* Multi-Model Comparison Panel (Feature 2) */}
      <ModelComparisonPanel
        comparison={modelsComparison}
        selectedModel={selectedModel}
        onSelectModel={(mKey) => {
          setSelectedModel(mKey);
          setSelectedStation(null);
          setSelectedHotspot(null);
        }}
        isOpen={isCompOpen}
        onToggle={() => setIsCompOpen(!isCompOpen)}
      />

      {/* Geospatial Pollution Hotspot Panel (Feature 7) */}
      <HotspotPanel
        hotspots={hotspots}
        selectedHotspot={selectedHotspot}
        onSelectHotspot={setSelectedHotspot}
        onSelectStation={(id) => {
          const s = stations.find((st) => st.id === id);
          if (s) setSelectedStation(s);
        }}
        isOpen={isHotspotPanelOpen}
        onToggle={() => setIsHotspotPanelOpen(!isHotspotPanelOpen)}
        mode={mode}
        selectedDate={selectedDate}
        selectedModel={selectedModel}
        loading={hotspotsLoading}
        onOpenPollutantInfo={handleOpenPollutantInfo}
        onOpenRecommendations={handleOpenRecommendations}
      />

      {/* Main layout */}
      <main className="dashboard-main">
        {/* LEFT: Station list */}
        <aside className="station-list-panel">
          <div className="panel-header">
            <h2 className="panel-title">Monitoring Stations</h2>
            <span className="panel-count">
              {stationsState === 'loading'
                ? 'Loading…'
                : `${stations.length} station${stations.length !== 1 ? 's' : ''} (${countWithData} active)`}
              {cityFilter ? ` in ${cityFilter}` : ''}
            </span>
          </div>

          {(stationsState === 'error' || dataState === 'error') && (
            <div className="panel-error">Error: {stationsError || dataError}</div>
          )}

          <div className="station-list">
            {stations.map((s) => {
              const item = activeMap.get(s.id);
              const cardData = item || {
                station_id: s.id,
                station_name: s.name,
                city: s.city,
                state: s.state,
                aqi: null,
                pm25: null,
                pm10: null,
                no2: null,
                o3: null,
                recorded_at: null,
                source: 'none',
                has_data: false,
                data_type: mode === 'forecast' ? 'predicted' : 'observed',
              };

              return (
                <StationCard
                  key={s.id}
                  observation={cardData}
                  isSelected={selectedStation?.id === s.id}
                  mode={mode}
                  selectedDate={selectedDate}
                  onClick={() => setSelectedStation(s)}
                  onOpenPollutantInfo={handleOpenPollutantInfo}
                />
              );
            })}
          </div>
        </aside>

        {/* CENTER: Map + detail */}
        <section className="map-detail-panel">
          <div className="map-wrapper">
            <MapView
              stations={stations}
              latestObservations={activeItems}
              selectedStation={selectedStation}
              onSelectStation={(s) => setSelectedStation(s)}
              mode={mode}
              selectedDate={selectedDate}
              hotspots={hotspots}
              selectedHotspot={selectedHotspot}
              onSelectHotspot={setSelectedHotspot}
            />
          </div>

          {selectedStation ? (
            <div className="station-detail">
              <div className="detail-header">
                <div className="detail-header-info">
                  <div className="detail-title-row">
                    <h3 className="detail-station-name">{selectedStation.name}</h3>
                    <span className="station-code-pill">{selectedStation.station_code}</span>
                  </div>
                  <div className="detail-location-row">
                    <span className="detail-location">{selectedStation.city}, {selectedStation.state}</span>
                    <span className="detail-coord-chip">
                      {selectedStation.latitude.toFixed(4)}°N, {selectedStation.longitude.toFixed(4)}°E
                    </span>
                  </div>
                </div>
                <button className="btn-close-detail" onClick={() => setSelectedStation(null)} title="Close panel">✕</button>
              </div>

              {/* Severity Meter Interpretation Layer */}
              <div className="detail-severity-section">
                <SeverityMeter
                  metric="pm25"
                  value={selectedItem && selectedItem.has_data !== false ? selectedItem.pm25 : null}
                  isPredicted={mode === 'forecast' || selectedItem?.data_type === 'predicted'}
                  modelName={selectedItem?.model_name || selectedModel}
                  source={selectedItem?.source || 'OpenAQ'}
                  targetDate={selectedItem?.prediction_date || selectedDate}
                  recordedAt={selectedItem?.recorded_at}
                  onOpenPollutantInfo={handleOpenPollutantInfo}
                />
              </div>

              {selectedItem && selectedItem.has_data !== false ? (
                <>
                  <div className="station-rec-action-bar">
                    <button
                      className="btn-station-rec-action"
                      onClick={() => {
                        handleOpenRecommendations({
                          station: selectedStation,
                          pollutant: 'pm25',
                          value: selectedItem?.pm25,
                          mode,
                          selectedDate,
                          selectedModel,
                          dataType: mode === 'forecast' ? 'predicted' : 'observed',
                        });
                      }}
                      title="Open verified precaution recommendations based on this station's telemetry"
                    >
                      🛡 View Recommended Precautions →
                    </button>
                  </div>

                  <div className="pollutant-grid">
                    {[
                      { id: 'pm25', label: mode === 'forecast' ? 'Pred PM2.5' : 'PM2.5', val: selectedItem.pm25, unit: 'µg/m³' },
                      {
                        id: mode === 'forecast' ? undefined : 'pm10',
                        label: mode === 'forecast' ? 'Lower CI' : 'PM10',
                        val: mode === 'forecast' ? selectedItem.lower_bound : selectedItem.pm10,
                        unit: 'µg/m³',
                      },
                      {
                        id: mode === 'forecast' ? undefined : 'no2',
                        label: mode === 'forecast' ? 'Upper CI' : 'NO₂',
                        val: mode === 'forecast' ? selectedItem.upper_bound : selectedItem.no2,
                        unit: 'µg/m³',
                      },
                      {
                        id: mode === 'forecast' ? undefined : 'so2',
                        label: mode === 'forecast' ? 'Model' : 'SO₂',
                        val: mode === 'forecast' ? null : selectedItem.so2,
                        unit: mode === 'forecast' ? (selectedModel === 'weighted_ensemble' ? 'Ensemble' : selectedModel === 'hist_gradient_boosting' ? 'HGB' : selectedModel === 'random_forest' ? 'RF' : 'XGB') : 'µg/m³',
                      },
                      { id: 'co', label: 'CO', val: selectedItem.co, unit: 'mg/m³' },
                      { id: 'o3', label: 'O₃', val: selectedItem.o3, unit: 'µg/m³' },
                      { id: undefined, label: 'Temp', val: selectedItem.temperature, unit: '°C' },
                      { id: undefined, label: 'Humidity', val: selectedItem.humidity, unit: '%' },
                    ].map(({ id, label, val, unit }) => (
                      <div
                        key={label}
                        className={`pollutant-cell ${id ? 'clickable-pollutant-cell' : ''}`}
                        onClick={() => {
                          if (id) {
                            handleOpenPollutantInfo(id, {
                              metric: id,
                              pollutantName: label,
                              value: val,
                              unit,
                              stationName: selectedStation.name,
                              dateOrTimestamp: selectedItem.recorded_at || selectedItem.prediction_date || selectedDate,
                              source: mode === 'forecast' ? `AIRPULSE ML (${selectedItem.model_name || selectedModel})` : (selectedItem.source || 'OpenAQ'),
                              dataType: mode === 'forecast' ? 'predicted' : 'observed',
                            });
                          }
                        }}
                        title={id ? `Click to inspect ${label} scientific definitions & guidelines` : undefined}
                      >
                        <span className="pollutant-cell-label">{label} {id ? 'ⓘ' : ''}</span>
                        <span className="pollutant-cell-value">
                          {val !== null && val !== undefined ? formatValue(val, unit) : unit}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="detail-source">
                    {mode === 'forecast' ? (
                      <>Source: OpenAQ Historical Telemetry + Multi-Model Forecast ({selectedModel === 'weighted_ensemble' ? 'Ensemble: XGB 32.8% + RF 33.3% + HGB 34.0%' : selectedModel}) · Ref: {forecastRefDate}</>
                    ) : (
                      <>Source: {selectedItem.source || 'OpenAQ'} · Ingested: {formatRelativeTime(selectedItem.ingested_at)}</>
                    )}
                  </div>
                </>
              ) : (
                <div className="detail-no-obs">
                  Data unavailable for this station on selected date ({selectedDate}).
                </div>
              )}

              {/* 5-Day ML Forecast Overview Section */}
              <PredictionForecast data={forecast} loading={forecastLoading} />

              <div className="chart-section">
                <h4 className="chart-title">PM2.5 &amp; PM10 Historical Trend</h4>
                {historyState === 'loading' && <div className="chart-loading">Loading chart data…</div>}
                {historyState !== 'loading' && <PollutantChart data={history} />}
              </div>
            </div>
          ) : (
            <div className="station-detail detail-placeholder">
              <div className="placeholder-icon">📍</div>
              <div className="placeholder-text">Select a station on the map or from the list to view details</div>
            </div>
          )}
        </section>
      </main>

      <OpenAQRegistryModal
        isOpen={isRegistryOpen}
        onClose={() => setIsRegistryOpen(false)}
        onSelectStation={(id) => {
          const s = stations.find((st) => st.id === id);
          if (s) setSelectedStation(s);
        }}
      />

      <LocationLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        onSelectStation={(id) => {
          const s = stations.find((st) => st.id === id);
          if (s) setSelectedStation(s);
        }}
        onOpenPollutantInfo={handleOpenPollutantInfo}
        onOpenRecommendations={handleOpenRecommendations}
      />

      {/* Authoritative Pollutant Information & Standards Modal (Feature 8) */}
      <PollutantInfoModal
        isOpen={isPollutantModalOpen}
        onClose={() => {
          setIsPollutantModalOpen(false);
          setContextualMeasurement(null);
        }}
        initialPollutantId={selectedPollutantId}
        contextualMeasurement={contextualMeasurement}
      />

      {/* Automated Environmental Alerts Drawer Panel (Feature 9) */}
      <AlertPanel
        isOpen={isAlertPanelOpen}
        onToggle={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
        observedAlerts={observedAlerts}
        forecastAlerts={forecastAlerts}
        summary={alertSummary}
        loading={alertsLoading}
        selectedThreshold={alertThreshold}
        onSelectThreshold={setAlertThreshold}
        onSelectStation={(id) => {
          const s = stations.find((st) => st.id === id);
          if (s) setSelectedStation(s);
        }}
        onOpenPollutantInfo={handleOpenPollutantInfo}
        mode={mode}
        selectedDate={selectedDate}
        selectedModel={selectedModel}
      />

      {/* Context-Aware Precaution Recommendations Modal (Feature 10) */}
      <RecommendationModal
        isOpen={isRecModalOpen}
        onClose={() => {
          setIsRecModalOpen(false);
          setRecContextOverride(null);
        }}
        station={recContextOverride ? recContextOverride.station : selectedStation}
        pollutant={recContextOverride?.pollutant || 'pm25'}
        value={recContextOverride?.value !== undefined ? recContextOverride.value : selectedItem?.pm25}
        severityTier={recContextOverride?.severityTier}
        mode={recContextOverride?.mode || mode}
        selectedDate={recContextOverride?.selectedDate || selectedDate}
        selectedModel={recContextOverride?.selectedModel || selectedModel}
        dataType={recContextOverride?.dataType || (mode === 'forecast' ? 'predicted' : 'observed')}
        onOpenPollutantInfo={handleOpenPollutantInfo}
      />
    </div>
  );
}
