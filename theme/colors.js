/**
 * theme/colors.js — semantic color roles for both themes.
 *
 * Every role answers "what is this color FOR", never "what color is it".
 * Dark is the primary theme (the brand lives in black); light is a first-class
 * sibling, not an afterthought. Both palettes expose the same keys.
 *
 * Legacy keys (primary, primaryLight, card, inputBackground, …) are kept as
 * aliases at the bottom of each object so pre-design-system screens keep
 * working while they are migrated. New code must use the semantic roles.
 */

import { neutral, red, green, amber, blue, alpha } from './palette';

export const darkSemantic = {
  // canvas
  bg: neutral[950],
  bgSunken: neutral[0],
  bgGradientStart: neutral[0],
  bgGradientEnd: '#050D1E',

  // surfaces
  surface: 'rgba(18, 18, 20, 0.65)',
  surfaceRaised: 'rgba(26, 26, 30, 0.75)',
  surfaceOverlay: 'rgba(38, 38, 44, 0.85)',
  surfaceSunken: 'rgba(6, 6, 7, 0.50)',
  scrim: alpha.scrimDark,

  // hairlines
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  // content
  text: '#F7F7F8',
  textMuted: neutral[300],
  textFaint: neutral[400],
  textInverse: neutral[950],
  // text drawn over photography (always light — sits on a darkened image)
  textOnPhoto: '#FFFFFF',
  textOnPhotoMuted: 'rgba(255,255,255,0.72)',
  textOnPhotoFaint: 'rgba(255,255,255,0.55)',

  // brand
  accent: blue[500],
  accentPressed: blue[600],
  accentBright: blue[300], // accent-colored text/icons on dark surfaces (passes contrast)
  accentSoft: 'rgba(43, 127, 232, 0.12)',
  accentGlow: 'rgba(43, 127, 232, 0.24)',
  onAccent: neutral.white,

  // status
  success: green[400],
  successSoft: green.soft,
  warning: amber[400],
  warningSoft: amber.soft,
  danger: '#FF4D43',
  dangerSoft: alpha.redSoftDark,
  info: blue[400],
  infoSoft: blue.soft,

  // interaction
  focus: blue[300],
  inputBg: 'rgba(255, 255, 255, 0.03)',
  inputBgFocused: 'rgba(255, 255, 255, 0.06)',
  pressedOverlay: 'rgba(43, 127, 232, 0.12)',
  disabledBg: 'rgba(30, 30, 34, 0.40)',
  disabledText: neutral[500],

  // skeleton
  skeletonBase: neutral[850],
  skeletonHighlight: neutral[700],

  // tab bar / chrome
  chrome: 'rgba(10, 10, 11, 0.70)',
  chromeBorder: 'rgba(255, 255, 255, 0.08)',

  // ---- legacy aliases (do not use in new code) ----
  primary: neutral[950],
  primaryLight: neutral[850],
  background: neutral[950],
  textSecondary: neutral[300],
  error: '#FF4D43',
  card: 'rgba(18, 18, 20, 0.65)',
  inputBackground: 'rgba(255, 255, 255, 0.03)',
};

export const lightSemantic = {
  // canvas
  bg: neutral[50],
  bgSunken: neutral[100],
  bgGradientStart: neutral.white,
  bgGradientEnd: '#EAF0FE',

  // surfaces
  surface: 'rgba(255, 255, 255, 0.70)',
  surfaceRaised: 'rgba(255, 255, 255, 0.80)',
  surfaceOverlay: 'rgba(255, 255, 255, 0.90)',
  surfaceSunken: 'rgba(232, 232, 235, 0.50)',
  scrim: alpha.scrimLight,

  // hairlines
  border: 'rgba(0, 0, 0, 0.06)',
  borderStrong: 'rgba(0, 0, 0, 0.12)',

  // content
  text: '#141416',
  textMuted: '#5C5C66',
  textFaint: '#8E8E98',
  textInverse: neutral.white,
  // text drawn over photography (light in both themes — sits on a darkened image)
  textOnPhoto: '#FFFFFF',
  textOnPhotoMuted: 'rgba(255,255,255,0.72)',
  textOnPhotoFaint: 'rgba(255,255,255,0.55)',

  // brand — deepened a step so it carries contrast on white
  accent: blue[600],
  accentPressed: '#164E97',
  accentBright: blue[500],
  accentSoft: 'rgba(29, 99, 192, 0.06)',
  accentGlow: 'rgba(29, 99, 192, 0.12)',
  onAccent: neutral.white,

  // status
  success: green[600],
  successSoft: green.softLight,
  warning: amber[600],
  warningSoft: amber.softLight,
  danger: '#D92D20',
  dangerSoft: alpha.redSoftLight,
  info: blue[600],
  infoSoft: blue.softLight,

  // interaction
  focus: blue[600],
  inputBg: 'rgba(0, 0, 0, 0.03)',
  inputBgFocused: 'rgba(255, 255, 255, 0.85)',
  pressedOverlay: 'rgba(29, 99, 192, 0.08)',
  disabledBg: 'rgba(232, 232, 235, 0.40)',
  disabledText: neutral[400],

  // skeleton
  skeletonBase: neutral[100],
  skeletonHighlight: neutral[25],

  // tab bar / chrome
  chrome: 'rgba(255, 255, 255, 0.75)',
  chromeBorder: 'rgba(0, 0, 0, 0.06)',

  // ---- legacy aliases (do not use in new code) ----
  primary: neutral.white,
  primaryLight: neutral.white,
  background: neutral[50],
  textSecondary: '#5C5C66',
  error: '#D92D20',
  card: 'rgba(255, 255, 255, 0.70)',
  inputBackground: 'rgba(0, 0, 0, 0.03)',
};
