import { getAllPollutants, getPollutantById } from '../services/pollutantService.js';

export async function listPollutants(req, res, next) {
  try {
    const result = getAllPollutants();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPollutant(req, res, next) {
  try {
    const { id } = req.params;
    const result = getPollutantById(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
