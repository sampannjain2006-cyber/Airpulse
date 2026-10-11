import { resolveLocation, getGoogleConfigStatus } from '../services/googleService.js';

export async function resolveLocationHandler(req, res, next) {
  try {
    const query = req.body?.query || req.query?.query;
    if (!query) {
      return res.status(400).json({ error: { message: "Query string is required (e.g. ?query=Shimla or body: { query: 'Shimla' })" } });
    }
    const result = await resolveLocation(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getGoogleStatusHandler(req, res, next) {
  try {
    const status = getGoogleConfigStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
}
