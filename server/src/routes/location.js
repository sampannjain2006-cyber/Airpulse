import { Router } from 'express';
import {
  resolveLocationHandler,
  lookupLocationHandler,
  getGoogleStatusHandler,
} from '../controllers/locationController.js';

export const locationRouter = Router();

// Location resolution endpoint
locationRouter.get('/resolve', resolveLocationHandler);
locationRouter.post('/resolve', resolveLocationHandler);

// Unified Location Air Quality Lookup endpoint
locationRouter.get('/lookup', lookupLocationHandler);
locationRouter.post('/lookup', lookupLocationHandler);

// Google Services Status endpoint (safe, non-sensitive)
locationRouter.get('/google-status', getGoogleStatusHandler);
