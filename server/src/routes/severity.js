import { Router } from 'express';
import { getSeverity, getRules } from '../controllers/severityController.js';

export const severityRouter = Router();

severityRouter.get('/', getSeverity);
severityRouter.get('/rules', getRules);
