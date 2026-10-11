/**
 * AIRPULSE — Google Services Integration Router (Feature 15)
 */

import { Router } from 'express';
import * as googleController from '../controllers/googleController.js';

export const googleRouter = Router();

// 1. Capability & Configuration Status
googleRouter.get('/status', googleController.getStatus);

// 2. Google Maps Navigation & Landmark Links
googleRouter.get('/maps/url', googleController.generateMapsUrl);
googleRouter.post('/maps/url', googleController.generateMapsUrl);

// 3. Google Calendar Prefilled Event Drafts & RFC 5545 .ics Files
googleRouter.post('/calendar/draft', googleController.generateCalendarDraft);

// 4. Google Tasks Actionable Checklists & Draft Links
googleRouter.post('/tasks/draft', googleController.generateTaskDraft);

// 5. Official Google OAuth 2.0 Flow (Server-side)
googleRouter.get('/auth/url', googleController.getAuthUrl);
googleRouter.get('/auth/callback', googleController.handleAuthCallback);
googleRouter.post('/auth/disconnect', googleController.disconnectAuth);

// 6. Direct Google Tasks API creation (Requires connected Google Account session)
googleRouter.post('/tasks/create', googleController.createDirectTask);
