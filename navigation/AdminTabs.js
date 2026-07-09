// navigation/AdminTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TabBar from "../components/ui/TabBar";

import AdminDashboard from "../screens/AdminDashboard";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: { icon: "shield-outline", activeIcon: "shield" },
  Profile: { icon: "person-outline", activeIcon: "person" },
};

export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={ICONS} />}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
