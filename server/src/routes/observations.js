import { Router } from 'express';
import {
  listLatestObservations,
  listObservations,
  listObservationHistory,
  getObservationSnapshot,
  getObservationDateRange,
} from '../controllers/observationController.js';

export const observationsRouter = Router();

observationsRouter.get('/snapshot', getObservationSnapshot);
observationsRouter.get('/date-range', getObservationDateRange);
observationsRouter.get('/latest', listLatestObservations);
observationsRouter.get('/history', listObservationHistory);
observationsRouter.get('/', listObservations);

