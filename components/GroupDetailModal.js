import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import {
  Sheet,
  Button,
  Text,
  Avatar,
  ListItem,
  EmptyState,
  SkeletonRow,
  useToast,
  useConfirm,
} from "./ui";

import WeeklyPlanModal from "./WeeklyPlanModal";
import MonthlyPlanModal from "./MonthlyPlanModal";
import CreateDietPlanModal from "./CreateDietPlanModal";
import WeeklyDietAssignmentModal from "./WeeklyDietAssignmentModal";

export default function GroupDetailModal({ visible, onClose, group }) {
  const { colors, space } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [weeklyVisible, setWeeklyVisible] = useState(false);
  const [monthlyVisible, setMonthlyVisible] = useState(false);

  const [weeklyDietVisible, setWeeklyDietVisible] = useState(false);
  const [dietCreateVisible, setDietCreateVisible] = useState(false);

  const [trainerId, setTrainerId] = useState(null);
  const [personalDietVisible, setPersonalDietVisible] = useState(false);
  const [activeTraineeId, setActiveTraineeId] = useState(null);

  useEffect(() => {
    if (visible && group?.id) {
      fetchGroupDetails();
    }
  }, [visible, group?.id]);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setTrainerId(session?.user?.id || null);
    })();
  }, [visible]);

  const handleDeleteGroup = async () => {
    const ok = await confirm({
      title: "Delete group?",
      message: "This permanently removes the group. This action cannot be undone.",
      confirmTitle: "Delete",
      destructive: true,
    });
    if (!ok) return;

    try {
      setLoading(true);

      // Delete group members first, then the group itself
      await supabase
        .from("trainee_group_members")
        .delete()
        .eq("group_id", group.id);

      const { error: delErr } = await supabase
        .from("trainee_groups")
        .delete()
        .eq("id", group.id);

      if (delErr) {
        toast.show(delErr.message || "Failed to delete group.", { kind: "error" });
        setLoading(false);
        return;
      }

      toast.show("Group deleted.", { kind: "success" });
      onClose(true); // Signal deletion if parent supports it
    } catch (err) {
      toast.show("Something went wrong deleting the group. Please try again.", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);

      const { data: gm, error: gmErr } = await supabase
        .from("trainee_group_members")
        .select("trainee_id")
        .eq("group_id", group.id);

      if (gmErr) return;

      const traineeIds = (gm || []).map((g) => g.trainee_id);

      if (!traineeIds.length) {
        setMembers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image")
        .in("id", traineeIds);

      const today = new Date().toISOString().split("T")[0];

      const { data: att } = await supabase
        .from("attendance")
        .select("trainee_id")
        .in("trainee_id", traineeIds)
        .eq("date", today);

      const presentSet = new Set((att || []).map((a) => a.trainee_id));
      const profMap = {};
      profiles?.forEach((p) => (profMap[p.id] = p));

      const merged = traineeIds.map((id) => ({
        id,
        name: profMap[id]?.full_name || "Unknown Trainee",
        avatar: profMap[id]?.profile_image,
        attendedToday: presentSet.has(id),
      }));

      setMembers(merged);
    } catch (e) {
      if (__DEV__) console.error("GroupDetailModal load error:", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !group) return null;

  const memberCount = loading
    ? "Loading members..."
    : `${members.length} member${members.length === 1 ? "" : "s"}`;

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={group.name}
        subtitle={memberCount}
        footer={
          <Button
            title="Delete group"
            variant="danger"
            icon="trash-outline"
            loading={loading}
            onPress={handleDeleteGroup}
            fullWidth
          />
        }
      >
        <View style={{ gap: space[5] }}>
          {/* Members */}
          <View>
            {loading ? (
              <View style={{ gap: space[2] }}>
                <SkeletonRow />
                <SkeletonRow />
              </View>
            ) : members.length === 0 ? (
              <EmptyState
                compact
                icon="people-outline"
                title="No members yet"
                body="This group doesn't have any trainees assigned."
              />
            ) : (
              members.map((m) => (
                <ListItem
                  key={m.id}
                  leading={<Avatar name={m.name} uri={m.avatar} />}
                  title={m.name}
                  subtitle={m.attendedToday ? "Present today" : "Not marked today"}
                  trailing={
                    <Ionicons
                      name={m.attendedToday ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={m.attendedToday ? colors.success : colors.textFaint}
                    />
                  }
                />
              ))
            )}
          </View>

          {/* Plan actions */}
          <View style={{ gap: space[3] }}>
            <Text variant="label" color="textMuted">Plans</Text>
            <Button
              title="Weekly workouts"
              variant="secondary"
              icon="calendar-outline"
              onPress={() => setWeeklyVisible(true)}
              fullWidth
            />
            <Button
              title="Monthly workouts"
              variant="secondary"
              icon="calendar-outline"
              onPress={() => setMonthlyVisible(true)}
              fullWidth
            />
            <Button
              title="Set diet plans"
              variant="secondary"
              icon="cafe-outline"
              onPress={() => setWeeklyDietVisible(true)}
              fullWidth
            />
          </View>
        </View>
      </Sheet>

      {/* Nested plan modals */}
      <WeeklyPlanModal
        visible={weeklyVisible}
        onClose={() => setWeeklyVisible(false)}
        mode='group'
        groupId={group.id}
      />

      <MonthlyPlanModal
        visible={monthlyVisible}
        onClose={() => setMonthlyVisible(false)}
        groupId={group.id}
      />

      <CreateDietPlanModal
        visible={dietCreateVisible}
        onClose={() => setDietCreateVisible(false)}
        trainerId={trainerId}
      />

      <WeeklyDietAssignmentModal
        visible={weeklyDietVisible}
        onClose={() => setWeeklyDietVisible(false)}
        mode='group'
        groupId={group.id}
      />
    </>
  );
}
