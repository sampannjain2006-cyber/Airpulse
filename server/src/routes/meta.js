import { Router } from 'express';
import { getStatus } from '../controllers/metaController.js';

export const metaRouter = Router();

metaRouter.get('/status', getStatus);
