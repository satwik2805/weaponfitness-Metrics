import React, { useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { Button, Input, Sheet, useToast } from "./ui";

export default function AddBranchModal({ visible, onClose, onAdded }) {
  const { space } = useTheme();
  const toast = useToast();

  const [branchName, setBranchName] = useState("");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setBranchName("");
    setAddress("");
    setContact("");
  };

  const onSubmit = async () => {
    if (!branchName) {
      toast.show("Branch name is required.", { kind: 'error' });
      return;
    }
    setLoading(true);
    try {
      // 1. Get Session
      const { data: { session } } = await supabase.auth.getSession();
      const ownerId = session?.user?.id;
      if (!ownerId) throw new Error("Not authenticated");

      // 2. Call Edge Function (Gateway Pattern)
      const { data: funcData, error: funcError } = await supabase.functions.invoke('rate-limit-demo', {
        body: {
          action: 'add_branch',
          payload: {
            branchName,
            address,
            contact,
            ownerId,
          }
        },
        headers: {
          'x-action-path': '/admin_write' // Enforce rate limit
        }
      });

      if (funcError) {
        let msg = "Failed to create branch.";
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
      toast.show("Branch created.", { kind: 'success' });
      onAdded?.();
      reset();
      onClose();
    } catch (e) {
      setLoading(false);
      toast.show(e.message || "Failed to create branch.", { kind: 'error' });
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add Branch"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Create Branch" loading={loading} onPress={onSubmit} style={{ flex: 2 }} />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        <Input
          label="Branch Name"
          icon="business-outline"
          value={branchName}
          onChangeText={setBranchName}
          placeholder="Branch Name"
        />
        <Input
          label="Address"
          icon="location-outline"
          value={address}
          onChangeText={setAddress}
          placeholder="Address"
        />
        <Input
          label="Contact Number"
          icon="call-outline"
          value={contact}
          onChangeText={setContact}
          placeholder="Contact"
          keyboardType="phone-pad"
        />
      </View>
    </Sheet>
  );
}
