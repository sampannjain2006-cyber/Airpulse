/**
 * AIRPULSE — Industrial Waste Reuse & Pollution Prevention Controller
 */

import {
  getWasteStreams,
  getWasteStream,
  getWasteMetadata as fetchMetadata,
} from '../services/wasteReuseService.js';

export async function listWasteStreams(req, res, next) {
  try {
    const { category, origin, receiving, search } = req.query;
    const result = getWasteStreams({ category, origin, receiving, search });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getWasteStreamById(req, res, next) {
  try {
    const { id } = req.params;
    const result = getWasteStream(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getWasteMetadata(req, res, next) {
  try {
    const result = fetchMetadata();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
