import {
  POLLUTANT_CATALOG,
  getCatalogItem,
  listSupportedPollutants,
} from '../config/pollutantCatalog.js';

export function getAllPollutants() {
  const items = listSupportedPollutants();
  return {
    status: 'success',
    count: items.length,
    supported_pollutant_ids: Object.keys(POLLUTANT_CATALOG),
    data: items,
  };
}

export function getPollutantById(pollutantId) {
  if (!pollutantId || typeof pollutantId !== 'string') {
    const err = new Error('Pollutant identifier is required.');
    err.statusCode = 400;
    throw err;
  }

  const item = getCatalogItem(pollutantId);
  if (!item) {
    const err = new Error(
      `Unsupported pollutant '${pollutantId}'. AIRPULSE supports: ${Object.keys(POLLUTANT_CATALOG).join(', ')}.`
    );
    err.statusCode = 404;
    throw err;
  }

  return {
    status: 'success',
    data: item,
  };
}
