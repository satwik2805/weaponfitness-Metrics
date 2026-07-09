import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Typed text. Every piece of copy in the app goes through this.
 *
 * <Text variant="h2">Title</Text>
 * <Text variant="bodySm" color="textMuted">Sub</Text>
 *
 * `variant` — key of theme.type (display, h1–h4, bodyLg, body, bodySm, label,
 *             labelSm, caption, statLg, stat, statSm, button, buttonSm)
 * `color`   — key of theme.colors (default 'text') or a raw value when
 *             explicitly needed (e.g. 'onAccent' inside a filled button)
 */
export default function Text({
  variant = 'body',
  color = 'text',
  align,
  style,
  children,
  ...rest
}) {
  const { type, colors } = useTheme();
  const resolved = colors[color] || color;
  return (
    <RNText
      style={[type[variant], { color: resolved }, align && { textAlign: align }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
