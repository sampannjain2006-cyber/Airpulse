/**
 * Timezone-safe date arithmetic and validation utilities for AIRPULSE.
 *
 * Configured application timezone: Asia/Kolkata (UTC+05:30)
 * Prevents UTC midnight shift, DST discrepancies, leap year anomalies,
 * and month/year boundary off-by-one errors.
 */

export const APP_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current calendar date string in YYYY-MM-DD format
 * within the specified application timezone (default: Asia/Kolkata).
 * Never relies on UTC ISO string slicing which can yield the wrong calendar date.
 *
 * @param {string} [timeZone='Asia/Kolkata']
 * @returns {string} 'YYYY-MM-DD'
 */
export function getCurrentDateInTimezone(timeZone = APP_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Performs timezone-safe calendar date addition.
 * Uses UTC noon (12:00:00) intermediate representation to ensure that
 * daylight saving or fractional hour timezone offsets never cause midnight rollover.
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {number} days - Integer number of days to add (positive or negative)
 * @returns {string} 'YYYY-MM-DD'
 */
export function addCalendarDays(dateStr, days) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid date format '${dateStr}'. Expected YYYY-MM-DD.`);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  // Noon UTC prevents midnight boundary drift
  const utcDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  const resYear = utcDate.getUTCFullYear();
  const resMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const resDay = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Computes exactly the next 5 calendar dates from a reference date (T+1 through T+5).
 * The reference date itself is NOT included in the future forecast dates.
 * Day 6 and later are NEVER included.
 *
 * @param {string} referenceDateStr - 'YYYY-MM-DD'
 * @param {number} [horizonDays=5] - Number of forecast days (strictly clamped to 5)
 * @returns {string[]} Array of 5 calendar date strings ['YYYY-MM-DD', ...]
 */
export function getForecastTargetDates(referenceDateStr, horizonDays = 5) {
  const targetDays = Math.min(Math.max(1, horizonDays), 5);
  const dates = [];
  for (let step = 1; step <= targetDays; step++) {
    dates.push(addCalendarDays(referenceDateStr, step));
  }
  return dates;
}

/**
 * Validates a reference date:
 * 1. Must be in 'YYYY-MM-DD' format.
 * 2. Must be a valid calendar date.
 * 3. Must not be in the future relative to the application timezone (Asia/Kolkata).
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} [timeZone=APP_TIMEZONE]
 * @throws {Error} 400 Bad Request error if invalid or future date
 * @returns {string} Validated date string 'YYYY-MM-DD'
 */
export function validateReferenceDate(dateStr, timeZone = APP_TIMEZONE) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const err = new Error(`Invalid or missing reference date '${dateStr}'. Must be in 'YYYY-MM-DD' format.`);
    err.statusCode = 400;
    throw err;
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  const testDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (
    testDate.getUTCFullYear() !== y ||
    testDate.getUTCMonth() !== m - 1 ||
    testDate.getUTCDate() !== d
  ) {
    const err = new Error(`Invalid calendar date '${dateStr}'. Date does not exist on calendar.`);
    err.statusCode = 400;
    throw err;
  }

  const todayInAppTz = getCurrentDateInTimezone(timeZone);
  if (dateStr > todayInAppTz) {
    const err = new Error(
      `Reference date '${dateStr}' cannot be in the future (current application calendar date in ${timeZone} is '${todayInAppTz}').`
    );
    err.statusCode = 400;
    throw err;
  }

  return dateStr;
}
