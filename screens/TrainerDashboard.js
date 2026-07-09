import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { supabase } from '../config/supabase';
import { useTheme } from '../context/ThemeContext';
import {
  Avatar,
  Badge,
  Button,
  CinematicHero,
  DashboardScreen,
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  IconButton,
  ListItem,
  Reveal,
  SectionTitle,
  StatTile,
  Surface,
} from '../components/ui';
import { greeting } from '../utils/format';
import { trainerDashboardService } from '../services/trainerDashboardService';
import { weekdayName, formatTime } from '../services/classService';

import CreateGroupModal from '../components/CreateGroupModal';
import ManageWorkoutsModal from '../components/ManageWorkoutsModal';
import AddTraineeModal from '../components/AddTraineeModal';
import GroupDetailModal from '../components/GroupDetailModal';
import TraineeProgressModal from '../components/TraineeProgressModal';
import CreateDietPlanModal from '../components/CreateDietPlanModal';
import WeeklyDietAssignmentModal from '../components/WeeklyDietAssignmentModal';
import PersonalAssignmentModal from '../components/PersonalAssignmentModal';
import WeeklyPlanModal from '../components/WeeklyPlanModal';
import RenewSubscriptionModal from '../components/RenewSubscriptionModal';

const HERO = require('../assets/photos/training.jpg');

const xpFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** "Checked in today" / "Last seen 3 days ago" / "No visits this month". */
const lastSeenCopy = (m) => {
  if (m.checkedInToday) return 'Checked in today';
  if (!m.lastSeen) return 'No visits this month';
  const days = Math.max(
    1,
    Math.round((new Date(new Date().toISOString().split('T')[0]) - new Date(m.lastSeen)) / 86400000)
  );
  return days === 1 ? 'Last seen yesterday' : `Last seen ${days} days ago`;
};

export default function TrainerDashboard() {
  const { space, toggleTheme } = useTheme();

  const [trainerId, setTrainerId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // existing flows, kept wired (original prop contracts preserved)
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [manageWorkoutsModal, setManageWorkoutsModal] = useState(false);
  const [dietCreateModal, setDietCreateModal] = useState(false);

  const [groupDetailVisible, setGroupDetailVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [progressVisible, setProgressVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [personalAssignVisible, setPersonalAssignVisible] = useState(false);
  const [activeMember, setActiveMember] = useState(null);

  const [personalWorkoutVisible, setPersonalWorkoutVisible] = useState(false);
  const [personalWorkoutTraineeId, setPersonalWorkoutTraineeId] = useState(null);
  const [personalDietVisible, setPersonalDietVisible] = useState(false);
  const [personalDietTraineeId, setPersonalDietTraineeId] = useState(null);

  const [renewVisible, setRenewVisible] = useState(false);
  const [renewTraineeId, setRenewTraineeId] = useState(null);

  const load = useCallback(async (uid, { silent = false } = {}) => {
    try {
      const result = await trainerDashboardService.loadTrainerDashboard(uid);
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
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) {
          setLoading(false);
          return;
        }
        setTrainerId(uid);
        await load(uid);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    })();
  }, [load]);

  const refresh = useCallback(() => {
    if (trainerId) load(trainerId, { silent: true });
  }, [trainerId, load]);

  const retry = useCallback(() => {
    if (!trainerId) return;
    setLoading(true);
    setError(null);
    load(trainerId);
  }, [trainerId, load]);

  const openProgress = (m) => {
    setSelectedMember(m);
    setProgressVisible(true);
  };

  const openAssign = (m) => {
    setActiveMember(m);
    setPersonalAssignVisible(true);
  };

  const openRenew = (m) => {
    setRenewTraineeId(m.id);
    setRenewVisible(true);
  };

  // Same gate as the old screen: owner allows it, no active plan, and the
  // member has had a (now lapsed) plan before.
  const canRenew = (m) =>
    Boolean(data?.me?.allowTrainerRenewal && !m.membership.hasActive && m.membership.lastExpiry);

  const quickActions = [
    { icon: 'person-add-outline', label: 'Add member', onPress: () => setAddMemberModal(true) },
    { icon: 'people-outline', label: 'New group', onPress: () => setGroupModal(true) },
    { icon: 'barbell-outline', label: 'Workouts', onPress: () => setManageWorkoutsModal(true) },
    { icon: 'restaurant-outline', label: 'Diet plan', onPress: () => setDietCreateModal(true) },
  ];

  const hero = (scrollY) => (
    <CinematicHero
      source={HERO}
      scrollY={scrollY}
      eyebrow={greeting().toUpperCase()}
      title={data?.me?.firstName || ' '}
      metric={{ value: data?.members?.length || 0, label: 'members you train' }}
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
        isEmpty={!loading && !data}
        onRetry={retry}
        refreshing={false}
        onRefresh={refresh}
        errorTitle="Couldn't load your dashboard"
        skeleton={<DashboardSkeleton tiles={4} rows={3} />}
        emptyState={
          <EmptyState
            icon="people-outline"
            title="No members assigned yet"
            body="Members you train appear here with their level and last check-in."
            actionTitle="Add a member"
            onAction={() => setAddMemberModal(true)}
            style={{ marginTop: space[8] }}
          />
        }
      >
        {data ? (
          <>
            {/* KPI grid — numerals count in */}
            <Reveal index={2}>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[5] }}>
                <StatTile label="My members" countTo={data.members.length} icon="people" />
                <StatTile
                  label="Checked in"
                  countTo={data.checkedInToday}
                  unit="today"
                  icon="finger-print"
                  tone="info"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: space[3], marginTop: space[3] }}>
                <StatTile
                  label="Weekly classes"
                  countTo={data.classes.length}
                  icon="calendar"
                  tone="success"
                />
                <StatTile label="My groups" countTo={data.groups.length} icon="grid" tone="warning" />
              </View>
            </Reveal>

            {/* quick actions */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: space[5], flexGrow: 0 }}
              contentContainerStyle={{ gap: space[2] }}
            >
              {quickActions.map((a) => (
                <Button key={a.label} title={a.label} icon={a.icon} variant="secondary" size="sm" onPress={a.onPress} />
              ))}
            </ScrollView>

            {/* my classes */}
            <Reveal index={3}>
            <SectionTitle hint="the weekly group classes you teach">My classes</SectionTitle>
            <Surface level={1} pad={3}>
              {data.classesError ? (
                <ErrorState
                  compact
                  title="Couldn't reach the class schedule"
                  detail="The rest of your dashboard is live — only the classes service didn't answer."
                  onRetry={refresh}
                />
              ) : data.classes.length === 0 ? (
                <EmptyState
                  compact
                  icon="calendar-outline"
                  title="Nothing on your teaching schedule"
                  body="When the front desk puts you on a class — or you schedule one — it shows up here with live bookings."
                />
              ) : (
                data.classes.map((c, i) => (
                  <ListItem
                    key={c.id}
                    icon="barbell-outline"
                    iconTone="accent"
                    title={c.title}
                    subtitle={`${weekdayName(c.weekday)} · ${formatTime(c.start_time)} · ${c.duration_minutes} min`}
                    trailing={
                      c.spots_left === 0 ? (
                        <Badge tone="warning" icon="flame">Full</Badge>
                      ) : (
                        <Badge tone="success" icon="people">{`${c.booked}/${c.capacity}`}</Badge>
                      )
                    }
                    separator={i < data.classes.length - 1}
                  />
                ))
              )}
            </Surface>
            </Reveal>

            {/* my members */}
            <Reveal index={4}>
            <SectionTitle hint="most recently active first — tap a member for their progress">
              My members
            </SectionTitle>
            <Surface level={1} pad={3}>
              {data.members.length === 0 ? (
                <EmptyState
                  compact
                  icon="people-outline"
                  title="No members assigned yet"
                  body="Members you train appear here with their level and last check-in."
                  actionTitle="Add a member"
                  onAction={() => setAddMemberModal(true)}
                />
              ) : (
                data.members.map((m, i) => (
                  <ListItem
                    key={m.id}
                    leading={<Avatar name={m.name} uri={m.avatar} size="md" />}
                    title={m.name}
                    subtitle={`${lastSeenCopy(m)} · ${xpFormat.format(m.xp)} XP`}
                    onPress={() => openProgress(m)}
                    trailing={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                        <Badge tone={m.checkedInToday ? 'success' : 'neutral'}>{`Lv ${m.level}`}</Badge>
                        {canRenew(m) ? (
                          <IconButton
                            icon="refresh-circle-outline"
                            variant="soft"
                            size={36}
                            iconSize={18}
                            color="warning"
                            accessibilityLabel={`Renew membership for ${m.name}`}
                            onPress={() => openRenew(m)}
                          />
                        ) : null}
                        <IconButton
                          icon="clipboard-outline"
                          variant="ghost"
                          size={36}
                          iconSize={17}
                          color="textMuted"
                          accessibilityLabel={`Assign a personal plan to ${m.name}`}
                          onPress={() => openAssign(m)}
                        />
                      </View>
                    }
                    separator={i < data.members.length - 1}
                  />
                ))
              )}
            </Surface>
            </Reveal>

            {/* my groups */}
            <Reveal index={5}>
            <SectionTitle hint="tap a group to manage members and weekly plans">My groups</SectionTitle>
            <Surface level={1} pad={3}>
              {data.groups.length === 0 ? (
                <EmptyState
                  compact
                  icon="people-circle-outline"
                  title="No groups yet"
                  body="Group your members to assign one weekly workout or diet to everyone at once."
                  actionTitle="Create a group"
                  onAction={() => setGroupModal(true)}
                />
              ) : (
                data.groups.map((g, i) => (
                  <ListItem
                    key={g.id}
                    icon="people-outline"
                    iconTone="info"
                    title={g.name}
                    subtitle={`${g.members} member${g.members === 1 ? '' : 's'}`}
                    chevron
                    onPress={() => {
                      setSelectedGroup(g);
                      setGroupDetailVisible(true);
                    }}
                    separator={i < data.groups.length - 1}
                  />
                ))
              )}
            </Surface>
            </Reveal>
          </>
        ) : null}
      </DashboardScreen>

      {/* existing flows, kept wired (original prop contracts preserved) */}
      <AddTraineeModal
        visible={addMemberModal}
        onClose={() => setAddMemberModal(false)}
        onCreated={refresh}
        defaultTrainerId={trainerId}
      />
      <CreateGroupModal
        visible={groupModal}
        onClose={() => setGroupModal(false)}
        trainerId={trainerId}
        onCreated={refresh}
      />
      <ManageWorkoutsModal visible={manageWorkoutsModal} onClose={() => setManageWorkoutsModal(false)} />
      <CreateDietPlanModal
        visible={dietCreateModal}
        onClose={() => setDietCreateModal(false)}
        trainerId={trainerId}
      />
      <GroupDetailModal
        visible={groupDetailVisible}
        onClose={(shouldRefresh) => {
          setGroupDetailVisible(false);
          if (shouldRefresh === true) refresh();
        }}
        group={selectedGroup}
      />
      <TraineeProgressModal
        visible={progressVisible}
        onClose={() => setProgressVisible(false)}
        trainee={selectedMember}
      />
      <PersonalAssignmentModal
        visible={personalAssignVisible}
        onClose={() => setPersonalAssignVisible(false)}
        trainee={activeMember}
        onAssignWorkout={() => {
          setPersonalWorkoutTraineeId(activeMember?.id || null);
          setPersonalWorkoutVisible(true);
          setPersonalAssignVisible(false);
        }}
        onAssignDiet={() => {
          setPersonalDietTraineeId(activeMember?.id || null);
          setPersonalDietVisible(true);
          setPersonalAssignVisible(false);
        }}
      />
      <WeeklyPlanModal
        visible={personalWorkoutVisible}
        onClose={() => setPersonalWorkoutVisible(false)}
        mode="personal"
        traineeId={personalWorkoutTraineeId}
        trainerId={trainerId}
      />
      <WeeklyDietAssignmentModal
        visible={personalDietVisible}
        onClose={() => setPersonalDietVisible(false)}
        mode="personal"
        traineeId={personalDietTraineeId}
      />
      <RenewSubscriptionModal
        visible={renewVisible}
        onClose={() => setRenewVisible(false)}
        traineeId={renewTraineeId}
        branchId={data?.me?.branchId}
        onSuccess={refresh}
      />
    </>
  );
}
