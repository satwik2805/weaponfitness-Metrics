import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

const TONES = {
  neutral: { bg: 'surfaceOverlay', fg: 'textMuted' },
  accent: { bg: 'accentSoft', fg: 'accentBright' },
  success: { bg: 'successSoft', fg: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  info: { bg: 'infoSoft', fg: 'info' },
};

/** Status badge. <Badge tone="success" icon="checkmark-circle">Active</Badge> */
export default function Badge({ tone = 'neutral', icon, children, style }) {
  const { colors, radius, space } = useTheme();
  const t = TONES[tone] || TONES.neutral;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: space[1],
          backgroundColor: colors[t.bg],
          paddingHorizontal: space[2],
          paddingVertical: 3,
          borderRadius: radius.full,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={colors[t.fg]} /> : null}
      <Text variant="labelSm" color={t.fg} style={{ textTransform: 'uppercase' }}>
        {children}
      </Text>
    </View>
  );
}
