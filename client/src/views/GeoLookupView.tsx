import React, { useState, useEffect } from 'react';
import { locationApi } from '../api/location';
import type { LocationLookupResponse, GoogleStatusResponse } from '../types/location';
import { SeverityMeter } from '../components/SeverityMeter';
import { formatValue, formatRelativeTime } from '../utils/aqiUtils';
import type { ContextualMeasurement } from '../types/pollutant';

interface GeoLookupViewProps {
  onSelectStation?: (stationId: number) => void;
  onNavigateToLive?: () => void;
  onOpenPollutantInfo?: (pollutantId: string, context?: ContextualMeasurement | null) => void;
}

export const GeoLookupView: React.FC<GeoLookupViewProps> = ({
  onSelectStation,
  onNavigateToLive,
  onOpenPollutantInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'coords' | 'address'>('coords');
  
  // Coordinate inputs
  const [latInput, setLatInput] = useState<string>('28.6139');
  const [lonInput, setLonInput] = useState<string>('77.2090');
  
  // Address input
  const [addressInput, setAddressInput] = useState<string>('');

  // Proximity options
  const [radiusKm, setRadiusKm] = useState<number>(30);
  const [freshnessHours, setFreshnessHours] = useState<number>(48);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<LocationLookupResponse | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatusResponse | null>(null);

  // Quick preset locations in India
  const presets = [
    { label: 'New Delhi (CP)', lat: '28.6315', lon: '77.2167' },
    { label: 'Mumbai (Bandra)', lat: '19.0596', lon: '72.8295' },
    { label: 'Bengaluru (Tech)', lat: '12.9716', lon: '77.5946' },
    { label: 'Kolkata (Victoria)', lat: '22.5448', lon: '88.3426' },
    { label: 'Chennai (Marina)', lat: '13.0500', lon: '80.2824' },
    { label: 'Hyderabad (Charminar)', lat: '17.3616', lon: '78.4747' },
  ];

  useEffect(() => {
    locationApi
      .getGoogleStatus()
      .then(setGoogleStatus)
      .catch(() => {});
  }, []);

  const validateCoordinates = (latStr: string, lonStr: string): { lat: number; lon: number } | null => {
    const lat = parseFloat(latStr.trim());
    const lon = parseFloat(lonStr.trim());

    if (isNaN(lat) || !isFinite(lat)) {
      setValidationError('Latitude must be a valid decimal number.');
      return null;
    }
    if (lat < -90 || lat > 90) {
      setValidationError('Latitude must be between -90.0° and +90.0°.');
      return null;
    }

    if (isNaN(lon) || !isFinite(lon)) {
      setValidationError('Longitude must be a valid decimal number.');
      return null;
    }
    if (lon < -180 || lon > 180) {
      setValidationError('Longitude must be between -180.0° and +180.0°.');
      return null;
    }

    setValidationError(null);
    return { lat, lon };
  };

  const handleLookup = async () => {
    setError(null);
    setValidationError(null);

    let params: {
      latitude?: number;
      longitude?: number;
      query?: string;
      radius: number;
      freshness_hours: number;
    };

    if (activeTab === 'coords') {
      const valid = validateCoordinates(latInput, lonInput);
      if (!valid) return;
      params = {
        latitude: valid.lat,
        longitude: valid.lon,
        radius: Math.round(radiusKm * 1000),
        freshness_hours: freshnessHours,
      };
    } else {
      const q = addressInput.trim();
      if (!q) {
        setValidationError('Please enter a location name, address, or city.');
        return;
      }
      params = {
        query: q,
        radius: Math.round(radiusKm * 1000),
        freshness_hours: freshnessHours,
      };
    }

    setLoading(true);
    try {
      const data = await locationApi.lookup(params);
      setResult(data);
    } catch (err: unknown) {
      let msg = 'Spatial lookup failed.';
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

  const primary = result?.primary_reading;
  const isOpenAQ = primary?.provider_code === 'openaq';

  return (
    <div className="nature-page-container geolookup-page">
      {/* Header Banner */}
      <div className="view-header-banner">
        <div className="header-meta-row">
          <span className="nature-tag green">POSTGIS SPATIAL RESOLUTION</span>
          <span className={`nature-tag ${googleStatus?.configured ? 'cyan' : 'amber'}`}>
            GOOGLE FALLBACK: {googleStatus?.configured ? 'ONLINE' : 'UNCONFIGURED (SAFE FALLBACK)'}
          </span>
        </div>
        <h1 className="page-heading">Geographic Coordinates &amp; Proximity Lookup</h1>
        <p className="page-subheading">
          Query any exact latitude and longitude or Indian address to locate the closest official OpenAQ/CPCB
          monitoring station via PostGIS ST_Distance, or inspect modeled ambient fallback.
        </p>
      </div>

      {/* Two Column Layout: Controls Card & Results Card */}
      <div className="geolookup-layout">
        {/* Left Column: Input Form */}
        <div className="lookup-controls-card">
          {/* Method Tab Buttons */}
          <div className="tab-pill-switcher">
            <button
              className={`tab-pill-btn ${activeTab === 'coords' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('coords');
                setValidationError(null);
              }}
            >
              📍 By Coordinates (Lat / Lon)
            </button>
            <button
              className={`tab-pill-btn ${activeTab === 'address' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('address');
                setValidationError(null);
              }}
            >
              🔍 By Address / Landmark
            </button>
          </div>

          {/* Preset Buttons for Quick Exploration */}
          <div className="preset-chips-wrap">
            <span className="preset-chips-title">Indian Presets:</span>
            <div className="preset-chips-row">
              {presets.map((p) => (
                <button
                  key={p.label}
                  className="preset-chip"
                  onClick={() => {
                    setActiveTab('coords');
                    setLatInput(p.lat);
                    setLonInput(p.lon);
                    setValidationError(null);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Input Fields */}
          {activeTab === 'coords' ? (
            <div className="coords-inputs-grid">
              <div className="nature-form-group">
                <label htmlFor="geo-latitude-input" className="nature-form-label">
                  Latitude (-90.0° to +90.0°)
                </label>
                <input
                  id="geo-latitude-input"
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="nature-form-input"
                  placeholder="e.g. 28.6139"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                />
              </div>

              <div className="nature-form-group">
                <label htmlFor="geo-longitude-input" className="nature-form-label">
                  Longitude (-180.0° to +180.0°)
                </label>
                <input
                  id="geo-longitude-input"
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="nature-form-input"
                  placeholder="e.g. 77.2090"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="nature-form-group">
              <label htmlFor="geo-address-input" className="nature-form-label">
                Indian City, Locality, or Landmark
              </label>
              <input
                id="geo-address-input"
                type="text"
                className="nature-form-input"
                placeholder="e.g. Connaught Place, New Delhi or Whitefield, Bengaluru"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookup();
                }}
              />
            </div>
          )}

          {/* Spatial Constraints Controls */}
          <div className="sliders-row">
            <div className="nature-form-group slider-group">
              <div className="slider-label-row">
                <label htmlFor="geo-radius-slider" className="nature-form-label">Max Proximity Radius</label>
                <span className="slider-value-display">{radiusKm} km</span>
              </div>
              <input
                id="geo-radius-slider"
                type="range"
                min="5"
                max="100"
                step="5"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
                className="nature-range-input"
              />
            </div>

            <div className="nature-form-group slider-group">
              <div className="slider-label-row">
                <label htmlFor="geo-freshness-slider" className="nature-form-label">Telemetry Freshness Window</label>
                <span className="slider-value-display">{freshnessHours} hrs</span>
              </div>
              <input
                id="geo-freshness-slider"
                type="range"
                min="6"
                max="168"
                step="6"
                value={freshnessHours}
                onChange={(e) => setFreshnessHours(parseInt(e.target.value, 10))}
                className="nature-range-input"
              />
            </div>
          </div>

          {/* Validation Notice */}
          {validationError && (
            <div className="nature-form-error" role="alert">
              <span>⚠️ {validationError}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            className="nature-btn nature-btn-primary lookup-submit-btn"
            onClick={handleLookup}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner" />
                <span>Querying PostGIS Spatial Index…</span>
              </>
            ) : (
              <>
                <span>Perform Proximity Lookup</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Results Display */}
        <div className="lookup-results-col">
          {error && (
            <div className="nature-alert error" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="lookup-result-card">
              {/* Resolved Geocoding Header */}
              <div className="result-card-header">
                <div className="resolved-location-meta">
                  <span className="nature-tag green">RESOLVED LOCATION</span>
                  <h3 className="resolved-display-name">
                    {result.location.canonical_name}
                  </h3>
                  <div className="resolved-coords">
                    {result.location.latitude.toFixed(4)}°N, {result.location.longitude.toFixed(4)}°E
                    {result.location.city && ` · ${result.location.city}`}
                    {result.location.state && `, ${result.location.state}`}
                  </div>
                </div>

                {isOpenAQ && primary?.station_info && (
                  <button
                    className="nature-btn nature-btn-sm nature-btn-secondary"
                    onClick={() => {
                      if (onSelectStation && primary.station_info) onSelectStation(primary.station_info.id);
                      if (onNavigateToLive) onNavigateToLive();
                    }}
                  >
                    View on Map ↗
                  </button>
                )}
              </div>

              {/* Primary Reading / Nearest Station */}
              {primary ? (
                <div className="result-reading-body">
                  <div className="reading-source-banner">
                    <span className={`source-dot ${isOpenAQ ? 'green' : 'amber'}`} />
                    <span className="source-title">
                      {isOpenAQ
                        ? `Nearest Ground Station: ${primary.station_info?.name || 'OpenAQ'}`
                        : `Modeled Fallback (${primary.provider})`}
                    </span>
                    {primary.station_info?.distance_km != null && (
                      <span className="distance-chip">
                        {primary.station_info.distance_km.toFixed(1)} km away
                      </span>
                    )}
                  </div>

                  {/* Air Quality Meter */}
                  <div className="result-meter-container">
                    <SeverityMeter
                      metric="pm25"
                      value={primary.pm25}
                      dataType={primary.provider_code === 'google' ? 'modelled' : 'observed'}
                      source={primary.provider}
                      recordedAt={primary.timestamp || undefined}
                      onOpenPollutantInfo={onOpenPollutantInfo}
                    />
                  </div>

                  {/* Metrics Grid */}
                  <div className="result-pollutants-grid">
                    <div className="pollutant-stat-box">
                      <span className="p-label">PM2.5</span>
                      <span className="p-val">{formatValue(primary.pm25, 'µg/m³')}</span>
                    </div>
                    <div className="pollutant-stat-box">
                      <span className="p-label">PM10</span>
                      <span className="p-val">{formatValue(primary.pm10, 'µg/m³')}</span>
                    </div>
                    <div className="pollutant-stat-box">
                      <span className="p-label">NO₂</span>
                      <span className="p-val">{formatValue(primary.no2, 'µg/m³')}</span>
                    </div>
                    <div className="pollutant-stat-box">
                      <span className="p-label">SO₂</span>
                      <span className="p-val">{formatValue(primary.so2, 'µg/m³')}</span>
                    </div>
                    <div className="pollutant-stat-box">
                      <span className="p-label">O₃</span>
                      <span className="p-val">{formatValue(primary.o3, 'µg/m³')}</span>
                    </div>
                    <div className="pollutant-stat-box">
                      <span className="p-label">CO</span>
                      <span className="p-val">{formatValue(primary.co, 'mg/m³')}</span>
                    </div>
                  </div>

                  <div className="result-footer-meta">
                    <span>Recorded: {formatRelativeTime(primary.timestamp)}</span>
                    <span>·</span>
                    <span>Proximity: {primary.station_info?.distance_km != null ? `${primary.station_info.distance_km.toFixed(2)} km` : 'Direct coordinates'}</span>
                  </div>
                </div>
              ) : (
                <div className="no-station-within-radius">
                  <div className="empty-warning-icon">📍</div>
                  <h4>No ground station with fresh readings within {radiusKm} km</h4>
                  <p>
                    There are no monitoring stations within {radiusKm} km that have fresh observations
                    within the last {freshnessHours} hours.
                  </p>
                  <span className="honest-policy-sub">
                    AirPulse strictly adheres to an honest data policy: stations are never fabricated near arbitrary coordinates.
                  </span>
                </div>
              )}

              {/* Nearby Stations Detected in PostGIS Index */}
              {result.nearby_openaq_reference && result.nearby_openaq_reference.length > 0 && (
                <div className="nearby-stations-section">
                  <div className="nearby-section-header">
                    <span className="nearby-badge">POSTGIS PROXIMITY</span>
                    <h4 className="nearby-title">
                      Nearby Stations Indexed ({result.nearby_openaq_reference.length} stations within {radiusKm} km)
                    </h4>
                  </div>
                  <div className="nearby-stations-table-wrap">
                    <table className="nature-table nearby-stations-table">
                      <thead>
                        <tr>
                          <th>Station</th>
                          <th>Distance</th>
                          <th>Latest Telemetry</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.nearby_openaq_reference.map((st) => (
                          <tr key={st.station_id}>
                            <td>
                              <strong>{st.name}</strong>
                              <div className="text-muted text-xs">{st.city}, {st.state}</div>
                            </td>
                            <td>
                              <span className="distance-chip">{st.distance_km.toFixed(1)} km</span>
                            </td>
                            <td>
                              {st.last_pm25 != null ? (
                                <span className="param-chip">PM2.5: {st.last_pm25} µg/m³</span>
                              ) : (
                                <span className="text-muted text-xs">Offline</span>
                              )}
                            </td>
                            <td>
                              <button
                                className="nature-btn nature-btn-xs nature-btn-primary"
                                onClick={() => {
                                  if (onSelectStation) onSelectStation(st.station_id);
                                  if (onNavigateToLive) onNavigateToLive();
                                }}
                              >
                                Live Map ↗
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="lookup-empty-placeholder">
              <span className="placeholder-icon">🧭</span>
              <h3>Spatial Intelligence Ready</h3>
              <p>
                Enter coordinates or an Indian city address on the left and click "Perform Proximity Lookup"
                to calculate spatial distance and telemetry freshness.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
