import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

/**
 * Screen shell: themed background, safe areas, optional scroll + pull-to-refresh,
 * optional keyboard avoidance. Every screen starts here.
 *
 * <Screen scroll padded refreshing={r} onRefresh={fn}>…</Screen>
 */
export default function Screen({
  scroll = false,
  padded = true,
  keyboard = false,
  refreshing,
  onRefresh,
  edges = ['top'],
  style,
  contentContainerStyle,
  children,
  ...rest
}) {
  const { colors, space, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? Math.max(insets.bottom, space[4]) : 0,
  };
  const innerPad = padded ? { paddingHorizontal: space[4] } : null;

  let body;
  if (scroll) {
    body = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[innerPad, { paddingBottom: space[8] }, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          ) : undefined
        }
        {...rest}
      >
        {children}
      </ScrollView>
    );
  } else {
    body = <View style={[{ flex: 1 }, innerPad, contentContainerStyle]}>{children}</View>;
  }

  const content = (
    <View style={[{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }, padding, style]}>
      {/* Ambient background glows for glassmorphism blending */}
      {Platform.OS === 'web' && (
        <>
          <View
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-10%',
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: colors.accent,
              opacity: isDark ? 0.12 : 0.05,
              filter: 'blur(90px)',
              pointerEvents: 'none',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: '15%',
              right: '-15%',
              width: 380,
              height: 380,
              borderRadius: 190,
              backgroundColor: '#2B7FE8', // Accent blue
              opacity: isDark ? 0.08 : 0.03,
              filter: 'blur(100px)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {body}

      {Platform.OS === 'web' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: isDark ? 0.015 : 0.008,
            zIndex: 9999,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </View>
  );

  if (keyboard) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}
