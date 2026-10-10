import * as openaq from './openaqProvider.js';
import { upsertStation, findAllStations } from '../../models/stationModel.js';
import { upsertObservation } from '../../models/observationModel.js';

const PROVIDERS = [
  { name: 'openaq', provider: openaq },
];

/**
 * Sync real monitoring stations from configured providers.
 * Idempotent: safe to run repeatedly.
 */
export async function syncStations() {
  const results = [];

  for (const { name, provider } of PROVIDERS) {
    if (!provider.isConfigured()) {
      results.push({ provider: name, status: 'skipped', reason: 'not configured' });
      continue;
    }

    try {
      console.log(`[Ingestion] Fetching Indian monitoring stations from ${name}...`);
      const stations = await provider.fetchStations({ limit: 40 });
      let upserted = 0;
      for (const s of stations) {
        await upsertStation(s);
        upserted++;
      }
      console.log(`[Ingestion] Upserted ${upserted} stations from ${name}.`);
      results.push({ provider: name, status: 'ok', stationsUpserted: upserted });
    } catch (err) {
      console.error(`[Ingestion] syncStations error for ${name}:`, err.message);
      results.push({ provider: name, status: 'error', error: err.message });
    }
  }

  return results;
}

/**
 * Fetch and store the latest real measurements for all active stations.
 * Includes rate-limit pacing to respect external API limits.
 * Idempotent: safe to run repeatedly.
 */
export async function syncLatestReadings() {
  const stations = await findAllStations({ limit: 100 });
  const results = { totalStations: stations.length, observationsIngested: 0, stationsSkipped: 0, errors: [] };

  console.log(`[Ingestion] Processing latest measurements for ${stations.length} stations...`);

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const providerName = station.source_type === 'openaq' ? 'openaq' : null;
    if (!providerName) continue;

    const providerEntry = PROVIDERS.find((p) => p.name === providerName);
    if (!providerEntry || !providerEntry.provider.isConfigured()) continue;

    try {
      const readings = await providerEntry.provider.fetchLatestReadings(station.station_code);
      if (readings.length > 0) {
        for (const r of readings) {
          await upsertObservation({ ...r, station_id: station.id });
          results.observationsIngested++;
        }
      } else {
        results.stationsSkipped++;
      }
    } catch (err) {
      results.errors.push({ station_code: station.station_code, error: err.message });
    }

    // Rate-limit safety: 150ms pause between external station requests
    if (i < stations.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  console.log(`[Ingestion] Ingestion finished. Observations stored: ${results.observationsIngested}`);
  return results;
}

/**
 * Fetch and store historical daily measurements for all active stations.
 * Stores/caches daily observations locally in environmental_observations.
 * Idempotent: safe to run repeatedly without creating duplicate rows.
 */
export async function syncHistoricalReadings({ limit = 200 } = {}) {
  const stations = await findAllStations({ limit: 100 });
  const results = {
    totalStations: stations.length,
    stationsWithData: 0,
    observationsIngested: 0,
    errors: [],
  };

  console.log(`[Ingestion] Fetching historical observations for ${stations.length} stations (limit: ${limit} days)...`);

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const providerName = station.source_type === 'openaq' ? 'openaq' : null;
    if (!providerName) continue;

    const providerEntry = PROVIDERS.find((p) => p.name === providerName);
    if (!providerEntry || !providerEntry.provider.isConfigured()) continue;

    try {
      const readings = await providerEntry.provider.fetchHistoricalDailyReadings(
        station.station_code,
        { limit }
      );

      if (readings.length > 0) {
        results.stationsWithData++;
        for (const r of readings) {
          await upsertObservation({ ...r, station_id: station.id });
          results.observationsIngested++;
        }
        console.log(`[Ingestion] Station ${station.id} (${station.name}): saved ${readings.length} historical days.`);
      } else {
        console.log(`[Ingestion] Station ${station.id} (${station.name}): 0 historical daily records found.`);
      }
    } catch (err) {
      console.warn(`[Ingestion] Error fetching history for ${station.station_code}: ${err.message}`);
      results.errors.push({ station_code: station.station_code, error: err.message });
    }

    // Rate-limit safety: 150ms pause between station requests
    if (i < stations.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  console.log(
    `[Ingestion] Historical sync finished: ${results.stationsWithData}/${results.totalStations} stations populated with ${results.observationsIngested} observations.`
  );
  return results;
}

