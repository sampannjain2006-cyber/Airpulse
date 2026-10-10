/**
 * AIRPULSE — Industrial Waste Reuse & Pollution Prevention Catalog
 *
 * Curated, authoritative catalog of industrial by-products and potential reuse pathways.
 * All entries follow strict Indian environmental, technical, and statutory standards
 * (CPCB, MoEFCC, BIS, IRC, AERB, BEE).
 *
 * NOTE: This catalog is educational decision-support. It does NOT constitute statutory approval,
 * commercial waste certification, or an endorsement of uncharacterized material reuse.
 */

export const WASTE_REUSE_CATALOG = [
  {
    id: 'coal_fly_ash',
    name: 'Coal Fly Ash (Pulverized Fuel Ash)',
    category: 'combustion_byproducts',
    category_label: 'Combustion By-products',
    origin_industry: 'Coal-based Thermal Power Generation',
    origin_process: 'Pulverized coal combustion flue gas particulate capture using Electrostatic Precipitators (ESPs).',
    receiving_industry: 'Cement & Construction Materials',
    application: 'Manufacturing of Portland Pozzolana Cement (PPC), partial cement replacement in structural/pavement concrete, autoclaved aerated concrete (AAC) blocks, fly ash-clay bricks, and highway embankment fills.',
    verification_status: 'ESTABLISHED_REGULATORY_PATHWAY',
    status_label: 'Established Statutory Pathway',
    pretreatment_requirements: [
      'Classification by particle size distribution (fineness retention on 45 µm sieve per IS 3812 Part 1).',
      'Loss on Ignition (LOI) testing to confirm unburnt carbon remains below 5.0% by mass.',
      'Lime reactivity and moisture content assay before batching.',
      'Dry pneumatic handling and enclosed silo storage to avoid moisture agglomeration.'
    ],
    contamination_risks: [
      'Leachable trace heavy metals including arsenic, lead, mercury, selenium, and cadmium if exposed to acidic leachates.',
      'Fugitive particulate matter (PM2.5 / PM10) inhalation hazard during pneumatic unloading or open dumping.',
      'Naturally occurring radioactive materials (NORM) in specific high-silica coal deposits.'
    ],
    unsuitable_conditions: [
      'Ash with high unburnt carbon content (LOI > 5.0%) causing erratic air-entrainment and strength loss in concrete.',
      'Uncharacterized bottom ash or pond ash containing organic contaminants, soil clods, or unsegregated municipal refuse.',
      'Any batch failing Toxicity Characteristic Leaching Procedure (TCLP) statutory limits for heavy metals.'
    ],
    regulatory_standards: [
      'MoEFCC Fly Ash Notification S.O. 5481(E) (mandating progressive 100% ash utilization by thermal power plants within defined statutory cycles).',
      'Bureau of Indian Standards IS 3812 (Part 1): 2013 (Specification for Pulverized Fuel Ash for Use as Pozzolana in Cement and Concrete).',
      'Bureau of Indian Standards IS 12894: 2002 (Pulverized Fuel Ash-Lime Bricks Specification).',
      'Indian Roads Congress IRC:SP:58-2020 (Guidelines for Use of Fly Ash in Road Construction).'
    ],
    authoritative_source: 'Ministry of Environment, Forest and Climate Change (MoEFCC) & Central Pollution Control Board (CPCB)',
    source_url: 'https://cpcb.nic.in',
    limitations: 'Fly ash reactivity varies by source coal geology and boiler firing conditions; concrete mix designs require mandatory laboratory trial batch verification.'
  },
  {
    id: 'granulated_blast_furnace_slag',
    name: 'Granulated Blast Furnace Slag (GBFS / GGBS)',
    category: 'metallurgical_slags',
    category_label: 'Metallurgical Slags',
    origin_industry: 'Integrated Iron & Steel Manufacturing',
    origin_process: 'High-temperature iron smelting in blast furnaces; molten silicate-aluminate slag is rapidly quenched with high-pressure water jets.',
    receiving_industry: 'Cement Manufacturing & Ready-Mix Concrete',
    application: 'Manufacture of Portland Slag Cement (PSC per IS 455), Ground Granulated Blast Furnace Slag (GGBS per IS 16714) as supplementary cementitious material replacing clinker, and marine concrete structures.',
    verification_status: 'ESTABLISHED_REGULATORY_PATHWAY',
    status_label: 'Established Statutory Pathway',
    pretreatment_requirements: [
      'Rapid water quenching to ensure vitrification and glass content exceeding 85% by mass.',
      'Drying and fine grinding in vertical roller mills or ball mills to specific surface area exceeding 320 m²/kg (Blaine).',
      'Verification of basicity index ((CaO + MgO) / SiO₂ > 1.0) and glass content by optical microscopy or XRD.'
    ],
    contamination_risks: [
      'Sulfide sulfur content requiring oxidation monitoring to prevent localized trace hydrogen sulfide generation in acidic environments.',
      'Slow early-age compressive strength development requiring extended moist curing protocols.'
    ],
    unsuitable_conditions: [
      'Slowly cooled (air-cooled) crystalline blast furnace slag lacking amorphous glassy phase (only suitable as mineral aggregate, not cementitious substitute).',
      'Weathered, contaminated slag containing soil, organic debris, or excessive moisture.'
    ],
    regulatory_standards: [
      'Bureau of Indian Standards IS 455: 2015 (Portland Slag Cement Specification).',
      'Bureau of Indian Standards IS 16714: 2018 (Ground Granulated Blast Furnace Slag for Use in Concrete, Mortar and Grout).',
      'Ministry of Steel & CPCB Technical Guidelines for Utilization of Slag in Infrastructure.'
    ],
    authoritative_source: 'Bureau of Indian Standards (BIS) & Ministry of Steel, Government of India',
    source_url: 'https://standardsbis.bsbedge.com',
    limitations: 'GGBS concrete exhibits slower hydration at lower ambient temperatures; demolding schedules must be adjusted accordingly.'
  },
  {
    id: 'steel_melting_shop_slag',
    name: 'Steel Slag (EAF / SMS Slag)',
    category: 'metallurgical_slags',
    category_label: 'Metallurgical Slags',
    origin_industry: 'Steelmaking (Electric Arc Furnace & Basic Oxygen Furnace)',
    origin_process: 'Oxidation and refining of molten steel in Electric Arc Furnaces (EAF) or Linz-Donawitz converters.',
    receiving_industry: 'Highway Construction & Civil Infrastructure',
    application: 'Coarse and fine aggregate replacement in dense bituminous macadam, bituminous concrete wear courses, granular sub-base (GSB) layers, and railway track ballast.',
    verification_status: 'ESTABLISHED_REGULATORY_PATHWAY',
    status_label: 'Established Statutory Pathway',
    pretreatment_requirements: [
      'Mandatory accelerated weathering (steam aging, water quenching, or minimum 6-month atmospheric exposure) to hydrate uncombined free lime (CaO) and free magnesia (MgO).',
      'Volumetric expansion testing per ASTM D4792 or IRC guidelines (autoclave/immersion expansion must remain < 1.0%).',
      'Magnetic separation to extract and recover residual metallic scrap prior to crushing and screening.'
    ],
    contamination_risks: [
      'Volumetric swelling (up to 10%) caused by delayed hydration of unhydrated free lime (CaO), capable of causing pavement heave and asphalt cracking if unaged.',
      'Alkaline runoff (pH > 10.5) from unmanaged stockpiles during heavy rainfall.',
      'Trace heavy metal leaching in stainless steel slags containing chromium or vanadium.'
    ],
    unsuitable_conditions: [
      'Fresh, unaged, unweathered slag with free lime content > 4.0% by mass.',
      'Specialty alloy or stainless steel slags containing unencapsulated hexavalent chromium (Cr(VI)) exceeding hazardous waste criteria.',
      'Enclosed structural concrete applications without rigorous long-term expansion characterization.'
    ],
    regulatory_standards: [
      'Indian Roads Congress IRC:SP:121-2018 (Guidelines for Use of Iron and Steel Slag in Road Construction).',
      'CSIR - Central Road Research Institute (CSIR-CRRI) Steel Slag Road Construction Technology Guidelines.',
      'CPCB Framework on Metallurgical Slag Management.'
    ],
    authoritative_source: 'CSIR - Central Road Research Institute (CSIR-CRRI) & Indian Roads Congress (IRC)',
    source_url: 'https://www.crridom.gov.in',
    limitations: 'Requires certified aging and verified free-lime stabilization; cannot be used fresh off the furnace floor.'
  },
  {
    id: 'phosphogypsum',
    name: 'Phosphogypsum (Chemical By-product Gypsum)',
    category: 'mineral_chemical_residues',
    category_label: 'Mineral & Chemical Residues',
    origin_industry: 'Phosphate Fertilizer & Phosphoric Acid Manufacturing',
    origin_process: 'Wet-process chemical digestion of rock phosphate with sulfuric acid to produce phosphoric acid.',
    receiving_industry: 'Cement Manufacturing & Agricultural Soil Reclamation',
    application: 'Natural mineral gypsum substitute as set retarder in Ordinary Portland Cement (OPC) clinker grinding (3-5% addition), gypsum plasterboard and partition panel manufacturing, and agricultural reclamation of sodic/alkaline soils.',
    verification_status: 'CONDITIONAL_APPROVAL_REQUIRED',
    status_label: 'Conditional Statutory Approval Required',
    pretreatment_requirements: [
      'Washing, filtration, and chemical neutralization to reduce water-soluble P₂O₅ (< 0.2%) and soluble fluorides (F⁻ < 0.1%).',
      'Drying to reduce free moisture below 8-10% to prevent clogging in cement plant pneumatic handling systems.',
      'Radiological assay for Radium-226 (²²⁶Ra) and radon exhalation rate to ensure compliance with AERB residential building material criteria.'
    ],
    contamination_risks: [
      'Naturally Occurring Radioactive Material (NORM): Radium-226 decay chain daughters from geological phosphate rock.',
      'Residual phosphoric acid and fluorides retarding cement set times or accelerating rebar corrosion.',
      'Acidic leachate (pH < 4.5) threatening groundwater tables if stockpiled unlined.'
    ],
    unsuitable_conditions: [
      'Batches exceeding Atomic Energy Regulatory Board (AERB) radioactive clearance activity index for residential building products.',
      'Raw, unwashed filter cake with water-soluble P₂O₅ > 0.5% or excessive fluoride content.',
      'Unconfined agricultural spreading on non-sodic, neutral or acidic soils.'
    ],
    regulatory_standards: [
      'Atomic Energy Regulatory Board (AERB) Safety Directive on Radionuclide Content in Building Materials.',
      'Bureau of Indian Standards IS 12679: 1989 (Specification for By-product Gypsum for Use in Plaster, Blocks and Boards).',
      'Bureau of Indian Standards IS 1290: 1973 (Mineral Gypsum Specification).',
      'CPCB Guidelines on Environmental Management of Phosphogypsum.'
    ],
    authoritative_source: 'Atomic Energy Regulatory Board (AERB) & Central Pollution Control Board (CPCB)',
    source_url: 'https://www.aerb.gov.in',
    limitations: 'Mandatory radionuclide assay and fluoride/phosphate washing required; prohibited for domestic building products without certified AERB clearance.'
  },
  {
    id: 'red_mud_bauxite_residue',
    name: 'Red Mud (Bauxite Residue)',
    category: 'mineral_chemical_residues',
    category_label: 'Mineral & Chemical Residues',
    origin_industry: 'Primary Alumina Refining',
    origin_process: 'Bayer process caustic digestion of bauxite ore with concentrated sodium hydroxide at elevated temperature and pressure.',
    receiving_industry: 'Cement Clinker & Heavy Clay Ceramics',
    application: 'Corrective raw material (iron and alumina source) in cement clinker raw mix, partial clay substitute in heavy fired bricks and paver tiles, and engineered sub-base embankment stabilization when blended with fly ash and lime.',
    verification_status: 'CONDITIONAL_APPROVAL_REQUIRED',
    status_label: 'Conditional Statutory Approval Required',
    pretreatment_requirements: [
      'Multi-stage counter-current washing and neutralization (seawater washing or accelerated carbonation) to lower pH below 10.5.',
      'Mechanical dewatering through high-pressure membrane filter presses to achieve cake solids > 65% by mass.',
      'Equivalent alkali content (Na₂O eq) testing to evaluate alkali-silica reaction (ASR) risk in receiving concrete or cement clinker.',
      'TCLP leaching testing for trace elements including arsenic, vanadium, and chromium.'
    ],
    contamination_risks: [
      'Extreme caustic alkalinity (raw slurry pH > 12.5) posing severe chemical burn hazards and soil/groundwater salinization.',
      'High sodicity causing clay deflocculation and structural destabilization in untreated soil systems.',
      'Trace metal leaching if exposed to low-pH rainfall.'
    ],
    unsuitable_conditions: [
      'Raw, unneutralized, wet slurry directly discharged without mechanical dewatering and alkali reduction.',
      'Structural concrete aggregate or structural mortar applications due to severe alkali-silica reaction (ASR) destruction risk.',
      'Direct uncontained land application without impermeable geo-synthetic barriers.'
    ],
    regulatory_standards: [
      'Ministry of Mines Guidelines on Bauxite Residue (Red Mud) Utilization in India.',
      'Central Pollution Control Board (CPCB) Guidelines for Handling and Management of Bauxite Residue (Red Mud).',
      'Jawaharlal Nehru Aluminium Research Development and Design Centre (JNARDDC) Research Framework.'
    ],
    authoritative_source: 'Ministry of Mines & Central Pollution Control Board (CPCB)',
    source_url: 'https://mines.gov.in',
    limitations: 'High sodium content strictly caps blending ratios in cement raw meals (typically < 3-5%); requires thorough alkali and leaching characterization.'
  },
  {
    id: 'waste_heat_recovery',
    name: 'Industrial Waste Heat Recovery (WHR)',
    category: 'thermal_energy_recovery',
    category_label: 'Thermal & Energy Recovery',
    origin_industry: 'Cement Pyroprocessing, Sponge Iron & Glass Manufacturing',
    origin_process: 'High-temperature exhaust gases discharged from cement preheater towers, clinker coolers, sponge iron rotary kilns, and glass melting tanks.',
    receiving_industry: 'In-Plant Captive Energy & Steam Systems',
    application: 'Captive electrical power generation using steam Rankine cycle or Organic Rankine Cycle (ORC) boilers, raw material drying (preheating coal, limestone, or slag), and combustion air preheating via recuperators.',
    verification_status: 'ESTABLISHED_REGULATORY_PATHWAY',
    status_label: 'Established Statutory Pathway',
    pretreatment_requirements: [
      'High-efficiency mechanical particulate drop-out chambers and cyclones to strip abrasive dust before heat exchanger boiler tubes.',
      'Flue gas exhaust temperature profiling (optimally > 260°C for steam turbines; 140-260°C for ORC systems).',
      'Acid dew point continuous monitoring to ensure flue gas temperatures stay above sulfur/chlorine acid condensation thresholds, preventing catastrophic boiler tube corrosion.'
    ],
    contamination_risks: [
      'High abrasive particulate loading causing boiler tube erosion, localized wall thinning, and catastrophic tube rupture.',
      'Corrosive acid condensation (sulfuric acid from SO₂/SO₃) on heat exchanger surfaces if operating below dew point.',
      'High steam pressures and thermal expansion stresses requiring automated safety relief systems.'
    ],
    unsuitable_conditions: [
      'Exhaust streams with gas temperatures below acid dew point without specialized nickel-alloy or glass-coated heat exchanger surfaces.',
      'Severely intermittent or violently fluctuating batch furnace exhaust where thermal cycling causes fatigue cracking without thermal storage buffers.'
    ],
    regulatory_standards: [
      'Bureau of Energy Efficiency (BEE) - Perform, Achieve and Trade (PAT) Scheme Industrial Sectoral Benchmarks.',
      'Energy Conservation Act, 2001 (Ministry of Power, Government of India).',
      'CPCB / MoEFCC Guidelines on Energy Efficiency and Waste Heat Recovery in Cement and Sponge Iron Plants.'
    ],
    authoritative_source: 'Bureau of Energy Efficiency (BEE), Ministry of Power, Government of India',
    source_url: 'https://beeindia.gov.in',
    limitations: 'Thermodynamic recovery depends on continuous process heat stability; economic feasibility requires minimum flue gas volume and temperature thresholds.'
  },
  {
    id: 'spent_foundry_sand',
    name: 'Spent Foundry Sand (SFS)',
    category: 'metallurgical_slags',
    category_label: 'Metallurgical Slags',
    origin_industry: 'Ferrous & Non-Ferrous Metal Casting Foundries',
    origin_process: 'High-temperature metal casting in sand molds and cores bound with bentonite clay or chemical phenolic/furan binder systems.',
    receiving_industry: 'Construction Materials & Highway Embankments',
    application: 'Partial fine aggregate (natural river sand) replacement in manufactured concrete, asphalt paving mixtures, fired clay brick production, and geotechnical embankment fill.',
    verification_status: 'CONDITIONAL_APPROVAL_REQUIRED',
    status_label: 'Conditional Statutory Approval Required',
    pretreatment_requirements: [
      'Magnetic separation to eliminate tramp iron, metal flashes, and chills.',
      'Crushing and mechanical screening to break lumps into individual sand grains matching standard aggregate grading.',
      'Loss on Ignition (LOI) to quantify residual organic binders.',
      'Toxicity Characteristic Leaching Procedure (TCLP) screening for heavy metals (lead, zinc, copper, nickel, cadmium).'
    ],
    contamination_risks: [
      'Organic binder residues (phenolic, furan, polyurethane resins) containing residual phenols and polycyclic aromatic hydrocarbons (PAHs).',
      'Heavy metal contamination from non-ferrous alloys (lead and copper in brass/bronze foundries).',
      'Fine particulate silica dust generation during handling and dry processing.'
    ],
    unsuitable_conditions: [
      'Sands from non-ferrous foundries (brass, bronze) failing TCLP statutory thresholds for lead, copper, or zinc.',
      'Chemically bonded core sands with elevated phenolic residues without thermal reclamation or calcination.',
      'Unconfined civil applications near drinking water reservoirs or shallow unconfined aquifers.'
    ],
    regulatory_standards: [
      'Central Pollution Control Board (CPCB) Guidelines on Management of Spent Foundry Sand.',
      'MoEFCC Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016.',
      'Indian Roads Congress (IRC) Specifications for Road Sub-base Aggregates.'
    ],
    authoritative_source: 'Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change',
    source_url: 'https://cpcb.nic.in',
    limitations: 'Only ferrous (iron and steel) green sands generally meet civil reuse standards; chemically bound or non-ferrous sands require strict hazardous waste screening.'
  },
  {
    id: 'etp_crystallized_salts',
    name: 'ETP Recoverable Inorganic Salts (ZLD Sodium Sulfate / NaCl)',
    category: 'effluent_water_recovery',
    category_label: 'Effluent & Water Treatment Recovery',
    origin_industry: 'Textile Processing & Chemical Common Effluent Treatment Plants (CETPs)',
    origin_process: 'Zero Liquid Discharge (ZLD) treatment train comprising primary treatment, biological oxidation, ultrafiltration, reverse osmosis (RO), and thermal evaporation/crystallization of high-TDS reject brine.',
    receiving_industry: 'Textile Dyeing & Industrial Chemical Processing',
    application: 'Recovered crystallized sodium sulfate (Na₂SO₄) or sodium chloride (NaCl) reused as dye exhaustion agent in reactive dye baths of textile processing units, or feed salt in industrial chemical processes.',
    verification_status: 'CONDITIONAL_APPROVAL_REQUIRED',
    status_label: 'Conditional Statutory Approval Required',
    pretreatment_requirements: [
      'Advanced oxidation (Ozone, Fenton, UV) and nanofiltration prior to evaporation to strip dissolved organic color and Chemical Oxygen Demand (COD).',
      'Centrifugal dewatering and thermal drying to obtain free-flowing white crystalline powder.',
      'Purity verification (Na₂SO₄ ≥ 98.0%, heavy metals < 5 ppm, total organic carbon / COD < 50 mg/kg).',
      'Optical whiteness and turbidity testing of redissolved test solution.'
    ],
    contamination_risks: [
      'Residual recalcitrant textile dyes and synthetic surfactants causing spot staining and batch ruin in reuse dye baths.',
      'Trace toxic heavy metals (chromium from mordants, copper, zinc) if biological pretreatment is bypassed.',
      'Classification as hazardous waste (Schedule II) under Hazardous Waste Rules 2016 if organic carbon and toxics are not stripped.'
    ],
    unsuitable_conditions: [
      'Unsegregated hazardous ETP sludges containing toxic organic compounds, heavy metals, or oils (must be consigned to TSDF or cement kiln co-processing).',
      'Salts with residual COD > 100 mg/kg or visible discoloration.',
      'Discharge or open dumping of mixed reject salt cakes onto land or water bodies.'
    ],
    regulatory_standards: [
      'CPCB Guidelines on Implementation of Zero Liquid Discharge (ZLD) for Water Polluting Industries.',
      'MoEFCC Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016.',
      'Tamil Nadu Pollution Control Board (TNPCB) / CPCB Framework on Textile CETP ZLD Salt Recovery.'
    ],
    authoritative_source: 'Central Pollution Control Board (CPCB) & Tamil Nadu Pollution Control Board (TNPCB)',
    source_url: 'https://cpcb.nic.in',
    limitations: 'High capital and thermal operating costs for multi-effect evaporators; recovered salts must achieve high chemical purity to avoid contaminating closed-loop dye baths.'
  }
];

export const WASTE_REUSE_DISCLAIMERS = {
  educational_notice: 'This catalog is provided solely for educational intelligence and decision support. It describes established and conditional industrial by-product recovery pathways under Indian environmental standards (CPCB, MoEFCC, BIS, IRC, AERB).',
  testing_requirement: 'Potential reuse does NOT equal confirmed material suitability. Every batch of industrial by-product requires accredited laboratory testing, characterization, and quality validation (e.g. TCLP leaching, chemical assay, physical grading) prior to commercial utilization.',
  regulatory_compliance: 'All material handling, transport, processing, and utilization must strictly comply with applicable statutory consent conditions (CTE/CTO) and the Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016. Dilution, unpermitted mixing, or uncontained environmental discharge is strictly prohibited.',
  pollution_prevention_principle: 'Responsible recovery and circular reuse reduce the volume of waste sent to unlined dumps or landfills and decrease the consumption of virgin natural resources (e.g., limestone, natural gypsum, river sand). However, reuse does not automatically eliminate pollution; improper treatment, uncontained handling, or unverified applications can create secondary environmental hazards.'
};

/**
 * Get all catalog entries
 */
export function getAllWasteStreams() {
  return WASTE_REUSE_CATALOG;
}

/**
 * Get a specific catalog item by ID
 */
export function getWasteStreamById(id) {
  if (!id) return null;
  return WASTE_REUSE_CATALOG.find((item) => item.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Filter catalog by category, origin, receiving industry, or search query
 */
export function filterWasteStreams({ category, origin, receiving, search } = {}) {
  let results = [...WASTE_REUSE_CATALOG];

  if (category && category !== 'all') {
    results = results.filter((item) => item.category === category || item.category_label.toLowerCase() === category.toLowerCase());
  }

  if (origin && origin !== 'all') {
    const o = origin.toLowerCase();
    results = results.filter((item) => item.origin_industry.toLowerCase().includes(o));
  }

  if (receiving && receiving !== 'all') {
    const r = receiving.toLowerCase();
    results = results.filter((item) => item.receiving_industry.toLowerCase().includes(r));
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.origin_industry.toLowerCase().includes(q) ||
        item.receiving_industry.toLowerCase().includes(q) ||
        item.application.toLowerCase().includes(q) ||
        item.category_label.toLowerCase().includes(q)
    );
  }

  return results;
}

/**
 * Get distinct categories, originating industries, and receiving industries for UI filters
 */
export function getCatalogMetadata() {
  const categories = Array.from(
    new Set(WASTE_REUSE_CATALOG.map((item) => JSON.stringify({ id: item.category, label: item.category_label })))
  ).map((s) => JSON.parse(s));

  const originIndustries = Array.from(new Set(WASTE_REUSE_CATALOG.map((item) => item.origin_industry)));
  const receivingIndustries = Array.from(new Set(WASTE_REUSE_CATALOG.map((item) => item.receiving_industry)));

  return {
    total_entries: WASTE_REUSE_CATALOG.length,
    categories,
    origin_industries: originIndustries,
    receiving_industries: receivingIndustries,
    verification_status_counts: {
      established: WASTE_REUSE_CATALOG.filter((i) => i.verification_status === 'ESTABLISHED_REGULATORY_PATHWAY').length,
      conditional: WASTE_REUSE_CATALOG.filter((i) => i.verification_status === 'CONDITIONAL_APPROVAL_REQUIRED').length,
    }
  };
}
