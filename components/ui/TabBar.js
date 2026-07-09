import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { haptic } from './haptics';

const hexToRgb = (hex) => {
  const h = (hex || '#0A0A0B').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};

/**
 * The app's tab bar — a floating dock shared by every role's navigator.
 *
 * <Tab.Navigator tabBar={(p) => <TabBar {...p} icons={ICONS} />}>
 */
export default function TabBar({ state, descriptors, navigation, icons = {} }) {
  const { colors, radius, space, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [r, g, b] = hexToRgb(colors.bg);

  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(state.index)).current;
  const tabW = state.routes.length && width ? (width - 8) / state.routes.length : 0;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: state.index,
      friction: 9,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [state.index, slide]);

  return (
    <>
      {/* bottom scrim — content fades into the canvas above the dock */}
      <LinearGradient
        pointerEvents="none"
        colors={[`rgba(${r},${g},${b},0)`, `rgba(${r},${g},${b},0.95)`]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom + 96 }}
      />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: space[4],
          right: space[4],
          bottom: Math.max(insets.bottom, space[3]),
          alignItems: 'center',
        }}
      >
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={[
            {
              flexDirection: 'row',
              backgroundColor: colors.chrome,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.chromeBorder,
              padding: 4,
              gap: 0,
              maxWidth: 480,
              width: '100%',
              position: 'relative',
            },
            Platform.select({
              web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              },
              default: {}
            }),
            elevation[3],
          ]}
        >
          {/* Sliding indicator capsule */}
          {tabW > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 4,
                bottom: 4,
                left: 4,
                width: tabW,
                borderRadius: radius.lg,
                backgroundColor: colors.accentSoft,
                borderWidth: 1,
                borderColor: colors.accentGlow,
                transform: [
                  {
                    translateX: slide.interpolate({
                      inputRange: [0, Math.max(state.routes.length - 1, 1)],
                      outputRange: [0, tabW * Math.max(state.routes.length - 1, 1)],
                    }),
                  },
                ],
              }}
            />
          )}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const cfg = icons[route.name] || {};
            const label =
              cfg.label ??
              (typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title) ??
              route.name;
            const iconName = focused ? cfg.activeIcon || cfg.icon : cfg.icon;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptic('selection');
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel || label}
                onPress={onPress}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: space[2],
                  height: 48,
                  borderRadius: radius.lg,
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                  zIndex: 2, // Stack labels above sliding background
                }}
              >
                <Ionicons
                  name={iconName || 'ellipse-outline'}
                  size={21}
                  color={focused ? colors.accentBright : colors.textFaint}
                />
                {focused ? (
                  <Text variant="buttonSm" color="accentBright" numberOfLines={1}>
                    {label}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}
