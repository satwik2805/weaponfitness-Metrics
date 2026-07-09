import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { checkRateLimit } from "../utils/rateLimiter";
import { apiRequest } from "../config/apiClient";
import { Sheet, Input, Button, Text, ListItem, EmptyState, useToast } from "./ui";

export default function CreateGroupModal({ visible, onClose, trainerId, onCreated }) {
  const { colors, space } = useTheme();
  const toast = useToast();

  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [trainees, setTrainees] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (visible && trainerId) loadTrainees();
  }, [visible]);

  const loadTrainees = async () => {
    const { data, error } = await supabase
      .from("trainees")
      .select(`
        id,
        profiles(full_name)
      `)
      .eq("trainer_id", trainerId);

    if (!error) {
      setTrainees(
        data.map((t) => ({
          id: t.id,
          name: t.profiles.full_name,
        }))
      );
    }
  };

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const createGroup = async () => {
    if (groupName.trim().length === 0) {
      toast.show("Please enter a group name.", { kind: "error" });
      return;
    }

    setLoading(true);

    try {
      // Switched to direct Backend API (bypasses Edge Function authority issues)
      const res = await apiRequest("/trainee-groups/", "POST", {
        groupName: groupName.trim(),
        trainerId,
        memberIds: selected,
      });

      if (res?.error) {
        toast.show(res.error, { kind: "error" });
        setLoading(false);
        return;
      }

      // Success
      setGroupName("");
      setSelected([]);
      toast.show("Group created.", { kind: "success" });
      onCreated && onCreated(); // refresh dashboard
      onClose();

    } catch (err) {
      if (__DEV__) console.error("Create group error:", err.message);
      toast.show("Something went wrong creating the group. Please try again.", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Create new group"
      subtitle="Name the group and pick who's in it."
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="Create"
            icon="checkmark"
            loading={loading}
            onPress={createGroup}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      <View style={{ gap: space[5] }}>
        <Input
          label="Group name"
          icon="people-outline"
          placeholder="e.g. Morning Strength Squad"
          value={groupName}
          onChangeText={setGroupName}
        />

        <View style={{ gap: space[2] }}>
          <Text variant="label" color="textMuted">
            {selected.length > 0 ? `Select trainees · ${selected.length} selected` : "Select trainees"}
          </Text>
          {trainees.length === 0 ? (
            <EmptyState
              compact
              icon="people-outline"
              title="No trainees yet"
              body="Members assigned to you will show up here."
            />
          ) : (
            <View>
              {trainees.map((t) => {
                const isSelected = selected.includes(t.id);
                return (
                  <ListItem
                    key={t.id}
                    title={t.name}
                    onPress={() => toggleSelect(t.id)}
                    trailing={
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? colors.accentBright : colors.textFaint}
                      />
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}
