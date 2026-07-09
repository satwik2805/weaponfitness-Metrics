// navigation/AppNavigator.js
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DesignGalleryScreen from '../screens/DesignGalleryScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OwnerDashboard from '../screens/OwnerDashboard';
import TraineeTabs from './TraineeTabs';
import OwnerTabs from './OwnerTabs';

import AdminTabs from './AdminTabs';
import ReceptionistTabs from "./ReceptionistTabs";
import ReceptionQRCodeScreen from '../screens/ReceptionQRCodeScreen';
import TodayAttendanceScreen from '../screens/TodayAttendanceScreen';
import TrainerTabs from './TrainerTabs';


const Stack = createNativeStackNavigator();

// Path-based routing on web (e.g. /login, /gallery). Native keeps the
// "weaponfitness" scheme behaviour it already had.
const linking = {
  prefixes: [],
  config: {
    screens: {
      Loading: '',
      Welcome: 'welcome',
      Login: 'login',
      Gallery: 'gallery',
      TraineeTabs: {
        path: 'trainee',
        screens: { Home: '', Workout: 'workout', Classes: 'classes', Anatomy: 'anatomy', Profile: 'profile' },
      },
      TrainerTabs: 'trainer',
      OwnerTabs: 'owner',
      AdminTabs: 'admin',
      ReceptionistTabs: 'reception',
    },
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined}>
      <Stack.Navigator
        initialRouteName="Loading"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />

        <Stack.Screen name="TraineeTabs" component={TraineeTabs} />
        <Stack.Screen name="TrainerTabs" component={TrainerTabs} />
        <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
        <Stack.Screen name="AdminTabs" component={AdminTabs} />
        <Stack.Screen name="ReceptionistTabs" component={ReceptionistTabs} />
        <Stack.Screen name="QRScanner" component={ReceptionQRCodeScreen} />
        <Stack.Screen name="AttendanceList" component={TodayAttendanceScreen} />
        <Stack.Screen name="PaymentsScreen" component={require('../screens/PaymentsScreen').default} />
        {__DEV__ ? <Stack.Screen name="Gallery" component={DesignGalleryScreen} /> : null}


      </Stack.Navigator>
    </NavigationContainer>
  );
}
