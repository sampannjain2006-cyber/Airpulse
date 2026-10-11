import { Router } from 'express';
import { getAllStations, getStationById, getStationHierarchyHandler } from '../controllers/stationController.js';

export const stationsRouter = Router();

stationsRouter.get('/hierarchy', getStationHierarchyHandler);
stationsRouter.get('/', getAllStations);
stationsRouter.get('/:id', getStationById);
