import { syncHistoricalReadings } from '../services/ingestion/ingestionService.js';
import { isConfigured } from '../services/ingestion/openaqProvider.js';

async function runSyncHistory() {
  console.log('[AirPulse SyncHistory] Starting historical environmental data sync from OpenAQ v3...');

  if (!isConfigured()) {
    console.error('[AirPulse SyncHistory] Error: OPENAQ_API_KEY is not configured in server/.env');
    process.exit(1);
  }

  const results = await syncHistoricalReadings({ limit: 200 });
  console.log('[AirPulse SyncHistory] Results:', JSON.stringify(results, null, 2));
  console.log('[AirPulse SyncHistory] Completed successfully.');
  process.exit(0);
}

runSyncHistory().catch((err) => {
  console.error('[AirPulse SyncHistory] Fatal error during historical sync:', err);
  process.exit(1);
});
