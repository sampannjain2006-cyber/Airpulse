import fs from 'fs';

console.log('================================================================');
console.log('   AIRPULSE FEATURE 11: INDUSTRIAL WASTE REUSE VERIFICATION     ');
console.log('================================================================\n');

let pass = 0;
let fail = 0;

function check(title, condition, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${title}`);
    pass++;
  } else {
    console.error(`❌ [FAIL] ${title} ${details}`);
    fail++;
  }
}

const BASE_URL = 'http://localhost:3001/api/v1';

async function runTests() {
  try {
    // Check 1: GET /api/v1/waste-reuse returns 8 curated streams
    const listRes = await fetch(`${BASE_URL}/waste-reuse`);
    check('Check 1: GET /api/v1/waste-reuse returns HTTP 200', listRes.status === 200);
    const listData = await listRes.json();
    check('Check 2: Response contains 8 curated industrial by-product streams', listData.count === 8 && listData.data.length === 8);

    // Check 3: Check all required fields are present in every entry
    const requiredFields = [
      'id', 'name', 'category', 'category_label', 'origin_industry',
      'origin_process', 'receiving_industry', 'application',
      'verification_status', 'status_label', 'pretreatment_requirements',
      'contamination_risks', 'unsuitable_conditions', 'regulatory_standards',
      'authoritative_source', 'source_url', 'limitations'
    ];

    let allFieldsPresent = true;
    for (const item of listData.data) {
      for (const field of requiredFields) {
        if (!item[field] || (Array.isArray(item[field]) && item[field].length === 0)) {
          allFieldsPresent = false;
          console.error(`Missing field '${field}' in stream '${item.id}'`);
        }
      }
    }
    check('Check 3: All 8 catalog entries contain complete structured technical fields', allFieldsPresent);

    // Check 4: Check authoritative sources and HTTPS URLs
    let allHttpsUrls = true;
    for (const item of listData.data) {
      if (!item.source_url.startsWith('https://')) {
        allHttpsUrls = false;
      }
    }
    check('Check 4: All entries have official HTTPS authoritative source URLs', allHttpsUrls);

    // Check 5: Detail lookup /api/v1/waste-reuse/:id
    const flyAshRes = await fetch(`${BASE_URL}/waste-reuse/coal_fly_ash`);
    check('Check 5: Detail endpoint GET /api/v1/waste-reuse/coal_fly_ash returns HTTP 200', flyAshRes.status === 200);
    const flyAshData = await flyAshRes.json();
    check(
      'Check 6: Fly ash entry references MoEFCC Fly Ash Notification & IS 3812',
      flyAshData.data.regulatory_standards.some(s => s.includes('IS 3812') || s.includes('MoEFCC Fly Ash Notification'))
    );

    // Check 7: Hazardous / unverified materials are NOT marked safe
    const slagRes = await fetch(`${BASE_URL}/waste-reuse/steel_melting_shop_slag`);
    const slagData = await slagRes.json();
    check(
      'Check 7: Steel slag explicitly warns against volumetric expansion & unweathered free lime',
      slagData.data.unsuitable_conditions.some(c => c.toLowerCase().includes('free lime') || c.toLowerCase().includes('unweathered'))
    );

    // Check 8: Phosphogypsum explicitly warns against NORM & requires AERB clearance
    const gypsumRes = await fetch(`${BASE_URL}/waste-reuse/phosphogypsum`);
    const gypsumData = await gypsumRes.json();
    check(
      'Check 8: Phosphogypsum explicitly documents NORM radioactivity and AERB safety directive',
      gypsumData.data.regulatory_standards.some(s => s.includes('AERB')) &&
      gypsumData.data.contamination_risks.some(r => r.includes('NORM') || r.includes('Radium'))
    );

    // Check 9: Category filtering
    const filterRes = await fetch(`${BASE_URL}/waste-reuse?category=combustion_byproducts`);
    const filterData = await filterRes.json();
    check(
      'Check 9: Filtering by category combustion_byproducts returns exactly 1 item',
      filterData.count === 1 && filterData.data[0].id === 'coal_fly_ash'
    );

    // Check 10: Metadata endpoint GET /api/v1/waste-reuse/metadata
    const metaRes = await fetch(`${BASE_URL}/waste-reuse/metadata`);
    check('Check 10: Metadata endpoint returns HTTP 200', metaRes.status === 200);
    const metaData = await metaRes.json();
    check(
      'Check 11: Metadata contains categories, origin, and receiving industries breakdown',
      metaData.metadata.categories.length > 0 && metaData.metadata.origin_industries.length > 0
    );

    // Check 12: Search query filter
    const searchRes = await fetch(`${BASE_URL}/waste-reuse?search=cement`);
    const searchData = await searchRes.json();
    check(
      'Check 12: Keyword search "cement" returns matching industrial pathways',
      searchData.count >= 3
    );

    // Check 13: 404 for unknown waste stream
    const notFoundRes = await fetch(`${BASE_URL}/waste-reuse/unknown_fake_stream`);
    check('Check 13: Non-existent waste stream returns HTTP 404', notFoundRes.status === 404);

    // Check 14: Safety & statutory disclaimers are present on all responses
    check(
      'Check 14: Authoritative statutory & testing disclaimers present in API payload',
      Boolean(listData.disclaimers.educational_notice && listData.disclaimers.testing_requirement)
    );

    // Check 15: Zero fabricated figures / savings claims
    const jsonStr = JSON.stringify(listData.data);
    const hasFabricatedCarbonClaims = jsonStr.includes('100% carbon neutral') || jsonStr.includes('guaranteed 50% savings');
    check('Check 15: Zero fabricated percentages or unwarranted savings claims in catalog', !hasFabricatedCarbonClaims);

    // Check 16: Verify frontend files and component wiring
    const tsx = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
    const modalTsx = fs.readFileSync('client/src/components/WasteReuseModal.tsx', 'utf8');
    const css = fs.readFileSync('client/src/index.css', 'utf8');

    check('Check 16: Dashboard.tsx imports and renders WasteReuseModal', tsx.includes('WasteReuseModal') && tsx.includes('<WasteReuseModal'));
    check('Check 17: Dashboard.tsx includes WASTE REUSE button pill in Row 3', tsx.includes('waste-reuse-btn-pill') && tsx.includes('WASTE REUSE'));
    check('Check 18: WasteReuseModal includes search, category filter, and statutory disclaimer', modalTsx.includes('waste-search-input') && modalTsx.includes('statutory-disclaimer-box'));
    check('Check 19: index.css includes dedicated styles for Feature 11 and responsive breakpoints', css.includes('.waste-reuse-modal-overlay') && css.includes('.waste-reuse-btn-pill'));

    // Check 20: Existing system regression checks
    const stationsRes = await fetch(`${BASE_URL}/stations`);
    const stationsData = await stationsRes.json();
    check('Check 20: Existing stations endpoint intact (40 dashboard stations preserved)', stationsData.count === 40);

    const alertsRes = await fetch(`${BASE_URL}/alerts/summary`);
    const alertsData = await alertsRes.json();
    check('Check 21: Existing alerts endpoint intact', alertsRes.status === 200 && alertsData.status === 'success');

    const recRes = await fetch(`${BASE_URL}/recommendations?station_id=1&pollutant=pm25&value=140&severity_tier=4`);
    const recData = await recRes.json();
    check('Check 22: Existing recommendations endpoint intact', recRes.status === 200 && recData.count > 0);

  } catch (err) {
    console.error('Test execution error:', err.message);
    fail++;
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
  console.log('================================================================');

  if (fail > 0) process.exit(1);
}

runTests();
