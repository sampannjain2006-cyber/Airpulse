import { findAllStations, findStationById, findStationByCode, findStationHierarchy } from '../models/stationModel.js';

/**
 * List stations, optionally filtered.
 */
export async function listStations({ city, state, limit, scope, dashboardOnly } = {}) {
  const rows = await findAllStations({ city, state, limit, scope, dashboardOnly });
  return {
    count: rows.length,
    stations: rows,
  };
}

/**
 * Get state and city hierarchy for monitoring stations.
 */
export async function getStationHierarchy() {
  const states = await findStationHierarchy();
  return {
    total_states: states.length,
    states,
  };
}

export const listStationHierarchy = async () => (await getStationHierarchy()).states;

/**
 * Get a single station by ID or station_code.
 * Throws a 404-tagged error if not found.
 */
export async function getStation(idOrCode) {
  let station;

  const numericId = parseInt(idOrCode, 10);
  if (!isNaN(numericId) && String(numericId) === String(idOrCode)) {
    station = await findStationById(numericId);
  } else {
    station = await findStationByCode(idOrCode);
  }

  if (!station) {
    const err = new Error(`Station not found: ${idOrCode}`);
    err.statusCode = 404;
    throw err;
  }

  return station;
}
