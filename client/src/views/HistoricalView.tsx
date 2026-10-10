import React, { useState, useEffect, useMemo } from 'react';
import type { Station } from '../types/station';
import type { HistoryObservation } from '../types/observation';
import { observationsApi } from '../api/observations';
import { PollutantChart } from '../components/charts/PollutantChart';
import { formatValue } from '../utils/aqiUtils';

interface HistoricalViewProps {
  stations: Station[];
  initialSelectedStation: Station | null;
  onSelectStation: (station: Station) => void;
}

export const HistoricalView: React.FC<HistoricalViewProps> = ({
  stations,
  initialSelectedStation,
  onSelectStation,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<number>(
    initialSelectedStation?.id || stations[0]?.id || 1
  );
  const [historyData, setHistoryData] = useState<HistoryObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<Array<'pm25' | 'pm10' | 'aqi'>>(['pm25', 'pm10']);

  // Keep state in sync if parent selection changes
  useEffect(() => {
    if (initialSelectedStation) {
      setSelectedStationId(initialSelectedStation.id);
    }
  }, [initialSelectedStation]);

  const currentStation = useMemo(() => {
    return stations.find((s) => s.id === selectedStationId) || stations[0] || null;
  }, [stations, selectedStationId]);

  // Load history whenever selectedStationId changes
  useEffect(() => {
    if (!selectedStationId) return;
    setLoading(true);
    observationsApi
      .history({ station_id: selectedStationId })
      .then((res) => {
        setHistoryData(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[HistoricalView] Failed to load history:', err.message);
        setHistoryData([]);
        setLoading(false);
      });
  }, [selectedStationId]);

  // Calculate statistics from real data
  const stats = useMemo(() => {
    if (!historyData || historyData.length === 0) return null;

    const pm25Values = historyData
      .map((d) => d.pm25)
      .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

    if (pm25Values.length === 0) return null;

    const min = Math.min(...pm25Values);
    const max = Math.max(...pm25Values);
    const avg = pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length;

    return {
      min,
      max,
      avg,
      count: pm25Values.length,
      earliest: historyData[0]?.recorded_at,
      latest: historyData[historyData.length - 1]?.recorded_at,
    };
  }, [historyData]);

  const toggleSeries = (seriesKey: 'pm25' | 'pm10' | 'aqi') => {
    if (selectedSeries.includes(seriesKey)) {
      if (selectedSeries.length > 1) {
        setSelectedSeries(selectedSeries.filter((s) => s !== seriesKey));
      }
    } else {
      setSelectedSeries([...selectedSeries, seriesKey]);
    }
  };

  return (
    <div className="nature-page-container historical-page">
      <div className="historical-header">
        <div>
          <h1 className="page-heading">Historical Environmental Trends</h1>
          <p className="page-subheading">
            Long-term ambient telemetry and particulate trends backed by PostgreSQL database records
          </p>
        </div>

        {/* Station Selector Dropdown */}
        <div className="historical-station-picker">
          <label htmlFor="station-select" className="picker-label">Monitoring Station:</label>
          <select
            id="station-select"
            className="nature-select picker-select"
            value={selectedStationId}
            onChange={(e) => {
              const id = parseInt(e.target.value, 10);
              setSelectedStationId(id);
              const found = stations.find((s) => s.id === id);
              if (found) onSelectStation(found);
            }}
          >
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city}, {s.state})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Station Summary Badge */}
      {currentStation && (
        <div className="historical-station-banner">
          <div className="banner-left">
            <span className="station-code-chip">{currentStation.station_code}</span>
            <h2 className="banner-station-title">{currentStation.name}</h2>
            <span className="banner-location">📍 {currentStation.city}, {currentStation.state} ({currentStation.country})</span>
          </div>

          {/* Series Toggle Checkboxes */}
          <div className="series-toggle-group">
            <span className="series-toggle-label">Visible Pollutants:</span>
            <button
              className={`series-pill pm25 ${selectedSeries.includes('pm25') ? 'active' : ''}`}
              onClick={() => toggleSeries('pm25')}
            >
              <span className="series-dot pm25" /> PM2.5 (µg/m³)
            </button>
            <button
              className={`series-pill pm10 ${selectedSeries.includes('pm10') ? 'active' : ''}`}
              onClick={() => toggleSeries('pm10')}
            >
              <span className="series-dot pm10" /> PM10 (µg/m³)
            </button>
            <button
              className={`series-pill aqi ${selectedSeries.includes('aqi') ? 'active' : ''}`}
              onClick={() => toggleSeries('aqi')}
            >
              <span className="series-dot aqi" /> AQI
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      {stats && (
        <div className="historical-stats-grid">
          <div className="stat-card">
            <span className="stat-label">Average PM2.5</span>
            <span className="stat-value">{formatValue(stats.avg, 'µg/m³')}</span>
            <span className="stat-hint">Across {stats.count} recorded observations</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Minimum Recorded</span>
            <span className="stat-value success">{formatValue(stats.min, 'µg/m³')}</span>
            <span className="stat-hint">Cleanest air interval</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Maximum Peak</span>
            <span className="stat-value alert">{formatValue(stats.max, 'µg/m³')}</span>
            <span className="stat-hint">Highest recorded spike</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Data Span</span>
            <span className="stat-value small">
              {stats.earliest ? new Date(stats.earliest).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
            <span className="stat-hint">to {stats.latest ? new Date(stats.latest).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
          </div>
        </div>
      )}

      {/* Main Chart Card */}
      <div className="historical-chart-card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-card-title">Particulate Concentration Timeline</h3>
            <span className="chart-card-subtitle">
              Time-series observations rendered via Recharts exclusively · Units: µg/m³
            </span>
          </div>
          {loading && <span className="chart-loading-indicator">Querying PostgreSQL…</span>}
        </div>

        <div className="historical-chart-body">
          {loading ? (
            <div className="chart-skeleton-wrap">
              <div className="chart-skeleton-bar" />
              <p>Fetching multi-day telemetry from environmental_observations table…</p>
            </div>
          ) : historyData.length > 0 ? (
            <PollutantChart data={historyData} series={selectedSeries} height={380} />
          ) : (
            <div className="chart-empty-state">
              <span className="empty-icon">🌱</span>
              <h4>No Historical Observations Available</h4>
              <p>
                This monitoring station has not logged historical records in the local database yet.
                Under our honest data policy, no synthetic readings are fabricated.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Regulatory Context Box */}
      <div className="regulatory-context-card">
        <div className="context-card-icon">🏛️</div>
        <div className="context-card-content">
          <h4>Regulatory Benchmarks for Historical Evaluation</h4>
          <p>
            Under India CPCB NAAQS (National Ambient Air Quality Standards), the 24-hour limit for <strong>PM2.5</strong> is <strong>60 µg/m³</strong> (annual limit is 40 µg/m³).
            For <strong>PM10</strong>, the 24-hour limit is <strong>100 µg/m³</strong>.
            The World Health Organization (WHO 2021) recommends a stricter 24-hour PM2.5 limit of <strong>15 µg/m³</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
