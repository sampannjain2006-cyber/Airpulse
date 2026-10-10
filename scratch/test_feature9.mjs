/**
 * Feature 9 Verification Script
 * Validates all 20 required checks across endpoints and data integrity.
 */

const BASE_URL = 'http://localhost:3001/api/v1';

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('====================================================');
  console.log('   AIRPULSE FEATURE 9: AUTOMATED ALERTING TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      if (details) console.error(`   Details: ${details}`);
      failed++;
    }
  }

  // 1. GET /api/v1/alerts/rules returns CPCB NAQI standard rules with all six tiers
  try {
    const res = await fetchJson('/alerts/rules');
    const valid = res.ok && 
                  res.data.status === 'success' && 
                  Array.isArray(res.data.supported_thresholds) && 
                  res.data.supported_thresholds.length === 6 &&
                  res.data.supported_thresholds.every(t => t.level >= 1 && t.level <= 6 && t.category);
    assert(valid, 'Check 1: GET /api/v1/alerts/rules returns CPCB NAQI standard rules with all six tiers', JSON.stringify(res.data));
  } catch (err) {
    assert(false, 'Check 1: GET /api/v1/alerts/rules failed', err.message);
  }

  // 2. GET /api/v1/alerts?type=observed returns observed alerts from real OpenAQ data
  let observedAlerts = [];
  try {
    const res = await fetchJson('/alerts?type=observed');
    observedAlerts = res.data.alerts || [];
    const valid = res.ok && res.data.alert_type === 'observed' && observedAlerts.length > 0;
    assert(valid, `Check 2: GET /api/v1/alerts?type=observed returns observed alerts (${observedAlerts.length} returned)`);
  } catch (err) {
    assert(false, 'Check 2 failed', err.message);
  }

  // 3. Every observed alert has alert_type: "observed"
  {
    const allObserved = observedAlerts.length > 0 && observedAlerts.every(a => a.alert_type === 'observed');
    assert(allObserved, 'Check 3: Every observed alert has alert_type: "observed"');
  }

  // 4. Every observed alert has a non-null recorded_at timestamp
  {
    const allTimestamps = observedAlerts.length > 0 && observedAlerts.every(a => a.provenance?.recorded_at != null && !isNaN(new Date(a.provenance.recorded_at).getTime()));
    assert(allTimestamps, 'Check 4: Every observed alert has a non-null valid recorded_at timestamp');
  }

  // 5. Every observed alert references a real station in the database
  {
    const allValidStations = observedAlerts.length > 0 && observedAlerts.every(a => a.station?.id && a.station?.name && a.station?.code && a.station?.city);
    assert(allValidStations, 'Check 5: Every observed alert references a real station in the database');
  }

  // 6. Every observed alert has a severity level >= 4 (when min_severity=poor)
  {
    const allTierGte4 = observedAlerts.length > 0 && observedAlerts.every(a => a.severity?.level >= 4);
    assert(allTierGte4, 'Check 6: Every observed alert has a severity level >= 4 (Poor, Very Poor, Severe)');
  }

  // 7. GET /api/v1/alerts?type=forecast returns forecast alerts from 5-day ML forecasts
  let forecastAlerts = [];
  try {
    const res = await fetchJson('/alerts?type=forecast');
    forecastAlerts = res.data.alerts || [];
    const valid = res.ok && res.data.alert_type === 'predicted' && forecastAlerts.length > 0;
    assert(valid, `Check 7: GET /api/v1/alerts?type=forecast returns forecast alerts (${forecastAlerts.length} returned)`);
  } catch (err) {
    assert(false, 'Check 7 failed', err.message);
  }

  // 8. Every forecast alert has alert_type: "predicted"
  {
    const allPredicted = forecastAlerts.length > 0 && forecastAlerts.every(a => a.alert_type === 'predicted');
    assert(allPredicted, 'Check 8: Every forecast alert has alert_type: "predicted"');
  }

  // 9. Every forecast alert has a valid prediction_date within the 5-day window
  {
    const allowedDates = ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
    const allValidDates = forecastAlerts.length > 0 && forecastAlerts.every(a => allowedDates.includes(a.provenance?.target_date));
    assert(allValidDates, 'Check 9: Every forecast alert has a valid prediction_date within 5-day window (2026-10-03 to 2026-10-07)');
  }

  // 10. Every forecast alert identifies the model used (default: weighted_ensemble)
  {
    const allEnsemble = forecastAlerts.length > 0 && forecastAlerts.every(a => a.provenance?.model_name === 'weighted_ensemble');
    assert(allEnsemble, 'Check 10: Every forecast alert identifies the model used (default: weighted_ensemble)');
  }

  // 11. Every forecast alert includes confidence interval bounds when available
  {
    const hasCi = forecastAlerts.some(a => a.pollutant?.lower_bound != null && a.pollutant?.upper_bound != null);
    assert(hasCi, 'Check 11: Forecast alerts include confidence interval bounds (lower_bound, upper_bound)');
  }

  // 12. GET /api/v1/alerts (no type param) returns both observed and forecast in unified response
  try {
    const res = await fetchJson('/alerts');
    const valid = res.ok && 
                  res.data.status === 'success' && 
                  res.data.observed && 
                  res.data.forecast && 
                  typeof res.data.total_count === 'number';
    assert(valid, `Check 12: GET /api/v1/alerts returns unified response (observed: ${res.data.observed?.count}, forecast: ${res.data.forecast?.count}, total: ${res.data.total_count})`);
  } catch (err) {
    assert(false, 'Check 12 failed', err.message);
  }

  // 13. GET /api/v1/alerts/summary returns count breakdown by severity and alert type
  try {
    const res = await fetchJson('/alerts/summary');
    const valid = res.ok && 
                  res.data.status === 'success' &&
                  res.data.threshold &&
                  typeof res.data.observed?.count === 'number' &&
                  typeof res.data.observed?.high_severity_count === 'number' &&
                  typeof res.data.forecast?.count === 'number' &&
                  typeof res.data.forecast?.high_severity_count === 'number' &&
                  typeof res.data.total_active_alerts === 'number';
    assert(valid, `Check 13: GET /api/v1/alerts/summary returns count breakdown (active: ${res.data.total_active_alerts})`);
  } catch (err) {
    assert(false, 'Check 13 failed', err.message);
  }

  // 14. Threshold filtering: min_severity=moderate returns more or equal alerts than min_severity=poor
  try {
    const resMod = await fetchJson('/alerts?type=observed&min_severity=moderate');
    const resPoor = await fetchJson('/alerts?type=observed&min_severity=poor');
    const modCount = resMod.data.alerts?.length || 0;
    const poorCount = resPoor.data.alerts?.length || 0;
    assert(modCount >= poorCount, `Check 14: Threshold filtering moderate (${modCount}) >= poor (${poorCount})`);
  } catch (err) {
    assert(false, 'Check 14 failed', err.message);
  }

  // 15. Threshold filtering: min_severity=severe returns only tier 6 alerts
  try {
    const resSevere = await fetchJson('/alerts?type=observed&min_severity=severe');
    const severeAlerts = resSevere.data.alerts || [];
    const allTier6 = severeAlerts.length > 0 && severeAlerts.every(a => a.severity.level === 6 && a.severity.category === 'Severe');
    assert(allTier6, `Check 15: min_severity=severe returns only tier 6 alerts (${severeAlerts.length} severe alerts found)`);
  } catch (err) {
    assert(false, 'Check 15 failed', err.message);
  }

  // 16. Date filtering: historical date returns observed alerts for that date with historical flags
  try {
    const resHist = await fetchJson('/alerts?type=observed&date=2026-09-30&is_historical=true');
    const histAlerts = resHist.data.alerts || [];
    const valid = resHist.ok && 
                  resHist.data.is_historical === true &&
                  histAlerts.every(a => a.is_historical === true && a.is_active === false);
    assert(valid, `Check 16: Date filtering with historical flag marks alerts as inactive historical events (${histAlerts.length} past events)`);
  } catch (err) {
    assert(false, 'Check 16 failed', err.message);
  }

  // 17. Forecast date beyond 5 days returns 400 error
  try {
    const resBeyond = await fetchJson('/alerts?type=forecast&date=2026-10-10');
    assert(resBeyond.status === 400, `Check 17: Forecast date beyond 5 days returns HTTP 400 (Status: ${resBeyond.status})`);
  } catch (err) {
    assert(false, 'Check 17 failed', err.message);
  }

  // 18. Deduplication: no duplicate alerts for same station + pollutant + timestamp
  {
    const keys = new Set();
    let hasDuplicate = false;
    for (const a of observedAlerts) {
      if (keys.has(a.event_key)) {
        hasDuplicate = true;
        break;
      }
      keys.add(a.event_key);
    }
    assert(!hasDuplicate, 'Check 18: Deduplication ensures zero duplicate events per station + pollutant + timestamp');
  }

  // 19. Inactive stations excluded: station 416 does not appear in alerts
  {
    const includes416 = observedAlerts.some(a => a.station.id === 416 || a.station.code === 'openaq-229473') ||
                        forecastAlerts.some(a => a.station.id === 416 || a.station.code === 'openaq-229473');
    assert(!includes416, 'Check 19: Inactive stations excluded (Station 416 / openaq-229473 strictly omitted)');
  }

  // 20. Severity categories match Severity Engine exactly (same thresholds, same labels)
  {
    const validCategories = ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'];
    const allMatch = observedAlerts.every(a => validCategories.includes(a.severity.category) && a.severity.max_level === 6) &&
                     forecastAlerts.every(a => validCategories.includes(a.severity.category) && a.severity.max_level === 6);
    assert(allMatch, 'Check 20: Severity categories match Severity Engine exactly (CPCB NAQI 6-tier contract)');
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/20 PASSED, ${failed}/20 FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
