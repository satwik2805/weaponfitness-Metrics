import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import Text from '../ui/Text';

/**
 * The Weapon Fitness mark — a forged "W" cut like a blade edge.
 * Drawn, not imported: scales crisply at any size, themes itself.
 *
 * <LogoMark size={64} />            badge form (gradient tile + blade W)
 * <Wordmark size="lg" />            WEAPON FITNESS type lockup
 * <LogoLockup />                    mark + wordmark, hero-ready
 */

// SVG ids are document-global on web; the stack keeps screens mounted, so a
// shared id breaks the gradient on every instance after the first.
let markInstance = 0;

export function LogoMark({ size = 64, radius }) {
  const { colors, isDark } = useTheme();
  const idRef = React.useRef(`wfTile${++markInstance}`);
  const tileId = idRef.current;
  const r = radius ?? size * 0.28;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id={tileId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4D9FFF" />
          <Stop offset="0.55" stopColor="#2B7FE8" />
          <Stop offset="1" stopColor="#1D63C0" />
        </SvgGradient>
      </Defs>
      <Rect x="0" y="0" width="64" height="64" rx={r} fill={`url(#${tileId})`} />
      {/* blade W — two strokes, center apex raised like a tip */}
      <Path
        d="M14 20 L22.5 46 L32 26 L41.5 46 L50 20"
        stroke="#FFFFFF"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* edge glint */}
      <Path
        d="M44.2 24.5 L50 20"
        stroke={isDark ? '#FFD9D6' : '#FFE3E1'}
        strokeWidth="5.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
    </Svg>
  );
}

export function Wordmark({ size = 'md', align = 'flex-start' }) {
  const { fonts } = useTheme();
  const fs = { sm: 18, md: 26, lg: 34, xl: 44 }[size] || 26;
  return (
    <View style={{ alignItems: align }}>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: fs,
          lineHeight: fs * 1.08,
          letterSpacing: fs * 0.06,
        }}
      >
        WEAPON
      </Text>
      <Text
        color="accentBright"
        style={{
          fontFamily: fonts.display,
          fontSize: fs * 0.62,
          lineHeight: fs * 0.8,
          letterSpacing: fs * 0.22,
          marginTop: 2,
        }}
      >
        FITNESS
      </Text>
    </View>
  );
}

export function LogoLockup({ markSize = 56, wordSize = 'md', gap = 14 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      <LogoMark size={markSize} />
      <Wordmark size={wordSize} />
    </View>
  );
}
