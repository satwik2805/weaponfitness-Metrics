import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import Button from './Button';

/**
 * Designed empty state: icon medallion, human copy, a clear next action.
 *
 * <EmptyState
 *   icon="barbell-outline"
 *   title="No workouts yet"
 *   body="Your trainer hasn't assigned a plan. Nudge them, or explore the library."
 *   actionTitle="Browse library" onAction={…} />
 */
export default function EmptyState({ icon = 'file-tray-outline', title, body, actionTitle, onAction, compact = false, style }) {
  const { colors, space, radius } = useTheme();
  return (
    <View style={[{ alignItems: 'center', paddingVertical: space[compact ? 6 : 9], paddingHorizontal: space[6] }, style]}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.full,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space[4],
        }}
      >
        <Ionicons name={icon} size={30} color={colors.accentBright} />
      </View>
      <Text variant="h3" align="center">{title}</Text>
      {body ? (
        <Text variant="body" color="textMuted" align="center" style={{ marginTop: space[2], maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {actionTitle ? (
        <Button title={actionTitle} variant="secondary" size="sm" onPress={onAction} style={{ marginTop: space[5] }} />
      ) : null}
    </View>
  );
}
