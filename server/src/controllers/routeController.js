/**
 * AIRPULSE — Route Controller
 */

import { planRoute } from '../services/routeService.js';

export async function calculateRoutePlan(req, res, next) {
  try {
    const params = req.method === 'POST' ? req.body : req.query;

    let origin = params.origin;
    if (params.origin_lat !== undefined && params.origin_lon !== undefined) {
      origin = {
        latitude: parseFloat(params.origin_lat),
        longitude: parseFloat(params.origin_lon),
        name: params.origin_name,
      };
    }

    let destination = params.destination;
    if (params.destination_lat !== undefined && params.destination_lon !== undefined) {
      destination = {
        latitude: parseFloat(params.destination_lat),
        longitude: parseFloat(params.destination_lon),
        name: params.destination_name,
      };
    }

    const mode = params.mode || 'walking';
    const pollutant = params.pollutant || 'pm25';

    const result = await planRoute({
      origin,
      destination,
      mode,
      pollutant,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
