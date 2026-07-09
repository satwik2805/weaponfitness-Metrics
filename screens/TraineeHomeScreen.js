import React, { useState, useEffect, useMemo, useCallback } from "react";

import { View, Text, ScrollView, RefreshControl, Share } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from "../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../config/supabase";
import { IconButton, Text as UIText, useToast } from "../components/ui";
import TraineeHomeView from "./trainee/TraineeHomeView";

// Components
import WorkoutModal from "../components/WorkoutModal";
import FeedbackModal from "../components/FeedbackModal";
import QRScannerModal from "../components/QRScannerModal";
import AttendanceCalendarModal from "../components/AttendanceCalendarModal";
import TraineeDietModal from "../components/TraineeDietModal";
import SleepTrackingModal from '../components/SleepTrackingModal';
import NutritionTrackerModal from '../components/NutritionTrackerModal';
import { nutritionService } from '../services/nutritionService';
import WorkoutTracker from "../components/WorkoutTracker";
import WorkoutReminderSettings from "../components/WorkoutReminderSettings";
import LevelUpModal from "../components/LevelUpModal";
import { traineeService } from "../services/traineeService";
import { api } from "../config/apiClient";
import { motivationService } from "../services/motivationService";
import AnatomyView from "../components/AnatomyView";
import ConfettiCelebration from "../components/ConfettiCelebration";
import SpringSlideView from "../components/SpringSlideView";

export default function TraineeHomeScreen({ initialTab = 'home' }) {
  const { colors, toggleTheme, isDark } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  if (!colors) {
    return <View style={{ flex: 1, backgroundColor: '#0A0A0B' }} />;
  }


  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };


  const [traineeId, setTraineeId] = useState(null);
  const [groupId, setGroupId] = useState(null);

  const [userName, setUserName] = useState("User");
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [todayLabel, setTodayLabel] = useState("");

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [celebrationActive, setCelebrationActive] = useState(false);

  const [trainerInfo, setTrainerInfo] = useState(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [scanVisible, setScanVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const [subscription, setSubscription] = useState(null);
  const [dietVisible, setDietVisible] = useState(false);
  const [sleepVisible, setSleepVisible] = useState(false);
  const [nutritionVisible, setNutritionVisible] = useState(false);
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [motivation, setMotivation] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab); // 'home', 'workouts', 'notification', 'autonomy'
  const [checkedExercises, setCheckedExercises] = useState({});
  const [exerciseReps, setExerciseReps] = useState({});
  const [loggingWorkout, setLoggingWorkout] = useState(false);

  // Sync state with prop for robust navigation
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Reliable Session Initialization
  const fetchSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setTraineeId(session.user.id);
      return session.user.id;
    }
    return null;
  };

  const [gamification, setGamification] = useState({
    xp: 0,
    level: 1,
    next_level_xp: 100,
    progress: 0,
    xp_in_level: 0,
    xp_needed_for_level: 100
  });
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const firstLoad = React.useRef(true);


  const [profileImage, setProfileImage] = useState(null);
  const [planActive, setPlanActive] = useState(true);

  /* -----------------------------
      SHARE PROGRESS
  ------------------------------*/
  const onShare = async () => {
    try {
      const result = await Share.share({
        message: gamification.rewards?.shoutout || `🔥 Crushing it at Weapon Fitness! Level ${gamification.level} achieved!`,
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error) {
      toast.show(error.message || 'Could not share right now.', { kind: 'error' });
    }
  };

  /* -----------------------------
        Fetch Username
  ------------------------------*/
  const fetchUserName = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, profile_image")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      setUserName(data.full_name);
      setProfileImage(data.profile_image);
    }
  };

  /* -----------------------------
     ATTENDANCE VIA QR SCAN
  ------------------------------*/

  // Check-in via the ROTATING SIGNED QR: the scanned value is an HMAC token
  // from the front-desk display; the server verifies signature + time window
  // and derives the member from the JWT. (The old flow compared against a
  // static string and posted a client-chosen date — fully spoofable, WF-010.)
  const handleScan = async (qrValue) => {
    if (!planActive) {
      toast.show("Your membership is inactive — renew at the front desk to check in.", { kind: "warning" });
      return;
    }
    setScanVisible(false);

    try {
      const res = await api.post(`/attendance/checkin`, { token: qrValue });

      if (res?.status === "already_checked_in") {
        toast.show("You're already checked in for today.", { kind: "info" });
        return;
      }

      toast.show("Checked in — crush it today!", { kind: "success" });

      // optimistic ring update, then verify against the backend
      setGamification(prev => ({
        ...prev,
        consistency: {
          ...prev?.consistency,
          daily: {
            ...prev?.consistency?.daily,
            attendance_weekly_avg: Math.max((prev?.consistency?.daily?.attendance_weekly_avg || 0), 0.2),
            attendance: true
          },
          weekly: {
            ...prev?.consistency?.weekly,
            count: Math.max((prev?.consistency?.weekly?.count || 0), 1)
          }
        }
      }));
      setTimeout(() => {
        fetchGamification();
      }, 1500);
    } catch (error) {
      toast.show(error.message || "That code didn't work — try scanning again or ask the front desk.", { kind: "error" });
    }
  };

  /* -----------------------------
    FETCH TODAY’S WORKOUT PLAN
  ------------------------------*/
  const fetchTodaysWorkouts = async () => {
    const id = traineeId || (await fetchSession());
    if (!id) return;

    /* 1) GET GROUP */
    const { data: gm } = await supabase
      .from("trainee_group_members")
      .select("group_id")
      .eq("trainee_id", id)
      .maybeSingle();

    const groupId = gm?.group_id || null;
    setGroupId(groupId);

    const now = new Date();
    const dayOfMonth = now.getDate();
    // Support both casings (e.g. 'friday' and 'Friday')
    const weekdayTitle = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
    const weekdayLower = weekdayTitle.toLowerCase();
    const targetDays = [weekdayTitle, weekdayLower];

    setTodayLabel(weekdayTitle);

    /* --------------------------------------------------
       0️⃣ PRE-FETCH TODAY'S LOGS (to check completion)
    ----------------------------------------------------*/
    const todayStr = getTodayString();
    const { data: todayLogs } = await supabase
      .from("workout_logs")
      .select("id, workout_template_id, is_completed, notes")
      .eq("trainee_id", id)
      .eq("workout_date", todayStr);

    const completedTemplateIds = new Set(
      todayLogs?.filter(l => l.is_completed).map(l => l.workout_template_id) || []
    );
    const logIdMap = {};
    todayLogs?.forEach(l => {
      logIdMap[l.workout_template_id] = l.id;
    });

    // 📝 Re-populate checked exercises and reps from logs
    const logCheckedState = {};
    const logRepState = {};
    todayLogs?.forEach(log => {
      if (log.notes?.startsWith("CHECKED_EXERCISES_V2:")) {
        try {
          const data = JSON.parse(log.notes.replace("CHECKED_EXERCISES_V2:", ""));
          // data format: [{idx: 0, reps: 10}, {idx: 2, reps: 12}]
          data.forEach(item => {
            logCheckedState[`${log.workout_template_id}_${item.idx}`] = true;
            logRepState[`${log.workout_template_id}_${item.idx}`] = item.reps || 0;
          });
        } catch (e) {
          console.error("Error parsing logged exercises V2:", e);
        }
      } else if (log.notes?.startsWith("CHECKED_EXERCISES:")) {
        // Legacy support
        try {
          const indices = JSON.parse(log.notes.replace("CHECKED_EXERCISES:", ""));
          indices.forEach(idx => {
            logCheckedState[`${log.workout_template_id}_${idx}`] = true;
          });
        } catch (e) {
          console.error("Error parsing logged exercises:", e);
        }
      }
    });
    setCheckedExercises(prev => ({ ...prev, ...logCheckedState }));
    setExerciseReps(prev => ({ ...prev, ...logRepState }));

    /* --------------------------------------------------
        1️⃣ CHECK PERSONAL CUSTOM WEEKLY WORKOUT FIRST
    ----------------------------------------------------*/
    const { data: personal } = await supabase
      .from("custom_trainee_weekly_workouts")
      .select(`
      workout_templates (
        id,
        name,
        instructions,
        image_url,
        video_url
      )
    `)
      .eq("trainee_id", id)
      .in("day_name", targetDays);

    if (personal && personal.length > 0) {
      const mapped = personal.map((p) => ({
        ...p.workout_templates,
        isCompleted: completedTemplateIds.has(p.workout_templates.id),
        logId: logIdMap[p.workout_templates.id]
      }));
      // Deduplicate by ID
      const uniqueWorkouts = Array.from(new Map(mapped.map(item => [item.id, item])).values());
      setTodaysWorkouts(uniqueWorkouts);
      return;
    }

    /* --------------------------------------------------
        2️⃣ WEEKLY GROUP PLAN
    ----------------------------------------------------*/
    if (groupId) {
      const { data: weekly } = await supabase
        .from("group_weekly_workouts")
        .select(`
        workout_templates (
          id,
          name,
          instructions,
          image_url,
          video_url
        )
      `)
        .eq("group_id", groupId)
        .in("day_name", targetDays);

      if (weekly && weekly.length > 0) {
        const mapped = weekly.map((w) => ({
          ...w.workout_templates,
          isCompleted: completedTemplateIds.has(w.workout_templates.id),
          logId: logIdMap[w.workout_templates.id]
        }));
        // Deduplicate by ID
        const uniqueWorkouts = Array.from(new Map(mapped.map(item => [item.id, item])).values());
        setTodaysWorkouts(uniqueWorkouts);
        return;
      }
    }

    /* --------------------------------------------------
        3️⃣ MONTHLY GROUP PLAN (Fallback)
    ----------------------------------------------------*/
    if (groupId) {
      const { data: monthly } = await supabase
        .from("group_monthly_workouts")
        .select(`
        workout_templates (
          id,
          name,
          instructions,
          image_url,
          video_url
        )
      `)
        .eq("group_id", groupId)
        .eq("date_day", dayOfMonth);

      if (monthly && monthly.length > 0) {
        const mapped = monthly.map((m) => ({
          ...m.workout_templates,
          isCompleted: completedTemplateIds.has(m.workout_templates.id),
          logId: logIdMap[m.workout_templates.id]
        }));
        // Deduplicate by ID
        const uniqueWorkouts = Array.from(new Map(mapped.map(item => [item.id, item])).values());
        setTodaysWorkouts(uniqueWorkouts);
        return;
      }
    }

    // Every successful branch above returns — reaching here means no plan
    // matched today. (The old guard referenced block-scoped `weekly`/`monthly`
    // that don't exist for members without a group: ReferenceError on every
    // group-less account.)
    setTodaysWorkouts([]);
  };

  const toggleExercise = (workoutId, index) => {
    const key = `${workoutId}_${index}`;
    setCheckedExercises(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updateReps = (workoutId, index, delta) => {
    const key = `${workoutId}_${index}`;
    setExerciseReps(prev => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
    if (delta > 0) {
      setCheckedExercises(prev => ({ ...prev, [key]: true }));
    }
  };

  const handleFinishWorkout = async (workout) => {
    try {
      setLoggingWorkout(true);
      const { data: { session } } = await supabase.auth.getSession();
      const traineeId = session?.user?.id;
      if (!traineeId) return;

      const today = getTodayString();

      // Gather indices of checked exercises and their reps
      const sessionData = [];
      const exercises = workout.instructions ? workout.instructions.split('\n').filter(line => line.trim().length > 0) : [];
      exercises.forEach((_, idx) => {
        if (checkedExercises[`${workout.id}_${idx}`]) {
          sessionData.push({ idx, reps: exerciseReps[`${workout.id}_${idx}`] || 0 });
        }
      });

      const isUUID = (str) => {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(str);
      };

      const templateId = isUUID(workout.id) ? workout.id : null;

      const notesObj = {
        exercises: sessionData,
        source: "App",
        id_info: !templateId ? workout.id : null
      };

      const notes = sessionData.length > 0
        ? `CHECKED_EXERCISES_V2:${JSON.stringify(notesObj)}`
        : `Completed via App${!templateId ? ` | Exercise: ${workout.id}` : ""}`;

      console.log("📤 Logging workout:", {
        trainee_id: traineeId,
        workout_template_id: templateId,
        workout_date: today,
        is_completed: true,
        notes: notes
      });

      if (workout.logId) {
        // Update existing log
        await api.put(`/workout-logs/${workout.logId}`, {
          is_completed: true,
          notes: notes
        });
      } else {
        // Create new log
        const newLog = await api.post("/workout-logs/", {
          trainee_id: traineeId,
          workout_template_id: templateId,
          workout_date: today,
          duration_minutes: 60,
          auto_tracked: false,
          is_completed: true,
          notes: notes
        });
        // Assign new ID to local state for future updates
        workout.logId = newLog?.data?.id || newLog?.id;
      }

      setCelebrationActive(true);
      toast.show("Workout logged — nice work.", { kind: "success" });

      // Update local state to show completed immediately and store logId
      setTodaysWorkouts(prev => prev.map(w =>
        w.id === workout.id ? { ...w, isCompleted: true, logId: workout.logId } : w
      ));

      // Refresh stats
      fetchGamification();
    } catch (error) {
      console.error("Log workout error:", error);
      toast.show(error.message || "Couldn't log the workout. Please try again.", { kind: "error" });
    } finally {
      setLoggingWorkout(false);
    }
  };



  /* -----------------------------
        FETCH TRAINER
  ------------------------------*/
  const fetchTrainer = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const traineeId = session?.user?.id;

    const { data: traineeData } = await supabase
      .from("trainees")
      .select("trainer_id")
      .eq("id", traineeId)
      .maybeSingle();

    if (!traineeData?.trainer_id) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", traineeData.trainer_id)
      .single();

    setTrainerInfo({
      name: profile?.full_name || "Your Trainer",
      bio: "Certified Trainer",
    });
  };

  /* -----------------------------
       FETCH SUBSCRIPTION
  ------------------------------*/

  const fetchSubscription = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const traineeId = session?.user?.id;

    if (!traineeId) return;

    // Fetch active plan from trainee_plan table
    const { data: planRow, error: planErr } = await supabase
      .from("trainee_plan")
      .select(`
        plan_id,
        start_date,
        expiry_date,
        active_status,
        membership_plans (
          plan_name,
          duration_months,
          price
        )
      `)
      .eq("trainee_id", traineeId)
      .eq("active_status", true)
      .maybeSingle();

    if (planErr || !planRow) {
      setSubscription(null);
      return;
    }

    const plan = planRow.membership_plans;
    const expiry = new Date(planRow.expiry_date);
    const daysLeft = Math.max(0, Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)));

    setSubscription({
      planName: plan.plan_name,
      daysLeft,
      price: plan.price,
    });
  };


  const fetchGamification = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const traineeId = session?.user?.id;
      if (!traineeId) return;

      const data = await traineeService.getGamificationStats(traineeId);
      if (data) {
        // Prevent modal spam on first load
        if (firstLoad.current) {
          setGamification(data);
          firstLoad.current = false;
          return;
        }

        // Trigger LevelUp Modal if level increased
        // Trigger LevelUp Modal ONLY if level actually increased from a valid previous state
        if (gamification.level > 1 && data.level > gamification.level) {
          setLevelUpVisible(true);
        } else if (data.level >= 5 && (data.consistency?.weekly?.count === 5) && (gamification?.consistency?.weekly?.count < 5)) {
          // Special reward logic for Level 5 completion - only trigger when count BECOMES 5
          setLevelUpVisible(true);
        }
        setGamification(data);
      }
    } catch (err) {
    }
  };



  /* --- PULL TO REFRESH STATE --- */
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchUserName(),
      fetchTodaysWorkouts(),
      fetchTrainer(),
      fetchSubscription(),
      fetchMotivation(),
      fetchGamification(),
    ]).finally(() => setRefreshing(false));
  }, []);

  /* -----------------------------
          FETCH NUTRITION
  ------------------------------*/
  const fetchNutritionSummary = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      try {
        const summary = await nutritionService.getDailySummary(session.user.id);
        setNutritionSummary(summary);
      } catch (e) {
      }
    }
  };

  /* -----------------------------
          FETCH MOTIVATION
  ------------------------------*/
  const fetchMotivation = async () => {
    try {
      const data = await motivationService.getQuote();
      setMotivation(data);
    } catch (e) {
    }
  };

  /* -----------------------------
          USE EFFECT
  ------------------------------*/
  useEffect(() => {
    fetchSession();
    fetchUserName();
    fetchTodaysWorkouts();
    fetchTrainer();
    fetchSubscription();
    fetchNutritionSummary();
    fetchMotivation();
    fetchGamification();

    // 🔄 Auto-refresh workouts every 30 seconds to catch changes from backend
    // (e.g., when receptionist marks trainee absent)
    const interval = setInterval(() => {
      fetchTodaysWorkouts();
      fetchNutritionSummary();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // 🔄 Refresh data when screen comes into focus
  // This ensures workouts are updated if marked absent while viewing another screen
  useFocusEffect(
    useCallback(() => {
      fetchSession();
      fetchTodaysWorkouts();
      fetchNutritionSummary();
      fetchGamification();
      return () => { };
    }, [])
  );

  /* -----------------------------
          UI STARTS HERE
  ------------------------------*/

  const modals = (
    <>
      <WorkoutModal
        visible={modalVisible}
        data={selectedWorkout}
        onClose={() => setModalVisible(false)}
        isCompleted={selectedWorkout ? todaysWorkouts.find(w => w.id === selectedWorkout.id)?.isCompleted : false}
        checkedExercises={checkedExercises}
        exerciseReps={exerciseReps}
        onToggleExercise={toggleExercise}
        onUpdateReps={updateReps}
        onFinish={handleFinishWorkout}
        loggingWorkout={loggingWorkout}
      />
      <FeedbackModal visible={feedbackVisible} trainerInfo={trainerInfo} onClose={() => setFeedbackVisible(false)} />
      <QRScannerModal visible={scanVisible} onClose={() => setScanVisible(false)} onScan={handleScan} />
      <AttendanceCalendarModal visible={calendarVisible} onClose={() => setCalendarVisible(false)} />
      <TraineeDietModal visible={dietVisible} onClose={() => setDietVisible(false)} traineeId={traineeId} groupId={groupId} />
      <SleepTrackingModal
        visible={sleepVisible}
        onClose={() => {
          setSleepVisible(false);
          fetchGamification();
        }}
        traineeId={traineeId}
      />
      <NutritionTrackerModal visible={nutritionVisible} onClose={() => setNutritionVisible(false)} traineeId={traineeId} />
      <LevelUpModal visible={levelUpVisible} stats={gamification} onClose={() => setLevelUpVisible(false)} />
      <ConfettiCelebration active={celebrationActive} onComplete={() => setCelebrationActive(false)} />
    </>
  );

  if (activeTab === 'home') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TraineeHomeView
          userName={userName}
          profileImage={profileImage}
          gamification={gamification}
          todayLabel={todayLabel}
          todaysWorkouts={todaysWorkouts}
          planActive={planActive}
          subscription={subscription}
          trainerInfo={trainerInfo}
          motivation={motivation}
          nutritionSummary={nutritionSummary}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onShare={onShare}
          onToggleTheme={toggleTheme}
          onScanPress={() => setScanVisible(true)}
          onDietPress={() => setDietVisible(true)}
          onCalendarPress={() => setCalendarVisible(true)}
          onSleepPress={() => setSleepVisible(true)}
          onNutritionPress={() => setNutritionVisible(true)}
          onFeedbackPress={() => setFeedbackVisible(true)}
          onWorkoutPress={(w) => { setSelectedWorkout(w); setModalVisible(true); }}
          onRenewPress={() => toast.show('Renewals are handled at the front desk — see you there.', { kind: 'info' })}
        />
        {modals}
      </View>
    );
  }

  const tabTitle = activeTab === 'workouts' ? 'Workout' : activeTab === 'anatomy' ? 'Anatomy' : 'Reminders';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
          <UIText variant="h1">{tabTitle}</UIText>
          <IconButton icon={isDark ? 'sunny-outline' : 'moon-outline'} variant="ghost" accessibilityLabel="Toggle theme" onPress={toggleTheme} />
        </View>

        <SpringSlideView activeKey={activeTab}>
          {activeTab === 'anatomy' && <AnatomyView />}

          {activeTab === 'workouts' && traineeId && (
            <View style={{ gap: 32 }}>
              <View>
                <UIText variant="h3" style={{ paddingHorizontal: 20, marginBottom: 16 }}>Anatomy Explorer</UIText>
                <AnatomyView />
              </View>
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 }}>
                <WorkoutTracker traineeId={traineeId} todaysWorkouts={todaysWorkouts} />
              </View>
            </View>
          )}

          {activeTab === 'reminders' && traineeId && <WorkoutReminderSettings traineeId={traineeId} />}
        </SpringSlideView>
      </ScrollView>

      {modals}
    </View>
  );
}
