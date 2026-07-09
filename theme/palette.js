/**
 * theme/palette.js — raw tonal ramps.
 *
 * This file is the ONLY place raw hex values live. Nothing outside theme/
 * should import it — screens and components consume semantic roles from
 * theme/colors.js via ThemeContext.
 */

export const neutral = {
  0: '#000000',
  950: '#0A0A0B',
  900: '#111113',
  850: '#17171A',
  800: '#1E1E22',
  700: '#2A2A30',
  600: '#3A3A42',
  500: '#55555F',
  400: '#75757F',
  300: '#9B9BA4',
  200: '#C6C6CC',
  100: '#E8E8EB',
  50: '#F4F4F6',
  25: '#FAFAFB',
  white: '#FFFFFF',
};

/** Brand red — the #E50914 DNA, built out into a usable ramp. */
export const red = {
  50: '#FEECEB',
  100: '#FDD8D6',
  200: '#FFA8A1',
  300: '#FF6B5E',
  400: '#F8302A',
  500: '#E50914', // brand
  600: '#C40812',
  700: '#9E0710',
  800: '#6E0509',
  900: '#3B0406',
  950: '#200304',
};

export const green = {
  300: '#5EE39A',
  400: '#2FD06F',
  500: '#1DB45C',
  600: '#178F49',
  soft: 'rgba(47, 208, 111, 0.14)',
  softLight: 'rgba(23, 143, 73, 0.10)',
};

export const amber = {
  300: '#FFC95C',
  400: '#FFB020',
  500: '#E89B0C',
  600: '#B45309',
  soft: 'rgba(255, 176, 32, 0.14)',
  softLight: 'rgba(180, 83, 9, 0.10)',
};

export const blue = {
  300: '#7DB8FF',
  400: '#4D9FFF',
  500: '#2B7FE8',
  600: '#1D63C0',
  soft: 'rgba(77, 159, 255, 0.14)',
  softLight: 'rgba(29, 99, 192, 0.10)',
};

export const alpha = {
  whiteFaint: 'rgba(255, 255, 255, 0.04)',
  white06: 'rgba(255, 255, 255, 0.06)',
  white08: 'rgba(255, 255, 255, 0.08)',
  white12: 'rgba(255, 255, 255, 0.12)',
  white16: 'rgba(255, 255, 255, 0.16)',
  black08: 'rgba(17, 17, 19, 0.08)',
  black12: 'rgba(17, 17, 19, 0.12)',
  black16: 'rgba(17, 17, 19, 0.16)',
  scrimDark: 'rgba(0, 0, 0, 0.64)',
  scrimLight: 'rgba(10, 10, 11, 0.40)',
  redGlowDark: 'rgba(229, 9, 20, 0.32)',
  redGlowLight: 'rgba(229, 9, 20, 0.16)',
  redSoftDark: 'rgba(229, 9, 20, 0.14)',
  redSoftLight: 'rgba(217, 8, 18, 0.08)',
};
