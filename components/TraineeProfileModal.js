import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../config/supabase";
import { checkRateLimit } from "../utils/rateLimiter";
import { attendanceService } from "../services";
import { Sheet, Button, Text, Avatar, Badge, ListItem, SkeletonRow, useToast } from "./ui";

export default function TraineeProfileModal({
  visible,
  onClose,
  trainee,
  onAttendanceMarked,
}) {
  const { space } = useTheme();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("N/A");
  const [branchId, setBranchId] = useState(null);
  const [stats, setStats] = useState({
    attendedToday: false,
    attendancePercentage: 0,
    startDate: null,
  });

  useEffect(() => {
    if (visible && trainee) loadExtraData();
  }, [visible, trainee]);

  const formatDate = (d) => {
    if (!d) return "N/A";
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const loadExtraData = async () => {
    try {
      setLoading(true);

      const traineeId = trainee.id;

      // 1) PHONE NUMBER
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, branch_id")
        .eq("id", traineeId)
        .single();

      if (profile?.phone) setPhone(profile.phone);
      if (profile?.branch_id) setBranchId(profile.branch_id);

      // 2) ACTIVE PLAN
      const { data: activePlanRow } = await supabase
        .from("trainee_plan")
        .select(`
          plan_id,
          start_date,
          expiry_date,
          active_status,
          membership_plans ( plan_name )
        `)
        .eq("trainee_id", traineeId)
        .eq("active_status", true)
        .maybeSingle();

      let startDate = null;
      let expiryDate = null;
      let planName = "No Active Plan";

      if (activePlanRow) {
        startDate = activePlanRow.start_date;
        expiryDate = activePlanRow.expiry_date;
        planName = activePlanRow.membership_plans?.plan_name ?? "Plan";
      }


      // START DATE
      // const startDate = trainee.start_date || trainee.startDate || null;

      // 2) TODAY ATTENDANCE
      const today = new Date().toISOString().split("T")[0];

      const { data: todayData } = await supabase
        .from("attendance")
        .select("id")
        .eq("trainee_id", traineeId)
        .eq("date", today)
        .maybeSingle();

      const attendedToday = Boolean(todayData);

      // 3) TOTAL DAYS SINCE START
      let totalDays = 0;
      if (startDate) {
        const start = new Date(startDate);
        const now = new Date();
        totalDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      }

      // 4) TOTAL ATTENDANCE COUNT (within active plan period)

      let attendanceCount = 0;
      if (startDate) {
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("trainee_id", traineeId)
          .gte("date", startDate)     // filter from plan start date
          .lte("date", today);        // until today

        attendanceCount = count || 0;
      }

      const attendancePercentage =
        totalDays > 0 ? Math.round((attendanceCount / totalDays) * 100) : 0;

      setStats({
        attendedToday,
        attendancePercentage,
        startDate,
        expiryDate,
        planName
      });

    } catch (e) {
      if (__DEV__) console.error("Trainee profile stats error:", e.message);
    }

    setLoading(false);
  };

  /* ------------------------- MARK ATTENDANCE ------------------------- */
  const markAttendance = async () => {
    try {
      const traineeId = trainee.id;

      if (!branchId) {
        toast.show("This member isn't linked to a branch yet.", { kind: "error" });
        return;
      }

      // CALL EDGE FUNCTION (Gateway Pattern)
      const { data: funcData, error: funcError } = await supabase.functions.invoke('rate-limit-demo', {
        body: {
          action: 'admin_attendance',
          payload: {
            traineeId,
            branchId
          }
        },
        headers: {
          'x-action-path': '/admin_write' // Enforce rate limit
        }
      });

      if (funcError) {
        let msg = "Could not mark attendance";
        if (funcError && funcError.context && typeof funcError.context.json === 'function') {
          try {
            const body = await funcError.context.json();
            msg = body.error || msg;
          } catch (e) { }
        }
        // Handle specific "Already checked in" case gracefully if needed
        toast.show(msg, { kind: "error" });
        return;
      }

      if (funcData?.error) {
        toast.show(funcData.error, { kind: "error" });
        return;
      }

      toast.show("Attendance marked.", { kind: "success" });

      // update modal internally
      setStats((prev) => ({ ...prev, attendedToday: true }));

      // notify parent
      if (onAttendanceMarked) onAttendanceMarked();

    } catch (e) {
      if (__DEV__) console.error("Mark attendance error:", e.message);
      toast.show("Couldn't mark attendance. Please try again.", { kind: "error" });
    }
  };

  const [isMarkingAbsent, setIsMarkingAbsent] = useState(false);

  /* -------- CONFIRM MARK ABSENT -------- */
  const confirmMarkAbsent = async () => {
    try {
      setIsMarkingAbsent(true);
      const traineeId = trainee.id;
      const traineeName = trainee.profiles?.full_name || "Trainee";

      // Direct API call
      await attendanceService.markAbsent(traineeId);

      setIsMarkingAbsent(false);

      toast.show(`${traineeName} marked absent. Workout shifted to tomorrow.`, { kind: "success" });

      onClose();
      if (onAttendanceMarked) onAttendanceMarked();

    } catch (error) {
      if (__DEV__) console.error("Mark absent error:", error.message);
      setIsMarkingAbsent(false);

      toast.show(error.message || "Couldn't mark this member absent. Please try again.", { kind: "error" });
    }
  };

  /* ------------------------- MARK ABSENT (SHIFT WORKOUT) ------------------------- */
  const markAbsent = () => {
    confirmMarkAbsent();
  };

  if (!trainee) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={trainee.profiles?.full_name}
      subtitle={stats.planName ? `Plan: ${stats.planName}` : undefined}
      footer={
        loading ? (
          <Button title="Close" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        ) : (
          <>
            <Button
              title={stats.attendedToday ? "Already Marked" : "Mark Attendance"}
              icon="checkmark"
              disabled={stats.attendedToday}
              onPress={markAttendance}
              style={{ flex: 2 }}
            />
            <Button
              title="Mark Absent"
              variant="danger"
              icon="close-circle-outline"
              loading={isMarkingAbsent}
              onPress={markAbsent}
              style={{ flex: 2 }}
            />
          </>
        )
      }
    >
      {loading ? (
        <View style={{ gap: space[3], paddingVertical: space[4] }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <View style={{ gap: space[4] }}>
          {/* PROFILE HEADER */}
          <View style={{ alignItems: "center", gap: space[2] }}>
            <Avatar
              name={trainee.profiles?.full_name}
              uri={trainee.profiles?.profile_image}
              size="xl"
            />
            <Badge tone={stats.attendedToday ? "success" : "danger"} icon={stats.attendedToday ? "checkmark-circle" : "close-circle"}>
              {stats.attendedToday ? "Attended Today" : "Not Attended Today"}
            </Badge>
          </View>

          {/* DETAILS */}
          <View>
            <ListItem icon="call" title="Phone" value={phone} separator />
            <ListItem icon="ribbon" title="Plan" value={stats.planName} separator />
            <ListItem icon="play" title="Starts" value={formatDate(stats.startDate)} separator />
            <ListItem icon="flag" title="Expires" value={formatDate(stats.expiryDate)} separator />
            <ListItem icon="stats-chart" title="Attendance" value={`${stats.attendancePercentage}%`} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
