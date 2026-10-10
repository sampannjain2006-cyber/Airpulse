import { Router } from 'express';
import { getAllStations, getStationById } from '../controllers/stationController.js';

export const stationsRouter = Router();

stationsRouter.get('/', getAllStations);
stationsRouter.get('/:id', getStationById);
