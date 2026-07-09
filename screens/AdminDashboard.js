import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
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
  Sheet,
  StatTile,
  Surface,
  Text,
  useConfirm,
  useToast,
} from '../components/ui';
import { money, greeting, shortDate } from '../utils/format';
import { adminDashboardService } from '../services/adminDashboardService';
import AddBranchModal from '../components/AddBranchModal';

const HERO = require('../assets/photos/athlete-rope.jpg');

export default function AdminDashboard() {
  const { space, toggleTheme } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [me, setMe] = useState(null);
  const [branch, setBranch] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // members search-lite
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null → show latest 10

  // existing flows, kept wired
  const [branchModal, setBranchModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // detail sheet

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      const profile = await adminDashboardService.getMe();
      setMe(profile);
      if (!profile.branch_id) {
        setBranch(null);
        setData(null);
        setError(null);
        return;
      }
      const [branchRow, dash] = await Promise.all([
        adminDashboardService.getBranch(profile.branch_id),
        adminDashboardService.loadAdminDashboard(profile.branch_id),
      ]);
      setBranch(branchRow);
      setData(dash);
      setError(null);
    } catch (err) {
      if (!silent) setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load({ silent: true }), [load]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    load();
  }, [load]);

  // debounced branch-wide name search; empty query falls back to latest 10
  useEffect(() => {
    if (!me?.branch_id) return undefined;
    const q = search.trim();
    if (!q) {
      setSearchResults(null);
      return undefined;
    }
    const t = setTimeout(async () => {
      try {
        const rows = await adminDashboardService.getMembers(me.branch_id, q);
        setSearchResults(rows);
      } catch {
        setSearchResults(null);
        toast.show("Search isn't responding right now — showing the newest members instead.", { kind: 'warning' });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, me?.branch_id, toast]);

  const members = searchResults ?? data?.members ?? [];
  const firstName = me?.full_name?.split(' ')[0] || ' ';

  // The old delete flow (audit WF-019) ran through Alert.alert — a silent
  // no-op on web. Rebuilt on useConfirm + honest toasts.
  const handleDelete = useCallback(async (user) => {
    if (!user) return;
    setSelectedUser(null); // dismiss the detail sheet so the dialog can present
    const ok = await confirm({
      title: `Remove ${user.name}?`,
      message: 'Their profile and sign-in access are removed for good. This cannot be undone.',
      confirmTitle: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await adminDashboardService.deleteUser(user.id);
      toast.show(`${user.name} has been removed.`, { kind: 'success' });
      refresh();
    } catch (err) {
      toast.show(err.message, { kind: err.code === 'restricted' ? 'warning' : 'error' });
    }
  }, [confirm, toast, refresh]);

  const hero = (scrollY) => (
    <CinematicHero
      source={HERO}
      scrollY={scrollY}
      eyebrow={greeting().toUpperCase()}
      title={firstName}
      metric={{ value: data?.counts?.members || 0, label: 'members in this branch' }}
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
        isEmpty={!loading && !error && !me?.branch_id}
        onRetry={retry}
        refreshing={false}
        onRefresh={refresh}
        errorTitle="Couldn't load your console"
        skeleton={<DashboardSkeleton tiles={4} rows={3} />}
        emptyState={
          <EmptyState
            icon="business-outline"
            title="No branch assigned yet"
            body="Everything on this console is scoped to one branch. Ask an owner to assign you, then check back."
            actionTitle="Check again"
            onAction={retry}
            style={{ marginTop: space[8] }}
          />
        }
      >
        {data ? (
          <>
            {/* branch identity — R-035: branch name keeps full width; the
                renewals state moves to the subtitle so a long name is never
                squeezed (or truncated) by the trailing badge. */}
            <Reveal index={2}>
              <Surface level={1} pad={3} style={{ marginTop: space[5] }}>
                <ListItem
                  icon="business"
                  title={branch?.branch_name || 'Your branch'}
                  subtitle="Everything below is scoped to this branch"
                  trailing={
                    <Badge tone={branch?.allow_trainer_renewal ? 'success' : 'neutral'} icon="repeat">
                      {branch?.allow_trainer_renewal ? 'Trainer' : 'Desk only'}
                    </Badge>
                  }
                />
              </Surface>
            </Reveal>

            {/* KPI grid — numerals count in */}
            <Reveal index={3}>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
                <StatTile label="Members" countTo={data.counts.members} icon="people" />
                <StatTile label="Trainers" countTo={data.counts.trainers} icon="barbell" tone="info" />
              </View>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
                <StatTile label="Check-ins" countTo={data.checkinsToday} unit="today" icon="finger-print" tone="success" />
                <StatTile label="Expiring" countTo={data.expiringSoon} unit="in 7 days" icon="alert" tone="warning" />
              </View>

              {/* quick actions */}
              <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[5] }}>
                <Button title="Add branch" icon="add" variant="secondary" size="sm" onPress={() => setBranchModal(true)} />
              </View>
            </Reveal>

            {/* staff */}
            <Reveal index={4}>
              <SectionTitle hint="trainers and front desk in this branch">Staff</SectionTitle>
              <Surface level={1} pad={3}>
                {data.staff.length === 0 ? (
                  <EmptyState
                    compact
                    icon="people-outline"
                    title="No staff here yet"
                    body="Trainers and receptionists assigned to this branch will show up here."
                    actionTitle="Refresh"
                    onAction={refresh}
                  />
                ) : (
                  data.staff.map((s, i) => (
                    <ListItem
                      key={s.id}
                      leading={<Avatar name={s.name} uri={s.avatar} size="md" />}
                      title={s.name}
                      subtitle={s.phone || 'No phone on file'}
                      trailing={
                        <Badge tone={s.role === 'Trainer' ? 'accent' : 'info'} icon={s.role === 'Trainer' ? 'barbell' : 'id-card'}>
                          {s.role}
                        </Badge>
                      }
                      onPress={() => setSelectedUser(s)}
                      separator={i < data.staff.length - 1}
                    />
                  ))
                )}
              </Surface>
            </Reveal>

            {/* members */}
            <Reveal index={5}>
              <SectionTitle hint="newest first — type a name to search the whole branch">Members</SectionTitle>
              <Input
                icon="search-outline"
                placeholder="Search members by name"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                style={{ marginBottom: space[3] }}
              />
              <Surface level={1} pad={3}>
                {members.length === 0 ? (
                  search.trim() ? (
                    <EmptyState
                      compact
                      icon="search-outline"
                      title={`No members match “${search.trim()}”`}
                      body="Check the spelling, or try just a first name."
                      actionTitle="Clear search"
                      onAction={() => setSearch('')}
                    />
                  ) : (
                    <EmptyState
                      compact
                      icon="person-add-outline"
                      title="No members yet"
                      body="Members registered to this branch land here, newest first."
                      actionTitle="Refresh"
                      onAction={refresh}
                    />
                  )
                ) : (
                  members.map((m, i) => (
                    <ListItem
                      key={m.id}
                      leading={<Avatar name={m.name} uri={m.avatar} size="md" />}
                      title={m.name}
                      subtitle={m.joinedAt ? `Joined ${shortDate(m.joinedAt)}` : m.phone || 'Member'}
                      trailing={
                        m.level != null ? (
                          <Badge tone="accent" icon="flash">{`Lv ${m.level}`}</Badge>
                        ) : null
                      }
                      onPress={() => setSelectedUser(m)}
                      separator={i < members.length - 1}
                    />
                  ))
                )}
              </Surface>
            </Reveal>

            {/* recent payments */}
            <Reveal index={6}>
              <SectionTitle hint="latest payments from members of this branch">Payments</SectionTitle>
              <Surface level={1} pad={3}>
                {data.recentPayments.length === 0 ? (
                  <EmptyState
                    compact
                    icon="card-outline"
                    title="No payments recorded"
                    body="Payments logged for this branch's members show up here right away."
                    actionTitle="Refresh"
                    onAction={refresh}
                  />
                ) : (
                  data.recentPayments.map((p, i) => (
                    <ListItem
                      key={p.id}
                      icon={p.payment_mode === 'UPI' ? 'phone-portrait-outline' : p.payment_mode === 'Card' ? 'card-outline' : 'cash-outline'}
                      iconTone={p.payment_mode === 'UPI' ? 'info' : p.payment_mode === 'Card' ? 'accent' : 'success'}
                      title={p.name}
                      subtitle={`${p.payment_mode} · ${shortDate(p.created_at)}`}
                      value={money(p.amount)}
                      trailing={
                        p.payment_status !== 'Completed' ? (
                          <Badge tone={p.payment_status === 'Pending' ? 'warning' : 'danger'}>
                            {p.payment_status}
                          </Badge>
                        ) : null
                      }
                      separator={i < data.recentPayments.length - 1}
                    />
                  ))
                )}
              </Surface>
            </Reveal>
          </>
        ) : null}
      </DashboardScreen>

      {/* user detail — the old raw Modal, rebuilt on Sheet */}
      <Sheet
        visible={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser?.name}
        subtitle={selectedUser?.role === 'Trainee' ? 'Member' : selectedUser?.role}
        footer={
          <>
            <Button title="Close" variant="ghost" onPress={() => setSelectedUser(null)} style={{ flex: 1 }} />
            <Button
              title="Delete user"
              variant="danger"
              icon="trash-outline"
              onPress={() => handleDelete(selectedUser)}
              style={{ flex: 2 }}
            />
          </>
        }
      >
        {selectedUser ? (
          <View style={{ alignItems: 'center', paddingVertical: space[4], gap: space[4] }}>
            <Avatar name={selectedUser.name} uri={selectedUser.avatar} size="xl" />
            <View style={{ flexDirection: 'row', gap: space[2], flexWrap: 'wrap', justifyContent: 'center' }}>
              <Badge tone={selectedUser.role === 'Trainee' ? 'neutral' : selectedUser.role === 'Trainer' ? 'accent' : 'info'}>
                {selectedUser.role === 'Trainee' ? 'Member' : selectedUser.role}
              </Badge>
              {selectedUser.level != null ? <Badge tone="accent" icon="flash">{`Lv ${selectedUser.level}`}</Badge> : null}
            </View>
            <View style={{ alignSelf: 'stretch' }}>
              <ListItem
                icon="call-outline"
                iconTone="info"
                title={selectedUser.phone || 'No phone on file'}
                subtitle="Phone"
                separator
              />
              {selectedUser.joinedAt ? (
                <ListItem
                  icon="calendar-outline"
                  iconTone="success"
                  title={new Date(selectedUser.joinedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  subtitle="Member since"
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>

      {/* existing flow, kept wired */}
      <AddBranchModal
        visible={branchModal}
        onClose={() => setBranchModal(false)}
        onAdded={() => {
          setBranchModal(false);
          refresh();
        }}
      />
    </>
  );
}
