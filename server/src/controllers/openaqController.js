import {
  syncOpenAQLocations,
  getOpenAQLocationsList,
  getOpenAQLocationDetails,
  searchNearbyOpenAQLocations,
  getOpenAQCoverage,
} from '../services/openaqService.js';

export async function getLocations(req, res, next) {
  try {
    const { page, limit, city, state, search, dashboard_only } = req.query;
    const result = await getOpenAQLocationsList({
      page,
      limit,
      city,
      state,
      search,
      dashboardOnly: dashboard_only === 'true' || dashboard_only === '1',
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getLocationById(req, res, next) {
  try {
    const result = await getOpenAQLocationDetails(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getNearby(req, res, next) {
  try {
    const latitude = req.query.lat ?? req.query.latitude;
    const longitude = req.query.lon ?? req.query.longitude;
    const radiusMeters = req.query.radius ?? req.query.radius_meters;
    const limit = req.query.limit;

    const result = await searchNearbyOpenAQLocations({
      latitude,
      longitude,
      radiusMeters,
      limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCoverage(req, res, next) {
  try {
    const result = await getOpenAQCoverage();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function syncLocations(req, res, next) {
  try {
    const maxLocations = req.body?.max_locations || req.query.max_locations || 1000;
    const pageSize = req.body?.page_size || req.query.page_size || 100;
    const result = await syncOpenAQLocations({
      maxLocations: parseInt(maxLocations, 10),
      pageSize: parseInt(pageSize, 10),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
