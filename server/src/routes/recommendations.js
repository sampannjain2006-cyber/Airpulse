import { Router } from 'express';
import { listRecommendations, listRules } from '../controllers/recommendationController.js';

export const recommendationRouter = Router();

recommendationRouter.get('/', listRecommendations);
recommendationRouter.get('/rules', listRules);
