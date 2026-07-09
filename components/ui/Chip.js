import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { haptic } from './haptics';

/**
 * Selectable chip (filters, day pickers, tags).
 * <Chip label="Push day" selected={…} onPress={…} />
 */
export default function Chip({ label, icon, selected = false, onPress, disabled, style }) {
  const { colors, radius, space } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={(e) => { haptic('selection'); onPress?.(e); }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[1],
          paddingHorizontal: space[3],
          height: 34,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: selected ? colors.accent : colors.borderStrong,
          backgroundColor: selected ? colors.accentSoft : pressed ? colors.pressedOverlay : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? colors.accentBright : colors.textMuted} /> : null}
      <Text variant="bodySm" color={selected ? 'accentBright' : 'textMuted'}>
        {label}
      </Text>
    </Pressable>
  );
}
