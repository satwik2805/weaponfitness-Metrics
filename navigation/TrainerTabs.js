import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TabBar from "../components/ui/TabBar";

import TrainerDashboard from "../screens/TrainerDashboard";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: { icon: "home-outline", activeIcon: "home" },
  Profile: { icon: "person-outline", activeIcon: "person" },
};

export default function TrainerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={ICONS} />}
    >
      <Tab.Screen name="Dashboard" component={TrainerDashboard} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
