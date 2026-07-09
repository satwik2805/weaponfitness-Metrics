import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../config/supabase";
import { Button, EmptyState, IconButton, ListItem, Sheet, Surface, useToast } from "./ui";
import AddWorkoutModal from "./AddWorkoutModal";
import WorkoutModal from "./WorkoutModal";

export default function ManageWorkoutsModal({ visible, onClose }) {
  const { space } = useTheme();
  const toast = useToast();

  const [workouts, setWorkouts] = useState([]);
  const [addVisible, setAddVisible] = useState(false);
  const [viewWorkout, setViewWorkout] = useState(null);
  const [viewVisible, setViewVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchWorkouts();
    }
  }, [visible]);

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setWorkouts(data);
  };

  const deleteWorkout = async (id) => {
    const { error } = await supabase
      .from("workout_templates")
      .delete()
      .eq("id", id);

    if (error) {
      if (__DEV__) console.error("Delete workout template error:", error.message);
      toast.show("Could not delete the workout. Please try again.", { kind: "error" });
      return;
    }
    fetchWorkouts();
  };

  const openWorkout = (w) => {
    setViewWorkout(w);
    setViewVisible(true);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Manage workouts"
      footer={<Button title="Close" variant="ghost" onPress={onClose} fullWidth />}
    >
      <View style={{ gap: space[3] }}>
        <Button
          title="Add new workout template"
          variant="secondary"
          icon="add"
          onPress={() => setAddVisible(true)}
          fullWidth
        />

        {workouts.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="No workout templates yet"
            body="Create your first workout template so you can assign it to members."
          />
        ) : (
          workouts.map((w) => {
            const shortInstructions =
              (w.instructions || "").replace(/\\n/g, " ").slice(0, 80) +
              (w.instructions && w.instructions.length > 80 ? "..." : "");

            return (
              <Surface key={w.id} level={2} pad={2}>
                <ListItem
                  icon="barbell"
                  title={w.name}
                  subtitle={w.instructions ? shortInstructions : undefined}
                  onPress={() => openWorkout(w)}
                  trailing={
                    <IconButton
                      icon="trash-outline"
                      variant="ghost"
                      color="danger"
                      onPress={() => deleteWorkout(w.id)}
                      accessibilityLabel={`Delete ${w.name}`}
                    />
                  }
                />
              </Surface>
            );
          })
        )}
      </View>

      {/* Nested Modals */}
      <AddWorkoutModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdded={fetchWorkouts}
      />

      <WorkoutModal
        visible={viewVisible}
        onClose={() => setViewVisible(false)}
        data={viewWorkout}
      />
    </Sheet>
  );
}
