import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { supabase } from '../config/supabase';
import { ENDPOINTS } from '../constants/api';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Badge,
  Button,
  CinematicHero,
  DashboardScreen,
  DashboardSkeleton,
  EmptyState,
  Input,
  ListItem,
  Reveal,
  SectionTitle,
  StatTile,
  Surface,
  useToast,
} from '../components/ui';
import { money, greeting, shortDate, clockTime } from '../utils/format';
import { receptionistDashboardService } from '../services/receptionistDashboardService';

// existing flows, kept wired
import RegisterMemberModal from '../components/RegisterMemberModal';
import RenewSubscriptionModal from '../components/RenewSubscriptionModal';
import BroadcastEmailModal from '../components/BroadcastEmailModal';
import TraineeProfileModal from '../components/TraineeProfileModal';

const HERO = require('../assets/photos/plates.jpg');

export default function ReceptionistDashboard({ navigation }) {
  const { space, toggleTheme } = useTheme();
  const toast = useToast();

  const [deskName, setDeskName] = useState('');
  const [branchId, setBranchId] = useState(null);
  const [bootDone, setBootDone] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // existing flows, kept wired
  const [registerModal, setRegisterModal] = useState(false);
  const [renewModal, setRenewModal] = useState(false);
  const [renewFor, setRenewFor] = useState(null);
  const [emailModal, setEmailModal] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null); // → TraineeProfileModal

  const load = useCallback(async (bid, { silent = false } = {}) => {
    if (!bid) {
      setLoading(false);
      return;
    }
    try {
      const result = await receptionistDashboardService.loadReceptionistDashboard(bid);
      setData(result);
      setError(null);
    } catch (err) {
      if (!silent) setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const ctx = await receptionistDashboardService.getDeskContext(uid);
      setDeskName(ctx.name?.split(' ')[0] || 'there');
      setBranchId(ctx.branchId);
      setBootDone(true);
      await load(ctx.branchId);
    } catch (err) {
      setError(err);
      setLoading(false);
      setBootDone(true);
    }
  }, [load]);

  useEffect(() => {
    bootstrap();
  }, []);

  const refresh = useCallback(() => {
    if (branchId) load(branchId, { silent: true });
  }, [branchId, load]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    branchId ? load(branchId) : bootstrap();
  }, [branchId, load, bootstrap]);

  const openRenew = (traineeId = null) => {
    setRenewFor(traineeId);
    setRenewModal(true);
  };

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.members;
    return data.members.filter((m) => m.name.toLowerCase().includes(q));
  }, [data, search]);

  /**
   * Broadcast email — entry point preserved from the old desk. The send
   * endpoint needs a server-side key that isn't wired up yet, so failure
   * gets the honest line instead of a fake success.
   */
  const handleBroadcastEmail = async ({ subject, message, sendToTrainees, sendToTrainers }) => {
    setEmailModal(false);
    try {
      const recipients = [];
      if (sendToTrainees) {
        const { data: rows, error: e } = await supabase.rpc('get_user_emails_by_role', { role_name: 'Trainee' });
        if (e) throw e;
        recipients.push(...(rows?.map((r) => r.email) || []));
      }
      if (sendToTrainers) {
        const { data: rows, error: e } = await supabase.rpc('get_user_emails_by_role', { role_name: 'Trainer' });
        if (e) throw e;
        recipients.push(...(rows?.map((r) => r.email) || []));
      }
      const unique = Array.from(new Set(recipients)).filter(Boolean);
      if (!unique.length) {
        toast.show('No one matches that audience yet, so there was nobody to email.', { kind: 'warning' });
        return;
      }
      const response = await fetch(ENDPOINTS.SEND_EMAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients: unique, subject, message }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error('Email service unavailable');
      toast.show(`Broadcast sent to ${unique.length} ${unique.length === 1 ? 'person' : 'people'}.`, { kind: 'success' });
    } catch {
      toast.show("Email service isn't connected yet — it's on the roadmap.", { kind: 'warning' });
    }
  };

  const memberStatusBadge = (m) => {
    if (m.status === 'active') return <Badge tone="success" icon="checkmark-circle">Active</Badge>;
    if (m.status === 'expiring') return <Badge tone="warning" icon="time">Expiring</Badge>;
    return <Badge tone="neutral">No plan</Badge>;
  };

  const renewalBadge = (r) => {
    if (r.daysLeft < 0) return <Badge tone="danger" icon="alert-circle">Overdue</Badge>;
    if (r.daysLeft === 0) return <Badge tone="danger" icon="time">Today</Badge>;
    return <Badge tone="warning" icon="time">{`${r.daysLeft}d left`}</Badge>;
  };

  // Substantive headline metric — new sign-ups this month, not check-ins-today
  // which reads 0 for most of the morning (review R-013).
  const hero = (scrollY) => (
    <CinematicHero
      source={HERO}
      scrollY={scrollY}
      eyebrow={greeting().toUpperCase()}
      title={deskName || ' '}
      metric={{ value: data?.newThisMonth || 0, label: 'new members this month' }}
      onToggleTheme={toggleTheme}
      onRefresh={refresh}
    />
  );

  return (
    <>
      <DashboardScreen
        renderHero={hero}
        loading={loading}
        error={error}
        isEmpty={(!loading && bootDone && !branchId) || (!loading && !error && !data)}
        onRetry={retry}
        refreshing={false}
        onRefresh={refresh}
        errorTitle="Couldn't load the front desk"
        skeleton={<DashboardSkeleton tiles={4} rows={3} />}
        emptyState={
          <EmptyState
            icon="business-outline"
            title="No branch assigned"
            body="Your account isn't linked to a branch yet, so the desk has nothing to show. Ask your owner to assign you, then check back."
            actionTitle="Check again"
            onAction={bootstrap}
            style={{ marginTop: space[8] }}
          />
        }
      >
        {/* hero actions — the two things the desk does all day */}
        <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[5] }}>
          <Button
            title="Scan check-in"
            icon="qr-code-outline"
            size="lg"
            style={{ flex: 1 }}
            disabled={!branchId}
            onPress={() => navigation.navigate('QRScanner')}
          />
          <Button
            title="Register member"
            icon="person-add-outline"
            size="lg"
            variant="secondary"
            style={{ flex: 1 }}
            disabled={!branchId}
            onPress={() => setRegisterModal(true)}
          />
        </View>

        {data ? (
          <>
            {/* KPIs — numerals count in */}
            <Reveal index={2}>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[5] }}>
                <StatTile label="Check-ins" countTo={data.checkins.count} unit="today" icon="finger-print" tone="info" />
                <StatTile label="New members" countTo={data.newThisMonth} unit="this month" icon="person-add" />
              </View>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
                <StatTile label="Renewals due" countTo={data.renewalsDue.length} unit="in 7 days" icon="alert" tone="warning" />
                <StatTile label="Payments" countTo={data.paymentsToday.total} format={(n) => money(n)} unit="today" icon="cash" tone="success" />
              </View>
            </Reveal>

            {/* secondary actions */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: space[5], flexGrow: 0 }}
              contentContainerStyle={{ gap: space[2] }}
            >
              <Button title="Renew membership" icon="refresh-outline" variant="secondary" size="sm" onPress={() => openRenew()} />
              <Button
                title="Today's attendance"
                icon="list-outline"
                variant="secondary"
                size="sm"
                onPress={() => navigation.navigate('AttendanceList')}
              />
              <Button title="Email members" icon="mail-outline" variant="secondary" size="sm" onPress={() => setEmailModal(true)} />
            </ScrollView>

            {/* renewals due */}
            <Reveal index={3}>
              <SectionTitle hint="active plans lapsing in the next 7 days — catch them at the desk">
                Renewals due
              </SectionTitle>
              <Surface level={1} pad={3}>
                {data.renewalsDue.length === 0 ? (
                  <EmptyState
                    compact
                    icon="shield-checkmark-outline"
                    title="Nothing lapsing this week"
                    body="When a member's plan gets within 7 days of its end date, they'll appear here."
                  />
                ) : (
                  data.renewalsDue.map((r, i) => (
                    <ListItem
                      key={r.traineeId}
                      leading={<Avatar name={r.name} uri={r.avatar} size="md" />}
                      title={r.name}
                      subtitle={`${r.planName} · ends ${shortDate(r.expiresAt)}`}
                      trailing={renewalBadge(r)}
                      onPress={() => openRenew(r.traineeId)}
                      separator={i < data.renewalsDue.length - 1}
                    />
                  ))
                )}
              </Surface>
            </Reveal>

            {/* today's check-ins */}
            <Reveal index={4}>
              <SectionTitle hint="who's walked in today, latest first">Today's check-ins</SectionTitle>
              <Surface level={1} pad={3}>
                {data.checkins.rows.length === 0 ? (
                  <EmptyState
                    compact
                    icon="finger-print-outline"
                    title="No check-ins yet today"
                    body="Put the check-in code on the desk screen and member scans will land here live."
                    actionTitle="Open check-in code"
                    onAction={() => navigation.navigate('QRScanner')}
                  />
                ) : (
                  <>
                    {data.checkins.rows.map((c, i) => (
                      <ListItem
                        key={c.id}
                        leading={<Avatar name={c.name} uri={c.avatar} size="md" />}
                        title={c.name}
                        subtitle="Checked in"
                        value={clockTime(c.at)}
                        separator={i < data.checkins.rows.length - 1}
                      />
                    ))}
                    {data.checkins.count > data.checkins.rows.length ? (
                      <Button
                        title={`View all ${data.checkins.count} check-ins`}
                        variant="ghost"
                        size="sm"
                        iconRight="chevron-forward"
                        onPress={() => navigation.navigate('AttendanceList')}
                        style={{ marginTop: space[2] }}
                      />
                    ) : null}
                  </>
                )}
              </Surface>
            </Reveal>

            {/* member directory */}
            <Reveal index={5}>
              <SectionTitle hint="tap a member to view their profile or mark attendance">Members</SectionTitle>
              <Input
                icon="search-outline"
                placeholder="Search members by name"
                value={search}
                onChangeText={setSearch}
                accessibilityLabel="Search members"
                style={{ marginBottom: space[3] }}
              />
              <Surface level={1} pad={3}>
                {data.members.length === 0 ? (
                  <EmptyState
                    compact
                    icon="people-outline"
                    title="No members yet"
                    body="Register your first member and they'll show up here with their plan status."
                    actionTitle="Register member"
                    onAction={() => setRegisterModal(true)}
                  />
                ) : filteredMembers.length === 0 ? (
                  <EmptyState
                    compact
                    icon="search-outline"
                    title={`No member named “${search.trim()}”`}
                    body="Check the spelling — or register them as a new member."
                    actionTitle="Register member"
                    onAction={() => setRegisterModal(true)}
                  />
                ) : (
                  filteredMembers.map((m, i) => (
                    <ListItem
                      key={m.id}
                      leading={<Avatar name={m.name} uri={m.avatar} size="md" />}
                      title={m.name}
                      subtitle={m.planName || 'No active plan'}
                      trailing={memberStatusBadge(m)}
                      chevron
                      onPress={() =>
                        setSelectedTrainee({ id: m.id, profiles: { full_name: m.name, profile_image: m.avatar } })
                      }
                      separator={i < filteredMembers.length - 1}
                    />
                  ))
                )}
              </Surface>
            </Reveal>
          </>
        ) : null}
      </DashboardScreen>

      {/* existing flows, kept wired (original prop contracts preserved) */}
      <RegisterMemberModal
        visible={registerModal}
        onClose={() => setRegisterModal(false)}
        onRegistered={refresh}
        branchId={branchId}
      />
      <RenewSubscriptionModal
        visible={renewModal}
        onClose={() => setRenewModal(false)}
        traineeId={renewFor}
        branchId={branchId}
        onSuccess={refresh}
      />
      <BroadcastEmailModal
        visible={emailModal}
        onClose={() => setEmailModal(false)}
        onSend={handleBroadcastEmail}
      />
      <TraineeProfileModal
        visible={!!selectedTrainee}
        trainee={selectedTrainee}
        onClose={() => setSelectedTrainee(null)}
        onAttendanceMarked={refresh}
      />
    </>
  );
}
