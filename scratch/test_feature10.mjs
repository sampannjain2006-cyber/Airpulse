/**
 * Feature 10 Verification Suite
 * Validates Context-Aware Precaution Recommendations across all 15 test criteria.
 */

const BASE_URL = 'http://localhost:3001/api/v1';

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const json = await res.json();
  return { status: res.status, ok: res.ok, data: json };
}

async function runTests() {
  console.log('================================================================');
  console.log('   AIRPULSE FEATURE 10: PRECAUTION RECOMMENDATIONS TESTS');
  console.log('================================================================\n');

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

  // 1. Valid observed context produces only relevant recommendations
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=140&mode=live');
    const valid = res.ok &&
                  res.data.status === 'success' &&
                  res.data.context.severity.level === 5 &&
                  res.data.context.severity.category === 'Very Poor' &&
                  res.data.recommendations.length > 0 &&
                  res.data.recommendations.every(r => r.applicable_pollutant === 'PM25' || r.applicable_pollutant === 'GENERAL');
    assert(valid, `Check 1: Valid observed context produces relevant recommendations (${res.data.recommendations?.length} recommendations for PM2.5 140 µg/m³)`);
  } catch (err) {
    assert(false, 'Check 1 failed', err.message);
  }

  // 2. Missing or stale observations do not generate false current advice
  try {
    const res = await fetchJson('/recommendations?station_id=999999');
    const valid = res.ok &&
                  res.data.status === 'unavailable' &&
                  res.data.count === 0 &&
                  res.data.recommendations.length === 0 &&
                  typeof res.data.reason === 'string';
    assert(valid, `Check 2: Missing observations produce honest unavailable state without false advice ("${res.data.reason}")`);
  } catch (err) {
    assert(false, 'Check 2 failed', err.message);
  }

  // 3. Modelled results retain their modelled status
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=110&data_type=modelled');
    const valid = res.ok &&
                  res.data.context.data_type === 'modelled' &&
                  res.data.context.is_modelled === true &&
                  res.data.context.context_label === 'GOOGLE MODELLED / SPATIALLY INTERPOLATED' &&
                  res.data.recommendations.every(r => r.context.is_modelled === true);
    assert(valid, 'Check 3: Modelled results retain honest modelled status and label (GOOGLE MODELLED / SPATIALLY INTERPOLATED)');
  } catch (err) {
    assert(false, 'Check 3 failed', err.message);
  }

  // 4. Forecast recommendations retain their predicted status and target date
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=130&mode=forecast&date=2026-10-04&model=weighted_ensemble');
    const valid = res.ok &&
                  res.data.context.is_predicted === true &&
                  res.data.context.model_name === 'weighted_ensemble' &&
                  res.data.context.date_or_timestamp === '2026-10-04' &&
                  res.data.recommendations.some(r => r.rule_id === 'rec-forecast-advance-preparation');
    assert(valid, 'Check 4: Forecast recommendations retain predicted status, target date (2026-10-04), and model name (weighted_ensemble)');
  } catch (err) {
    assert(false, 'Check 4 failed', err.message);
  }

  // 5. Day 6+ forecast requests remain rejected with HTTP 400
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&mode=forecast&date=2026-10-15');
    const valid = res.status === 400 && res.data.error?.message?.includes('outside the allowable 5-day predictive window');
    assert(valid, 'Check 5: Day 6+ forecast request (2026-10-15) strictly rejected with HTTP 400');
  } catch (err) {
    assert(false, 'Check 5 failed', err.message);
  }

  // 6. Historical recommendations are not presented as urgent current alerts
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=180&mode=historical&date=2026-09-30');
    const valid = res.ok &&
                  res.data.context.is_historical === true &&
                  res.data.context.context_label === 'HISTORICAL OBSERVATION (INACTIVE)' &&
                  res.data.recommendations.every(r => r.context.is_historical === true && !r.context.is_predicted);
    assert(valid, 'Check 6: Historical recommendations are flagged as historical/inactive, not urgent current alerts');
  } catch (err) {
    assert(false, 'Check 6 failed', err.message);
  }

  // 7. Unsupported / invalid pollutants produce an appropriate empty/unavailable state
  try {
    const res = await fetchJson('/recommendations?pollutant=voc_unknown&value=50');
    const valid = res.ok &&
                  res.data.status === 'unavailable' &&
                  res.data.count === 0 &&
                  res.data.recommendations.length === 0;
    assert(valid, `Check 7: Unsupported pollutant returns clean unavailable state with 0 recommendations`);
  } catch (err) {
    assert(false, 'Check 7 failed', err.message);
  }

  // 8. Invalid severity / physically impossible concentrations do not generate invented recommendations
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=8888');
    const valid = res.ok &&
                  res.data.status === 'unavailable' &&
                  res.data.reason?.includes('exceeds plausible atmospheric maximum') &&
                  res.data.count === 0;
    assert(valid, 'Check 8: Physically impossible concentration (8888 µg/m³) rejected with plausible maximum notice');
  } catch (err) {
    assert(false, 'Check 8 failed', err.message);
  }

  // 9. Source links and recommendation rules are traceable to CPCB / WHO
  try {
    const res = await fetchJson('/recommendations/rules');
    const valid = res.ok &&
                  res.data.status === 'success' &&
                  res.data.total_rules === 12 &&
                  res.data.sources.cpcb_naqi?.url &&
                  res.data.sources.who_aqg?.url &&
                  res.data.rules.every(r => r.source && r.source.name && r.source.url);
    assert(valid, `Check 9: All ${res.data.total_rules} rules have traceable authoritative citations (CPCB, WHO)`);
  } catch (err) {
    assert(false, 'Check 9 failed', err.message);
  }

  // 10. Duplicate and contradictory recommendations are avoided
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=150&mode=live');
    const ids = res.data.recommendations.map(r => r.rule_id);
    const uniqueIds = new Set(ids);
    const hasDuplicates = ids.length !== uniqueIds.size;
    const hasGoodAndSevere = ids.includes('rec-good-all') && (ids.includes('rec-severe-avoid-all-outdoors') || ids.includes('rec-verypoor-indoor-containment'));
    assert(!hasDuplicates && !hasGoodAndSevere, 'Check 10: Recommendations contain zero duplicates and zero contradictions');
  } catch (err) {
    assert(false, 'Check 10 failed', err.message);
  }

  // 11. Station context retrieval from database
  try {
    const res = await fetchJson('/recommendations?station_id=24&pollutant=pm10&mode=live');
    const valid = res.ok &&
                  res.data.status === 'success' &&
                  res.data.context.station?.name === 'Sanjay Palace, Agra - UPPCB' &&
                  res.data.context.station?.city === 'Agra';
    assert(valid, `Check 11: Real station context successfully retrieved from database (${res.data.context.station?.name})`);
  } catch (err) {
    assert(false, 'Check 11 failed', err.message);
  }

  // 12. Existing alerts and severity categories remain unchanged
  try {
    const resAlerts = await fetchJson('/alerts/rules');
    const validAlerts = resAlerts.ok &&
                        resAlerts.data.supported_thresholds.length === 6 &&
                        resAlerts.data.default_threshold === 'poor';
    assert(validAlerts, 'Check 12: Existing alerts engine & 6-tier CPCB thresholds remain unchanged and fully functional');
  } catch (err) {
    assert(false, 'Check 12 failed', err.message);
  }

  // 13. Existing DateNavigator date ranges intact
  try {
    const resDates = await fetchJson('/observations/date-range');
    const validDates = resDates.ok && resDates.data.min_date && resDates.data.max_date;
    assert(validDates, `Check 13: Observations date range intact (${resDates.data.min_date} to ${resDates.data.max_date})`);
  } catch (err) {
    assert(false, 'Check 13 failed', err.message);
  }

  // 14. Existing pollutant information catalog still works
  try {
    const resCatalog = await fetchJson('/pollutants');
    const validCatalog = resCatalog.ok && resCatalog.data.count === 6 && Array.isArray(resCatalog.data.data);
    assert(validCatalog, `Check 14: Pollutant catalog endpoint intact (${resCatalog.data.count} pollutants)`);
  } catch (err) {
    assert(false, 'Check 14 failed', err.message);
  }

  // 15. Standard medical and regulatory disclaimer present on all outputs
  try {
    const res = await fetchJson('/recommendations?pollutant=pm25&value=50');
    const validDisclaimer = res.ok &&
                            typeof res.data.disclaimer === 'string' &&
                            res.data.disclaimer.includes('do not constitute personalized medical diagnosis');
    assert(validDisclaimer, 'Check 15: Authoritative medical disclaimer present on all recommendation responses');
  } catch (err) {
    assert(false, 'Check 15 failed', err.message);
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed}/15 PASSED, ${failed}/15 FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
