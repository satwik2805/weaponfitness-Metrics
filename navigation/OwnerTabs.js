import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TabBar from "../components/ui/TabBar";

import OwnerDashboard from "../screens/OwnerDashboard";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: { icon: "stats-chart-outline", activeIcon: "stats-chart" },
  Profile: { icon: "person-outline", activeIcon: "person" },
};

export default function OwnerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={ICONS} />}
    >
      <Tab.Screen name="Dashboard" component={OwnerDashboard} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
