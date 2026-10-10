import { Router } from 'express';
import {
  getLocations,
  getLocationById,
  getNearby,
  getCoverage,
  syncLocations,
} from '../controllers/openaqController.js';

export const openaqRouter = Router();

// Order matters: specific paths before parameterized :id
openaqRouter.get('/locations', getLocations);
openaqRouter.get('/locations/nearby', getNearby);
openaqRouter.get('/locations/:id', getLocationById);
openaqRouter.get('/coverage', getCoverage);
openaqRouter.post('/sync', syncLocations);
openaqRouter.get('/sync', syncLocations);
