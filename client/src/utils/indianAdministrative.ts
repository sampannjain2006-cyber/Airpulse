/**
 * Complete list of all 28 Indian States and 8 Union Territories
 * Preserves accurate administrative nomenclature.
 */
export const ALL_INDIAN_STATES_AND_UTS: string[] = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const UT_NAMES = new Set([
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]);

export interface CpcbThreshold {
  category: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  textColor: string;
  advisory: string;
}

/**
 * CPCB National Air Quality Index (NAQI) Breakpoints for PM2.5 (24-hour average in µg/m³)
 */
export const CPCB_PM25_THRESHOLDS: CpcbThreshold[] = [
  {
    category: 'Good',
    min: 0,
    max: 30,
    color: '#1b4332',
    bgColor: '#e8f5e9',
    textColor: '#1b4332',
    advisory: 'Minimal health impact; ambient air is clean and optimal.',
  },
  {
    category: 'Satisfactory',
    min: 31,
    max: 60,
    color: '#2d6a4f',
    bgColor: '#edf7ed',
    textColor: '#2d6a4f',
    advisory: 'Minor breathing discomfort to sensitive individuals.',
  },
  {
    category: 'Moderate',
    min: 61,
    max: 90,
    color: '#d97706',
    bgColor: '#fffbeb',
    textColor: '#b45309',
    advisory: 'Breathing discomfort to people with lungs, asthma and heart diseases.',
  },
  {
    category: 'Poor',
    min: 91,
    max: 120,
    color: '#ea580c',
    bgColor: '#fff7ed',
    textColor: '#c2410c',
    advisory: 'Breathing discomfort to most people on prolonged exposure.',
  },
  {
    category: 'Very Poor',
    min: 121,
    max: 250,
    color: '#dc2626',
    bgColor: '#fef2f2',
    textColor: '#991b1b',
    advisory: 'Respiratory illness on prolonged exposure; avoid intense exertion.',
  },
  {
    category: 'Severe',
    min: 251,
    max: 1500,
    color: '#7f1d1d',
    bgColor: '#450a0a',
    textColor: '#fecaca',
    advisory: 'Affects healthy people and seriously impacts those with existing diseases.',
  },
];

export function getCpcbPm25Category(pm25: number | null | undefined): CpcbThreshold & { isAvailable: boolean } {
  if (pm25 === null || pm25 === undefined || isNaN(pm25)) {
    return {
      category: 'Unavailable',
      min: 0,
      max: 0,
      color: '#94a3b8',
      bgColor: '#f1f5f9',
      textColor: '#64748b',
      advisory: 'Prediction unavailable due to insufficient historical observations.',
      isAvailable: false,
    };
  }

  for (const t of CPCB_PM25_THRESHOLDS) {
    if (pm25 <= t.max) {
      return { ...t, isAvailable: true };
    }
  }

  return { ...CPCB_PM25_THRESHOLDS[CPCB_PM25_THRESHOLDS.length - 1], isAvailable: true };
}
