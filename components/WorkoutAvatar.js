import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Text } from './ui';
import MuscleFigure from './MuscleFigure';
import { GROUP_BY_KEY } from './anatomy/muscles';

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Movement -> the muscle groups it trains, keyed to anatomy/muscles.js. Matched
 * by keyword so a reasonably-named exercise still resolves; an unmatched name
 * falls through to a graceful "no map" panel instead of rendering nothing.
 * Order matters — more specific names (e.g. "shoulder press") must not be
 * shadowed by a looser earlier entry.
 */
const WORKOUT_MUSCLES = [
  { keywords: ['squat', 'leg press', 'leg extension'], primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves', 'core'] },
  { keywords: ['bench press', 'chest press', 'dumbbell press', 'pec'], primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  { keywords: ['pushup', 'push-up', 'push up', 'dip'], primary: ['chest', 'triceps'], secondary: ['shoulders', 'core'] },
  { keywords: ['shoulder press', 'overhead press', 'military press', 'lateral raise'], primary: ['shoulders'], secondary: ['triceps'] },
  { keywords: ['pullup', 'pull-up', 'pull up', 'lat pulldown', 'row'], primary: ['back', 'biceps'], secondary: ['shoulders'] },
  { keywords: ['curl', 'bicep', 'hammer'], primary: ['biceps'], secondary: [] },
  { keywords: ['deadlift', 'back extension', 'good morning'], primary: ['back', 'glutes', 'hamstrings'], secondary: ['quads', 'calves'] },
  { keywords: ['plank', 'crunch', 'leg raise', 'sit-up', 'abs'], primary: ['core'], secondary: ['shoulders', 'quads'] },
  { keywords: ['lunge', 'split squat', 'step up'], primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves', 'core'] },
];

const resolveWorkout = (workoutType) => {
  const type = (workoutType || '').toLowerCase().trim();
  if (!type) return null;
  return WORKOUT_MUSCLES.find((w) => w.keywords.some((kw) => type.includes(kw))) || null;
};

const labelsOf = (keys) => keys.map((k) => GROUP_BY_KEY[k]?.label).filter(Boolean);
const slugsOf = (keys) => keys.flatMap((k) => GROUP_BY_KEY[k]?.slugs || []);

/**
 * WorkoutAvatar — a 2D anatomical "muscle map" for a single movement. The
 * front+back figure lights the primary movers in accent; the legend names the
 * primary and (resting) secondary groups.
 *
 * Rebuilt on the design system (decision D-027). The previous version was a
 * three.js mannequin imported from `@react-three/fiber`'s *web* entry, which
 * crashes on a real device — expo-gl needs `@react-three/fiber/native`. That's
 * the same native-crash bug class retired for the anatomy scene in D-026. This
 * renders identically on web and native through react-native-svg, so there is
 * no platform split (.web/.native) and no error boundary to fall back from.
 */
export default function WorkoutAvatar({ workoutType }) {
  const { colors, space, radius } = useTheme();
  const [panelW, setPanelW] = useState(0);

  const workout = useMemo(() => resolveWorkout(workoutType), [workoutType]);

  // Scanner panel — always dark in both themes, like the app's photo heroes and
  // the anatomy explorer it shares a visual language with.
  const panelStyle = {
    backgroundColor: '#08080A',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: space[4],
    paddingTop: space[6],
    paddingBottom: space[5],
    overflow: 'hidden',
  };

  if (!workout) {
    return (
      <View style={[panelStyle, { alignItems: 'center', justifyContent: 'center', minHeight: 220, gap: space[2] }]}>
        <Ionicons name="body-outline" size={26} color={colors.textOnPhotoFaint} />
        <Text variant="bodySm" color="textOnPhotoMuted" align="center">
          Muscle map not available for this movement.
        </Text>
      </View>
    );
  }

  const primarySlugs = slugsOf(workout.primary);
  const primary = labelsOf(workout.primary);
  const secondary = labelsOf(workout.secondary);

  // two 200-wide figures + a gutter, scaled to the measured panel width.
  const figureScale = panelW ? clamp((panelW - space[4] * 2 - space[4]) / 2 / 200, 0.5, 0.95) : 0.75;

  return (
    <View onLayout={(e) => setPanelW(e.nativeEvent.layout.width)} style={panelStyle}>
      {/* floor glow for depth — mirrors the anatomy scanner panel */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(229,9,20,0.10)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 }}
      />

      {/* caption */}
      <View
        style={{
          position: 'absolute',
          top: space[3],
          left: space[4],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          zIndex: 1,
        }}
      >
        <Ionicons name="barbell-outline" size={14} color={colors.accentBright} />
        <Text variant="labelSm" color="textOnPhoto">
          Muscle map
        </Text>
      </View>

      {panelW > 0 ? <MuscleFigure highlightSlugs={primarySlugs} scale={figureScale} /> : <View style={{ height: 300 }} />}

      {/* legend — the dot colours match what the figure shows */}
      <View style={{ gap: space[2], marginTop: space[4] }}>
        <LegendRow label="Primary" muscles={primary} dot={colors.accent} textColor="textOnPhoto" />
        {secondary.length > 0 ? (
          <LegendRow label="Secondary" muscles={secondary} dot="rgba(255,255,255,0.28)" textColor="textOnPhotoMuted" />
        ) : null}
      </View>
    </View>
  );
}

function LegendRow({ label, muscles, dot, textColor }) {
  const { space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text variant="labelSm" color="textOnPhotoFaint" style={{ width: 76 }}>
        {label}
      </Text>
      <Text variant="bodySm" color={textColor} style={{ flex: 1 }}>
        {muscles.join('  ·  ')}
      </Text>
    </View>
  );
}
