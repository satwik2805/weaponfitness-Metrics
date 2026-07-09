import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Linear progress with animated fill.
 * <ProgressBar progress={0.4} color="success" />
 */
export default function ProgressBar({ progress = 0, height = 6, color = 'accent', style }) {
  const { colors, radius, motion } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const clamped = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: motion.slow, useNativeDriver: false }).start();
  }, [clamped, anim, motion.slow]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[{ height, borderRadius: radius.full, backgroundColor: colors.surfaceOverlay, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radius.full,
          backgroundColor: colors[color] || color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
