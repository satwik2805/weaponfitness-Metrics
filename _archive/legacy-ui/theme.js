export const darkColors = {
  primary: '#0F0F0F', // Deepest charcoal/black
  primaryLight: '#1A1A1A', // Slightly lighter for cards/surfaces
  accent: '#E50914', // High-energy neon red
  accentGlow: 'rgba(229, 9, 20, 0.5)', // For shadows/glows
  background: '#0a0a0a', // Almost black
  bgGradientStart: '#000000',
  bgGradientEnd: '#1a0505', // Subtle red tint at bottom
  text: '#FFFFFF',
  textSecondary: '#A0A0A0', // Silver/Grey
  border: 'rgba(255, 255, 255, 0.1)', // Glass border
  success: '#00E676',
  error: '#FF3D00',
  card: 'rgba(26, 26, 26, 0.8)',
  inputBackground: 'rgba(255, 255, 255, 0.05)',
};

export const lightColors = {
  primary: '#FFFFFF', // White
  primaryLight: '#FFFFFF', // Pure white for cards to pop against gray bg
  accent: '#E50914', // High-energy neon red
  accentGlow: 'rgba(229, 9, 20, 0.2)',
  background: '#F0F2F5', // Light cool gray background
  bgGradientStart: '#FFFFFF',
  bgGradientEnd: '#E8EAED',
  text: '#1C1C1E', // Deep charcoal for headers
  textSecondary: '#636366', // Slate gray for secondary text
  border: 'rgba(0, 0, 0, 0.08)', // Subtle border
  success: '#34C759',
  error: '#FF3B30',
  card: '#FFFFFF',
  inputBackground: '#F2F2F7', // Slightly darker than white for inputs
};

// Default export for backward compatibility during refactor
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
};

export const layout = {
  glass: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10, // Android
  }
};

