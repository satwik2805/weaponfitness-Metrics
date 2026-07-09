import React from "react";
import { View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Sheet, Text, Button } from "./ui";

export default function DietTemplatePreviewModal({ visible, onClose, data }) {
  const { colors, radius, space } = useTheme();

  if (!visible || !data) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={data.dietName}
      footer={<Button title="Close" variant="secondary" onPress={onClose} style={{ flex: 1 }} />}
    >
      <View style={{ gap: space[4] }}>
        {data.meals.map((meal) => (
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

            {data.items[meal.meal_name]?.map((item, index) => (
              <View
                key={index}
                style={{ flexDirection: "row", alignItems: "center", gap: space[3] }}
              >
                <FontAwesome6 name="bowl-food" size={14} color={colors.accentBright} />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{item.item_name}</Text>
                  <Text variant="bodySm" color="textMuted">
                    {item.quantity}
                    {item.time_slot ? ` • ${item.time_slot}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </Sheet>
  );
}
