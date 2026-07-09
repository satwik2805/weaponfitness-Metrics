import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl, Dimensions, Animated, Easing, Platform, Share } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path, Rect, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from "../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { supabase } from "../config/supabase";

// Components
import ListItem from "../components/ListItem";
import WorkoutModal from "../components/WorkoutModal";
import FeedbackModal from "../components/FeedbackModal";
import QRScannerModal from "../components/QRScannerModal";
import AttendanceCalendarModal from "../components/AttendanceCalendarModal";
import TraineeDietModal from "../components/TraineeDietModal";
import SleepTrackingModal from '../components/SleepTrackingModal';
import NutritionTrackerModal from '../components/NutritionTrackerModal';
import { nutritionService } from '../services/nutritionService';
import { attendanceService } from '../services/attendanceService';
import WorkoutTracker from "../components/WorkoutTracker";
import WorkoutReminderSettings from "../components/WorkoutReminderSettings";
import LevelUpModal from "../components/LevelUpModal";
import ThemeToggle from "../components/ThemeToggle";
import { traineeService } from "../services/traineeService";
import { checkRateLimit } from "../utils/rateLimiter";
import axios from 'axios';
import API_URL from '../config/api';
import { motivationService } from "../services/motivationService";

export default function TraineeHomeScreen() {
  const { colors } = useTheme();

  if (!colors) {
    return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>Loading...</Text></View>;
  }

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [traineeId, setTraineeId] = useState(null);
  const [groupId, setGroupId] = useState(null);

  const [userName, setUserName] = useState("User");
  const [todaysWorkouts, setTodaysWorkouts] = useState([]);
  const [todayLabel, setTodayLabel] = useState("");

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [trainerInfo, setTrainerInfo] = useState(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const [scanVisible, setScanVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const [subscription, setSubscription] = useState(null);
  const [streak, setStreak] = useState(0);
  const [dietVisible, setDietVisible] = useState(false);
  const [sleepVisible, setSleepVisible] = useState(false);
  const [nutritionVisible, setNutritionVisible] = useState(false);
  const [nutritionSummary, setNutritionSummary] = useState(null);
  const [motivation, setMotivation] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'workouts', 'reminders'
  const [gamification, setGamification] = useState({
    xp: 0,
    level: 1,
    next_level_xp: 100,
    progress: 0,
    xp_in_level: 0,
    xp_needed_for_level: 100
  });
  const [levelUpVisible, setLevelUpVisible] = useState(false);


  const [profileImage, setProfileImage] = useState(null);
  const [planActive, setPlanActive] = useState(true);

  /* -----------------------------
      SHARE PROGRESS
  ------------------------------*/
  const onShare = async () => {
    try {
      const result = await Share.share({
        message: gamification.rewards?.shoutout || `≡ƒöÑ Crushing it at Weapon Fitness! Level ${gamification.level} achieved!`,
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
      alert(error.message);
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

  const markAttendanceApi = async (traineeId) => {
    try {
      // Use today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      const response = await axios.post(`${API_URL}/attendance/`, {
        trainee_id: traineeId,
        attendance_date: today,
        is_present: true
      });

      console.log("Attendance marked:", response.data);
      alert("Attendance marked successfully! Workout log created.");
      fetchTodaysWorkouts(); // Refresh to show workout
      fetchStreak();
      fetchGamification();
    } catch (error) {
      console.error("Attendance API error:", error);
      if (error.response) {
        alert(`Failed: ${error.response.data.detail || "Error marking attendance"}`);
      } else {
        alert("Failed to connect to server");
      }
    }
  };

  const handleScan = async (qrValue) => {
    console.log("Scanned QR Value:", qrValue);

    if (!planActive) {
      alert("Your membership is inactive. Please renew to mark attendance.");
      return;
    }
    setScanVisible(false);

    if (qrValue !== "ATTENDANCE_GATE_QR") {
      alert("Invalid QR Code");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    // Fetch the actual trainee ID from the trainees table
    const { data: traineeData } = await supabase
      .from('trainees')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!traineeData?.id) {
      alert('Trainee profile not found. Please contact support.');
      return;
    }

    // Call backend API instead of direct Supabase insert
    await markAttendanceApi(traineeData.id);
  };

  // DEBUG: Simulate Check-in without QR
  const simulateCheckIn = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      // Fetch the actual trainee ID from the trainees table
      const { data: traineeData } = await supabase
        .from('trainees')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (traineeData?.id) {
        await markAttendanceApi(traineeData.id);
      } else {
        alert('Trainee profile not found. Please contact support.');
      }
    }
  };

  /* -----------------------------
    FETCH TODAYΓÇÖS WORKOUT PLAN
  ------------------------------*/
  const fetchTodaysWorkouts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const traineeId = session?.user?.id;
    // ... rest of function ... we're replacing up to line 144 so I need to match the start of fetchTodaysWorkouts
    setTraineeId(traineeId);
    if (!traineeId) return;

    /* 1) GET GROUP */
    const { data: gm } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("trainee_id", traineeId)
      .maybeSingle();

    const groupId = gm?.group_id || null;
    setGroupId(groupId);

    const now = new Date();
    const dayOfMonth = now.getDate();
    const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][now.getDay()];
    setTodayLabel(weekday.charAt(0).toUpperCase() + weekday.slice(1));

    /* --------------------------------------------------
        1∩╕ÅΓâú CHECK PERSONAL CUSTOM WEEKLY WORKOUT FIRST
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
      .eq("trainee_id", traineeId)
      .eq("day_name", weekday);

    if (personal && personal.length > 0) {
      console.log("PERSONAL WORKOUT ACTIVE");
      setTodaysWorkouts(personal.map((p) => p.workout_templates));
      return;
    }

    /* --------------------------------------------------
        2∩╕ÅΓâú WEEKLY GROUP PLAN
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
        .eq("day_name", weekday);

      if (weekly && weekly.length > 0) {
        console.log("GROUP WEEKLY ACTIVE");
        setTodaysWorkouts(weekly.map((w) => w.workout_templates));
        return;
      }
    }

    /* --------------------------------------------------
        3∩╕ÅΓâú MONTHLY GROUP PLAN (Fallback)
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
        console.log("GROUP MONTHLY ACTIVE");
        setTodaysWorkouts(monthly.map((m) => m.workout_templates));
        return;
      }
    }

    /* No workouts found */
    setTodaysWorkouts([]);
  };



  /* -----------------------------
        FETCH TRAINER
  ------------------------------*/
  const fetchTrainer = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const traineeId = session?.user?.id;

    const { data: trainee } = await supabase
      .from("trainees")
      .select("trainer_id")
      .eq("id", traineeId)
      .maybeSingle();

    if (!trainee?.trainer_id) return;

    const trainerId = trainee.trainer_id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", trainerId)
      .single();

    setTrainerInfo({
      id: trainerId,
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
      console.log("No active plan found");
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
    const { data: { session } } = await supabase.auth.getSession();
    const traineeId = session?.user?.id;
    if (!traineeId) return;

    try {
      const response = await traineeService.getGamificationStats(traineeId);
      console.log("≡ƒÄ« FULL GAMIFICATION DATA:", JSON.stringify(response, null, 2));
      const newStats = response || { xp: 0, level: 1, progress: 0 };

      // Check if level increased
      if (gamification.level > 0 && newStats.level > gamification.level) {
        setLevelUpVisible(true);
      }

      setGamification(newStats);
    } catch (error) {
      console.error("Error fetching gamification stats:", error);
    }
  };


  /* -----------------------------
         FETCH STREAK
  ------------------------------*/
  const fetchStreak = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const traineeId = session?.user?.id;

    const { data } = await supabase
      .from("attendance")
      .select("date")
      .eq("trainee_id", traineeId)
      .order("date", { ascending: false });

    if (!data?.length) {
      setStreak(0);
      return;
    }

    const dates = data.map((a) => new Date(a.date));
    let count = 1;
    let current = new Date();

    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i];
      const diff = Math.floor((current - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        count++;
        current = prev;
      } else break;
    }

    setStreak(count);
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
      fetchStreak(),
      fetchMotivation(),
      fetchNutritionSummary(),
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
        console.log("Error fetching nutrition summary", e);
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
      console.log("Error fetching motivation", e);
    }
  };

  /* -----------------------------
          USE EFFECT
  ------------------------------*/
  useEffect(() => {
    fetchUserName();
    fetchTodaysWorkouts();
    fetchTrainer();
    fetchSubscription();
    fetchStreak();
    fetchNutritionSummary();
    fetchMotivation();
    fetchGamification();

    // ≡ƒöä Auto-refresh workouts every 30 seconds to catch changes from backend
    // (e.g., when receptionist marks trainee absent)
    const interval = setInterval(() => {
      console.log("ΓÅ░ Auto-refreshing workouts...");
      fetchTodaysWorkouts();
      fetchNutritionSummary();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // ≡ƒöä Refresh data when screen comes into focus
  // This ensures workouts are updated if marked absent while viewing another screen
  useFocusEffect(
    useCallback(() => {
      console.log("≡ƒô▒ TraineeHomeScreen focused - refreshing data");
      fetchTodaysWorkouts();
      fetchNutritionSummary();
      fetchGamification();
      return () => { };
    }, [])
  );

  /* -----------------------------
          UI STARTS HERE
  ------------------------------*/

  console.log("RENDER GAMIFICATION STATE:", gamification);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >

        {/* Welcome Header */}
        <View style={styles.heroRow}>
          {/* Left Side Text */}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Welcome back,</Text>
            <Text style={styles.heroName}>{userName}</Text>

            <View style={styles.streakBox}>
              <FontAwesome5 name="fire" size={20} color="#ffae00" />
              <Text style={styles.streakText}>{streak} Day Streak</Text>
              <View style={[styles.levelMiniBadge, { marginLeft: 10 }]}>
                <Text style={styles.levelMiniText}>Lvl {gamification.level}</Text>
              </View>
            </View>
          </View>

          {/* Right Side */}
          <View style={{ alignItems: 'flex-end', gap: 10 }}>
            <Image
              source={{
                uri: profileImage || "https://i.imgur.com/ExdKOOz.png"
              }}
              style={styles.profilePic}
            />
            <ThemeToggle />
          </View>
        </View>

        {/* Premium Tactical Daily Trifecta HUD (Elite Version) */}
        <View style={styles.hudContainer}>
          <View style={styles.hudHeaderBox}>
            <LinearGradient
              colors={['rgba(211,47,47,0.2)', 'transparent']}
              style={styles.hudHeaderGlow}
            />
            <Text style={styles.hudTitleText}>DAILY TRIFECTA</Text>
          </View>

          <View style={styles.eliteCircleRow}>
            {/* GYM CIRCLE */}
            <View style={styles.eliteCircleWrapper}>
              <View style={styles.svgContainer}>
                <Svg height="85" width="85" viewBox="0 0 100 100">
                  <Defs>
                    <SvgGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FF1744" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#D50000" stopOpacity="1" />
                    </SvgGradient>
                  </Defs>
                  {/* Layered Cyber Glow - GYM */}
                  <Circle cx="50" cy="50" r="44" stroke="rgba(255,23,68,0.05)" strokeWidth="8" fill="none" />

                  {/* Glowing Aura Rings */}
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="#FF1744"
                    strokeWidth="4"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.attendance_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.15}
                  />
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="#FF1744"
                    strokeWidth="2"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.attendance_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.3}
                  />

                  {/* High Intensity Core Ring */}
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="url(#gradRed)"
                    strokeWidth="2.5"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.attendance_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <View style={styles.circleInnerContent}>
                  <Feather name="shield" size={12} color={gamification.consistency?.daily?.attendance_weekly_avg > 0 ? "#FF1744" : "rgba(255,255,255,0.1)"} />
                  <Text style={[styles.circlePercent, { color: gamification.consistency?.daily?.attendance_weekly_avg > 0 ? "#FF1744" : "rgba(255,255,255,0.2)" }]}>
                    {Math.round((gamification.consistency?.daily?.attendance_weekly_avg || 0) * 100)}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.eliteLabel, gamification.consistency?.daily?.attendance && { color: "#FF1744" }]}>GYM</Text>
            </View>

            {/* WORKOUT CIRCLE */}
            <View style={styles.eliteCircleWrapper}>
              <View style={styles.svgContainer}>
                <Svg height="85" width="85" viewBox="0 0 100 100">
                  <Defs>
                    <SvgGradient id="gradGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FFD600" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#FFAB00" stopOpacity="1" />
                    </SvgGradient>
                  </Defs>
                  <Circle cx="50" cy="50" r="44" stroke="rgba(255,214,0,0.05)" strokeWidth="8" fill="none" />

                  {/* Glowing Aura Rings */}
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="#FFD600"
                    strokeWidth="4"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.workout_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.15}
                  />
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="#FFD600"
                    strokeWidth="2"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.workout_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.3}
                  />

                  {/* Core Content */}
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="url(#gradGold)"
                    strokeWidth="2.5"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.workout_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <View style={styles.circleInnerContent}>
                  <FontAwesome6 name="dumbbell" size={10} color={gamification.consistency?.daily?.workout_weekly_avg > 0 ? "#FFD600" : "rgba(255,255,255,0.1)"} />
                  <Text style={[styles.circlePercent, { color: gamification.consistency?.daily?.workout_weekly_avg > 0 ? "#FFD600" : "rgba(255,255,255,0.2)" }]}>
                    {Math.round((gamification.consistency?.daily?.workout_weekly_avg || 0) * 100)}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.eliteLabel, gamification.consistency?.daily?.workout && { color: "#FFD600" }]}>WORKOUT</Text>
            </View>

            {/* SLEEP CIRCLE */}
            <View style={styles.eliteCircleWrapper}>
              <View style={styles.svgContainer}>
                <Svg height="85" width="85" viewBox="0 0 100 100">
                  <Defs>
                    <SvgGradient id="gradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#00E5FF" stopOpacity="1" />
                      <Stop offset="100%" stopColor="#00B0FF" stopOpacity="1" />
                    </SvgGradient>
                  </Defs>
                  <Circle cx="50" cy="50" r="44" stroke="rgba(0,229,255,0.05)" strokeWidth="8" fill="none" />

                  {/* Glowing Aura Rings */}
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="#00E5FF"
                    strokeWidth="4"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.sleep_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.15}
                  />
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="#00E5FF"
                    strokeWidth="2"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.sleep_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.3}
                  />

                  {/* Core Ring */}
                  <Circle
                    cx="50" cy="50" r="42"
                    stroke="url(#gradCyan)"
                    strokeWidth="2.5"
                    strokeDasharray="264"
                    strokeDashoffset={264 - (264 * (gamification.consistency?.daily?.sleep_weekly_avg || 0))}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <View style={styles.circleInnerContent}>
                  <Feather name="moon" size={12} color={gamification.consistency?.daily?.sleep_weekly_avg > 0 ? "#00E5FF" : "rgba(255,255,255,0.1)"} />
                  <Text style={[styles.circlePercent, { color: gamification.consistency?.daily?.sleep_weekly_avg > 0 ? "#00E5FF" : "rgba(255,255,255,0.2)" }]}>
                    {Math.round((gamification.consistency?.daily?.sleep_weekly_avg || 0) * 100)}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.eliteLabel, gamification.consistency?.daily?.sleep && { color: "#00E5FF" }]}>SLEEP</Text>
            </View>
          </View>

          <View style={styles.weeklyNodeTracker}>
            <Text style={styles.weeklyNodeTitle}>7-DAY CONSISTENCY</Text>
            <View style={styles.nodeLineContainer}>
              <View style={styles.connectingLine} />
              <View style={[styles.progressLine, { width: `${Math.min((gamification.consistency?.weekly?.count || 0) * 16.66, 100)}%` }]} />
              <View style={styles.nodeRow}>
                {(gamification.consistency?.weekly?.days || []).map((d, i) => (
                  <View key={i} style={styles.nodeWrapper}>
                    <View style={[styles.nodeCircle, d.is_met && styles.nodeCircleActive]}>
                      {d.is_met && <View style={styles.nodeGlow} />}
                      <View style={[styles.nodeInner, d.is_met && styles.nodeInnerActive]} />
                    </View>
                    <Text style={styles.nodeDayText}>{d.day.charAt(0)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.milestoneFooter}>
            <Text style={styles.milestoneFooterText}>
              MISSION STATUS: {Math.round((gamification.consistency?.weekly?.count || 0) * 20)}% ({gamification.consistency?.weekly?.count || 0}/5 DAYS) ACHIEVED
            </Text>
          </View>
        </View>

        {/* Tactical Mission Progress HUD */}
        <View style={styles.xpCard}>
          <View style={styles.xpTextRow}>
            <View>
              <Text style={styles.xpLevelLabel}>CURRENT RANK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={styles.xpLevelValue}>Lvl {gamification.level}</Text>
                {gamification.level_locked && (
                  <View style={styles.promoBadge}>
                    <FontAwesome5 name="bolt" size={10} color="#FFD700" />
                    <Text style={styles.promoBadgeText}>EVOLUTION READY</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.xpTotalText}>
                {Math.round((gamification.xp_in_level || 0) / 100)} / 5
              </Text>
              <Text style={styles.xpTotalLabel}>DAYS COMPLETED</Text>
            </View>
          </View>

          <View style={styles.missionTrack}>
            <LinearGradient
              colors={gamification.level_locked ? ['#FFD700', '#FFA500'] : [colors.accent, '#FF1744']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.missionBar, { width: `${Math.min((gamification.progress || 0) * 100, 100)}%` }]}
            />
            {gamification.level_locked && <View style={styles.barGlow} />}
          </View>

          {gamification.level_locked ? (
            <Text style={styles.missionPeakText}>
              MISSION PEAK REACHED. Hold your streak to evolve to Level {gamification.level + 1}!
            </Text>
          ) : (
            <Text style={styles.missionHint}>
              {5 - Math.round((gamification.xp_in_level || 0) / 100)} more Trifecta days to Level Up
            </Text>
          )}
        </View>

        {/* Motivation Card */}
        {motivation && (
          <View style={styles.motivationCard}>
            <View style={styles.motivationIcon}>
              <FontAwesome5 name="medal" size={24} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.motivationGreeting}>{motivation.greeting}</Text>
              <Text style={styles.motivationQuote}>{motivation.quote}</Text>
            </View>
          </View>
        )}






        {/* Home Content */}
        {
          <>
            {/* Today Header + Workout Container */}
            <View style={styles.workoutContainer}>

              {/* Header inside container */}
              <Text style={styles.workoutContainerTitle}>
                TodayΓÇÖs {todayLabel}
              </Text>

              {/* No workouts */}
              {!planActive ? (
                <Text style={styles.noWorkoutsMsg}>
                  Membership inactive ΓÇö workouts unavailable.
                </Text>
              ) : todaysWorkouts.length === 0 ? (
                <Text style={styles.noWorkoutsMsg}>No workouts assigned today.</Text>
              ) : (
                todaysWorkouts.map((w) => (
                  <TouchableOpacity
                    key={w.id}
                    style={styles.workoutItem}
                    onPress={() => {
                      setSelectedWorkout(w);
                      setModalVisible(true);
                    }}
                  >
                    <FontAwesome6 name="dumbbell" size={20} color={colors.accent} />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.workoutTitle}>{w.name}</Text>
                      <Text style={styles.workoutSub}>
                        {w.instructions
                          ? w.instructions.substring(0, 40) + "..."
                          : "View details"}
                      </Text>
                    </View>

                    <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))
              )}

            </View>


            {/* Diet Plan */}
            <Text style={styles.sectionHeader}>Diet Plan</Text>
            <ListItem
              icon="coffee"
              title="View Diet Plan"
              subtitle="Today's recommended meals"
              onPress={() => setDietVisible(true)}
            />

            {/* Attendance */}
            <Text style={styles.sectionHeader}>Attendance</Text>
            <ListItem icon="camera" title="Scan QR Code" onPress={() => setScanVisible(true)} />
            <ListItem icon="calendar" title="View Attendance Calendar" onPress={() => setCalendarVisible(true)} />

            {/* DEBUG: Temporary button for testing */}
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                padding: 12,
                borderRadius: 12,
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(211, 47, 47, 0.2)'
              }}
              onPress={simulateCheckIn}
            >
              <Feather name="cpu" size={18} color="#D32F2F" style={{ marginRight: 8 }} />
              <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Simulate Check-in (Dev)</Text>
            </TouchableOpacity>

            {/* Sleep Tracking */}
            <Text style={styles.sectionHeader}>Sleep Tracking</Text>
            <ListItem
              icon="moon"
              title="Log Last Night's Sleep"
              subtitle="Track hours, quality and depth"
              onPress={() => setSleepVisible(true)}
            />

            {/* Nutrients & Calories */}
            <Text style={styles.sectionHeader}>Nutrients & Calories</Text>
            <TouchableOpacity
              style={styles.nutritionSummaryCard}
              onPress={() => setNutritionVisible(true)}
            >
              <View style={styles.nutritionMain}>
                <View style={styles.nutritionInfo}>
                  <Text style={styles.nutritionTitle}>Total Calories</Text>
                  <Text style={styles.nutritionValue}>
                    {Math.round(nutritionSummary?.total_calories || 0)}
                    <Text style={styles.nutritionUnit}> / {Math.round(nutritionSummary?.goals?.daily_calories || 2000)} kcal</Text>
                  </Text>
                </View>
                <FontAwesome6 name="fire-flame-curved" size={24} color={colors.accent} />
              </View>

              <View style={styles.macroStrip}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: '#FF3B30' }]}>PROTEIN</Text>
                  <Text style={styles.macroVal}>{Math.round(nutritionSummary?.total_protein || 0)}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: '#4CD964' }]}>CARBS</Text>
                  <Text style={styles.macroVal}>{Math.round(nutritionSummary?.total_carbs || 0)}g</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: '#5856D6' }]}>FATS</Text>
                  <Text style={styles.macroVal}>{Math.round(nutritionSummary?.total_fats || 0)}g</Text>
                </View>
              </View>

              <View style={styles.nutritionFooter}>
                <TouchableOpacity
                  style={styles.prominentLogBtn}
                  onPress={() => setNutritionVisible(true)}
                >
                  <Feather name="plus-circle" size={16} color={colors.primary} />
                  <Text style={styles.prominentLogText}>Log Meal & Macros</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Trainer */}
            <Text style={styles.sectionHeader}>Your Trainer</Text>
            {trainerInfo ? (
              <>
                <ListItem icon="user" title={trainerInfo.name} subtitle={trainerInfo.bio} />
                <ListItem icon="message-circle" title="Send Feedback" onPress={() => setFeedbackVisible(true)} />
              </>
            ) : (
              <Text style={styles.noWorkouts}>No trainer assigned.</Text>
            )}

            {/* Subscription */}
            <Text style={styles.sectionHeader}>Subscription</Text>
            {!planActive ? (
              <ListItem
                icon="alert-triangle"
                title="Membership Inactive"
                subtitle="Please renew to continue using the app"
              />
            ) : subscription ? (
              <>
                <ListItem
                  icon="star"
                  title={`${subscription.planName}`}
                  subtitle={`${subscription.daysLeft} days left`}
                />
                {subscription.daysLeft < 5 && (
                  <TouchableOpacity
                    style={styles.buyBtn}
                    onPress={() => alert("Renew Subscription")}
                  >
                    <Feather name="refresh-ccw" size={18} color={colors.primary} />
                    <Text style={styles.buyBtnText}>Renew Subscription</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={styles.noWorkouts}>No active membership.</Text>

                <TouchableOpacity
                  style={styles.buyBtn}
                  onPress={() => {
                    // navigate to your purchase screen OR open modal
                    alert("Buy Subscription Clicked!");
                  }}
                >
                  <Feather name="shopping-cart" size={18} color={colors.primary} />
                  <Text style={styles.buyBtnText}>Buy Subscription</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        }
      </ScrollView>

      {/* All Modals */}
      <WorkoutModal visible={modalVisible} data={selectedWorkout} onClose={() => setModalVisible(false)} />
      <FeedbackModal visible={feedbackVisible} trainerInfo={trainerInfo} onClose={() => setFeedbackVisible(false)} />
      {/* <QRScannerModal visible={scanVisible} onClose={() => setScanVisible(false)} onScan={handleQRScan} /> */}
      <QRScannerModal visible={scanVisible} onClose={() => setScanVisible(false)} onScan={handleScan} />
      <AttendanceCalendarModal visible={calendarVisible} onClose={() => setCalendarVisible(false)} />
      <TraineeDietModal visible={dietVisible} onClose={() => setDietVisible(false)} traineeId={traineeId} groupId={groupId} />
      <SleepTrackingModal
        visible={sleepVisible}
        onClose={() => {
          setSleepVisible(false);
          fetchGamification(); // Refresh stats after logging sleep
        }}
        traineeId={traineeId}
      />
      <NutritionTrackerModal visible={nutritionVisible} onClose={() => setNutritionVisible(false)} traineeId={traineeId} />
      <LevelUpModal visible={levelUpVisible} stats={gamification} onClose={() => setLevelUpVisible(false)} />

    </SafeAreaView>
  );
}
//const styles = StyleSheet.create({
const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 160,
  },


  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  heroTitle: {
    color: colors.textSecondary,
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  heroName: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: "900",
    marginTop: -4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    backgroundColor: "rgba(255,170,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    width: "auto",
    alignSelf: "flex-start",
  },
  streakText: {
    color: "#ffae00",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 14,
  },

  /* Today Banner */
  dayBanner: {
    backgroundColor: colors.accent,
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  dayBannerText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },

  /* Workout Cards */
  workoutTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  workoutSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  noWorkouts: {
    color: colors.textSecondary,
    marginBottom: 10,
  },

  sectionHeader: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 25,
    marginBottom: 12,
    letterSpacing: 0.5,
    paddingLeft: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },



  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.accent,
    marginLeft: 12,
  },
  motivationCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  motivationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 170, 0, 0.1)", // Using a semi-transparent accent-colored bg
    alignItems: "center",
    justifyContent: "center",
  },
  motivationGreeting: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  motivationQuote: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },

  workoutContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },

  workoutContainerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },

  noWorkoutsMsg: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 10,
  },

  workoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },

  /* Nutrition Summary Card */
  nutritionSummaryCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nutritionMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  nutritionInfo: {
    flex: 1,
  },
  nutritionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  nutritionValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  nutritionUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  macroStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 12,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "900",
  },
  macroVal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  nutritionFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    alignItems: "center",
  },
  prominentLogBtn: {
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  prominentLogText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },

  buyBtnText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 16,
  },

  levelMiniBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelMiniText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
  },

  xpCard: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  xpCardLocked: {
    opacity: 0.8,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    borderWidth: 1.5,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpLevelLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  xpLevelValue: {
    color: colors.accent,
    fontSize: 28,
    fontWeight: '900',
    marginTop: -2,
  },
  xpTotalText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  xpTotalLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  progressContainer: {
    height: 12,
    backgroundColor: colors.inputBackground,
    borderRadius: 6,
    marginVertical: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTrack: {
    flex: 1,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  xpFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpRemainingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Elite Tactical HUD Redesign */
  hudContainer: {
    backgroundColor: '#0c0c0c',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(211,47,47,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  hudHeaderBox: {
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(211,47,47,0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  hudHeaderGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  hudTitleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
  },
  eliteCircleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    marginBottom: 30,
  },
  eliteCircleWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  svgContainer: {
    width: 85,
    height: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercent: {
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  eliteLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.5,
  },
  weeklyNodeTracker: {
    marginBottom: 20,
  },
  weeklyNodeTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  promoBadgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  missionTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 5,
    marginTop: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  missionBar: {
    height: '100%',
    borderRadius: 5,
  },
  barGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 5,
  },
  missionPeakText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  missionHint: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nodeLineContainer: {
    paddingHorizontal: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  connectingLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    left: 25,
    right: 25,
    top: 16,
  },
  progressLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#FF1744',
    left: 25,
    top: 16,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  nodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nodeWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  nodeCircleActive: {
    borderColor: '#FF1744',
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  nodeGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF1744',
    opacity: 0.6,
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  nodeInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  nodeInnerActive: {
    backgroundColor: '#FF1744',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nodeDayText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.2)',
  },
  milestoneFooter: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  milestoneFooterText: {
    color: '#FF1744',
    fontSize: 11,
    fontWeight: '950',
    letterSpacing: 2,
    textShadowColor: 'rgba(255,23,68,0.3)',
    textShadowRadius: 4,
  },

  /* Rewards Section */
  rewardsBox: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  rewardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardSub: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  rewardTitle: {
    color: '#000',
    fontSize: 24,
    fontWeight: '900',
  },
  bonusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  bonusLabel: {
    color: 'rgba(0,0,0,0.5)',
    fontSize: 10,
    fontWeight: '800',
  },
  bonusCode: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bonusBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bonusBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shareButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },

  // Removed old xpBox styles as they are replaced by xpCard

  // Tab Navigation Styles
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.accent,
    fontWeight: "800",
  },
});
