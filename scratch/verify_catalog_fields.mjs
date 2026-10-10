import { POLLUTANT_CATALOG } from '../server/src/config/pollutantCatalog.js';

const expectedPollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
const expectedUnits = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  no2: 'µg/m³',
  so2: 'µg/m³',
  co: 'mg/m³',
  o3: 'µg/m³'
};

let errors = 0;

for (const id of expectedPollutants) {
  const item = POLLUTANT_CATALOG[id];
  if (!item) {
    console.error(`Missing pollutant ${id}`);
    errors++;
    continue;
  }
  
  if (item.units.standard !== expectedUnits[id]) {
    console.error(`Unit mismatch for ${id}: expected ${expectedUnits[id]}, got ${item.units.standard}`);
    errors++;
  }
  
  if (!item.displayName || !item.shortDescription || !item.whatItRepresents) {
    console.error(`Incomplete definitions for ${id}`);
    errors++;
  }
  
  if (!Array.isArray(item.primarySources) || item.primarySources.length === 0) {
    console.error(`Missing sources for ${id}`);
    errors++;
  }
  
  if (!Array.isArray(item.limitationsAndContext) || item.limitationsAndContext.length === 0) {
    console.error(`Missing limitations for ${id}`);
    errors++;
  }
  
  if (!item.healthRelevance || !item.environmentalRelevance) {
    console.error(`Missing health/env relevance for ${id}`);
    errors++;
  }
  
  console.log(`Pollutant ${id.toUpperCase()}:`);
  console.log(`  Name: ${item.displayName}`);
  console.log(`  Standard Unit: ${item.units.standard}`);
  console.log(`  Sources: ${item.primarySources.length} sources defined`);
  console.log(`  Limitations: ${item.limitationsAndContext.length} items defined`);
}

if (errors === 0) {
  console.log('\nAll 6 pollutants match expected catalog structure.');
} else {
  console.error(`\nFound ${errors} errors in catalog verification.`);
}
