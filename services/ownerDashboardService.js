import { supabase } from '../config/supabase';

/**
 * Owner dashboard data — every query written against the CANONICAL schema
 * (the previous dashboard queried tables/columns that only ever existed in
 * the old script-mutated database: `trainee_plan`, `payments.status/date`,
 * `attendance.branch_id`. None of them survive contact with clean data.)
 *
 * Reads go through PostgREST under RLS; the caller is an authenticated
 * Owner/Admin. All joins ride real foreign keys.
 */

const todayISO = () => new Date().toISOString().split('T')[0];

const isoDaysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const monthStartISO = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

async function getBranches(ownerId) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, branch_name, allow_trainer_renewal')
    .eq('owner_id', ownerId)
    .order('branch_name');
  if (error) throw error;
  return data || [];
}

/** Profile ids (members only) for the selected branches — the join root for
 *  payment queries (payments→profiles is FK'd; profiles carry the branch). */
async function getMemberProfileIds(branchIds) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'Trainee')
    .in('branch_id', branchIds);
  if (error) throw error;
  return data || [];
}

async function getStaffCounts(branchIds) {
  const count = async (role) => {
    const { count: n, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', role)
      .in('branch_id', branchIds);
    if (error) throw error;
    return n ?? 0;
  };
  const [trainers, receptionists] = await Promise.all([count('Trainer'), count('Receptionist')]);
  return { trainers, receptionists };
}

async function getMembershipStats(branchIds) {
  const base = () =>
    supabase
      .from('trainee_plans')
      .select('id, trainees!inner(id, profiles!inner(branch_id))', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('expires_at', todayISO())
      .in('trainees.profiles.branch_id', branchIds);

  const [activeResp, expiringResp, newResp] = await Promise.all([
    base(),
    base().lte('expires_at', isoDaysFromNow(7)),
    supabase
      .from('trainee_plans')
      .select('id, trainees!inner(id, profiles!inner(branch_id))', { count: 'exact', head: true })
      .gte('created_at', monthStartISO())
      .in('trainees.profiles.branch_id', branchIds),
  ]);
  for (const r of [activeResp, expiringResp, newResp]) if (r.error) throw r.error;
  return {
    activeMembers: activeResp.count ?? 0,
    expiringSoon: expiringResp.count ?? 0,
    newThisMonth: newResp.count ?? 0,
  };
}

async function getRevenue(memberIds) {
  if (!memberIds.length) {
    return { thisMonth: 0, lastMonth: 0, total: 0, byMode: { Cash: 0, Card: 0, UPI: 0 } };
  }
  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_mode, created_at')
    .eq('payment_status', 'Completed')
    .in('profile_id', memberIds);
  if (error) throw error;

  const thisStart = monthStartISO();
  const lastStart = monthStartISO(-1);
  const out = { thisMonth: 0, lastMonth: 0, total: 0, byMode: { Cash: 0, Card: 0, UPI: 0 } };
  for (const p of data || []) {
    const amt = parseFloat(p.amount) || 0;
    out.total += amt;
    if (p.created_at >= thisStart) {
      out.thisMonth += amt;
      if (out.byMode[p.payment_mode] !== undefined) out.byMode[p.payment_mode] += amt;
    } else if (p.created_at >= lastStart) {
      out.lastMonth += amt;
    }
  }
  return out;
}

/** Last 7 days of check-ins for the branches, as [{label, count}]. */
async function getAttendanceSeries(branchIds) {
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const fromISO = from.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .select('attendance_date, trainees!inner(profiles!inner(branch_id))')
    .gte('attendance_date', fromISO)
    .eq('is_present', true)
    .in('trainees.profiles.branch_id', branchIds);
  if (error) throw error;

  const series = [];
  const counts = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().split('T')[0];
    counts[key] = 0;
    series.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }) });
  }
  for (const row of data || []) {
    if (counts[row.attendance_date] !== undefined) counts[row.attendance_date] += 1;
  }
  return series.map((s) => ({ label: s.label, count: counts[s.key], isToday: s.key === todayISO() }));
}

async function getTopTrainers(branchIds) {
  const [{ data: trainers, error: e1 }, { data: loads, error: e2 }] = await Promise.all([
    supabase
      .from('trainers')
      .select('id, experience_years, rating_avg, profiles!trainers_id_fkey!inner(full_name, profile_image, branch_id)')
      .in('profiles.branch_id', branchIds),
    supabase.from('trainees').select('trainer_id'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const memberLoad = {};
  for (const t of loads || []) {
    if (t.trainer_id) memberLoad[t.trainer_id] = (memberLoad[t.trainer_id] || 0) + 1;
  }
  return (trainers || [])
    .map((t) => ({
      id: t.id,
      name: t.profiles?.full_name || 'Trainer',
      avatar: t.profiles?.profile_image || null,
      rating: t.rating_avg ? parseFloat(t.rating_avg) : null,
      experienceYears: t.experience_years,
      members: memberLoad[t.id] || 0,
    }))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

/**
 * Retention radar: active members who are slipping away —
 * no check-in for 10+ days, or membership expiring within 7.
 */
async function getAtRiskMembers(branchIds) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceISO = since.toISOString().split('T')[0];

  const [{ data: plans, error: e1 }, { data: recent, error: e2 }] = await Promise.all([
    supabase
      .from('trainee_plans')
      .select('trainee_id, expires_at, trainees!inner(id, profiles!inner(id, full_name, branch_id))')
      .eq('is_active', true)
      .in('trainees.profiles.branch_id', branchIds),
    supabase
      .from('attendance')
      .select('trainee_id, attendance_date')
      .gte('attendance_date', sinceISO)
      .eq('is_present', true),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const lastSeen = {};
  for (const a of recent || []) {
    if (!lastSeen[a.trainee_id] || a.attendance_date > lastSeen[a.trainee_id]) {
      lastSeen[a.trainee_id] = a.attendance_date;
    }
  }

  const today = new Date(todayISO());
  const sevenOut = isoDaysFromNow(7);
  const risks = [];
  for (const p of plans || []) {
    const name = p.trainees?.profiles?.full_name || 'Member';
    const seen = lastSeen[p.trainee_id];
    const daysAway = seen
      ? Math.round((today - new Date(seen)) / 86400000)
      : 31;
    const expiring = p.expires_at <= sevenOut;
    if (daysAway >= 10 || expiring) {
      risks.push({
        traineeId: p.trainee_id,
        name,
        daysAway: seen ? daysAway : null,
        expiresAt: expiring ? p.expires_at : null,
      });
    }
  }
  // most at-risk first: lapsed attendance + imminent expiry
  return risks.sort((a, b) => (b.daysAway ?? 99) - (a.daysAway ?? 99)).slice(0, 8);
}

async function getRecentPayments(memberProfiles, limit = 6) {
  const ids = memberProfiles.map((m) => m.id);
  if (!ids.length) return [];
  const nameOf = Object.fromEntries(memberProfiles.map((m) => [m.id, m.full_name]));
  const { data, error } = await supabase
    .from('payments')
    .select('id, profile_id, amount, payment_mode, payment_status, created_at')
    .in('profile_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((p) => ({ ...p, name: nameOf[p.profile_id] || 'Member' }));
}

async function getCheckinsToday(branchIds) {
  const { count, error } = await supabase
    .from('attendance')
    .select('id, trainees!inner(profiles!inner(branch_id))', { count: 'exact', head: true })
    .eq('attendance_date', todayISO())
    .eq('is_present', true)
    .in('trainees.profiles.branch_id', branchIds);
  if (error) throw error;
  return count ?? 0;
}

/** One call → everything the dashboard renders. */
export async function loadOwnerDashboard(ownerId, branchIds) {
  const memberProfiles = await getMemberProfileIds(branchIds);
  const [staff, membership, revenue, attendance, trainers, atRisk, recentPayments, checkinsToday] =
    await Promise.all([
      getStaffCounts(branchIds),
      getMembershipStats(branchIds),
      getRevenue(memberProfiles.map((m) => m.id)),
      getAttendanceSeries(branchIds),
      getTopTrainers(branchIds),
      getAtRiskMembers(branchIds),
      getRecentPayments(memberProfiles),
      getCheckinsToday(branchIds),
    ]);
  return {
    totalMembers: memberProfiles.length,
    staff,
    membership,
    revenue,
    attendance,
    trainers,
    atRisk,
    recentPayments,
    checkinsToday,
  };
}

export const ownerDashboardService = { getBranches, loadOwnerDashboard };
