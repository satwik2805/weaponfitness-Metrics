import React, { useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { checkRateLimit } from "../utils/rateLimiter";
import { Button, IconButton, Input, Sheet, Surface, Text, useToast } from "./ui";

export default function CreateDietPlanModal({
  visible,
  onClose,
  trainerId,
  onCreated,
}) {
  const { space } = useTheme();
  const toast = useToast();

  const [dietName, setDietName] = useState("");
  const [meals, setMeals] = useState([
    { mealName: "Breakfast", items: [] },
    { mealName: "Lunch", items: [] },
    { mealName: "Dinner", items: [] },
  ]);

  const [saving, setSaving] = useState(false);

  /* ---------------- ADD / REMOVE ------------------- */
  const addMeal = () => {
    setMeals((prev) => [
      ...prev,
      { mealName: `Meal ${prev.length + 1}`, items: [] },
    ]);
  };

  const removeMeal = (index) => {
    setMeals((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = (mealIndex) => {
    const copy = JSON.parse(JSON.stringify(meals));
    copy[mealIndex].items.push({ name: "", qty: "", time: "" });
    setMeals(copy);
  };

  const removeItem = (mealIndex, itemIndex) => {
    const copy = JSON.parse(JSON.stringify(meals));
    copy[mealIndex].items.splice(itemIndex, 1);
    setMeals(copy);
  };

  const updateMealName = (index, value) => {
    const copy = [...meals];
    copy[index].mealName = value;
    setMeals(copy);
  };

  const updateItem = (mIndex, iIndex, key, value) => {
    const copy = JSON.parse(JSON.stringify(meals));
    copy[mIndex].items[iIndex][key] = value;
    setMeals(copy);
  };

  const resetForm = () => {
    setDietName("");
    setMeals([
      { mealName: "Breakfast", items: [] },
      { mealName: "Lunch", items: [] },
      { mealName: "Dinner", items: [] },
    ]);
  };

  /* ---------------- SAVE TEMPLATE ------------------- */
  const handleSave = async () => {
    if (!dietName.trim()) {
      toast.show("Please enter a diet name.", { kind: 'error' });
      return;
    }

    if (meals.length === 0) {
      toast.show("Add at least one meal.", { kind: 'error' });
      return;
    }

    try {
      setSaving(true);

      // 1) Insert into Diet Library
      const { data: dietLib, error: libErr } = await supabase
        .from("diet_library")
        .insert({
          name: dietName.trim(),
          created_by: trainerId
        })
        .select()
        .single();

      if (libErr) throw libErr;

      const dietId = dietLib.diet_library_id;

      // 2) Insert Meals & Items
      for (let mIdx = 0; mIdx < meals.length; mIdx++) {
        const meal = meals[mIdx];

        const { data: insertedMeal, error: mealErr } = await supabase
          .from("diet_meals")
          .insert({
            diet_id: dietId,
            meal_name: meal.mealName,
            order_index: mIdx + 1
          })
          .select()
          .single();

        if (mealErr) throw mealErr;

        const mealId = insertedMeal.diet_meals_id;

        // Insert Items for this meal
        if (meal.items && meal.items.length > 0) {
          const itemsToInsert = meal.items.map((it, iIdx) => ({
            meal_id: mealId,
            item_name: it.name || "Unnamed Item",
            quantity: it.qty || "No Quantity",
            time_slot: it.time || null,
            order_index: iIdx + 1
          }));

          const { error: itemsErr } = await supabase
            .from("diet_items")
            .insert(itemsToInsert);

          if (itemsErr) throw itemsErr;
        }
      }

      toast.show("Diet template created 🎉", { kind: 'success' });
      onCreated?.();
      resetForm();
      onClose?.();
    } catch (error) {
      console.error("Save Diet Error:", error);
      toast.show(error.message || "Couldn't save the diet template.", { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Create diet template"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Save template" icon="checkmark" loading={saving} onPress={handleSave} style={{ flex: 2 }} />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        {/* Diet Name */}
        <Input
          label="Diet name"
          icon="restaurant-outline"
          placeholder="e.g. Lean Muscle Plan"
          value={dietName}
          onChangeText={setDietName}
        />

        {/* MEALS */}
        {meals.map((meal, mi) => (
          <Surface key={mi} level={2} pad={4}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: space[2] }}>
              <Input
                label={`Meal ${mi + 1}`}
                placeholder="Meal name (Breakfast)"
                value={meal.mealName}
                onChangeText={(v) => updateMealName(mi, v)}
                style={{ flex: 1 }}
              />
              <IconButton
                icon="trash-outline"
                variant="ghost"
                color="danger"
                onPress={() => removeMeal(mi)}
                accessibilityLabel={`Remove ${meal.mealName}`}
              />
            </View>

            {/* ITEMS */}
            {meal.items.map((it, ii) => (
              <Surface key={ii} level={1} pad={3} style={{ marginTop: space[3] }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space[2] }}>
                  <Text variant="label" color="accentBright">Item {ii + 1}</Text>
                  <IconButton
                    icon="close"
                    variant="ghost"
                    color="danger"
                    size={32}
                    iconSize={18}
                    onPress={() => removeItem(mi, ii)}
                    accessibilityLabel={`Remove item ${ii + 1}`}
                  />
                </View>

                <View style={{ gap: space[2] }}>
                  <Input
                    placeholder="Food item (e.g. Oats)"
                    value={it.name}
                    onChangeText={(v) => updateItem(mi, ii, "name", v)}
                  />
                  <Input
                    placeholder="Quantity (e.g. 100g, 2pcs)"
                    value={it.qty}
                    onChangeText={(v) => updateItem(mi, ii, "qty", v)}
                  />
                  <Input
                    placeholder="Time (08:30, 13:00, etc.)"
                    value={it.time}
                    onChangeText={(v) => updateItem(mi, ii, "time", v)}
                  />
                </View>
              </Surface>
            ))}

            {/* Add item */}
            <Button
              title="Add item"
              variant="secondary"
              size="sm"
              icon="add"
              onPress={() => addItem(mi)}
              style={{ alignSelf: "flex-start", marginTop: space[3] }}
            />
          </Surface>
        ))}

        <Button title="Add meal" variant="secondary" icon="add" onPress={addMeal} fullWidth />
      </View>
    </Sheet>
  );
}
