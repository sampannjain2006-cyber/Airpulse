import {
  getStationForecast,
  getPredictionsOverview,
  listAllPredictions,
  getPredictionsSnapshot,
  getHorizon,
  getModelsComparisonService,
} from '../services/predictionService.js';

export async function getStationPrediction(req, res, next) {
  try {
    const { model } = req.query;
    const result = await getStationForecast(req.params.stationId, model || 'weighted_ensemble');
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPredictionSummary(req, res, next) {
  try {
    const { model } = req.query;
    const result = await getPredictionsOverview(model || 'weighted_ensemble');
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getModelsComparison(req, res, next) {
  try {
    const result = await getModelsComparisonService();
    res.json(result);
  } catch (err) {
    next(err);
  }
}


export async function getAllPredictions(req, res, next) {
  try {
    const result = await listAllPredictions();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPredictionSnapshot(req, res, next) {
  try {
    const { date, model } = req.query;
    const result = await getPredictionsSnapshot(date, model || 'weighted_ensemble');
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPredictionHorizon(req, res, next) {
  try {
    const result = await getHorizon();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

