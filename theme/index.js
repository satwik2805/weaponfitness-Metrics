/**
 * theme/index.js — the single design-token entry point.
 *
 * Consume through ThemeContext (`useTheme()`), which returns
 * `makeTheme(isDark)`. Static imports of `space`, `type`, etc. are fine for
 * theme-independent tokens; colors must always come from the hook.
 */

import { darkSemantic, lightSemantic } from './colors';
import { space, radius, layout, type, fonts, motion, zIndex, opacity, hitSlop, elevation } from './tokens';

export { darkSemantic, lightSemantic };
export { space, radius, layout, type, fonts, motion, zIndex, opacity, hitSlop, elevation };

export const makeTheme = (isDark) => ({
  isDark,
  colors: isDark ? darkSemantic : lightSemantic,
  space,
  radius,
  layout,
  type,
  fonts,
  motion,
  zIndex,
  opacity,
  hitSlop,
  elevation,
});
