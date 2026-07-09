import React, { useEffect, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { checkRateLimit } from "../utils/rateLimiter";
import { Sheet, Button, Text, ListItem, Badge, SkeletonRow, useToast } from "./ui";

const BOX = 40;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function MonthlyPlanModal({ visible, onClose, groupId }) {
  const { colors, space, radius } = useTheme();
  const toast = useToast();

  const today = new Date();
  const [year] = useState(today.getFullYear());
  const [month] = useState(today.getMonth()); // current month

  const [templates, setTemplates] = useState([]);
  const [selection, setSelection] = useState({}); // { day: [templateIds] }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickingDay, setPickingDay] = useState(null);

  // calendar info
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  /* ---------- Helpers ---------- */
  const makeEmptySelection = () => {
    const base = {};
    for (let d = 1; d <= 31; d++) base[d] = [];
    return base;
  };

  /* ---------- Load data when opened ---------- */
  useEffect(() => {
    if (visible && groupId) {
      loadData();
    }
  }, [visible, groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setSelection(makeEmptySelection());

      // 1) Templates
      const { data: tmpl, error: tmplErr } = await supabase
        .from("workout_templates")
        .select("id, name")
        .order("name", { ascending: true });

      if (tmplErr) {
        if (__DEV__) console.error("Monthly templates fetch error:", tmplErr.message);
      }
      setTemplates(tmpl || []);

      // 2) Existing plan
      const { data: monthly, error: monthlyErr } = await supabase
        .from("group_monthly_workouts")
        .select("date_day, workout_template_id")
        .eq("group_id", groupId);

      if (monthlyErr) {
        if (__DEV__) console.error("Monthly plan fetch error:", monthlyErr.message);
      }

      const base = makeEmptySelection();
      (monthly || []).forEach((row) => {
        if (!base[row.date_day]) base[row.date_day] = [];
        base[row.date_day].push(row.workout_template_id);
      });

      setSelection(base);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Toggle template for a day (MULTI-SELECT) ---------- */
  const handleSelectTemplate = (templateId) => {
    if (!pickingDay) return;

    setSelection((prev) => {
      const currentDayIds = prev[pickingDay] || [];
      const exists = currentDayIds.includes(templateId);

      return {
        ...prev,
        [pickingDay]: exists
          ? currentDayIds.filter((id) => id !== templateId) // remove
          : [...currentDayIds, templateId], // add
      };
    });
  };

  /* ---------- Clear all workouts for that day ---------- */
  const clearDay = () => {
    if (!pickingDay) return;
    setSelection((prev) => ({
      ...prev,
      [pickingDay]: [],
    }));
    setPickingDay(null);
  };

  /* ---------- Save to DB ---------- */
  const handleSave = async () => {
    if (!groupId) return;

    try {
      setSaving(true);

      // Rate Limit Check
      const { allowed } = await checkRateLimit('/assign_workout', 'assign_monthly');
      if (!allowed) {
        setSaving(false);
        return;
      }

      // delete old rows
      const { error: delErr } = await supabase
        .from("group_monthly_workouts")
        .delete()
        .eq("group_id", groupId);

      if (delErr) {
        if (__DEV__) console.error("Monthly delete error:", delErr.message);
        toast.show("Could not clear the old monthly plan. Please try again.", { kind: "error" });
        return;
      }

      const rows = [];
      for (let d = 1; d <= 31; d++) {
        const ids = selection[d] || [];
        if (ids.length > 0) {
          ids.forEach((tid) =>
            rows.push({
              group_id: groupId,
              date_day: d,
              workout_template_id: tid,
            })
          );
        }
      }

      if (rows.length > 0) {
        const { error: insErr } = await supabase
          .from("group_monthly_workouts")
          .insert(rows);

        if (insErr) {
          if (__DEV__) console.error("Monthly insert error:", insErr.message);
          toast.show("Could not save the monthly plan. Please try again.", { kind: "error" });
          return;
        }
      }

      toast.show("Monthly plan saved.", { kind: "success" });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render helpers ---------- */
  const daysArray = [];
  for (let i = 0; i < firstDay; i++) daysArray.push(null);
  for (let d = 1; d <= totalDays; d++) daysArray.push(d);

  const getDaySelectionCount = (day) =>
    (selection[day] && selection[day].length) || 0;

  const headerTextForDay = () => {
    if (!pickingDay) return "";
    const count = getDaySelectionCount(pickingDay);
    if (count === 0) return `No workout set for Day ${pickingDay}`;
    if (count === 1) return `1 workout set for Day ${pickingDay}`;
    return `${count} workouts set for Day ${pickingDay}`;
  };

  if (!visible) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Monthly Workout Plan"
      subtitle={`${new Date(year, month).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })} • pattern repeats every month`}
      footer={
        <Button
          title="Save Monthly Plan"
          loading={saving}
          disabled={loading}
          onPress={handleSave}
          style={{ flex: 1 }}
        />
      }
    >
      {loading ? (
        <View style={{ gap: space[3], paddingVertical: space[4] }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <View style={{ gap: space[4] }}>
          {/* Week header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {WEEKDAYS.map((d) => (
              <Text
                key={d}
                variant="caption"
                color="textMuted"
                style={{ width: BOX, textAlign: "center" }}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {daysArray.map((day, idx) =>
              day === null ? (
                <View key={idx} style={{ width: BOX, height: BOX, marginBottom: space[2] }} />
              ) : (
                <Pressable
                  key={idx}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day}`}
                  onPress={() => setPickingDay(day)}
                  style={({ pressed }) => ({
                    width: BOX,
                    height: BOX,
                    borderRadius: radius.sm,
                    marginBottom: space[2],
                    backgroundColor:
                      getDaySelectionCount(day) > 0
                        ? colors.accentSoft
                        : pressed
                        ? colors.pressedOverlay
                        : colors.surfaceOverlay,
                    borderWidth: getDaySelectionCount(day) > 0 ? 1 : 0,
                    borderColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  })}
                >
                  <Text variant="bodySm">{day}</Text>
                  {getDaySelectionCount(day) > 0 ? (
                    <Ionicons name="checkmark-circle" size={14} color={colors.accentBright} />
                  ) : null}
                </Pressable>
              )
            )}
          </View>

          {/* Legend */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
            <Badge tone="accent">Has workouts</Badge>
            <Badge tone="neutral">Empty day</Badge>
          </View>

          {/* Template picker for a specific day */}
          {pickingDay ? (
            <View
              style={{
                backgroundColor: colors.surfaceOverlay,
                borderRadius: radius.md,
                padding: space[3],
                borderWidth: 1,
                borderColor: colors.border,
                gap: space[2],
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="label" color="textMuted">{headerTextForDay()}</Text>
                <Button
                  title="Done"
                  variant="ghost"
                  size="sm"
                  onPress={() => setPickingDay(null)}
                />
              </View>

              <ScrollView style={{ maxHeight: 220 }}>
                {templates.map((t) => {
                  const selected = (selection[pickingDay] || []).includes(t.id);
                  return (
                    <ListItem
                      key={t.id}
                      icon="barbell"
                      iconTone={selected ? "accent" : "neutral"}
                      title={t.name}
                      onPress={() => handleSelectTemplate(t.id)}
                      trailing={
                        selected ? (
                          <Ionicons name="checkmark-circle" size={20} color={colors.accentBright} />
                        ) : null
                      }
                    />
                  );
                })}
              </ScrollView>

              <Button
                title="Clear workouts for this day"
                variant="ghost"
                icon="trash-outline"
                onPress={clearDay}
              />
            </View>
          ) : null}
        </View>
      )}
    </Sheet>
  );
}
