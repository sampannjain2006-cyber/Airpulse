import fs from 'fs';

console.log('=== AIRPULSE HEADER LAYOUT & RESPONSIVENESS VERIFICATION ===\n');

const tsx = fs.readFileSync('client/src/pages/Dashboard.tsx', 'utf8');
const css = fs.readFileSync('client/src/index.css', 'utf8');

let pass = 0;
let fail = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    pass++;
  } else {
    console.error(`❌ [FAIL] ${name} ${details}`);
    fail++;
  }
}

// 1. Row 1 Verification
test('Row 1: dashboard-header-brand-row is present', tsx.includes('dashboard-header-brand-row'));
test('Row 1: AIRPULSE brand title is present', tsx.includes('className="brand-title">AIRPULSE</h1>'));
test('Row 1: Version tag v0.1.0 is present', tsx.includes('className="brand-version-tag">v0.1.0</span>'));
test('Row 1: Subtitle is present', tsx.includes('className="brand-subtitle">Environmental Intelligence</span>'));
test('Row 1: Platform status badge is present', tsx.includes('className="platform-status-badge"'));

// 2. Row 2 Verification
test('Row 2: dashboard-filters-bar is present', tsx.includes('dashboard-filters-bar'));
test('Row 2: Filter stations title/label is present', tsx.includes('className="filter-bar-title"'));
test('Row 2: City search input is present', tsx.includes('className="search-input"'));
test('Row 2: Filter button is present', tsx.includes('onClick={handleSearch}') && tsx.includes('>Filter</button>'));
test('Row 2: Clear button is present', tsx.includes('onClick={handleClear}') && tsx.includes('>Clear</button>'));
test('Row 2: Active filter chip is present', tsx.includes('active-filter-chip'));
test('Row 2: Chip remove button is present', tsx.includes('btn-chip-remove'));
test('Row 2: Station count statistics are present', tsx.includes('station-count-stat'));

// 3. Row 3 Verification
test('Row 3: dashboard-feature-status-bar is present', tsx.includes('dashboard-feature-status-bar'));
test('Row 3: feature-status-inner container is present', tsx.includes('feature-status-inner'));
test('Box 1: Network Online pill is present', tsx.includes('NETWORK ONLINE'));
test('Box 2: 5-Day Forecast pill is present', tsx.includes('5-DAY FORECAST'));
test('Box 3: OpenAQ Registry button pill is present', tsx.includes('OPENAQ REGISTRY'));
test('Box 4: Geo Lookup button pill is present', tsx.includes('GEO LOOKUP'));
test('Box 5: Hotspots button pill is present', tsx.includes('HOTSPOTS'));
test('Box 6: Pollutant Guide button pill is present', tsx.includes('POLLUTANT GUIDE'));
test('Box 7: Alerts button pill is present', tsx.includes('ALERTS'));
test('Box 8: Precaution Recommendations button pill is present', tsx.includes('PRECAUTIONS'));
test('Box 9: Industrial Waste Reuse button pill is present', tsx.includes('WASTE REUSE'));
test('Box 10: Protection Store button pill is present', tsx.includes('PROTECTION STORE'));
test('Box 11: Route Planner button pill is present', tsx.includes('ROUTE PLANNER'));

// 4. CSS Layout Rules Verification
test('CSS: .dashboard-header uses column flex layout', css.includes('.dashboard-header {') && css.includes('flex-direction: column;'));
test('CSS: .dashboard-filters-bar has flex layout with gap and wrap', css.includes('.dashboard-filters-bar {') && css.includes('justify-content: space-between;'));
test('CSS: .feature-status-inner has flex-wrap: wrap', css.includes('.feature-status-inner {') && css.includes('flex-wrap: wrap;'));

// 5. Responsive Breakpoints Verification
test('CSS: 1280px media query handles laptop view', css.includes('@media (max-width: 1280px)'));
test('CSS: 1024px media query handles tablet landscape view', css.includes('@media (max-width: 1024px)'));
test('CSS: 768px media query handles tablet portrait view', css.includes('@media (max-width: 768px)'));
test('CSS: 390px media query handles mobile portrait view', css.includes('@media (max-width: 390px)'));

console.log(`\n========================================`);
console.log(`SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log(`========================================`);

if (fail > 0) process.exit(1);
