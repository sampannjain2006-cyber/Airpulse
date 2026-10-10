import {
  getLatestObservations,
  getObservations,
  getObservationHistory,
  getObservationsSnapshot,
  getDateRange,
} from '../services/observationService.js';

export async function listLatestObservations(req, res, next) {
  try {
    const { city, limit } = req.query;
    const result = await getLatestObservations({ city, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listObservations(req, res, next) {
  try {
    const { station_id, from, to, limit } = req.query;
    const result = await getObservations({ stationId: station_id, from, to, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listObservationHistory(req, res, next) {
  try {
    const { station_id, from, to, limit } = req.query;
    const result = await getObservationHistory({ stationId: station_id, from, to, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getObservationSnapshot(req, res, next) {
  try {
    const { date } = req.query;
    const result = await getObservationsSnapshot(date);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getObservationDateRange(req, res, next) {
  try {
    const result = await getDateRange();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

