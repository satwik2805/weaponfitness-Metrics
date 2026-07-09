import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TabBar from "../components/ui/TabBar";

import ReceptionistDashboard from "../screens/ReceptionistDashboard";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  ReceptionistHome: { icon: "home-outline", activeIcon: "home", label: "Home" },
  Profile: { icon: "person-outline", activeIcon: "person" },
};

export default function ReceptionistTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={ICONS} />}
    >
      <Tab.Screen
        name="ReceptionistHome"
        component={ReceptionistDashboard}
        options={{ title: "Home" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
