import { api } from '../config/apiClient';

/**
 * Group classes & bookings — all calls authenticated; booking identity is
 * derived server-side from the JWT (never sent from the client).
 */

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Next concrete date a weekly class runs (today counts if it matches). */
export function nextDateFor(weekday) {
  const today = new Date();
  const d = new Date(today);
  d.setDate(today.getDate() + ((weekday - ((today.getDay() + 6) % 7)) + 7) % 7);
  return d.toISOString().split('T')[0];
}

export function weekdayName(weekday) {
  return WEEKDAYS[weekday] || '';
}

export function formatTime(t) {
  // "07:00:00" -> "7:00 AM"
  const [h, m] = String(t).split(':').map(Number);
  const am = h < 12;
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

export const classService = {
  list: (branchId) => api.get(branchId ? `/classes/?branch_id=${branchId}` : '/classes/'),
  create: (payload) => api.post('/classes/', payload),
  update: (classId, payload) => api.put(`/classes/${classId}`, payload),
  remove: (classId) => api.delete(`/classes/${classId}`),
  book: (classId, classDate) => api.post(`/classes/${classId}/book`, { class_date: classDate }),
  myBookings: () => api.get('/classes/bookings/mine'),
  cancelBooking: (bookingId) => api.delete(`/classes/bookings/${bookingId}`),
  roster: (classId, classDate) => api.get(`/classes/${classId}/roster?class_date=${classDate}`),
};
