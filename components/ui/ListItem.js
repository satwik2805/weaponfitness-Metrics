import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { haptic } from './haptics';

/**
 * Standard row: leading slot (icon medallion or any element), title/subtitle,
 * trailing slot (element, value text, or chevron). ≥56pt, press feedback.
 *
 * <ListItem icon="barbell" title="Push Day A" subtitle="8 exercises" onPress={…} chevron />
 */
export default function ListItem({
  icon,
  iconTone = 'accent',
  leading,
  title,
  subtitle,
  trailing,
  value,
  chevron = false,
  onPress,
  disabled,
  separator = false,
  style,
}) {
  const { colors, radius, space, opacity } = useTheme();

  const content = (
    <>
      {leading ||
        (icon ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.sm,
              backgroundColor: colors[`${iconTone}Soft`] || colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={19} color={colors[`${iconTone}Bright`] || colors[iconTone] || colors.accentBright} />
          </View>
        ) : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="h4" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySm" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="statSm" color="textMuted">
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textFaint} /> : null}
    </>
  );

  const row = (pressed) => [
    {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
      minHeight: 56,
      paddingVertical: space[3],
      backgroundColor: pressed ? colors.pressedOverlay : 'transparent',
      borderRadius: radius.sm,
      opacity: disabled ? opacity.disabled : 1,
    },
    separator && { borderBottomWidth: 1, borderBottomColor: colors.border, borderRadius: 0 },
    style,
  ];

  if (!onPress) return <View style={row(false)}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={(e) => {
        haptic('light');
        onPress?.(e);
      }}
      style={({ pressed }) => row(pressed)}
    >
      {content}
    </Pressable>
  );
}
