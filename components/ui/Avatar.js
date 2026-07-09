import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

const SIZES = { sm: 32, md: 44, lg: 56, xl: 80 };

const initialsOf = (name = '') =>
  (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';

/**
 * Avatar with image â†’ initials fallback and optional presence dot.
 * <Avatar name="Arjun Mehta" uri={p.avatar_url} size="lg" status="online" />
 */
export default function Avatar({ name, uri, size = 'md', status, style }) {
  const { colors, radius } = useTheme();
  const d = SIZES[size] || SIZES.md;
  const dotSize = Math.max(8, d / 5);
  return (
    <View style={[{ width: d, height: d }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={name ? `${name}'s photo` : 'profile photo'}
          style={{ width: d, height: d, borderRadius: radius.full, backgroundColor: colors.surfaceOverlay }}
        />
      ) : (
        <View
          style={{
            width: d,
            height: d,
            borderRadius: radius.full,
            backgroundColor: colors.accentSoft,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            variant={d >= 56 ? 'h3' : 'label'}
            color="accentBright"
            style={{ letterSpacing: 0.5 }}
          >
            {initialsOf(name)}
          </Text>
        </View>
      )}
      {status ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: status === 'online' ? colors.success : colors.textFaint,
            borderWidth: 2,
            borderColor: colors.bg,
          }}
        />
      ) : null}
    </View>
  );
}
