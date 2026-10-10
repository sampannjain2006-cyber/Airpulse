import { Router } from 'express';
import { listPollutants, getPollutant } from '../controllers/pollutantController.js';

export const pollutantRouter = Router();

pollutantRouter.get('/', listPollutants);
pollutantRouter.get('/:id', getPollutant);
