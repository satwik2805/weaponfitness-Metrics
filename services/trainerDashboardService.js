import { supabase } from '../config/supabase';
import { classService } from './classService';

/**
 * Trainer dashboard data — every query written against the CANONICAL schema.
 * (The old screen joined `trainee_plan`, `attendance(date)` and
 * `branches!fk_profiles_branch`, none of which exist on clean data: the
 * canonical names are `trainee_plans`, `attendance.attendance_date` and the
 * default-named `profiles_branch_id_fkey`.)
 *
 * Reads go through PostgREST under RLS as the authenticated Trainer; the
 * class schedule comes from the FastAPI /classes service.
 */

const todayISO = () => new Date().toISOString().split('T')[0];

const isoDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

/** Who am I: first name, branch, and whether the owner lets trainers renew. */
async function getTrainerContext(uid) {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, branch_id, branches!profiles_branch_id_fkey(allow_trainer_renewal)')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return {
    fullName: data?.full_name || '',
    firstName: data?.full_name?.split(' ')[0] || 'Coach',
    branchId: data?.branch_id || null,
    allowTrainerRenewal: data?.branches?.allow_trainer_renewal ?? false,
  };
}

/** Members assigned to me, with profile + progression columns. */
async function getMyMembers(trainerId) {
  const { data, error } = await supabase
    .from('trainees')
    .select('id, bmi, xp, level, created_at, profiles(full_name, profile_image)')
    .eq('trainer_id', trainerId);
  if (error) throw error;
  return (data || []).map((t) => ({
    id: t.id,
    name: t.profiles?.full_name || 'Member',
    avatar: t.profiles?.profile_image || null,
    bmi: t.bmi != null ? parseFloat(t.bmi) : null,
    xp: t.xp || 0,
    level: t.level || 1,
    joinedAt: t.created_at || null,
  }));
}

/** Last check-in per member (30-day window) + how many of MY members are in today. */
async function getAttendanceSignals(memberIds) {
  if (!memberIds.length) return { lastSeen: {}, checkedInToday: 0 };
  const { data, error } = await supabase
    .from('attendance')
    .select('trainee_id, attendance_date')
    .in('trainee_id', memberIds)
    .eq('is_present', true)
    .gte('attendance_date', isoDaysAgo(30));
  if (error) throw error;

  const lastSeen = {};
  const today = todayISO();
  const inToday = new Set();
  for (const row of data || []) {
    if (!lastSeen[row.trainee_id] || row.attendance_date > lastSeen[row.trainee_id]) {
      lastSeen[row.trainee_id] = row.attendance_date;
    }
    if (row.attendance_date === today) inToday.add(row.trainee_id);
  }
  return { lastSeen, checkedInToday: inToday.size };
}

/** Membership status per member from canonical trainee_plans. */
async function getMembershipStatus(memberIds) {
  if (!memberIds.length) return {};
  const { data, error } = await supabase
    .from('trainee_plans')
    .select('trainee_id, expires_at, is_active')
    .in('trainee_id', memberIds);
  if (error) throw error;

  const today = todayISO();
  const byMember = {};
  for (const p of data || []) {
    const entry = byMember[p.trainee_id] || (byMember[p.trainee_id] = { hasActive: false, lastExpiry: null });
    if (p.is_active && p.expires_at && p.expires_at >= today) entry.hasActive = true;
    if (p.expires_at && (!entry.lastExpiry || p.expires_at > entry.lastExpiry)) entry.lastExpiry = p.expires_at;
  }
  return byMember;
}

/** My groups with live member counts. */
async function getMyGroups(trainerId) {
  const { data, error } = await supabase
    .from('trainee_groups')
    .select('id, group_name, trainee_group_members(count)')
    .eq('trainer_id', trainerId)
    .order('group_name');
  if (error) throw error;
  return (data || []).map((g) => ({
    id: g.id,
    name: g.group_name || 'Group',
    members: g.trainee_group_members?.[0]?.count || 0,
  }));
}

/** Weekly classes I teach, ordered by weekday then start time. */
async function getMyClasses(trainerId, branchId) {
  const all = await classService.list(branchId || undefined);
  return (all || [])
    .filter((c) => String(c.trainer_id) === String(trainerId))
    .sort(
      (a, b) =>
        a.weekday - b.weekday || String(a.start_time).localeCompare(String(b.start_time))
    );
}

/** One call → everything the dashboard renders. */
export async function loadTrainerDashboard(uid) {
  const me = await getTrainerContext(uid);
  const baseMembers = await getMyMembers(uid);
  const ids = baseMembers.map((m) => m.id);

  const [attendanceSignals, membershipByMember, groups, classesResult] = await Promise.all([
    getAttendanceSignals(ids),
    getMembershipStatus(ids),
    getMyGroups(uid),
    // The classes API lives on the FastAPI side — if it's unreachable the rest
    // of the dashboard must still render, so this failure stays section-local.
    getMyClasses(uid, me.branchId)
      .then((classes) => ({ classes, classesError: null }))
      .catch((err) => ({ classes: [], classesError: err })),
  ]);

  const today = todayISO();
  const members = baseMembers
    .map((m) => ({
      ...m,
      lastSeen: attendanceSignals.lastSeen[m.id] || null,
      checkedInToday: attendanceSignals.lastSeen[m.id] === today,
      membership: membershipByMember[m.id] || { hasActive: false, lastExpiry: null },
    }))
    // most recently active first; never-seen members sink to the bottom
    .sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));

  return {
    me,
    members,
    groups,
    classes: classesResult.classes,
    classesError: classesResult.classesError,
    checkedInToday: attendanceSignals.checkedInToday,
  };
}

export const trainerDashboardService = { loadTrainerDashboard };
