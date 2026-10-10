import {
  getObservedAlerts,
  getForecastAlerts,
  getAlertSummary,
  SEVERITY_LEVEL_MAP,
  LEVEL_TO_NAME_MAP,
} from '../services/alertService.js';

export async function listAlerts(req, res, next) {
  try {
    const {
      type = 'all', // 'observed' | 'forecast' | 'all'
      date,
      model = 'weighted_ensemble',
      min_severity = 'poor',
      is_historical = 'false',
    } = req.query;

    const isHistorical = is_historical === 'true' || is_historical === '1';

    if (type === 'observed') {
      const result = await getObservedAlerts({
        date: date || '2026-10-02',
        minSeverity: min_severity,
        isHistorical,
      });
      return res.json(result);
    }

    if (type === 'forecast' || type === 'predicted') {
      const result = await getForecastAlerts({
        date: date || '2026-10-03',
        model,
        minSeverity: min_severity,
      });
      return res.json(result);
    }

    // Default 'all': return unified payload with summary and lists
    const [obsResult, fcResult] = await Promise.all([
      getObservedAlerts({
        date: date || '2026-10-02',
        minSeverity: min_severity,
        isHistorical,
      }),
      getForecastAlerts({
        date: date && date >= '2026-10-03' ? date : '2026-10-03',
        model,
        minSeverity: min_severity,
      }),
    ]);

    res.json({
      status: 'success',
      observed: obsResult,
      forecast: fcResult,
      total_count: (isHistorical ? 0 : obsResult.count) + fcResult.count,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req, res, next) {
  try {
    const {
      observed_date = '2026-10-02',
      forecast_date = '2026-10-03',
      model = 'weighted_ensemble',
      min_severity = 'poor',
      is_historical = 'false',
    } = req.query;

    const isHistorical = is_historical === 'true' || is_historical === '1';

    const summary = await getAlertSummary({
      observedDate: observed_date,
      forecastDate: forecast_date,
      model,
      minSeverity: min_severity,
      isHistorical,
    });

    res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function getRulesConfig(req, res, next) {
  try {
    res.json({
      status: 'success',
      default_threshold: 'poor',
      default_level: 4,
      supported_thresholds: Object.entries(LEVEL_TO_NAME_MAP).map(([lvl, name]) => ({
        level: parseInt(lvl, 10),
        category: name,
        key: name.toLowerCase().replace(/[\s-]+/g, '_'),
        description: `Alert triggers when pollution severity reaches ${name} (Tier ${lvl}/6) or higher.`,
      })),
      alert_types: {
        observed: 'Evaluates real OpenAQ monitoring observations against CPCB NAQI breakpoints.',
        forecast: 'Evaluates 5-day ML model predictions (XGBoost, RF, HGB, Weighted Ensemble).',
      },
      freshness_policy: 'Only observations from active reporting stations with non-stale timestamps qualify.',
    });
  } catch (err) {
    next(err);
  }
}
