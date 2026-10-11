console.log('=====================================================================');
console.log('   AIRPULSE FEATURE 14: STUDENT ENVIRONMENTAL HEALTH & CAMPUS AUDIT  ');
console.log('=====================================================================\n');

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
    // -------------------------------------------------------------
    // Test 1: Campus Institutions & Environmental Status Distinction
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Campus Environmental Status & Data Provenance ---');
    const campRes = await fetch(`${BASE_URL}/campus/institutions`);
    assert(campRes.status === 200, 'GET /campus/institutions returns 200 OK');
    const campData = await campRes.json();
    const campList = campData.data;
    assert(Array.isArray(campList) && campList.length >= 4, `At least 4 institutions available (${campList.length} found)`);

    const iitDelhi = campList.find((c) => c.code === 'IIT-DELHI');
    assert(!!iitDelhi, 'IIT Delhi campus institution located');

    const srmSonipat = campList.find((c) => c.code === 'SRM-SONIPAT');
    assert(!!srmSonipat, 'SRM University Sonipat campus institution located');
    assert(srmSonipat.city === 'Sonipat', 'SRM University city is Sonipat');
    assert(srmSonipat.state === 'Haryana', 'SRM University state is Haryana');

    // Test SRM Sonipat Environmental Status
    const srmStatusRes = await fetch(`${BASE_URL}/campus/${srmSonipat.id}/environmental-status`);
    assert(srmStatusRes.status === 200, `GET /campus/${srmSonipat.id}/environmental-status returns 200 OK`);
    const srmStatusData = await srmStatusRes.json();
    assert(srmStatusData.status === 'success', 'SRM Sonipat status response is success');
    assert(
      typeof srmStatusData.data.reference_station.distance_km === 'number',
      `SRM Sonipat reference station distance computed: ${srmStatusData.data.reference_station.distance_km} km`
    );
    assert(
      srmStatusData.data.data_provenance.limitation_notice.includes('Sonipat') ||
      srmStatusData.data.data_provenance.limitation_notice.includes('campus'),
      'SRM Sonipat microclimate limitation notice present'
    );

    const statusRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/environmental-status`);
    assert(statusRes.status === 200, `GET /campus/${iitDelhi.id}/environmental-status returns 200 OK`);
    const statusData = await statusRes.json();
    const status = statusData.data;
    assert(statusData.status === 'success', 'Environmental status response status is success');
    assert(
      ['observed', 'predicted', 'modelled', 'unavailable'].includes(status.data_provenance.data_type),
      `Data provenance correctly classifies data_type: "${status.data_provenance.data_type}"`
    );
    assert(typeof status.data_provenance.is_forecast === 'boolean', 'is_forecast flag boolean present');
    assert(typeof status.data_provenance.is_stale === 'boolean', 'is_stale flag boolean present');
    assert(typeof status.reference_station.distance_km === 'number', `Reference station distance calculated (${status.reference_station.distance_km} km)`);
    assert(typeof status.data_provenance.limitation_notice === 'string', 'Microclimate limitation notice present');

    // -------------------------------------------------------------
    // Test 2: Missing or Stale Data Never Claims Safety
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Missing / Stale Data Safety Guarantees ---');
    // Call with invalid/unknown institution
    const missingRes = await fetch(`${BASE_URL}/campus/99999/environmental-status`);
    assert(missingRes.status === 404, 'Unknown campus ID returns 404 Not Found');

    // Check IIT Bombay or remote campus microclimate warning
    const iitb = campList.find((c) => c.code === 'IIT-BOMBAY');
    if (iitb) {
      const iitbRes = await fetch(`${BASE_URL}/campus/${iitb.id}/environmental-status`);
      const iitbData = await iitbRes.json();
      assert(
        iitbData.data.reference_station.distance_km > 3.0 ? iitbData.data.data_provenance.limitation_notice.includes('does not measure conditions throughout the entire campus') : true,
        'Distance > 3 km explicitly discloses sensor microclimate limitation'
      );
    }

    // -------------------------------------------------------------
    // Test 3: Response Policy Evaluation Workflow
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing Policy Evaluation Workflow ---');
    const polRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/policies`);
    assert(polRes.status === 200, 'GET /campus/:id/policies returns 200 OK');
    const polData = await polRes.json();
    const policies = polData.data;
    assert(Array.isArray(policies) && policies.length >= 4, `At least 4 institutional policy tiers found (${policies.length})`);

    const evalRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/evaluate-policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Campus-Role': 'support_staff',
        'X-Campus-Actor': 'staff-audit-test',
      },
      body: JSON.stringify({
        pollutant: 'pm25',
        value: 105.0, // Matches Tier 2: Poor (91-120)
      }),
    });
    assert(evalRes.status === 200, 'POST /evaluate-policy returns 200 OK');
    const evalData = await evalRes.json();
    const evaluation = evalData.data;
    assert(evalData.status === 'success', 'Policy evaluation success: true');
    assert(evaluation.matched_tier.tier_level === 2, `Value 105 ug/m3 correctly matched Tier 2 (matched tier: ${evaluation.matched_tier.tier_level})`);

    // Also test Tier 3 (121-250 ug/m3)
    const evalResTier3 = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/evaluate-policy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Campus-Role': 'support_staff',
      },
      body: JSON.stringify({
        pollutant: 'pm25',
        value: 145.0,
      }),
    });
    const evalDataTier3 = await evalResTier3.json();
    assert(evalDataTier3.data.matched_tier.tier_level === 3, `Value 145 ug/m3 correctly matched Tier 3 (matched tier: ${evalDataTier3.data.matched_tier.tier_level})`);

    // -------------------------------------------------------------
    // Test 4: Human Review & Non-Autonomous Decision Requirement
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Human Review & Non-Autonomous Protection ---');
    assert(evaluation.governance.requires_human_approval === true, 'requires_human_approval is strictly TRUE');
    assert(evaluation.governance.classes_automatically_cancelled === false, 'classes_automatically_cancelled is strictly FALSE');
    assert(evaluation.governance.medical_fitness_declared === false, 'medical_fitness_declared is strictly FALSE');
    assert(typeof evaluation.governance.statutory_disclaimer === 'string', 'Statutory disclaimer strictly present');

    // -------------------------------------------------------------
    // Test 5: Role-Based Access Control (403 for Unauthorized Users)
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Role Authorization & Least-Privilege Access ---');
    const unauthRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/students`, {
      headers: { 'X-Campus-Role': 'general_user' },
    });
    assert(unauthRes.status === 403, 'general_user querying student profiles receives 403 Forbidden', `Status: ${unauthRes.status}`);

    const staffRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/students`, {
      headers: { 'X-Campus-Role': 'support_staff' },
    });
    assert(staffRes.status === 200, 'support_staff querying student profiles receives 200 OK');
    const staffData = await staffRes.json();
    assert(Array.isArray(staffData.data), 'support_staff receives students list');

    // -------------------------------------------------------------
    // Test 6: Voluntary Profile Privacy & Minimal Support Data
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Student Privacy & Informed Consent ---');
    const testHash = `HASH_STUDENT_AUDIT_${Date.now()}`;
    const createProfRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Campus-Role': 'student',
        'X-Campus-Actor': 'student-audit-001',
      },
      body: JSON.stringify({
        student_id_hash: testHash,
        program_enrolled: 'B.Tech CS 2026',
        support_category: 'respiratory_sensitivity',
        preferred_accommodations: ['indoor_study_space', 'recorded_lecture'],
        consent_given: true,
      }),
    });
    assert(createProfRes.status === 201, 'Student voluntary registration returns 201 Created');
    const profData = await createProfRes.json();
    const createdProfile = profData.data;
    assert(createdProfile.support_category === 'respiratory_sensitivity', 'Support category is minimal category');
    assert(createdProfile.consent_given === true, 'consent_given is true');

    // Test Informed Consent Withdrawal
    const withdrawRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/students/${createdProfile.id}/withdraw-consent`, {
      method: 'PATCH',
      headers: {
        'X-Campus-Role': 'student',
        'X-Campus-Actor': 'student-audit-001',
      },
    });
    assert(withdrawRes.status === 200, 'Student consent withdrawal returns 200 OK');
    const withdrawData = await withdrawRes.json();
    assert(withdrawData.data.consent_given === false, 'Profile consent_given is now false');
    assert(withdrawData.data.is_active === false, 'Profile is_active is now false');

    // -------------------------------------------------------------
    // Test 7: Notice Draft vs Approval Workflow
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Notice Draft & Approval State Separation ---');
    const draftNoticeRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/notices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Campus-Role': 'support_staff',
        'X-Campus-Actor': 'staff-audit-draft',
      },
      body: JSON.stringify({
        title: 'Draft Air Quality Advisory for Outdoor Activities',
        target_group: 'all_campus',
        notice_type: 'general_advisory',
        environmental_concern: 'Elevated PM2.5 detected in South Delhi corridor',
        precaution_summary: 'Limit strenuous outdoor exercise; utilize N95 respirators',
        permitted_accommodations: ['optional_remote'],
      }),
    });
    assert(draftNoticeRes.status === 201, 'Creating notice returns 201 Created');
    const draftData = await draftNoticeRes.json();
    const notice = draftData.data;
    assert(notice.approval_status === 'draft', 'New notice has approval_status: "draft"');
    assert(notice.is_approved === false, 'New notice has is_approved: false');

    // -------------------------------------------------------------
    // Test 8: Notification Delivery Decoupling (No Fake SMS/WhatsApp)
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Notification Channels Prepared / Decoupled ---');
    assert(notice.delivery_provider_connected === false, 'delivery_provider_connected is strictly FALSE');
    assert(notice.delivery_status === 'draft_not_sent', 'delivery_status is strictly "draft_not_sent"');

    // Approve the notice
    const approveNoticeRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/notices/${notice.id}/approve`, {
      method: 'PATCH',
      headers: {
        'X-Campus-Role': 'campus_admin',
        'X-Campus-Actor': 'admin-audit-approver',
      },
    });
    assert(approveNoticeRes.status === 200, 'Approving notice returns 200 OK');
    const approvedData = await approveNoticeRes.json();
    const approvedNotice = approvedData.data;
    assert(approvedNotice.is_approved === true, 'Approved notice has is_approved: true');
    assert(approvedNotice.approval_status === 'approved', 'Approved notice has approval_status: "approved"');
    assert(approvedNotice.delivery_provider_connected === false, 'Approved notice still has delivery_provider_connected: false');
    assert(
      approvedNotice.delivery_status === 'staged_pending_provider_roadmap',
      'Approved notice delivery_status is "staged_pending_provider_roadmap" (no fake carrier sent claim)'
    );

    // -------------------------------------------------------------
    // Test 9: Academic Accommodations Workflow
    // -------------------------------------------------------------
    console.log('\n--- 9. Testing Academic Accommodation Workflow ---');
    const createAccRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/accommodations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Campus-Role': 'student',
        'X-Campus-Actor': 'student-audit-001',
      },
      body: JSON.stringify({
        student_profile_id: createdProfile.id,
        course_code: 'COL106 Data Structures',
        accommodation_type: 'recorded_lecture',
        target_date: '2026-10-15',
        environmental_reason: 'Severe forecast Tier 3 AQI; requesting lecture recording',
      }),
    });
    assert(createAccRes.status === 201, 'POST /accommodations returns 201 Created');
    const accData = await createAccRes.json();
    const accommodation = accData.data;
    assert(accommodation.status === 'submitted', 'New accommodation status is "submitted"');

    // Staff approves accommodation
    const decRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/accommodations/${accommodation.id}/decision`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Campus-Role': 'support_staff',
        'X-Campus-Actor': 'dean-academics-officer',
      },
      body: JSON.stringify({
        decision: 'approved',
        decision_notes: 'Faculty notified to provide recorded lecture links for Oct 15.',
      }),
    });
    assert(decRes.status === 200, 'PATCH /accommodations/:id/decision returns 200 OK');
    const decData = await decRes.json();
    assert(decData.data.status === 'approved', 'Accommodation status updated to "approved"');
    assert(decData.data.reviewed_by === 'dean-academics-officer', 'Decision recorded reviewer identity');

    // -------------------------------------------------------------
    // Test 10: Regression Testing of Existing Features (Features 1–13)
    // -------------------------------------------------------------
    console.log('\n--- 10. Regression Testing: Core Features 1–13 ---');
    const stationsRes = await fetch(`${BASE_URL}/stations`);
    assert(stationsRes.status === 200, 'Feature 1/2: GET /stations returns 200 OK');

    const alertsRes = await fetch(`${BASE_URL}/alerts/summary`);
    assert(alertsRes.status === 200, 'Feature 9: GET /alerts/summary returns 200 OK');

    const routeRes = await fetch(`${BASE_URL}/routes/plan?origin=Connaught%20Place&destination=India%20Gate&mode=walking&pollutant=pm25`);
    assert(routeRes.status === 200, 'Feature 13: GET /routes/plan returns 200 OK');

    const storeRes = await fetch(`${BASE_URL}/store/products`);
    assert(storeRes.status === 200, 'Feature 12: GET /store/products returns 200 OK');

    const wasteRes = await fetch(`${BASE_URL}/waste-reuse/catalog`);
    assert(wasteRes.status === 200, 'Feature 11: GET /waste-reuse/catalog returns 200 OK');

    // -------------------------------------------------------------
    // Test 11: Audit Trail Verification
    // -------------------------------------------------------------
    console.log('\n--- 11. Testing Immutable Campus Audit Trail ---');
    const auditRes = await fetch(`${BASE_URL}/campus/${iitDelhi.id}/audit-logs`, {
      headers: { 'X-Campus-Role': 'campus_admin' },
    });
    assert(auditRes.status === 200, 'campus_admin can query /audit-logs');
    const auditData = await auditRes.json();
    const logs = auditData.data;
    assert(Array.isArray(logs) && logs.length > 0, `Audit logs recorded (${logs.length} entries)`);
    const noticeApprovalLog = logs.find((l) => l.action_type === 'APPROVE_NOTICE');
    assert(!!noticeApprovalLog, 'APPROVE_NOTICE logged in audit trail');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`AUDIT RESULTS: ${pass} PASSED, ${fail} FAILED`);
    console.log('===============================================================');

    if (fail > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runTests();
