/**
 * Date helpers for service queries — single source of truth. The pattern
 * `new Date().toISOString().split('T')[0]` appeared ~20× across the four
 * dashboard services (review R-008). Local-calendar dates (not UTC) so a
 * check-in at 11pm counts for the right day.
 */

const pad = (n) => String(n).padStart(2, '0');

/** Local YYYY-MM-DD for a Date (defaults to today). */
export const dayISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => dayISO();

/** YYYY-MM-DD `days` from today (negative = past). */
export const isoDaysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayISO(d);
};

export const isoDaysAgo = (days) => isoDaysFromNow(-days);

/** ISO timestamp at the first of the month, `offsetMonths` from now. */
export const monthStartISO = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
