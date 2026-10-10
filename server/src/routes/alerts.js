import { Router } from 'express';
import { listAlerts, getSummary, getRulesConfig } from '../controllers/alertController.js';

export const alertsRouter = Router();

alertsRouter.get('/', listAlerts);
alertsRouter.get('/summary', getSummary);
alertsRouter.get('/config', getRulesConfig);
alertsRouter.get('/rules', getRulesConfig);
