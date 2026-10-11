import { listStations, getStation, getStationHierarchy } from '../services/stationService.js';

export async function getAllStations(req, res, next) {
  try {
    const { city, state, limit, scope, dashboard_only } = req.query;
    const hasLocationFilter = Boolean((city && city !== 'all') || (state && state !== 'all'));
    let dashboardOnly;
    if (dashboard_only !== undefined) {
      dashboardOnly = (dashboard_only === 'true' || dashboard_only === '1');
    } else {
      dashboardOnly = !hasLocationFilter;
    }
    const cleanCity = city && city !== 'all' ? city : undefined;
    const cleanState = state && state !== 'all' ? state : undefined;
    const parsedLimit = limit ? parseInt(limit, 10) : (hasLocationFilter ? 500 : 200);

    const result = await listStations({
      city: cleanCity,
      state: cleanState,
      limit: parsedLimit,
      scope,
      dashboardOnly,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStationHierarchyHandler(req, res, next) {
  try {
    const result = await getStationHierarchy();
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
