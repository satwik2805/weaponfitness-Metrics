import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { supabase } from "../config/supabase";
import { useTheme } from "../context/ThemeContext";
import { Button, Chip, Input, SegmentedControl, Sheet, Text, useToast } from "./ui";

const PAYMENT_MODES = ["Cash", "UPI", "Card"];

export default function AddTraineeModal({
  visible,
  onClose,
  onCreated,
  defaultTrainerId = null,
}) {
  const { space } = useTheme();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const [branchId, setBranchId] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchBranchAndPlans();
    } else {
      // reset plan selections when modal closes
      setPlans([]);
      setSelectedPlan(null);
      setPaymentMode(null);
    }
  }, [visible]);

  const fetchBranchAndPlans = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("branch_id")
        .eq("id", currentUserId)
        .single();

      const bId = profile?.branch_id ?? null;
      setBranchId(bId);

      if (bId) {
        const { data: plansData, error } = await supabase
          .from("membership_plans")
          .select("id, plan_name, price, duration_months")
          .eq("branch_id", bId)
          .order("plan_name", { ascending: true });

        if (!error) setPlans(plansData || []);
      }
    } catch (err) {
      // non-blocking: the plan picker just stays empty if this load fails
      toast.show("Couldn't load membership plans — try reopening.", { kind: "error" });
    }
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setSelectedPlan(null);
    setPaymentMode(null);
  };

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.show("Name, email & password are required.", { kind: "error" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.show("Please enter a valid email address.", { kind: "error" });
      return;
    }

    // Plan & payment required for trainee creation with membership
    if (!selectedPlan) {
      toast.show("Please select a membership plan.", { kind: "error" });
      return;
    }
    if (!paymentMode) {
      toast.show("Please select a payment method.", { kind: "error" });
      return;
    }

    try {
      setLoading(true);

      // 1) Get current user's branch (works for trainer, receptionist, etc.)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUserId = session?.user?.id;
      let bId = branchId;

      if (!bId && currentUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("branch_id")
          .eq("id", currentUserId)
          .single();
        bId = profile?.branch_id ?? null;
        setBranchId(bId);
      }

      if (!bId) {
        toast.show("Couldn't determine the branch for this trainee.", { kind: "error" });
        setLoading(false);
        return;
      }

      // 2) Create user in Supabase Auth using sign up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          }
        }
      });

      if (authError) {
        toast.show(authError.message || "Couldn't create the user account.", { kind: "error" });
        setLoading(false);
        return;
      }

      const newUserId = authData?.user?.id;
      if (!newUserId) {
        toast.show("Couldn't create the user account.", { kind: "error" });
        setLoading(false);
        return;
      }

      // 3) Create profile in database
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([{
          id: newUserId,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role: "Trainee",
          branch_id: bId,
        }]);

      if (profileError) {
        toast.show(profileError.message || "Couldn't create the trainee's profile.", { kind: "error" });
        setLoading(false);
        return;
      }

      // 4) Create trainee record
      const { error: traineeError } = await supabase
        .from("trainees")
        .insert([{
          id: newUserId,
          trainer_id: defaultTrainerId || null,
        }]);

      if (traineeError) {
        toast.show(traineeError.message || "Couldn't create the trainee record.", { kind: "error" });
        setLoading(false);
        return;
      }

      // 5) Get the plan details for trainee_plan record
      const { data: planData, error: planError } = await supabase
        .from("membership_plans")
        .select("plan_name, price, duration_months")
        .eq("id", selectedPlan)
        .single();

      if (planError || !planData) {
        toast.show("Couldn't load the selected plan's details.", { kind: "error" });
        setLoading(false);
        return;
      }

      // 6) Create the membership (canonical: trainee_plans, started/expires dates)
      const start = new Date();
      const expires = new Date(start);
      expires.setMonth(expires.getMonth() + (planData.duration_months || 1));

      const { error: traineeplanError } = await supabase
        .from("trainee_plans")
        .insert([{
          trainee_id: newUserId,
          plan_id: selectedPlan,
          started_at: start.toISOString().split("T")[0],
          expires_at: expires.toISOString().split("T")[0],
          is_active: true,
        }]);

      if (traineeplanError) {
        toast.show(traineeplanError.message || "Couldn't create the membership.", { kind: "error" });
        setLoading(false);
        return;
      }

      // 7) Record the joining payment (canonical: profile_id / payment_status)
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          profile_id: newUserId,
          amount: planData.price,
          payment_mode: paymentMode,
          payment_status: "Completed",
        }]);

      if (paymentError) {
        // the member + plan exist; surface the payment miss honestly
        toast.show("Member created, but the payment didn't record — log it from the payments screen.", { kind: "warning" });
      }

      // Success
      toast.show(`${fullName} registered successfully as a trainee!`, { kind: "success" });
      resetForm();
      onCreated?.();
      onClose();

    } catch (err) {
      toast.show(err.message || "Something went wrong during registration.", { kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Register New Trainee"
      footer={
        <>
          <Button title="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Create Trainee" loading={loading} onPress={handleCreate} style={{ flex: 2 }} />
        </>
      }
    >
      <View style={{ gap: space[4] }}>
        <Input
          label="Full Name"
          icon="person-outline"
          value={fullName}
          onChangeText={setFullName}
          placeholder="John Doe"
        />
        <Input
          label="Email"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="user@example.com"
        />
        <Input
          label="Password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />
        <Input
          label="Phone (optional)"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="9999999999"
        />

        {/* Plan selector */}
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

        {/* Payment method */}
        <View style={{ gap: space[2] }}>
          <Text variant="label" color="textMuted">Payment Method</Text>
          <SegmentedControl
            segments={PAYMENT_MODES}
            selectedIndex={paymentMode ? PAYMENT_MODES.indexOf(paymentMode) : -1}
            onChange={(i) => setPaymentMode(PAYMENT_MODES[i])}
          />
        </View>
      </View>
    </Sheet>
  );
}
