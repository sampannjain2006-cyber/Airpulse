export interface AqiInfo {
  category: string;
  color: string;
  bgColor: string;
  textColor: string;
}

const AQI_BANDS: Array<{ max: number } & AqiInfo> = [
  { max: 50,       category: 'Good',         color: '#10b981', bgColor: 'rgba(16,185,129,0.15)',  textColor: '#10b981' },
  { max: 100,      category: 'Satisfactory', color: '#84cc16', bgColor: 'rgba(132,204,22,0.15)', textColor: '#84cc16' },
  { max: 200,      category: 'Moderate',     color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)', textColor: '#f59e0b' },
  { max: 300,      category: 'Poor',         color: '#f97316', bgColor: 'rgba(249,115,22,0.15)', textColor: '#f97316' },
  { max: 400,      category: 'Very Poor',    color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)',  textColor: '#ef4444' },
  { max: Infinity, category: 'Severe',       color: '#7c3aed', bgColor: 'rgba(124,58,237,0.15)', textColor: '#7c3aed' },
];

export function getAqiInfo(aqi: number | null | undefined): AqiInfo {
  if (aqi === null || aqi === undefined) {
    return { category: 'No Data', color: '#64748b', bgColor: 'rgba(100,116,139,0.15)', textColor: '#64748b' };
  }
  return AQI_BANDS.find((b) => aqi <= b.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

export function formatValue(val: number | null | undefined, unit = '', decimals = 1): string {
  if (val === null || val === undefined) return '—';
  return `${val.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Unknown';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function isStale(iso: string | null | undefined, thresholdHours = 2): boolean {
  if (!iso) return true;
  const diff = Date.now() - new Date(iso).getTime();
  return diff > thresholdHours * 3600 * 1000;
}
