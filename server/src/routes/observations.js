import { Router } from 'express';
import {
  listLatestObservations,
  listObservations,
  listObservationHistory,
  getObservationSnapshot,
  getObservationDateRange,
  getStationCurrentConditionsHandler,
} from '../controllers/observationController.js';

export const observationsRouter = Router();

observationsRouter.get('/snapshot', getObservationSnapshot);
observationsRouter.get('/date-range', getObservationDateRange);
observationsRouter.get('/stations/:stationId/current', getStationCurrentConditionsHandler);
observationsRouter.get('/latest', listLatestObservations);
observationsRouter.get('/history', listObservationHistory);
observationsRouter.get('/', listObservations);

