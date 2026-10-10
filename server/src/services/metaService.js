import { checkDatabaseHealth } from '../config/db.js';

export async function getSystemStatus() {
  const dbHealth = await checkDatabaseHealth();

  const isFullyOperational = dbHealth.status === 'connected';

  return {
    status: isFullyOperational ? 'ok' : 'degraded',
    service: 'airpulse-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  };
}
