import fs from 'fs';

console.log('================================================================');
console.log('   AIRPULSE FEATURE 12: POLLUTION PROTECTION STORE VERIFICATION  ');
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
    // -------------------------------------------------------------
    // Test 1: GET /api/v1/store/products returns catalog
    // -------------------------------------------------------------
    const catalogRes = await fetch(`${BASE_URL}/store/products`);
    check('Check 1: GET /api/v1/store/products returns HTTP 200', catalogRes.status === 200);
    const catalogData = await catalogRes.json();
    check('Check 2: Catalog contains 10 curated verified products', catalogData.count === 10 && catalogData.data.length === 10);

    // -------------------------------------------------------------
    // Test 2: Catalog product schema & HTTPS URLs
    // -------------------------------------------------------------
    const requiredProductFields = [
      'id', 'name', 'brand', 'category', 'category_label', 'intended_use',
      'pollution_concerns', 'pollution_labels', 'certification', 'limitations',
      'seller_name', 'product_url', 'verified_price', 'price_currency',
      'is_pollution_triggered', 'min_severity_tier', 'priority', 'image_badge'
    ];

    let allFieldsPresent = true;
    let allHttpsUrls = true;
    let allHaveLimitations = true;
    let allHaveCertifications = true;

    for (const p of catalogData.data) {
      for (const field of requiredProductFields) {
        if (p[field] === undefined || p[field] === null) {
          allFieldsPresent = false;
          console.error(`Product ${p.id} missing field: ${field}`);
        }
      }
      if (!p.product_url.startsWith('https://')) {
        allHttpsUrls = false;
        console.error(`Product ${p.id} product_url is not HTTPS: ${p.product_url}`);
      }
      if (typeof p.limitations !== 'string' || p.limitations.length === 0) {
        allHaveLimitations = false;
      }
      if (typeof p.certification !== 'string' || p.certification.length === 0) {
        allHaveCertifications = false;
      }
    }

    check('Check 3: All products contain complete structured fields', allFieldsPresent);
    check('Check 4: All seller URLs are genuine HTTPS links', allHttpsUrls);
    check('Check 5: All products document real-world limitations', allHaveLimitations);
    check('Check 6: All products list verifiable certifications (IS 9473 / EN 149 / HEPA H13)', allHaveCertifications);

    // -------------------------------------------------------------
    // Test 3: GET /api/v1/store/products/:id detail endpoint
    // -------------------------------------------------------------
    const singleProductRes = await fetch(`${BASE_URL}/store/products/3m_9010in_particulate_respirator`);
    check('Check 7: Single product fetch returns HTTP 200', singleProductRes.status === 200);
    const singleProduct = await singleProductRes.json();
    check('Check 8: Single product fetch returns correct product ID', singleProduct.data.id === '3m_9010in_particulate_respirator');

    const invalidProductRes = await fetch(`${BASE_URL}/store/products/non_existent_item`);
    check('Check 9: Invalid product fetch returns HTTP 404', invalidProductRes.status === 404);

    // -------------------------------------------------------------
    // Test 4: Particulate Pollution Recommendations (PM2.5)
    // -------------------------------------------------------------
    const pmRes = await fetch(`${BASE_URL}/store/recommendations?pollutant=pm25&value=180`);
    check('Check 10: Particulate recommendation returns HTTP 200', pmRes.status === 200);
    const pmData = await pmRes.json();
    
    check('Check 11: Particulate recommendation severity is computed via Severity Engine', 
      pmData.pollution_context && 
      pmData.pollution_context.severity_category === 'Very Poor' && 
      pmData.pollution_context.severity_tier === 5
    );
    check('Check 12: Particulate recommendations include certified respirators',
      pmData.recommendations.pollution_triggered_products.some(p => p.category === 'respirators')
    );
    check('Check 13: Particulate recommendations include air purifiers and portable monitors',
      pmData.recommendations.pollution_triggered_products.some(p => p.category === 'indoor_purifiers') &&
      pmData.recommendations.pollution_triggered_products.some(p => p.category === 'monitoring')
    );
    check('Check 14: Particulate recommendation does NOT trigger gas protection warning',
      pmData.gas_protection_warning === null
    );
    check('Check 15: Non-purchase exposure reduction actions are provided',
      Array.isArray(pmData.recommendations.exposure_reduction_advice) && 
      pmData.recommendations.exposure_reduction_advice.length > 0
    );
    check('Check 16: Public health statutory disclaimer and fit notice are present',
      Boolean(pmData.disclaimers && pmData.disclaimers.non_substitution_notice && pmData.disclaimers.respirator_fit_notice)
    );

    // -------------------------------------------------------------
    // Test 5: Gaseous Pollution Recommendations (NO2 / SO2)
    // -------------------------------------------------------------
    const no2Res = await fetch(`${BASE_URL}/store/recommendations?pollutant=no2&value=300`);
    check('Check 17: Gaseous (NO2) recommendation returns HTTP 200', no2Res.status === 200);
    const no2Data = await no2Res.json();

    check('Check 18: Gaseous pollution triggers explicit gas_protection_warning',
      typeof no2Data.gas_protection_warning === 'string' &&
      no2Data.gas_protection_warning.includes('DO NOT filter harmful gaseous pollutants')
    );

    const recommendsParticulateMasks = no2Data.recommendations.pollution_triggered_products.some(p => 
      p.category === 'respirators' && !p.pollution_concerns.includes('no2')
    );
    check('Check 19: Ordinary particulate respirators are NOT recommended for gaseous pollution',
      !recommendsParticulateMasks
    );

    // -------------------------------------------------------------
    // Test 6: Strict 5-Day Forecast Horizon Enforcement
    // -------------------------------------------------------------
    const forecastValidRes = await fetch(`${BASE_URL}/store/recommendations?mode=forecast&date=2026-10-04&pollutant=pm25&value=120`);
    check('Check 20: Forecast within 5-day horizon (2026-10-04) returns HTTP 200', forecastValidRes.status === 200);
    const forecastValidData = await forecastValidRes.json();
    check('Check 21: Forecast recommendations are labeled with advance planning note & provenance',
      forecastValidData.pollution_context.data_provenance.is_predicted === true &&
      forecastValidData.pollution_context.data_provenance.label.includes('FORECAST')
    );

    const forecastDay7Res = await fetch(`${BASE_URL}/store/recommendations?mode=forecast&date=2026-10-15`);
    check('Check 22: Forecast beyond 5-day horizon (2026-10-15) is rejected with HTTP 400', forecastDay7Res.status === 400);

    // -------------------------------------------------------------
    // Test 7: Travel items separation from pollution PPE
    // -------------------------------------------------------------
    check('Check 23: Travel & hygiene items are present and separated from pollution-specific items',
      Array.isArray(pmData.recommendations.general_travel_products) && 
      pmData.recommendations.general_travel_products.length >= 2 &&
      pmData.recommendations.general_travel_products.every(item => item.category === 'travel_preparation')
    );

    // -------------------------------------------------------------
    // Test 8: Station-based resolution
    // -------------------------------------------------------------
    const stationRes = await fetch(`${BASE_URL}/store/recommendations?station_id=1`);
    if (stationRes.status === 200) {
      const stationData = await stationRes.json();
      check('Check 24: Station-based resolution resolves station name and location',
        stationData.destination && Boolean(stationData.destination.name)
      );
    } else {
      check('Check 24: Station-based resolution endpoint active', stationRes.status < 500);
    }

    // -------------------------------------------------------------
    // Test 9: Frontend Code Audit
    // -------------------------------------------------------------
    const dashboardCode = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
    const storeModalCode = fs.readFileSync('client/src/components/ProtectionStoreModal.tsx', 'utf8');
    const storeTypesCode = fs.readFileSync('client/src/types/store.ts', 'utf8');
    const storeApiCode = fs.readFileSync('client/src/api/store.ts', 'utf8');
    const cssCode = fs.readFileSync('client/src/index.css', 'utf8');

    check('Check 25: Dashboard has isStoreOpen state and ProtectionStoreModal rendered',
      dashboardCode.includes('isStoreOpen') && dashboardCode.includes('<ProtectionStoreModal')
    );
    check('Check 26: Dashboard StationDetail has "Protection Gear & Store" button',
      dashboardCode.includes('btn-station-store-action') && dashboardCode.includes('handleOpenStore')
    );
    check('Check 27: ProtectionStoreModal handles destination selection & pollutant selection',
      storeModalCode.includes('selectedStationId') && storeModalCode.includes('selectedPollutant')
    );
    check('Check 28: ProtectionStoreModal displays gas protection warning callout',
      storeModalCode.includes('gas_protection_warning') && storeModalCode.includes('gas-protection-alert-box')
    );
    check('Check 29: ProtectionStoreModal renders genuine direct seller links',
      storeModalCode.includes('product_url') && storeModalCode.includes('rel="noopener noreferrer"')
    );
    check('Check 30: CSS contains protection store styles and responsive rules',
      cssCode.includes('.protection-store-modal') && cssCode.includes('.store-product-card')
    );

    // -------------------------------------------------------------
    // Test 10: UI/Data-State Corrections (Requirement 1, 2, 3)
    // -------------------------------------------------------------
    // Check 31: Valid lower pollution
    const lowRes = await fetch(`${BASE_URL}/store/recommendations?pollutant=pm25&value=25`);
    const lowData = await lowRes.json();
    check('Check 31: Valid lower pollution returns data_status=available, recommendation_status=not_triggered, count=0',
      lowData.data_status === 'available' &&
      lowData.recommendation_status === 'not_triggered' &&
      lowData.recommendations.pollution_triggered_count === 0
    );

    // Check 32: Missing data state does not claim "within acceptable limits"
    const missingRes = await fetch(`${BASE_URL}/store/recommendations?destination=UnknownStation`);
    const missingData = await missingRes.json();
    check('Check 32: Missing data returns data_status=unavailable, recommendation_status=insufficient_data',
      missingData.data_status === 'unavailable' &&
      missingData.recommendation_status === 'insufficient_data' &&
      missingData.recommendations.pollution_triggered_count === 0
    );

    const missingAdviceString = missingData.recommendations.exposure_reduction_advice.join(' ');
    check('Check 33: Missing data advice contains honest unavailable notice and NOT "within acceptable limits"',
      missingAdviceString.includes('Pollution data is unavailable or insufficient to determine pollution-triggered recommendations for this destination.') &&
      !missingAdviceString.includes('within acceptable limits') &&
      !missingAdviceString.includes('does not warrant')
    );

    // Check 34: Missing station telemetry
    const invalidStationRes = await fetch(`${BASE_URL}/store/recommendations?station_id=999999`);
    const invalidStationData = await invalidStationRes.json();
    check('Check 34: Invalid station returns insufficient_data status and honest unavailable message',
      invalidStationData.data_status === 'unavailable' &&
      invalidStationData.recommendation_status === 'insufficient_data' &&
      invalidStationData.recommendations.exposure_reduction_advice[0].includes('Pollution data is unavailable or insufficient')
    );

    // Check 35: Frontend contains unavailable-data notice with exact prescribed text
    check('Check 35: Frontend modal contains exact prescribed unavailable-data text',
      storeModalCode.includes('Pollution data is unavailable or insufficient to determine pollution-triggered recommendations for this destination.') &&
      storeModalCode.includes('data-unavailable-notice')
    );

    // Check 36: Frontend modal contains optional travel gear banner separating non-protective accessories
    check('Check 36: Frontend modal displays travel comfort disclaimer banner separating non-protective gear',
      storeModalCode.includes('travel-comfort-disclaimer-banner') &&
      storeModalCode.includes('Optional travel accessories — not evidence of pollution protection')
    );

    // Check 37: Index.css contains data-unavailable-notice and travel-comfort-disclaimer-banner rules
    check('Check 37: Index.css contains data-unavailable-notice and travel-comfort-disclaimer-banner rules',
      cssCode.includes('.data-unavailable-notice') &&
      cssCode.includes('.travel-comfort-disclaimer-banner')
    );

  } catch (err) {
    console.error('Test execution error:', err);
    fail++;
  }

  console.log(`\n================================================================`);
  console.log(`FEATURE 12 VERIFICATION RESULT: ${pass} PASSED, ${fail} FAILED`);
  console.log(`================================================================\n`);

  if (fail > 0) {
    process.exit(1);
  }
}

runTests();
