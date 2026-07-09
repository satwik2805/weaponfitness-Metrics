import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Circular progress — the signature stat element (trifecta rings, goal %).
 * The arc sweeps in from empty on mount / value change.
 *
 * <ProgressRing progress={0.62} size={88} label="GYM" color="accent" />
 */
export default function ProgressRing({
  progress = 0,
  size = 88,
  strokeWidth = 7,
  color = 'accent',
  trackColor,
  label,
  valueText,
  children,
  style,
}) {
  const { colors, motion, reducedMotion } = useTheme();
  const clamped = Math.min(Math.max(progress, 0), 1);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const stroke = colors[color] || color;

  // strokeDashoffset can't ride the native driver (it's an SVG prop).
  const anim = useRef(new Animated.Value(reducedMotion ? clamped : 0)).current;
  useEffect(() => {
    if (reducedMotion) {
      anim.setValue(clamped);
      return;
    }
    Animated.timing(anim, {
      toValue: clamped,
      duration: motion.slow,
      easing: Easing.bezier(...motion.easeOut),
      useNativeDriver: false,
    }).start();
  }, [clamped, anim, motion.slow, motion.easeOut, reducedMotion]);

  const dashoffset = anim.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });

  return (
    <View style={[{ width: size, alignItems: 'center' }, style]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={trackColor || colors.surfaceOverlay}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c}`}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          {children || (
            <Text variant={size >= 80 ? 'stat' : 'statSm'}>
              {valueText ?? `${Math.round(clamped * 100)}%`}
            </Text>
          )}
        </View>
      </View>
      {label ? (
        <Text variant="labelSm" color="textMuted" style={{ marginTop: 6 }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
