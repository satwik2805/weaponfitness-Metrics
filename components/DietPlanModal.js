import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { nutritionService } from "../services/nutritionService";
import { Chip, EmptyState, IconButton, Sheet, Surface, Text, useToast } from "./ui";

const days = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function TraineeDietModal({
  visible,
  onClose,
  traineeId,
  groupId,
}) {
  const { colors, space } = useTheme();
  const toast = useToast();

  const [selectedDay, setSelectedDay] = useState("");
  const [diet, setDiet] = useState(null);

  useEffect(() => {
    if (visible) {
      const weekday = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][new Date().getDay()];
      setSelectedDay(weekday);
      loadDiet(weekday);
    }
  }, [visible]);

  const loadDiet = async (day) => {
    setDiet(null);

    // find group weekly diet assignment
    const { data: assignment } = await supabase
      .from("group_weekly_diet")
      .select("diet_id")
      .eq("group_id", groupId)
      .eq("day_name", day)
      .single();

    if (!assignment?.diet_id) return;

    const dietId = assignment.diet_id;

    // fetch library info
    const { data: dietInfo } = await supabase
      .from("diet_library")
      .select("*")
      .eq("diet_library_id", dietId)
      .single();

    // fetch meals
    const { data: meals } = await supabase
      .from("diet_meals")
      .select("diet_meals_id, meal_name, order_index")
      .eq("diet_id", dietId)
      .order("order_index");

    const mealItemsMap = {};

    for (let meal of meals) {
      const { data: items } = await supabase
        .from("diet_items")
        .select("*")
        .eq("meal_id", meal.id)
        .order("order_index");

      mealItemsMap[meal.meal_name] = items || [];
    }

    setDiet({
      ...dietInfo,
      meals,
      items: mealItemsMap,
    });
  };

  const handleLogItem = async (item, mealName) => {
    try {
      const logData = {
        trainee_id: traineeId,
        item_name: item.item_name,
        meal_name: mealName,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fats: item.fats || 0,
        quantity: item.quantity,
      };

      await nutritionService.logNutrition(logData);
      toast.show(`${item.item_name} logged!`, { kind: 'success' });
    } catch (err) {
      console.error("Error logging item:", err);
      toast.show("Failed to log meal item", { kind: 'error' });
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Your diet plan">
      {/* DAY SELECTOR */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: space[4] }}
        contentContainerStyle={{ gap: space[2] }}
      >
        {days.map((d) => (
          <Chip
            key={d}
            label={d.slice(0, 1).toUpperCase() + d.slice(1)}
            selected={selectedDay === d}
            onPress={() => {
              setSelectedDay(d);
              loadDiet(d);
            }}
          />
        ))}
      </ScrollView>

      {!diet ? (
        <EmptyState
          icon="nutrition-outline"
          title="Nothing planned"
          body={`No diet assigned for ${selectedDay}.`}
        />
      ) : (
        <View style={{ gap: space[4] }}>
          {/* DIET HEADER */}
          <View>
            <Text variant="h2">{diet.name}</Text>
            {diet.description ? (
              <Text variant="body" color="textMuted" style={{ marginTop: space[1] }}>
                {diet.description}
              </Text>
            ) : null}
          </View>

          {/* MEALS */}
          {diet.meals.map((meal) => (
            <Surface key={meal.id} level={2} pad={4}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space[3], marginBottom: space[3] }}>
                <FontAwesome6 name="bowl-food" size={20} color={colors.accentBright} />
                <Text variant="h4">{meal.meal_name}</Text>
              </View>

              <View style={{ gap: space[3] }}>
                {diet.items[meal.meal_name]?.map((item, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.accent,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="body">
                        {item.quantity
                          ? `${item.item_name} (${item.quantity})`
                          : item.item_name}
                      </Text>
                      {item.calories > 0 && (
                        <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                          {Math.round(item.calories)} kcal • P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g F:{Math.round(item.fats)}g
                        </Text>
                      )}
                    </View>
                    <IconButton
                      icon="add-circle-outline"
                      variant="ghost"
                      color="accentBright"
                      size={36}
                      iconSize={20}
                      onPress={() => handleLogItem(item, meal.meal_name)}
                      accessibilityLabel={`Log ${item.item_name}`}
                    />
                  </View>
                ))}
              </View>
            </Surface>
          ))}
        </View>
      )}
    </Sheet>
  );
}
