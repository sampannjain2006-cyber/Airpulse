/**
 * AIRPULSE — Industrial Waste Reuse & Pollution Prevention Service
 * Provides access to curated industrial by-product streams, regulatory standards,
 * and safety disclaimers.
 */

import {
  getAllWasteStreams,
  getWasteStreamById,
  filterWasteStreams,
  getCatalogMetadata,
  WASTE_REUSE_DISCLAIMERS,
} from '../config/wasteReuseCatalog.js';

export function getWasteStreams({ category, origin, receiving, search } = {}) {
  const data = filterWasteStreams({ category, origin, receiving, search });
  const meta = getCatalogMetadata();

  return {
    status: 'success',
    count: data.length,
    total_available: meta.total_entries,
    filters_applied: {
      category: category || 'all',
      origin: origin || 'all',
      receiving: receiving || 'all',
      search: search || null,
    },
    disclaimers: WASTE_REUSE_DISCLAIMERS,
    data,
  };
}

export function getWasteStream(id) {
  if (!id || typeof id !== 'string') {
    const err = new Error('Waste stream identifier is required.');
    err.statusCode = 400;
    throw err;
  }

  const stream = getWasteStreamById(id);
  if (!stream) {
    const all = getAllWasteStreams();
    const err = new Error(
      `Waste stream '${id}' not found in catalog. Available streams: ${all.map((s) => s.id).join(', ')}.`
    );
    err.statusCode = 404;
    throw err;
  }

  return {
    status: 'success',
    disclaimers: WASTE_REUSE_DISCLAIMERS,
    data: stream,
  };
}

export function getWasteMetadata() {
  const meta = getCatalogMetadata();
  return {
    status: 'success',
    metadata: meta,
    disclaimers: WASTE_REUSE_DISCLAIMERS,
  };
}
