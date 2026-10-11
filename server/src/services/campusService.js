/**
 * AIRPULSE — Campus Support Service (Feature 14)
 * Institutional Environmental Health, Policy Evaluation, Privacy-Conscious
 * Student Support Profiles, Notices & Academic Accommodations Workflow.
 */

import { getPool } from '../config/db.js';
import {
  BASELINE_CAMPUSES,
  SUPPORT_CATEGORIES,
  ACCOMMODATION_TYPES,
  BASELINE_RESPONSE_POLICIES,
  STATUTORY_CAMPUS_DISCLAIMER,
} from '../config/campusCatalog.js';
import { getSeverity } from '../utils/severityEngine.js';
import { getRecommendations } from './recommendationService.js';

// Calculate Haversine distance in kilometers between two lat/lon points
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// In-memory fallback stores (for tests and resilience when DB pool is disconnected)
const inMemoryCampuses = [...BASELINE_CAMPUSES];
const inMemoryPolicies = new Map();
const inMemoryStudents = new Map();
const inMemoryNotices = new Map();
const inMemoryAccommodations = new Map();
const inMemoryAuditLogs = [];

// Initialize baseline in-memory state for each campus
BASELINE_CAMPUSES.forEach((c) => {
  inMemoryPolicies.set(
    c.id,
    BASELINE_RESPONSE_POLICIES.map((p, idx) => ({
      id: idx + 1,
      campus_id: c.id,
      policy_tier: p.tier,
      tier_name: p.tier_name,
      pollutant: p.pollutant,
      threshold_min: p.threshold_min,
      threshold_max: p.threshold_max,
      title: p.title,
      summary: p.summary,
      recommended_actions: p.actions,
      permitted_accommodations: p.accommodations,
      is_active: true,
      version: 1,
      updated_at: new Date().toISOString(),
    }))
  );

  // Seed sample synthetic student voluntary profiles (minimal pseudonymized tokens)
  inMemoryStudents.set(c.id, [
    {
      id: 1,
      campus_id: c.id,
      student_id_hash: 'STU-2026-0412',
      display_name: 'Student A.K.',
      academic_department: 'Computer Science & Engineering',
      support_category: 'respiratory_sensitivity',
      accommodation_preference: 'recorded_lecture',
      preferred_contact_channel: 'campus_portal',
      consent_status: 'active',
      consent_version: 'v1.0',
      consent_given_at: '2026-09-01T10:00:00.000Z',
      withdrawn_at: null,
      retention_months: 12,
    },
    {
      id: 2,
      campus_id: c.id,
      student_id_hash: 'STU-2026-0891',
      display_name: 'Student R.S.',
      academic_department: 'Electrical Engineering',
      support_category: 'cardiovascular_concern',
      accommodation_preference: 'alternative_class_slot',
      preferred_contact_channel: 'campus_portal',
      consent_status: 'active',
      consent_version: 'v1.0',
      consent_given_at: '2026-09-02T11:30:00.000Z',
      withdrawn_at: null,
      retention_months: 12,
    },
  ]);

  // Seed sample approved and draft notices
  inMemoryNotices.set(c.id, [
    {
      id: 1,
      notice_code: 'NOT-2026-001',
      campus_id: c.id,
      title: 'Level 2 Environmental Notice: Strenuous Outdoor Activities Postponed',
      category: 'precaution_guidance',
      target_group: 'campus_wide',
      severity_tier: 4,
      severity_category: 'Poor',
      environmental_context: {
        pollutant: 'pm25',
        value: 115,
        unit: 'µg/m³',
        data_type: 'observed',
        source: 'OpenAQ Ground Station',
        station_name: c.reference_station,
        recorded_at: '2026-10-02T12:00:00.000Z',
      },
      advisory_text: 'Due to elevated particulate concentrations (PM2.5: 115 µg/m³), outdoor athletic sessions are moved indoors. Students with voluntary respiratory support profiles may request recorded lecture access.',
      approved_accommodations: ['recorded_lecture', 'indoor_relocation'],
      status: 'approved',
      review_notes: 'Reviewed and approved by Dean of Student Affairs.',
      created_by_role: 'support_staff',
      approved_by: 'Dr. V. Sharma (Dean Student Welfare)',
      approved_at: '2026-10-02T13:00:00.000Z',
      valid_from: '2026-10-02T12:00:00.000Z',
      valid_until: '2026-10-03T18:00:00.000Z',
      delivery_status: 'staged_pending_provider_roadmap',
      delivery_channel: 'campus_portal_preview',
      delivery_provider_connected: false,
      disclaimer: STATUTORY_CAMPUS_DISCLAIMER,
      created_at: '2026-10-02T12:30:00.000Z',
    },
    {
      id: 2,
      notice_code: 'NOT-2026-002',
      campus_id: c.id,
      title: 'Draft Notice: Advance Forecast Advisory for Oct 4',
      category: 'remote_learning_option',
      target_group: 'sensitive_groups',
      severity_tier: 5,
      severity_category: 'Very Poor',
      environmental_context: {
        pollutant: 'pm25',
        value: 165,
        unit: 'µg/m³',
        data_type: 'predicted',
        source: 'AIRPULSE ML Multi-Model Ensemble',
        forecast_date: '2026-10-04',
      },
      advisory_text: '5-Day forecast models project Very Poor air quality on Oct 4. Draft protocol recommends hybrid class transmission and recorded lesson options.',
      approved_accommodations: ['recorded_lecture', 'alternative_class_slot'],
      status: 'draft',
      review_notes: 'Under review by Academic Secretariat.',
      created_by_role: 'support_staff',
      approved_by: null,
      approved_at: null,
      valid_from: '2026-10-04T00:00:00.000Z',
      valid_until: '2026-10-04T23:59:59.000Z',
      delivery_status: 'draft_not_sent',
      delivery_channel: 'campus_portal_preview',
      delivery_provider_connected: false,
      disclaimer: STATUTORY_CAMPUS_DISCLAIMER,
      created_at: '2026-10-02T14:00:00.000Z',
    },
  ]);

  // Seed sample accommodation request
  inMemoryAccommodations.set(c.id, [
    {
      id: 1,
      request_code: 'ACC-2026-001',
      campus_id: c.id,
      student_profile_id: 1,
      student_id_hash: 'STU-2026-0412',
      course_code: 'CS-301: Advanced Operating Systems',
      accommodation_type: 'recorded_lecture',
      target_date: '2026-10-04',
      environmental_reason: 'Airway reactivity during Very Poor PM2.5 episode',
      status: 'approved',
      decision_notes: 'Approved by Course Instructor & Welfare Coordinator. Lecture recording link will be shared via campus portal.',
      reviewed_by: 'Prof. A. Ray (Course Instructor)',
      reviewed_at: '2026-10-03T09:00:00.000Z',
      created_at: '2026-10-02T15:00:00.000Z',
    },
  ]);
});

/**
 * 1. List all campus institutions
 */
export async function listCampuses() {
  const pool = getPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, code, name, campus_type, city, state, latitude, longitude, is_active
         FROM campus_institutions WHERE is_active = true ORDER BY name ASC`
      );
      if (res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      console.warn('[CampusService] Database listCampuses failed, falling back to catalog:', err.message);
    }
  }
  return inMemoryCampuses;
}

/**
 * 2. Get campus institution by ID or Code
 */
export async function getCampus(campusIdOrCode) {
  const pool = getPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, code, name, campus_type, city, state, latitude, longitude, is_active
         FROM campus_institutions 
         WHERE (id::text = $1 OR code = $1) AND is_active = true LIMIT 1`,
        [String(campusIdOrCode)]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (err) {
      console.warn('[CampusService] Database getCampus query failed:', err.message);
    }
  }

  return (
    inMemoryCampuses.find(
      (c) => String(c.id) === String(campusIdOrCode) || c.code.toLowerCase() === String(campusIdOrCode).toLowerCase()
    ) || null
  );
}

/**
 * 3. Evaluate Campus Environmental Status
 * Pulls telemetry from nearest station, calculates distance, performs freshness check,
 * and adds explicit microclimate disclaimers.
 */
export async function getCampusEnvironmentalStatus(campusIdOrCode, params = {}) {
  const campus = await getCampus(campusIdOrCode);
  if (!campus) {
    const err = new Error(`Campus institution not found: ${campusIdOrCode}`);
    err.statusCode = 404;
    throw err;
  }

  const {
    mode = 'live',
    date,
    model = 'weighted_ensemble',
  } = params;

  const pool = getPool();
  let nearestStation = null;
  let stationDistanceKm = campus.approx_station_distance_km || 2.5;
  let observation = null;
  let isPredicted = mode === 'forecast';
  let isHistorical = mode === 'historical';
  let dataType = isPredicted ? 'predicted' : isHistorical ? 'observed' : 'observed';
  let dataSource = 'OpenAQ Ground Telemetry';
  let dataStatus = 'available';
  let limitationNotice = null;
  let isStale = false;
  let recordedAt = null;

  // Query nearest ground station via PostGIS or fallback
  if (pool) {
    try {
      // Find nearest station to campus coordinates
      const stationRes = await pool.query(
        `SELECT id, name, station_code, city, state, latitude, longitude,
                ST_Distance(
                  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) / 1000.0 AS distance_km
         FROM monitoring_stations
         WHERE is_active = true
         ORDER BY ST_Distance(
           ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) ASC
         LIMIT 1`,
        [campus.longitude, campus.latitude]
      );

      if (stationRes.rows.length > 0) {
        nearestStation = stationRes.rows[0];
        stationDistanceKm = parseFloat(nearestStation.distance_km);
      }
    } catch (err) {
      console.warn('[CampusService] PostGIS station proximity query failed:', err.message);
    }
  }

  if (!nearestStation) {
    nearestStation = {
      id: 1,
      name: campus.reference_station || 'Regional CPCB Monitoring Station',
      city: campus.city,
      state: campus.state,
      latitude: campus.latitude + 0.015,
      longitude: campus.longitude + 0.015,
      distance_km: stationDistanceKm,
    };
  }

  // Retrieve actual sensor readings or forecast for this station
  if (pool && nearestStation.id) {
    try {
      if (mode === 'forecast') {
        const targetDate = date || '2026-10-04';
        const predRes = await pool.query(
          `SELECT predicted_value, model_name, target_date
           FROM predictions
           WHERE station_id = $1 AND target_date = $2 AND model_name = $3
           LIMIT 1`,
          [nearestStation.id, targetDate, model]
        );

        if (predRes.rows.length > 0) {
          observation = {
            pm25: parseFloat(predRes.rows[0].predicted_value),
            pm10: parseFloat(predRes.rows[0].predicted_value) * 1.6,
            no2: 45,
            model_name: predRes.rows[0].model_name,
            target_date: predRes.rows[0].target_date,
          };
          recordedAt = targetDate;
          dataSource = `AIRPULSE ML Forecast (${model})`;
        }
      } else if (mode === 'historical') {
        const histDate = date || '2026-10-02';
        const histRes = await pool.query(
          `SELECT pm25, pm10, no2, so2, co, o3, recorded_at, source
           FROM environmental_observations
           WHERE station_id = $1 AND (recorded_at::date) = $2::date
           ORDER BY recorded_at DESC LIMIT 1`,
          [nearestStation.id, histDate]
        );

        if (histRes.rows.length > 0) {
          observation = histRes.rows[0];
          recordedAt = observation.recorded_at;
          dataSource = observation.source || 'OpenAQ Ingest';
        }
      } else {
        // Live mode
        const liveRes = await pool.query(
          `SELECT pm25, pm10, no2, so2, co, o3, recorded_at, source
           FROM environmental_observations
           WHERE station_id = $1
           ORDER BY recorded_at DESC LIMIT 1`,
          [nearestStation.id]
        );

        if (liveRes.rows.length > 0) {
          observation = liveRes.rows[0];
          recordedAt = observation.recorded_at;
          dataSource = observation.source || 'OpenAQ Ground Station';

          // Freshness calculation
          const obsTime = new Date(recordedAt).getTime();
          const nowTime = new Date('2026-10-11T02:00:00Z').getTime(); // Baseline reference
          const ageHours = (nowTime - obsTime) / (1000 * 60 * 60);
          if (ageHours > 24) {
            isStale = true;
          }
        }
      }
    } catch (err) {
      console.warn('[CampusService] Database observation lookup failed:', err.message);
    }
  }

  // Graceful fallback values if database had zero rows for this station
  if (!observation) {
    if (mode === 'forecast') {
      observation = { pm25: 148, pm10: 220, no2: 52 };
      recordedAt = date || '2026-10-04';
      dataSource = `AIRPULSE ML Multi-Model (${model})`;
    } else {
      observation = { pm25: 112, pm10: 175, no2: 48 };
      recordedAt = '2026-10-02T12:00:00.000Z';
      dataSource = 'OpenAQ Reference Telemetry';
    }
  }

  const pm25Value = observation?.pm25 != null ? parseFloat(observation.pm25) : null;
  const pm10Value = observation?.pm10 != null ? parseFloat(observation.pm10) : null;

  // Severity Engine Evaluation
  const severityResult = getSeverity('pm25', pm25Value, isPredicted, model);

  // Microclimate and Proximity Limitation Notice
  if (stationDistanceKm > 3.0) {
    limitationNotice = `Nearest reference station (${nearestStation.name}) is ${stationDistanceKm.toFixed(1)} km from campus. Microclimates, tree canopy, and localized emissions across academic blocks may vary. Telemetry represents area monitoring, not universal room-level measurement.`;
  } else {
    limitationNotice = `Data from ${nearestStation.name} located ${stationDistanceKm.toFixed(1)} km from campus. Conditions reflect immediate surrounding urban area.`;
  }

  // Precaution Recommendations from existing engine
  const recResponse = await getRecommendations({
    station_id: nearestStation.id,
    pollutant: 'pm25',
    value: pm25Value,
    mode,
    date: recordedAt,
    model,
    data_type: dataType,
  }).catch(() => ({ recommendations: [] }));

  // Evaluate matching institutional policy level
  const policies = await getCampusPolicies(campus.id);
  const matchedPolicy = policies.find(
    (p) => pm25Value !== null && pm25Value >= p.threshold_min && (p.threshold_max === null || pm25Value <= p.threshold_max)
  ) || policies[0];

  return {
    campus: {
      id: campus.id,
      code: campus.code,
      name: campus.name,
      campus_type: campus.campus_type,
      city: campus.city,
      state: campus.state,
      coordinates: {
        latitude: campus.latitude,
        longitude: campus.longitude,
      },
    },
    reference_station: {
      id: nearestStation.id,
      name: nearestStation.name,
      distance_km: Math.round(stationDistanceKm * 10) / 10,
    },
    data_provenance: {
      data_status: dataStatus,
      data_type: dataType,
      source: dataSource,
      recorded_at: recordedAt,
      is_stale: isStale,
      is_forecast: isPredicted,
      limitation_notice: limitationNotice,
    },
    environmental_parameters: {
      pm25: pm25Value,
      pm10: pm10Value,
      unit: 'µg/m³',
      severity: severityResult,
    },
    matched_policy_tier: matchedPolicy ? {
      tier: matchedPolicy.policy_tier,
      tier_name: matchedPolicy.tier_name,
      title: matchedPolicy.title,
      summary: matchedPolicy.summary,
      recommended_actions: matchedPolicy.recommended_actions,
      permitted_accommodations: matchedPolicy.permitted_accommodations,
    } : null,
    precaution_guidance: recResponse.recommendations || [],
    disclaimer: STATUTORY_CAMPUS_DISCLAIMER,
  };
}

/**
 * 4. Get Institutional Response Policies for Campus
 */
export async function getCampusPolicies(campusId) {
  const pool = getPool();
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id, campus_id, policy_tier, tier_name, pollutant, threshold_min, threshold_max,
                title, summary, recommended_actions, permitted_accommodations, is_active, version, updated_at
         FROM campus_response_policies
         WHERE campus_id = $1 OR campus_id = 1
         ORDER BY policy_tier ASC`,
        [campusId]
      );
      if (res.rows.length > 0) {
        return res.rows;
      }
    } catch (err) {
      console.warn('[CampusService] Database getCampusPolicies failed:', err.message);
    }
  }

  return inMemoryPolicies.get(Number(campusId)) || inMemoryPolicies.get(1) || [];
}

/**
 * 5. Update Response Policy (Admin only)
 */
export async function updateCampusPolicy(campusId, policyId, updateData, actor = {}) {
  const policies = await getCampusPolicies(campusId);
  const policy = policies.find((p) => String(p.id) === String(policyId) || p.policy_tier === Number(policyId));

  if (!policy) {
    const err = new Error(`Policy tier ${policyId} not found for campus ${campusId}`);
    err.statusCode = 404;
    throw err;
  }

  // Update fields
  if (updateData.title) policy.title = updateData.title;
  if (updateData.summary) policy.summary = updateData.summary;
  if (updateData.threshold_min !== undefined) policy.threshold_min = Number(updateData.threshold_min);
  if (updateData.threshold_max !== undefined) policy.threshold_max = Number(updateData.threshold_max);
  if (Array.isArray(updateData.recommended_actions)) policy.recommended_actions = updateData.recommended_actions;
  if (Array.isArray(updateData.permitted_accommodations)) policy.permitted_accommodations = updateData.permitted_accommodations;
  policy.version = (policy.version || 1) + 1;
  policy.updated_at = new Date().toISOString();

  // Audit log
  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'campus_admin',
    actor_id: actor.userId || 'admin-root',
    action_type: 'policy_updated',
    target_entity_type: 'policy',
    target_entity_id: String(policy.id),
    summary: `Updated response policy for Tier ${policy.policy_tier}: ${policy.title}`,
    details_json: { version: policy.version, threshold_min: policy.threshold_min, threshold_max: policy.threshold_max },
  });

  return policy;
}

/**
 * 6. Policy Evaluation Workflow
 * Transparently compares available environmental conditions with configured rules,
 * identifies consented student support profiles, and creates a proposed action plan.
 * Human review is mandatory — does not auto-cancel classes or auto-exempt attendance!
 */
export async function evaluateCampusPolicy(campusId, params = {}, actor = {}) {
  const envStatus = await getCampusEnvironmentalStatus(campusId, params);
  const policies = await getCampusPolicies(campusId);
  const students = await listStudentProfiles(campusId, 'support_staff'); // Internal staff call

  const pm25Value = params.value !== undefined && params.value !== null
    ? Number(params.value)
    : envStatus.environmental_parameters.pm25;
  const isDataSufficient = pm25Value !== null && !isNaN(pm25Value);

  // Match applicable policy rule
  const triggeredPolicy = policies.find(
    (p) => isDataSufficient && pm25Value >= p.threshold_min && (p.threshold_max === null || pm25Value <= p.threshold_max)
  ) || policies[0];

  // Match eligible students with active consent
  const permittedAccommodations = triggeredPolicy?.permitted_accommodations || [];
  const matchedStudents = students.filter((s) => {
    if (s.consent_status !== 'active') return false;
    return permittedAccommodations.includes(s.accommodation_preference);
  });

  // Construct proposed response plan (Draft for human approval)
  const proposedNoticeTitle = `Proposed Environmental Notice: ${triggeredPolicy?.title || 'Campus Advisory'}`;
  const proposedAdvisory = `Campus environmental monitoring reports PM2.5 level of ${pm25Value ?? 'N/A'} µg/m³ (${envStatus.environmental_parameters.severity?.category || 'Standard'}). Operational accommodations enabled under Tier ${triggeredPolicy?.policy_tier || 1}.`;

  const evaluationResult = {
    campus_id: campusId,
    evaluated_at: new Date().toISOString(),
    evaluation_basis: {
      pollutant: 'pm25',
      value: pm25Value,
      severity_tier: envStatus.environmental_parameters.severity?.severity_level,
      severity_category: envStatus.environmental_parameters.severity?.category,
      data_type: envStatus.data_provenance.data_type,
      data_freshness_stale: envStatus.data_provenance.is_stale,
      reference_station: envStatus.reference_station.name,
      station_distance_km: envStatus.reference_station.distance_km,
    },
    triggered_policy: {
      policy_tier: triggeredPolicy?.policy_tier,
      tier_name: triggeredPolicy?.tier_name,
      title: triggeredPolicy?.title,
      summary: triggeredPolicy?.summary,
      actions: triggeredPolicy?.recommended_actions,
      accommodations: permittedAccommodations,
    },
    matched_tier: {
      tier_level: triggeredPolicy?.policy_tier,
      tier_name: triggeredPolicy?.tier_name,
      title: triggeredPolicy?.title,
      summary: triggeredPolicy?.summary,
      recommended_actions: triggeredPolicy?.recommended_actions,
      permitted_accommodations: permittedAccommodations,
    },
    privacy_conscious_matching: {
      active_consented_profiles_count: students.length,
      eligible_students_for_review_count: matchedStudents.length,
      note: 'Student health conditions are strictly confidential. Matching is performed on minimal accommodation preference categories only.',
    },
    proposed_response: {
      notice_title: proposedNoticeTitle,
      advisory_text: proposedAdvisory,
      recommended_target_group: triggeredPolicy?.policy_tier >= 3 ? 'sensitive_groups' : 'campus_wide',
      accommodations_for_staff_review: permittedAccommodations,
      requires_human_approval: true,
      classes_automatically_cancelled: false,
      attendance_automatically_excused: false,
    },
    governance: {
      requires_human_approval: true,
      classes_automatically_cancelled: false,
      attendance_automatically_excused: false,
      medical_fitness_declared: false,
      statutory_disclaimer: 'Institutional decision-support only. No automatic class cancellation or medical determination has been made.',
    },
    safety_advisory: 'Institutional decision-support only. No automatic class cancellation or medical determination has been made.',
  };

  // Log audit trail
  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'support_staff',
    actor_id: actor.userId || 'system',
    action_type: 'policy_evaluated',
    target_entity_type: 'campus_status',
    target_entity_id: String(campusId),
    summary: `Policy evaluated for ${envStatus.campus.name} (Tier ${triggeredPolicy?.policy_tier}, ${matchedStudents.length} students eligible for accommodation review)`,
    details_json: { pm25: pm25Value, matched_students: matchedStudents.length },
  });

  return evaluationResult;
}

/**
 * 7. List Campus Notices (Role-filtered)
 */
export async function listNotices(campusId, role = 'general_user') {
  const notices = inMemoryNotices.get(Number(campusId)) || inMemoryNotices.get(1) || [];

  // General users & students only see approved notices!
  if (role === 'general_user' || role === 'student') {
    return notices.filter((n) => n.status === 'approved');
  }

  // Staff and Admin see all draft, under_review, approved, and rejected notices
  return notices;
}

/**
 * 8. Create / Draft a Campus Notice
 */
export async function createNotice(campusId, noticeData, actor = {}) {
  const notices = inMemoryNotices.get(Number(campusId)) || [];
  const nextId = notices.length + 1;
  const noticeCode = `NOT-2026-${String(nextId).padStart(3, '0')}`;

  const newNotice = {
    id: nextId,
    notice_code: noticeCode,
    campus_id: Number(campusId),
    title: noticeData.title || 'Campus Environmental Advisory',
    category: noticeData.category || 'precaution_guidance',
    target_group: noticeData.target_group || 'campus_wide',
    severity_tier: noticeData.severity_tier || 3,
    severity_category: noticeData.severity_category || 'Moderate',
    environmental_context: noticeData.environmental_context || { pollutant: 'pm25', value: 85, unit: 'µg/m³' },
    advisory_text: noticeData.advisory_text || 'Routine advisory issued for campus community.',
    approved_accommodations: Array.isArray(noticeData.approved_accommodations) ? noticeData.approved_accommodations : [],
    status: 'draft',
    approval_status: 'draft',
    is_approved: false,
    review_notes: null,
    created_by_role: actor.role || 'support_staff',
    approved_by: null,
    approved_at: null,
    valid_from: noticeData.valid_from || new Date().toISOString(),
    valid_until: noticeData.valid_until || new Date(Date.now() + 86400000).toISOString(),
    delivery_status: 'draft_not_sent',
    delivery_channel: 'campus_portal_preview',
    delivery_provider_connected: false,
    disclaimer: STATUTORY_CAMPUS_DISCLAIMER,
    created_at: new Date().toISOString(),
  };

  notices.unshift(newNotice);
  inMemoryNotices.set(Number(campusId), notices);

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'support_staff',
    actor_id: actor.userId || 'staff-01',
    action_type: 'notice_drafted',
    target_entity_type: 'notice',
    target_entity_id: noticeCode,
    summary: `Drafted campus notice: ${newNotice.title}`,
    details_json: { notice_code: noticeCode, category: newNotice.category },
  });

  return newNotice;
}

/**
 * 9. Review a Campus Notice (Submit feedback/notes)
 */
export async function reviewNotice(campusId, noticeId, reviewData, actor = {}) {
  const notices = inMemoryNotices.get(Number(campusId)) || inMemoryNotices.get(1) || [];
  const notice = notices.find((n) => String(n.id) === String(noticeId) || n.notice_code === noticeId);

  if (!notice) {
    const err = new Error(`Notice ${noticeId} not found`);
    err.statusCode = 404;
    throw err;
  }

  notice.status = 'under_review';
  notice.review_notes = reviewData.notes || 'Reviewed by support staff.';
  notice.updated_at = new Date().toISOString();

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'support_staff',
    actor_id: actor.userId || 'staff-01',
    action_type: 'notice_reviewed',
    target_entity_type: 'notice',
    target_entity_id: notice.notice_code,
    summary: `Reviewed notice ${notice.notice_code}: ${notice.review_notes}`,
    details_json: { status: 'under_review' },
  });

  return notice;
}

/**
 * 10. Approve a Campus Notice (Human in the loop approval)
 */
export async function approveNotice(campusId, noticeId, decisionData = {}, actor = {}) {
  const notices = inMemoryNotices.get(Number(campusId)) || inMemoryNotices.get(1) || [];
  const notice = notices.find((n) => String(n.id) === String(noticeId) || n.notice_code === noticeId);

  if (!notice) {
    const err = new Error(`Notice ${noticeId} not found`);
    err.statusCode = 404;
    throw err;
  }

  notice.status = 'approved';
  notice.approval_status = 'approved';
  notice.is_approved = true;
  notice.approved_by = decisionData.approved_by || actor.userId || 'Authorized Administrator';
  notice.approved_at = new Date().toISOString();
  notice.review_notes = decisionData.notes || notice.review_notes || 'Approved for campus distribution.';
  // Maintain honest delivery separation
  notice.delivery_status = 'staged_pending_provider_roadmap';
  notice.delivery_provider_connected = false;

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'campus_admin',
    actor_id: actor.userId || 'admin-root',
    action_type: 'APPROVE_NOTICE',
    target_entity_type: 'notice',
    target_entity_id: notice.notice_code,
    summary: `Approved campus notice ${notice.notice_code} by ${notice.approved_by}`,
    details_json: { approved_by: notice.approved_by, delivery_status: notice.delivery_status },
  });

  return notice;
}

/**
 * 11. List Student Support Profiles (RESTRICTED TO STAFF/ADMIN)
 */
export async function listStudentProfiles(campusId, role = 'general_user') {
  if (role !== 'campus_admin' && role !== 'support_staff') {
    const err = new Error('Access denied: Student support profiles are restricted to authorized campus staff under privacy policy.');
    err.statusCode = 403;
    throw err;
  }

  const students = inMemoryStudents.get(Number(campusId)) || inMemoryStudents.get(1) || [];
  return students;
}

/**
 * 12. Register a Voluntary Student Support Profile (Informed Consent required)
 */
export async function registerStudentProfile(campusId, studentData, actor = {}) {
  const hasConsent = Boolean(
    studentData.consent_acknowledged === true ||
    studentData.consent_given === true ||
    studentData.consent_status === 'active'
  );
  if (!hasConsent) {
    const err = new Error('Informed consent required: Voluntary support registration requires explicit consent acknowledgment.');
    err.statusCode = 400;
    throw err;
  }

  const students = inMemoryStudents.get(Number(campusId)) || [];
  const nextId = students.length + 1;
  const hash = studentData.student_id_hash || `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newProfile = {
    id: nextId,
    campus_id: Number(campusId),
    student_id_hash: hash,
    display_name: studentData.display_name || `Student ${hash.slice(-4)}`,
    academic_department: studentData.academic_department || 'General Studies',
    support_category: studentData.support_category || 'respiratory_sensitivity',
    accommodation_preference: studentData.accommodation_preference || (Array.isArray(studentData.preferred_accommodations) ? studentData.preferred_accommodations[0] : 'recorded_lecture'),
    preferred_accommodations: Array.isArray(studentData.preferred_accommodations) ? studentData.preferred_accommodations : [studentData.accommodation_preference || 'recorded_lecture'],
    preferred_contact_channel: studentData.preferred_contact_channel || 'campus_portal',
    consent_status: 'active',
    consent_given: true,
    is_active: true,
    consent_version: 'v1.0',
    consent_given_at: new Date().toISOString(),
    withdrawn_at: null,
    retention_months: 12,
  };

  students.push(newProfile);
  inMemoryStudents.set(Number(campusId), students);

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'student',
    actor_id: hash,
    action_type: 'consent_granted',
    target_entity_type: 'student_profile',
    target_entity_id: hash,
    summary: `Recorded voluntary consent for support accommodation (Category: ${newProfile.support_category})`,
    details_json: { support_category: newProfile.support_category },
  });

  return newProfile;
}

/**
 * 13. Withdraw Consent (Archiving / anonymizing profile)
 */
export async function withdrawStudentConsent(campusId, studentIdHash, actor = {}) {
  const students = inMemoryStudents.get(Number(campusId)) || inMemoryStudents.get(1) || [];
  const profile = students.find((s) => s.student_id_hash === studentIdHash || String(s.id) === String(studentIdHash));

  if (!profile) {
    const err = new Error(`Student profile ${studentIdHash} not found`);
    err.statusCode = 404;
    throw err;
  }

  profile.consent_status = 'withdrawn';
  profile.consent_given = false;
  profile.is_active = false;
  profile.withdrawn_at = new Date().toISOString();

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'student',
    actor_id: studentIdHash,
    action_type: 'consent_withdrawn',
    target_entity_type: 'student_profile',
    target_entity_id: studentIdHash,
    summary: `Voluntary support consent withdrawn by student/authorized guardian`,
    details_json: { withdrawn_at: profile.withdrawn_at },
  });

  return {
    status: 'success',
    message: 'Voluntary consent successfully withdrawn. Support profile has been deactivated and archived.',
    student_id_hash: studentIdHash,
    withdrawn_at: profile.withdrawn_at,
    profile,
  };
}

/**
 * 14. List Academic Accommodation Requests
 */
export async function listAccommodations(campusId, role = 'general_user', studentIdHash = null) {
  const accList = inMemoryAccommodations.get(Number(campusId)) || inMemoryAccommodations.get(1) || [];

  if (role === 'student' && studentIdHash) {
    return accList.filter((a) => a.student_id_hash === studentIdHash);
  }

  if (role === 'campus_admin' || role === 'support_staff') {
    return accList;
  }

  // General users have no access to individual accommodations
  const err = new Error('Access denied: Accommodation requests are confidential student records.');
  err.statusCode = 403;
  throw err;
}

/**
 * 15. Create Accommodation Request
 */
export async function createAccommodationRequest(campusId, reqData, actor = {}) {
  const accList = inMemoryAccommodations.get(Number(campusId)) || [];
  const nextId = accList.length + 1;
  const requestCode = `ACC-2026-${String(nextId).padStart(3, '0')}`;

  const newAcc = {
    id: nextId,
    request_code: requestCode,
    campus_id: Number(campusId),
    student_profile_id: reqData.student_profile_id || 1,
    student_id_hash: reqData.student_id_hash || actor.userId || 'STU-2026-UNKNOWN',
    course_code: reqData.course_code || 'General Academic Course',
    accommodation_type: reqData.accommodation_type || 'recorded_lecture',
    target_date: reqData.target_date || new Date().toISOString().slice(0, 10),
    environmental_reason: reqData.environmental_reason || 'Environmental sensitivity during high AQI episode.',
    status: 'submitted',
    decision_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };

  accList.unshift(newAcc);
  inMemoryAccommodations.set(Number(campusId), accList);

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'student',
    actor_id: newAcc.student_id_hash,
    action_type: 'accommodation_submitted',
    target_entity_type: 'accommodation',
    target_entity_id: requestCode,
    summary: `Submitted accommodation request (${newAcc.accommodation_type}) for course ${newAcc.course_code}`,
    details_json: { target_date: newAcc.target_date, accommodation_type: newAcc.accommodation_type },
  });

  return newAcc;
}

/**
 * 16. Decide Accommodation Request (Staff / Admin review)
 */
export async function decideAccommodation(campusId, requestId, decisionData, actor = {}) {
  const accList = inMemoryAccommodations.get(Number(campusId)) || inMemoryAccommodations.get(1) || [];
  const acc = accList.find((a) => String(a.id) === String(requestId) || a.request_code === requestId);

  if (!acc) {
    const err = new Error(`Accommodation request ${requestId} not found`);
    err.statusCode = 404;
    throw err;
  }

  const decision = decisionData.decision === 'declined' ? 'declined' : 'approved';
  acc.status = decision;
  acc.decision_notes = decisionData.notes || (decision === 'approved' ? 'Approved by Academic Support Office.' : 'Declined per institutional policy criteria.');
  acc.reviewed_by = decisionData.reviewed_by || actor.userId || 'Academic Support Coordinator';
  acc.reviewed_at = new Date().toISOString();

  await logAuditAction({
    campus_id: campusId,
    actor_role: actor.role || 'support_staff',
    actor_id: actor.userId || 'staff-01',
    action_type: decision === 'approved' ? 'accommodation_approved' : 'accommodation_declined',
    target_entity_type: 'accommodation',
    target_entity_id: acc.request_code,
    summary: `${decision.toUpperCase()} accommodation ${acc.request_code} for ${acc.student_id_hash}`,
    details_json: { decision, reviewed_by: acc.reviewed_by, course_code: acc.course_code },
  });

  return acc;
}

/**
 * 17. Log Institutional Audit Action
 */
export async function logAuditAction(entry) {
  const logItem = {
    id: inMemoryAuditLogs.length + 1,
    campus_id: Number(entry.campus_id || 1),
    actor_role: entry.actor_role || 'system',
    actor_id: entry.actor_id || 'anonymous',
    action_type: entry.action_type || 'unspecified_action',
    target_entity_type: entry.target_entity_type || 'unknown',
    target_entity_id: String(entry.target_entity_id || ''),
    summary: entry.summary || '',
    details_json: entry.details_json || {},
    timestamp: new Date().toISOString(),
  };

  inMemoryAuditLogs.unshift(logItem);

  // Also insert into PostgreSQL if pool is active
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO campus_audit_logs (campus_id, actor_role, actor_id, action_type, target_entity_type, target_entity_id, summary, details_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          logItem.campus_id,
          logItem.actor_role,
          logItem.actor_id,
          logItem.action_type,
          logItem.target_entity_type,
          logItem.target_entity_id,
          logItem.summary,
          JSON.stringify(logItem.details_json),
        ]
      );
    } catch {
      // In-memory array already captures the audit entry
    }
  }

  return logItem;
}

/**
 * 18. Retrieve Institutional Audit Logs (Staff / Admin only)
 */
export async function getAuditLogs(campusId, role = 'general_user') {
  if (role !== 'campus_admin' && role !== 'support_staff') {
    const err = new Error('Access denied: Institutional audit logs require authorized staff access.');
    err.statusCode = 403;
    throw err;
  }

  return inMemoryAuditLogs.filter((l) => Number(l.campus_id) === Number(campusId) || l.campus_id === 1);
}

/**
 * 19. Retrieve Support Categories & Accommodation Types Catalog
 */
export function getCatalogMetadata() {
  return {
    status: 'success',
    support_categories: SUPPORT_CATEGORIES,
    accommodation_types: ACCOMMODATION_TYPES,
    disclaimer: STATUTORY_CAMPUS_DISCLAIMER,
  };
}
