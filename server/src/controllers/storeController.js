/**
 * AIRPULSE — Pollution Protection & Accessories Store Controller
 */

import {
  getStoreCatalog,
  getProductDetail,
  getDestinationStoreRecommendations,
} from '../services/storeService.js';

export async function listStoreProducts(req, res, next) {
  try {
    const { category, pollutant, is_pollution_triggered } = req.query;
    const result = getStoreCatalog({ category, pollutant, is_pollution_triggered });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStoreProduct(req, res, next) {
  try {
    const { id } = req.params;
    const result = getProductDetail(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getStoreRecommendations(req, res, next) {
  try {
    const result = await getDestinationStoreRecommendations(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
