import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import Surface from './Surface';
import CountUp from './CountUp';

/**
 * KPI tile: label, big numeral, optional delta + icon.
 * Pass `countTo` (number, with optional `format`) and the numeral animates in.
 *
 * <StatTile label="Active members" countTo={284} delta={+12} icon="people" />
 */
export default function StatTile({ label, value, countTo, format, unit, delta, deltaLabel = 'vs last week', icon, tone = 'accent', style }) {
  const { colors, space, radius } = useTheme();
  const deltaUp = typeof delta === 'number' && delta > 0;
  const deltaDown = typeof delta === 'number' && delta < 0;
  return (
    <Surface level={1} pad={4} style={[{ flex: 1, minWidth: 140 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="labelSm" color="textMuted">{label}</Text>
        {icon ? (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.xs,
              backgroundColor: colors[`${tone}Soft`] || colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={icon} size={15} color={colors[`${tone}Bright`] || colors[tone] || colors.accentBright} />
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[1], marginTop: space[2] }}>
        {typeof countTo === 'number' ? (
          <CountUp value={countTo} format={format} variant="statLg" />
        ) : (
          <Text variant="statLg">{value}</Text>
        )}
        {unit ? <Text variant="bodySm" color="textFaint" style={{ marginBottom: 5 }}>{unit}</Text> : null}
      </View>
      {typeof delta === 'number' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: space[1] }}>
          <Ionicons
            name={deltaUp ? 'trending-up' : deltaDown ? 'trending-down' : 'remove'}
            size={13}
            color={deltaUp ? colors.success : deltaDown ? colors.danger : colors.textFaint}
          />
          <Text variant="bodySm" color={deltaUp ? 'success' : deltaDown ? 'danger' : 'textFaint'}>
            {deltaUp ? '+' : ''}{delta}% {deltaLabel}
          </Text>
        </View>
      ) : null}
    </Surface>
  );
}
