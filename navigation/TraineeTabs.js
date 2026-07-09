import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TabBar from "../components/ui/TabBar";

import TraineeHomeScreen from "../screens/TraineeHomeScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

// NOTE (roadmap item): Workout/Anatomy render the same TraineeHomeScreen with
// a different initialTab — a legacy of the mega-screen. The screen split is
// planned work; the navigator is already shaped for it.
const WorkoutScreen = () => <TraineeHomeScreen initialTab="workouts" />;

const ICONS = {
  Home: { icon: "home-outline", activeIcon: "home" },
  Workout: { icon: "barbell-outline", activeIcon: "barbell", label: "Workout" },
  Profile: { icon: "person-outline", activeIcon: "person" },
};

export default function TraineeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={ICONS} />}
    >
      <Tab.Screen name="Home" component={TraineeHomeScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
