// components/TraineeDietModal.js
import React, { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { Sheet, Text, Chip, EmptyState } from "./ui";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export default function TraineeDietModal({ visible, onClose, traineeId, groupId }) {
  const { colors, radius, space } = useTheme();

  const [selectedDay, setSelectedDay] = useState("");
  const [dietData, setDietData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = weekdayNames[new Date().getDay()];
      setSelectedDay(today);
      loadDietForDay(today);
    }
  }, [visible]);

  const loadDietForDay = async (day) => {
    setLoading(true);

    // 1) Check custom override
    const { data: custom } = await supabase
      .from("custom_trainee_diet")
      .select("diet_id")
      .eq("trainee_id", traineeId)
      .ilike("day_name", day)
      .maybeSingle();

    let dietId = custom?.diet_id;

    // 2) If no custom → check group weekly
    if (!dietId) {
      const { data: groupWeekly } = await supabase
        .from("group_weekly_diet")
        .select("diet_id")
        .eq("group_id", groupId)
        .ilike("day_name", day)
        .maybeSingle();

      dietId = groupWeekly?.diet_id;
    }

    if (!dietId) {
      setDietData(null);
      setLoading(false);
      return;
    }

    // 3) Fetch meals
    const { data: meals } = await supabase
      .from("diet_meals")
      .select("*")
      .eq("diet_id", dietId)
      .order("order_index");

    const itemsMap = {};
    if (meals && meals.length > 0) {
      for (const meal of meals) {
        const { data: items } = await supabase
          .from("diet_items")
          .select("*")
          .eq("meal_id", meal.diet_meals_id)
          .order("order_index");

        itemsMap[meal.meal_name] = items || [];
      }
    }

    setDietData({
      meals,
      items: itemsMap,
    });

    setLoading(false);
  };

  if (!visible) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Diet Plan"
      subtitle={`Today is ${cap(selectedDay)}`}
    >
      <View style={{ gap: space[4] }}>
        {/* Day picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space[2] }}
        >
          {days.map((d) => (
            <Chip
              key={d}
              label={cap(d)}
              selected={selectedDay === d}
              onPress={() => {
                setSelectedDay(d);
                loadDietForDay(d);
              }}
            />
          ))}
        </ScrollView>

        {/* Diet list */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: space[6] }} />
        ) : !dietData || !dietData.meals || dietData.meals.length === 0 ? (
          <EmptyState
            icon="restaurant-outline"
            title="No diet assigned"
            body="There's no diet assigned for this day yet."
          />
        ) : (
          <View style={{ gap: space[3] }}>
            {dietData.meals.map((meal) => (
              <View
                key={meal.diet_meals_id}
                style={{
                  backgroundColor: colors.surface,
                  padding: space[3],
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: space[2],
                }}
              >
                <Text variant="h4">{meal.meal_name}</Text>

                {(dietData.items[meal.meal_name] || []).map((i, idx) => (
                  <View key={idx} style={{ flexDirection: "row", gap: space[2] }}>
                    <Text variant="body" color="accentBright">•</Text>
                    <Text variant="body" style={{ flex: 1 }}>
                      {i.item_name} : {i.quantity}
                      {i.time_slot ? ` — ${i.time_slot.slice(0, 5)}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}
