/**
 * theme/tokens.js — every non-color design token.
 *
 * Spacing rides a 4-pt grid. Type is a real scale with families, weights,
 * line-height and tracking per step (Space Grotesk for display & numerals,
 * Inter for text & UI). Motion, radius, elevation, z-index and opacity are
 * all defined once, here, and nowhere else.
 */

import { Platform } from 'react-native';

/** 4-pt spatial scale. space[4] === 16. */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

/**
 * Screen layout contract — one answer to "how wide is content, how much
 * gutter, how much bottom clearance for the floating dock" (review R-016).
 */
export const layout = {
  contentMaxWidth: 760,
  gutter: space[5], // 20
  scrollPadBottom: 132, // clears the floating tab bar + safe area
  heroHeight: 300,
};

export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

/**
 * Type scale. No `color` here on purpose — color is a semantic role applied
 * at the point of use (the Text primitive handles it).
 */
export const type = {
  // cinematic display sizes — hero moments, not body UI
  heroXl: { fontFamily: fonts.display, fontSize: 84, lineHeight: 90, letterSpacing: -2 },
  hero: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, letterSpacing: -1.5 },
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  h4: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: 0 },
  bodyLg: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26, letterSpacing: 0 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16, letterSpacing: 0.2 },
  labelSm: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  // numerals — Space Grotesk, tabular so stats don't jitter
  statLg: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  stat: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  statSm: { fontFamily: fonts.displayMedium, fontSize: 17, lineHeight: 20, letterSpacing: 0, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 },
  buttonSm: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 16, letterSpacing: 0.2 },
};

/** Durations (ms) + easing curves for RN Animated. */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  slower: 480,
  // Animated.spring presets
  spring: {
    snappy: { friction: 9, tension: 160, useNativeDriver: true },
    gentle: { friction: 10, tension: 80, useNativeDriver: true },
  },
  // bezier args for Easing.bezier(...)
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.65, 0, 0.35, 1],
};

export const zIndex = {
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
};

export const opacity = {
  disabled: 0.4,
  pressed: 0.72,
  faint: 0.56,
};

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Elevation scale — cross-platform. Level 0 is flush; 4 is a modal.
 * On dark themes shadows barely read, so surfaces also step up in tone
 * (surface → surfaceRaised → surfaceOverlay); shadow is the garnish.
 */
const shadow = (y, blurRadius, shadowOpacity, androidElevation) =>
  Platform.select({
    web: { boxShadow: `0 ${y}px ${blurRadius}px rgba(0,0,0,${shadowOpacity})` },
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: y },
      shadowOpacity,
      shadowRadius: blurRadius / 2,
    },
    android: { elevation: androidElevation },
    default: {},
  });

export const elevation = {
  0: {},
  1: shadow(1, 4, 0.18, 2),
  2: shadow(4, 12, 0.22, 5),
  3: shadow(8, 24, 0.28, 9),
  4: shadow(16, 40, 0.36, 14),
};
