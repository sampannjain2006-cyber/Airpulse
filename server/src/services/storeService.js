/**
 * AIRPULSE — Pollution Protection & Accessories Store Service
 * 
 * Destination-aware recommendation engine generating tailored protective accessory
 * recommendations based on:
 * - Real-time observed ground telemetry (OpenAQ)
 * - Google modelled air quality fallback
 * - 5-Day ML multi-model forecasting
 * - Existing centralized Severity Engine (CPCB NAQI 6-Tier standard)
 * 
 * CRITICAL SAFETY RULES:
 * - Particulate masks (N95 / FFP2) DO NOT filter harmful gases (CO, NO2, SO2, O3).
 * - Masks require a verified facial seal and clean-shaven skin.
 * - Purchasing accessories is NEVER a substitute for reducing exposure or following health advisories.
 */

import {
  STORE_PRODUCTS,
  STORE_DISCLAIMERS,
  getAllStoreProducts,
  getStoreProductById,
  filterStoreProducts,
} from '../config/storeCatalog.js';
import { getSeverity, CPCB_CATEGORIES } from '../utils/severityEngine.js';
import { findStationById } from '../models/stationModel.js';
import { getPool } from '../config/db.js';

const ALLOWED_FORECAST_DATES = [
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
];

/**
 * Returns store catalog with optional filtering
 */
export function getStoreCatalog(filters = {}) {
  const products = filterStoreProducts(filters);
  const categories = Array.from(
    new Set(STORE_PRODUCTS.map((p) => JSON.stringify({ id: p.category, label: p.category_label })))
  ).map((s) => JSON.parse(s));

  return {
    status: 'success',
    count: products.length,
    total_available: STORE_PRODUCTS.length,
    categories,
    disclaimers: STORE_DISCLAIMERS,
    data: products,
  };
}

/**
 * Returns single product detail
 */
export function getProductDetail(id) {
  if (!id) {
    const err = new Error('Product ID is required.');
    err.statusCode = 400;
    throw err;
  }

  const product = getStoreProductById(id);
  if (!product) {
    const err = new Error(`Product '${id}' not found in store catalog.`);
    err.statusCode = 404;
    throw err;
  }

  return {
    status: 'success',
    disclaimers: STORE_DISCLAIMERS,
    data: product,
  };
}

/**
 * Destination-aware recommendations engine
 */
export async function getDestinationStoreRecommendations(params = {}) {
  const {
    station_id,
    destination: rawDestination,
    pollutant: rawPollutant = 'pm25',
    value: rawValue,
    severity_tier: rawTier,
    mode = 'live',
    date,
    model = 'weighted_ensemble',
    data_type: rawDataType,
  } = params;

  const pollutant = String(rawPollutant).toLowerCase().trim();
  const validModes = ['live', 'historical', 'forecast'];
  const effectiveMode = validModes.includes(mode) ? mode : 'live';

  // Enforce 5-Day forecast horizon (Day 6+ rejection)
  if (effectiveMode === 'forecast' && date) {
    if (!ALLOWED_FORECAST_DATES.includes(date)) {
      const err = new Error(
        `Forecast date '${date}' exceeds the strict 5-day forecast horizon. Allowed forecast dates: ${ALLOWED_FORECAST_DATES.join(', ')}.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // 1. Resolve Destination Info
  let destinationName = rawDestination || 'Selected Indian Destination';
  let destinationLocation = 'India';
  let stationObj = null;

  if (station_id) {
    const numericId = parseInt(station_id, 10);
    if (!isNaN(numericId)) {
      try {
        stationObj = await findStationById(numericId);
        if (stationObj) {
          destinationName = stationObj.name;
          destinationLocation = `${stationObj.city}, ${stationObj.state}`;
        }
      } catch (err) {
        // Fall back to provided destination text
      }
    }
  }

  // 2. Resolve Pollutant Concentration & Severity Tier
  let numericValue = rawValue !== undefined && rawValue !== null && rawValue !== '' ? parseFloat(rawValue) : null;
  if (numericValue !== null && (isNaN(numericValue) || numericValue < 0)) {
    numericValue = null;
  }

  // If concentration was not explicitly passed, query the station's observation from DB
  if (numericValue === null && stationObj) {
    const pool = getPool();
    if (pool) {
      try {
        if (effectiveMode === 'forecast') {
          const targetDate = date || ALLOWED_FORECAST_DATES[0];
          const predRes = await pool.query(
            `SELECT predicted_value FROM predictions 
             WHERE station_id = $1 AND target = $2 AND model_name = $3 AND prediction_date = $4::date
             LIMIT 1`,
            [stationObj.id, pollutant, model, targetDate]
          );
          if (predRes.rows.length > 0 && predRes.rows[0].predicted_value != null) {
            numericValue = parseFloat(predRes.rows[0].predicted_value);
          }
        } else if (effectiveMode === 'historical') {
          const histDate = date || '2026-10-02';
          const histRes = await pool.query(
            `SELECT pm25, pm10, no2, so2, co, o3, recorded_at, source 
             FROM environmental_observations 
             WHERE station_id = $1 AND (recorded_at::date) = $2::date
             ORDER BY recorded_at DESC LIMIT 1`,
            [stationObj.id, histDate]
          );
          if (histRes.rows.length > 0) {
            const row = histRes.rows[0];
            numericValue = row[pollutant] != null ? parseFloat(row[pollutant]) : null;
          }
        } else {
          // Live mode: latest observation
          const latestRes = await pool.query(
            `SELECT pm25, pm10, no2, so2, co, o3, recorded_at, source 
             FROM environmental_observations 
             WHERE station_id = $1 
             ORDER BY recorded_at DESC LIMIT 1`,
            [stationObj.id]
          );
          if (latestRes.rows.length > 0) {
            const row = latestRes.rows[0];
            numericValue = row[pollutant] != null ? parseFloat(row[pollutant]) : null;
          }
        }
      } catch (dbErr) {
        // Fall back gracefully to null
      }
    }
  }

  // If concentration is physically impossible
  if (numericValue !== null && numericValue > 2000) {
    numericValue = null;
  }

  let evaluatedTier = rawTier ? parseInt(rawTier, 10) : null;
  let severityInfo = null;

  if (numericValue !== null) {
    severityInfo = getSeverity(pollutant, numericValue);
    evaluatedTier = severityInfo.status === 'valid' ? severityInfo.severity_level : null;
  } else if (evaluatedTier && evaluatedTier >= 1 && evaluatedTier <= 6) {
    const cat = CPCB_CATEGORIES[evaluatedTier - 1];
    severityInfo = {
      status: 'valid',
      pollutant,
      severity_level: evaluatedTier,
      category: cat.name,
      color: cat.color,
      health_implication: cat.implication,
    };
  } else {
    // Missing or indeterminate data
    evaluatedTier = null;
  }

  // 3. Determine Data Provenance
  let provenanceType = 'observed';
  let provenanceLabel = 'GROUND MEASURED OBSERVED';

  if (rawDataType === 'modelled') {
    provenanceType = 'modelled';
    provenanceLabel = 'GOOGLE MODELLED / SPATIALLY INTERPOLATED';
  } else if (effectiveMode === 'forecast') {
    provenanceType = 'predicted';
    provenanceLabel = `5-DAY ML FORECAST (${model.toUpperCase()})`;
  } else if (effectiveMode === 'historical') {
    provenanceType = 'historical';
    provenanceLabel = 'HISTORICAL GROUND ARCHIVE';
  }

  // 4. Recommendation Rules Evaluation
  const isParticulate = pollutant === 'pm25' || pollutant === 'pm10';
  const isGas = ['no2', 'so2', 'co', 'o3'].includes(pollutant);

  const pollutionTriggeredProducts = [];
  const generalTravelProducts = [];
  const exposureReductionAdvice = [];

  // Always include General Travel & Preparation Products in their own clear section
  const travelItems = STORE_PRODUCTS.filter((p) => !p.is_pollution_triggered);
  generalTravelProducts.push(...travelItems);

  const hasValidData = evaluatedTier !== null && numericValue !== null;
  const dataStatus = hasValidData ? 'available' : 'unavailable';
  let recommendationStatus = 'insufficient_data';

  // Determine Pollution-Triggered Items ONLY if valid data is available
  if (hasValidData) {
    // A. PARTICULATE RECOMMENDATIONS (PM2.5 / PM10)
    if (isParticulate) {
      if (evaluatedTier >= 3) {
        // Tier 3+ (Moderate, Poor, Very Poor, Severe) -> Certified N95/FFP2 particulate masks
        const baseMasks = STORE_PRODUCTS.filter(
          (p) => p.category === 'respirators' && p.min_severity_tier <= evaluatedTier
        );
        pollutionTriggeredProducts.push(...baseMasks);

        // Tier 3+ -> Portable informational monitor
        const monitor = STORE_PRODUCTS.find((p) => p.id === 'temtop_m10_air_quality_monitor');
        if (monitor) pollutionTriggeredProducts.push(monitor);
      }

      if (evaluatedTier >= 4) {
        // Tier 4+ (Poor, Very Poor, Severe) -> Indoor HEPA Air Purifiers
        const purifiers = STORE_PRODUCTS.filter((p) => p.category === 'indoor_purifiers');
        pollutionTriggeredProducts.push(...purifiers);
      }

      // Non-purchase exposure reduction advice for Particulates
      if (evaluatedTier >= 4) {
        exposureReductionAdvice.push(
          'Reduce strenuous outdoor exertion, especially along heavy vehicular traffic corridors.',
          'Keep indoor hotel/room windows tightly closed during early mornings and evening peak smog periods.',
          'Consider indoor recreation or air-filtered cultural venues over extended outdoor exposure.'
        );
      } else if (evaluatedTier === 3) {
        exposureReductionAdvice.push(
          'Unusually sensitive individuals should take frequent breaks during prolonged outdoor walking.',
          'Avoid exercising immediately adjacent to congested ring roads or construction zones.'
        );
      } else {
        exposureReductionAdvice.push(
          'Recorded ambient particulate levels meet CPCB Good/Satisfactory criteria. Intensive respiratory protective equipment is not triggered.'
        );
      }
    }

    // B. GASEOUS POLLUTANT RULES (NO2, SO2, CO, O3)
    if (isGas) {
      // CRITICAL: DO NOT recommend ordinary N95 masks for gases!
      if (evaluatedTier >= 4) {
        exposureReductionAdvice.push(
          `ELEVATED ${pollutant.toUpperCase()}: Ordinary particulate masks DO NOT filter harmful gases (CO, NO2, SO2, O3).`,
          'The primary protective strategy is staying indoors in enclosed air-conditioned spaces.',
          'Avoid heavy cardiovascular exertion outdoors which dramatically increases inhaled gas volume.'
        );

        // Indoor air purifier with active carbon layer helps adsorb limited VOCs/acid gases
        const activeCarbonPurifier = STORE_PRODUCTS.find((p) => p.id === 'philips_series_1000i_air_purifier');
        if (activeCarbonPurifier) pollutionTriggeredProducts.push(activeCarbonPurifier);

        // Only for severe SO2/acid gases (Tier 5+): show specialized sorbent respirator with clear warning
        if (pollutant === 'so2' && evaluatedTier >= 5) {
          const gasRespirator = STORE_PRODUCTS.find((p) => p.id === '3m_6200_half_face_gas_respirator');
          if (gasRespirator) pollutionTriggeredProducts.push(gasRespirator);
        }
      } else {
        exposureReductionAdvice.push(
          `Recorded gaseous pollutant (${pollutant.toUpperCase()}) levels meet CPCB Good/Satisfactory criteria. Specialized chemical protection is not triggered.`
        );
      }
    }

    recommendationStatus = pollutionTriggeredProducts.length > 0 ? 'triggered' : 'not_triggered';
  } else {
    // Missing, stale, or unavailable data state: NEVER state "within acceptable limits"
    recommendationStatus = 'insufficient_data';
    exposureReductionAdvice.push(
      'Pollution data is unavailable or insufficient to determine pollution-triggered recommendations for this destination.'
    );
  }

  // Deduplicate products
  const uniqueTriggered = Array.from(new Map(pollutionTriggeredProducts.map((p) => [p.id, p])).values());

  const healthStatement = hasValidData && severityInfo
    ? severityInfo.health_implication
    : 'Pollution data is unavailable or insufficient to determine pollution-triggered recommendations for this destination.';

  return {
    status: 'success',
    data_status: dataStatus,
    recommendation_status: recommendationStatus,
    destination: {
      name: destinationName,
      location: destinationLocation,
      station_id: stationObj ? stationObj.id : null,
      station_code: stationObj ? stationObj.station_code : null,
    },
    pollution_context: {
      pollutant,
      pollutant_name: pollutant.toUpperCase(),
      value: numericValue,
      severity_tier: evaluatedTier,
      severity_category: hasValidData && severityInfo ? severityInfo.category : 'Data Unavailable',
      severity_color: hasValidData && severityInfo ? severityInfo.color : '#94a3b8',
      health_statement: healthStatement,
      data_status: dataStatus,
      recommendation_status: recommendationStatus,
      mode: effectiveMode,
      target_date: date || (effectiveMode === 'forecast' ? '2026-10-03' : '2026-10-02'),
      data_provenance: {
        type: provenanceType,
        label: provenanceLabel,
        is_modelled: provenanceType === 'modelled',
        is_predicted: provenanceType === 'predicted',
        is_historical: provenanceType === 'historical',
        model_name: effectiveMode === 'forecast' ? model : null,
      },
      has_valid_telemetry: hasValidData,
      is_particulate: isParticulate,
      is_gaseous: isGas,
    },
    recommendations: {
      pollution_triggered_count: uniqueTriggered.length,
      pollution_triggered_products: uniqueTriggered,
      general_travel_products: generalTravelProducts,
      exposure_reduction_advice: exposureReductionAdvice,
    },
    gas_protection_warning: isGas && evaluatedTier && evaluatedTier >= 3
      ? STORE_DISCLAIMERS.gas_protection_warning
      : null,
    disclaimers: STORE_DISCLAIMERS,
  };
}
