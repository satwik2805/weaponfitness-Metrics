import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Text } from '../components/ui';
import { LogoMark } from '../components/brand/Logo';
import { supabase } from '../config/supabase';
import { profileService } from '../services';

/**
 * Boot screen: resolves the session + role and routes to the right surface.
 * Backend API first (authoritative), Supabase direct as fallback.
 */

const ROUTE_BY_ROLE = {
  Trainee: 'TraineeTabs',
  Trainer: 'TrainerTabs',
  Receptionist: 'ReceptionistTabs',
  Owner: 'OwnerTabs',
  Admin: 'AdminTabs',
};

export default function LoadingScreen({ navigation }) {
  const { colors, fonts, motion } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: motion.slower,
      easing: Easing.bezier(...motion.easeOut),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fade, pulse, motion]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // brief beat so the brand moment lands, never a long artificial wait
      const minimum = new Promise((r) => setTimeout(r, 900));

      let route = 'Welcome';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          let role = null;
          try {
            const profile = await profileService.getProfile(session.user.id);
            role = profile?.role || null;
          } catch (apiError) {
            // API down — fall back to RLS-guarded direct read (own row only)
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            role = profile?.role || null;
          }
          route = ROUTE_BY_ROLE[role] || 'Welcome';
        }
      } catch (err) {
        route = 'Welcome';
      }

      await minimum;
      if (!cancelled) navigation.replace(route);
    })();

    return () => { cancelled = true; };
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgSunken }}>
      <LinearGradient
        colors={[colors.bgGradientStart, colors.bgGradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            opacity: fade,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
          }}
        >
          <LogoMark size={84} />
        </Animated.View>
        <Animated.View style={{ opacity: fade, alignItems: 'center', marginTop: 28 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: 4 }}>
            WEAPON FITNESS
          </Text>
          <Text variant="labelSm" color="textFaint" style={{ marginTop: 8, letterSpacing: 3 }}>
            Loading your gym
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
