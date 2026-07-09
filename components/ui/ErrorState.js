import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import Button from './Button';

/**
 * Recoverable error state — honest, human, always offers retry.
 *
 * <ErrorState title="Couldn't load your plan" detail={err.message} onRetry={refetch} />
 */
export default function ErrorState({
  title = "Something went wrong",
  detail,
  onRetry,
  retryTitle = 'Try again',
  compact = false,
  style,
}) {
  const { colors, space, radius } = useTheme();
  return (
    <View style={[{ alignItems: 'center', paddingVertical: space[compact ? 5 : 8], paddingHorizontal: space[6] }, style]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.full,
          backgroundColor: colors.dangerSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space[4],
        }}
      >
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <Text variant="h3" align="center">{title}</Text>
      {detail ? (
        <Text variant="bodySm" color="textFaint" align="center" style={{ marginTop: space[2], maxWidth: 300 }}>
          {detail}
        </Text>
      ) : null}
      {onRetry ? (
        <Button title={retryTitle} variant="secondary" size="sm" icon="refresh" onPress={onRetry} style={{ marginTop: space[5] }} />
      ) : null}
    </View>
  );
}
