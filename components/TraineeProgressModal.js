// components/TraineeProgressModal.js
import React, { useEffect, useMemo, useState, useRef } from "react";
import { View, Animated, Pressable, Platform } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../config/supabase";
import { attendanceService } from "../services";
import { sleepService } from "../services/sleepService";
import { nutritionService } from "../services/nutritionService";
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from "react-native-svg";
import { haptic } from "./ui/haptics";
import {
  Sheet,
  Button,
  Text,
  Surface,
  Badge,
  ProgressRing,
  SegmentedControl,
  EmptyState,
  SkeletonRow,
  useToast,
  useConfirm,
} from "./ui";

function WeightProgressChart({ trainee }) {
  const { colors, space, radius } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState(6); // Default select latest
  const tooltipScale = useRef(new Animated.Value(0)).current;

  // Mock weights matching BMI/profile of trainee
  const weightData = useMemo(() => {
    const baseWeight = trainee?.weight || 82.5;
    return [
      baseWeight + 1.2,
      baseWeight + 0.9,
      baseWeight + 1.4,
      baseWeight + 0.6,
      baseWeight + 0.4,
      baseWeight + 0.1,
      baseWeight,
    ];
  }, [trainee?.weight]);

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // SVG Chart sizing
  const width = 310;
  const height = 150;
  const paddingX = 30;
  const paddingY = 25;

  const points = useMemo(() => {
    const minW = Math.min(...weightData) - 0.5;
    const maxW = Math.max(...weightData) + 0.5;
    const range = maxW - minW;

    return weightData.map((val, i) => {
      const x = paddingX + (i * (width - 2 * paddingX)) / 6;
      const y = height - paddingY - ((val - minW) / range) * (height - 2 * paddingY);
      return { x, y, val };
    });
  }, [weightData]);

  // Bezier curve algorithm
  const bezierPath = useMemo(() => {
    if (points.length === 0) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    return `${bezierPath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  }, [bezierPath, points]);

  useEffect(() => {
    tooltipScale.setValue(0);
    Animated.spring(tooltipScale, {
      toValue: 1,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [selectedIdx]);

  const handleSelectPoint = (idx) => {
    haptic("light");
    setSelectedIdx(idx);
  };

  const selectedPoint = points[selectedIdx];

  return (
    <View style={{ gap: space[4], alignItems: "center" }}>
      <View style={{ width: "100%" }}>
        <Text variant="h4">Weight Progress</Text>
        <Text variant="bodySm" color="textMuted">Trainee body weight trend (7 days)</Text>
      </View>

      <Surface level={1} pad={4} radius="lg" style={{ width: "100%", overflow: "hidden" }}>
        {/* SVG Drawing */}
        <View style={{ height, width: "100%", position: "relative" }}>
          <Svg height={height} width="100%">
            <Defs>
              <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.32" />
                <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Grid Line */}
            <Path
              d={`M ${paddingX} ${height - paddingY} L ${width - paddingX} ${height - paddingY}`}
              stroke={colors.border}
              strokeWidth={1}
            />

            {/* Gradient Filled Area */}
            <Path d={areaPath} fill="url(#areaGradient)" />

            {/* Bezier Path */}
            <Path d={bezierPath} stroke={colors.accent} strokeWidth={3.5} fill="none" />

            {/* Points and Labels */}
            {points.map((pt, i) => {
              const isSelected = selectedIdx === i;
              return (
                <G key={i}>
                  {/* Point */}
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? colors.accentBright : colors.accent}
                    stroke={colors.bg}
                    strokeWidth={1.5}
                  />

                  {/* Interactive Tap Zone */}
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={18}
                    fill="transparent"
                    onPress={() => handleSelectPoint(i)}
                  />
                </G>
              );
            })}
          </Svg>

          {/* Scale Animated Tooltip */}
          {selectedPoint && (
            <Animated.View
              style={{
                position: "absolute",
                left: selectedPoint.x - 45,
                top: selectedPoint.y - 42,
                transform: [{ scale: tooltipScale }],
                backgroundColor: colors.surfaceOverlay,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                borderRadius: radius.sm,
                paddingVertical: 4,
                paddingHorizontal: 8,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                pointerEvents: "none",
              }}
            >
              <Text variant="label" style={{ fontSize: 10, fontVariant: ["tabular-nums"] }}>
                {selectedPoint.val.toFixed(1)} kg
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Labels bar */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: paddingX - 10 }}>
          {labels.map((lbl, i) => (
            <Pressable key={lbl} onPress={() => handleSelectPoint(i)}>
              <Text
                variant="caption"
                color={selectedIdx === i ? "accentBright" : "textFaint"}
                style={{ width: 40, textAlign: "center", fontWeight: selectedIdx === i ? "bold" : "normal" }}
              >
                {lbl}
              </Text>
            </Pressable>
          ))}
        </View>
      </Surface>
    </View>
  );
}

const TABS = ["weekly", "monthly", "weight", "sleep", "nutrition"];
const TAB_LABELS = ["Weekly", "Monthly", "Weight", "Sleep", "Nutrition"];

export default function TraineeProgressModal({ visible, onClose, trainee }) {
  const { colors, space, radius } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [mode, setMode] = useState("weekly");
  const [attendanceDates, setAttendanceDates] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingNutrition, setLoadingNutrition] = useState(false);

  useEffect(() => {
    if (visible && trainee?.id) {
      fetchAttendance();
      fetchSleepLogs();
      fetchNutrition();
      setMode("weekly");
    }
  }, [visible, trainee?.id]);

  const fetchNutrition = async () => {
    try {
      setLoadingNutrition(true);
      const data = await nutritionService.getDailySummary(trainee.id);
      setNutritionSummary(data);
    } catch (e) {
    } finally {
      setLoadingNutrition(false);
    }
  };

  const fetchSleepLogs = async () => {
    try {
      const logs = await sleepService.getTraineeSleepLogs(trainee.id);
      setSleepLogs(logs || []);
    } catch (e) {
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("attendance")
        .select("attendance_date")
        .eq("trainee_id", trainee.id)
        .order("attendance_date", { ascending: true });

      if (!error && data) {
        const normalized = data.map((r) =>
          new Date(r.attendance_date).toISOString().slice(0, 10)
        );
        setAttendanceDates(normalized);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async () => {

    const ok = await confirm({
      title: "Mark Absent?",
      message:
        "This will mark the trainee as absent for today and shift their assigned workout schedule to the next day. This cannot be undone.",
      confirmTitle: "Mark Absent",
      destructive: true,
    });

    if (ok) {
      await executeMarkAbsent();
    }
  };

  const executeMarkAbsent = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.markAbsent(trainee.id);

      toast.show("Trainee marked absent and workout shifted.", { kind: 'success' });

      // Refresh attendance
      fetchAttendance();
    } catch (error) {
      console.error("❌ Failed to mark absent:", error);
      const msg = error.response?.data?.detail || error.message || "Unknown error";

      toast.show(`Couldn't mark absent. ${msg}`, { kind: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const {
    weeklyDays,
    monthWeeks,
    attendancePercentage,
    completionPercentage,
  } = useMemo(() => {
    const today = new Date();
    const attendanceSet = new Set(attendanceDates);

    // WEEKLY: last 7 days
    const weeklyDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const present = attendanceSet.has(key);
      const label = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
      weeklyDays.push({ label, present, key });
    }

    // MONTHLY: calendar layout for current month
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-based
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthWeeks = [];
    let currentWeek = [];

    // pad first week
    for (let i = 0; i < startWeekday; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = d.toISOString().slice(0, 10);
      const present = attendanceSet.has(key);
      currentWeek.push({ day, present, key });

      if (currentWeek.length === 7) {
        monthWeeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      monthWeeks.push(currentWeek);
    }

    // Percentages based on mode
    let attendancePct = 0;
    if (mode === "weekly") {
      const presentCount = weeklyDays.filter((d) => d.present).length;
      attendancePct = Math.round((presentCount / 7) * 100);
    } else {
      const todayDay = today.getDate();
      let presentCount = 0;
      for (let day = 1; day <= todayDay; day++) {
        const d = new Date(year, month, day);
        const key = d.toISOString().slice(0, 10);
        if (attendanceSet.has(key)) presentCount++;
      }
      attendancePct = Math.round((presentCount / todayDay) * 100);
    }

    const completionPct = attendancePct; // completion = attendance

    return {
      weeklyDays,
      monthWeeks,
      attendancePercentage: attendancePct,
      completionPercentage: completionPct,
    };
  }, [attendanceDates, mode]);

  if (!visible || !trainee) return null;
  const bmiValue = trainee.bmi ?? null;

  const Dot = ({ present, size = 20 }) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: present ? colors.success : colors.danger,
      }}
    />
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={trainee.name}
      subtitle="Progress Overview"
      footer={
        <Button
          title="Mark Absent & Shift Workout"
          variant="danger"
          icon="person-remove-outline"
          loading={loading}
          onPress={handleMarkAbsent}
          style={{ flex: 1 }}
        />
      }
    >
      <View style={{ gap: space[4] }}>
        {/* TOGGLE */}
        <SegmentedControl
          segments={TAB_LABELS}
          selectedIndex={TABS.indexOf(mode)}
          onChange={(i) => setMode(TABS[i])}
        />

        {loading ? (
          <View style={{ gap: space[3], paddingVertical: space[4] }}>
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : (
          <>
            {/* ====== WEIGHT LOGS CHART ====== */}
            {mode === "weight" ? (
              <WeightProgressChart trainee={trainee} />
            ) : null}

            {/* ====== SLEEP LOGS ====== */}
            {mode === "sleep" ? (
              <View style={{ gap: space[3] }}>
                <View>
                  <Text variant="h4">Sleep Recovery Logs</Text>
                  <Text variant="bodySm" color="textMuted">Recent sleep entries from the trainee</Text>
                </View>

                {sleepLogs.length === 0 ? (
                  <EmptyState icon="moon-outline" title="No sleep logs" body="No sleep logs found for this trainee." compact />
                ) : (
                  sleepLogs.map((log) => (
                    <Surface key={log.id} level={2} pad={4} radius="md" style={{ gap: space[3] }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text variant="h4">{new Date(log.sleep_date).toLocaleDateString()}</Text>
                        <Badge tone={log.score >= 80 ? "success" : log.score >= 50 ? "warning" : "danger"}>
                          {`${log.score}`}
                        </Badge>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View style={{ alignItems: "center", flex: 1, gap: 2 }}>
                          <Text variant="statSm">{log.total_hours}h</Text>
                          <Text variant="caption" color="textMuted">Slept</Text>
                        </View>
                        <View style={{ alignItems: "center", flex: 1, gap: 2 }}>
                          <Text variant="statSm">{log.woke_up_count}</Text>
                          <Text variant="caption" color="textMuted">Woke Up</Text>
                        </View>
                        <View style={{ alignItems: "center", flex: 1, gap: 2 }}>
                          <Text variant="statSm">{log.deep_sleep_rating}/10</Text>
                          <Text variant="caption" color="textMuted">Depth</Text>
                        </View>
                      </View>
                      {log.sleep_quality_notes ? (
                        <Text variant="bodySm" color="textMuted">"{log.sleep_quality_notes}"</Text>
                      ) : null}
                    </Surface>
                  ))
                )}
              </View>
            ) : mode === "nutrition" ? (
              <View style={{ gap: space[3] }}>
                <View>
                  <Text variant="h4">Nutrition Log</Text>
                  <Text variant="bodySm" color="textMuted">Food and macros logged by trainee today</Text>
                </View>

                {loadingNutrition ? (
                  <View style={{ gap: space[3] }}>
                    <SkeletonRow />
                    <SkeletonRow />
                  </View>
                ) : !nutritionSummary ? (
                  <EmptyState icon="restaurant-outline" title="No nutrition data" body="No nutrition data for today." compact />
                ) : (
                  <View style={{ gap: space[3] }}>
                    {/* Summary Row */}
                    <Surface level={1} pad={4} radius="md">
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <View style={{ alignItems: "center", gap: 2 }}>
                          <Text variant="stat">{Math.round(nutritionSummary.total_calories)}</Text>
                          <Text variant="caption" color="textMuted">Calories</Text>
                        </View>
                        <View style={{ alignItems: "center", gap: 2 }}>
                          <Text variant="stat" color="danger">{Math.round(nutritionSummary.total_protein)}g</Text>
                          <Text variant="caption" color="textMuted">Protein</Text>
                        </View>
                        <View style={{ alignItems: "center", gap: 2 }}>
                          <Text variant="stat" color="success">{Math.round(nutritionSummary.total_carbs)}g</Text>
                          <Text variant="caption" color="textMuted">Carbs</Text>
                        </View>
                        <View style={{ alignItems: "center", gap: 2 }}>
                          <Text variant="stat" color="info">{Math.round(nutritionSummary.total_fats)}g</Text>
                          <Text variant="caption" color="textMuted">Fats</Text>
                        </View>
                      </View>
                    </Surface>

                    {/* Logs List */}
                    {nutritionSummary.logs.length === 0 ? (
                      <Text variant="bodySm" color="textMuted" align="center">No individual items logged yet.</Text>
                    ) : (
                      nutritionSummary.logs.map((log) => (
                        <Surface key={log.id} level={2} pad={3} radius="md">
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={{ flex: 1 }}>
                              <Text variant="bodySm">{log.item_name}</Text>
                              <Text variant="caption" color="textMuted">{log.meal_name} • {log.quantity || "1 serving"}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text variant="bodySm" color="accentBright">{Math.round(log.calories)} cal</Text>
                              <Text variant="caption" color="textMuted">P:{Math.round(log.protein)} C:{Math.round(log.carbs)} F:{Math.round(log.fats)}</Text>
                            </View>
                          </View>
                        </Surface>
                      ))
                    )}
                  </View>
                )}
              </View>
            ) : mode === "weekly" ? (
              <View style={{ gap: space[2] }}>
                <View>
                  <Text variant="h4">Weekly Attendance</Text>
                  <Text variant="bodySm" color="textMuted">
                    Last 7 days — green = present, red = absent
                  </Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space[2] }}>
                  {weeklyDays.map((d, idx) => (
                    <View key={d.key ?? idx} style={{ alignItems: "center", flex: 1, gap: space[1] }}>
                      <Dot present={d.present} />
                      <Text variant="caption" color="textMuted">{d.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ gap: space[2] }}>
                <View>
                  <Text variant="h4">Monthly Attendance</Text>
                  <Text variant="bodySm" color="textMuted">
                    Current month — calendar view
                  </Text>
                </View>

                {/* Weekday headers */}
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                    <Text key={d} variant="caption" color="textMuted" style={{ width: `${100 / 7}%`, textAlign: "center" }}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Calendar weeks */}
                <Surface level={1} pad={2} radius="md">
                  {monthWeeks.map((week, wi) => (
                    <View key={`row-${wi}`} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space[1] }}>
                      {week.map((cell, ci) =>
                        cell ? (
                          <View
                            key={`cell-${wi}-${ci}`} ///// GETTING ERROR HERE WITH DUPLICATE KEYS WILL FIX IT WHEN ATTEMPTING IT NEXT TIME, AT ANY CASE DON't CHANGE THIS PART AND DONT REMOVE THIS COMMENT
                            style={{ width: `${100 / 7}%`, alignItems: "center", justifyContent: "center", gap: 2 }}
                          >
                            <Dot present={cell.present} size={16} />
                            <Text variant="caption" color="textMuted">{cell.day}</Text>
                          </View>
                        ) : (
                          <View
                            key={`${wi}-${ci}`}
                            style={{ width: `${100 / 7}%`, alignItems: "center", justifyContent: "center" }}
                          />
                        )
                      )}
                    </View>
                  ))}
                </Surface>

                <View style={{ flexDirection: "row", gap: space[5], marginTop: space[1] }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                    <Dot present size={14} />
                    <Text variant="caption" color="textMuted">Present</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space[2] }}>
                    <Dot present={false} size={14} />
                    <Text variant="caption" color="textMuted">Absent</Text>
                  </View>
                </View>
              </View>
            )}

            {/* === Attendance % + Completion % === */}
            <View style={{ flexDirection: "row", gap: space[3] }}>
              <Surface level={1} pad={4} radius="md" style={{ flex: 1, alignItems: "center", gap: space[2] }}>
                <Text variant="label" color="textMuted">Attendance</Text>
                <ProgressRing progress={attendancePercentage / 100} size={92} color="accent" />
              </Surface>
              <Surface level={1} pad={4} radius="md" style={{ flex: 1, alignItems: "center", gap: space[2] }}>
                <Text variant="label" color="textMuted">Completion</Text>
                <ProgressRing progress={completionPercentage / 100} size={92} color="success" />
              </Surface>
            </View>

            {/* ===== BMI ===== */}
            <Surface level={1} pad={4} radius="md" style={{ alignItems: "center", gap: space[1] }}>
              <Text variant="label" color="textMuted">BMI</Text>
              {bmiValue ? (
                <>
                  <Text variant="statLg">{bmiValue.toFixed(1)}</Text>
                  <Text variant="bodySm" color="textMuted">
                    {bmiValue < 18.5
                      ? "Underweight"
                      : bmiValue < 25
                        ? "Normal"
                        : bmiValue < 30
                          ? "Overweight"
                          : "Obese"}
                  </Text>
                </>
              ) : (
                <>
                  <Text variant="statLg">—</Text>
                  <Text variant="bodySm" color="textMuted">No BMI recorded</Text>
                </>
              )}
            </Surface>
          </>
        )}
      </View>
    </Sheet>
  );
}
