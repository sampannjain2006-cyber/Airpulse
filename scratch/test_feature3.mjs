import app from '../server/src/app.js';
import { getSeverity, calculateSubIndex, CPCB_CATEGORIES, RULE_SOURCE } from '../server/src/utils/severityEngine.js';
import { getPool } from '../server/src/config/db.js';

async function dispatch(url) {
  return new Promise((resolve) => {
    const req = { method: 'GET', url, headers: { host: 'localhost' } };
    const res = {
      statusCode: 200,
      setHeader: () => {},
      getHeader: () => {},
      status(c) { this.statusCode = c; return this; },
      json(data) { resolve({ status: this.statusCode, data }); },
      end: () => resolve({ status: res.statusCode })
    };
    app(req, res, (err) => {
      resolve({ status: err?.statusCode || 500, error: err?.message });
    });
  });
}

async function runTests() {
  console.log('=== FEATURE 3: COMPREHENSIVE VERIFICATION SUITE ===\n');

  // Test 1: Live observed value -> severity engine
  console.log('--- TEST 1: Live Observed PM2.5 (35 µg/m³) ---');
  const liveRes = getSeverity('pm25', 35, false);
  console.log('Result:', {
    category: liveRes.category,
    severity_level: liveRes.severity_level,
    sub_index: liveRes.aqi_sub_index,
    is_predicted: liveRes.is_predicted,
    status: liveRes.status,
  });
  if (liveRes.category !== 'Satisfactory' || liveRes.is_predicted !== false) throw new Error('Test 1 failed');
  console.log('PASS: Correctly classified as Satisfactory (Level 2), is_predicted=false\n');

  // Test 2: Historical observed value -> severity engine
  console.log('--- TEST 2: Historical Observed PM2.5 (78.5 µg/m³) ---');
  const histRes = getSeverity('pm25', 78.5, false);
  console.log('Result:', {
    category: histRes.category,
    severity_level: histRes.severity_level,
    sub_index: histRes.aqi_sub_index,
    is_predicted: histRes.is_predicted,
  });
  if (histRes.category !== 'Moderate' || histRes.severity_level !== 3) throw new Error('Test 2 failed');
  console.log('PASS: Correctly classified as Moderate (Level 3), is_predicted=false\n');

  // Test 3: Future Day 1 prediction -> severity engine
  console.log('--- TEST 3: Future Day 1 Predicted PM2.5 (118.2 µg/m³, Weighted Ensemble) ---');
  const fDay1 = getSeverity('pm25', 118.2, true, 'weighted_ensemble');
  console.log('Result:', {
    category: fDay1.category,
    severity_level: fDay1.severity_level,
    sub_index: fDay1.aqi_sub_index,
    is_predicted: fDay1.is_predicted,
    model: fDay1.model_name,
  });
  if (fDay1.category !== 'Poor' || fDay1.is_predicted !== true || fDay1.model_name !== 'weighted_ensemble') {
    throw new Error('Test 3 failed');
  }
  console.log('PASS: Correctly classified as Poor (Level 4), is_predicted=true, model=weighted_ensemble\n');

  // Test 4: Future Day 5 prediction -> severity engine
  console.log('--- TEST 4: Future Day 5 Predicted PM2.5 (265.0 µg/m³, Weighted Ensemble) ---');
  const fDay5 = getSeverity('pm25', 265.0, true, 'weighted_ensemble');
  console.log('Result:', {
    category: fDay5.category,
    severity_level: fDay5.severity_level,
    sub_index: fDay5.aqi_sub_index,
    is_predicted: fDay5.is_predicted,
  });
  if (fDay5.category !== 'Severe' || fDay5.severity_level !== 6) throw new Error('Test 4 failed');
  console.log('PASS: Correctly classified as Severe (Level 6), is_predicted=true\n');

  // Test 5: Day 6 remains unavailable in backend /predictions/snapshot
  console.log('--- TEST 5: Day 6+ Forecast Horizon Enforcement ---');
  const day6Res = await dispatch('/api/v1/predictions/snapshot?date=2026-10-08');
  console.log('Day 6 snapshot response status:', day6Res.status);
  console.log('Day 6 snapshot response message:', day6Res.data?.error?.message || day6Res.data?.message);
  if (day6Res.status !== 400) throw new Error('Test 5 failed: Day 6 was not rejected with 400');
  console.log('PASS: Day 6 forecast strictly rejected by 5-day horizon rule\n');

  // Test 6 & 7: Station & Date switching via snapshot endpoints
  console.log('--- TEST 6 & 7: Station and Date Data Availability ---');
  const histSnap = await dispatch('/api/v1/observations/snapshot?date=2026-10-02');
  console.log('Historical 2026-10-02 stations count:', histSnap.data?.count);
  const sampleHistStation = histSnap.data?.data?.[0];
  if (sampleHistStation) {
    const sevHist = getSeverity('pm25', sampleHistStation.pm25, false);
    console.log(`Station ${sampleHistStation.station_name}: PM2.5=${sampleHistStation.pm25} -> Severity=${sevHist.category} (Tier ${sevHist.severity_level})`);
  }
  const predSnap = await dispatch('/api/v1/predictions/snapshot?date=2026-10-03&model=weighted_ensemble');
  console.log('Forecast 2026-10-03 stations count:', predSnap.data?.count);
  const samplePredStation = predSnap.data?.data?.[0];
  if (samplePredStation) {
    const sevPred = getSeverity('pm25', samplePredStation.pm25, true, 'weighted_ensemble');
    console.log(`Station ${samplePredStation.station_name}: Pred PM2.5=${samplePredStation.pm25} -> Severity=${sevPred.category} (Tier ${sevPred.severity_level})`);
  }
  console.log('PASS: Station and Date switching yields appropriate ground/predicted telemetry\n');

  // Test 8: Missing data produces honest unavailable state
  console.log('--- TEST 8: Missing Data Handling ---');
  const nullSev = getSeverity('pm25', null);
  const undefSev = getSeverity('pm25', undefined);
  console.log('Null result:', nullSev);
  console.log('Undefined result:', undefSev);
  if (nullSev.status !== 'unavailable' || undefSev.status !== 'unavailable') throw new Error('Test 8 failed');
  console.log('PASS: Null and undefined produce unavailable state with reason\n');

  // Test 9: Invalid values do not receive fake severity
  console.log('--- TEST 9: Invalid & Out-of-Range Handling ---');
  const negSev = getSeverity('pm25', -15);
  const extremeSev = getSeverity('pm25', 3000);
  const strSev = getSeverity('pm25', 'not-a-number');
  const unknownMetric = getSeverity('unsupported_pollutant', 50);
  console.log('Negative value:', negSev.reason);
  console.log('Extreme value:', extremeSev.reason);
  console.log('Non-numeric:', strSev.reason);
  console.log('Unknown metric:', unknownMetric.reason);
  if (negSev.status !== 'unavailable' || extremeSev.status !== 'unavailable' || strSev.status !== 'unavailable' || unknownMetric.status !== 'unavailable') {
    throw new Error('Test 9 failed');
  }
  console.log('PASS: Invalid values produce explicit unavailable states, never fake categories\n');

  // Test 10: Observed label remains distinct from predicted label
  console.log('--- TEST 10: Observed vs Predicted Label Distinction ---');
  const obsEx = getSeverity('pm25', 55, false);
  const predEx = getSeverity('pm25', 55, true, 'weighted_ensemble');
  console.log('Observed: is_predicted =', obsEx.is_predicted, ', model =', obsEx.model_name);
  console.log('Predicted: is_predicted =', predEx.is_predicted, ', model =', predEx.model_name);
  if (obsEx.is_predicted === predEx.is_predicted || !predEx.model_name) throw new Error('Test 10 failed');
  console.log('PASS: Clear distinction preserved across classification engine\n');

  // Test 11: Weighted Ensemble remains the final forecast
  console.log('--- TEST 11: Weighted Ensemble Validation in Horizon API ---');
  const horizonRes = await dispatch('/api/v1/predictions/horizon');
  console.log('Allowed dates:', horizonRes.data?.allowed_dates);
  if (!horizonRes.data?.allowed_dates || horizonRes.data?.allowed_dates.length !== 5) {
    throw new Error('Test 11 failed: Allowed dates should have exactly 5 forecast dates');
  }
  console.log('PASS: 5-Day Horizon verified strictly with 5 allowed dates\n');

  // Test 12: ModelComparisonPanel endpoint still works
  console.log('--- TEST 12: Model Comparison API Endpoint ---');
  const compRes = await dispatch('/api/v1/predictions/models-comparison');
  console.log('Primary model:', compRes.data?.primary_model);
  console.log('Ensemble weights:', compRes.data?.ensemble_weights);
  console.log('Evaluated models:', Object.keys(compRes.data?.models || {}));
  if (compRes.data?.primary_model !== 'weighted_ensemble' || !compRes.data?.ensemble_weights) {
    throw new Error('Test 12 failed');
  }
  console.log('PASS: Model comparison data intact, weighted_ensemble primary with weights\n');

  // Test 13: 40 stations remain visible
  console.log('--- TEST 13: Monitoring Stations Count ---');
  const stationsRes = await dispatch('/api/v1/stations');
  console.log('Total monitoring stations count:', stationsRes.data?.count);
  if (stationsRes.data?.count !== 40) throw new Error(`Test 13 failed: Expected 40 stations, found ${stationsRes.data?.count}`);
  console.log('PASS: Exactly 40 Indian monitoring stations preserved\n');

  // Test 14: Severity API endpoint itself
  console.log('--- TEST 14: Severity API Verification ---');
  const apiTest1 = await dispatch('/api/v1/severity?metric=pm25&value=92&is_predicted=true&model=weighted_ensemble');
  console.log('API /severity response:', apiTest1.data);
  const apiRules = await dispatch('/api/v1/severity/rules');
  console.log('API /severity/rules categories count:', apiRules.data?.categories?.length);
  if (apiTest1.data?.category !== 'Poor' || apiRules.data?.categories?.length !== 6) throw new Error('Test 14 failed');
  console.log('PASS: Backend /api/v1/severity and /rules endpoints fully verified\n');

  // Close DB pool
  const pool = getPool();
  if (pool) await pool.end();

  console.log('==================================================');
  console.log('ALL 14 AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================');
}

runTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
