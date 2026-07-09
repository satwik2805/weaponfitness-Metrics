import React, { useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { Button, IconButton, Input, Sheet, Surface, Text, useToast } from "./ui";
import { checkRateLimit } from "../utils/rateLimiter";

export default function AddWorkoutModal({ visible, onClose, onAdded }) {
  const { space } = useTheme();
  const toast = useToast();

  const [workoutName, setWorkoutName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [exercises, setExercises] = useState([
    { name: "", sets: "", reps: "", weight: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      { name: "", sets: "", reps: "", weight: "" },
    ]);
  };

  const updateExercise = (i, key, value) => {
    const copy = [...exercises];
    copy[i][key] = value;
    setExercises(copy);
  };

  const removeExercise = (i) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
  };

  const resetForm = () => {
    setWorkoutName("");
    setVideoUrl("");
    setImageUrl("");
    setExercises([{ name: "", sets: "", reps: "", weight: "" }]);
  };

  const saveWorkout = async () => {

    if (!workoutName.trim()) {
      toast.show("Workout name is required.", { kind: 'error' });
      return;
    }

    const filtered = exercises.filter((ex) => ex.name.trim().length > 0);
    if (filtered.length === 0) {
      toast.show("Add at least one exercise to the workout.", { kind: 'error' });
      return;
    }

    const instructions = filtered
      .map((ex) => {
        const parts = [ex.name.trim()];
        if (ex.sets) parts.push(`${ex.sets} sets`);
        if (ex.reps) parts.push(`${ex.reps} reps`);
        if (ex.weight) parts.push(`${ex.weight} kg`);
        return parts.join(" - ");
      })
      .join("\n");

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        toast.show("You must be logged in to create templates.", { kind: 'error' });
        return;
      }

      const { data, error } = await supabase
        .from("workout_templates")
        .insert({
          name: workoutName.trim(),
          video_url: videoUrl.trim() || null,
          image_url: imageUrl.trim() || null,
          instructions: instructions,
          creator_id: userId,
        });

      if (error) throw error;

      toast.show("Workout template created.", { kind: 'success' });

      onAdded?.();
      resetForm();
      onClose();
    } catch (err) {
      console.error("Save Workout Error:", err);
      toast.show(err.message || "Couldn't save the workout template.", { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add workout template"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save template" icon="checkmark" loading={saving} onPress={saveWorkout} style={{ flex: 2 }} />
        </>
      }
    >
      <View style={{ gap: space[5] }}>
        <Input
          label="Workout name"
          icon="create-outline"
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Chest Day, Push Day..."
        />

        <Input
          label="Video URL (optional)"
          icon="videocam-outline"
          value={videoUrl}
          onChangeText={setVideoUrl}
          placeholder="https://..."
          autoCapitalize="none"
        />

        <Input
          label="Image URL (optional)"
          icon="image-outline"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://image..."
          autoCapitalize="none"
        />

        <View style={{ gap: space[3] }}>
          <Text variant="label" color="textMuted">Exercises</Text>

          {exercises.map((ex, i) => (
            <Surface key={i} level={2} pad={4}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[3] }}>
                <Text variant="h4">Exercise {i + 1}</Text>
                {exercises.length > 1 ? (
                  <IconButton
                    icon="trash-outline"
                    variant="ghost"
                    color="danger"
                    onPress={() => removeExercise(i)}
                    accessibilityLabel={`Remove exercise ${i + 1}`}
                  />
                ) : null}
              </View>

              <View style={{ gap: space[3] }}>
                <Input
                  placeholder="Exercise name"
                  value={ex.name}
                  onChangeText={(v) => updateExercise(i, "name", v)}
                />
                <Input
                  placeholder="Sets (e.g. 3)"
                  value={ex.sets}
                  keyboardType="numeric"
                  onChangeText={(v) => updateExercise(i, "sets", v)}
                />
                <Input
                  placeholder="Reps (e.g. 12)"
                  value={ex.reps}
                  keyboardType="numeric"
                  onChangeText={(v) => updateExercise(i, "reps", v)}
                />
                <Input
                  placeholder="Weight (optional, kg)"
                  value={ex.weight}
                  keyboardType="numeric"
                  onChangeText={(v) => updateExercise(i, "weight", v)}
                />
              </View>
            </Surface>
          ))}

          <Button title="Add exercise" variant="secondary" icon="add" onPress={addExercise} fullWidth />
        </View>
      </View>
    </Sheet>
  );
}
