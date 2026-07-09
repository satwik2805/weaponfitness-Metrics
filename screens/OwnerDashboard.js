import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Badge,
  Button,
  Chip,
  DashboardScreen,
  DashboardSkeleton,
  EmptyState,
  ListItem,
  ProgressBar,
  Reveal,
  SectionTitle,
  StatTile,
  Surface,
  Text,
} from '../components/ui';
import { money, greeting, shortDate, plural } from '../utils/format';
import { ownerDashboardService } from '../services/ownerDashboardService';

import RegisterMemberModal from '../components/RegisterMemberModal';
import RenewSubscriptionModal from '../components/RenewSubscriptionModal';
import AddReceptionistModal from '../components/AddReceptionistModal';
import AddBranchModal from '../components/AddBranchModal';
import ManagePlansModal from '../components/ManagePlansModal';
import TrainerAttendanceModal from '../components/TrainerAttendanceModal';
import { default as CinematicHero } from '../components/ui/CinematicHero';

const HERO = require('../assets/photos/hero-dark.jpg');

/** 7-day check-in bars — baseline rule, neutral bars, accent for today (R-032). */
function AttendanceBars({ series }) {
  const { colors, space, radius } = useTheme();
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[2], height: 108 }}>
        {series.map((s) => (
          <View key={s.key} style={{ flex: 1, alignItems: 'center', gap: space[1], justifyContent: 'flex-end', height: '100%' }}>
            <Text variant="caption" color={s.isToday ? 'accentBright' : 'textFaint'}>{s.count || ''}</Text>
            <View
              style={{
                width: '100%',
                maxWidth: 32,
                height: s.count > 0 ? Math.max(6, (s.count / max) * 76) : 0,
                borderRadius: radius.xs,
                backgroundColor: s.isToday ? colors.accent : colors.surfaceOverlay,
                borderWidth: s.isToday || s.count === 0 ? 0 : 1,
                borderColor: colors.border,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border, marginTop: space[1] }} />
      <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[1] }}>
        {series.map((s) => (
          <Text key={s.key} variant="caption" color={s.isToday ? 'text' : 'textFaint'} align="center" style={{ flex: 1 }}>
            {s.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Revenue by mode — one accent hue at varying weight + share of total (R-032). */
function ModeBar({ label, value, total }) {
  const { colors, space, radius } = useTheme();
  const pct = total > 0 ? value / total : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="bodySm" color="textMuted">{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
          <Text variant="caption" color="textFaint">{Math.round(pct * 100)}%</Text>
          <Text variant="statSm">{money(value)}</Text>
        </View>
      </View>
      <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.surfaceOverlay, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(pct * 100)}%`, height: '100%', borderRadius: radius.full, backgroundColor: colors.accent, opacity: 0.55 + pct * 0.45 }} />
      </View>
    </View>
  );
}

export default function OwnerDashboard() {
  const { colors, space, toggleTheme } = useTheme();

  const [ownerId, setOwnerId] = useState(null);
  const [ownerName, setOwnerName] = useState('');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [memberModal, setMemberModal] = useState(false);
  const [renewModal, setRenewModal] = useState(false);
  const [plansModal, setPlansModal] = useState(false);
  const [receptionistModal, setReceptionistModal] = useState(false);
  const [branchModal, setBranchModal] = useState(false);
  const [trainerAttendanceModal, setTrainerAttendanceModal] = useState(false);

  const branchIds = useMemo(
    () => (selectedBranch === 'ALL' ? branches.map((b) => b.id) : [selectedBranch]),
    [selectedBranch, branches]
  );
  // Modals need ONE concrete branch — the literal "ALL" never matches a UUID.
  const activeBranchId = selectedBranch === 'ALL' ? branches[0]?.id : selectedBranch;

  const bootstrap = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return null;
    setOwnerId(uid);
    const [{ data: me }, branchList] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', uid).single(),
      ownerDashboardService.getBranches(uid),
    ]);
    setOwnerName(me?.full_name?.split(' ')[0] || 'Owner');
    setBranches(branchList);
    return { uid, branchList };
  }, []);

  const load = useCallback(async (uid, ids, { silent = false } = {}) => {
    if (!ids.length) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const result = await ownerDashboardService.loadOwnerDashboard(uid, ids);
      setData(result);
      setError(null);
    } catch (err) {
      if (!silent) setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const boot = await bootstrap();
        if (!boot) return;
        await load(boot.uid, boot.branchList.map((b) => b.id));
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    })();
  }, [bootstrap, load]);

  useEffect(() => {
    if (ownerId && branches.length) {
      setLoading(true);
      load(ownerId, branchIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const refresh = useCallback(() => {
    if (ownerId) load(ownerId, branchIds, { silent: true });
  }, [ownerId, branchIds, load]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    load(ownerId, branchIds);
  }, [ownerId, branchIds, load]);

  const revenueDelta = useMemo(() => {
    if (!data?.revenue?.lastMonth) return undefined;
    return Math.round(((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth) * 100);
  }, [data]);

  const refreshAfterChange = () => {
    if (ownerId) load(ownerId, branchIds, { silent: true });
  };

  const quickActions = useMemo(
    () => [
      { icon: 'person-add-outline', label: 'Add member', onPress: () => setMemberModal(true) },
      { icon: 'refresh-outline', label: 'Renew', onPress: () => setRenewModal(true) },
      { icon: 'pricetags-outline', label: 'Plans', onPress: () => setPlansModal(true) },
      { icon: 'id-card-outline', label: 'Front desk', onPress: () => setReceptionistModal(true) },
      { icon: 'calendar-outline', label: 'Trainer log', onPress: () => setTrainerAttendanceModal(true) },
    ],
    []
  );

  const hero = (scrollY) => (
    <CinematicHero
      source={HERO}
      scrollY={scrollY}
      eyebrow={greeting().toUpperCase()}
      title={ownerName || ' '}
      metric={{ value: data?.membership?.activeMembers || 0, label: 'active members' }}
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
        isEmpty={!loading && !branches.length}
        onRetry={retry}
        refreshing={false}
        onRefresh={refresh}
        errorTitle="Couldn't load your dashboard"
        skeleton={<DashboardSkeleton tiles={4} rows={3} />}
        emptyState={
          <EmptyState
            icon="business-outline"
            title="No branches yet"
            body="Create your first branch to start managing members, staff and revenue."
            actionTitle="Add a branch"
            onAction={() => setBranchModal(true)}
            style={{ marginTop: space[8] }}
          />
        }
      >
        {/* branch selector */}
        {branches.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: space[4], flexGrow: 0 }}
            contentContainerStyle={{ gap: space[2], alignItems: 'center' }}
          >
            <Chip label="All branches" selected={selectedBranch === 'ALL'} onPress={() => setSelectedBranch('ALL')} />
            {branches.map((b) => (
              <Chip key={b.id} label={b.branch_name} selected={selectedBranch === b.id} onPress={() => setSelectedBranch(b.id)} />
            ))}
            <Chip label="Add branch" icon="add" onPress={() => setBranchModal(true)} />
          </ScrollView>
        )}

        {data ? (
          <>
            {/* KPI grid */}
            <Reveal index={2}>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[5] }}>
                <StatTile label="Active members" countTo={data.membership.activeMembers} icon="people" />
                <StatTile label="Check-ins" countTo={data.checkinsToday} unit="today" icon="finger-print" tone="info" />
              </View>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
                <StatTile
                  label="Revenue"
                  countTo={data.revenue.thisMonth}
                  format={(n) => money(n)}
                  delta={revenueDelta}
                  deltaLabel="vs last month"
                  icon="trending-up"
                  tone="success"
                />
                <StatTile label="Expiring" countTo={data.membership.expiringSoon} unit="in 7 days" icon="alert" tone="warning" />
              </View>
            </Reveal>

            {/* quick actions */}
            <Reveal index={3}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: space[5], flexGrow: 0 }}
                contentContainerStyle={{ gap: space[2], paddingRight: space[5] }}
              >
                {quickActions.map((a) => (
                  <Button key={a.label} title={a.label} icon={a.icon} variant="secondary" size="sm" onPress={a.onPress} />
                ))}
              </ScrollView>
            </Reveal>

            {/* attendance */}
            <SectionTitle hint="check-ins across the last 7 days">This week</SectionTitle>
            <Surface level={1} pad={5}>
              {data.attendance.every((d) => d.count === 0) ? (
                <EmptyState compact icon="finger-print-outline" title="No check-ins yet this week" body="Front-desk scans and member QR check-ins land here live." />
              ) : (
                <AttendanceBars series={data.attendance} />
              )}
            </Surface>

            {/* revenue */}
            <SectionTitle hint={`lifetime collected: ${money(data.revenue.total)}`}>Revenue</SectionTitle>
            <Surface level={1} pad={5} style={{ gap: space[4] }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Text variant="labelSm" color="textMuted">This month</Text>
                  <Text variant="statLg" style={{ marginTop: 4 }}>{money(data.revenue.thisMonth)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="labelSm" color="textMuted">Last month</Text>
                  <Text variant="stat" color="textMuted" style={{ marginTop: 4 }}>{money(data.revenue.lastMonth)}</Text>
                </View>
              </View>
              <View style={{ gap: space[3] }}>
                <ModeBar label="UPI" value={data.revenue.byMode.UPI} total={data.revenue.thisMonth} />
                <ModeBar label="Cash" value={data.revenue.byMode.Cash} total={data.revenue.thisMonth} />
                <ModeBar label="Card" value={data.revenue.byMode.Card} total={data.revenue.thisMonth} />
              </View>
            </Surface>

            {/* retention radar */}
            <SectionTitle hint="members slipping away — reach out before they lapse">Retention radar</SectionTitle>
            <Surface level={1} pad={3}>
              {data.atRisk.length === 0 ? (
                <EmptyState compact icon="shield-checkmark-outline" title="Nobody's slipping" body="Every active member has trained recently and no plans lapse this week." />
              ) : (
                data.atRisk.map((m, i) => {
                  // lead with the signal that actually triggered the flag (R-034)
                  const away = m.daysAway === null ? 'No visit in the last month' : m.daysAway >= 10 ? `No visit in ${plural(m.daysAway, 'day')}` : null;
                  const expiring = m.expiresAt ? `Plan ends ${shortDate(m.expiresAt)}` : null;
                  const subtitle = away || expiring || 'At risk';
                  return (
                    <ListItem
                      key={m.traineeId}
                      leading={<Avatar name={m.name} size="md" />}
                      title={m.name}
                      subtitle={subtitle}
                      trailing={
                        m.expiresAt ? (
                          <Badge tone="warning" icon="time">{shortDate(m.expiresAt)}</Badge>
                        ) : (
                          <Badge tone="danger" icon="trending-down">{`${m.daysAway}d away`}</Badge>
                        )
                      }
                      separator={i < data.atRisk.length - 1}
                    />
                  );
                })
              )}
            </Surface>

            {/* team */}
            <SectionTitle>Team</SectionTitle>
            <Surface level={1} pad={3}>
              {data.trainers.length === 0 ? (
                <EmptyState compact icon="people-outline" title="No trainers yet" body="Add trainers and they'll show up here with ratings and member load." />
              ) : (
                data.trainers.map((t, i) => (
                  <ListItem
                    key={t.id}
                    leading={<Avatar name={t.name} uri={t.avatar} size="md" />}
                    title={t.name}
                    subtitle={`${plural(t.members, 'member')} · ${t.experienceYears || 0} yrs experience`}
                    trailing={
                      t.rating ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="star" size={13} color={colors.warning} />
                          <Text variant="statSm">{t.rating.toFixed(1)}</Text>
                        </View>
                      ) : null
                    }
                    separator={i < data.trainers.length - 1}
                  />
                ))
              )}
            </Surface>

            {/* recent payments */}
            <SectionTitle>Recent payments</SectionTitle>
            <Surface level={1} pad={3}>
              {data.recentPayments.length === 0 ? (
                <EmptyState compact icon="card-outline" title="No payments recorded" body="Member payments from the front desk show up here the moment they're logged." />
              ) : (
                data.recentPayments.map((p, i) => (
                  <ListItem
                    key={p.id}
                    icon={p.payment_mode === 'UPI' ? 'phone-portrait-outline' : p.payment_mode === 'Card' ? 'card-outline' : 'cash-outline'}
                    iconTone={p.payment_mode === 'UPI' ? 'info' : p.payment_mode === 'Card' ? 'accent' : 'success'}
                    title={p.name}
                    subtitle={`${p.payment_mode} · ${shortDate(p.created_at)}`}
                    value={money(p.amount)}
                    separator={i < data.recentPayments.length - 1}
                  />
                ))
              )}
            </Surface>
          </>
        ) : null}
      </DashboardScreen>

      {/* existing flows, kept wired (original prop contracts preserved) */}
      <RegisterMemberModal visible={memberModal} onClose={() => setMemberModal(false)} onRegistered={refreshAfterChange} branchId={activeBranchId} />
      <RenewSubscriptionModal visible={renewModal} onClose={() => setRenewModal(false)} onSuccess={refreshAfterChange} branchId={activeBranchId} />
      <AddReceptionistModal visible={receptionistModal} onClose={() => setReceptionistModal(false)} onAdded={refreshAfterChange} branchId={activeBranchId} />
      <AddBranchModal
        visible={branchModal}
        onClose={() => setBranchModal(false)}
        onAdded={() => {
          setBranchModal(false);
          bootstrap().then((boot) => boot && load(boot.uid, boot.branchList.map((b) => b.id)));
        }}
      />
      <ManagePlansModal visible={plansModal} onClose={() => setPlansModal(false)} branchId={activeBranchId} />
      <TrainerAttendanceModal visible={trainerAttendanceModal} onClose={() => setTrainerAttendanceModal(false)} />
    </>
  );
}
