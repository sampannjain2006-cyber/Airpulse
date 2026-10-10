import { syncStations, syncLatestReadings } from '../services/ingestion/ingestionService.js';
import { isConfigured } from '../services/ingestion/openaqProvider.js';

async function runSync() {
  console.log('[AirPulse Sync] Starting environmental data sync...');

  if (!isConfigured()) {
    console.log('[AirPulse Sync] Notice: OPENAQ_API_KEY is not configured in environment.');
    console.log('[AirPulse Sync] Set OPENAQ_API_KEY in server/.env to sync real OpenAQ India data.');
    console.log('[AirPulse Sync] Free key registration: https://openaq.org/register');
  }

  const stationResults = await syncStations();
  console.log('[AirPulse Sync] Station sync results:', JSON.stringify(stationResults, null, 2));

  const readingResults = await syncLatestReadings();
  console.log('[AirPulse Sync] Readings sync results:', JSON.stringify(readingResults, null, 2));

  console.log('[AirPulse Sync] Completed.');
  process.exit(0);
}

runSync().catch((err) => {
  console.error('[AirPulse Sync] Fatal error during sync:', err);
  process.exit(1);
});
