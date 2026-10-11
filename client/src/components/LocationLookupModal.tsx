import React, { useState, useEffect } from 'react';
import { locationApi } from '../api/location';
import type {
  LocationLookupResponse,
  GoogleStatusResponse,
} from '../types/location';
import { SeverityMeter } from './SeverityMeter';
import { formatValue } from '../utils/aqiUtils';
import type { ContextualMeasurement } from '../types/pollutant';

interface LocationLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation?: (stationId: number) => void;
  initialQuery?: string;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement | null) => void;
  onOpenRecommendations?: (params: Record<string, unknown>) => void;
}

const PRESET_LOCATIONS = [
  { label: 'Connaught Place, Delhi', query: 'Connaught Place, New Delhi' },
  { label: 'R K Puram, Delhi', query: 'R K Puram, Delhi' },
  { label: 'Whitefield, Bengaluru', query: 'Whitefield, Bengaluru' },
  { label: 'Bandra West, Mumbai', query: 'Bandra, Mumbai' },
  { label: 'Vikas Sadan, Gurugram', query: 'Gurugram' },
  { label: 'Shimla Ridge', query: 'Shimla' },
  { label: 'Taj Mahal, Agra', query: 'Agra' },
  { label: 'Manali, Chennai', query: 'Chennai' },
];

export const LocationLookupModal: React.FC<LocationLookupModalProps> = ({
  isOpen,
  onClose,
  onSelectStation,
  initialQuery = '',
  onOpenPollutantInfo,
  onOpenRecommendations,
}) => {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LocationLookupResponse | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatusResponse | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [freshnessHours, setFreshnessHours] = useState<number>(48);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      locationApi
        .getGoogleStatus()
        .then(setGoogleStatus)
        .catch(() => {});
    }
  }, [isOpen]);

  const handleLookup = async (queryToSearch?: string) => {
    const q = (queryToSearch || searchInput).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const data = await locationApi.lookup({
        query: q,
        radius: radiusKm * 1000,
        freshness_hours: freshnessHours,
      });
      setResult(data);
    } catch (err: unknown) {
      let msg = 'Failed to resolve location.';
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { data?: { error?: { message?: string } } } }).response;
        if (resp?.data?.error?.message) msg = resp.data.error.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  if (!isOpen) return null;

  const primary = result?.primary_reading;
  const isGoogle = primary?.provider_code === 'google';
  const isOpenAQ = primary?.provider_code === 'openaq';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container location-lookup-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-badge-row">
              <span className="modal-badge-pill geo-pill">LOCATION RESOLUTION</span>
              <span className={`modal-badge-pill ${googleStatus?.configured ? 'status-green' : 'status-amber'}`}>
                {googleStatus?.configured ? 'GOOGLE SERVICES: ACTIVE' : 'GROUND NETWORK: ACTIVE'}
              </span>
            </div>
            <h2 className="modal-title">Location Resolution &amp; Air Quality Intelligence</h2>
            <p className="modal-description">
              Resolve any Indian location, find nearby monitoring stations and observational freshness, and inspect ambient air quality.
            </p>
          </div>
          <button className="btn-close-modal" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Google Setup Guide Accordion Banner */}
        <div className="google-config-banner">
          <div className="config-banner-left">
            <span className="config-icon">{googleStatus?.configured ? '✓' : 'ℹ'}</span>
            <span className="config-text">
              {googleStatus?.configured
                ? 'Google Maps Geocoding & Air Quality APIs are active for live spatial queries.'
                : 'Google API key is not configured. Local geographic registry & OpenAQ ground stations are active.'}
            </span>
          </div>
          <button
            className="btn-toggle-config"
            onClick={() => setShowConfigGuide(!showConfigGuide)}
          >
            {showConfigGuide ? 'Hide Setup Info ▲' : 'Setup Details ▼'}
          </button>
        </div>

        {showConfigGuide && (
          <div className="google-setup-accordion">
            <div className="accordion-section">
              <strong>Environment Configuration:</strong>
              <code>server/.env: GOOGLE_MAPS_API_KEY=&lt;your_google_cloud_api_key&gt;</code>
            </div>
            <div className="accordion-section">
              <strong>Required Google Cloud APIs:</strong>
              <ul>
                <li><strong>Geocoding API:</strong> Resolves text place names and street addresses into WGS84 latitude/longitude coordinates.</li>
                <li><strong>Air Quality API:</strong> Provides gridded hourly air quality and pollutant concentrations based on Google satellite and multi-source mathematical models.</li>
              </ul>
            </div>
            <div className="accordion-section">
              <strong>Billing Requirement:</strong> Google Cloud Platform requires an enabled billing account for Geocoding and Air Quality APIs. AIRPULSE implements a 15-minute in-memory cache to prevent redundant billing.
            </div>
          </div>
        )}

        {/* Search Controls & Presets */}
        <div className="location-search-bar-wrap">
          <div className="search-bar-inputs">
            <div className="main-search-input-wrap">
              <input
                type="text"
                className="geo-search-input"
                placeholder="Enter city, locality or address (e.g., Connaught Place, Delhi, Whitefield, Shimla)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="btn-geo-search"
                onClick={() => handleLookup()}
                disabled={loading || !searchInput.trim()}
              >
                {loading ? 'Resolving…' : 'Locate & Analyze'}
              </button>
            </div>

            {/* Threshold controls */}
            <div className="threshold-controls-row">
              <label className="threshold-label">
                Proximity Radius:
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="threshold-select"
                >
                  <option value={10}>10 km</option>
                  <option value={25}>25 km (Standard)</option>
                  <option value={50}>50 km (Regional)</option>
                </select>
              </label>

              <label className="threshold-label">
                Freshness Threshold:
                <select
                  value={freshnessHours}
                  onChange={(e) => setFreshnessHours(Number(e.target.value))}
                  className="threshold-select"
                >
                  <option value={24}>≤ 24 hours</option>
                  <option value={48}>≤ 48 hours (Standard)</option>
                  <option value={168}>≤ 7 days</option>
                </select>
              </label>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="location-presets-row">
            <span className="preset-title">Quick Test Presets:</span>
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.label}
                className="preset-chip"
                onClick={() => {
                  setSearchInput(preset.query);
                  handleLookup(preset.query);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="location-error-banner">
            <span className="error-icon">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Live Stepper & Flow Visualization */}
        {result && (
          <div className="lookup-stepper-row">
            <div className={`step-item ${result.location.found ? 'step-completed' : 'step-failed'}`}>
              <span className="step-num">1</span>
              <div className="step-text">
                <span className="step-name">Geocoding</span>
                <span className="step-detail">
                  {result.location.resolution_source === 'google_geocoding'
                    ? 'Google Geocoding API'
                    : 'Local Registry Fallback'}
                </span>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className={`step-item ${result.openaq_status.nearby_stations_count > 0 ? 'step-completed' : 'step-warning'}`}>
              <span className="step-num">2</span>
              <div className="step-text">
                <span className="step-name">Proximity Search</span>
                <span className="step-detail">
                  {result.openaq_status.nearby_stations_count} station(s) within {result.criteria.proximity_radius_km}km
                </span>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className={`step-item ${result.openaq_status.suitable ? 'step-completed' : 'step-warning'}`}>
              <span className="step-num">3</span>
              <div className="step-text">
                <span className="step-name">Freshness Audit</span>
                <span className="step-detail">
                  {result.openaq_status.suitable
                    ? `Fresh (≤${result.criteria.freshness_hours}h)`
                    : 'No fresh readings'}
                </span>
              </div>
            </div>

            <div className="step-arrow">→</div>

            <div className={`step-item ${isOpenAQ ? 'step-openaq' : isGoogle ? 'step-google' : 'step-failed'}`}>
              <span className="step-num">4</span>
              <div className="step-text">
                <span className="step-name">Source Selected</span>
                <span className="step-detail">
                  {isOpenAQ ? 'OpenAQ Ground' : isGoogle ? 'Google Model' : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results Body */}
        {result && (
          <div className="lookup-results-body">
            {/* Location Banner */}
            <div className="resolved-location-banner">
              <div className="resolved-location-info">
                <span className="location-pin">📍</span>
                <div>
                  <h3 className="resolved-name">{result.location.canonical_name}</h3>
                  <div className="resolved-coords">
                    {result.location.latitude.toFixed(4)}°N, {result.location.longitude.toFixed(4)}°E · Source: {result.location.resolution_source}
                  </div>
                </div>
              </div>
              <div className="resolution-badge-wrap">
                <span className={`provider-attribution-badge ${isOpenAQ ? 'openaq' : isGoogle ? 'google' : 'unavailable'}`}>
                  {isOpenAQ ? 'PRIMARY: OPENAQ GROUND STATION' : isGoogle ? 'PRIMARY: GOOGLE AIR QUALITY (MODELLED)' : 'NO USABLE DATA'}
                </span>
              </div>
            </div>

            {/* Scenario A: Primary Reading Available */}
            {primary ? (
              <div className="primary-reading-card">
                {/* Attribution and Data Type Banner */}
                <div className={`primary-reading-header ${isOpenAQ ? 'openaq-header' : 'google-header'}`}>
                  <div className="header-type-label">
                    <span className={`status-indicator-dot ${isOpenAQ ? 'cyan' : 'amber'}`} />
                    <span className="header-label-text">
                      {isOpenAQ ? 'GROUND MEASURED OBSERVATION' : 'GOOGLE MODELLED / SPATIAL INTERPOLATION'}
                    </span>
                  </div>
                  <div className="header-source-detail">
                    Provider: <strong>{primary.provider}</strong> · Ingested: {primary.freshness_text}
                  </div>
                </div>

                {/* Severity Meter Integration */}
                <div className="primary-severity-meter-wrap">
                  <SeverityMeter
                    metric="pm25"
                    value={primary.pm25}
                    dataType={primary.data_type}
                    source={primary.provider}
                    recordedAt={primary.timestamp || undefined}
                    onOpenPollutantInfo={onOpenPollutantInfo}
                  />
                </div>

                {/* Pollutant Metrics Grid */}
                <div className="pollutant-grid modal-pollutant-grid">
                  {[
                    { id: 'pm25', label: 'PM2.5', val: primary.pm25, unit: 'µg/m³' },
                    { id: 'pm10', label: 'PM10', val: primary.pm10, unit: 'µg/m³' },
                    { id: 'no2', label: 'NO₂', val: primary.no2, unit: 'µg/m³' },
                    { id: 'so2', label: 'SO₂', val: primary.so2, unit: 'µg/m³' },
                    { id: 'co', label: 'CO', val: primary.co, unit: 'mg/m³' },
                    { id: 'o3', label: 'O₃', val: primary.o3, unit: 'µg/m³' },
                    { id: 'aqi', label: 'AQI / Index', val: primary.aqi, unit: primary.aqi_name || 'NAQI' },
                  ].map(({ id, label, val, unit }) => (
                    <div
                      key={label}
                      className={`pollutant-cell ${id !== 'aqi' && onOpenPollutantInfo ? 'clickable-pollutant-cell' : ''}`}
                      onClick={() => {
                        if (id !== 'aqi' && onOpenPollutantInfo) {
                          onOpenPollutantInfo(id, {
                            metric: id,
                            pollutantName: label,
                            value: val,
                            unit,
                            stationName: primary.station_info ? `${primary.station_info.name} (${result.location.canonical_name})` : result.location.canonical_name,
                            dateOrTimestamp: primary.timestamp || undefined,
                            source: primary.provider,
                            dataType: primary.data_type,
                          });
                        }
                      }}
                      title={id !== 'aqi' ? `Click to inspect ${label} scientific definitions & guidelines` : undefined}
                    >
                      <span className="pollutant-cell-label">{label} {id !== 'aqi' ? 'ⓘ' : ''}</span>
                      <span className="pollutant-cell-value">
                        {val !== null && val !== undefined ? formatValue(val, unit) : '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* OpenAQ Station Info or Google Model Details */}
                {isOpenAQ && primary.station_info && (
                  <div className="provider-context-box openaq-box">
                    <div className="context-box-title">Selected OpenAQ Physical Station:</div>
                    <div className="context-box-content">
                      <strong>{primary.station_info.name}</strong> ({primary.station_info.city}, {primary.station_info.state}) · Code: <code>{primary.station_info.station_code}</code> · Proximity: <strong>{primary.station_info.distance_km} km</strong> away.
                    </div>
                  </div>
                )}

                {isGoogle && (
                  <div className="provider-context-box google-box">
                    <div className="context-box-title">Modelled Context Notice:</div>
                    <div className="context-box-content">
                      This reading is generated by Google's multi-source mathematical atmospheric model for the coordinate ({result.location.latitude.toFixed(4)}°N, {result.location.longitude.toFixed(4)}°E). It is not a direct ground sensor installation.
                    </div>
                  </div>
                )}

                {onOpenRecommendations && (
                  <div className="location-rec-action-bar">
                    <button
                      className="btn-location-rec-action"
                      onClick={() => {
                        onOpenRecommendations({
                          pollutant: 'pm25',
                          value: primary.pm25,
                          mode: 'live',
                          dataType: primary.data_type,
                          station: primary.station_info
                            ? {
                                id: primary.station_info.id,
                                name: primary.station_info.name,
                                city: primary.station_info.city,
                                state: primary.station_info.state,
                              }
                            : null,
                        });
                      }}
                      title="View verified precaution recommendations based on this location's severity"
                    >
                      🛡 View Recommended Precautions for this Location →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Scenario B: Unavailable State */
              <div className="location-unavailable-card">
                <div className="unavailable-icon">⚠</div>
                <div className="unavailable-content">
                  <h4>Air Quality Readings Unavailable for this Coordinate</h4>
                  <p className="unavailable-reason">
                    <strong>OpenAQ Status:</strong> {result.openaq_status.reason}
                  </p>
                  <p className="unavailable-google-status">
                    <strong>Google Air Quality Status:</strong> {result.google_status.message || 'Unavailable.'}
                  </p>
                  {!googleStatus?.configured && (
                    <div className="setup-callout">
                      To enable modelled air quality coverage for areas without active OpenAQ ground stations, configure <code>GOOGLE_MAPS_API_KEY</code> in <code>server/.env</code>.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nearby OpenAQ Reference Stations Context (PostGIS) */}
            <div className="nearby-reference-section">
              <h4 className="nearby-reference-title">
                Nearby Reference Stations ({result.nearby_openaq_reference.length} found)
              </h4>
              <p className="nearby-reference-subtitle">
                Expanded Indian OpenAQ network stations sorted by proximity to the resolved coordinate:
              </p>

              {result.nearby_openaq_reference.length > 0 ? (
                <div className="nearby-reference-table-wrap">
                  <table className="nearby-table">
                    <thead>
                      <tr>
                        <th>Station Name</th>
                        <th>City / Region</th>
                        <th>Distance</th>
                        <th>Last Reading</th>
                        <th>Monitored Sensors</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.nearby_openaq_reference.map((st) => (
                        <tr key={st.station_id} className={st.distance_km <= result.criteria.proximity_radius_km ? 'row-in-radius' : ''}>
                          <td>
                            <strong>{st.name}</strong>
                            <div className="table-code">{st.station_code}</div>
                          </td>
                          <td>{st.city}, {st.state}</td>
                          <td>
                            <span className="dist-chip">{st.distance_km} km</span>
                          </td>
                          <td>
                            {st.last_observed_at ? (
                              <span className="time-badge">{new Date(st.last_observed_at).toLocaleDateString('en-IN')}</span>
                            ) : st.last_updated_at ? (
                              <span className="time-badge muted">{new Date(st.last_updated_at).toLocaleDateString('en-IN')}</span>
                            ) : (
                              <span className="time-badge muted">No readings</span>
                            )}
                          </td>
                          <td>
                            <div className="sensors-tag-row">
                              {st.sensors.slice(0, 4).map((s) => (
                                <span key={s} className="sensor-tag">{s.toUpperCase()}</span>
                              ))}
                              {st.sensors.length > 4 && <span className="sensor-tag more">+{st.sensors.length - 4}</span>}
                            </div>
                          </td>
                          <td>
                            {st.is_dashboard_station && onSelectStation ? (
                              <button
                                className="btn-select-st"
                                onClick={() => {
                                  onSelectStation(st.station_id);
                                  onClose();
                                }}
                              >
                                View Station →
                              </button>
                            ) : (
                              <span className="tag-expanded">Expanded Network</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-nearby-stations">
                  No OpenAQ monitoring stations found within {result.criteria.proximity_radius_km} km of this location.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
