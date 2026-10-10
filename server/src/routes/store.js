/**
 * AIRPULSE — Pollution Protection & Accessories Store Router
 */

import { Router } from 'express';
import {
  listStoreProducts,
  getStoreProduct,
  getStoreRecommendations,
} from '../controllers/storeController.js';

export const storeRouter = Router();

storeRouter.get('/products', listStoreProducts);
storeRouter.get('/recommendations', getStoreRecommendations);
storeRouter.get('/products/:id', getStoreProduct);
