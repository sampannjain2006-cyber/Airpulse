/**
 * AIRPULSE — Pollution Protection & Accessories Store Catalog
 * 
 * Curated, verified product catalog for destination-aware environmental protection.
 * Contains genuine, verifiable product listings with explicit limitations, verified
 * certifications, and real seller URLs.
 * 
 * CRITICAL SAFETY RULES:
 * - Particulate masks (N95 / FFP2) DO NOT filter toxic gases (CO, NO2, SO2, O3).
 * - Masks require a tight facial seal; facial hair substantially impairs filtration.
 * - Buying accessories is NEVER a substitute for reducing exposure or following health advisories.
 */

export const STORE_PRODUCTS = [
  {
    id: '3m_9010in_particulate_respirator',
    name: '3M 9010IN Particulate Respirator (Pack of 5)',
    brand: '3M India',
    category: 'respirators',
    category_label: 'Particulate Respirators',
    intended_use: 'Personal respiratory protection against airborne fine particulate matter (PM2.5, PM10), road dust, and vehicle exhaust particles.',
    pollution_concerns: ['pm25', 'pm10'],
    pollution_labels: ['PM2.5', 'PM10'],
    certification: 'BIS IS 9473:2002 Class FFP2 (Filtration efficiency ≥ 95% for non-oil particulates)',
    limitations: 'DOES NOT protect against harmful gases and vapors (CO, NO2, SO2, O3). Ineffective without an airtight facial seal; facial hair severely impairs protection. Disposable, single-user mask.',
    seller_name: 'Amazon India (3M Authorized Distributor)',
    product_url: 'https://www.amazon.in/dp/B00V4S0EAE',
    verified_price: '₹249 (Pack of 5)',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 3, // Triggered at Moderate (Tier 3) or above
    priority: 1,
    image_badge: 'FFP2 / N95 MASK',
  },
  {
    id: '3m_aura_9322_valved_respirator',
    name: '3M Aura 9322+ Flat-Fold Respirator with Cool Flow Valve (Pack of 2)',
    brand: '3M India',
    category: 'respirators',
    category_label: 'Particulate Respirators',
    intended_use: 'Premium particulate protection with exhalation valve to reduce heat and moisture buildup during active outdoor transit in high PM2.5/PM10 smog.',
    pollution_concerns: ['pm25', 'pm10'],
    pollution_labels: ['PM2.5', 'PM10'],
    certification: 'EN 149:2001+A1:2009 FFP2 NR D / CE Certified (Filtration ≥ 94%)',
    limitations: 'DOES NOT protect against toxic gases (NO2, SO2, CO, O3). Exhalation valve releases unfiltered exhaled air (not suitable for medical/sterile environments). Requires airtight fit.',
    seller_name: 'Amazon India (3M Safety)',
    product_url: 'https://www.amazon.in/dp/B00GUP8FOG',
    verified_price: '₹450 (Pack of 2)',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 4, // Triggered at Poor (Tier 4) or above
    priority: 2,
    image_badge: 'VALVED FFP2',
  },
  {
    id: 'venus_v4400_n95_respirator',
    name: 'Venus V-4400 Flat-Fold Respirator (Pack of 5)',
    brand: 'Venus Safety & Health',
    category: 'respirators',
    category_label: 'Particulate Respirators',
    intended_use: 'Economic foldable respirator for urban commutes, pedestrian transit, and dusty road environments.',
    pollution_concerns: ['pm25', 'pm10'],
    pollution_labels: ['PM2.5', 'PM10'],
    certification: 'BIS IS 9473:2002 Class FFP2 / NIOSH N95 Equivalent Filtration',
    limitations: 'Ineffective against gaseous pollutants (CO, ozone, sulfur dioxide, nitrogen dioxide). Must be replaced when breathing resistance increases or mask becomes soiled.',
    seller_name: 'Amazon India (Venus Official Store)',
    product_url: 'https://www.amazon.in/dp/B07P7S2MGG',
    verified_price: '₹299 (Pack of 5)',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 3, // Triggered at Moderate or above
    priority: 3,
    image_badge: 'BIS FFP2',
  },
  {
    id: 'philips_series_1000i_air_purifier',
    name: 'Philips Series 1000i Smart Air Purifier (AC1215/20)',
    brand: 'Philips India',
    category: 'indoor_purifiers',
    category_label: 'Indoor Air Purifiers',
    intended_use: 'Indoor air filtration for hotel rooms, residential accommodations, and bedrooms up to 32 m² during severe outdoor air pollution episodes.',
    pollution_concerns: ['pm25', 'pm10', 'no2', 'so2'],
    pollution_labels: ['PM2.5', 'PM10', 'Acid Gases'],
    certification: 'True HEPA H13 (EN 1822) + Active Carbon Honeycomb Filter / CADR 270 m³/h',
    limitations: 'Effective ONLY in enclosed rooms with closed doors and windows. Active carbon layer provides finite odor/VOC adsorption and DOES NOT protect against Carbon Monoxide (CO).',
    seller_name: 'Philips India Official / Amazon India',
    product_url: 'https://www.amazon.in/dp/B071DX3VGB',
    verified_price: '₹9,999',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 4, // Triggered at Poor (Tier 4) or above
    priority: 4,
    image_badge: 'HEPA H13 PURIFIER',
  },
  {
    id: 'coway_airmega_150_air_purifier',
    name: 'Coway Airmega 150 (AP-1019C) Professional Air Purifier',
    brand: 'Coway India',
    category: 'indoor_purifiers',
    category_label: 'Indoor Air Purifiers',
    intended_use: 'High-performance indoor air purification for residential/hotel rooms up to 355 sq.ft with multi-stage Green True HEPA and active deodorization.',
    pollution_concerns: ['pm25', 'pm10'],
    pollution_labels: ['PM2.5', 'PM10'],
    certification: 'Green True HEPA (Traps 99.99% particles down to 0.1 µm) / BAF Certified',
    limitations: 'Requires fully sealed indoor conditions. Ineffective if windows are kept open. Filters require scheduled replacement every 12 months.',
    seller_name: 'Coway India Official / Amazon India',
    product_url: 'https://www.amazon.in/dp/B08HRY7L6Q',
    verified_price: '₹12,990',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 4, // Triggered at Poor (Tier 4) or above
    priority: 5,
    image_badge: 'GREEN HEPA',
  },
  {
    id: 'temtop_m10_air_quality_monitor',
    name: 'Temtop M10 Portable Air Quality Monitor (PM2.5, HCHO, TVOC, AQI)',
    brand: 'Elitech / Temtop',
    category: 'monitoring',
    category_label: 'Portable Air Monitors',
    intended_use: 'Informational handheld monitoring tool to check indoor vs outdoor PM2.5 levels during travel and evaluate room ventilation efficiency.',
    pollution_concerns: ['pm25', 'pm10'],
    pollution_labels: ['PM2.5', 'PM10'],
    certification: 'CE, RoHS, High-Precision Laser Particle Scattering Sensor',
    limitations: 'INFORMATIONAL MEASUREMENT TOOL ONLY; DOES NOT FILTER OR PURIFY AIR. Consumer sensor accuracy (±10%) does not replace statutory regulatory monitoring stations.',
    seller_name: 'Amazon India',
    product_url: 'https://www.amazon.in/dp/B07H7CH3MD',
    verified_price: '₹6,499',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 3, // Triggered at Moderate or above
    priority: 6,
    image_badge: 'LASER MONITOR',
  },
  {
    id: '3m_6200_half_face_gas_respirator',
    name: '3M 6200 Half-Facepiece Reusable Respirator with 6003 Acid Gas Cartridge',
    brand: '3M India',
    category: 'specialized_gas_protection',
    category_label: 'Specialized Chemical Respirators',
    intended_use: 'Specialized elastomeric half-face respirator with chemical sorbent cartridges for verified occupational or severe ambient acid gas (SO2) / organic vapor exposure.',
    pollution_concerns: ['so2', 'no2'],
    pollution_labels: ['SO2', 'NO2'],
    certification: 'NIOSH Approved (42 CFR 84) with 6003 Dual Cartridge',
    limitations: 'SPECIALIZED OCCUPATIONAL EQUIPMENT — NOT RECOMMENDED FOR GENERAL CONSUMER RECREATION. Imposes high breathing resistance; requires professional fit-testing. DOES NOT protect against Carbon Monoxide (CO).',
    seller_name: 'Amazon India (Industrial Safety)',
    product_url: 'https://www.amazon.in/dp/B007JZ1N00',
    verified_price: '₹2,850',
    price_currency: 'INR',
    is_pollution_triggered: true,
    min_severity_tier: 5, // Only triggered at Very Poor/Severe for SO2/NO2
    priority: 7,
    image_badge: 'GAS SORBENT',
  },
  {
    id: 'otrivin_breathe_clean_nasal_wash',
    name: 'Otrivin Breathe Clean Daily Nasal Wash Saline Spray (100ml)',
    brand: 'Otrivin (Haleon India)',
    category: 'travel_preparation',
    category_label: 'Travel Preparation & Hygiene',
    intended_use: 'Isotonic natural seawater spray to rinse coarse dust, environmental allergens, and mucus from nasal cavities following outdoor urban transit.',
    pollution_concerns: ['pm10', 'general'],
    pollution_labels: ['PM10', 'General Dust'],
    certification: 'ISO Medical Device / Natural Preservative-Free Isotonic Saline',
    limitations: 'Surface hygiene rinse only. DOES NOT protect the lower respiratory tract or alveoli from fine PM2.5 or toxic gases.',
    seller_name: 'Amazon India / PharmEasy',
    product_url: 'https://www.amazon.in/dp/B08NXD9J44',
    verified_price: '₹299',
    price_currency: 'INR',
    is_pollution_triggered: false, // General travel hygiene
    min_severity_tier: 1,
    priority: 8,
    image_badge: 'NASAL RINSE',
  },
  {
    id: 'fastrack_wraparound_protective_eyewear',
    name: 'Fastrack UV-Protected Wraparound Protective Eyewear',
    brand: 'Fastrack (Titan)',
    category: 'travel_preparation',
    category_label: 'Travel Preparation & Hygiene',
    intended_use: 'Outdoor eye protection to shield corneas from windborne dust, coarse particulate grit, and road glare during two-wheeler or pedestrian commutes.',
    pollution_concerns: ['pm10', 'general'],
    pollution_labels: ['PM10', 'Windborne Grit'],
    certification: '100% UV400 Protection / Impact Resistant Polycarbonate Lenses',
    limitations: 'DOES NOT protect eyes from chemical smog, ozone, or acidic gas stinging. Protective shield against mechanical dust and grit only.',
    seller_name: 'Amazon India / Fastrack Store',
    product_url: 'https://www.amazon.in/dp/B07C2N16PZ',
    verified_price: '₹999',
    price_currency: 'INR',
    is_pollution_triggered: false, // General travel comfort
    min_severity_tier: 1,
    priority: 9,
    image_badge: 'DUST SHIELD',
  },
  {
    id: 'borosil_insulated_hydration_flask',
    name: 'Borosil Stainless Steel Insulated Travel Flask (750ml)',
    brand: 'Borosil',
    category: 'travel_preparation',
    category_label: 'Travel Preparation & Hygiene',
    intended_use: 'Maintaining regular oral hydration to keep pharyngeal mucous membranes moist and resilient when traveling through dry, smoggy urban areas.',
    pollution_concerns: ['general'],
    pollution_labels: ['General Health'],
    certification: 'Food Grade BPA-Free SS 304 Stainless Steel',
    limitations: 'General physiological hydration support only. Has no direct filtration action on airborne ambient pollutants.',
    seller_name: 'Borosil Official / Amazon India',
    product_url: 'https://www.amazon.in/dp/B07N8D9F9R',
    verified_price: '₹845',
    price_currency: 'INR',
    is_pollution_triggered: false, // General travel comfort
    min_severity_tier: 1,
    priority: 10,
    image_badge: 'HYDRATION FLASK',
  },
];

export const STORE_DISCLAIMERS = {
  non_substitution_notice:
    'CRITICAL HEALTH ADVISORY: Purchasing protective accessories or air purifiers is NEVER a substitute for reducing exposure, avoiding strenuous outdoor activities during severe smog, or following statutory public health alerts.',
  gas_protection_warning:
    'GAS FILTER LIMITATION: Ordinary particulate respirators (N95, FFP2, surgical masks, cloth masks) DO NOT filter harmful gaseous pollutants such as Carbon Monoxide (CO), Ozone (O3), Sulfur Dioxide (SO2), or Nitrogen Dioxide (NO2). When gaseous pollutants are elevated, staying indoors in clean air is the primary protective strategy.',
  respirator_fit_notice:
    'FIT & SEAL REQUIREMENT: A particulate respirator provides its rated filtration (≥95%) ONLY when tightly fitted against smooth, clean-shaven skin with the metal noseband properly contoured. Facial hair or improper strap placement causes air to leak around the edges, drastically degrading real-world protection.',
  verified_links_notice:
    'DIRECT SELLER LISTINGS: Product links point directly to established sellers and official brand distributors. AIRPULSE receives no automated commercial sponsorship or undisclosed affiliate kickbacks.',
  forecast_disclaimer:
    'ADVANCE PLANNING ONLY: Recommendations based on 5-day ML forecasts represent advance travel planning guidance, not a guarantee of meteorological conditions upon arrival. Check live observations prior to departure.',
};

/**
 * Returns all products in catalog
 */
export function getAllStoreProducts() {
  return STORE_PRODUCTS;
}

/**
 * Returns a product by ID
 */
export function getStoreProductById(id) {
  if (!id) return null;
  return STORE_PRODUCTS.find((p) => p.id === id) || null;
}

/**
 * Filters products by category, pollutant concern, or pollution-triggered flag
 */
export function filterStoreProducts({ category, pollutant, is_pollution_triggered } = {}) {
  let results = [...STORE_PRODUCTS];

  if (category && category !== 'all') {
    results = results.filter((p) => p.category === category);
  }

  if (pollutant && pollutant !== 'all') {
    const pKey = pollutant.toLowerCase().trim();
    results = results.filter((p) => p.pollution_concerns.includes(pKey) || p.pollution_concerns.includes('general'));
  }

  if (is_pollution_triggered !== undefined && is_pollution_triggered !== null) {
    const flag = String(is_pollution_triggered).toLowerCase() === 'true';
    results = results.filter((p) => p.is_pollution_triggered === flag);
  }

  return results;
}
