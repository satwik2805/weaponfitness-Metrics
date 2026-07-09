import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { checkRateLimit } from "../utils/rateLimiter";
import DietTemplatePreviewModal from "./DietTemplatePreviewModal";
import { Sheet, Button, Text, ListItem, SegmentedControl, SkeletonRow, IconButton, useToast } from "./ui";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyDietAssignmentModal({
  visible,
  onClose,
  groupId,
  traineeId,
  mode,
}) {
  const { space } = useTheme();
  const toast = useToast();

  const [selectedDay, setSelectedDay] = useState("monday");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (visible) {
      loadTemplates();
      loadExistingAssignments();
    }
  }, [visible, traineeId, groupId, mode]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("diet_library").select("*");
    if (!error) setTemplates(data || []);
    setLoading(false);
  };

  const loadExistingAssignments = async () => {
    if (mode === "group") {
      // GROUP MODE
      const { data } = await supabase
        .from("group_weekly_diet")
        .select("*")
        .eq("group_id", groupId);

      const map = {};
      data?.forEach((row) => {
        map[row.day_name] = row.diet_id;
      });
      setSelectedTemplate(map);

    } else {
      // PERSONAL MODE
      const { data, error } = await supabase
        .from("custom_trainee_diet")
        .select("*")
        .eq("trainee_id", traineeId);

      if (error) {
        console.error("Load Personal Assignments Error:", error);
        return;
      }

      const map = {};
      data?.forEach((row) => {
        if (row.day_name) {
          map[row.day_name.toLowerCase()] = row.diet_id;
        }
      });
      setSelectedTemplate(map);
    }
  };

  const saveAssignment = async () => {
    // Explicit debug log for button click

    try {
      setSaving(true);
      const dietId = selectedTemplate[selectedDay];
      const targetTable = mode === "group" ? "group_weekly_diet" : "custom_trainee_diet";
      const targetIdField = mode === "group" ? "group_id" : "trainee_id";
      const targetId = mode === "group" ? groupId : traineeId;

      if (!dietId) {
        toast.show("Tap a diet template from the list before saving.", { kind: "error" });
        return;
      }

      if (!targetId) {
        toast.show(`No active ${mode} ID found. Please close and re-open.`, { kind: "error" });
        return;
      }

      // 1) Robust Clear Logic
      const { error: delErr } = await supabase
        .from(targetTable)
        .delete()
        .eq(targetIdField, targetId)
        .ilike("day_name", selectedDay);

      if (delErr) throw delErr;

      // 2) Insert Logic
      const { error: insErr } = await supabase
        .from(targetTable)
        .insert({
          [targetIdField]: targetId,
          day_name: selectedDay.toLowerCase(),
          diet_id: dietId
        });

      if (insErr) throw insErr;

      toast.show("Diet plan saved", { kind: "success" });

      // Refresh local state map
      loadExistingAssignments();
    } catch (err) {
      console.error("Save Assignment Error:", err);
      toast.show(err.message || "Couldn't save the diet plan. Please try again.", { kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const clearDay = async () => {
    try {
      setLoading(true);
      const targetTable = mode === "group" ? "group_weekly_diet" : "custom_trainee_diet";
      const targetIdField = mode === "group" ? "group_id" : "trainee_id";
      const targetId = mode === "group" ? groupId : traineeId;

      const { error } = await supabase
        .from(targetTable)
        .delete()
        .eq(targetIdField, targetId)
        .ilike("day_name", selectedDay);

      if (error) throw error;

      // Clear UI selected template
      setSelectedTemplate(prev => ({
        ...prev,
        [selectedDay]: null
      }));

      toast.show("Diet cleared for this day", { kind: "success" });
    } catch (err) {
      console.error("Clear Assignment Error:", err);
      toast.show("Couldn't clear the diet for this day. Please try again.", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (dietId) => {
    const { data: meals } = await supabase
      .from("diet_meals")
      .select("diet_meals_id, meal_name, order_index")
      .eq("diet_id", dietId)
      .order("order_index", { ascending: true });

    const mealItems = {};

    for (const meal of meals) {
      const { data: items } = await supabase
        .from("diet_items")
        .select("*")
        .eq("meal_id", meal.diet_meals_id)
        .order("order_index", { ascending: true });

      mealItems[meal.meal_name] = items || [];
    }

    setPreviewData({
      meals,
      items: mealItems,
      dietName: templates.find((t) => t.diet_library_id === dietId)?.name || "",
    });

    setPreviewVisible(true);
  };

  if (!visible) return null;

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={mode === "group" ? "Assign Weekly Diet (Group)" : "Assign Weekly Diet (Personal)"}
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
              onPress={saveAssignment}
              style={{ flex: 2 }}
            />
          </>
        }
      >
        <View style={{ gap: space[4] }}>
          {/* Day Tabs */}
          <SegmentedControl
            segments={DAY_LABELS}
            selectedIndex={days.indexOf(selectedDay)}
            onChange={(i) => setSelectedDay(days[i])}
          />

          {/* Template List */}
          {loading ? (
            <View style={{ gap: space[3] }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : (
            <View style={{ gap: space[1] }}>
              {templates.map((t) => {
                const isSelected = selectedTemplate[selectedDay] === t.diet_library_id;
                return (
                  <ListItem
                    key={t.diet_library_id}
                    icon="fast-food"
                    iconTone={isSelected ? "accent" : "neutral"}
                    title={t.name}
                    onPress={() =>
                      setSelectedTemplate((prev) => ({
                        ...prev,
                        [selectedDay]: t.diet_library_id,
                      }))
                    }
                    trailing={
                      <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                        {isSelected ? (
                          <Text variant="bodySm" color="accentBright">Selected</Text>
                        ) : null}
                        <IconButton
                          icon="arrow-forward"
                          variant="ghost"
                          size={32}
                          iconSize={18}
                          accessibilityLabel={`Preview ${t.name}`}
                          onPress={() => handlePreview(t.diet_library_id)}
                        />
                      </View>
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      </Sheet>

      {/* Preview Modal */}
      <DietTemplatePreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        data={previewData}
      />
    </>
  );
}
