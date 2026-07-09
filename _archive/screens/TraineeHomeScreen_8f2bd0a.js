import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl } from "react-native";
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
import SleepTrackingModal from "../components/SleepTrackingModal";
import WorkoutTracker from "../components/WorkoutTracker";
import WorkoutReminderSettings from "../components/WorkoutReminderSettings";
import ThemeToggle from "../components/ThemeToggle";
import { checkRateLimit } from "../utils/rateLimiter";
import axios from 'axios';
import API_URL from '../config/api';

export default function TraineeHomeScreen() {
  const { colors } = useTheme();
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
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'workouts', 'reminders'


  const [profileImage, setProfileImage] = useState(null);
  const [planActive, setPlanActive] = useState(true);

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
      .single();

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
    const traineeId = session?.user?.id;

    if (!traineeId) return;

    // Call backend API instead of direct Supabase insert
    await markAttendanceApi(traineeId);
  };

  // DEBUG: Simulate Check-in without QR
  const simulateCheckIn = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await markAttendanceApi(session.user.id);
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
      .single();

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
      .single();

    if (!trainee?.trainer_id) return;

    const trainerId = trainee.trainer_id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", trainerId)
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
      .single();

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
    ]).finally(() => setRefreshing(false));
  }, []);

  /* -----------------------------
          USE EFFECT
  ------------------------------*/
  useEffect(() => {
    fetchUserName();
    fetchTodaysWorkouts();
    fetchTrainer();
    fetchSubscription();
    fetchStreak();

    // ≡ƒöä Auto-refresh workouts every 30 seconds to catch changes from backend
    // (e.g., when receptionist marks trainee absent)
    const interval = setInterval(() => {
      console.log("ΓÅ░ Auto-refreshing workouts...");
      fetchTodaysWorkouts();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // ≡ƒöä Refresh data when screen comes into focus
  // This ensures workouts are updated if marked absent while viewing another screen
  useFocusEffect(
    useCallback(() => {
      console.log("≡ƒô▒ TraineeHomeScreen focused - refreshing workouts");
      fetchTodaysWorkouts();
      return () => { };
    }, [])
  );

  /* -----------------------------
          UI STARTS HERE
  ------------------------------*/

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 160 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >

        {/* Premium Welcome Header */}
        <View style={styles.heroRow}>

          {/* Left Side Text */}
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Welcome back,</Text>
            <Text style={styles.heroName}>{userName}</Text>

            <View style={styles.streakBox}>
              <FontAwesome5 name="fire" size={20} color="#ffae00" />
              <Text style={styles.streakText}>{streak} Day Streak</Text>
            </View>
          </View>

          {/* Right Side Profile Image and Theme Toggle */}
          <View style={{ alignItems: 'flex-end', gap: 10 }}>
            <Image
              source={{
                uri:
                  profileImage ||
                  "https://i.imgur.com/ExdKOOz.png", // fallback avatar
              }}
              style={styles.profilePic}
            />
            <ThemeToggle />
          </View>

        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'home' && styles.activeTab]}
            onPress={() => setActiveTab('home')}
          >
            <Feather
              name="home"
              size={20}
              color={activeTab === 'home' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'home' && styles.activeTabText]}>
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'workouts' && styles.activeTab]}
            onPress={() => setActiveTab('workouts')}
          >
            <FontAwesome6
              name="dumbbell"
              size={18}
              color={activeTab === 'workouts' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'workouts' && styles.activeTabText]}>
              Workouts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'reminders' && styles.activeTab]}
            onPress={() => setActiveTab('reminders')}
          >
            <Feather
              name="bell"
              size={20}
              color={activeTab === 'reminders' ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'reminders' && styles.activeTabText]}>
              Reminders
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content - Home */}
        {activeTab === 'home' && (
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
                backgroundColor: '#FFEBEE',
                padding: 12,
                borderRadius: 12,
                marginTop: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#FFCDD2'
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
        )}

        {/* Tab Content - Workouts */}
        {activeTab === 'workouts' && traineeId && (
          <WorkoutTracker traineeId={traineeId} />
        )}

        {/* Tab Content - Reminders */}
        {activeTab === 'reminders' && traineeId && (
          <WorkoutReminderSettings traineeId={traineeId} />
        )}
      </ScrollView>

      {/* All Modals */}
      <WorkoutModal visible={modalVisible} data={selectedWorkout} onClose={() => setModalVisible(false)} />
      <FeedbackModal visible={feedbackVisible} trainerInfo={trainerInfo} onClose={() => setFeedbackVisible(false)} />
      {/* <QRScannerModal visible={scanVisible} onClose={() => setScanVisible(false)} onScan={handleQRScan} /> */}
      <QRScannerModal visible={scanVisible} onClose={() => setScanVisible(false)} onScan={handleScan} />
      <AttendanceCalendarModal visible={calendarVisible} onClose={() => setCalendarVisible(false)} />
      <TraineeDietModal visible={dietVisible} onClose={() => setDietVisible(false)} traineeId={traineeId} groupId={groupId} />
      <SleepTrackingModal visible={sleepVisible} onClose={() => setSleepVisible(false)} traineeId={traineeId} />

    </View>
  );
}
//const styles = StyleSheet.create({
const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },

  /* Header */
  heroBox: {
    //backgroundColor: "rgba(255,255,255,0.05)",
    backgroundColor: colors.inputBackground,
    padding: 18,
    borderRadius: 16,
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
    fontSize: 18,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "flex-start", // changed from center to handle multi-line
    marginBottom: 25,
    marginTop: 10,
  },

  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.accent,
    marginLeft: 12,
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
