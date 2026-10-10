import {
  getSeverity,
  POLLUTANT_BREAKPOINTS,
  CPCB_CATEGORIES,
  RULE_SOURCE,
} from '../utils/severityEngine.js';

export function getSeverityClassification({ metric, value, isPredicted, modelName } = {}) {
  const isPred = isPredicted === true || isPredicted === 'true' || isPredicted === '1';
  return getSeverity(metric, value, isPred, modelName);
}

export function getSeverityRules() {
  return {
    rule_source: RULE_SOURCE,
    standard: 'India CPCB National Air Quality Index (NAQI)',
    categories: CPCB_CATEGORIES,
    supported_metrics: Object.keys(POLLUTANT_BREAKPOINTS).map((k) => ({
      metric: k,
      displayName: POLLUTANT_BREAKPOINTS[k].displayName,
      unit: POLLUTANT_BREAKPOINTS[k].unit,
      bands: POLLUTANT_BREAKPOINTS[k].bands,
    })),
  };
}
