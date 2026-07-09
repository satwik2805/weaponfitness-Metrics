import { supabase } from '../config/supabase';

/**
 * Admin dashboard data — a single-branch operations console.
 *
 * Every query is written against the CANONICAL schema. The old AdminDashboard
 * queried `payments.status/date/plan_id/trainee_id` and other columns that do
 * not exist; none of those queries are carried forward.
 *
 * Reads go through PostgREST under RLS as the authenticated Admin. Joins ride
 * real foreign keys: attendance→trainees!inner(profiles!inner(branch_id)),
 * payments→profiles via payments_profile_id_fkey.
 */

const todayISO = () => new Date().toISOString().split('T')[0];

const isoDaysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

/** The signed-in admin's identity + branch scope. */
async function getMe() {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Your session has expired. Please sign in again.');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, branch_id')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return data;
}

async function getBranch(branchId) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, branch_name, allow_trainer_renewal')
    .eq('id', branchId)
    .single();
  if (error) throw error;
  return data;
}

async function countRole(branchId, role) {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', role)
    .eq('branch_id', branchId);
  if (error) throw error;
  return count ?? 0;
}

async function getCheckinsToday(branchId) {
  const { count, error } = await supabase
    .from('attendance')
    .select('id, trainees!inner(profiles!inner(branch_id))', { count: 'exact', head: true })
    .eq('attendance_date', todayISO())
    .eq('is_present', true)
    .eq('trainees.profiles.branch_id', branchId);
  if (error) throw error;
  return count ?? 0;
}

async function getExpiringSoon(branchId) {
  const { count, error } = await supabase
    .from('trainee_plans')
    .select('id, trainees!inner(id, profiles!inner(branch_id))', { count: 'exact', head: true })
    .eq('is_active', true)
    .gte('expires_at', todayISO())
    .lte('expires_at', isoDaysFromNow(7))
    .eq('trainees.profiles.branch_id', branchId);
  if (error) throw error;
  return count ?? 0;
}

/** Trainers + receptionists of the branch, one list. */
async function getStaff(branchId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, profile_image, role')
    .in('role', ['Trainer', 'Receptionist'])
    .eq('branch_id', branchId)
    .order('full_name');
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    name: p.full_name || 'Staff member',
    phone: p.phone || null,
    avatar: p.profile_image || null,
    role: p.role,
  }));
}

/**
 * Members of the branch — latest 10 by join date, or a name search across
 * the whole branch when `query` is given. Level rides along for the badge.
 */
async function getMembers(branchId, query = '', limit = 10) {
  let req = supabase
    .from('trainees')
    .select('id, level, xp, created_at, profiles!inner(id, full_name, phone, profile_image, branch_id)')
    .eq('profiles.branch_id', branchId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (query) req = req.ilike('profiles.full_name', `%${query}%`);
  const { data, error } = await req;
  if (error) throw error;
  return (data || []).map((t) => ({
    id: t.id,
    name: t.profiles?.full_name || 'Member',
    phone: t.profiles?.phone || null,
    avatar: t.profiles?.profile_image || null,
    level: t.level ?? null,
    xp: t.xp ?? 0,
    joinedAt: t.created_at,
    role: 'Trainee',
  }));
}

/** Latest payments from members of this branch (canonical columns only). */
async function getRecentPayments(branchId, limit = 6) {
  const { data: members, error: e1 } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'Trainee')
    .eq('branch_id', branchId);
  if (e1) throw e1;
  const ids = (members || []).map((m) => m.id);
  if (!ids.length) return [];
  const nameOf = Object.fromEntries((members || []).map((m) => [m.id, m.full_name]));

  const { data, error } = await supabase
    .from('payments')
    .select('id, profile_id, amount, payment_mode, payment_status, created_at')
    .in('profile_id', ids)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((p) => ({ ...p, name: nameOf[p.profile_id] || 'Member' }));
}

/**
 * Delete a user's profile — honestly.
 *
 * The old flow (audit WF-019) fired a blind DELETE: a silent no-op on web,
 * orphaned data on native. Now: we ask PostgREST to return the deleted rows,
 * so "nothing happened" surfaces as a real error instead of a fake success,
 * and the payments FK (RESTRICT) rejection gets human copy.
 */
async function deleteUser(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .select('id');

  if (error) {
    if (error.code === '23503') {
      const mentionsPayments = `${error.message || ''} ${error.details || ''}`.includes('payments');
      const friendly = new Error(
        mentionsPayments
          ? "This member has payment history and can't be deleted. Deactivate their plan instead."
          : "This user still has records linked to them, so they can't be deleted."
      );
      friendly.code = 'restricted';
      throw friendly;
    }
    throw new Error(error.message || 'The server refused to delete this user.');
  }
  if (!data || data.length === 0) {
    throw new Error("Nothing was deleted — you may not have permission to remove this user.");
  }
}

/** One call → everything the dashboard renders. */
async function loadAdminDashboard(branchId) {
  const [members, trainers, checkinsToday, expiringSoon, staff, latestMembers, recentPayments] =
    await Promise.all([
      countRole(branchId, 'Trainee'),
      countRole(branchId, 'Trainer'),
      getCheckinsToday(branchId),
      getExpiringSoon(branchId),
      getStaff(branchId),
      getMembers(branchId),
      getRecentPayments(branchId),
    ]);
  return {
    counts: { members, trainers },
    checkinsToday,
    expiringSoon,
    staff,
    members: latestMembers,
    recentPayments,
  };
}

export const adminDashboardService = {
  getMe,
  getBranch,
  getMembers,
  deleteUser,
  loadAdminDashboard,
};
