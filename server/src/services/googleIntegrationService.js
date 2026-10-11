/**
 * AIRPULSE — Google Services Integration Service (Feature 15)
 * 
 * Provides:
 * 1. Google Maps & Navigation: Official URL schemes (Walking & Bicycling travel modes)
 *    with explicit pollution score limitation disclaimers.
 * 2. Google Calendar: Prefilled event URL drafts & RFC 5545 .ics iCalendar generators
 *    with data provenance (Observed vs Forecast vs Modelled) and zero student health leakage.
 * 3. Google Tasks & Reminders: Actionable checklists, direct task launcher, and
 *    optional official Tasks API integration via secure OAuth 2.0.
 */

import crypto from 'crypto';
import { env } from '../config/env.js';

// In-memory OAuth state and token sessions (Never exposed to browser localStorage or Git)
const oauthStateCache = new Map(); // state -> { createdAt, expiresAt }
const oauthTokenStore = new Map(); // sessionId -> { accessToken, refreshToken, expiresAt, email }

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanOldStates() {
  const now = Date.now();
  for (const [state, entry] of oauthStateCache.entries()) {
    if (entry.expiresAt <= now) {
      oauthStateCache.delete(state);
    }
  }
}

/**
 * Check if Google OAuth 2.0 credentials are configured.
 */
export function isGoogleOAuthConfigured() {
  return Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_ID.trim() !== '' &&
    env.GOOGLE_CLIENT_SECRET &&
    env.GOOGLE_CLIENT_SECRET.trim() !== ''
  );
}

/**
 * 1. System Integration Status & Capability Reporting
 */
export function getGoogleIntegrationStatus() {
  const oauthConfigured = isGoogleOAuthConfigured();
  const mapsKeyConfigured = Boolean(env.GOOGLE_MAPS_API_KEY && env.GOOGLE_MAPS_API_KEY.trim() !== '');

  return {
    success: true,
    services: {
      maps: {
        feature: 'Google Maps & Navigation Handoff',
        status: 'active_url_handoff',
        directions_supported: true,
        travel_modes: ['walking', 'bicycling', 'transit', 'driving'],
        paid_api_required: false,
        api_key_configured: mapsKeyConfigured,
        limitation_notice:
          'Opening a route in Google Maps uses Google standard road routing. It does NOT automatically carry AIRPULSE pollution scores or guarantee the least-polluted route.',
      },
      calendar: {
        feature: 'Google Calendar Event Integration',
        status: 'active_draft_handoff',
        url_draft_supported: true,
        ics_download_supported: true,
        oauth_required: false,
        supports_provenance: true,
        privacy_guarantee: 'Zero medical diagnoses, prescriptions, or student support details are included in calendar drafts.',
      },
      tasks: {
        feature: 'Google Tasks & Reminders',
        status: oauthConfigured ? 'oauth_available' : 'draft_fallback_active',
        direct_api_configured: oauthConfigured,
        web_draft_supported: true,
        clipboard_checklist_supported: true,
        fallback_notice: oauthConfigured
          ? 'Direct Google Tasks API creation available with user account authorization.'
          : 'Google OAuth credentials not configured in environment. Interactive draft launcher and copyable checklist are active.',
      },
      oauth: {
        configured: oauthConfigured,
        client_id_configured: Boolean(env.GOOGLE_CLIENT_ID),
        client_secret_configured: Boolean(env.GOOGLE_CLIENT_SECRET),
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        scopes: ['https://www.googleapis.com/auth/tasks'],
      },
    },
    cloud_setup_instructions: {
      console_url: 'https://console.cloud.google.com/apis/credentials',
      required_steps: [
        '1. Create a Google Cloud project or select an existing institutional project.',
        '2. Enable Google Tasks API (APIs & Services -> Library -> Google Tasks API).',
        '3. Configure OAuth Consent Screen (User Type: External/Internal, Scopes: .../auth/tasks).',
        '4. Create OAuth 2.0 Client ID (Application type: Web application).',
        `5. Add Authorized Redirect URI: ${env.GOOGLE_REDIRECT_URI}`,
        '6. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.',
      ],
    },
  };
}

/**
 * 2. Generate Official Google Maps Navigation / Search URLs
 */
export function generateMapsUrl({
  origin,
  destination,
  travelMode = 'walking',
  destinationName,
  lat,
  lon,
}) {
  // Scenario A: Route Directions (Origin -> Destination)
  if (origin && destination) {
    // Format origin
    let originStr = '';
    if (typeof origin === 'object' && origin.lat !== undefined && origin.lon !== undefined) {
      originStr = `${origin.lat},${origin.lon}`;
    } else if (typeof origin === 'string' && origin.trim() !== '') {
      originStr = origin.trim();
    } else {
      const err = new Error('Invalid origin provided. Please provide valid location text or coordinates.');
      err.statusCode = 400;
      throw err;
    }

    // Format destination
    let destStr = '';
    if (typeof destination === 'object' && destination.lat !== undefined && destination.lon !== undefined) {
      destStr = `${destination.lat},${destination.lon}`;
    } else if (typeof destination === 'string' && destination.trim() !== '') {
      destStr = destination.trim();
    } else {
      const err = new Error('Invalid destination provided. Please provide valid location text or coordinates.');
      err.statusCode = 400;
      throw err;
    }

    // Map travel mode to Google Maps API supported modes:
    // 'walking' -> 'walking', 'cycling' -> 'bicycling', 'transit' -> 'transit', 'driving' -> 'driving'
    let gTravelMode = 'walking';
    const normalizedMode = String(travelMode).toLowerCase().trim();
    if (normalizedMode === 'cycling' || normalizedMode === 'bicycling') {
      gTravelMode = 'bicycling';
    } else if (normalizedMode === 'transit') {
      gTravelMode = 'transit';
    } else if (normalizedMode === 'driving') {
      gTravelMode = 'driving';
    } else {
      gTravelMode = 'walking';
    }

    const navUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&travelmode=${gTravelMode}`;

    return {
      success: true,
      action_type: 'directions',
      origin: originStr,
      destination: destStr,
      travel_mode_requested: travelMode,
      google_travel_mode: gTravelMode,
      url: navUrl,
      paid_api_required: false,
      limitation_notice:
        'IMPORTANT LIMITATION: Opening this route in Google Maps uses Google standard road routing. It does NOT automatically carry AIRPULSE pollution scores or guarantee that Google Maps will follow the least-polluted route.',
      disclaimer: 'AIRPULSE route comparison is preserved in the application. Always verify localized roadside air quality.',
    };
  }

  // Scenario B: Single Place / Destination Lookup
  const targetPlace = destinationName || (destination && typeof destination === 'string' ? destination : null);
  const hasCoords = lat !== undefined && lon !== undefined && lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon);

  if (targetPlace || hasCoords) {
    const query = hasCoords ? `${lat},${lon}` : targetPlace.trim();
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    return {
      success: true,
      action_type: 'place_search',
      query,
      has_coordinates: hasCoords,
      url: searchUrl,
      paid_api_required: false,
      limitation_notice:
        'Opening location in Google Maps allows external landmark navigation. Environmental sensors are maintained by AIRPULSE.',
    };
  }

  const err = new Error('Destination or coordinates are required to generate a Google Maps link.');
  err.statusCode = 400;
  throw err;
}

// Sensitive student health / medical regex guard
const SENSITIVE_HEALTH_PATTERN = /\b(asthma|inhaler|medical|clinical|diagnosis|patient|prescription|disability|accommodat(ion|ed|ing)|bronch(ial|itis)|health record|condition)\b/i;

function assertNoSensitiveHealthData(...fields) {
  for (const field of fields) {
    if (typeof field === 'string' && SENSITIVE_HEALTH_PATTERN.test(field)) {
      const err = new Error(
        'Student health conditions, medical diagnoses, or private accommodations must not be included in external calendar events or tasks.'
      );
      err.statusCode = 400;
      throw err;
    }
  }
}

/**
 * 3. Generate Google Calendar Prefilled Event Draft & RFC 5545 .ics File
 */
export function generateCalendarDraft({
  eventType = 'destination_visit',
  title,
  destination,
  campus,
  plannedDate,
  startTime,
  endTime,
  pollutant = 'PM2.5',
  value,
  severityCategory,
  isForecast = false,
  forecastDate,
  advisoryText,
  notes,
  airpulseUrl,
}) {
  assertNoSensitiveHealthData(title, destination, campus, advisoryText, notes);

  const cleanTitle = (title || 'AIRPULSE: Environmental Air Quality Check').trim();
  const location = (destination || campus || 'India').trim();

  // Determine provenance description
  let provenanceDescription = 'CURRENT OBSERVED GROUND TELEMETRY (OpenAQ / CPCB)';
  if (isForecast) {
    provenanceDescription = `5-DAY NUMERICAL MODEL FORECAST (Target Horizon: ${forecastDate || plannedDate || 'Upcoming'})`;
  }

  // Build clean description
  const descriptionParts = [
    `AIRPULSE Environmental Intelligence Advisory`,
    `Location / Destination: ${location}`,
    `Data Provenance: ${provenanceDescription}`,
  ];

  if (value !== undefined && value !== null) {
    const formattedVal = isForecast
      ? `PROJECTED POLLUTION: ${value} µg/m³ (${severityCategory || 'Standard'})`
      : `Reported ${pollutant}: ${value} µg/m³ (${severityCategory || 'Standard'})`;
    descriptionParts.push(formattedVal);
  }

  if (advisoryText && advisoryText.trim()) {
    descriptionParts.push(`Precaution Guidance: ${advisoryText.trim()}`);
  }

  descriptionParts.push(
    `AIRPULSE Dashboard: ${airpulseUrl || 'http://localhost:5173'}`,
    `Note: This is an institutional environmental check reminder. Review real-time telemetry before departure.`
  );

  const fullDescription = descriptionParts.join('\n\n');

  // Handle dates WITHOUT fabricating fake times:
  // If user provided plannedDate (YYYY-MM-DD), format dates param with ISO UTC timestamps.
  // If no date was provided, leave dates param empty so user chooses date in Google Calendar draft.
  let datesParam = '';
  let dtStartIcs = '';
  let dtEndIcs = '';

  if (plannedDate && /^\d{4}-\d{2}-\d{2}$/.test(plannedDate.trim())) {
    const pDate = plannedDate.trim().replace(/-/g, '');
    const sTime = startTime ? startTime.replace(/:/g, '') + '00' : '090000';
    const eTime = endTime ? endTime.replace(/:/g, '') + '00' : '100000';

    datesParam = `${pDate}T${sTime}Z/${pDate}T${eTime}Z`;
    dtStartIcs = `${pDate}T${sTime}Z`;
    dtEndIcs = `${pDate}T${eTime}Z`;
  }

  // Construct official Google Calendar Template URL
  let googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(cleanTitle)}&details=${encodeURIComponent(fullDescription)}&location=${encodeURIComponent(location)}`;
  if (datesParam) {
    googleCalUrl += `&dates=${datesParam}`;
  }

  // Construct standard RFC 5545 iCalendar content (.ics)
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `airpulse-${Date.now()}@airpulse.india`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AIRPULSE//Environmental Intelligence//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
  ];

  if (dtStartIcs && dtEndIcs) {
    icsLines.push(`DTSTART:${dtStartIcs}`, `DTEND:${dtEndIcs}`);
  }

  icsLines.push(
    `SUMMARY:${cleanTitle.replace(/\n/g, ' ')}`,
    `DESCRIPTION:${fullDescription.replace(/\n/g, '\\n')}`,
    `LOCATION:${location.replace(/\n/g, ' ')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  const icsContent = icsLines.join('\r\n');

  return {
    success: true,
    event_type: eventType,
    title: cleanTitle,
    location,
    planned_date: plannedDate || null,
    has_explicit_date: Boolean(plannedDate),
    is_forecast: Boolean(isForecast),
    provenance_label: provenanceDescription,
    description: fullDescription,
    google_calendar_url: googleCalUrl,
    ics_file_content: icsContent,
    status_label: 'Draft opened for user review and save',
    disclaimer: 'Action opens a prefilled Google Calendar draft. The event is not saved until confirmed in Google Calendar.',
  };
}

/**
 * 4. Generate Google Tasks & Reminders Draft & Copyable Checklist
 */
export function generateTaskDraft({
  taskType = 'check_destination_pollution',
  title,
  destination,
  plannedDate,
  dueDate,
  pollutant = 'PM2.5',
  value,
  severityCategory,
  requiredAccessories = [],
  airpulseUrl,
}) {
  const targetPlace = (destination || 'Target Destination').trim();
  const effectiveDate = plannedDate || dueDate || null;
  const cleanTitle = (title || `Check air quality for ${targetPlace}`).trim();

  assertNoSensitiveHealthData(title, destination, cleanTitle, ...(requiredAccessories || []));

  // Create structured actionable task checklist
  const checklistItems = [
    `[ ] Review real-time ${pollutant} readings on AIRPULSE before departure`,
    `[ ] Verify whether forecast or active ground observations are available for ${targetPlace}`,
  ];

  if (requiredAccessories && requiredAccessories.length > 0) {
    checklistItems.push(`[ ] Prepare recommended protective gear: ${requiredAccessories.join(', ')}`);
  } else {
    checklistItems.push(`[ ] Check if N95 respirator is needed (recommended if PM2.5 > 90 µg/m³)`);
  }

  checklistItems.push(
    `[ ] Evaluate indoor vs outdoor transit options along journey corridor`,
    `[ ] Link: ${airpulseUrl || 'http://localhost:5173'}`
  );

  const fullNotes = [
    `AIRPULSE TASK: Check pollution at ${targetPlace}`,
    `Task: ${cleanTitle}`,
    effectiveDate ? `Target Date: ${effectiveDate}` : null,
    value !== undefined ? `Current Telemetry: ${pollutant} ${value} µg/m³ (${severityCategory || 'Standard'})` : null,
    '',
    'Action Checklist:',
    ...checklistItems,
    '',
    'AIRPULSE Environmental Intelligence Platform',
  ].filter(Boolean).join('\n');

  // Direct Google Tasks Web App URL
  const googleTasksWebUrl = 'https://tasks.google.com/';

  // Quick Calendar Reminder Draft URL (Prefilled draft)
  const reminderTitle = `[Reminder] ${cleanTitle}`;
  const reminderCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(reminderTitle)}&details=${encodeURIComponent(fullNotes)}&location=${encodeURIComponent(targetPlace)}`;

  const oauthConfigured = isGoogleOAuthConfigured();

  return {
    success: true,
    task_type: taskType,
    title: cleanTitle,
    destination: targetPlace,
    due_date: effectiveDate,
    structured_checklist: checklistItems,
    copyable_text: fullNotes,
    google_tasks_web_url: googleTasksWebUrl,
    calendar_reminder_url: reminderCalUrl,
    direct_api_available: oauthConfigured,
    status_label: oauthConfigured
      ? 'Google Tasks API Available'
      : 'Draft Fallback Active (No Account Required)',
    note: oauthConfigured
      ? 'Google Tasks API configured. Can create task directly with connected account.'
      : 'Google Tasks API not configured in environment. Interactive draft launcher and copyable checklist are active.',
  };
}

/**
 * 5. Google OAuth 2.0 Authorization Flow (Server-side security)
 */
export function getOAuthAuthUrl() {
  if (!isGoogleOAuthConfigured()) {
    const err = new Error(
      'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.'
    );
    err.statusCode = 503;
    throw err;
  }

  cleanOldStates();

  const state = crypto.randomBytes(24).toString('hex');
  oauthStateCache.set(state, {
    createdAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', env.GOOGLE_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/tasks');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);

  return {
    success: true,
    auth_url: url.toString(),
    state,
    expires_in_seconds: 600,
  };
}

/**
 * 6. Exchange Authorization Code for Tokens
 */
export async function exchangeOAuthCode(code, state) {
  if (!isGoogleOAuthConfigured()) {
    const err = new Error('Google OAuth credentials not configured on server.');
    err.statusCode = 503;
    throw err;
  }

  cleanOldStates();

  if (!state || !oauthStateCache.has(state)) {
    const err = new Error('Invalid or expired OAuth state parameter. Possible CSRF attack detected.');
    err.statusCode = 400;
    throw err;
  }
  oauthStateCache.delete(state);

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const bodyParams = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const err = new Error(`Google OAuth token exchange failed: ${errData.error_description || res.statusText}`);
    err.statusCode = res.status;
    throw err;
  }

  const tokenData = await res.json();
  const sessionId = crypto.randomBytes(32).toString('hex');

  oauthTokenStore.set(sessionId, {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
  });

  return {
    success: true,
    session_id: sessionId,
    scope: tokenData.scope,
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
  };
}

/**
 * 7. Disconnect / Revoke Google Account
 */
export function disconnectOAuthSession(sessionId) {
  if (sessionId && oauthTokenStore.has(sessionId)) {
    oauthTokenStore.delete(sessionId);
    return { success: true, message: 'Google account disconnected successfully.' };
  }
  return { success: true, message: 'Session was not active.' };
}

/**
 * 8. Create Direct Google Task via Official Google Tasks API
 */
export async function createDirectGoogleTask(sessionId, taskPayload) {
  if (!isGoogleOAuthConfigured()) {
    const err = new Error('Google OAuth is not configured on this server. Please use the draft or clipboard handoff.');
    err.statusCode = 503;
    throw err;
  }

  if (!sessionId || !oauthTokenStore.has(sessionId)) {
    const err = new Error('Google account not connected. Please connect via OAuth or use the draft handoff.');
    err.statusCode = 401;
    throw err;
  }

  const session = oauthTokenStore.get(sessionId);
  if (session.expiresAt <= Date.now()) {
    const err = new Error('Google access token has expired. Please re-authenticate your Google account.');
    err.statusCode = 401;
    throw err;
  }

  const apiUrl = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks';

  const bodyData = {
    title: taskPayload.title || 'AIRPULSE: Check Air Quality',
    notes: taskPayload.notes || '',
  };

  if (taskPayload.due_date && /^\d{4}-\d{2}-\d{2}$/.test(taskPayload.due_date)) {
    bodyData.due = `${taskPayload.due_date}T00:00:00.000Z`;
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(`Google Tasks API request failed: ${errBody.error?.message || res.statusText}`);
    err.statusCode = res.status;
    throw err;
  }

  const created = await res.json();

  return {
    success: true,
    task_id: created.id,
    title: created.title,
    status: created.status,
    self_link: created.selfLink,
    message: 'Task successfully created in your Google Tasks account.',
  };
}
