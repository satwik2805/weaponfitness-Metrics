import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Choreographed entrance: fade + rise with a per-element stagger.
 * Wrap sections so screens assemble themselves instead of popping in.
 *
 * <Reveal index={0}>…</Reveal>
 * <Reveal index={1} distance={40}>…</Reveal>
 */
export default function Reveal({
  index = 0,
  delay,
  distance = 28,
  duration = 620,
  style,
  children,
  ...rest
}) {
  const { reducedMotion } = useTheme();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: delay ?? index * 60,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
