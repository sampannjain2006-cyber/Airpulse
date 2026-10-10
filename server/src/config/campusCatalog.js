/**
 * AIRPULSE — Campus Support Catalog & Configuration (Feature 14)
 * Authoritative standards, baseline response policies, and minimal support categories.
 */

export const BASELINE_CAMPUSES = [
  {
    id: 1,
    code: 'IIT-DELHI',
    name: 'Indian Institute of Technology Delhi (Hauz Khas)',
    campus_type: 'university',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.5450,
    longitude: 77.1926,
    reference_station: 'RK Puram / Sri Aurobindo Marg',
    approx_station_distance_km: 2.1,
  },
  {
    id: 2,
    code: 'DU-NORTH',
    name: 'Delhi University North Campus',
    campus_type: 'university',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.6890,
    longitude: 77.2100,
    reference_station: 'North Campus, DU',
    approx_station_distance_km: 1.2,
  },
  {
    id: 3,
    code: 'IIT-BOMBAY',
    name: 'Indian Institute of Technology Bombay (Powai)',
    campus_type: 'university',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.1334,
    longitude: 72.9133,
    reference_station: 'Powai / Kurla',
    approx_station_distance_km: 3.4,
  },
  {
    id: 4,
    code: 'JNU-DELHI',
    name: 'Jawaharlal Nehru University',
    campus_type: 'university',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.5385,
    longitude: 77.1668,
    reference_station: 'JNU New Delhi',
    approx_station_distance_km: 1.8,
  },
  {
    id: 5,
    code: 'SRM-SONIPAT',
    name: 'SRM University Delhi-NCR, Sonepat (Rajiv Gandhi Education City)',
    campus_type: 'university',
    city: 'Sonipat',
    state: 'Haryana',
    latitude: 28.9328,
    longitude: 77.0984,
    reference_station: 'Delhi Technological University / Sonipat Corridor',
    approx_station_distance_km: 21.1,
  },
];

export const SUPPORT_CATEGORIES = [
  {
    id: 'respiratory_sensitivity',
    label: 'Respiratory Sensitivity',
    description: 'Voluntary disclosure of respiratory sensitivity (e.g., asthma, chronic bronchitis, environmental airway reactivity).',
    recommended_accommodations: ['recorded_lecture', 'indoor_relocation', 'flexible_attendance_review'],
  },
  {
    id: 'cardiovascular_concern',
    label: 'Cardiovascular Concern',
    description: 'Voluntary disclosure of cardiovascular concern sensitive to fine particulate matter exposure.',
    recommended_accommodations: ['recorded_lecture', 'alternative_class_slot', 'remote_participation_option'],
  },
  {
    id: 'general_environmental_sensitivity',
    label: 'General Environmental Sensitivity',
    description: 'High sensitivity to photochemical smog, ozone, or particulate peaks.',
    recommended_accommodations: ['indoor_relocation', 'recorded_lecture'],
  },
  {
    id: 'mobility_exertion_limitation',
    label: 'Mobility & Physical Exertion Limitation',
    description: 'Physical exertion limitations requiring minimized transit exposure between academic blocks.',
    recommended_accommodations: ['alternative_class_slot', 'remote_participation_option'],
  },
];

export const ACCOMMODATION_TYPES = [
  {
    id: 'recorded_lecture',
    label: 'Recorded Lecture Provision',
    description: 'Access to recorded lectures or equivalent learning materials for classes held during severe environmental events.',
    requires_approval: true,
  },
  {
    id: 'alternative_class_slot',
    label: 'Alternative Class / Tutorial Slot',
    description: 'Arrangement to attend an alternative indoor section or reschedule lab hours.',
    requires_approval: true,
  },
  {
    id: 'remote_participation_option',
    label: 'Remote Participation Option',
    description: 'Hybrid online attendance option where department infrastructure permits.',
    requires_approval: true,
  },
  {
    id: 'indoor_relocation',
    label: 'Indoor Facility Relocation',
    description: 'Relocating physical education or outdoor labs to air-filtered indoor auditoriums.',
    requires_approval: true,
  },
  {
    id: 'flexible_attendance_review',
    label: 'Attendance Consideration Review',
    description: 'Faculty advisory review of attendance records during CPCB Very Poor / Severe periods. Does not constitute automatic waiver.',
    requires_approval: true,
  },
];

export const BASELINE_RESPONSE_POLICIES = [
  {
    tier: 1,
    tier_name: 'Satisfactory / Moderate',
    pollutant: 'pm25',
    threshold_min: 60,
    threshold_max: 90,
    title: 'Level 1: Campus Advisory (Moderate Air Quality)',
    summary: 'Routine academic schedule continues. Air-conditioned libraries and filtered study halls made available for voluntary student study.',
    actions: [
      'Publish general advisory on institutional portal',
      'Ensure high-efficiency filters in campus study spaces are operational',
      'Encourage sensitive individuals to pace outdoor walking between campus blocks',
    ],
    accommodations: ['indoor_relocation'],
  },
  {
    tier: 2,
    tier_name: 'Poor',
    pollutant: 'pm25',
    threshold_min: 91,
    threshold_max: 120,
    title: 'Level 2: Outdoor Activity Postponement (Poor Air Quality)',
    summary: 'Strenuous outdoor sports and athletics postponed or moved indoors. Disclosed support students eligible for recorded lesson review.',
    actions: [
      'Postpone outdoor sports practices and athletic coaching',
      'Activate indoor HEPA air cleaning in academic blocks',
      'Notify course coordinators regarding potential accommodation requests',
    ],
    accommodations: ['recorded_lecture', 'alternative_class_slot'],
  },
  {
    tier: 3,
    tier_name: 'Very Poor',
    pollutant: 'pm25',
    threshold_min: 121,
    threshold_max: 250,
    title: 'Level 3: Enhanced Campus Health Protocol (Very Poor Air Quality)',
    summary: 'All outdoor student events relocated. Academic departments provide recorded lectures and alternate tutorial schedules upon staff approval.',
    actions: [
      'Mandatory indoor relocation of all student activities',
      'Distribute certified N95 masks at campus medical centre',
      'Staff review accommodation queue for sensitive students',
    ],
    accommodations: ['recorded_lecture', 'alternative_class_slot', 'indoor_relocation', 'flexible_attendance_review'],
  },
  {
    tier: 4,
    tier_name: 'Severe',
    pollutant: 'pm25',
    threshold_min: 251,
    threshold_max: 999,
    title: 'Level 4: Atmospheric Emergency Protocol (Severe NAQI > 400)',
    summary: 'Institutional crisis response. Hybrid lecture broadcast enabled where feasible. Attendance review granted for disclosed support students.',
    actions: [
      'Issue campus-wide emergency environmental advisory',
      'Enable hybrid and online classroom streaming',
      'Formal attendance consideration committee convenes',
    ],
    accommodations: ['remote_participation_option', 'recorded_lecture', 'flexible_attendance_review'],
  },
];

export const STATUTORY_CAMPUS_DISCLAIMER =
  'AIRPULSE Student Environmental Health & Campus Support is an administrative decision-support platform designed to assist institutional staff in coordinating operational accommodations. It does not provide medical diagnoses, clinical prescriptions, or automated attendance exemptions.';
