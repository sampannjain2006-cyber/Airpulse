import React, { useState, useEffect, useMemo } from 'react';
import type { Station } from '../types/station';
import type {
  StoreProduct,
  StoreRecommendationsResponse,
} from '../types/store';
import { storeApi } from '../api/store';
import { formatValue } from '../utils/aqiUtils';

interface ProtectionStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  initialStation?: Station | null;
  initialPollutant?: string;
  initialValue?: number | null;
  initialSeverityTier?: number | null;
  mode: 'live' | 'historical' | 'forecast';
  selectedDate: string;
  selectedModel: string;
  dataType?: 'observed' | 'predicted' | 'modelled';
}

const SUPPORTED_POLLUTANTS = [
  { id: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
  { id: 'pm10', label: 'PM10', unit: 'µg/m³' },
  { id: 'no2',  label: 'NO₂',   unit: 'µg/m³' },
  { id: 'so2',  label: 'SO₂',   unit: 'µg/m³' },
  { id: 'co',   label: 'CO',    unit: 'mg/m³' },
  { id: 'o3',   label: 'O₃',    unit: 'µg/m³' },
];

const VALID_HORIZON_DATES = [
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
];

export const ProtectionStoreModal: React.FC<ProtectionStoreModalProps> = ({
  isOpen,
  onClose,
  stations,
  initialStation,
  initialPollutant = 'pm25',
  initialValue,
  initialSeverityTier,
  mode,
  selectedDate,
  selectedModel,
  dataType = 'observed',
}) => {
  const [selectedStationId, setSelectedStationId] = useState<number | null>(
    initialStation ? initialStation.id : (stations.length > 0 ? stations[0].id : null)
  );
  const [selectedPollutant, setSelectedPollutant] = useState<string>(initialPollutant);
  const [overrideValue, setOverrideValue] = useState<number | null>(initialValue !== undefined ? initialValue : null);
  const [overrideTier, setOverrideTier] = useState<number | null>(initialSeverityTier !== undefined ? initialSeverityTier : null);
  
  // Forecast horizon date state with fallback to valid horizon date
  const [targetDate, setTargetDate] = useState<string>(() => {
    if (mode === 'forecast') {
      return VALID_HORIZON_DATES.includes(selectedDate) ? selectedDate : VALID_HORIZON_DATES[0];
    }
    return selectedDate;
  });

  const [data, setData] = useState<StoreRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Synchronize initialStation if it changes
  useEffect(() => {
    if (initialStation) {
      setSelectedStationId(initialStation.id);
    }
    if (initialPollutant) {
      setSelectedPollutant(initialPollutant);
    }
    if (initialValue !== undefined) {
      setOverrideValue(initialValue);
    }
    if (initialSeverityTier !== undefined) {
      setOverrideTier(initialSeverityTier);
    }
  }, [initialStation, initialPollutant, initialValue, initialSeverityTier]);

  // Synchronize targetDate if external selectedDate or mode changes
  useEffect(() => {
    if (mode === 'forecast') {
      if (VALID_HORIZON_DATES.includes(selectedDate)) {
        setTargetDate(selectedDate);
      } else {
        setTargetDate(VALID_HORIZON_DATES[0]);
      }
    } else {
      setTargetDate(selectedDate);
    }
  }, [selectedDate, mode]);

  // Load recommendations
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const station = stations.find((s) => s.id === selectedStationId) || initialStation;

    storeApi
      .getRecommendations({
        station_id: station ? station.id : undefined,
        destination: station ? `${station.name}, ${station.city}` : undefined,
        pollutant: selectedPollutant,
        value: overrideValue !== null ? overrideValue : undefined,
        severity_tier: overrideTier !== null ? overrideTier : undefined,
        mode,
        date: targetDate,
        model: selectedModel,
        data_type: dataType,
      })
      .then((res) => {
        if (!isMounted) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.response?.data?.error?.message || err.message || 'Failed to load protection recommendations.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    selectedStationId,
    selectedPollutant,
    overrideValue,
    overrideTier,
    mode,
    targetDate,
    selectedModel,
    dataType,
    stations,
    initialStation,
  ]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter products by selected category
  const filteredTriggeredProducts = useMemo(() => {
    if (!data) return [];
    if (selectedCategory === 'all') {
      return data.recommendations.pollution_triggered_products;
    }
    return data.recommendations.pollution_triggered_products.filter(
      (p) => p.category === selectedCategory
    );
  }, [data, selectedCategory]);

  const filteredTravelProducts = useMemo(() => {
    if (!data) return [];
    if (selectedCategory === 'all' || selectedCategory === 'travel_preparation') {
      return data.recommendations.general_travel_products;
    }
    return [];
  }, [data, selectedCategory]);

  if (!isOpen) return null;

  const currentStation = stations.find((s) => s.id === selectedStationId) || initialStation;
  const context = data?.pollution_context;

  return (
    <div className="protection-store-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="protection-store-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="store-modal-header">
          <div className="store-header-title-wrap">
            <div className="store-header-badge">
              <span className="store-dot teal" />
              <span>AIRPULSE PROTECTION &amp; ACCESSORIES</span>
            </div>
            <h2 className="store-modal-title">Pollution Protection &amp; Accessories Store</h2>
            <p className="store-modal-subtitle">
              Destination-aware personal protective equipment (PPE), certified particulate respirators, indoor HEPA
              filtration, and genuine verified seller listings matched to live ambient environmental risk.
            </p>
          </div>
          <button className="store-close-btn" onClick={onClose} aria-label="Close store">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="store-modal-body">
          {/* Destination & Environmental Context Card */}
          <div className="destination-context-card">
            <div className="context-left-col">
              <div className="destination-selector-row">
                <label className="context-field-label">DESTINATION STATION:</label>
                <select
                  className="destination-select"
                  value={selectedStationId || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value, 10);
                    setSelectedStationId(id);
                    setOverrideValue(null);
                    setOverrideTier(null);
                  }}
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}, {s.state})
                    </option>
                  ))}
                </select>
              </div>

              <div className="destination-meta-row">
                <span className="destination-loc-text">
                  📍 {currentStation ? `${currentStation.city}, ${currentStation.state}` : 'Selected Destination'}
                </span>
                <span className="provenance-tag">
                  {context?.data_provenance?.label || 'GROUND OBSERVATION'}
                </span>
                <span className="mode-tag">
                  {mode.toUpperCase()} MODE ({targetDate})
                </span>
              </div>

              {mode === 'forecast' && (
                <div className="forecast-date-selector-row">
                  <label className="context-field-label">5-DAY FORECAST TARGET DATE:</label>
                  <div className="horizon-date-buttons">
                    {VALID_HORIZON_DATES.map((d, idx) => (
                      <button
                        key={d}
                        type="button"
                        className={`btn-horizon-date-pill ${targetDate === d ? 'active' : ''}`}
                        onClick={() => setTargetDate(d)}
                        title={`Select forecast target ${d}`}
                      >
                        Day {idx + 1} ({d.slice(5)})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="context-right-col">
              <div className="metric-selector-row">
                <label className="context-field-label">POLLUTANT CONCERN:</label>
                <div className="metric-btn-group">
                  {SUPPORTED_POLLUTANTS.map((p) => (
                    <button
                      key={p.id}
                      className={`btn-metric-pill ${selectedPollutant === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPollutant(p.id);
                        setOverrideValue(null);
                        setOverrideTier(null);
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="severity-badge-row">
                <div
                  className="severity-pill"
                  style={{
                    backgroundColor: context ? `${context.severity_color}22` : '#334155',
                    borderColor: context?.severity_color || '#64748b',
                    color: context?.severity_color || '#94a3b8',
                  }}
                >
                  <span
                    className="severity-indicator-dot"
                    style={{ backgroundColor: context?.severity_color || '#64748b' }}
                  />
                  <strong>{context?.severity_category || 'Evaluating…'}</strong>
                  {context?.value !== null && context?.value !== undefined && (
                    <span className="severity-val-text">
                      ({formatValue(context.value, context.pollutant === 'co' ? 'mg/m³' : 'µg/m³')})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Gaseous Warning Alert */}
          {data?.gas_protection_warning && (
            <div className="gas-protection-alert-box">
              <div className="gas-alert-icon">⚠️</div>
              <div className="gas-alert-content">
                <h4 className="gas-alert-title">IMPORTANT GAS PROTECTION LIMITATION</h4>
                <p className="gas-alert-body">{data.gas_protection_warning}</p>
              </div>
            </div>
          )}

          {/* Non-Purchase Exposure Reduction Advice Banner */}
          {data?.recommendations.exposure_reduction_advice && data.recommendations.exposure_reduction_advice.length > 0 && (
            <div className="exposure-advice-banner">
              <h4 className="exposure-advice-title">
                <span className="advice-icon">🛡️</span> Recommended Exposure-Reduction Actions (No Purchase Required)
              </h4>
              <ul className="exposure-advice-list">
                {data.recommendations.exposure_reduction_advice.map((adv, idx) => (
                  <li key={idx} className="exposure-advice-item">
                    <span className="advice-bullet">✓</span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Product Category Filter Tabs */}
          <div className="store-filters-bar">
            <span className="filter-bar-label">FILTER PRODUCTS:</span>
            <div className="category-tabs">
              <button
                className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                All Accessories ({data ? data.recommendations.pollution_triggered_products.length + data.recommendations.general_travel_products.length : 0})
              </button>
              <button
                className={`category-tab ${selectedCategory === 'respirators' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('respirators')}
              >
                Particulate Respirators (N95/FFP2)
              </button>
              <button
                className={`category-tab ${selectedCategory === 'indoor_purifiers' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('indoor_purifiers')}
              >
                Indoor HEPA Purifiers
              </button>
              <button
                className={`category-tab ${selectedCategory === 'monitoring' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('monitoring')}
              >
                Portable Monitors
              </button>
              <button
                className={`category-tab ${selectedCategory === 'travel_preparation' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('travel_preparation')}
              >
                Travel Comfort &amp; Hygiene
              </button>
            </div>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="store-loading-state">
              <div className="store-spinner" />
              <span>Evaluating destination air quality and verified accessory listings…</span>
            </div>
          )}

          {error && (
            <div className="store-error-card">
              <div className="error-card-header">
                <span className="error-card-icon">⚠️</span>
                <div>
                  <h4 className="error-card-title">Forecast Date &amp; Prediction Advisory</h4>
                  <p className="error-card-msg">{error}</p>
                </div>
              </div>
              <div className="error-card-actions">
                <span className="error-action-hint">
                  AirPulse forecasts strictly support the 5-day ML prediction horizon. Select a valid date below:
                </span>
                <div className="horizon-date-buttons">
                  {VALID_HORIZON_DATES.map((d, idx) => (
                    <button
                      key={d}
                      type="button"
                      className={`btn-horizon-date-pill ${targetDate === d ? 'active' : ''}`}
                      onClick={() => {
                        setError(null);
                        setTargetDate(d);
                      }}
                    >
                      Day {idx + 1} ({d})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Pollution-Triggered Protective Equipment */}
          {!loading && !error && (
            <div className="store-products-section">
              <div className="section-header-row">
                <h3 className="section-title">
                  <span className="sec-tag triggered">POLLUTION-TRIGGERED</span>
                  Pollution-Triggered Protective Equipment
                </h3>
                <span className="section-count">
                  {!context?.has_valid_telemetry || context?.value === null
                    ? 'Data Unavailable'
                    : `${filteredTriggeredProducts.length} certified products recommended for ${context?.pollutant_name}`}
                </span>
              </div>

              {!context?.has_valid_telemetry || context?.value === null ? (
                <div className="empty-triggered-notice data-unavailable-notice">
                  <div className="empty-icon">⚠️</div>
                  <div className="empty-text">
                    <strong className="notice-title-warning">
                      Pollution data is unavailable or insufficient to determine pollution-triggered recommendations for this destination.
                    </strong>
                    <p>
                      Observed or forecast concentration for {context?.pollutant_name || 'selected pollutant'} is not available.
                      Missing or stale monitoring data is never treated as zero or safe.
                      Please review neighboring active monitoring stations or check back once telemetry is refreshed.
                    </p>
                  </div>
                </div>
              ) : filteredTriggeredProducts.length === 0 ? (
                <div className="empty-triggered-notice">
                  <div className="empty-icon">🌱</div>
                  <div className="empty-text">
                    <strong>No protective equipment triggered for current readings.</strong>
                    <p>
                      Recorded ambient {context?.pollutant_name} ({context?.value} µg/m³ · {context?.severity_category}) is within CPCB Good/Satisfactory thresholds.
                      Intensive respiratory protective equipment is not triggered for this severity level.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="product-cards-grid">
                  {filteredTriggeredProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: General Travel Preparation & Hygiene (Optional Non-Protective) */}
          {!loading && !error && filteredTravelProducts.length > 0 && (
            <div className="store-products-section travel-section">
              <div className="section-header-row">
                <h3 className="section-title">
                  <span className="sec-tag travel">OPTIONAL TRAVEL GEAR</span>
                  General Travel Hygiene &amp; Comfort Items
                </h3>
                <span className="section-count">
                  {filteredTravelProducts.length} optional travel accessories (Non-protective)
                </span>
              </div>

              {/* Explicit non-protective advisory banner */}
              <div className="travel-comfort-disclaimer-banner">
                <span className="banner-icon">ℹ️</span>
                <div className="banner-body">
                  <strong>Optional travel accessories — not evidence of pollution protection:</strong>
                  <span> The accessories below (saline nasal wash, protective eyewear, hydration flasks) support basic travel comfort and physical hygiene. They <strong>do NOT filter fine particulate matter (PM2.5/PM10) or harmful gases</strong> and are <strong>not evidence of pollution protection</strong>.</span>
                </div>
              </div>

              <div className="product-cards-grid">
                {filteredTravelProducts.map((prod) => (
                  <ProductCard key={prod.id} product={prod} isTravelItem={true} />
                ))}
              </div>
            </div>
          )}

          {/* Safety & Medical Disclaimers Box */}
          <div className="store-safety-disclaimer-box">
            <div className="disclaimer-header-row">
              <span className="disclaimer-icon">⚖️</span>
              <span className="disclaimer-title">STATUTORY PUBLIC HEALTH &amp; MERCHANT ADVISORY</span>
            </div>
            <p className="disclaimer-text">
              {data?.disclaimers.non_substitution_notice}
            </p>
            <p className="disclaimer-subtext">
              <strong>Fit &amp; Seal Notice:</strong> {data?.disclaimers.respirator_fit_notice}
            </p>
            <p className="disclaimer-subtext">
              <strong>Merchant Transparency:</strong> {data?.disclaimers.verified_links_notice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProductCardProps {
  product: StoreProduct;
  isTravelItem?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, isTravelItem = false }) => {
  return (
    <div className={`store-product-card ${isTravelItem ? 'travel-item' : 'triggered-item'}`}>
      <div className="card-top-badge-row">
        <span className="product-badge-tag">{product.image_badge}</span>
        {isTravelItem && <span className="product-optional-tag">OPTIONAL / NON-PROTECTIVE</span>}
        <span className="product-brand-tag">{product.brand}</span>
      </div>

      <h4 className="product-name">{product.name}</h4>

      <p className="product-intended-use">{product.intended_use}</p>

      {/* Certification Chip */}
      <div className="product-cert-box">
        <span className="cert-label">
          {isTravelItem ? 'PURPOSE / SPECIFICATION:' : 'CERTIFIED STANDARD / FILTER SPECIFICATION:'}
        </span>
        <span className="cert-val">{product.certification}</span>
      </div>

      {/* Critical Limitations Box */}
      <div className="product-limitations-box">
        <span className="limitation-label">
          {isTravelItem ? 'NON-PROTECTION LIMITATION:' : 'CRITICAL SAFETY LIMITATIONS:'}
        </span>
        <span className="limitation-val">{product.limitations}</span>
      </div>

      {/* Card Footer: Price, Seller & Buy Link */}
      <div className="card-footer-row">
        <div className="price-seller-col">
          <span className="product-price">{product.verified_price}</span>
          <span className="product-seller">via {product.seller_name}</span>
        </div>

        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-buy-product"
          title={`View ${product.name} on ${product.seller_name}`}
        >
          View on Seller Store ↗
        </a>
      </div>
    </div>
  );
};
