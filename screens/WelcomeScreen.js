import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Button, HeroBackdrop, Reveal, Text } from '../components/ui';
import { LogoMark } from '../components/brand/Logo';

/**
 * The front door — cinematic register. Full-bleed photography breathing
 * under layered scrims, editorial type at poster scale, choreographed
 * entrance. Walking in should feel like the lights coming up.
 */
export default function WelcomeScreen({ navigation }) {
  const { colors, fonts, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // the red rule line draws itself in after the type lands
  const rule = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rule, {
      toValue: 1,
      duration: 700,
      delay: 650,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [rule]);

  // poster type scales with the viewport, capped for desktop
  const heroSize = Math.min(96, Math.max(56, width * 0.16));

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0B' }}>
      <HeroBackdrop
        source={require('../assets/photos/athlete-rope.jpg')}
        height={height}
        darkness={0.5}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + space[6],
          paddingBottom: Math.max(insets.bottom, space[6]),
          paddingHorizontal: space[6],
          justifyContent: 'space-between',
          maxWidth: 640,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {/* mark, quiet, top-left */}
        <Reveal index={0} distance={16}>
          <LogoMark size={48} />
        </Reveal>

        {/* the poster */}
        <View>
          <Reveal index={1}>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: heroSize,
                lineHeight: heroSize * 0.98,
                letterSpacing: -heroSize * 0.025,
                color: '#FFFFFF',
              }}
            >
              FORGE
            </Text>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: heroSize,
                lineHeight: heroSize * 0.98,
                letterSpacing: -heroSize * 0.025,
                color: colors.accent,
              }}
            >
              YOUR BODY
            </Text>
          </Reveal>

          <Animated.View
            style={{
              height: 3,
              marginTop: space[5],
              backgroundColor: colors.accent,
              width: rule.interpolate({ inputRange: [0, 1], outputRange: ['0%', '22%'] }),
            }}
          />

          <Reveal index={3}>
            <Text
              variant="bodyLg"
              style={{ color: 'rgba(255,255,255,0.82)', marginTop: space[5], maxWidth: 440 }}
            >
              Workouts, nutrition, recovery and progress — your whole gym life,
              one weapon.
            </Text>
          </Reveal>
        </View>

        {/* call to action */}
        <Reveal index={4} distance={36}>
          <Button
            title="Sign in"
            size="lg"
            fullWidth
            iconRight="arrow-forward"
            onPress={() => navigation.navigate('Login')}
          />
          <Text
            variant="bodySm"
            align="center"
            style={{ color: 'rgba(255,255,255,0.55)', marginTop: space[4] }}
          >
            Your gym sets up your account — ask at the front desk.
          </Text>
        </Reveal>
      </View>
    </View>
  );
}
