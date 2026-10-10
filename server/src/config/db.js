import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    if (!env.DATABASE_URL) {
      console.warn('[AirPulse DB] DATABASE_URL is not set. Database features will be unavailable.');
      return null;
    }

    pool = new Pool({
      connectionString: env.DATABASE_URL,
    });

    pool.on('error', (err) => {
      console.error('[AirPulse DB] Unexpected pool error:', err.message);
    });
  }

  return pool;
}

export async function checkDatabaseHealth() {
  const dbPool = getPool();

  if (!dbPool) {
    return {
      status: 'unavailable',
      message: 'DATABASE_URL is not configured',
    };
  }

  let client;
  try {
    client = await dbPool.connect();

    // Check basic connectivity
    const timeResult = await client.query('SELECT NOW() AS server_time');

    // Check PostGIS extension
    const postgisResult = await client.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis'"
    );

    const postgisAvailable = postgisResult.rows.length > 0;

    return {
      status: 'connected',
      serverTime: timeResult.rows[0].server_time,
      postgis: postgisAvailable
        ? { available: true, version: postgisResult.rows[0].extversion }
        : { available: false },
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.message,
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}
