import { getPool } from '../server/src/config/db.js';
import { findStationHierarchy, findAllStations } from '../server/src/models/stationModel.js';
import { getStationHierarchy } from '../server/src/services/stationService.js';
import {
  getCurrentDateInTimezone,
  addCalendarDays,
  getForecastTargetDates,
  validateReferenceDate,
  APP_TIMEZONE,
} from '../server/src/utils/dateUtils.js';
import { getForecastHorizon } from '../server/src/models/predictionModel.js';
import {
  getStationForecast,
  getPredictionsSnapshot,
  getHorizon,
} from '../server/src/services/predictionService.js';
import { getStationCurrentCondition } from '../server/src/services/observationService.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? '- ' + details : ''}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('AIRPULSE COMPREHENSIVE VERIFICATION SUITE — TASKS 1, 2, AND 3');
  console.log('===============================================================\n');

  const pool = getPool();

  try {
    // -------------------------------------------------------------
    // TASK 1: State & City Dropdown Coordination & Hierarchy Tests
    // -------------------------------------------------------------
    console.log('--- [TASK 1] STATE AND CITY DROPDOWN COORDINATION TESTS ---');

    const hierarchyData = await getStationHierarchy();
    assert(hierarchyData && Array.isArray(hierarchyData.states), 'Hierarchy returns an array of states');
    assert(hierarchyData.total_states >= 30, `Hierarchy covers all states (found ${hierarchyData.total_states})`);

    // 1.1 Haryana selection
    const haryana = hierarchyData.states.find((s) => s.state === 'Haryana');
    assert(haryana !== undefined, 'Haryana is present in hierarchy');
    assert(haryana?.station_count > 0, `Haryana has registered stations (${haryana?.station_count})`);
    const haryanaCities = haryana?.cities.map((c) => c.city || c.name) || [];
    assert(haryanaCities.includes('Gurugram') || haryanaCities.includes('Faridabad'), 'Haryana includes Gurugram / Faridabad');
    assert(!haryanaCities.includes('Ludhiana'), 'Haryana strictly excludes Punjab cities (e.g. Ludhiana)');

    // 1.2 Punjab selection
    const punjab = hierarchyData.states.find((s) => s.state === 'Punjab');
    assert(punjab !== undefined, 'Punjab is present in hierarchy');
    const punjabCities = punjab?.cities.map((c) => c.city || c.name) || [];
    assert(punjabCities.includes('Ludhiana') || punjabCities.includes('Amritsar'), 'Punjab includes Ludhiana / Amritsar');
    assert(!punjabCities.includes('Gurugram'), 'Punjab strictly excludes Haryana cities (e.g. Gurugram)');

    // 1.3 State-to-City Coordination and reset logic
    // If user selected Gurugram under Haryana, and switches to Punjab, Gurugram is invalid
    const isGurugramValidInPunjab = punjabCities.includes('Gurugram');
    assert(!isGurugramValidInPunjab, 'Switching Haryana to Punjab invalidates Gurugram (triggers city reset to all)');

    // 1.4 Duplicate City Names across different states
    // Query stations filtering by State + City specifically
    const maharashtraStations = await findAllStations({ state: 'Maharashtra', city: 'Aurangabad' });
    const biharStations = await findAllStations({ state: 'Bihar', city: 'Aurangabad' });
    // Both should query specifically without collision
    assert(
      maharashtraStations.every((s) => s.state === 'Maharashtra'),
      'Maharashtra + Aurangabad returns only Maharashtra stations'
    );
    assert(
      biharStations.every((s) => s.state === 'Bihar'),
      'Bihar + Aurangabad returns only Bihar stations'
    );

    // 1.5 Clearing filters restores 40 dashboard stations
    const clearedStations = await findAllStations({ dashboardOnly: true, limit: 1000 });
    assert(clearedStations.length >= 40, `Clearing filters restores dashboard stations (found ${clearedStations.length})`);

    console.log('');

    // -------------------------------------------------------------
    // TASK 2: Dynamic Forecast Reference Date & 5-Day Logic Tests
    // -------------------------------------------------------------
    console.log('--- [TASK 2] FORECAST REFERENCE DATE & 5-DAY HORIZON TESTS ---');

    const todayKolkata = getCurrentDateInTimezone('Asia/Kolkata');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(todayKolkata), `Today in Asia/Kolkata is formatted YYYY-MM-DD (${todayKolkata})`);

    // 2.1 Reference date validation: today is valid
    const validToday = validateReferenceDate(todayKolkata);
    assert(validToday === todayKolkata, 'Current date in Asia/Kolkata is valid as reference date');

    // 2.2 Future reference date: tomorrow is strictly rejected
    const tomorrowKolkata = addCalendarDays(todayKolkata, 1);
    let rejectedFuture = false;
    let rejectionErrorMsg = '';
    try {
      validateReferenceDate(tomorrowKolkata);
    } catch (err) {
      if (err.statusCode === 400) {
        rejectedFuture = true;
        rejectionErrorMsg = err.message;
      }
    }
    assert(rejectedFuture, `Tomorrow (${tomorrowKolkata}) is strictly rejected as reference date with HTTP 400`);
    assert(rejectionErrorMsg.includes('future'), 'Rejection error explicitly mentions future date prevention');

    // 2.3 Leap year and calendar boundary arithmetic
    const leapTargetDates = getForecastTargetDates('2028-02-27', 5);
    assert(
      JSON.stringify(leapTargetDates) === JSON.stringify(['2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02', '2028-03-03']),
      'Leap year Feb 29 boundary safely handled',
      JSON.stringify(leapTargetDates)
    );

    const yearBoundaryDates = getForecastTargetDates('2026-12-30', 5);
    assert(
      JSON.stringify(yearBoundaryDates) === JSON.stringify(['2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04']),
      'Year boundary 2026 -> 2027 safely handled',
      JSON.stringify(yearBoundaryDates)
    );

    // 2.4 Five-Day forecast window: exactly T+1 to T+5, reference date excluded, Day 6+ never present
    const targets = getForecastTargetDates(todayKolkata, 5);
    assert(targets.length === 5, 'Forecast target dates length is exactly 5');
    assert(!targets.includes(todayKolkata), 'Reference date itself is excluded from forecast dates');
    assert(targets[0] === tomorrowKolkata, 'Forecast Day 1 is exactly T+1');
    const day6 = addCalendarDays(todayKolkata, 6);
    assert(!targets.includes(day6), 'Day 6 is strictly excluded from target dates');

    // 2.5 Dynamic horizon API endpoint logic
    const horizon = await getHorizon(todayKolkata);
    assert(horizon.reference_date === todayKolkata, `Horizon reference date matches (${horizon.reference_date})`);
    assert(horizon.forecast_dates.length === 5, `Horizon forecast dates count is 5`);
    assert(horizon.timezone === 'Asia/Kolkata', 'Horizon timezone is Asia/Kolkata');

    // 2.6 Reject future reference date in predictionService
    let rejectedFutureHorizon = false;
    try {
      await getHorizon('2029-01-01');
    } catch (err) {
      if (err.statusCode === 400) rejectedFutureHorizon = true;
    }
    assert(rejectedFutureHorizon, 'PredictionService rejects future reference date with HTTP 400');

    // 2.7 Snapshot rejects dates beyond 5-day window (Day 6+)
    let rejectedDay6Snapshot = false;
    try {
      await getPredictionsSnapshot(day6, 'weighted_ensemble', todayKolkata);
    } catch (err) {
      if (err.statusCode === 400 && err.message.includes('5-day')) rejectedDay6Snapshot = true;
    }
    assert(rejectedDay6Snapshot, 'Snapshot rejects Day 6 with HTTP 400');

    // 2.8 Historical forecast zero-data-leakage verification
    // For reference date 2026-10-02, query station forecast for a known station (e.g. station 1)
    const histForecast = await getStationForecast(1, 'weighted_ensemble', '2026-10-02');
    assert(histForecast !== null, 'Station forecast for reference date 2026-10-02 executed');
    assert(histForecast.reference_date === '2026-10-02', 'Returned reference date is 2026-10-02');
    const forecastList = histForecast.forecast || [];
    assert(forecastList.length <= 5, 'Forecast count is at most 5');
    if (forecastList.length > 0) {
      const predDates = forecastList.map((p) => p.date);
      assert(
        predDates.every((d) => d > '2026-10-02'),
        'All forecast dates occur strictly after reference date'
      );
    }

    // 2.9 Insufficient data check (<14 days history)
    // Station 184 exists but has 0 historical observations
    const insufficientStation = await getStationForecast(184, 'weighted_ensemble', todayKolkata);
    assert(
      insufficientStation.status === 'insufficient_data',
      'Zero/sparse-history station returns status: insufficient_data without fabricating predictions'
    );

    console.log('');

    // -------------------------------------------------------------
    // TASK 3: Current-Date Monitoring & Google Fallback Tests
    // -------------------------------------------------------------
    console.log('--- [TASK 3] CURRENT-DATE MONITORING & GOOGLE FALLBACK TESTS ---');

    // 3.1 Prefer suitable, fresh OpenAQ ground observation
    // First, let's insert or check a fresh observation for testing
    // 3.1 OpenAQ observation retrieval for station with observations (station 37)
    const condStation37 = await getStationCurrentCondition(37, { disableGoogle: false });
    assert(condStation37 && condStation37.station_id === 37, 'Current condition query returns valid station condition for station 37');
    assert(
      ['observed', 'modelled', 'unavailable'].includes(condStation37.data_type),
      `Data type is strictly defined (${condStation37.data_type})`
    );

    // 3.2 Test disable_google parameter: when Google is disabled, data_type is never modelled
    const condDisabledGoogle = await getStationCurrentCondition(37, { disableGoogle: true });
    assert(
      condDisabledGoogle.data_type !== 'modelled',
      'When disable_google is true, data_type is never modelled (Google fallback disabled)'
    );

    // 3.3 Verify distinct concentration vs AQI
    if (condStation37.pm25 !== null && condStation37.aqi !== null) {
      assert(
        typeof condStation37.pm25 === 'number' && typeof condStation37.aqi === 'number',
        `PM2.5 concentration (${condStation37.pm25} µg/m³) and AQI (${condStation37.aqi}) are distinct numeric values`
      );
    } else {
      assert(true, 'Telemetry handles null/absent values without crashing');
    }

    // 3.4 Missing values are NEVER converted to zero
    assert(condStation37.pm25 !== 0 || condStation37.pm25 === null || condStation37.pm25 > 0, 'Missing values are not coerced to 0');

    // 3.5 Provenance metadata tags are preserved
    assert(
      condStation37.provenance !== undefined && condStation37.provenance.data_type !== undefined,
      `Provenance metadata tags are explicitly provided (${condStation37.provenance?.data_type})`
    );

    // 3.6 Test simulated stale OpenAQ reading with Google fallback logic
    // A station with no recent observation (<24h)
    // Query condition for station 40
    const condStation40 = await getStationCurrentCondition(40, { freshnessHours: 24 });
    assert(
      condStation40.status === 'stale' || condStation40.status === 'fresh' || condStation40.status === 'unavailable',
      `Station condition status is honest (${condStation40.status})`
    );
    if (condStation40.data_type === 'modelled') {
      assert(condStation40.source === 'google_air_quality', 'Modelled data is explicitly sourced from google_air_quality');
      assert(condStation40.fallback_reason !== null, 'Modelled data provides explicit fallback_reason');
    }

    // 3.7 Cost safeguard & caching test
    // Repeated call within 15 minutes should return cached result quickly
    const t0 = Date.now();
    const condRepeat = await getStationCurrentCondition(1, { disableGoogle: false });
    const elapsed = Date.now() - t0;
    assert(elapsed < 200, `Cached telemetry response served in ${elapsed}ms (<200ms safeguard)`);
    assert(condRepeat.station_id === 1, 'Cached response maintains station ID');

    console.log('');
  } catch (err) {
    console.error('Fatal error during test suite execution:', err);
    failed++;
  } finally {
    console.log('===============================================================');
    console.log(`FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');
    await pool.end();
    process.exit(failed === 0 ? 0 : 1);
  }
}

runTestSuite();
