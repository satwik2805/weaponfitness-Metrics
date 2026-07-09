import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return `rgba(43, 127, 232, ${alpha})`;
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(43, 127, 232, ${alpha})`;
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Surface / Card. Tone steps up with `level` (0–3); elevation rides along.
 *
 * <Surface level={1} pad={4}>…</Surface>
 */
export default function Surface({
  level = 1,
  pad = 4,
  radius: radiusKey = 'lg',
  bordered = true,
  style,
  children,
  ...rest
}) {
  const { colors, radius, space, elevation, isDark } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const bgByLevel = [colors.surfaceSunken, colors.surface, colors.surfaceRaised, colors.surfaceOverlay];

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 0 });
  };

  const handleMouseMove = (e) => {
    if (Platform.OS !== 'web') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    // Calculate rotation angles (-3 to 3 degrees)
    const rotateX = -((y - height / 2) / (height / 2)) * 3;
    const rotateY = ((x - width / 2) / (width / 2)) * 3;

    // Offset shadow opposite to cursor
    const shadowX = -((x - width / 2) / (width / 2)) * 4;
    const shadowY = -((y - height / 2) / (height / 2)) * 4;

    setTilt({ rotateX, rotateY, shadowX, shadowY });
  };

  const handleClick = (e) => {
    if (Platform.OS !== 'web') return;
    const targetTagName = e.target.tagName;
    // Do not trigger focus mode if clicking direct interactive children
    if (
      targetTagName === 'BUTTON' || e.target.closest('button') ||
      targetTagName === 'A' || e.target.closest('a') ||
      targetTagName === 'INPUT' || e.target.closest('input')
    ) {
      return;
    }
    e.stopPropagation();
    setIsFocused(prev => !prev);
  };

  const hoverStyle = hovered && Platform.OS === 'web' ? {
    backgroundColor: isDark ? hexToRgba(colors.accent, 0.06) : hexToRgba(colors.accent, 0.03),
    borderTopColor: hexToRgba(colors.accent, 0.40),
    borderLeftColor: hexToRgba(colors.accent, 0.25),
    borderRightColor: hexToRgba(colors.accent, 0.25),
    borderBottomColor: hexToRgba(colors.accent, 0.15),
    transform: [
      { perspective: 600 },
      { rotateX: `${tilt.rotateX}deg` },
      { rotateY: `${tilt.rotateY}deg` },
    ],
    boxShadow: isDark
      ? `${tilt.shadowX}px ${tilt.shadowY + 12}px 32px ${hexToRgba(colors.accent, 0.16)}`
      : `${tilt.shadowX}px ${tilt.shadowY + 12}px 32px ${hexToRgba(colors.accent, 0.08)}`,
  } : {};

  const focusStyle = isFocused && Platform.OS === 'web' ? {
    position: 'relative',
    zIndex: 99999,
    transform: [
      { scale: 1.025 },
      { perspective: 600 },
      { rotateX: `${tilt.rotateX}deg` },
      { rotateY: `${tilt.rotateY}deg` },
    ],
    boxShadow: isDark
      ? `${tilt.shadowX}px ${tilt.shadowY + 16}px 40px ${hexToRgba(colors.accent, 0.24)}`
      : `${tilt.shadowX}px ${tilt.shadowY + 16}px 40px ${hexToRgba(colors.accent, 0.14)}`,
  } : {};

  const borderStyle = bordered
    ? {
        borderWidth: 1,
        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.03)',
        borderLeftColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        borderRightColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.09)',
      }
    : {};

  const webProps = Platform.OS === 'web' ? {
    dataSet: { class: 'shining-glass-card' },
    className: 'shining-glass-card',
  } : {};

  return (
    <>
      {isFocused && Platform.OS === 'web' && (
        <View
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(6, 6, 7, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 99998,
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsFocused(false);
          }}
        />
      )}
      <View
        onMouseEnter={Platform.OS === 'web' ? handleMouseEnter : undefined}
        onMouseLeave={Platform.OS === 'web' ? handleMouseLeave : undefined}
        onMouseMove={Platform.OS === 'web' ? handleMouseMove : undefined}
        onClick={Platform.OS === 'web' ? handleClick : undefined}
        {...webProps}
        style={[
          {
            backgroundColor: bgByLevel[Math.min(level, 3)],
            borderRadius: radius[radiusKey],
            padding: space[pad],
            transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden', // Contain the glass shine sweep
          },
          Platform.select({
            web: {
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            },
            default: {}
          }),
          borderStyle,
          hoverStyle,
          focusStyle,
          elevation[Math.min(level, 4)],
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    </>
  );
}
