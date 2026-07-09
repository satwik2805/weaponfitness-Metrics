import React, { useEffect, useRef } from 'react';
import { Animated, View, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Shimmering placeholder. Compose into screen-specific skeletons.
 * <Skeleton height={16} width="60%" />
 * <Skeleton circle size={44} />
 */
export default function Skeleton({ width = '100%', height = 14, circle = false, size, radius: r, style }) {
  const { colors, radius, isDark } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return; // Web uses CSS keyframe animations for better performance
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeletonBase, colors.skeletonHighlight],
  });

  const dims = circle
    ? { width: size || 44, height: size || 44, borderRadius: radius.full }
    : { width, height, borderRadius: r ?? radius.xs };

  const webProps = Platform.OS === 'web' ? {
    dataSet: { class: isDark ? 'shimmer-dark' : 'shimmer-light' },
    className: isDark ? 'shimmer-dark' : 'shimmer-light',
  } : {};

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        dims,
        Platform.OS !== 'web' && { backgroundColor },
        Platform.OS === 'web' && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)' },
        style
      ]}
      {...webProps}
    />
  );
}

/** Convenience row: avatar + two lines. */
export function SkeletonRow({ style }) {
  const { space } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space[3] }, style]}>
      <Skeleton circle size={44} />
      <View style={{ flex: 1, gap: space[2] }}>
        <Skeleton height={14} width="55%" />
        <Skeleton height={11} width="35%" />
      </View>
    </View>
  );
}
