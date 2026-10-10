import { Router } from 'express';
import {
  getStationPrediction,
  getPredictionSummary,
  getAllPredictions,
  getPredictionSnapshot,
  getPredictionHorizon,
  getModelsComparison,
} from '../controllers/predictionController.js';

export const predictionsRouter = Router();

predictionsRouter.get('/snapshot', getPredictionSnapshot);
predictionsRouter.get('/horizon', getPredictionHorizon);
predictionsRouter.get('/summary', getPredictionSummary);
predictionsRouter.get('/models-comparison', getModelsComparison);
predictionsRouter.get('/stations/:stationId', getStationPrediction);
predictionsRouter.get('/', getAllPredictions);


