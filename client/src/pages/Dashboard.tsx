import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Station } from '../types/station';
import type { Observation, HistoryObservation } from '../types/observation';
import { stationsApi } from '../api/stations';
import { observationsApi } from '../api/observations';
import { predictionsApi } from '../api/predictions';
import { hotspotsApi } from '../api/hotspots';
import type { PredictionSummaryResponse, ModelsComparisonResponse } from '../types/prediction';
import type { Hotspot } from '../types/hotspot';
import type { ContextualMeasurement } from '../types/pollutant';

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

  // Pollutant Info Modal state
  const [isPollutantModalOpen, setIsPollutantModalOpen] = useState<boolean>(false);
  const [selectedPollutantId, setSelectedPollutantId] = useState<string>('pm25');
  const [contextualMeasurement, setContextualMeasurement] = useState<ContextualMeasurement | null>(null);

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

  const handleOpenPollutantInfo = (pollutantId: string, context?: ContextualMeasurement) => {
    setSelectedPollutantId(pollutantId || 'pm25');
    setContextualMeasurement(context || null);
    setIsPollutantModalOpen(true);
  };

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
    } catch (err: any) {
      setStationsError(err.response?.data?.error?.message || err.message || 'Failed to fetch stations');
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
    } catch (err: any) {
      setDataError(err.response?.data?.error?.message || err.message || 'Failed to fetch observations');
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
        console.warn('[Hotspots] Initial load failed:', err.message);
        setHotspots([]);
        setHotspotsLoading(false);
      });
  }, [selectedDate, selectedModel]);

  const activeObsCount = latestObs.filter((o) => o.pm25 !== null || o.aqi !== null).length;

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

      {/* Global Modals */}
      <PollutantInfoModal
        isOpen={isPollutantModalOpen}
        onClose={() => {
          setIsPollutantModalOpen(false);
          setContextualMeasurement(null);
        }}
        initialPollutantId={selectedPollutantId}
        contextualMeasurement={contextualMeasurement}
      />
    </div>
  );
}
