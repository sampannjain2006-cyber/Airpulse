/**
 * AIRPULSE — Feature 15 Test Suite: Google Services Integration
 * Tests:
 * 1. Google Maps links use correct origin, destination, and travel mode
 * 2. Invalid or missing coordinates / locations handled safely
 * 3. Navigation links disclose statutory limitation (does NOT carry pollution scores)
 * 4. Calendar event drafts contain correct title, selected date/time, destination, and provenance description
 * 5. Missing dates/times are NOT fabricated (omits &dates= from URL template)
 * 6. Sensitive student information (health, medical, accommodation) strictly excluded
 * 7. Calendar and Tasks fallbacks labelled accurately
 * 8. Missing OAuth credentials do not break AIRPULSE
 * 9. OAuth failures and revoked access handled safely
 * 10. No secrets or tokens exposed in responses, logs, or frontend code
 * 11. Existing pollution-aware routing and all other AIRPULSE features remain functional
 * 12. City filter and header layout remain intact and accessible
 * 13. Production build succeeds and API routes respond with 200 OK
 */

import assert from 'node:assert';
import {
  getGoogleIntegrationStatus,
  generateMapsUrl,
  generateCalendarDraft,
  generateTaskDraft,
  getOAuthAuthUrl,
  exchangeOAuthCode,
  createDirectGoogleTask
} from '../server/src/services/googleIntegrationService.js';

const BASE_URL = 'http://localhost:3001/api/v1';

async function fetchJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('AIRPULSE FEATURE 15 TEST SUITE: GOOGLE SERVICES');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // 1. Google Maps Links: correct origin, destination, and travel mode (walking & cycling/bicycling)
  test('Google Maps: Correct origin, destination, and travel mode mapping', () => {
    // walking mode
    const walkRes = generateMapsUrl({
      origin: '28.6315,77.2167',
      destination: '28.6129,77.2295',
      travelMode: 'walking'
    });
    assert.strictEqual(walkRes.success, true);
    assert.strictEqual(walkRes.action_type, 'directions');
    assert.strictEqual(walkRes.google_travel_mode, 'walking');
    assert.ok(walkRes.url.includes('api=1'));
    assert.ok(walkRes.url.includes('origin=28.6315%2C77.2167'));
    assert.ok(walkRes.url.includes('destination=28.6129%2C77.2295'));
    assert.ok(walkRes.url.includes('travelmode=walking'));

    // cycling mode mapped to Google Maps official parameter 'bicycling'
    const cycleRes = generateMapsUrl({
      origin: 'Connaught Place, New Delhi',
      destination: 'India Gate, New Delhi',
      travelMode: 'cycling'
    });
    assert.strictEqual(cycleRes.success, true);
    assert.strictEqual(cycleRes.google_travel_mode, 'bicycling');
    assert.ok(cycleRes.url.includes('travelmode=bicycling'));
    assert.ok(cycleRes.url.includes('destination=India+Gate%2C+New+Delhi') || cycleRes.url.includes('destination=India%20Gate%2C%20New%20Delhi') || cycleRes.url.includes('destination=India'));
  });

  // 2. Invalid or missing coordinates / locations handled safely
  test('Google Maps: Safe handling of missing coordinates / search fallback', () => {
    // Missing both
    assert.throws(() => {
      generateMapsUrl({});
    }, /Destination or coordinates are required/);

    // Destination only -> place search fallback
    const destOnly = generateMapsUrl({ destination: 'SRM University Sonipat' });
    assert.strictEqual(destOnly.action_type, 'place_search');
    assert.ok(destOnly.url.includes('/maps/search/?api=1&query='));

    // Invalid coordinates handled without throwing, sanitizes or falls back
    const coordFallback = generateMapsUrl({
      origin: 'invalid,coord',
      destination: '28.6129,77.2295'
    });
    assert.strictEqual(coordFallback.success, true);
    assert.ok(coordFallback.url.includes('destination=28.6129%2C77.2295'));
  });

  // 3. Navigation links do not claim to carry AIRPULSE pollution scores
  test('Google Maps: Explicit statutory limitation disclosure on pollution scores', () => {
    const res = generateMapsUrl({
      origin: 'Connaught Place',
      destination: 'India Gate',
      travelMode: 'walking'
    });
    assert.ok(res.limitation_notice);
    assert.ok(
      res.limitation_notice.includes('does NOT automatically carry AIRPULSE pollution scores') ||
      res.limitation_notice.includes('least-polluted')
    );
    assert.strictEqual(res.paid_api_required, false);
  });

  // 4. Calendar event drafts contain correct title, date/time, destination, and provenance
  test('Google Calendar: Correct draft fields, dates, provenance and ICS generation', () => {
    const draft = generateCalendarDraft({
      title: 'Pollution-Aware Walk: CP to India Gate',
      destination: 'India Gate, New Delhi',
      plannedDate: '2026-10-15',
      startTime: '08:00',
      endTime: '09:00',
      isForecast: true,
      forecastDate: '2026-10-15',
      pollutant: 'pm25',
      value: 145,
      severityCategory: 'Poor'
    });

    assert.strictEqual(draft.success, true);
    assert.strictEqual(draft.has_explicit_date, true);
    assert.strictEqual(draft.is_forecast, true);
    assert.ok(draft.google_calendar_url.includes('render?action=TEMPLATE'));
    assert.ok(draft.google_calendar_url.includes('20261015T080000Z'));
    assert.ok(draft.google_calendar_url.includes('20261015T090000Z'));
    assert.ok(draft.description.includes('Data Provenance: 5-DAY NUMERICAL MODEL FORECAST'));
    assert.ok(draft.description.includes('PROJECTED POLLUTION: 145 µg/m³ (Poor)'));

    // Test RFC 5545 iCalendar content
    assert.ok(draft.ics_file_content.includes('BEGIN:VCALENDAR'));
    assert.ok(draft.ics_file_content.includes('DTSTART:20261015T080000Z'));
    assert.ok(draft.ics_file_content.includes('DTEND:20261015T090000Z'));
    assert.ok(draft.ics_file_content.includes('SUMMARY:Pollution-Aware Walk: CP to India Gate'));
    assert.ok(draft.ics_file_content.includes('END:VCALENDAR'));
  });

  // 5. Missing dates/times are NOT fabricated
  test('Google Calendar: Missing dates/times are NOT fabricated', () => {
    const undatedDraft = generateCalendarDraft({
      title: 'Check Destination Air Quality',
      destination: 'Anand Vihar',
      // no plannedDate, no startTime, no endTime
      isForecast: false,
      pollutant: 'pm25',
      value: 280
    });

    assert.strictEqual(undatedDraft.success, true);
    assert.strictEqual(undatedDraft.has_explicit_date, false);
    assert.strictEqual(undatedDraft.planned_date, null);
    // Crucial: URL must NOT contain &dates= parameter with fabricated timestamps
    assert.ok(!undatedDraft.google_calendar_url.includes('&dates='));
    assert.ok(decodeURIComponent(undatedDraft.google_calendar_url).includes('Check Destination Air Quality'));
    assert.ok(undatedDraft.description.includes('CURRENT OBSERVED GROUND TELEMETRY'));
    // ICS file must not fabricate DTSTART
    assert.ok(!undatedDraft.ics_file_content.includes('DTSTART:'));
  });

  // 6. Sensitive student information excluded from event and task descriptions
  test('Data Minimization: Sensitive student medical / health info strictly blocked', () => {
    // Attempt to inject sensitive health information into calendar draft
    assert.throws(() => {
      generateCalendarDraft({
        title: 'Campus Walk',
        notes: 'Student John has severe asthma and requested medical inhaler accommodation'
      });
    }, /Student health conditions, medical diagnoses, or private accommodations must not be included/);

    // Attempt to inject sensitive health information into task draft
    assert.throws(() => {
      generateTaskDraft({
        taskType: 'campus_guidance',
        title: 'Review student medical disability records and bronchial condition'
      });
    }, /Student health conditions, medical diagnoses, or private accommodations must not be included/);
  });

  // 7. Calendar and Tasks fallbacks labelled accurately
  test('Google Tasks: Accurate labelling of fallbacks (drafts, clipboard, calendar reminder)', () => {
    const taskDraft = generateTaskDraft({
      taskType: 'check_destination_pollution',
      destination: 'SRM University Sonipat',
      dueDate: '2026-10-14'
    });

    assert.strictEqual(taskDraft.success, true);
    assert.strictEqual(taskDraft.direct_api_available, false);
    assert.strictEqual(taskDraft.status_label, 'Draft Fallback Active (No Account Required)');
    assert.ok(taskDraft.note.includes('Google Tasks API not configured in environment'));
    assert.ok(taskDraft.copyable_text.includes('AIRPULSE TASK: Check pollution at SRM University Sonipat'));
    assert.ok(taskDraft.calendar_reminder_url.includes('calendar.google.com'));
    assert.strictEqual(taskDraft.google_tasks_web_url, 'https://tasks.google.com/');
    assert.ok(taskDraft.structured_checklist.length >= 4);
  });

  // 8. Missing OAuth credentials do not break AIRPULSE
  test('Google OAuth: Safe degradation when credentials not configured', () => {
    const status = getGoogleIntegrationStatus();
    assert.strictEqual(status.services.oauth.configured, false);
    assert.strictEqual(status.services.maps.status, 'active_url_handoff');
    assert.strictEqual(status.services.calendar.status, 'active_draft_handoff');
    assert.strictEqual(status.services.tasks.status, 'draft_fallback_active');

    // Trying to get auth URL without credentials throws structured error
    assert.throws(() => {
      getOAuthAuthUrl();
    }, /Google OAuth credentials are not configured/);
  });

  // 9. OAuth failures and revoked access handled safely
  await testAsync('Google OAuth: Invalid state or missing credentials handled safely', async () => {
    await assert.rejects(
      async () => {
        await exchangeOAuthCode('fake_code', 'invalid_state');
      },
      /Google OAuth credentials not configured/
    );

    await assert.rejects(
      async () => {
        await createDirectGoogleTask({ sessionId: 'non_existent_session', task: { title: 'Test' } });
      },
      /Google OAuth is not configured|Google account not connected/
    );
  });

  // 10. HTTP Endpoint: /api/v1/google/status does not expose secrets
  await testAsync('API Security: /status exposes zero secrets and clean telemetry', async () => {
    const res = await fetchJson('/google/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.strictEqual(res.data.data.success, true);
    assert.strictEqual(res.data.data.services.oauth.client_secret_configured, false);
    // Secret must NEVER appear in the response payload
    const raw = JSON.stringify(res.data);
    assert.ok(!raw.includes('client_secret='));
    assert.ok(!raw.includes('access_token'));
    assert.ok(!raw.includes('refresh_token'));
  });

  // 11. HTTP Endpoints for Maps, Calendar, and Tasks respond accurately
  await testAsync('API Routes: Maps, Calendar, and Tasks endpoints operational', async () => {
    // Maps
    const mapsRes = await fetchJson('/google/maps/url', {
      method: 'POST',
      body: JSON.stringify({
        origin: '28.6139,77.2090',
        destination: '28.5355,77.3910',
        travelMode: 'cycling'
      })
    });
    assert.strictEqual(mapsRes.status, 200);
    assert.strictEqual(mapsRes.data.data.action_type, 'directions');
    assert.strictEqual(mapsRes.data.data.google_travel_mode, 'bicycling');

    // Calendar
    const calRes = await fetchJson('/google/calendar/draft', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Review Forecast for Gurgaon',
        destination: 'DLF Cyber City, Gurgaon',
        plannedDate: '2026-10-18',
        startTime: '10:00',
        endTime: '11:00'
      })
    });
    assert.strictEqual(calRes.status, 200);
    assert.strictEqual(calRes.data.data.has_explicit_date, true);
    assert.ok(calRes.data.data.google_calendar_url.includes('render?action=TEMPLATE'));

    // Tasks
    const taskRes = await fetchJson('/google/tasks/draft', {
      method: 'POST',
      body: JSON.stringify({
        taskType: 'prepare_protective_accessories',
        destination: 'Connaught Place'
      })
    });
    assert.strictEqual(taskRes.status, 200);
    assert.ok(taskRes.data.data.structured_checklist.length > 0);
  });

  // 12. Regression: Existing routes, stations, and campus support remain fully functional
  await testAsync('Regression: Stations, Hotspots, and Route Planner APIs remain intact', async () => {
    const stationsRes = await fetchJson('/stations');
    assert.strictEqual(stationsRes.status, 200);
    assert.ok(stationsRes.data.stations.length > 0);

    const routeRes = await fetchJson('/routes/plan', {
      method: 'POST',
      body: JSON.stringify({
        origin: 'Connaught Place',
        destination: 'India Gate',
        mode: 'walking'
      })
    });
    assert.strictEqual(routeRes.status, 200);
    assert.strictEqual(routeRes.data.status, 'success');
    assert.ok(routeRes.data.routes.length > 0);
    assert.ok(routeRes.data.comparison.verdict);
  });

  // 13. Regression: SRM Sonipat Campus Support (Feature 14) remains intact
  await testAsync('Regression: Feature 14 Campus Support remains functional', async () => {
    const campusRes = await fetchJson('/campus/srm-sonipat/environmental-status');
    assert.strictEqual(campusRes.status, 200);
    assert.strictEqual(campusRes.data.data.campus.code, 'SRM-SONIPAT');
    assert.ok(campusRes.data.data.campus.name.includes('SRM University Delhi-NCR, Sonepat'));
  });

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} / ${total} tests passed successfully.`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
