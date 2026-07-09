import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

/**
 * Section header with an optional trailing action — was defined identically
 * in five screens (review R-027).
 *
 * <SectionTitle hint="last 7 days">This week</SectionTitle>
 * <SectionTitle action="Calendar" onAction={fn}>Today</SectionTitle>
 */
export default function SectionTitle({ children, hint, action, onAction, style }) {
  const { space } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginTop: space[7],
          marginBottom: space[3],
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="h3">{children}</Text>
        {hint ? (
          <Text variant="bodySm" color="textFaint" style={{ marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text variant="label" color="accentBright">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
