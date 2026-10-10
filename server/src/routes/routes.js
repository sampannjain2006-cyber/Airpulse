/**
 * AIRPULSE — Route Planning Router
 */

import { Router } from 'express';
import { calculateRoutePlan } from '../controllers/routeController.js';

export const routesRouter = Router();

routesRouter.get('/plan', calculateRoutePlan);
routesRouter.post('/plan', calculateRoutePlan);
