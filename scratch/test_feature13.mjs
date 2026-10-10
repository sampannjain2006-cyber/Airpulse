import fs from 'fs';

console.log('===============================================================');
console.log('   AIRPULSE FEATURE 13: POLLUTION-AWARE ROUTING AUDIT SUITE    ');
console.log('===============================================================\n');

let pass = 0;
let fail = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    pass++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) console.error(`   Details: ${details}`);
    fail++;
  }
}

const BASE_URL = 'http://localhost:3001/api/v1';

async function runTests() {
  try {
    // 1. Walking Route Plan via GET
    console.log('\n--- 1. Testing GET /api/v1/routes/plan (Walking Mode) ---');
    const getRes = await fetch(`${BASE_URL}/routes/plan?origin=Connaught%20Place&destination=India%20Gate&mode=walking&pollutant=pm25`);
    assert(getRes.status === 200, 'GET /routes/plan returns 200 OK', `Status was ${getRes.status}`);
    const getData = await getRes.json();
    assert(getData.success === true, 'Response payload has success: true');
    assert(getData.mode === 'walking', 'Response mode matches walking');
    assert(getData.target_pollutant === 'PM2.5', 'Target pollutant formatted as PM2.5');
    assert(Array.isArray(getData.routes) && getData.routes.length > 0, `Routes returned as array (count: ${getData.routes.length})`);
    assert(getData.origin.name.toLowerCase().includes('connaught'), `Origin resolved properly: ${getData.origin.name}`);
    assert(getData.destination.name.toLowerCase().includes('india gate'), `Destination resolved properly: ${getData.destination.name}`);
    
    // Check first route geometry and metrics
    const r0 = getData.routes[0];
    assert(r0.distance_km > 0, `Route 1 has valid distance_km: ${r0.distance_km} km`);
    assert(r0.duration_minutes > 0, `Route 1 has valid duration_minutes: ${r0.duration_minutes} min`);
    assert(r0.geometry && r0.geometry.type === 'LineString' && r0.geometry.coordinates.length > 2, 'Route 1 has GeoJSON LineString geometry');
    assert(r0.pollution_analysis !== undefined, 'Route 1 contains pollution_analysis object');
    assert(typeof r0.pollution_analysis.nearby_stations_count === 'number', `Nearby stations count is numeric: ${r0.pollution_analysis.nearby_stations_count}`);
    assert(r0.pollution_analysis.corridor_buffer_meters === 3000, 'Corridor buffer is exactly 3000 meters');
    assert(getData.comparison !== undefined, 'Response contains comparison object');
    assert(typeof getData.comparison.note === 'string', `Comparison note provided: "${getData.comparison.note}"`);

    // 2. Cycling Route Plan via POST
    console.log('\n--- 2. Testing POST /api/v1/routes/plan (Cycling Mode) ---');
    const postRes = await fetch(`${BASE_URL}/routes/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: 'Connaught Place',
        destination: 'India Gate',
        mode: 'cycling',
        pollutant: 'pm10',
      }),
    });
    assert(postRes.status === 200, 'POST /routes/plan returns 200 OK', `Status was ${postRes.status}`);
    const postData = await postRes.json();
    assert(postData.mode === 'cycling', 'Response mode matches cycling');
    assert(postData.target_pollutant === 'PM10', 'Target pollutant formatted as PM10');
    assert(postData.routes[0].duration_minutes < r0.duration_minutes, 'Cycling duration is less than walking duration for same route');

    // 3. Coordinate Inputs Test
    console.log('\n--- 3. Testing Coordinate Inputs (lat,lon to lat,lon) ---');
    const coordRes = await fetch(`${BASE_URL}/routes/plan?origin=28.6315,77.2167&destination=28.6129,77.2295&mode=walking`);
    assert(coordRes.status === 200, 'Coordinate inputs route planning returns 200 OK');
    const coordData = await coordRes.json();
    assert(Math.abs(coordData.origin.latitude - 28.6315) < 0.001, 'Origin coordinates preserved');
    assert(Math.abs(coordData.destination.latitude - 28.6129) < 0.001, 'Destination coordinates preserved');

    // 4. Verification of Disclaimers & Active Travel Health Advisory
    console.log('\n--- 4. Verification of Statutory Disclaimers & Active Travel Advisory ---');
    assert(getData.disclaimers !== undefined, 'Disclaimers block is present');
    assert(getData.disclaimers.ventilation_notice.toLowerCase().includes('ventilation') || getData.disclaimers.ventilation_notice.toLowerCase().includes('inhalation'), 'Ventilation notice mentions physical exertion / respiration');
    assert(getData.disclaimers.safety_notice.toLowerCase().includes('guarantee') || getData.disclaimers.safety_notice.toLowerCase().includes('pedestrian'), 'Safety notice clarifies route safety is never guaranteed');
    assert(getData.disclaimers.provider_attribution.includes('OpenStreetMap') || getData.disclaimers.provider_attribution.includes('OSRM'), 'Provider attribution cites OSRM / OpenStreetMap');

    // 5. Remote Location / Insufficient Data Handling
    console.log('\n--- 5. Testing Remote Coordinates (No Corridor Stations / Missing Data) ---');
    // Remote desert coordinates in Thar Desert where no air stations exist within 3km
    const remoteRes = await fetch(`${BASE_URL}/routes/plan?origin=27.0000,71.0000&destination=27.0200,71.0200&mode=walking`);
    assert(remoteRes.status === 200, 'Remote query returns 200 OK');
    const remoteData = await remoteRes.json();
    const remoteRoute = remoteData.routes[0];
    assert(remoteRoute.pollution_analysis.nearby_stations_count === 0, 'No stations detected in remote corridor');
    assert(remoteRoute.pollution_analysis.corridor_avg_concentration === null, 'Missing data is NEVER zero: corridor_avg_concentration is null');
    assert(remoteRoute.pollution_analysis.severity === null, 'Severity is null when data is missing');
    assert(remoteRoute.pollution_analysis.data_provenance_label.includes('NO GROUND STATIONS') || remoteRoute.pollution_analysis.data_provenance_label.includes('UNAVAILABLE') || remoteRoute.pollution_analysis.data_provenance_label.includes('insufficient'), 'Provenance clarifies no stations / data unavailable');
    assert(remoteData.comparison.note.toLowerCase().includes('insufficient'), `Comparison note explains insufficient data: "${remoteData.comparison.note}"`);

    // 6. Validation & Error Handling
    console.log('\n--- 6. Testing Input Validation & Error Handling ---');
    // Missing origin / destination
    const badParamRes = await fetch(`${BASE_URL}/routes/plan?origin=Delhi`);
    assert(badParamRes.status === 400, 'Missing destination returns 400 Bad Request');
    
    // Invalid mode (e.g. driving when strictly walking & cycling are supported)
    const badModeRes = await fetch(`${BASE_URL}/routes/plan?origin=Connaught%20Place&destination=India%20Gate&mode=driving`);
    assert(badModeRes.status === 400, 'Driving mode returns 400 Bad Request (strictly walking & cycling priority)');

    // Unresolvable origin
    const badPlaceRes = await fetch(`${BASE_URL}/routes/plan?origin=UnresolvableFakePlace999XYZ&destination=India%20Gate`);
    assert(badPlaceRes.status === 404, 'Unresolvable origin returns 404 Not Found');

    // 7. Verify Frontend Source Files & Integration
    console.log('\n--- 7. Verifying Frontend Components & Header Integration ---');
    const dashboardSrc = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
    const mapViewSrc = fs.readFileSync('client/src/components/MapView.tsx', 'utf8');
    const drawerSrc = fs.readFileSync('client/src/components/RoutePlanningDrawer.tsx', 'utf8');
    const cssSrc = fs.readFileSync('client/src/index.css', 'utf8');

    assert(dashboardSrc.includes('RoutePlanningDrawer'), 'Dashboard imports RoutePlanningDrawer');
    assert(dashboardSrc.includes('route-btn-pill'), 'Dashboard Row 3 header contains route-btn-pill');
    assert(dashboardSrc.includes('ROUTE PLANNER'), 'Dashboard Row 3 header contains ROUTE PLANNER label');
    assert(dashboardSrc.includes('routes={activeRoutePlan?.routes || []}'), 'Dashboard passes routes to MapView');
    assert(dashboardSrc.includes('<RoutePlanningDrawer'), 'Dashboard renders <RoutePlanningDrawer />');

    assert(mapViewSrc.includes('routes?: AnalyzedRoute[];'), 'MapView interface includes routes prop');
    assert(mapViewSrc.includes('leaflet.polyline(latLngs'), 'MapView draws Leaflet polylines for routes');
    assert(mapViewSrc.includes('>A</div>') || mapViewSrc.includes('Start (A)'), 'MapView renders Origin Pin A marker');
    assert(mapViewSrc.includes('>B</div>') || mapViewSrc.includes('Destination (B)'), 'MapView renders Destination Pin B marker');
    assert(mapViewSrc.includes('map.fitBounds') || mapViewSrc.includes('fitBounds'), 'MapView fits bounds to planned route');

    assert(drawerSrc.includes('Journey Planner') && drawerSrc.includes('Walking'), 'RoutePlanningDrawer has correct title');
    assert(drawerSrc.includes('routesApi.planRoute'), 'RoutePlanningDrawer calls routesApi.planRoute');
    assert(drawerSrc.includes('btn-swap-locations'), 'RoutePlanningDrawer includes swap button');
    assert(drawerSrc.includes('btn-mode-toggle'), 'RoutePlanningDrawer includes walking/cycling mode toggles');
    assert(drawerSrc.includes('ACTIVE TRAVEL HEALTH ADVISORY'), 'RoutePlanningDrawer includes active travel health advisory');

    assert(cssSrc.includes('.route-btn-pill'), 'index.css defines .route-btn-pill');
    assert(cssSrc.includes('.route-planning-drawer'), 'index.css defines .route-planning-drawer');
    assert(cssSrc.includes('.route-summary-card'), 'index.css defines .route-summary-card');

  } catch (err) {
    console.error('Test execution error:', err);
    fail++;
  }

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${pass} PASSED, ${fail} FAILED`);
  console.log('===============================================================\n');

  if (fail > 0) process.exit(1);
}

runTests();
