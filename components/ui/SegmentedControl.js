import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { haptic } from './haptics';

/**
 * Animated segmented selector (period pickers, view toggles).
 *
 * <SegmentedControl
 *   segments={['Week', 'Month', 'Year']}
 *   selectedIndex={i}
 *   onChange={setI}
 * />
 */
export default function SegmentedControl({ segments = [], selectedIndex = 0, onChange, style }) {
  const { colors, radius, space, motion } = useTheme();
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(selectedIndex)).current;
  const segW = segments.length ? width / segments.length : 0;

  useEffect(() => {
    Animated.spring(slide, { toValue: selectedIndex, friction: 10, tension: 160, useNativeDriver: true }).start();
  }, [selectedIndex, slide]);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.surfaceSunken,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 3,
          position: 'relative',
        },
        style,
      ]}
    >
      {segW > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            left: 3,
            width: segW - 6,
            borderRadius: radius.xs,
            backgroundColor: colors.surfaceOverlay,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            transform: [
              { translateX: slide.interpolate({ inputRange: [0, Math.max(segments.length - 1, 1)], outputRange: [0, segW * Math.max(segments.length - 1, 1)] }) },
            ],
          }}
        />
      )}
      {segments.map((label, i) => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === selectedIndex }}
          onPress={() => {
            if (i !== selectedIndex) {
              haptic('selection');
              onChange?.(i);
            }
          }}
          style={{ flex: 1, height: 34, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text variant="buttonSm" color={i === selectedIndex ? 'text' : 'textMuted'}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
