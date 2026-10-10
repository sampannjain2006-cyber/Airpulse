import { getPool } from '../server/src/config/db.js';
import { findAllStations } from '../server/src/models/stationModel.js';
import { findLatestObservations } from '../server/src/models/observationModel.js';
import { getHotspots } from '../server/src/services/hotspotService.js';
import { resolveLocation, isGoogleConfigured } from '../server/src/services/googleService.js';
import { getSeverity } from '../server/src/utils/severityEngine.js';
import { getAllPollutants, getPollutantById } from '../server/src/services/pollutantService.js';

async function runRegression() {
  console.log('=== AIRPULSE COMPREHENSIVE REGRESSION & AUDIT SUITE ===\n');
  const pool = getPool();
  let passed = 0;
  let total = 10;

  try {
    // 1. Original 40-station dashboard & expanded registry
    console.log('[Audit 1] Monitoring Stations in Database...');
    const dashboardStations = await findAllStations({ limit: 1000, dashboardOnly: true });
    const allStations = await findAllStations({ limit: 1000, dashboardOnly: false });
    if (allStations.length >= 760 && dashboardStations.length >= 40) {
      console.log(`✅ Audit 1 Passed: Found ${allStations.length} total stations, with ${dashboardStations.length} primary dashboard monitoring stations.`);
      passed++;
    } else {
      console.error(`❌ Audit 1 Failed: Expected >= 760 stations, found ${allStations.length}`);
    }

    // 2. Observations and Real Data
    console.log('\n[Audit 2] Observations pipeline integrity...');
    const latestObs = await findLatestObservations({ limit: 50 });
    if (latestObs.length > 0 && latestObs[0].source && latestObs[0].recorded_at) {
      console.log(`✅ Audit 2 Passed: Retrieved ${latestObs.length} latest observations with valid source (${latestObs[0].source}) and timestamp.`);
      passed++;
    } else {
      console.error('❌ Audit 2 Failed: No observations returned.');
    }

    // 3. OpenAQ Proximity & Location Lookup
    console.log('\n[Audit 3] Location lookup & PostGIS proximity check...');
    // Testing with preset city Agra (present in geographic reference fallback)
    const locRes = await resolveLocation('Agra');
    if (locRes && locRes.found && locRes.latitude && locRes.longitude) {
      console.log(`✅ Audit 3 Passed: Location resolved to "${locRes.canonical_name}" (${locRes.latitude.toFixed(4)}, ${locRes.longitude.toFixed(4)}) via ${locRes.resolution_source}.`);
      passed++;
    } else {
      console.error('❌ Audit 3 Failed:', locRes);
    }

    // 4. Hotspot Detection - Observed vs Forecast Separation
    console.log('\n[Audit 4] Hotspot detection separation...');
    const obsHotspots = await getHotspots({ date: '2026-10-02', mode: 'observed' });
    const fcHotspots = await getHotspots({ date: '2026-10-03', mode: 'forecast' });
    const obsTypes = obsHotspots.hotspots.map(h => h.data_type);
    const fcTypes = fcHotspots.hotspots.map(h => h.data_type);
    if (obsTypes.every(t => t === 'observed') && fcTypes.every(t => t === 'predicted')) {
      console.log(`✅ Audit 4 Passed: Observed hotspots (${obsHotspots.hotspots.length}) and Forecast hotspots (${fcHotspots.hotspots.length}) remain strictly separated.`);
      passed++;
    } else {
      console.error('❌ Audit 4 Failed: Hotspot data_type mixed up:', { obsTypes, fcTypes });
    }

    // 5. 5-Day Forecast Horizon Restriction Enforcement
    console.log('\n[Audit 5] 5-Day forecast horizon enforcement...');
    let day6Rejected = false;
    try {
      await getHotspots({ date: '2026-10-15', mode: 'forecast' });
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('5-day')) {
        day6Rejected = true;
      }
    }
    if (day6Rejected) {
      console.log('✅ Audit 5 Passed: Day 6+ forecast request (2026-10-15) strictly rejected with HTTP 400.');
      passed++;
    } else {
      console.error('❌ Audit 5 Failed: Forecast horizon restriction not enforced.');
    }

    // 6. Severity Engine Sole Authority Check
    console.log('\n[Audit 6] Severity Engine sole authority check...');
    const sevPM = getSeverity('pm25', 180, false);
    const sevCO = getSeverity('co', 15, false);
    if (sevPM.category === 'Very Poor' && sevPM.severity_level === 5 && sevCO.category === 'Poor' && sevCO.severity_level === 4) {
      console.log(`✅ Audit 6 Passed: PM2.5 180 -> ${sevPM.category} (Tier 5), CO 15 -> ${sevCO.category} (Tier 4) correctly evaluated.`);
      passed++;
    } else {
      console.error('❌ Audit 6 Failed:', { sevPM, sevCO });
    }

    // 7. Pollutants API Endpoints
    console.log('\n[Audit 7] Pollutant Catalog API Service...');
    const catalogAll = getAllPollutants();
    const singlePM = getPollutantById('pm25');
    if (catalogAll.count === 6 && singlePM.data.symbol === 'PM2.5') {
      console.log(`✅ Audit 7 Passed: Pollutant catalog service operational (count: ${catalogAll.count}, item: ${singlePM.data.displayName}).`);
      passed++;
    } else {
      console.error('❌ Audit 7 Failed:', { catalogAll, singlePM });
    }

    // 8. Distinction between Concentration and AQI
    console.log('\n[Audit 8] Concentration vs AQI verification...');
    const rawVal = 180; // PM2.5 concentration in ug/m3
    const subIndex = sevPM.aqi_sub_index; // Normalized CPCB sub-index
    if (rawVal !== subIndex && subIndex >= 300) {
      console.log(`✅ Audit 8 Passed: Raw concentration (${rawVal} µg/m³) is distinct from CPCB sub-index (${subIndex}).`);
      passed++;
    } else {
      console.error('❌ Audit 8 Failed: Raw concentration treated as AQI:', { rawVal, subIndex });
    }

    // 9. Provenance Labeling
    console.log('\n[Audit 9] Provenance labeling consistency...');
    const obsSev = getSeverity('pm25', 50, false);
    const predSev = getSeverity('pm25', 50, true, 'weighted_ensemble');
    if (obsSev.is_predicted === false && predSev.is_predicted === true && predSev.model_name === 'weighted_ensemble') {
      console.log('✅ Audit 9 Passed: Provenance tags (Observed vs Predicted) preserved cleanly.');
      passed++;
    } else {
      console.error('❌ Audit 9 Failed:', { obsSev, predSev });
    }

    // 10. Database Schema and Records Intact
    console.log('\n[Audit 10] Database table existence and integrity...');
    const dbTables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('monitoring_stations', 'environmental_observations', 'predictions', 'system_info')
    `);
    if (dbTables.rows.length === 4) {
      console.log(`✅ Audit 10 Passed: All 4 core tables exist and are intact.`);
      passed++;
    } else {
      console.error('❌ Audit 10 Failed: Core tables missing:', dbTables.rows);
    }

  } catch (err) {
    console.error('Fatal error during regression run:', err);
  } finally {
    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed}/${total} AUDIT CHECKS PASSED`);
    console.log(`========================================\n`);
    await pool.end();
    process.exit(passed === total ? 0 : 1);
  }
}

runRegression();
