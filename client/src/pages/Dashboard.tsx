import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Station } from '../types/station';
import type { Observation, HistoryObservation } from '../types/observation';
import { stationsApi } from '../api/stations';
import { observationsApi } from '../api/observations';
import { predictionsApi } from '../api/predictions';
import type { PredictionSummaryResponse, ModelsComparisonResponse } from '../types/prediction';
import { hotspotsApi } from '../api/hotspots';
import type { Hotspot } from '../types/hotspot';
import { alertsApi } from '../api/alerts';
import type { EnvironmentalAlert, AlertSummaryResponse, UnifiedAlertsResponse } from '../types/alert';
import type { ContextualMeasurement } from '../types/pollutant';
import type { DashboardMode } from '../components/DateNavigator';

import { Navbar, type AppView } from '../components/Navbar';
import { OverviewView } from '../views/OverviewView';
import { LiveMonitoringView } from '../views/LiveMonitoringView';
import { HistoricalView } from '../views/HistoricalView';
import { ForecastsView } from '../views/ForecastsView';
import { HotspotsView } from '../views/HotspotsView';
import { PollutantGuideView } from '../views/PollutantGuideView';
import { OpenAQRegistryView } from '../views/OpenAQRegistryView';
import { GeoLookupView } from '../views/GeoLookupView';

import { PollutantInfoModal } from '../components/PollutantInfoModal';
import { AlertPanel } from '../components/AlertPanel';
import { RecommendationModal } from '../components/RecommendationModal';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const VALID_VIEWS: AppView[] = [
  'overview',
  'live',
  'historical',
  'forecast',
  'hotspots',
  'pollutants',
  'registry',
  'coordinates',
];

const getViewFromHash = (): AppView => {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash === 'tools-registry' || hash === 'openaq') return 'registry';
  if (hash === 'tools-lookup' || hash === 'geo' || hash === 'lookup') return 'coordinates';
  if (VALID_VIEWS.includes(hash as AppView)) {
    return hash as AppView;
  }
  return 'overview';
};

export function Dashboard() {
  const [currentView, setCurrentView] = useState<AppView>(getViewFromHash);
  const [stations, setStations] = useState<Station[]>([]);
  const [latestObs, setLatestObs] = useState<Observation[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [historySample, setHistorySample] = useState<HistoryObservation[]>([]);
  const [stationsState, setStationsState] = useState<LoadState>('idle');
  const [dataState, setDataState] = useState<LoadState>('idle');
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  const [predictionSummary, setPredictionSummary] = useState<PredictionSummaryResponse | null>(null);
  const [modelsComparison, setModelsComparison] = useState<ModelsComparisonResponse | null>(null);
  const selectedModel = 'weighted_ensemble';

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [hotspotsLoading, setHotspotsLoading] = useState<boolean>(false);

  // Pollutant Info Modal state (Feature 8)
  const [isPollutantModalOpen, setIsPollutantModalOpen] = useState<boolean>(false);
  const [selectedPollutantId, setSelectedPollutantId] = useState<string>('pm25');
  const [contextualMeasurement, setContextualMeasurement] = useState<ContextualMeasurement | null>(null);

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

  const selectedDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Hash & browser history synchronization
  useEffect(() => {
    const handleHashChange = () => {
      const targetView = getViewFromHash();
      setCurrentView(targetView);
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigateToView = (view: AppView) => {
    if (window.location.hash.replace('#', '') !== view) {
      window.location.hash = view;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPollutantInfo = useCallback((pollutantId: string, context?: ContextualMeasurement) => {
    setSelectedPollutantId(pollutantId || 'pm25');
    setContextualMeasurement(context || null);
    setIsPollutantModalOpen(true);
  }, []);

  const handleOpenRecommendations = useCallback((override?: {
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
  }, []);

  // 1. Load Station Network
  const loadStations = useCallback(async () => {
    setStationsState('loading');
    setStationsError(null);
    try {
      const res = await stationsApi.list({});
      setStations(res.stations || []);
      setStationsState('loaded');
      if (res.stations && res.stations.length > 0 && !selectedStation) {
        setSelectedStation(res.stations[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch stations';
      setStationsError(msg);
      setStationsState('error');
    }
  }, [selectedStation]);

  // 2. Load Latest Observations
  const loadLatestObs = useCallback(async () => {
    setDataState('loading');
    setDataError(null);
    try {
      const res = await observationsApi.latest({ limit: 100 });
      setLatestObs(res.data || []);
      setDataState('loaded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch observations';
      setDataError(msg);
      setDataState('error');
    }
  }, []);

  // 3. Load Sample History for overview
  useEffect(() => {
    if (stations.length > 0) {
      const targetStationId = selectedStation?.id || stations[0].id;
      observationsApi
        .history({ station_id: targetStationId })
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setHistorySample(res.data.slice(-14));
          }
        })
        .catch(() => {});
    }
  }, [stations, selectedStation]);

  // Initial Fetch on Mount
  useEffect(() => {
    loadStations();
    loadLatestObs();

    predictionsApi
      .getSummary(selectedModel)
      .then(setPredictionSummary)
      .catch(() => {});

    predictionsApi
      .getModelsComparison()
      .then(setModelsComparison)
      .catch(() => {});
  }, [loadStations, loadLatestObs, selectedModel]);

  // Load DBSCAN Hotspots
  useEffect(() => {
    setHotspotsLoading(true);
    hotspotsApi
      .list({
        date: selectedDate,
        mode: 'live',
        model: selectedModel,
      })
      .then((res) => {
        setHotspots(res.hotspots || []);
        setHotspotsLoading(false);
      })
      .catch((err) => {
        console.warn('[Hotspots] Initial load failed:', err instanceof Error ? err.message : err);
        setHotspots([]);
        setHotspotsLoading(false);
      });
  }, [selectedDate, selectedModel]);

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
        is_historical: false,
      }),
      alertsApi.summary({
        observed_date: selectedDate,
        forecast_date: selectedDate,
        model: selectedModel,
        min_severity: alertThreshold,
        is_historical: false,
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
        console.warn('[Alerts] Fetch failed:', err instanceof Error ? err.message : err);
        setObservedAlerts([]);
        setForecastAlerts([]);
        setAlertsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, selectedModel, alertThreshold]);

  const activeObsCount = latestObs.filter((o) => o.pm25 !== null || o.aqi !== null).length;
  const totalAlertsCount = observedAlerts.length + forecastAlerts.length;
  const currentMode: DashboardMode =
    currentView === 'forecast' ? 'forecast' : currentView === 'historical' ? 'historical' : 'live';

  return (
    <div className="nature-app-shell">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onViewChange={navigateToView}
        stationCount={stations.length}
        activeReadingCount={activeObsCount}
        lastUpdatedText="Live Ground Telemetry"
        onOpenLookup={() => navigateToView('coordinates')}
        onOpenRegistry={() => navigateToView('registry')}
        onToggleAlerts={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
        alertCount={totalAlertsCount}
        alertsLoading={alertsLoading}
        onOpenRecommendations={() => handleOpenRecommendations()}
      />

      {/* Mutually Exclusive Main View Router */}
      <main className="nature-main-content" role="main">
        {currentView === 'overview' && (
          <OverviewView
            stations={stations}
            latestObs={latestObs}
            hotspots={hotspots}
            predictionSummary={predictionSummary}
            historySample={historySample}
            onNavigate={navigateToView}
            onSelectStation={(s) => setSelectedStation(s)}
            onOpenLookup={() => navigateToView('coordinates')}
            onOpenRegistry={() => navigateToView('registry')}
            onOpenPollutantInfo={handleOpenPollutantInfo}
          />
        )}

        {currentView === 'live' && (
          <LiveMonitoringView
            stations={stations}
            latestObs={latestObs}
            selectedStation={selectedStation}
            onSelectStation={(s) => setSelectedStation(s)}
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={setSelectedHotspot}
            loading={stationsState === 'loading' || dataState === 'loading'}
            error={stationsError || dataError}
            onOpenPollutantInfo={handleOpenPollutantInfo}
            onNavigate={navigateToView}
          />
        )}

        {currentView === 'historical' && (
          <HistoricalView
            stations={stations}
            initialSelectedStation={selectedStation}
            onSelectStation={(s) => setSelectedStation(s)}
          />
        )}

        {currentView === 'forecast' && (
          <ForecastsView
            stations={stations}
            initialSelectedStation={selectedStation}
            onSelectStation={(s) => setSelectedStation(s)}
            predictionSummary={predictionSummary}
            modelsComparison={modelsComparison}
          />
        )}

        {currentView === 'hotspots' && (
          <HotspotsView
            hotspots={hotspots}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={setSelectedHotspot}
            stations={stations}
            onSelectStation={(s) => {
              setSelectedStation(s);
              navigateToView('live');
            }}
            loading={hotspotsLoading}
            selectedDate={selectedDate}
            mode="live"
            selectedModel={selectedModel}
            onOpenPollutantInfo={handleOpenPollutantInfo}
          />
        )}

        {currentView === 'pollutants' && (
          <PollutantGuideView />
        )}

        {/* Dedicated Separate View: OpenAQ Registry */}
        {currentView === 'registry' && (
          <OpenAQRegistryView
            onSelectStation={(id) => {
              const s = stations.find((st) => st.id === id);
              if (s) setSelectedStation(s);
              navigateToView('live');
            }}
            onNavigateToLive={() => navigateToView('live')}
          />
        )}

        {/* Dedicated Separate View: Lat / Lon Coordinates Lookup */}
        {currentView === 'coordinates' && (
          <GeoLookupView
            onSelectStation={(id) => {
              const s = stations.find((st) => st.id === id);
              if (s) setSelectedStation(s);
              navigateToView('live');
            }}
            onNavigateToLive={() => navigateToView('live')}
            onOpenPollutantInfo={handleOpenPollutantInfo}
          />
        )}
      </main>

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
          if (s) {
            setSelectedStation(s);
            navigateToView('live');
          }
        }}
        onOpenPollutantInfo={handleOpenPollutantInfo}
        mode={currentMode}
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
        value={
          recContextOverride?.value !== undefined
            ? recContextOverride.value
            : selectedStation
            ? latestObs.find((o) => o.station_id === selectedStation.id)?.pm25
            : undefined
        }
        severityTier={recContextOverride?.severityTier}
        mode={recContextOverride?.mode || currentMode}
        selectedDate={recContextOverride?.selectedDate || selectedDate}
        selectedModel={recContextOverride?.selectedModel || selectedModel}
        dataType={recContextOverride?.dataType || (currentMode === 'forecast' ? 'predicted' : 'observed')}
        onOpenPollutantInfo={(id) => handleOpenPollutantInfo(id)}
      />
    </div>
  );
}
