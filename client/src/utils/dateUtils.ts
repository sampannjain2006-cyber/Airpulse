/**
 * Client-side timezone-safe date utilities for AIRPULSE.
 * Configured application timezone: Asia/Kolkata (UTC+05:30)
 */

export const APP_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current calendar date string in YYYY-MM-DD format
 * for the configured application timezone (Asia/Kolkata).
 */
export function getCurrentDateInKolkata(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Performs timezone-safe calendar date addition using UTC noon arithmetic.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  const resYear = utcDate.getUTCFullYear();
  const resMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const resDay = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Generates exactly the next 5 calendar dates (T+1 through T+5) from a reference date.
 * Excludes the reference date. Day 6+ is never returned.
 */
export function getForecastTargetDates(referenceDateStr: string, horizonDays = 5): string[] {
  const targetDays = Math.min(Math.max(1, horizonDays), 5);
  const dates: string[] = [];
  for (let step = 1; step <= targetDays; step++) {
    dates.push(addCalendarDays(referenceDateStr, step));
  }
  return dates;
}

/**
 * Formats a calendar date for UI display (e.g., "11 Nov (Wed)").
 */
export function formatForecastDateDisplay(dateStr: string): { dayName: string; monthDay: string; fullDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayName = utcDate.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
  const monthDay = utcDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return { dayName, monthDay, fullDate: dateStr };
}
