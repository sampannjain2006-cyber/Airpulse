/**
 * AIRPULSE Authoritative Environmental Precaution Rules Catalog
 * 
 * Provides rule-based, verified public-health recommendations mapped to:
 * - Pollutant identity (PM2.5, PM10, NO2, SO2, CO, O3)
 * - CPCB NAQI Severity Tiers (1: Good, 2: Satisfactory, 3: Moderate, 4: Poor, 5: Very Poor, 6: Severe)
 * - Data Context (Observed Ground Telemetry, 5-Day ML Forecast, Google Modelled, Historical)
 * 
 * Sources:
 * - Central Pollution Control Board (CPCB) NAQI Standard & Health Breakpoints (2014)
 * - World Health Organization (WHO) Global Air Quality Guidelines (2021)
 * - Ministry of Health and Family Welfare (MoHFW) Environmental Health Advisory
 */

export const HEALTH_SOURCES = {
  cpcb_naqi: {
    name: 'Central Pollution Control Board (CPCB)',
    document: 'National Air Quality Index (NAQI) Health Advisory & Breakpoints (2014)',
    url: 'https://cpcb.nic.in/national-air-quality-index/',
    type: 'regulatory_standard',
  },
  who_aqg: {
    name: 'World Health Organization (WHO)',
    document: 'WHO Global Air Quality Guidelines: Particulate Matter, Ozone, Nitrogen Dioxide, Sulfur Dioxide and Carbon Monoxide (2021)',
    url: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
    type: 'international_health_guideline',
  },
  mohfw_advisory: {
    name: 'Ministry of Health and Family Welfare (MoHFW), Govt of India',
    document: 'Public Health Advisory on Ambient Air Pollution & Sensitive Populations',
    url: 'https://cpcb.nic.in/air-quality-standards/',
    type: 'national_health_advisory',
  },
};

export const RECOMMENDATION_RULES = [
  // --- TIER 1: GOOD ---
  {
    id: 'rec-good-all',
    title: 'Normal Outdoor Activities Permitted',
    explanation: 'Ambient air quality meets national standards. General public and sensitive individuals may engage in regular outdoor exertion and recreation without special restrictions.',
    applicable_pollutants: ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'general'],
    min_severity_tier: 1,
    max_severity_tier: 1,
    target_audience: 'general_public',
    priority: 1,
    trigger_description: 'Air quality in Tier 1 (Good, AQI 0–50). Minimal or no health impact.',
    rationale: 'Pollutant concentrations remain below regulatory threshold limits; normal physiological ventilation presents negligible airborne risk.',
    source: HEALTH_SOURCES.cpcb_naqi,
    disclaimer: 'General advisory only. Individuals with acute respiratory conditions should follow personalized medical guidance.',
  },

  // --- TIER 2: SATISFACTORY ---
  {
    id: 'rec-satisfactory-sensitive',
    title: 'Monitor Breathing Symptoms for Unusually Sensitive Individuals',
    explanation: 'Air quality is acceptable for the general public. However, individuals with severe asthma or hypersensitive airways should take note if respiratory symptoms develop during prolonged outdoor exertion.',
    applicable_pollutants: ['pm25', 'pm10', 'o3', 'no2'],
    min_severity_tier: 2,
    max_severity_tier: 2,
    target_audience: 'sensitive_groups',
    priority: 2,
    trigger_description: 'Air quality in Tier 2 (Satisfactory, AQI 51–100). Minor discomfort possible in sensitive persons.',
    rationale: 'Mild irritant potential in hyper-reactive airways during deep respiration associated with high-intensity cardiovascular training.',
    source: HEALTH_SOURCES.cpcb_naqi,
    disclaimer: 'Does not require healthy individuals to alter regular schedules.',
  },

  // --- TIER 3: MODERATE (PM2.5, PM10) ---
  {
    id: 'rec-moderate-particulate-caution',
    title: 'Reduce Prolonged or Strenuous Outdoor Exertion for Sensitive Groups',
    explanation: 'Children, older adults, and individuals with diagnosed heart or lung disease (including asthma) should limit continuous high-intensity outdoor activities and schedule frequent resting intervals.',
    applicable_pollutants: ['pm25', 'pm10'],
    min_severity_tier: 3,
    max_severity_tier: 3,
    target_audience: 'sensitive_groups',
    priority: 1,
    trigger_description: 'Particulate matter in Tier 3 (Moderate, PM2.5 61–90 µg/m³ or PM10 101–250 µg/m³).',
    rationale: 'Elevated particulate mass concentrations increase airway resistance and can trigger acute bronchospasm in vulnerable respiratory tracts.',
    source: HEALTH_SOURCES.cpcb_naqi,
    disclaimer: 'General public may continue moderate outdoor activities unless feeling irritation.',
  },

  // --- TIER 4: POOR (PM2.5, PM10) ---
  {
    id: 'rec-poor-reduce-outdoor-general',
    title: 'Limit Prolonged Outdoor Exertion & Move Heavy Exercise Indoors',
    explanation: 'Everyone should reduce prolonged or heavy exertion outdoors. Consider moving cardiovascular exercises, running, and heavy manual labor to indoor ventilated facilities.',
    applicable_pollutants: ['pm25', 'pm10'],
    min_severity_tier: 4,
    max_severity_tier: 6,
    target_audience: 'general_public',
    priority: 1,
    trigger_description: 'Particulates in Tier 4+ (Poor, Very Poor, or Severe, PM2.5 ≥ 91 µg/m³ or PM10 ≥ 251 µg/m³).',
    rationale: 'Deep breathing during strenuous outdoor exercise increases inhaled particulate dose by up to 500%, depositing fine particles deep into pulmonary alveoli.',
    source: HEALTH_SOURCES.who_aqg,
    disclaimer: 'Indoor spaces should have closed windows and adequate air cleaning to maintain lower particle levels than outdoors.',
  },

  {
    id: 'rec-poor-respirator-advisory',
    title: 'Use Well-Fitted N95/FFP2 Respirator if Outdoor Exposure is Unavoidable',
    explanation: 'If staying outdoors for extended periods is necessary, wear a certified particulate respirator (N95, FFP2, or equivalent) with an airtight seal around the nose and mouth.',
    applicable_pollutants: ['pm25', 'pm10'],
    min_severity_tier: 4,
    max_severity_tier: 6,
    target_audience: 'outdoor_workers',
    priority: 2,
    trigger_description: 'Particulates reach Tier 4 (Poor) or higher with unavoidable occupational or transit exposure.',
    rationale: 'Certified particulate filtering facepieces reduce inhaled particulate mass concentration when properly sealed to facial contours.',
    source: HEALTH_SOURCES.who_aqg,
    disclaimer: 'CRITICAL LIMITATION: Particulate respirators filter solid/liquid particles only. They do NOT absorb gaseous pollutants (NO₂, SO₂, CO, O₃) and provide no protection against toxic gases or oxygen deficiency.',
  },

  // --- TIER 5: VERY POOR ---
  {
    id: 'rec-verypoor-indoor-containment',
    title: 'Keep Windows Closed & Restrict Outdoor Exposure to Essential Travel',
    explanation: 'Keep doors and windows firmly closed, especially during early morning and late evening rush-hour thermal inversions. Avoid burning candles, incense, or open frying indoors.',
    applicable_pollutants: ['pm25', 'pm10', 'no2', 'so2', 'general'],
    min_severity_tier: 5,
    max_severity_tier: 6,
    target_audience: 'general_public',
    priority: 1,
    trigger_description: 'Air pollution reaches Tier 5 (Very Poor, AQI 301–400 / PM2.5 121–250 µg/m³).',
    rationale: 'Ambient concentrations pose significant risk of respiratory distress and systemic inflammation upon prolonged inhalation; indoor envelope sealing limits particulate infiltration.',
    source: HEALTH_SOURCES.cpcb_naqi,
    disclaimer: 'Ensure adequate fresh air exchange during non-polluted windows or utilize mechanical filtration with HEPA media.',
  },

  // --- TIER 6: SEVERE ---
  {
    id: 'rec-severe-avoid-all-outdoors',
    title: 'Avoid All Outdoor Physical Activity & Seek Medical Attention if Symptomatic',
    explanation: 'Everyone should stay indoors and minimize physical exertion. Sensitive individuals should remain in clean rooms with air purification. Seek prompt medical evaluation if experiencing persistent wheezing, chest pain, or shortness of breath.',
    applicable_pollutants: ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'general'],
    min_severity_tier: 6,
    max_severity_tier: 6,
    target_audience: 'all',
    priority: 1,
    trigger_description: 'Air pollution reaches Tier 6 (Severe, AQI > 400 / PM2.5 > 250 µg/m³). Serious emergency tier.',
    rationale: 'Severe concentrations trigger acute exacerbations of cardiopulmonary conditions and adversely affect healthy human respiratory epithelium.',
    source: HEALTH_SOURCES.cpcb_naqi,
    disclaimer: 'This is not medical diagnosis or prescription. Emergency symptoms require professional hospital or clinical evaluation.',
  },

  // --- POLLUTANT-SPECIFIC: NO2 (NITROGEN DIOXIDE) ---
  {
    id: 'rec-no2-traffic-distance',
    title: 'Maintain Distance from Heavy Traffic Arteries & Idling Vehicles',
    explanation: 'Avoid walking, exercising, or dwelling in close proximity to major vehicular transit corridors, bus stations, and congested intersections where motor vehicle exhaust is concentrated.',
    applicable_pollutants: ['no2'],
    min_severity_tier: 4,
    max_severity_tier: 6,
    target_audience: 'general_public',
    priority: 2,
    trigger_description: 'Nitrogen dioxide exceeds Tier 4 (Poor, NO₂ ≥ 181 µg/m³).',
    rationale: 'NO₂ is a primary vehicular combustion byproduct that causes airway hyper-responsiveness and reduces macrophage resistance to respiratory infections.',
    source: HEALTH_SOURCES.who_aqg,
    disclaimer: 'Particulate masks (N95) do not absorb gaseous nitrogen dioxide.',
  },

  // --- POLLUTANT-SPECIFIC: SO2 (SULFUR DIOXIDE) ---
  {
    id: 'rec-so2-asthma-inhaler',
    title: 'Asthma Management & Industrial Emission Avoidance',
    explanation: 'Individuals diagnosed with asthma or hyper-reactive airways should keep quick-relief rescue inhalers immediately accessible and avoid outdoor areas near industrial boiler exhausts or coal combustion plants.',
    applicable_pollutants: ['so2'],
    min_severity_tier: 3,
    max_severity_tier: 6,
    target_audience: 'sensitive_groups',
    priority: 1,
    trigger_description: 'Sulfur dioxide reaches Tier 3+ (Moderate+, SO₂ ≥ 81 µg/m³).',
    rationale: 'SO₂ is a highly soluble irritant gas that induces reflex bronchoconstriction within 5 to 10 minutes of exposure in sensitive asthmatics.',
    source: HEALTH_SOURCES.cpcb_naqi,
    disclaimer: 'Rescue medication should be taken strictly as prescribed by a licensed physician.',
  },

  // --- POLLUTANT-SPECIFIC: CO (CARBON MONOXIDE) ---
  {
    id: 'rec-co-cardiovascular-caution',
    title: 'Ventilate Enclosed Spaces & Restrict Physical Stress for Cardiac Patients',
    explanation: 'Ensure continuous cross-ventilation in workshops, garages, or kitchens. Individuals with angina, coronary artery disease, or prior myocardial infarction must avoid heavy physical exertion.',
    applicable_pollutants: ['co'],
    min_severity_tier: 4,
    max_severity_tier: 6,
    target_audience: 'sensitive_groups',
    priority: 1,
    trigger_description: 'Carbon monoxide reaches Tier 4+ (Poor+, CO ≥ 10.1 mg/m³).',
    rationale: 'CO competitively binds to hemoglobin forming carboxyhemoglobin, which reduces systemic oxygen delivery and increases myocardial ischemia risk.',
    source: HEALTH_SOURCES.who_aqg,
    disclaimer: 'Standard particulate respirators offer zero protection against carbon monoxide gas.',
  },

  // --- POLLUTANT-SPECIFIC: O3 (GROUND-LEVEL OZONE) ---
  {
    id: 'rec-o3-afternoon-shift',
    title: 'Shift Outdoor Activities Away from Peak Afternoon Hours (12 PM – 5 PM)',
    explanation: 'Reschedule sports, running, and heavy outdoor labor to early morning or late evening. Ground-level ozone reaches peak concentration during warm, sunny afternoon hours.',
    applicable_pollutants: ['o3'],
    min_severity_tier: 3,
    max_severity_tier: 6,
    target_audience: 'general_public',
    priority: 2,
    trigger_description: 'Ground-level ozone reaches Tier 3+ (Moderate+, O₃ ≥ 101 µg/m³).',
    rationale: 'Tropospheric ozone is a photochemical oxidant formed by solar irradiation of precursor gases; concentrations decline sharply before dawn and after sunset.',
    source: HEALTH_SOURCES.who_aqg,
    disclaimer: 'Ground-level ozone is gaseous; standard particle filters do not trap ozone molecules.',
  },

  // --- FORECAST-SPECIFIC: 5-DAY ML ADVANCE PREPARATION ---
  {
    id: 'rec-forecast-advance-preparation',
    title: 'Precautionary Schedule Adjustments for Projected High-Exposure Episode',
    explanation: 'The 5-day ML forecast indicates air quality is projected to reach Poor or Severe tiers on this date. Schools, sports organizations, and sensitive individuals should plan indoor alternatives and check medication supplies in advance.',
    applicable_pollutants: ['pm25', 'general'],
    min_severity_tier: 4,
    max_severity_tier: 6,
    target_audience: 'general_public',
    priority: 3,
    trigger_description: 'Multi-model forecast projects Tier 4+ (Poor+) within the 5-day window.',
    rationale: 'Predictive forecasting enables proactive administrative and personal exposure reduction before peak pollution episodes materialize.',
    source: HEALTH_SOURCES.mohfw_advisory,
    disclaimer: 'Forecast-based precaution. Real atmospheric trajectory may vary with meteorological dispersion.',
  },
];
