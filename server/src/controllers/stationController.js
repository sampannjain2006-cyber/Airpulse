import { listStations, getStation } from '../services/stationService.js';

export async function getAllStations(req, res, next) {
  try {
    const { city, state, limit, scope, dashboard_only } = req.query;
    const dashboardOnly = dashboard_only !== undefined ? (dashboard_only === 'true' || dashboard_only === '1') : undefined;
    const result = await listStations({ city, state, limit, scope, dashboardOnly });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStationById(req, res, next) {
  try {
    const station = await getStation(req.params.id);
    res.json(station);
  } catch (err) {
    next(err);
  }
}
