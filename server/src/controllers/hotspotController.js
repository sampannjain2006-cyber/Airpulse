import { getHotspots } from '../services/hotspotService.js';

export async function getHotspotsHandler(req, res, next) {
  try {
    const {
      date,
      mode,
      model,
      threshold,
      eps,
      min_stations,
    } = req.query;

    const result = await getHotspots({
      date,
      mode,
      model,
      threshold,
      eps,
      minStations: min_stations,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
