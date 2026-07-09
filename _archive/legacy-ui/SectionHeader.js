import React from "react";
import { Text, StyleSheet } from "react-native";

export default function SectionHeader({ title }) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 25,
  },
});
