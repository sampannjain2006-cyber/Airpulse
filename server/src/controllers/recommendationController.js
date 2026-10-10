import { getRecommendations, getRecommendationRulesCatalog } from '../services/recommendationService.js';

export async function listRecommendations(req, res, next) {
  try {
    const {
      station_id,
      pollutant,
      value,
      severity_tier,
      mode,
      date,
      model,
      data_type,
      target_audience,
    } = req.query;

    const result = await getRecommendations({
      station_id,
      pollutant,
      value,
      severity_tier,
      mode,
      date,
      model,
      data_type,
      target_audience,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export function listRules(req, res, next) {
  try {
    const catalog = getRecommendationRulesCatalog();
    res.json(catalog);
  } catch (err) {
    next(err);
  }
}
