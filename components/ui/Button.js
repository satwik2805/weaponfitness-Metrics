import React, { useRef } from 'react';
import { Pressable, Animated, ActivityIndicator, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { haptic } from './haptics';

const SIZES = {
  sm: { height: 36, paddingH: 3, textVariant: 'buttonSm', icon: 16 },
  md: { height: 48, paddingH: 5, textVariant: 'button', icon: 18 },
  lg: { height: 56, paddingH: 6, textVariant: 'button', icon: 20 },
};

/**
 * The button. Variants: primary (filled red), secondary (raised surface),
 * outline, ghost, danger. Press scale + haptic, loading and disabled states
 * designed, ≥44pt targets at md/lg.
 *
 * <Button title="Save" onPress={…} loading={saving} icon="checkmark" />
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  hapticKind = 'light',
  style,
  ...rest
}) {
  const { colors, radius, space, opacity } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const s = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: colors.accent, text: colors.onAccent, border: 'transparent', pressedBg: colors.accentPressed },
    secondary: { bg: colors.surfaceRaised, text: colors.text, border: colors.borderStrong, pressedBg: colors.surfaceOverlay },
    outline: { bg: 'transparent', text: colors.text, border: colors.borderStrong, pressedBg: colors.pressedOverlay },
    ghost: { bg: 'transparent', text: colors.textMuted, border: 'transparent', pressedBg: colors.pressedOverlay },
    danger: { bg: colors.danger, text: colors.onAccent, border: 'transparent', pressedBg: colors.accentPressed },
  }[variant] || {};

  const animateTo = (v) =>
    Animated.spring(scale, { toValue: v, friction: 9, tension: 220, useNativeDriver: true }).start();

  const glowStyle = (!isDisabled && (variant === 'primary' || variant === 'danger'))
    ? Platform.select({
        web: {
          boxShadow: `0 4px 16px ${variant === 'primary' ? 'rgba(229, 9, 20, 0.32)' : 'rgba(255, 77, 67, 0.32)'}`,
        },
        ios: {
          shadowColor: variant === 'primary' ? colors.accent : colors.danger,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.32,
          shadowRadius: 8,
        },
        default: {},
      })
    : {};

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        fullWidth && { alignSelf: 'stretch' },
        glowStyle,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        onPress={(e) => {
          haptic(hapticKind);
          onPress?.(e);
        }}
        style={({ pressed }) => [
          {
            height: s.height,
            paddingHorizontal: space[s.paddingH],
            borderRadius: radius.md,
            backgroundColor: isDisabled && variant === 'primary' ? colors.disabledBg : pressed ? palette.pressedBg : palette.bg,
            borderWidth: palette.border === 'transparent' ? 0 : 1,
            borderColor: palette.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space[2],
            opacity: isDisabled && variant !== 'primary' ? opacity.disabled : 1,
          },
        ]}
        {...rest}
      >
        {/* keep the label in the layout (hidden) while loading so the button
            holds its resting width instead of collapsing to a spinner (R-040) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], opacity: loading ? 0 : 1 }}>
          {icon ? <Ionicons name={icon} size={s.icon} color={isDisabled ? colors.disabledText : palette.text} /> : null}
          <Text
            variant={s.textVariant}
            color={isDisabled && variant === 'primary' ? 'disabledText' : palette.text}
          >
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={s.icon} color={isDisabled ? colors.disabledText : palette.text} /> : null}
        </View>
        {loading ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={palette.text} />
            </View>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/** Square icon-only button, ≥44pt hit target. */
export function IconButton({ icon, onPress, size = 44, iconSize = 20, variant = 'secondary', color, disabled, accessibilityLabel, style, ...rest }) {
  const { colors, radius } = useTheme();
  const bg = {
    primary: colors.accent,
    secondary: colors.surfaceRaised,
    ghost: 'transparent',
    soft: colors.accentSoft,
  }[variant];
  const fg = color
    ? colors[color] || color
    : variant === 'primary' ? colors.onAccent : variant === 'soft' ? colors.accentBright : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
      disabled={disabled}
      onPress={(e) => { haptic('light'); onPress?.(e); }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.sm,
          backgroundColor: pressed ? colors.pressedOverlay : bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Ionicons name={icon} size={iconSize} color={fg} />
    </Pressable>
  );
}
