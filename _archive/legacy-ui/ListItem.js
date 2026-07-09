import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function ListItem({ icon, title, subtitle, onPress }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
      onPress={onPress}
    >
      <View style={styles.left}>
        <Feather name={icon} size={22} color={colors.accent} />

        <View style={styles.textBox}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>

      <Feather name="chevron-right" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center" },
  textBox: { marginLeft: 12 },
  title: { fontSize: 18, fontWeight: "500" },
  subtitle: { fontSize: 14 },
});
