import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../../database/migrations');

async function runMigrations() {
  const pool = getPool();
  if (!pool) {
    console.error('[AirPulse Migrate] Error: DATABASE_URL is not configured in server/.env');
    process.exit(1);
  }

  let client;
  try {
    client = await pool.connect();
    console.log('[AirPulse Migrate] Connected to PostgreSQL. Reading migrations from:', migrationsDir);

    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`[AirPulse Migrate] Running ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`[AirPulse Migrate] ✓ ${file} applied successfully.`);
    }

    console.log('[AirPulse Migrate] All migrations applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[AirPulse Migrate] Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

runMigrations();
