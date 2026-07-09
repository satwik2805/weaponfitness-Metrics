import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import {
  Sheet,
  Button,
  Text,
  ListItem,
  SegmentedControl,
  Badge,
  EmptyState,
  useToast,
} from "./ui";

// must match the payment_mode_enum exactly (Cash/Card/UPI)
const PAYMENT_MODES = ["Cash", "UPI", "Card"];
const PAYMENT_LABELS = ["Cash", "UPI", "Card"];

export default function RenewSubscriptionModal({ visible, onClose, traineeId, branchId, onSuccess }) {
  const { colors, space } = useTheme();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [trainees, setTrainees] = useState([]);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [traineeStatus, setTraineeStatus] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);



  useEffect(() => {
    if (visible) {
      loadPlans();
      loadTrainees();
    };
  }, [visible, branchId]);


  const loadTrainees = async () => {
    // canonical schema: trainee_plans(started_at, expires_at, is_active)
    const { data } = await supabase
      .from("trainees")
      .select(`
        id,
        profiles!trainees_id_fkey!inner(full_name, branch_id),
        trainee_plans(
            started_at,
            expires_at,
            is_active
        )
        `)
      .eq("profiles.branch_id", branchId);

    setTrainees(data || []);
  };

  const loadTraineeStatus = (trainee) => {
    if (!trainee) return setTraineeStatus(null);

    const activePlan = trainee.trainee_plans?.find(p => p.is_active === true);

    if (!activePlan) {
      setTraineeStatus({
        hasActive: false,
        daysLeft: 0,
        expiry: null
      });
      return;
    }

    const expiry = new Date(activePlan.expires_at);
    const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));

    setTraineeStatus({
      hasActive: true,
      daysLeft,
      expiry: expiry.toDateString()
    });
  };

  const selectTrainee = (id) => {
    setSelectedTrainee(id);
    const traineeObj = trainees.find(t => t.id === id);
    loadTraineeStatus(traineeObj);
  };



  const loadPlans = async () => {
    const { data } = await supabase
      .from("membership_plans")
      .select("id, plan_name, price, duration_months")
      .eq("branch_id", branchId);

    setPlans(data || []);
  };

  const renew = async () => {
    if (!selectedTrainee) return toast.show("Select a member first.", { kind: "warning" });
    if (!selectedPlan) return toast.show("Select a plan.", { kind: "warning" });
    if (!paymentMode) return toast.show("Select a payment method.", { kind: "warning" });
    if (saving) return;

    setSaving(true);
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error("That plan no longer exists — refresh and try again.");

      // 1) record the payment (canonical: profile_id / payment_status / created_at)
      const { error: payError } = await supabase.from("payments").insert({
        profile_id: selectedTrainee,
        amount: plan.price,
        payment_mode: paymentMode,
        payment_status: "Completed",
      });
      if (payError) throw payError;

      // 2) roll the membership: deactivate any current plan, start the new term
      const { error: deactError } = await supabase
        .from("trainee_plans")
        .update({ is_active: false })
        .eq("trainee_id", selectedTrainee)
        .eq("is_active", true);
      if (deactError) throw deactError;

      const active = traineeStatus?.hasActive ? new Date(traineeStatus.expiry) : new Date();
      const start = active > new Date() ? active : new Date(); // extend from expiry if still active
      const expires = new Date(start);
      expires.setMonth(expires.getMonth() + (plan.duration_months || 1));

      const { error: planError } = await supabase.from("trainee_plans").insert({
        trainee_id: selectedTrainee,
        plan_id: plan.id,
        started_at: start.toISOString().split("T")[0],
        expires_at: expires.toISOString().split("T")[0],
        is_active: true,
      });
      if (planError) throw planError;

      toast.show(`Membership renewed — ${plan.plan_name} until ${expires.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`, { kind: "success" });
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.show(err.message || "Couldn't renew the membership. Please try again.", { kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const paymentIndex = paymentMode ? PAYMENT_MODES.indexOf(paymentMode) : -1;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Renew membership"
      subtitle="Pick a member, plan, and payment method."
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button
            title="Renew now"
            icon="refresh"
            loading={saving}
            onPress={renew}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      <View style={{ gap: space[5] }}>
        {/* Member */}
        <View style={{ gap: space[2] }}>
          <Text variant="label" color="textMuted">Select trainee</Text>
          {trainees.length === 0 ? (
            <EmptyState
              compact
              icon="people-outline"
              title="No members"
              body="There are no members in this branch yet."
            />
          ) : (
            <View>
              {trainees.map((t) => {
                const isSelected = selectedTrainee === t.id;
                return (
                  <ListItem
                    key={t.id}
                    title={t.profiles?.full_name ?? "Unknown Member"}
                    onPress={() => selectTrainee(t.id)}
                    trailing={
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? colors.accentBright : colors.textFaint}
                      />
                    }
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Current status */}
        {traineeStatus && (
          traineeStatus.hasActive ? (
            <Badge tone="success" icon="checkmark-circle">
              {`Active — ${traineeStatus.daysLeft} days left (expires ${traineeStatus.expiry})`}
            </Badge>
          ) : (
            <Badge tone="warning" icon="alert-circle">No active subscription</Badge>
          )
        )}

        {/* Payment method */}
        <View style={{ gap: space[2] }}>
          <Text variant="label" color="textMuted">Payment method</Text>
          <SegmentedControl
            segments={PAYMENT_LABELS}
            selectedIndex={paymentIndex < 0 ? 0 : paymentIndex}
            onChange={(i) => setPaymentMode(PAYMENT_MODES[i])}
          />
          {paymentMode == null ? (
            <Text variant="bodySm" color="textFaint">Tap to choose how the member is paying.</Text>
          ) : null}
        </View>

        {/* Plan */}
        <View style={{ gap: space[2] }}>
          <Text variant="label" color="textMuted">Select a plan</Text>
          {plans.length === 0 ? (
            <EmptyState
              compact
              icon="pricetags-outline"
              title="No plans"
              body="Create a membership plan first."
            />
          ) : (
            <View>
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <ListItem
                    key={p.id}
                    title={p.plan_name}
                    value={`₹${p.price}`}
                    onPress={() => setSelectedPlan(p.id)}
                    trailing={
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isSelected ? colors.accentBright : colors.textFaint}
                      />
                    }
                  />
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}
