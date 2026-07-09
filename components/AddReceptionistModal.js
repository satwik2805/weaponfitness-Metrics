import React, { useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { Button, Input, Sheet, useToast } from "./ui";

export default function AddReceptionistModal({ visible, onClose, branchId, onAdded }) {
  const { space } = useTheme();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const resetFields = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
  };

  const registerReceptionist = async () => {
    if (!fullName || !email || !password || !phone) {
      toast.show("All fields are required.", { kind: 'error' });
      return;
    }

    if (!branchId) {
      toast.show("Select a branch first — the receptionist must be assigned to one.", { kind: 'error' });
      return;
    }

    setLoading(true);

    try {
      // CALL EDGE FUNCTION (Gateway Pattern)
      const { data: funcData, error: funcError } = await supabase.functions.invoke('rate-limit-demo', {
        body: {
          action: 'add_receptionist',
          payload: {
            email,
            password,
            fullName,
            phone,
            branchId
          }
        },
        headers: {
          'x-action-path': '/admin_write' // Enforce rate limit
        }
      });

      if (funcError) {
        let msg = "Failed to create receptionist.";
        if (funcError && funcError.context && typeof funcError.context.json === 'function') {
          try {
            const body = await funcError.context.json();
            msg = body.error || msg;
          } catch (e) { }
        }
        throw new Error(msg);
      }

      if (funcData?.error) throw new Error(funcData.error);

      setLoading(false);
      toast.show("Receptionist created.", { kind: 'success' });

      onAdded?.();
      resetFields();
      onClose();
    } catch (err) {
      setLoading(false);
      toast.show(err.message || "Failed to create receptionist.", { kind: 'error' });
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add Receptionist"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Create Receptionist" loading={loading} onPress={registerReceptionist} style={{ flex: 2 }} />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        <Input
          label="Full Name"
          icon="person-outline"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full Name"
        />
        <Input
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        <Input
          label="Phone Number"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone Number"
          keyboardType="phone-pad"
        />
      </View>
    </Sheet>
  );
}
