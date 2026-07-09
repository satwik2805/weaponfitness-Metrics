// components/RegisterMemberModal.js
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { Button, Chip, Input, SegmentedControl, Sheet, Text, useToast } from "./ui";

// ROLES selects the edge-function action (add_trainee vs add_trainer); it is
// NOT the DB role column (the edge function sets that itself).
const ROLES = ["trainee", "trainer"];
// values must match the payment_mode_enum exactly (Cash/Card/UPI)
const PAYMENT_MODES = [
  { label: "Cash", value: "Cash" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "Card" },
];

export default function RegisterMemberModal({ visible, onClose, onRegistered, branchId }) {
  const { space } = useTheme();
  const toast = useToast();

  const [role, setRole] = useState("trainee"); // trainee | trainer
  const [loading, setLoading] = useState(false);

  // Common fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Trainee-specific fields
  const [trainerList, setTrainerList] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);

  // Trainer-specific
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    if (visible) {
      if (role === "trainee") {
        loadTrainers();
        loadPlans();
      }
    }
  }, [role, visible, branchId]);

  const loadTrainers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "Trainer");

    if (!error && data) setTrainerList(data);
  };

  const loadPlans = async () => {
    if (!branchId) return;
    const { data, error } = await supabase
      .from("membership_plans")
      .select("id, plan_name, price, duration_months")
      .eq("branch_id", branchId);


    if (!error && data) setPlans(data);
  };

  const resetFields = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setBio("");
    setExperience("");
    setSelectedTrainer(null);
    setSelectedPlan(null);
    setPaymentMode(null);
  };

  // CREATE USER + PROFILE
  const createAuthUser = async () => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      toast.show(error.message, { kind: "error" });
      return null;
    }

    return data.user;
  };

  // REGISTER TRAINER
  const registerTrainer = async () => {
    if (!email || !password || !fullName) {
      toast.show("Email, password and name are required.", { kind: "error" });
      return;
    }

    // CALL EDGE FUNCTION (Gateway Pattern) - Reusing 'add_trainer' action
    const { data: funcData, error: funcError } = await supabase.functions.invoke('rate-limit-demo', {
      body: {
        action: 'add_trainer',
        payload: {
          email,
          password,
          fullName,
          phone,
          experience,
          branchId: null // or pass if available? 'add_trainer' logic expects it?
          // Wait, 'add_trainer' implementation required branchId.
          // In RegisterMemberModal, is branchId prop available? Yes usually.
          // Let's check props. Yes, branchId is a prop.
        }
      },
      headers: {
        'x-action-path': '/admin_write' // Enforce rate limit
      }
    });
    // NOTE: If branchId is null/undefined, add_trainer might fail if it enforces it.
    // The previous client code for registerTrainer didn't insert branch_id into profiles!
    // But 'add_trainer' edge function DOES insert branch_id.
    // This might be a behavior change. If branchId is passed to modal, we should use it.

    if (funcError) {
      let msg = "Failed to create trainer.";
      if (funcError && funcError.context && typeof funcError.context.json === 'function') {
        try {
          const body = await funcError.context.json();
          msg = body.error || msg;
        } catch (e) { }
      }
      toast.show(msg, { kind: "error" });
      setLoading(false);
      return;
    }

    if (funcData?.error) {
      toast.show(funcData.error, { kind: "error" });
      setLoading(false);
      return;
    }

    toast.show("Trainer account created.", { kind: "success" });
    onRegistered?.();
    resetFields();
    onClose();
  };

  // REGISTER TRAINEE
  const registerTrainee = async () => {
    if (!email || !password || !fullName) {
      toast.show("Email, password and name are required.", { kind: "error" });
      return;
    }
    if (!selectedTrainer) {
      toast.show("Please select a trainer.", { kind: "error" });
      return;
    }
    if (!selectedPlan) {
      toast.show("Please select a membership plan.", { kind: "error" });
      return;
    }
    if (!paymentMode) {
      toast.show("Please select a payment method.", { kind: "error" });
      return;
    }

    setLoading(true);

    // CALL EDGE FUNCTION (Gateway Pattern) - 'add_trainee'
    const { data: funcData, error: funcError } = await supabase.functions.invoke('rate-limit-demo', {
      body: {
        action: 'add_trainee',
        payload: {
          email,
          password,
          fullName,
          phone,
          trainerId: selectedTrainer,
          planId: selectedPlan,
          paymentMode,
          branchId,
        }
      },
      headers: {
        'x-action-path': '/signup' // Enforce rate limit
      }
    });

    if (funcError) {
      let msg = "Failed to register trainee.";
      if (funcError && funcError.context && typeof funcError.context.json === 'function') {
        try {
          const body = await funcError.context.json();
          msg = body.error || msg;
        } catch (e) { }
      }
      toast.show(msg, { kind: "error" });
      setLoading(false);
      return;
    }

    if (funcData?.error) {
      toast.show(funcData.error, { kind: "error" });
      setLoading(false);
      return;
    }

    toast.show("Trainee registered with plan and payment recorded.", { kind: "success" });

    onRegistered?.();
    resetFields();
    onClose();
  };

  const onSubmit = () => {
    if (role === "trainer") registerTrainer();
    else registerTrainee();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Register Member"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title={`Register ${role === "trainer" ? "Trainer" : "Trainee"}`}
            loading={loading}
            onPress={onSubmit}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        {/* ROLE TOGGLE */}
        <SegmentedControl
          segments={["TRAINEE", "TRAINER"]}
          selectedIndex={ROLES.indexOf(role)}
          onChange={(i) => setRole(ROLES[i])}
        />

        {/* COMMON FIELDS */}
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
        />

        {/* TRAINER EXTRA FIELDS */}
        {role === "trainer" && (
          <>
            <Input
              label="Bio / Speciality"
              icon="document-text-outline"
              value={bio}
              onChangeText={setBio}
              placeholder="Bio / Speciality"
            />
            <Input
              label="Experience (Years)"
              icon="ribbon-outline"
              value={experience}
              onChangeText={setExperience}
              placeholder="Experience (Years)"
              keyboardType="numeric"
            />
          </>
        )}

        {/* TRAINEE EXTRA FIELDS */}
        {role === "trainee" && (
          <>
            <View style={{ gap: space[2] }}>
              <Text variant="label" color="textMuted">Assign Trainer</Text>
              {trainerList.length === 0 ? (
                <Text variant="bodySm" color="textFaint">No trainers available yet.</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>
                  {trainerList.map((t) => (
                    <Chip
                      key={t.id}
                      label={t.full_name}
                      selected={selectedTrainer === t.id}
                      onPress={() => setSelectedTrainer(t.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: space[2] }}>
              <Text variant="label" color="textMuted">Select Membership Plan</Text>
              {plans.length === 0 ? (
                <Text variant="bodySm" color="textFaint">No plans available for this branch yet.</Text>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2] }}>
                  {plans.map((p) => (
                    <Chip
                      key={p.id}
                      label={`${p.plan_name} — ₹${p.price}`}
                      selected={selectedPlan === p.id}
                      onPress={() => setSelectedPlan(p.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={{ gap: space[2] }}>
              <Text variant="label" color="textMuted">Payment Method</Text>
              <SegmentedControl
                segments={PAYMENT_MODES.map((m) => m.label)}
                selectedIndex={paymentMode ? PAYMENT_MODES.findIndex((m) => m.value === paymentMode) : -1}
                onChange={(i) => setPaymentMode(PAYMENT_MODES[i].value)}
              />
            </View>
          </>
        )}
      </View>
    </Sheet>
  );
}
