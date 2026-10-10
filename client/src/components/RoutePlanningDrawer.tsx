/**
 * AIRPULSE — Pollution-Aware Route Planning Drawer (Walking & Cycling Priority)
 */

import React, { useState } from 'react';
import type { RoutePlanResponse, TravelMode } from '../types/route';
import type { Station } from '../types/station';
import { routesApi } from '../api/routes';

interface RoutePlanningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  activeRouteResponse: RoutePlanResponse | null;
  onRoutesCalculated: (res: RoutePlanResponse | null) => void;
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
}

const POPULAR_DELHI_HUBS = [
  { name: 'Connaught Place', lat: 28.6315, lon: 77.2167 },
  { name: 'India Gate', lat: 28.6129, lon: 77.2295 },
  { name: 'Lodhi Garden', lat: 28.5933, lon: 77.2197 },
  { name: 'Hauz Khas Village', lat: 28.5535, lon: 77.1943 },
  { name: 'R K Puram (DPCC Station)', lat: 28.5638, lon: 77.1867 },
  { name: 'ITO Intersection', lat: 28.6288, lon: 77.2410 },
];

export const RoutePlanningDrawer: React.FC<RoutePlanningDrawerProps> = ({
  isOpen,
  onClose,
  stations: _stations,
  activeRouteResponse,
  onRoutesCalculated,
  selectedRouteIndex,
  onSelectRouteIndex,
}) => {
  const [originInput, setOriginInput] = useState<string>('Connaught Place');
  const [destinationInput, setDestinationInput] = useState<string>('India Gate');
  const [mode, setMode] = useState<TravelMode>('walking');
  const [pollutant, setPollutant] = useState<string>('pm25');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = originInput;
    setOriginInput(destinationInput);
    setDestinationInput(temp);
  };

  const handleCalculateRoute = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!originInput.trim() || !destinationInput.trim()) {
      setError('Please provide both Origin (A) and Destination (B).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await routesApi.planRoute({
        origin: originInput.trim(),
        destination: destinationInput.trim(),
        mode,
        pollutant,
      });
      onRoutesCalculated(res);
      onSelectRouteIndex(res.comparison.lowest_exposure_route_index !== null ? res.comparison.lowest_exposure_route_index : 0);
      setLoading(false);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to calculate route.';
      setError(msg);
      setLoading(false);
    }
  };

  const selectedRoute = activeRouteResponse?.routes?.[selectedRouteIndex] || null;

  return (
    <aside className="route-planning-drawer" role="complementary" aria-label="Route Planning Panel">
      {/* Header */}
      <div className="route-drawer-header">
        <div className="route-header-brand">
          <div className="route-header-badge">
            <span className="route-dot green" />
            <span>POLLUTION-AWARE ROUTING</span>
          </div>
          <h2 className="route-drawer-title">Walking &amp; Cycling Journey Planner</h2>
          <p className="route-drawer-subtitle">
            Feasible road geometries with real-time PostGIS corridor pollution analysis (3 km buffer).
          </p>
        </div>
        <button className="route-drawer-close-btn" onClick={onClose} aria-label="Close route planner">
          ✕
        </button>
      </div>

      <div className="route-drawer-scrollable">
        {/* Origin & Destination Inputs Form */}
        <form className="route-form-container" onSubmit={handleCalculateRoute}>
          <div className="route-inputs-wrapper">
            {/* Origin A */}
            <div className="route-input-group">
              <div className="input-pin-label pin-origin">A</div>
              <div className="input-field-col">
                <label className="route-field-label">ORIGIN (STARTING POINT):</label>
                <input
                  type="text"
                  className="route-text-input"
                  placeholder="Enter starting landmark, station, or coordinates..."
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Swap Button */}
            <div className="route-swap-row">
              <button
                type="button"
                className="btn-swap-locations"
                onClick={handleSwap}
                title="Swap Origin and Destination"
                disabled={loading}
              >
                ⇅ Swap Start &amp; Destination
              </button>
            </div>

            {/* Destination B */}
            <div className="route-input-group">
              <div className="input-pin-label pin-dest">B</div>
              <div className="input-field-col">
                <label className="route-field-label">DESTINATION (ARRIVAL POINT):</label>
                <input
                  type="text"
                  className="route-text-input"
                  placeholder="Enter arrival landmark, station, or coordinates..."
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Quick Presets for Convenient Testing */}
          <div className="quick-presets-section">
            <span className="presets-label">QUICK LOCATIONS:</span>
            <div className="presets-chips-row">
              {POPULAR_DELHI_HUBS.slice(0, 4).map((hub) => (
                <button
                  key={hub.name}
                  type="button"
                  className="btn-preset-chip"
                  onClick={() => {
                    if (!originInput.trim()) setOriginInput(hub.name);
                    else setDestinationInput(hub.name);
                  }}
                  title={`Use ${hub.name}`}
                >
                  {hub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector & Action */}
          <div className="route-controls-row">
            {/* Travel Mode Toggle */}
            <div className="mode-toggle-group">
              <button
                type="button"
                className={`btn-mode-toggle ${mode === 'walking' ? 'active' : ''}`}
                onClick={() => setMode('walking')}
                disabled={loading}
              >
                🚶 Walking
              </button>
              <button
                type="button"
                className={`btn-mode-toggle ${mode === 'cycling' ? 'active' : ''}`}
                onClick={() => setMode('cycling')}
                disabled={loading}
              >
                🚴 Cycling
              </button>
            </div>

            {/* Target Pollutant Selector */}
            <div className="pollutant-toggle-group">
              {[
                { id: 'pm25', label: 'PM2.5' },
                { id: 'pm10', label: 'PM10' },
                { id: 'no2', label: 'NO₂' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`btn-pollutant-pill ${pollutant === p.id ? 'active' : ''}`}
                  onClick={() => setPollutant(p.id)}
                  disabled={loading}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-plan-route-primary" disabled={loading}>
            {loading ? 'Analyzing Route Corridor…' : '🔍 Find Pollution-Aware Routes'}
          </button>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="route-loading-state">
            <div className="route-spinner" />
            <div className="route-loading-text">
              <strong>Querying Road Network &amp; Corridor Sensors…</strong>
              <p>Calculating pedestrian/bicycle paths and intersecting with nearby PostGIS monitoring stations.</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="route-error-banner">
            <span className="error-icon">⚠️</span>
            <div className="error-text">
              <strong>Routing Request Notice:</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Route Results & Comparison Section */}
        {!loading && activeRouteResponse && (
          <div className="route-results-section">
            {/* Comparison Verdict Banner */}
            <div className="route-verdict-box">
              <div className="verdict-header-row">
                <span className="verdict-icon">⚖️</span>
                <span className="verdict-title">ROUTE COMPARISON &amp; CORRIDOR ANALYSIS</span>
              </div>
              <p className="verdict-note">{activeRouteResponse.comparison.note}</p>
            </div>

            {/* Route Cards */}
            <div className="routes-list">
              {activeRouteResponse.routes.map((route, idx) => (
                <div
                  key={route.route_index}
                  className={`route-summary-card ${selectedRouteIndex === idx ? 'selected' : ''}`}
                  onClick={() => onSelectRouteIndex(idx)}
                >
                  <div className="route-card-header">
                    <div className="route-name-wrap">
                      <span className="route-idx-circle">{idx + 1}</span>
                      <strong className="route-card-name">{route.name}</strong>
                    </div>
                    <span className={`route-tag-pill ${route.is_lower_exposure ? 'tag-green' : route.is_fastest ? 'tag-cyan' : 'tag-slate'}`}>
                      {route.tag}
                    </span>
                  </div>

                  {/* Core Metrics: Distance & Travel Time */}
                  <div className="route-metrics-grid">
                    <div className="route-metric-cell">
                      <span className="metric-label">DISTANCE</span>
                      <span className="metric-val">{route.distance_km} km</span>
                    </div>
                    <div className="route-metric-cell">
                      <span className="metric-label">EST. TIME</span>
                      <span className="metric-val">{route.duration_minutes} min</span>
                    </div>
                    <div className="route-metric-cell">
                      <span className="metric-label">MODE</span>
                      <span className="metric-val">{route.mode_label}</span>
                    </div>
                  </div>

                  {/* Pollution Exposure Box */}
                  <div className="route-exposure-box">
                    <div className="exposure-top-row">
                      <span className="exposure-label">CORRIDOR {activeRouteResponse.target_pollutant} EXPOSURE:</span>
                      {route.pollution_analysis.severity ? (
                        <span
                          className="exposure-severity-badge"
                          style={{
                            backgroundColor: `${route.pollution_analysis.severity.color}22`,
                            borderColor: route.pollution_analysis.severity.color,
                            color: route.pollution_analysis.severity.color,
                          }}
                        >
                          {route.pollution_analysis.corridor_avg_concentration} µg/m³ · {route.pollution_analysis.severity.category}
                        </span>
                      ) : (
                        <span className="exposure-severity-badge unavailable">Data Unavailable</span>
                      )}
                    </div>

                    <div className="exposure-details-row">
                      <span className="coverage-text">
                        Sensor Coverage: <strong>{route.pollution_analysis.coverage_pct}%</strong>
                      </span>
                      <span className="stations-count-text">
                        {route.pollution_analysis.nearby_stations_count} station{route.pollution_analysis.nearby_stations_count !== 1 ? 's' : ''} within 3 km
                      </span>
                    </div>

                    <div className="provenance-note-row">
                      <span className="provenance-micro-tag">
                        {route.pollution_analysis.data_provenance_label}
                      </span>
                    </div>
                  </div>

                  {/* Select Route Button Indicator */}
                  <div className="card-select-action-row">
                    <button
                      type="button"
                      className={`btn-select-route ${selectedRouteIndex === idx ? 'btn-active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRouteIndex(idx);
                      }}
                    >
                      {selectedRouteIndex === idx ? '✓ Currently Displayed on Map' : 'Select This Route on Map'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Health Notice on Active Travel in Elevated Air Pollution */}
            <div className="route-health-guidance-box">
              <div className="guidance-header-row">
                <span className="guidance-icon">🫁</span>
                <span className="guidance-title">ACTIVE TRAVEL HEALTH ADVISORY</span>
              </div>
              <p className="guidance-text">
                {activeRouteResponse.disclaimers.ventilation_notice}
              </p>
              {selectedRoute?.pollution_analysis.severity?.tier && selectedRoute.pollution_analysis.severity.tier >= 4 && (
                <div className="elevated-caution-pill">
                  ⚠️ Elevated pollution detected along corridor. Sensitive pedestrians &amp; cyclists should wear certified tight-fitting N95/FFP2 respirators and avoid peak rush-hour transit.
                </div>
              )}
            </div>

            {/* Statutory Safety & Provider Disclaimers */}
            <div className="route-disclaimers-footer">
              <p>⚖️ <strong>Safety Notice:</strong> {activeRouteResponse.disclaimers.safety_notice}</p>
              <p>ℹ️ <strong>Methodology &amp; Provenance:</strong> {activeRouteResponse.disclaimers.data_provenance_notice}</p>
              <p className="provider-attr">🗺️ {activeRouteResponse.disclaimers.provider_attribution}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
