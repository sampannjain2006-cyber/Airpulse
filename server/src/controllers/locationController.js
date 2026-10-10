import { resolveLocation, getGoogleConfigStatus } from '../services/googleService.js';
import { lookupLocationAirQuality } from '../services/locationService.js';

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

export async function lookupLocationHandler(req, res, next) {
  try {
    const params = {
      query: req.body?.query || req.query?.query,
      latitude: req.body?.latitude ?? req.query?.lat ?? req.query?.latitude,
      longitude: req.body?.longitude ?? req.query?.lon ?? req.query?.longitude,
      radiusMeters: req.body?.radius_meters || req.query?.radius,
      freshnessHours: req.body?.freshness_hours || req.query?.freshness_hours,
      referenceTime: req.body?.reference_time || req.query?.reference_time,
    };

    if (!params.query && (params.latitude === undefined || params.longitude === undefined)) {
      return res.status(400).json({
        error: {
          message: "Either 'query' or ('latitude' and 'longitude') must be provided for location lookup.",
        },
      });
    }

    const result = await lookupLocationAirQuality(params);
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
