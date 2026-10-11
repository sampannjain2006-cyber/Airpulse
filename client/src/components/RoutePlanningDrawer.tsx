/**
 * AIRPULSE — Pollution-Aware Route Planning Drawer (Walking & Cycling Priority)
 * Integrated with interactive Leaflet map, structured route cards & health advisories.
 */

import React, { useState, useEffect } from 'react';
import type { RoutePlanResponse, TravelMode } from '../types/route';
import type { Station } from '../types/station';
import { routesApi } from '../api/routes';
import { RoutePlannerMap } from './RoutePlannerMap';
import type { GoogleContextPayload } from '../types/google';

interface RoutePlanningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  activeRouteResponse: RoutePlanResponse | null;
  onRoutesCalculated: (res: RoutePlanResponse | null) => void;
  selectedRouteIndex: number;
  onSelectRouteIndex: (idx: number) => void;
  onOpenGoogleServices?: (context: GoogleContextPayload) => void;
}

const POPULAR_DELHI_HUBS = [
  { name: 'Connaught Place', lat: 28.6315, lon: 77.2167 },
  { name: 'India Gate', lat: 28.6129, lon: 77.2295 },
  { name: 'Lodhi Garden', lat: 28.5933, lon: 77.2197 },
  { name: 'Hauz Khas Village', lat: 28.5535, lon: 77.1943 },
  { name: 'R K Puram', lat: 28.5638, lon: 77.1867 },
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
  onOpenGoogleServices,
}) => {
  const [originInput, setOriginInput] = useState<string>('Connaught Place');
  const [destinationInput, setDestinationInput] = useState<string>('India Gate');
  const [mode, setMode] = useState<TravelMode>('walking');
  const [pollutant, setPollutant] = useState<string>('pm25');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Body scroll lock management
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResetToRoute = () => {
    setResetTrigger((prev) => prev + 1);
  };

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
      onSelectRouteIndex(
        res.comparison.lowest_exposure_route_index !== null
          ? res.comparison.lowest_exposure_route_index
          : 0
      );
      setLoading(false);
    } catch (err: unknown) {
      let msg = 'Failed to calculate route.';
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: { error?: { message?: string } } } }).response;
        if (resp?.data?.error?.message) {
          msg = resp.data.error.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setLoading(false);
    }
  };

  const selectedRoute = activeRouteResponse?.routes?.[selectedRouteIndex] || null;
  const hasRouteGeometry = Boolean(
    selectedRoute?.geometry?.coordinates && selectedRoute.geometry.coordinates.length > 0
  );

  return (
    <div className="route-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <aside
        className="route-planning-drawer route-planning-drawer-split"
        role="complementary"
        aria-label="Route Planning Panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="route-drawer-header">
          <div className="route-header-brand">
            <div className="route-header-badge">
              <span className="route-dot green" />
              <span>POLLUTION-AWARE ROUTE PLANNER</span>
            </div>
            <h2 className="route-drawer-title">Walking &amp; Cycling Journey Planner</h2>
            <p className="route-drawer-subtitle">
              Interactive route navigation with real-time pollution exposure analysis along the corridor.
            </p>
          </div>
          <button className="route-drawer-close-btn" onClick={onClose} aria-label="Close route planner">
            ✕
          </button>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="route-drawer-split-body">
          {/* Column 1: Controls & Route Results List */}
          <div className="route-drawer-controls-col">
            {/* Origin & Destination Inputs Form */}
            <form className="route-form-container" onSubmit={handleCalculateRoute}>
              <div className="route-inputs-wrapper">
                {/* Origin A */}
                <div className="route-input-group">
                  <div className="input-pin-label pin-origin" aria-hidden="true">A</div>
                  <div className="input-field-col">
                    <label htmlFor="route-origin-input" className="route-field-label">ORIGIN (STARTING POINT):</label>
                    <input
                      id="route-origin-input"
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
                  <div className="input-pin-label pin-dest" aria-hidden="true">B</div>
                  <div className="input-field-col">
                    <label htmlFor="route-dest-input" className="route-field-label">DESTINATION (ARRIVAL POINT):</label>
                    <input
                      id="route-dest-input"
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
                  {POPULAR_DELHI_HUBS.map((hub) => (
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

              {/* Mode Selector & Pollutant Choice */}
              <div className="route-controls-row">
                {/* Travel Mode Toggle */}
                <div className="mode-toggle-group" role="group" aria-label="Travel Mode">
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
                <div className="pollutant-toggle-group" role="group" aria-label="Pollutant">
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
              <div className="route-loading-state" role="status">
                <div className="route-spinner" />
                <div className="route-loading-text">
                  <strong>Querying Road Network &amp; Corridor Sensors…</strong>
                  <p>Calculating walking & cycling paths and checking air quality at nearby stations.</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="route-error-banner" role="alert">
                <span className="error-icon" aria-hidden="true">⚠️</span>
                <div className="error-text">
                  <strong>Routing Request Notice:</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Initial Prompt State before route search */}
            {!loading && !activeRouteResponse && !error && (
              <div className="route-initial-state-card">
                <span className="initial-state-icon" aria-hidden="true">🗺️</span>
                <h4>Ready to Plan a Low-Pollution Route</h4>
                <p>
                  Enter origin and destination above or select from quick locations. AirPulse analyzes road geometries, travel duration, and corridor air pollution exposure to recommend the cleanest path.
                </p>
              </div>
            )}

            {/* Route Results & Comparison Section */}
            {!loading && activeRouteResponse && (
              <div className="route-results-section">
                {/* Comparison Verdict Banner */}
                <div className="route-verdict-box">
                  <div className="verdict-header-row">
                    <span className="verdict-icon" aria-hidden="true">⚖️</span>
                    <span className="verdict-title">ROUTE COMPARISON &amp; CORRIDOR ANALYSIS</span>
                  </div>
                  <p className="verdict-note">{activeRouteResponse.comparison.note}</p>
                </div>

                {/* Structured Route Cards */}
                <div className="routes-list" role="list">
                  {activeRouteResponse.routes.map((route, idx) => {
                    const isSelected = selectedRouteIndex === idx;
                    const isRecommended = route.is_lower_exposure;
                    return (
                      <div
                        key={route.route_index}
                        className={`route-summary-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelectRouteIndex(idx)}
                        role="listitem"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectRouteIndex(idx);
                          }
                        }}
                      >
                        <div className="route-card-header">
                          <div className="route-name-wrap">
                            <span className="route-idx-circle">{idx + 1}</span>
                            <div className="route-title-col">
                              <strong className="route-card-name">Route {idx + 1}: {route.name}</strong>
                              <span className="route-mode-subtext">{route.mode_label}</span>
                            </div>
                          </div>
                          <div className="route-badge-row">
                            {isRecommended && (
                              <span className="route-recommended-badge">
                                ★ Recommended
                              </span>
                            )}
                            <span className={`route-tag-pill ${route.is_lower_exposure ? 'tag-green' : route.is_fastest ? 'tag-cyan' : 'tag-slate'}`}>
                              {route.tag}
                            </span>
                          </div>
                        </div>

                        {/* Core Metrics Grid */}
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
                            <span className="metric-label">TRAVEL MODE</span>
                            <span className="metric-val">{route.mode === 'walking' ? '🚶 Walking' : '🚴 Cycling'}</span>
                          </div>
                        </div>

                        {/* Pollution Exposure Box */}
                        <div className="route-exposure-box">
                          <div className="exposure-top-row">
                            <span className="exposure-label">
                              CORRIDOR ESTIMATED {activeRouteResponse.target_pollutant.toUpperCase()} EXPOSURE:
                            </span>
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
                              Estimated corridor exposure from nearest operational ground sensors (not a direct point measurement).
                            </span>
                          </div>
                        </div>

                        {/* Select / Show on Map Action */}
                        <div className="card-select-action-row">
                          <button
                            type="button"
                            className={`btn-select-route ${isSelected ? 'btn-active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRouteIndex(idx);
                            }}
                          >
                            {isSelected ? '✓ Currently Displayed on Map' : 'Select / Show on Map'}
                          </button>
                          {onOpenGoogleServices && (
                            <button
                              type="button"
                              className="btn-google-route-handoff"
                              style={{
                                marginTop: '6px',
                                padding: '6px 10px',
                                background: 'rgba(66, 133, 244, 0.12)',
                                border: '1px solid rgba(66, 133, 244, 0.35)',
                                borderRadius: '6px',
                                color: '#8ab4f8',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                width: '100%',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const originStr = activeRouteResponse.origin.name ||
                                  (activeRouteResponse.origin.latitude && activeRouteResponse.origin.longitude
                                    ? `${activeRouteResponse.origin.latitude},${activeRouteResponse.origin.longitude}`
                                    : '');
                                const destStr = activeRouteResponse.destination.name ||
                                  (activeRouteResponse.destination.latitude && activeRouteResponse.destination.longitude
                                    ? `${activeRouteResponse.destination.latitude},${activeRouteResponse.destination.longitude}`
                                    : '');
                                onOpenGoogleServices({
                                  origin: originStr,
                                  destination: destStr,
                                  travelMode: route.mode,
                                  destinationName: activeRouteResponse.destination.name,
                                  pollutant: activeRouteResponse.target_pollutant,
                                  value: route.pollution_analysis.corridor_avg_concentration,
                                  severityCategory: route.pollution_analysis.severity?.category,
                                });
                              }}
                              title="Draft in Google Calendar or Google Tasks"
                            >
                              <span>📅 Google Calendar &amp; Tasks Handoff</span>
                              <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>↗</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Health Notice on Active Travel */}
                <div className="route-health-guidance-box">
                  <div className="guidance-header-row">
                    <span className="guidance-icon" aria-hidden="true">🫁</span>
                    <span className="guidance-title">TRAVEL HEALTH ADVISORY</span>
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

          {/* Column 2: Interactive Leaflet Map within Route Planner */}
          <div className="route-drawer-map-col">
            <div className="route-map-panel-header">
              <div className="route-map-panel-title-wrap">
                <span className="map-panel-dot live-dot" aria-hidden="true" />
                <span className="map-panel-title">Interactive Corridor Map</span>
              </div>
              <div className="route-map-panel-actions">
                <button
                  type="button"
                  className="btn-map-reset-bounds"
                  onClick={handleResetToRoute}
                  title="Fit Map to Route Bounds"
                >
                  ⛶ Fit to Route
                </button>
              </div>
            </div>

            {/* Leaflet Map Container */}
            <div className="route-planner-map-wrapper">
              <RoutePlannerMap
                activeRouteResponse={activeRouteResponse}
                selectedRouteIndex={selectedRouteIndex}
                onSelectRouteIndex={onSelectRouteIndex}
                resetTrigger={resetTrigger}
              />

              {/* Geometry notice if missing */}
              {activeRouteResponse && !hasRouteGeometry && (
                <div className="route-geometry-notice-overlay">
                  <span>ℹ️ Road geometry polyline unavailable for this routing provider corridor. Origin (A) and Destination (B) are plotted directly.</span>
                </div>
              )}

              {/* Map Legend Footer */}
              <div className="route-map-legend-bar">
                <div className="map-legend-item">
                  <span className="legend-pin-dot pin-a" />
                  <span>Start (A)</span>
                </div>
                <div className="map-legend-item">
                  <span className="legend-pin-dot pin-b" />
                  <span>End (B)</span>
                </div>
                <div className="map-legend-item">
                  <span className="legend-line-sample solid" />
                  <span>Selected Route</span>
                </div>
                <div className="map-legend-item">
                  <span className="legend-line-sample dashed" />
                  <span>Alternative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
