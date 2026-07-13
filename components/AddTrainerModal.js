import React, { useState } from "react";
import { View } from "react-native";
import * as Crypto from "expo-crypto";
import { useTheme } from "../context/ThemeContext";
import { api } from "../config/apiClient";
import { Sheet, Input, Button, Text, Surface, useToast } from "./ui";

// Cryptographically random 12-char temporary password (A-Za-z0-9 + 2 symbols).
// Charset length is 64, so `byte % 64` introduces no modulo bias.
const generateTempPassword = () => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@";
  const bytes = Crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
};

export default function AddTrainerModal({ visible, onClose, branchId, onAdded }) {
  const { space } = useTheme();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { email, password }

  const handleCreateTrainer = async () => {
    if (!fullName || !email || !phone) {
      toast.show("All fields are required.", { kind: "error" });
      return;
    }

    setLoading(true);

    // Fresh random temporary password for every trainer account
    const tempPassword = generateTempPassword();

    try {
      await api.post("/register/", {
        email,
        password: tempPassword,
        full_name: fullName,
        phone,
        role: "Trainer",
        branch_id: branchId || null,
        experience_years: experience ? parseInt(experience) : null,
      });

      // Show the generated temp password to the owner (only chance to see it)
      setCreatedCredentials({ email, password: tempPassword });
      onAdded?.(); // refresh dashboard (must NOT close the modal — the one-time password is showing)

      setFullName("");
      setEmail("");
      setPhone("");
      setExperience("");

    } catch (err) {
      if (__DEV__) console.error("Create trainer error:", err.message);
      toast.show(err.message || "Could not create the trainer. Please try again.", { kind: "error" });
    }

    setLoading(false);
  };

  const handleDone = () => {
    setCreatedCredentials(null);
    onClose();
  };

  if (createdCredentials) {
    return (
      <Sheet
        visible={visible}
        onClose={handleDone}
        title="Trainer added"
        subtitle="Share these credentials securely — the password won't be shown again."
        footer={<Button title="Done" icon="checkmark" onPress={handleDone} fullWidth />}
      >
        <View style={{ gap: space[4] }}>
          <View style={{ gap: space[2] }}>
            <Text variant="label" color="textMuted">Login email</Text>
            <Surface level={2} pad={3}>
              <Text variant="bodyLg" selectable>{createdCredentials.email}</Text>
            </Surface>
          </View>

          <View style={{ gap: space[2] }}>
            <Text variant="label" color="textMuted">Temporary password</Text>
            <Surface level={2} pad={3}>
              <Text variant="bodyLg" selectable>{createdCredentials.password}</Text>
            </Surface>
          </View>

          <Text variant="bodySm" color="textFaint">
            Long-press the password to copy it and share it securely with the trainer.
            It will not be shown again — they should change it after first login.
          </Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add trainer"
      subtitle="Create a trainer login for this branch."
      footer={
        <>
          <Button title="Close" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="Create trainer"
            icon="person-add"
            loading={loading}
            onPress={handleCreateTrainer}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      <View style={{ gap: space[5] }}>
        <Input
          label="Full name"
          icon="person-outline"
          placeholder="e.g. Priya Menon"
          value={fullName}
          onChangeText={setFullName}
        />
        <Input
          label="Email"
          icon="mail-outline"
          placeholder="trainer@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label="Phone number"
          icon="call-outline"
          placeholder="Mobile number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Input
          label="Experience (years)"
          icon="ribbon-outline"
          placeholder="e.g. 3"
          keyboardType="numeric"
          value={experience}
          onChangeText={setExperience}
        />
      </View>
    </Sheet>
  );
}
