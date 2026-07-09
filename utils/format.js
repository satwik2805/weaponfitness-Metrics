/**
 * Presentation formatters — single source of truth. Previously `money`,
 * `inr`, `greeting`, `shortDate`, `clockTime` were re-declared in every
 * dashboard (with the Admin copy already diverging on parseFloat); review R-008.
 */

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** 40497 → "₹40,497" (rounds; tolerant of string amounts from the API). */
export const money = (n) => `₹${inrFmt.format(Math.round(Number(n) || 0))}`;

/** 284 → "284" with Indian grouping. */
export const inr = (n) => inrFmt.format(Math.round(Number(n) || 0));

/** Time-of-day greeting. */
export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Date | ISO string → "5 Jun". */
export const shortDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** "07:00:00" | Date → "7:00 AM". */
export const clockTime = (t) => {
  if (t instanceof Date) {
    return t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const [h, m] = String(t).split(':').map(Number);
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
};

/** Pluralize: count(2,'day') → "2 days". */
export const plural = (n, word, suffix = 's') => `${n} ${word}${n === 1 ? '' : suffix}`;
