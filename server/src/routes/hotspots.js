import { Router } from 'express';
import { getHotspotsHandler } from '../controllers/hotspotController.js';

export const hotspotRouter = Router();

// GET /api/v1/hotspots
hotspotRouter.get('/', getHotspotsHandler);
