import React, { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
  FontAwesome5,
  FontAwesome6,
  AntDesign,
  Entypo,
} from '@expo/vector-icons';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { localNotificationService } from './services/localNotificationService';
import { darkSemantic } from './theme';

import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // icon fonts — without these, web renders tofu glyphs (baseline 04)
    ...Ionicons.font,
    ...Feather.font,
    ...MaterialCommunityIcons.font,
    ...FontAwesome5.font,
    ...FontAwesome6.font,
    ...AntDesign.font,
    ...Entypo.font,
  });

  useEffect(() => {
    (async () => {
      try {
        await localNotificationService.requestPermissions();
        localNotificationService.configure();
      } catch (e) {
        console.log("Error configuring notifications:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Inject hover and custom cursor styles
    const style = document.createElement('style');
    style.textContent = `
      .custom-cursor-glow {
        position: fixed;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: rgba(43, 127, 232, 0.12);
        border: 1px solid rgba(43, 127, 232, 0.28);
        box-shadow: 0 0 10px rgba(43, 127, 232, 0.2);
        pointer-events: none;
        transform: translate(-50%, -50%);
        z-index: 999999;
        display: none;
      }
      /* Highlight interactive elements with a light shade of blue when hovered */
      button:hover, a:hover, input:hover, select:hover, textarea:hover, [role="button"]:hover {
        background-color: rgba(43, 127, 232, 0.08) !important;
        border-color: rgba(43, 127, 232, 0.3) !important;
        outline: none !important;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }
      @keyframes premiumShimmer {
        0% {
          background-position: -200% 0;
        }
        100% {
          background-position: 200% 0;
        }
      }
      .shimmer-dark {
        background: linear-gradient(
          110deg,
          rgba(255, 255, 255, 0.03) 25%,
          rgba(255, 255, 255, 0.14) 45%,
          rgba(255, 255, 255, 0.14) 55%,
          rgba(255, 255, 255, 0.03) 75%
        ) !important;
        background-size: 200% 100% !important;
        animation: premiumShimmer 1.4s infinite linear !important;
      }
      .shimmer-light {
        background: linear-gradient(
          110deg,
          rgba(0, 0, 0, 0.04) 25%,
          rgba(0, 0, 0, 0.11) 45%,
          rgba(0, 0, 0, 0.11) 55%,
          rgba(0, 0, 0, 0.04) 75%
        ) !important;
        background-size: 200% 100% !important;
        animation: premiumShimmer 1.4s infinite linear !important;
      }
      .shining-glass-card {
        position: relative !important;
        overflow: hidden !important;
      }
      .shining-glass-card::before {
        content: '' !important;
        position: absolute !important;
        top: 0 !important;
        left: -150% !important;
        width: 60% !important;
        height: 100% !important;
        background: linear-gradient(
          to right,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.12) 30%,
          rgba(255, 255, 255, 0.22) 50%,
          rgba(255, 255, 255, 0.12) 70%,
          rgba(255, 255, 255, 0) 100%
        ) !important;
        transform: skewX(-20deg) !important;
        transition: left 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important;
        pointer-events: none !important;
        z-index: 10 !important;
      }
      .shining-glass-card:hover::before {
        left: 150% !important;
      }
    `;
    document.head.appendChild(style);

    const glow = document.createElement('div');
    glow.className = 'custom-cursor-glow';
    document.body.appendChild(glow);

    const onMouseMove = (e) => {
      glow.style.display = 'block';
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    };

    const onMouseLeave = () => {
      glow.style.display = 'none';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (document.body.contains(glow)) {
        document.body.removeChild(glow);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Block only while fonts are genuinely loading. If loading FAILS we render
  // anyway — system fonts beat an eternal spinner (this hung once in prod).
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: darkSemantic.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={darkSemantic.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              <StatusBar style="auto" />
              <AppNavigator />
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
