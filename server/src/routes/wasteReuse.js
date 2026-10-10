/**
 * AIRPULSE — Industrial Waste Reuse & Pollution Prevention Router
 */

import { Router } from 'express';
import {
  listWasteStreams,
  getWasteStreamById,
  getWasteMetadata,
} from '../controllers/wasteReuseController.js';

export const wasteReuseRouter = Router();

wasteReuseRouter.get('/metadata', getWasteMetadata);
wasteReuseRouter.get('/', listWasteStreams);
wasteReuseRouter.get('/:id', getWasteStreamById);
