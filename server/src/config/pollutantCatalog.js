/**
 * AIRPULSE Authoritative Pollutant Information Catalog (Backend ES Module)
 * 
 * Provides verified definitions, common sources, measurement units, health/environmental
 * significance, authoritative regulatory citations (CPCB, WHO), and data limitations for
 * the 6 atmospheric pollutants actually supported by AIRPULSE.
 */

export const POLLUTANT_CATALOG = {
  pm25: {
    id: 'pm25',
    symbol: 'PM2.5',
    displayName: 'Fine Particulate Matter (≤ 2.5 µm)',
    chemicalFormulaHtml: 'PM<sub>2.5</sub>',
    shortDescription: 'Inhalable airborne particles with aerodynamic diameter equal to or less than 2.5 micrometres — about 30 times thinner than a human hair.',
    whatItRepresents: 'Mass concentration of micro-particles suspended in the atmosphere per cubic metre of air.',
    primarySources: [
      'Vehicular combustion engines (especially diesel exhaust)',
      'Coal-fired thermal power plants and industrial kilns',
      'Biomass, agricultural residue, and municipal waste burning',
      'Secondary aerosol formation from precursor gases (SO₂, NOₓ, NH₃)',
      'Construction dust and road dust abrasion',
    ],
    units: {
      standard: 'µg/m³',
      openaq: 'µg/m³ (micrograms per cubic metre)',
      google: 'µg/m³ (MICROGRAMS_PER_CUBIC_METER)',
      notes: 'Micrograms per cubic metre under reference atmospheric temperature (25°C) and pressure (1 atm).',
    },
    healthRelevance: 'Due to their miniature size, PM2.5 particles penetrate deep into the alveolar regions of the lungs and enter the bloodstream. Epidemiological studies associate exposure with cardiovascular disease, reduced lung function, acute respiratory distress, and aggravated asthma.',
    environmentalRelevance: 'PM2.5 causes regional haze and visibility reduction, alters atmospheric radiative forcing (solar absorption vs reflection), and deposits acidic or heavy metal constituents on soil and water bodies.',
    interpretationGuide: 'Under India CPCB NAQI guidelines, 24-hour PM2.5 below 30 µg/m³ is considered Good, 31–60 µg/m³ Satisfactory, 61–90 µg/m³ Moderate, 91–120 µg/m³ Poor, 121–250 µg/m³ Very Poor, and above 250 µg/m³ Severe.',
    regulatoryThresholds: {
      cpcb_naaqs_24hr: '60 µg/m³ (CPCB National Ambient Air Quality Standard, 24-hr)',
      cpcb_naaqs_annual: '40 µg/m³ (CPCB NAAQS, Annual Average)',
      who_guideline_24hr: '15 µg/m³ (WHO Global Air Quality Guidelines 2021, 24-hr)',
      who_guideline_annual: '5 µg/m³ (WHO Global Air Quality Guidelines 2021, Annual)',
      cpcb_aqi_breakpoint_good: '0 – 30 µg/m³ (Sub-index 0 – 50)',
    },
    limitationsAndContext: [
      'Physical monitoring instruments (BAM, optical particle counters) may experience measurement drift at high relative humidity (>80%).',
      'Instantaneous hourly readings fluctuate significantly with localized gusty winds and road traffic spikes, whereas official NAAQS standards evaluate 24-hour averages.',
      'A high PM2.5 concentration is NOT directly identical to an AQI number; concentration must be evaluated through CPCB piecewise linear breakpoints.',
    ],
    references: [
      {
        organization: 'Central Pollution Control Board (CPCB), Ministry of Environment, Forest & Climate Change, Govt of India',
        title: 'National Air Quality Index (NAQI) Report & Breakpoints (2014)',
        url: 'https://cpcb.nic.in/national-air-quality-index/',
        type: 'regulatory_standard',
        description: 'Official Indian national AQI categorization system, sub-index formulas, and pollutant concentration breakpoints.',
      },
      {
        organization: 'World Health Organization (WHO)',
        title: 'WHO Global Air Quality Guidelines (2021): Particulate Matter (PM2.5 and PM10)',
        url: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
        type: 'air_quality_guideline',
        description: 'Evidence-based health guideline levels and interim targets for ambient particulate matter exposure.',
      },
    ],
  },

  pm10: {
    id: 'pm10',
    symbol: 'PM10',
    displayName: 'Respirable Particulate Matter (≤ 10 µm)',
    chemicalFormulaHtml: 'PM<sub>10</sub>',
    shortDescription: 'Inhalable coarse airborne particles with an aerodynamic diameter of 10 micrometres or smaller, including coarse dust and pollen.',
    whatItRepresents: 'Mass concentration of inhalable coarse suspended particles per cubic metre of air.',
    primarySources: [
      'Road dust resuspension and unpaved roadway vehicular traffic',
      'Construction, demolition, and earthmoving activities',
      'Windblown crustal dust, agricultural plowing, and desert storms',
      'Industrial crushing, quarrying, and mining operations',
      'Combustion soot and fly ash',
    ],
    units: {
      standard: 'µg/m³',
      openaq: 'µg/m³',
      google: 'µg/m³ (MICROGRAMS_PER_CUBIC_METER)',
      notes: 'Micrograms per cubic metre.',
    },
    healthRelevance: 'Coarse particles are trapped in the upper respiratory tract, nasal passages, and trachea. Exposure causes irritation of the eyes, nose, and throat, chronic coughing, and aggravation of chronic obstructive pulmonary disease (COPD).',
    environmentalRelevance: 'Accelerates soiling of architectural structures and historical monuments, reduces solar radiation penetration onto plant foliage, and inhibits crop photosynthesis.',
    interpretationGuide: 'Under CPCB NAQI guidelines, 24-hr PM10 below 50 µg/m³ is Good, 51–100 Satisfactory, 101–250 Moderate, 251–350 Poor, 351–430 Very Poor, and >430 µg/m³ Severe.',
    regulatoryThresholds: {
      cpcb_naaqs_24hr: '100 µg/m³ (CPCB NAAQS, 24-hr)',
      cpcb_naaqs_annual: '60 µg/m³ (CPCB NAAQS, Annual)',
      who_guideline_24hr: '45 µg/m³ (WHO Guidelines 2021, 24-hr)',
      who_guideline_annual: '15 µg/m³ (WHO Guidelines 2021, Annual)',
      cpcb_aqi_breakpoint_good: '0 – 50 µg/m³ (Sub-index 0 – 50)',
    },
    limitationsAndContext: [
      'PM10 measurement mechanically includes the finer PM2.5 fraction (PM2.5 is a subset of PM10). In dry and arid Indian seasons, windblown dust can raise PM10 substantially without a proportional rise in industrial PM2.5.',
    ],
    references: [
      {
        organization: 'Central Pollution Control Board (CPCB)',
        title: 'National Ambient Air Quality Standards (NAAQS Notification, 2009)',
        url: 'https://cpcb.nic.in/air-quality-standards/',
        type: 'regulatory_standard',
        description: 'Mandated Indian ambient limits for industrial, residential, rural, and ecologically sensitive zones.',
      },
      {
        organization: 'World Health Organization (WHO)',
        title: 'Ambient (Outdoor) Air Pollution Health Facts',
        url: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
        type: 'air_quality_guideline',
        description: 'Global health research syntheses on inhalable coarse dust exposure.',
      },
    ],
  },

  no2: {
    id: 'no2',
    symbol: 'NO₂',
    displayName: 'Nitrogen Dioxide',
    chemicalFormulaHtml: 'NO<sub>2</sub>',
    shortDescription: 'A reddish-brown pungent gas and reactive free-radical pollutant belonging to the group of highly reactive nitrogen oxides (NOₓ).',
    whatItRepresents: 'Concentration of nitrogen dioxide gas in ambient air.',
    primarySources: [
      'High-temperature fuel combustion in automobile and truck engines',
      'Thermal power generation facilities and fossil fuel boilers',
      'Industrial refineries and chemical manufacturing plants',
      'Off-road diesel machinery and locomotive transport',
    ],
    units: {
      standard: 'µg/m³',
      openaq: 'µg/m³',
      google: 'ppb or µg/m³ (converted to µg/m³ in standard display)',
      notes: 'CPCB reports in µg/m³ (conversion factor at 25°C: 1 ppb ≈ 1.88 µg/m³).',
    },
    healthRelevance: 'Causes bronchial hyper-reactivity, airway inflammation, and increased susceptibility to respiratory infections. Children and asthmatic patients are particularly vulnerable to elevated short-term peaks.',
    environmentalRelevance: 'Key precursor in photochemical ozone (O₃) generation in the presence of volatile organic compounds and sunlight; reacts with atmospheric moisture to form nitric acid (acid precipitation).',
    interpretationGuide: 'Under CPCB NAQI guidelines, 24-hr NO₂ below 40 µg/m³ is Good, 41–80 Satisfactory, 81–180 Moderate, 181–280 Poor, 281–400 Very Poor, and >400 µg/m³ Severe.',
    regulatoryThresholds: {
      cpcb_naaqs_24hr: '80 µg/m³ (CPCB NAAQS, 24-hr)',
      cpcb_naaqs_annual: '40 µg/m³ (CPCB NAAQS, Annual)',
      who_guideline_24hr: '25 µg/m³ (WHO Guidelines 2021, 24-hr)',
      who_guideline_annual: '10 µg/m³ (WHO Guidelines 2021, Annual)',
      cpcb_aqi_breakpoint_good: '0 – 40 µg/m³ (Sub-index 0 – 50)',
    },
    limitationsAndContext: [
      'Nitrogen dioxide exhibits strong diurnal variations with dual morning and evening vehicular traffic rush-hour peaks.',
      'Sensors using chemiluminescence or electrochemical techniques may exhibit cross-sensitivity to other nitrogenous species (e.g., PAN, HNO₃).',
    ],
    references: [
      {
        organization: 'Central Pollution Control Board (CPCB)',
        title: 'NAQI Guidelines & Technical Breakpoint Formulations (2014)',
        url: 'https://cpcb.nic.in/national-air-quality-index/',
        type: 'regulatory_standard',
        description: 'Comprehensive guidelines detailing sub-index equations for nitrogen dioxide.',
      },
      {
        organization: 'World Health Organization (WHO)',
        title: 'Health Effects of Nitrogen Dioxide Exposure',
        url: 'https://www.who.int/publications/i/item/9789240034228',
        type: 'air_quality_guideline',
        description: 'Systematic review of epidemiological evidence on ambient NO₂ exposure.',
      },
    ],
  },

  so2: {
    id: 'so2',
    symbol: 'SO₂',
    displayName: 'Sulfur Dioxide',
    chemicalFormulaHtml: 'SO<sub>2</sub>',
    shortDescription: 'A colourless, pungent, irritating gas produced primarily from the combustion of sulfur-bearing fossil fuels and smelting of sulfide ores.',
    whatItRepresents: 'Concentration of sulfur dioxide gas molecules in the atmospheric boundary layer.',
    primarySources: [
      'Coal combustion in thermal power plants lacking flue-gas desulfurization (FGD)',
      'Petroleum refining and industrial chemical processing',
      'Metal extraction and smelting from sulfide ores (copper, zinc, lead)',
      'Heavy fuel oil combustion in marine vessels and industrial boilers',
    ],
    units: {
      standard: 'µg/m³',
      openaq: 'µg/m³',
      google: 'ppb or µg/m³ (converted to µg/m³ in standard display)',
      notes: 'CPCB reports in µg/m³ (conversion factor at 25°C: 1 ppb ≈ 2.62 µg/m³).',
    },
    healthRelevance: 'Strong irritant to mucous membranes and the upper respiratory tract. Causes bronchoconstriction in asthmatics within minutes of exposure, chest tightness, and wheezing.',
    environmentalRelevance: 'Oxidizes in clouds and mist to form sulfuric acid (acid rain), damaging sensitive freshwater ecosystems, accelerating forest defoliation, and corroding limestone and cultural monuments.',
    interpretationGuide: 'Under CPCB NAQI guidelines, 24-hr SO₂ below 40 µg/m³ is Good, 41–80 Satisfactory, 81–380 Moderate, 381–800 Poor, 801–1600 Very Poor, and >1600 µg/m³ Severe.',
    regulatoryThresholds: {
      cpcb_naaqs_24hr: '80 µg/m³ (CPCB NAAQS, 24-hr)',
      cpcb_naaqs_annual: '50 µg/m³ (CPCB NAAQS, Annual)',
      who_guideline_24hr: '40 µg/m³ (WHO Guidelines 2021, 24-hr)',
      who_guideline_annual: 'Not defined (WHO 24-hr focus)',
      cpcb_aqi_breakpoint_good: '0 – 40 µg/m³ (Sub-index 0 – 50)',
    },
    limitationsAndContext: [
      'Point source plumes from coal power plants can cause localized, high-intensity SO₂ spikes that dissipate rapidly downwind, which regional sparse stations may not detect.',
    ],
    references: [
      {
        organization: 'Central Pollution Control Board (CPCB)',
        title: 'NAAQS Regulatory Limits for Sulfur Dioxide',
        url: 'https://cpcb.nic.in/air-quality-standards/',
        type: 'regulatory_standard',
        description: 'Mandatory Indian ambient air quality standards for sulfur dioxide.',
      },
      {
        organization: 'World Health Organization (WHO)',
        title: 'WHO Guidelines on Ambient Air Quality — Sulfur Dioxide',
        url: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
        type: 'air_quality_guideline',
        description: 'Global health thresholds for short-term and 24-hour sulfur dioxide exposure.',
      },
    ],
  },

  co: {
    id: 'co',
    symbol: 'CO',
    displayName: 'Carbon Monoxide',
    chemicalFormulaHtml: 'CO',
    shortDescription: 'A colourless, odourless, tasteless, and toxic gas formed by the incomplete combustion of carbon-containing fuels.',
    whatItRepresents: 'Concentration of carbon monoxide in ambient air, conventionally expressed in milligrams per cubic metre (mg/m³).',
    primarySources: [
      'Incomplete fuel combustion in gasoline and diesel motor vehicles (especially idling in traffic)',
      'Biomass cooking stoves and open municipal burning',
      'Iron, steel, and metallurgical manufacturing processes',
      'Domestic kerosene heating and generator exhaust',
    ],
    units: {
      standard: 'mg/m³',
      openaq: 'mg/m³ (or µg/m³ converted to mg/m³)',
      google: 'ppm or mg/m³ (1 ppm ≈ 1.15 mg/m³ at 25°C)',
      notes: 'AIRPULSE and CPCB standardize carbon monoxide measurements in mg/m³ (milligrams), unlike other pollutants which use µg/m³.',
    },
    healthRelevance: 'Carbon monoxide binds strongly to haemoglobin in red blood cells with ~200× the affinity of oxygen, forming carboxyhaemoglobin (COHb). This reduces blood oxygen delivery to vital organs, impairing cognitive function and endangering individuals with cardiovascular conditions.',
    environmentalRelevance: 'Does not directly cause acid rain, but acts as a major sink for hydroxyl radicals (OH), indirectly prolonging the lifetime of greenhouse gases like methane (CH₄) in the troposphere.',
    interpretationGuide: 'Under CPCB NAQI guidelines (8-hr average), CO below 1.0 mg/m³ is Good, 1.1–2.0 Satisfactory, 2.1–10.0 Moderate, 10.1–17.0 Poor, 17.1–34.0 Very Poor, and >34.0 mg/m³ Severe.',
    regulatoryThresholds: {
      cpcb_naaqs_24hr: '2.0 mg/m³ (CPCB NAAQS, 8-hr average; 4.0 mg/m³ for 1-hr)',
      cpcb_naaqs_annual: 'Not applicable (short-term averages used)',
      who_guideline_24hr: '4.0 mg/m³ (WHO Guidelines 2021, 24-hr average)',
      who_guideline_annual: 'Not defined',
      cpcb_aqi_breakpoint_good: '0 – 1.0 mg/m³ (Sub-index 0 – 50)',
    },
    limitationsAndContext: [
      'Unit distinction is critical: 1 mg/m³ = 1000 µg/m³. Comparing a numerical CO reading to PM2.5 without observing the unit difference will lead to gross misinterpretation.',
      'Urban CO concentrations peak near congested intersections and enclosed roadway corridors.',
    ],
    references: [
      {
        organization: 'Central Pollution Control Board (CPCB)',
        title: 'CPCB NAQI Technical Formulations — Carbon Monoxide Breakpoints',
        url: 'https://cpcb.nic.in/national-air-quality-index/',
        type: 'regulatory_standard',
        description: 'Indian National Air Quality Index sub-index standards for carbon monoxide.',
      },
      {
        organization: 'World Health Organization (WHO)',
        title: 'WHO Guidelines for Indoor and Outdoor Air Quality — Carbon Monoxide',
        url: 'https://www.who.int/publications/i/item/9789240034228',
        type: 'air_quality_guideline',
        description: 'Toxicological and physiological benchmarks for carboxyhaemoglobin thresholds.',
      },
    ],
  },

  o3: {
    id: 'o3',
    symbol: 'O₃',
    displayName: 'Ground-Level Ozone (Tropospheric)',
    chemicalFormulaHtml: 'O<sub>3</sub>',
    shortDescription: 'A pale blue secondary reactive gas formed in the troposphere through complex photochemical reactions between nitrogen oxides (NOₓ) and volatile organic compounds (VOCs) in the presence of solar radiation.',
    whatItRepresents: 'Concentration of ground-level tropospheric ozone molecules per cubic metre of air. (Distinct from beneficial stratospheric ozone).',
    primarySources: [
      'Secondary chemical formation from vehicle exhaust (NOₓ + hydrocarbons + sunlight)',
      'Volatile organic solvent evaporation from chemical paints and industrial facilities',
      'Gasoline distribution vapor releases and refinery emissions',
      'Natural biogenic VOC emissions reacting with anthropogenic nitrogen oxides',
    ],
    units: {
      standard: 'µg/m³',
      openaq: 'µg/m³',
      google: 'ppb or µg/m³ (1 ppb ≈ 1.96 µg/m³ at 25°C)',
      notes: 'Micrograms per cubic metre.',
    },
    healthRelevance: 'A potent oxidizing agent that damages lung tissue, inflames airways, triggers acute asthma episodes, and reduces athletic stamina. Unlike particulate matter, ozone exposure is most acute during bright sunny midday and afternoon hours.',
    environmentalRelevance: 'Severely toxic to sensitive vegetation and agricultural crops (e.g. wheat, rice, soybeans), causing leaf chlorosis, premature senescence, and estimated annual crop yield losses of 10–20% in heavily exposed agricultural basins.',
    interpretationGuide: 'Under CPCB NAQI guidelines (8-hr average), O₃ below 50 µg/m³ is Good, 51–100 Satisfactory, 101–168 Moderate, 169–208 Poor, 209–748 Very Poor, and >748 µg/m³ Severe.',
    regulatoryThresholds: {
      cpcb_naaqs_24hr: '100 µg/m³ (CPCB NAAQS, 8-hr average; 180 µg/m³ for 1-hr)',
      cpcb_naaqs_annual: 'Not applicable',
      who_guideline_24hr: '100 µg/m³ (WHO Guidelines 2021, 8-hr daily maximum)',
      who_guideline_annual: '60 µg/m³ (Peak season average)',
      cpcb_aqi_breakpoint_good: '0 – 50 µg/m³ (Sub-index 0 – 50)',
    },
    limitationsAndContext: [
      'Ground-level ozone is NOT emitted directly by smokestacks or vehicle tailpipes; it is a secondary photochemical product.',
      'Ozone exhibits a pronounced diurnal cycle with near-zero concentrations at night (titrated by NO emissions) and peak concentrations between 12:00 PM and 4:00 PM on sunny days.',
    ],
    references: [
      {
        organization: 'Central Pollution Control Board (CPCB)',
        title: 'NAQI Standard Breakpoints for Photochemical Ozone (2014)',
        url: 'https://cpcb.nic.in/national-air-quality-index/',
        type: 'regulatory_standard',
        description: 'CPCB NAQI methodology for ozone 8-hour and 1-hour sub-index calculation.',
      },
      {
        organization: 'World Health Organization (WHO)',
        title: 'Health Risks of Ozone from Long-Range Transboundary Air Pollution',
        url: 'https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health',
        type: 'air_quality_guideline',
        description: 'Comprehensive epidemiological assessments of respiratory morbidity from ozone.',
      },
    ],
  },
};

/**
 * Returns catalog data for a specific pollutant ID or null if unsupported.
 * @param {string} pollutantId
 * @returns {object|null}
 */
export function getCatalogItem(pollutantId) {
  if (!pollutantId) return null;
  const clean = String(pollutantId).toLowerCase().replace(/[^a-z0-9]/g, '');
  const mapped = clean === 'pm25' || clean === 'pm25' ? 'pm25' : clean;
  return POLLUTANT_CATALOG[mapped] || null;
}

/**
 * List all supported pollutants in the catalog.
 * @returns {Array<object>}
 */
export function listSupportedPollutants() {
  return Object.values(POLLUTANT_CATALOG);
}
