/**
 * Centralized Environmental Severity Engine
 * Source of Truth: Central Pollution Control Board (CPCB) NAQI Standard (2014)
 * India National Air Quality Index guidelines.
 */

export const RULE_SOURCE = 'Central Pollution Control Board (CPCB) NAQI Standard (2014)';

export const CPCB_CATEGORIES = [
  { level: 1, name: 'Good',          color: '#10b981', bgColor: 'rgba(16,185,129,0.15)',  implication: 'Minimal impact' },
  { level: 2, name: 'Satisfactory',  color: '#84cc16', bgColor: 'rgba(132,204,22,0.15)',  implication: 'Minor breathing discomfort to sensitive people' },
  { level: 3, name: 'Moderate',      color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)',  implication: 'Breathing discomfort to people with asthma and heart diseases' },
  { level: 4, name: 'Poor',          color: '#f97316', bgColor: 'rgba(249,115,22,0.15)',  implication: 'Breathing discomfort to most people on prolonged exposure' },
  { level: 5, name: 'Very Poor',     color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)',  implication: 'Respiratory illness on prolonged exposure' },
  { level: 6, name: 'Severe',        color: '#7c3aed', bgColor: 'rgba(124,58,237,0.15)',  implication: 'Affects healthy people and seriously impacts sensitive groups' },
];

/**
 * Official CPCB NAQI Breakpoints (24-hour averages for pollutants, mg/m³ for CO, µg/m³ for others)
 */
export const POLLUTANT_BREAKPOINTS = {
  pm25: {
    displayName: 'PM2.5',
    unit: 'µg/m³',
    maxValid: 1500, // Maximum physically credible atmospheric concentration
    bands: [
      { min: 0,   max: 30,   aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 31,  max: 60,   aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 61,  max: 90,   aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 91,  max: 120,  aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 121, max: 250,  aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 250, max: 500,  aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
  pm10: {
    displayName: 'PM10',
    unit: 'µg/m³',
    maxValid: 2000,
    bands: [
      { min: 0,   max: 50,   aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 51,  max: 100,  aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 101, max: 250,  aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 251, max: 350,  aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 351, max: 430,  aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 430, max: 600,  aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
  no2: {
    displayName: 'NO₂',
    unit: 'µg/m³',
    maxValid: 3000,
    bands: [
      { min: 0,   max: 40,   aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 41,  max: 80,   aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 81,  max: 180,  aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 181, max: 280,  aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 281, max: 400,  aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 400, max: 800,  aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
  so2: {
    displayName: 'SO₂',
    unit: 'µg/m³',
    maxValid: 3000,
    bands: [
      { min: 0,   max: 40,   aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 41,  max: 80,   aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 81,  max: 380,  aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 381, max: 800,  aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 801, max: 1600, aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 1600,max: 2000, aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
  co: {
    displayName: 'CO',
    unit: 'mg/m³',
    maxValid: 150,
    bands: [
      { min: 0,    max: 1.0,  aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 1.1,  max: 2.0,  aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 2.1,  max: 10.0, aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 10.1, max: 17.0, aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 17.1, max: 34.0, aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 34.0, max: 60.0, aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
  o3: {
    displayName: 'O₃',
    unit: 'µg/m³',
    maxValid: 1000,
    bands: [
      { min: 0,   max: 50,   aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 51,  max: 100,  aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 101, max: 168,  aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 169, max: 208,  aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 209, max: 748,  aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 748, max: 1000, aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
  aqi: {
    displayName: 'AQI',
    unit: 'Index',
    maxValid: 999,
    bands: [
      { min: 0,   max: 50,   aqiMin: 0,   aqiMax: 50,  level: 1, category: 'Good' },
      { min: 51,  max: 100,  aqiMin: 51,  aqiMax: 100, level: 2, category: 'Satisfactory' },
      { min: 101, max: 200,  aqiMin: 101, aqiMax: 200, level: 3, category: 'Moderate' },
      { min: 201, max: 300,  aqiMin: 201, aqiMax: 300, level: 4, category: 'Poor' },
      { min: 301, max: 400,  aqiMin: 301, aqiMax: 400, level: 5, category: 'Very Poor' },
      { min: 401, max: 999,  aqiMin: 401, aqiMax: 500, level: 6, category: 'Severe' },
    ],
  },
};

/**
 * Normalizes metric key (e.g., 'pm2_5', 'pm25', 'PM2.5' -> 'pm25')
 */
export function normalizeMetricKey(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleaned === 'pm25' || cleaned === 'pm2_5') return 'pm25';
  if (cleaned === 'pm10') return 'pm10';
  if (cleaned === 'no2') return 'no2';
  if (cleaned === 'so2') return 'so2';
  if (cleaned === 'co') return 'co';
  if (cleaned === 'o3') return 'o3';
  if (cleaned === 'aqi') return 'aqi';
  return null;
}

/**
 * Computes the CPCB Sub-Index for a given metric and value using piecewise linear interpolation.
 */
export function calculateSubIndex(metricKey, numericValue) {
  const normKey = normalizeMetricKey(metricKey);
  const config = POLLUTANT_BREAKPOINTS[normKey];
  if (!config) return null;
  if (normKey === 'aqi') return Math.round(numericValue);

  const bands = config.bands;
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i];
    const isLast = i === bands.length - 1;
    if (numericValue <= band.max || isLast) {
      const bMin = band.min;
      const bMax = band.max;
      const iMin = band.aqiMin;
      const iMax = band.aqiMax;

      if (bMax === bMin) return iMin;
      const subIndex = ((iMax - iMin) / (bMax - bMin)) * (numericValue - bMin) + iMin;
      return Math.round(Math.max(0, subIndex));
    }
  }
  return null;
}

/**
 * Evaluates pollution severity for any supported pollutant or AQI value.
 *
 * @param {string} metric - e.g. 'pm25', 'pm10', 'no2', 'aqi'
 * @param {number|string} rawValue - Concentration or AQI value
 * @param {boolean} [isPredicted=false] - Whether the value is an ML forecast
 * @param {string} [modelName=null] - Model name if predicted (e.g. 'weighted_ensemble')
 * @returns {object} Standardized severity classification result or unavailable state
 */
export function getSeverity(metric, rawValue, isPredicted = false, modelName = null) {
  const normKey = normalizeMetricKey(metric);

  // Validate metric
  if (!normKey || !POLLUTANT_BREAKPOINTS[normKey]) {
    return {
      status: 'unavailable',
      reason: `Unsupported pollutant metric: '${metric}'`,
      metric: metric || null,
      value: null,
      rule_source: RULE_SOURCE,
    };
  }

  const config = POLLUTANT_BREAKPOINTS[normKey];

  // Validate value presence
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return {
      status: 'unavailable',
      reason: 'Value is null or missing',
      metric: normKey,
      metric_display: config.displayName,
      unit: config.unit,
      value: null,
      rule_source: RULE_SOURCE,
    };
  }

  const num = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue);

  // Validate numeric validity
  if (!isFinite(num) || isNaN(num)) {
    return {
      status: 'unavailable',
      reason: `Invalid non-numeric value: '${rawValue}'`,
      metric: normKey,
      metric_display: config.displayName,
      unit: config.unit,
      value: null,
      rule_source: RULE_SOURCE,
    };
  }

  // Physical range validation
  if (num < 0) {
    return {
      status: 'unavailable',
      reason: 'Negative pollutant concentration is physically invalid',
      metric: normKey,
      metric_display: config.displayName,
      unit: config.unit,
      value: num,
      rule_source: RULE_SOURCE,
    };
  }

  if (num > config.maxValid) {
    return {
      status: 'unavailable',
      reason: `Value ${num} ${config.unit} exceeds plausible atmospheric maximum (${config.maxValid} ${config.unit})`,
      metric: normKey,
      metric_display: config.displayName,
      unit: config.unit,
      value: num,
      rule_source: RULE_SOURCE,
    };
  }

  // Find corresponding band
  const bands = config.bands;
  let matchingBand = bands[bands.length - 1]; // fallback to highest band
  for (let i = 0; i < bands.length; i++) {
    if (num <= bands[i].max) {
      matchingBand = bands[i];
      break;
    }
  }

  const categoryMeta = CPCB_CATEGORIES.find((c) => c.level === matchingBand.level) || CPCB_CATEGORIES[0];
  const calculatedSubIndex = calculateSubIndex(normKey, num);

  return {
    status: 'valid',
    metric: normKey,
    metric_display: config.displayName,
    value: Number(num.toFixed(1)),
    unit: config.unit,
    category: matchingBand.category,
    severity_level: matchingBand.level,
    max_severity_level: 6,
    band_min: matchingBand.min,
    band_max: matchingBand.max,
    aqi_sub_index: calculatedSubIndex,
    color: categoryMeta.color,
    bg_color: categoryMeta.bgColor,
    health_implication: categoryMeta.implication,
    is_predicted: Boolean(isPredicted),
    model_name: isPredicted ? (modelName || 'weighted_ensemble') : null,
    rule_source: RULE_SOURCE,
  };
}
