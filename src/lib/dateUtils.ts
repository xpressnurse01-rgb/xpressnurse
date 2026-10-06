/**
 * Unified Date Formatting Utilities
 * Standard: DD/MM/YY across the entire Xpress Nurse application.
 */

/**
 * Format any date value into DD/MM/YY (e.g. 06/10/26).
 * Handles ISO strings, timestamps, Date objects, YYYY-MM-DD inputs, and preserves special labels like "Today (ASAP)".
 */
export function formatDateDDMMYY(
  val: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }

  // If already a Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yy = String(val.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  // If number timestamp
  if (typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  const str = String(val).trim();

  // If it's a known non-date descriptive label, preserve it
  if (
    str.toLowerCase().startsWith('today') ||
    str.toLowerCase().startsWith('recent') ||
    str.toLowerCase().startsWith('immediate') ||
    str.toLowerCase().startsWith('asap')
  ) {
    return str;
  }

  // Check if string matches DD/MM/YY directly (e.g. 06/10/26)
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(str)) {
    return str;
  }

  // Check if string matches DD/MM/YYYY (e.g. 06/10/2026) -> convert to DD/MM/YY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const dd = ddmmyyyyMatch[1].padStart(2, '0');
    const mm = ddmmyyyyMatch[2].padStart(2, '0');
    const yy = ddmmyyyyMatch[3].slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  // Check if string matches YYYY-MM-DD directly (e.g. 2026-10-06)
  const yyyymmddMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmddMatch) {
    const dd = yyyymmddMatch[3].padStart(2, '0');
    const mm = yyyymmddMatch[2].padStart(2, '0');
    const yy = yyyymmddMatch[1].slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  // Check if string matches DD-MM-YYYY or DD-MM-YY
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashMatch) {
    const dd = dashMatch[1].padStart(2, '0');
    const mm = dashMatch[2].padStart(2, '0');
    const yy = dashMatch[3].slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  // Parse ISO string or date-time string
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  return str || fallback;
}

/**
 * Format any date + time value into DD/MM/YY, hh:mm A (e.g. 06/10/26, 03:45 PM).
 */
export function formatDateTimeDDMMYY(
  val: string | number | Date | null | undefined,
  fallback = 'Recent'
): string {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }

  const d = val instanceof Date ? val : new Date(typeof val === 'number' ? val : String(val));
  if (isNaN(d.getTime())) {
    return String(val) || fallback;
  }

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);

  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour '0' should be '12'
  const hh = String(hours).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yy}, ${hh}:${minutes} ${ampm}`;
}

/**
 * Format time only into hh:mm A (e.g. 03:45 PM).
 */
export function formatTimeOnly(
  val: string | number | Date | null | undefined,
  fallback = ''
): string {
  if (!val) return fallback;
  const d = val instanceof Date ? val : new Date(typeof val === 'number' ? val : String(val));
  if (isNaN(d.getTime())) return fallback;

  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hh}:${minutes} ${ampm}`;
}
