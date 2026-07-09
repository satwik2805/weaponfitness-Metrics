import React from "react";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Sheet, Button, Text, ListItem } from "./ui";

export default function PersonalAssignmentModal({
  visible,
  onClose,
  trainee,
  onAssignWorkout,
  onAssignDiet,
}) {
  const { space } = useTheme();

  if (!trainee) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Assign to ${trainee.name}`}
      footer={<Button title="Close" variant="ghost" onPress={onClose} style={{ flex: 1 }} />}
    >
      <View style={{ gap: space[2] }}>
        {/* Assign Weekly Workout */}
        <ListItem
          icon="barbell"
          title="Assign Personal Weekly Workout"
          chevron
          onPress={onAssignWorkout}
        />

        {/* Assign Weekly Diet */}
        <ListItem
          icon="cafe"
          title="Assign Personal Weekly Diet"
          chevron
          onPress={onAssignDiet}
        />

        {/* Disclaimer */}
        <Text variant="bodySm" color="textMuted" style={{ marginTop: space[2] }}>
          If this trainee is in a group, personal assignments override group settings.
        </Text>
      </View>
    </Sheet>
  );
}
