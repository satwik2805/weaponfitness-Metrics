import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../config/supabase";
import { trainerAttendanceService } from "../services/trainerAttendanceService";
import {
  Avatar,
  Badge,
  EmptyState,
  IconButton,
  ListItem,
  Sheet,
  SkeletonRow,
  Text,
  useConfirm,
  useToast,
} from "./ui";

/**
 * Owner marks each trainer present/absent for today. Migrated onto the
 * design-system Sheet (was a hand-rolled Modal). Absence shifts the trainer's
 * group workouts (handled server-side).
 */
export default function TrainerAttendanceModal({ visible, onClose }) {
  const { space } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  useEffect(() => {
    if (visible) fetchTrainers();
  }, [visible]);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .eq("owner_id", session.user.id);
      const branchIds = (branches || []).map((b) => b.id);
      if (branchIds.length === 0) {
        setTrainers([]);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, profile_image, branch_id")
        .eq("role", "Trainer")
        .in("branch_id", branchIds);
      setTrainers(data || []);
    } finally {
      setLoading(false);
    }
  };

  const markPresent = async (trainer) => {
    setActingId(trainer.id);
    try {
      await trainerAttendanceService.markPresent(trainer.id);
      toast.show(`${trainer.full_name} marked present.`, { kind: "success" });
    } catch (err) {
      toast.show(`Couldn't mark ${trainer.full_name} present. Try again.`, { kind: "error" });
    } finally {
      setActingId(null);
    }
  };

  const markAbsent = async (trainer) => {
    const ok = await confirm({
      title: "Mark absent?",
      message: `Marking ${trainer.full_name} absent will shift their group workouts to the next day.`,
      confirmTitle: "Mark absent",
      destructive: true,
    });
    if (!ok) return;
    setActingId(trainer.id);
    try {
      await trainerAttendanceService.markAbsent(trainer.id);
      toast.show(`${trainer.full_name} marked absent — workouts shifted.`, { kind: "success" });
    } catch (err) {
      toast.show(`Couldn't mark ${trainer.full_name} absent. Try again.`, { kind: "error" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Trainer attendance" subtitle="Mark today's presence — absence shifts group workouts.">
      {loading ? (
        <View style={{ gap: space[3] }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : trainers.length === 0 ? (
        <EmptyState icon="people-outline" title="No trainers" body="There are no trainers in your branches yet." />
      ) : (
        <View>
          {trainers.map((t, i) => (
            <ListItem
              key={t.id}
              leading={<Avatar name={t.full_name} uri={t.profile_image} size="md" />}
              title={t.full_name}
              separator={i < trainers.length - 1}
              trailing={
                actingId === t.id ? (
                  <Badge tone="neutral">Saving…</Badge>
                ) : (
                  <View style={{ flexDirection: "row", gap: space[2] }}>
                    <IconButton icon="checkmark" variant="soft" accessibilityLabel={`Mark ${t.full_name} present`} onPress={() => markPresent(t)} />
                    <IconButton icon="close" variant="secondary" accessibilityLabel={`Mark ${t.full_name} absent`} onPress={() => markAbsent(t)} />
                  </View>
                )
              }
            />
          ))}
        </View>
      )}
    </Sheet>
  );
}
