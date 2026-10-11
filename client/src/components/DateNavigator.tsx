import React from 'react';

export type DashboardMode = 'live' | 'historical' | 'forecast';

interface Props {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  historicalMinDate?: string;
  historicalMaxDate?: string;
  allowedForecastDates?: string[];
  referenceDate?: string;
  totalStations: number;
  stationsWithData: number;
  isLoading: boolean;
  activeModelName?: string;
}

export function DateNavigator({
  mode,
  onModeChange,
  selectedDate,
  onDateChange,
  historicalMinDate = '2016-01-30',
  historicalMaxDate = '2026-10-02',
  allowedForecastDates = ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'],
  referenceDate = '2026-10-02',
  totalStations,
  stationsWithData,
  isLoading,
  activeModelName,
}: Props) {
  const handleHistoricalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    // Strictly clamp within historical range
    if (val > historicalMaxDate) {
      onDateChange(historicalMaxDate);
    } else if (val < historicalMinDate) {
      onDateChange(historicalMinDate);
    } else {
      onDateChange(val);
    }
  };

  return (
    <div className="date-navigator-container">
      {/* Mode Switcher Tabs */}
      <div className="date-nav-modes">
        <button
          type="button"
          className={`date-nav-tab ${mode === 'live' ? 'active' : ''}`}
          onClick={() => onModeChange('live')}
        >
          <span className="date-tab-dot live-dot" />
          <span className="date-tab-title">LIVE READINGS</span>
          <span className="date-tab-badge">Latest</span>
        </button>

        <button
          type="button"
          className={`date-nav-tab ${mode === 'historical' ? 'active' : ''}`}
          onClick={() => onModeChange('historical')}
        >
          <span className="date-tab-dot hist-dot" />
          <span className="date-tab-title">HISTORICAL DATE</span>
          <span className="date-tab-badge">Observed</span>
        </button>

        <button
          type="button"
          className={`date-nav-tab ${mode === 'forecast' ? 'active' : ''}`}
          onClick={() => onModeChange('forecast')}
        >
          <span className="date-tab-dot forecast-dot" />
          <span className="date-tab-title">5-DAY FORECAST</span>
          <span className="date-tab-badge purple">ML Horizon</span>
        </button>
      </div>

      {/* Mode-Specific Sub-Controls */}
      <div className="date-nav-controls">
        {mode === 'live' && (
          <div className="date-nav-sub live-sub">
            <span className="date-control-desc">
              Viewing latest air quality readings from active Indian monitoring stations.
            </span>
            <span className="date-control-tag live-tag">
              DATA SOURCE: OPENAQ
            </span>
          </div>
        )}

        {mode === 'historical' && (
          <div className="date-nav-sub hist-sub">
            <div className="date-picker-row">
              <label htmlFor="hist-date-picker" className="date-picker-label">
                Select Past Date:
              </label>
              <input
                id="hist-date-picker"
                type="date"
                className="date-native-input"
                min={historicalMinDate}
                max={historicalMaxDate}
                value={selectedDate}
                onChange={handleHistoricalDateChange}
              />
              <span className="date-range-caption">
                Available: {historicalMinDate} to {historicalMaxDate}
              </span>
            </div>
            <div className="date-nav-type-badge observed-badge">
              <span className="type-indicator-dot" />
              OBSERVED / GROUND MEASURED DATA
            </div>
          </div>
        )}

        {mode === 'forecast' && (
          <div className="date-nav-sub forecast-sub">
            <div className="forecast-pills-row">
              <span className="forecast-pills-label">Forecast Horizon (Days 1–5):</span>
              <div className="forecast-pill-group">
                {allowedForecastDates.map((dateStr, index) => {
                  const dayNum = index + 1;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={`forecast-day-pill ${isSelected ? 'selected' : ''}`}
                      onClick={() => onDateChange(dateStr)}
                    >
                      <span className="pill-day-num">Day {dayNum}</span>
                      <span className="pill-date-str">{dateStr}</span>
                    </button>
                  );
                })}
              </div>
              <span className="forecast-horizon-caption">
                Strict 5-day horizon (ref: {referenceDate}). Days 6+ are disabled.
              </span>
            </div>
            <div className="date-nav-type-badge predicted-badge">
              <span className="type-indicator-dot purple" />
              {activeModelName ? `PREDICTED / ${activeModelName.toUpperCase()}` : 'PREDICTED / ML FORECAST'}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="date-nav-status-bar">
        <div className="date-status-info">
          {isLoading ? (
            <span className="status-loading-text">Loading snapshot data...</span>
          ) : (
            <>
              <span className="status-metric-label">Active Mode:</span>
              <span className="status-metric-val">
                {mode === 'live'
                  ? 'Live Air Quality Readings'
                  : mode === 'historical'
                  ? `Historical Snapshot (${selectedDate})`
                  : `ML Forecast (${selectedDate})`}
              </span>
              <span className="status-separator">|</span>
              <span className="status-metric-label">Stations:</span>
              <span className="status-metric-val">
                {stationsWithData} / {totalStations} with data
              </span>
              {mode !== 'live' && stationsWithData < totalStations && (
                <span className="status-unavail-note">
                  ({totalStations - stationsWithData} unavailable on this date)
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
