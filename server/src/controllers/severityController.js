import {
  getSeverityClassification,
  getSeverityRules,
} from '../services/severityService.js';

export async function getSeverity(req, res, next) {
  try {
    const { metric, value, is_predicted, model } = req.query;

    if (!metric) {
      const err = new Error("Query parameter 'metric' is required (e.g., pm25, pm10, aqi).");
      err.statusCode = 400;
      throw err;
    }

    const result = getSeverityClassification({
      metric,
      value,
      isPredicted: is_predicted,
      modelName: model,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getRules(req, res, next) {
  try {
    const rules = getSeverityRules();
    res.json(rules);
  } catch (err) {
    next(err);
  }
}
