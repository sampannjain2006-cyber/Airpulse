import { getSystemStatus } from '../services/metaService.js';

export async function getStatus(req, res, next) {
  try {
    const status = await getSystemStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
}
