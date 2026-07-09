// components/WeeklyPlanModal.js
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { checkRateLimit } from "../utils/rateLimiter";
import { Sheet, Button, Text, ListItem, SegmentedControl, SkeletonRow, useToast } from "./ui";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyPlanModal({
  visible,
  onClose,
  groupId,
  traineeId,
  trainerId,
  mode = "group", // ⭐ NEW: "group" or "trainee"
}) {
  const { colors, space } = useTheme();
  const toast = useToast();

  const [templates, setTemplates] = useState([]);
  const [selectedDay, setSelectedDay] = useState("monday");
  const [selectionMap, setSelectionMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) loadData();
  }, [visible]);

  const emptyMap = () => {
    const map = {};
    DAYS.forEach((d) => (map[d] = []));
    return map;
  };

  /* ------------------------- LOAD DATA ------------------------- */
  const loadData = async () => {
    try {
      setLoading(true);
      setSelectionMap(emptyMap());

      // Load workout templates
      const { data: tmpl } = await supabase
        .from("workout_templates")
        .select("id, name, instructions")
        .order("name", { ascending: true });

      setTemplates(tmpl || []);

      // Load existing (group or personal)
      let existing;

      if (mode === "group") {
        existing = await supabase
          .from("group_weekly_workouts")
          .select("day_name, workout_template_id")
          .eq("group_id", groupId);
      } else {
        // ⭐ PERSONAL WEEKLY WORKOUTS
        existing = await supabase
          .from("custom_trainee_weekly_workouts")
          .select("day_name, workout_template_id")
          .eq("trainee_id", traineeId);
      }

      const map = emptyMap();
      (existing.data || []).forEach((row) => {
        map[row.day_name].push(row.workout_template_id);
      });

      setSelectionMap(map);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------- SELECT / REMOVE ------------------------- */
  const toggleTemplate = (templateId) => {
    setSelectionMap((prev) => {
      const ids = prev[selectedDay] || [];
      const exists = ids.includes(templateId);

      return {
        ...prev,
        [selectedDay]: exists
          ? ids.filter((id) => id !== templateId)
          : [...ids, templateId],
      };
    });
  };

  const clearDay = () => {
    setSelectionMap((prev) => ({ ...prev, [selectedDay]: [] }));
  };

  /* ------------------------- SAVE ------------------------- */
  const saveDay = async () => {
    try {
      setSaving(true);
      const ids = selectionMap[selectedDay] || [];
      const targetTable = mode === "group" ? "group_weekly_workouts" : "custom_trainee_weekly_workouts";
      const targetIdField = mode === "group" ? "group_id" : "trainee_id";
      const targetId = mode === "group" ? groupId : traineeId;

      if (!targetId) {
        toast.show(`Missing ${mode} ID. Please close and re-open the screen.`, { kind: 'error' });
        return;
      }

      // 1) Delete existing for this target + day
      const { error: delErr } = await supabase
        .from(targetTable)
        .delete()
        .eq(targetIdField, targetId)
        .ilike("day_name", selectedDay);

      if (delErr) throw delErr;

      // 2) Insert new IDs
      if (ids.length > 0) {
        const rows = ids.map((wid) => ({
          [targetIdField]: targetId,
          day_name: selectedDay.toLowerCase(),
          workout_template_id: wid,
          trainer_id: trainerId || null,
        }));

        const { error: insErr } = await supabase.from(targetTable).insert(rows);
        if (insErr) throw insErr;
      }

      toast.show(`Saved ${mode === "group" ? "group" : "personal"} workouts for ${selectedDay}`, { kind: 'success' });
    } catch (e) {
      console.error("saveDay error", e);
      toast.show(e.message || "Failed to save workouts", { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------- UI ------------------------- */
  if (!visible) return null;

  const selectedIds = selectionMap[selectedDay] || [];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={mode === "group" ? "Group Weekly Workout" : "Personal Weekly Workout"}
      subtitle={selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
      footer={
        <>
          <Button
            title="Clear day"
            variant="ghost"
            icon="trash-outline"
            onPress={clearDay}
            disabled={loading || saving}
            style={{ flex: 1 }}
          />
          <Button
            title="Save"
            loading={saving}
            disabled={loading}
            onPress={saveDay}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        <SegmentedControl
          segments={DAY_LABELS}
          selectedIndex={DAYS.indexOf(selectedDay)}
          onChange={(i) => setSelectedDay(DAYS[i])}
        />

        {loading ? (
          <View style={{ gap: space[3] }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <View style={{ gap: space[1] }}>
            {templates.map((tpl) => {
              const selected = selectedIds.includes(tpl.id);
              return (
                <ListItem
                  key={tpl.id}
                  icon="barbell"
                  iconTone={selected ? "accent" : "neutral"}
                  title={tpl.name}
                  subtitle={tpl.instructions ? tpl.instructions.replace(/\n/g, " ") : undefined}
                  onPress={() => toggleTemplate(tpl.id)}
                  trailing={
                    selected ? (
                      <Text variant="bodySm" color="accentBright">Selected</Text>
                    ) : null
                  }
                />
              );
            })}
          </View>
        )}
      </View>
    </Sheet>
  );
}
