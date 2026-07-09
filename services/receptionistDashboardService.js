import { supabase } from '../config/supabase';

/**
 * Front-desk dashboard data — written against the CANONICAL schema
 * (the old ReceptionistDashboard queried `trainee_plan` with
 * `expiry_date`/`active_status`, columns that no longer exist).
 *
 * Reads go through PostgREST under RLS as the signed-in Receptionist;
 * every join rides a real foreign key:
 *   attendance → trainees!inner → profiles!inner (branch filter)
 *   trainee_plans → membership_plans (plan name) + trainees → profiles
 *   payments → profiles via payments_profile_id_fkey
 */

const MS_DAY = 86400000;

const todayISO = () => new Date().toISOString().split('T')[0];

const dayStartISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const monthStartISO = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const isoDaysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/** Who is at the desk, and which branch do they run? */
async function getDeskContext(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, branch_id')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return { name: data?.full_name || '', branchId: data?.branch_id || null };
}

/** All members (Trainee profiles) of the branch, alphabetical. */
async function getMembers(branchId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, profile_image')
    .eq('role', 'Trainee')
    .eq('branch_id', branchId)
    .order('full_name');
  if (error) throw error;
  return data || [];
}

/** Every active membership term in the branch, with plan + member names. */
async function getActivePlans(branchId) {
  const { data, error } = await supabase
    .from('trainee_plans')
    .select(
      'trainee_id, started_at, expires_at, membership_plans(plan_name), trainees!inner(profiles!inner(full_name, profile_image, branch_id))'
    )
    .eq('is_active', true)
    .eq('trainees.profiles.branch_id', branchId);
  if (error) throw error;
  return data || [];
}

/** Today's check-ins: exact count + the latest rows with member names. */
async function getTodayCheckins(branchId, limit = 8) {
  const today = todayISO();
  const [listResp, countResp] = await Promise.all([
    supabase
      .from('attendance')
      .select('id, created_at, trainee_id, trainees!inner(profiles!inner(full_name, profile_image, branch_id))')
      .eq('attendance_date', today)
      .eq('is_present', true)
      .eq('trainees.profiles.branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('attendance')
      .select('id, trainees!inner(profiles!inner(branch_id))', { count: 'exact', head: true })
      .eq('attendance_date', today)
      .eq('is_present', true)
      .eq('trainees.profiles.branch_id', branchId),
  ]);
  if (listResp.error) throw listResp.error;
  if (countResp.error) throw countResp.error;
  return {
    count: countResp.count ?? 0,
    rows: (listResp.data || []).map((r) => ({
      id: r.id,
      traineeId: r.trainee_id,
      name: r.trainees?.profiles?.full_name || 'Member',
      avatar: r.trainees?.profiles?.profile_image || null,
      at: r.created_at,
    })),
  };
}

/** Membership terms started this month (new joins + renewals logged). */
async function getNewMembershipsThisMonth(branchId) {
  const { count, error } = await supabase
    .from('trainee_plans')
    .select('id, trainees!inner(profiles!inner(branch_id))', { count: 'exact', head: true })
    .gte('created_at', monthStartISO())
    .eq('trainees.profiles.branch_id', branchId);
  if (error) throw error;
  return count ?? 0;
}

/** Completed payments taken today, for the branch's members. */
async function getPaymentsToday(memberIds) {
  if (!memberIds.length) return { total: 0, count: 0 };
  const { data, error } = await supabase
    .from('payments')
    .select('amount')
    .eq('payment_status', 'Completed')
    .gte('created_at', dayStartISO())
    .in('profile_id', memberIds);
  if (error) throw error;
  const rows = data || [];
  return {
    total: rows.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    count: rows.length,
  };
}

/** One call → everything the desk renders. */
async function loadReceptionistDashboard(branchId) {
  const members = await getMembers(branchId);
  const memberIds = members.map((m) => m.id);

  const [activePlans, checkins, newThisMonth, paymentsToday] = await Promise.all([
    getActivePlans(branchId),
    getTodayCheckins(branchId),
    getNewMembershipsThisMonth(branchId),
    getPaymentsToday(memberIds),
  ]);

  const today = new Date(todayISO());
  const sevenOut = isoDaysFromNow(7);

  const planByTrainee = {};
  for (const p of activePlans) {
    // unique partial index guarantees at most one active plan per member
    planByTrainee[p.trainee_id] = p;
  }

  // Renewals due: active plans lapsing within 7 days — overdue ones first.
  const renewalsDue = activePlans
    .filter((p) => p.expires_at <= sevenOut)
    .map((p) => ({
      traineeId: p.trainee_id,
      name: p.trainees?.profiles?.full_name || 'Member',
      avatar: p.trainees?.profiles?.profile_image || null,
      planName: p.membership_plans?.plan_name || 'Membership',
      expiresAt: p.expires_at,
      daysLeft: Math.ceil((new Date(p.expires_at) - today) / MS_DAY),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Directory rows with live membership status.
  const directory = members.map((m) => {
    const plan = planByTrainee[m.id];
    const active = plan && plan.expires_at >= todayISO();
    return {
      id: m.id,
      name: m.full_name || 'Member',
      avatar: m.profile_image || null,
      planName: active ? plan.membership_plans?.plan_name || 'Membership' : null,
      status: !plan || !active ? 'none' : plan.expires_at <= sevenOut ? 'expiring' : 'active',
    };
  });

  return { members: directory, renewalsDue, checkins, newThisMonth, paymentsToday };
}

export const receptionistDashboardService = { getDeskContext, loadReceptionistDashboard };
