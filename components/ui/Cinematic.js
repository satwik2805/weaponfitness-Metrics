import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ImageBackground, StyleSheet, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};

const Dumbbell = () => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 3,
      elevation: 4,
    }}
  >
    <View style={{ width: 6, height: 22, borderRadius: 2, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#3C3C43' }} />
    <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: '#2C2C2E', borderWidth: 1, borderColor: '#48484A', marginLeft: 1 }} />
    <View style={{ width: 16, height: 6, backgroundColor: '#E5E5EA', borderRadius: 1 }} />
    <View style={{ width: 4, height: 30, borderRadius: 2, backgroundColor: '#2C2C2E', borderWidth: 1, borderColor: '#48484A', marginRight: 1 }} />
    <View style={{ width: 6, height: 22, borderRadius: 2, backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#3C3C43' }} />
  </View>
);

/**
 * Cinematic backdrop: full-bleed photography under layered scrims, with a
 * slow Ken Burns drift so the surface breathes. Optionally parallax-bound
 * to a scroll position. The floor fade resolves to the active theme's canvas
 * colour, so the hero blends seamlessly in light AND dark (review R-003).
 *
 * <HeroBackdrop source={require('../../assets/photos/athlete-rope.jpg')} height={420} scrollY={scrollY} />
 */
export function HeroBackdrop({
  source,
  height = 420,
  scrollY,
  kenBurns = true,
  tint = 'rgba(229, 9, 20, 0.10)',
  darkness = 0.45,
  maxWidth,
  children,
  style,
  imageStyle,
}) {
  const { colors, isDark, reducedMotion } = useTheme();
  const drift = useRef(new Animated.Value(0)).current;
  const rollAnim = useRef(new Animated.Value(0)).current;

  // floor fade ends on the real canvas colour; light mode keeps the photo
  // readable with a softer scrim instead of fading to black on a white page.
  const [r, g, b] = hexToRgb(colors.bg || '#0A0A0B');
  const floorMid = `rgba(${r},${g},${b},0.45)`;
  const floorEnd = colors.bg || '#0A0A0B';
  const effectiveDarkness = isDark ? darkness : Math.min(darkness, 0.32);

  useEffect(() => {
    if (!kenBurns || reducedMotion) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [kenBurns, drift]);

  useEffect(() => {
    if (reducedMotion) {
      rollAnim.setValue(1);
      return;
    }
    // Delay rolling by 350ms to let page stagger transitions finish
    Animated.sequence([
      Animated.delay(350),
      Animated.timing(rollAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  }, [rollAnim]);

  const transforms = [
    { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1.14] }) },
  ];
  if (scrollY) {
    transforms.push({
      translateY: scrollY.interpolate({
        inputRange: [-200, 0, height],
        outputRange: [-60, 0, height * 0.35], // photo lags the scroll — depth
        extrapolate: 'clamp',
      }),
    });
  }

  return (
    <View
      style={[
        { height, overflow: 'hidden' },
        // On wide screens, cap the hero to the content column so the photo
        // isn't cropped to an extreme letterbox and stays aligned with the
        // body below (review: desktop hero "cut off").
        maxWidth ? { maxWidth, width: '100%', alignSelf: 'center' } : null,
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: transforms }]}>
        <ImageBackground source={source} style={StyleSheet.absoluteFill} resizeMode="cover" imageStyle={imageStyle} />
      </Animated.View>
      {/* layered scrims: brand tint, an even darkness, then a floor fade into
          the canvas. A top scrim lifts title contrast without darkening the
          whole frame (review R-010/R-038). */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(5, 5, 6, ${effectiveDarkness})` }]} />
      <LinearGradient
        colors={[isDark ? 'rgba(5,5,6,0.5)' : 'rgba(5,5,6,0.32)', 'transparent']}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', floorMid, floorEnd]}
        locations={[0.5, 0.82, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Rolling Dumbbells Animation Overlay */}
      {!reducedMotion && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
            height: 40,
            zIndex: 9,
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              transform: [
                {
                  translateX: rollAnim.interpolate({
                    inputRange: [0, 0.75, 0.88, 1],
                    outputRange: [-240, -18, -26, -22],
                  }),
                },
                {
                  rotate: rollAnim.interpolate({
                    inputRange: [0, 0.75, 0.88, 1],
                    outputRange: ['-540deg', '-30deg', '-15deg', '0deg'],
                  }),
                },
              ],
            }}
          >
            <Dumbbell />
          </Animated.View>
          <Animated.View
            style={{
              position: 'absolute',
              transform: [
                {
                  translateX: rollAnim.interpolate({
                    inputRange: [0, 0.75, 0.88, 1],
                    outputRange: [240, 18, 26, 22],
                  }),
                },
                {
                  rotate: rollAnim.interpolate({
                    inputRange: [0, 0.75, 0.88, 1],
                    outputRange: ['540deg', '30deg', '15deg', '0deg'],
                  }),
                },
              ],
            }}
          >
            <Dumbbell />
          </Animated.View>
        </View>
      )}

      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

/**
 * PhotoCard backdrop for list cards — image, scrim, content on top.
 */
export function PhotoCard({ source, height = 148, radius = 20, darkness = 0.45, children, style }) {
  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden' }, style]}>
      <ImageBackground source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={[`rgba(5,5,6,${Math.max(0, darkness - 0.25)})`, `rgba(5,5,6,${darkness + 0.35})`]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end' }]}>{children}</View>
    </View>
  );
}
