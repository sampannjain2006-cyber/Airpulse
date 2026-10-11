/**
 * AIRPULSE — Google Services Integration Controller (Feature 15)
 */

import * as googleIntegrationService from '../services/googleIntegrationService.js';

export function getStatus(req, res, next) {
  try {
    const status = googleIntegrationService.getGoogleIntegrationStatus();
    res.json({
      status: 'success',
      data: status,
    });
  } catch (err) {
    next(err);
  }
}

export function generateMapsUrl(req, res, next) {
  try {
    const payload = req.method === 'POST' ? req.body : req.query;
    const result = googleIntegrationService.generateMapsUrl(payload);
    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export function generateCalendarDraft(req, res, next) {
  try {
    const result = googleIntegrationService.generateCalendarDraft(req.body);
    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export function generateTaskDraft(req, res, next) {
  try {
    const result = googleIntegrationService.generateTaskDraft(req.body);
    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export function getAuthUrl(req, res, next) {
  try {
    const result = googleIntegrationService.getOAuthAuthUrl();
    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleAuthCallback(req, res, next) {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.status(400).json({
        status: 'error',
        error: { message: `Google OAuth authorization denied: ${error}` },
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Missing authorization code or state in OAuth callback.' },
      });
    }

    const result = await googleIntegrationService.exchangeOAuthCode(code, state);
    res.json({
      status: 'success',
      message: 'Google account authorized successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export function disconnectAuth(req, res, next) {
  try {
    const sessionId = req.body?.session_id || req.headers['x-google-session'];
    const result = googleIntegrationService.disconnectOAuthSession(sessionId);
    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function createDirectTask(req, res, next) {
  try {
    const sessionId = req.headers['x-google-session'] || req.body?.session_id;
    const result = await googleIntegrationService.createDirectGoogleTask(sessionId, req.body);
    res.json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
