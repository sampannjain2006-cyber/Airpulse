import { Router } from 'express';
import {
  resolveLocationHandler,
  getGoogleStatusHandler,
} from '../controllers/locationController.js';

export const locationRouter = Router();

// Location resolution endpoint
locationRouter.get('/resolve', resolveLocationHandler);
locationRouter.post('/resolve', resolveLocationHandler);

// Google Services Status endpoint (safe, non-sensitive)
locationRouter.get('/google-status', getGoogleStatusHandler);
