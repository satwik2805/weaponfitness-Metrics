import React, { useState, Component, useEffect, useMemo } from 'react';
import { View, ScrollView, Platform, ActivityIndicator, Pressable, Linking, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Text, Surface, Chip, EmptyState, Reveal } from './ui';
import MuscleFigure from './MuscleFigure';

const Mannequin3D = React.lazy(() => import('./anatomy/Mannequin3D'));
import { MUSCLE_GROUPS, GROUP_BY_KEY, MUSCLE_EXERCISES, youtubeId } from './anatomy/muscles';

// Required static paths for Metro bundler
const EXERCISE_IMAGES = {
  // Chest
  'bench-press': require('../assets/photos/push_workout.png'),
  'push-up': require('../assets/photos/push_up.png'),
  'db-fly': require('../assets/photos/db_fly.png'),

  // Back
  'pull-up': require('../assets/photos/pull_up.png'),
  'barbell-row': require('../assets/photos/pull_workout.png'),
  'lat-pulldown': require('../assets/photos/lat_pulldown.png'),

  // Shoulders
  'overhead-press': require('../assets/photos/shoulder_workout.png'),
  'lateral-raise': require('../assets/photos/lateral_raise.png'),

  // Biceps
  'bicep-curl': require('../assets/photos/arm_workout.png'),
  'hammer-curl': require('../assets/photos/hammer_curl.png'),

  // Triceps
  'tricep-extension': require('../assets/photos/tricep_extension.png'),
  'dip': require('../assets/photos/dip.png'),

  // Core
  'plank': require('../assets/photos/core_workout.png'),
  'crunch': require('../assets/photos/crunch.png'),
  'leg-raise': require('../assets/photos/leg_raise.png'),

  // Quads / Legs / Knees
  'squat': require('../assets/photos/leg_workout.png'),
  'leg-extension': require('../assets/photos/leg_extension.png'),
  'deadlift': require('../assets/photos/deadlift_pose.png'),
  'leg-curl': require('../assets/photos/leg_curl.png'),
  'hip-thrust': require('../assets/photos/hip_thrust_pose.png'),
  'walking-lunge': require('../assets/photos/lunge_pose.png'),
  'goblet-squat': require('../assets/photos/goblet_squat_pose.png'),
  'bulgarian-split-squat': require('../assets/photos/bulgarian_split_squat_pose.png'),
  'db-reverse-lunge': require('../assets/photos/db_reverse_lunge_pose.png'),
  'seated-adductor': require('../assets/photos/seated_adductor_pose.png'),
  'cable-adduction': require('../assets/photos/cable_adduction_pose.png'),

  // Calves / Lower leg
  'calf-raise': require('../assets/photos/calf_workout.png'),
  'feet-calf-raise': require('../assets/photos/calf_workout.png'),
  'calf-press-leg-press': require('../assets/photos/calf_press_pose.png'),

  // Miscellaneous / Grip / Shrugs
  'reverse-curl': require('../assets/photos/wrist_curl_pose.png'),
  'wrist-curl': require('../assets/photos/arm_workout.png'),
  'barbell-shrug': require('../assets/photos/pull_workout.png'),
  'db-shrug': require('../assets/photos/shoulder_workout.png'),
  'farmers-walk': require('../assets/photos/arm_workout.png'),
};

// Map exercise id to category image
const getExerciseImage = (exerciseId) => {
  return EXERCISE_IMAGES[exerciseId] || EXERCISE_IMAGES['bench-press'];
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return `rgba(43, 127, 232, ${alpha})`;
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return `rgba(43, 127, 232, ${alpha})`;
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.warn("3D Mannequin error, falling back to 2D:", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/**
 * The anatomy explorer. A dark "scanner" panel holds a front+back figure; the
 * selected muscle glows accent. Tap a muscle (or a chip) to load a small
 * reference library of well-coached movements that train it, each with an
 * inline form video.
 */
export default function AnatomyView() {
  const { colors, space, radius, isDark } = useTheme();
  const [selected, setSelected] = useState(null);
  const [panelW, setPanelW] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);

  const group = selected ? GROUP_BY_KEY[selected] : null;
  const exercises = selected ? MUSCLE_EXERCISES[selected] || [] : [];

  // figure scale from the measured panel: two 200-wide figures + a gutter.
  const figureScale = panelW ? clamp((panelW - space[4] * 2 - space[4]) / 2 / 200, 0.55, 1) : 0.8;

  // Load bookmarks on mount
  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const saved = await AsyncStorage.getItem('bookmarked_exercises');
        if (saved) {
          setBookmarkedIds(JSON.parse(saved));
        }
      } catch (e) {
        console.warn('Failed to load bookmarks', e);
      }
    };
    loadBookmarks();
  }, []);

  const toggleBookmark = async (id) => {
    const next = bookmarkedIds.includes(id)
      ? bookmarkedIds.filter(x => x !== id)
      : [...bookmarkedIds, id];
    setBookmarkedIds(next);
    try {
      await AsyncStorage.setItem('bookmarked_exercises', JSON.stringify(next));
    } catch (e) {
      console.warn('Failed to save bookmarks', e);
    }
  };

  // Find all exercises across all muscle groups matching bookmarked IDs
  const bookmarkedExercises = useMemo(() => {
    const list = [];
    Object.keys(MUSCLE_EXERCISES).forEach(groupKey => {
      const groupExercises = MUSCLE_EXERCISES[groupKey] || [];
      groupExercises.forEach(ex => {
        if (bookmarkedIds.includes(ex.id) && !list.some(x => x.id === ex.id)) {
          list.push(ex);
        }
      });
    });
    return list;
  }, [bookmarkedIds]);

  const handleSelect = (key) => {
    setSelected(key);
  };

  return (
    <View style={{ paddingHorizontal: space[5], gap: space[5] }}>
      <Reveal index={0}>
        <Text variant="bodySm" color="textMuted">
          Tap a muscle on the figure — or pick a group below — to see movements that train it.
        </Text>
      </Reveal>

      {/* SCANNER PANEL — always dark in both themes, like the app's photo heroes */}
      <Reveal index={1}>
        <View
          onLayout={(e) => setPanelW(e.nativeEvent.layout.width)}
          style={{
            backgroundColor: isDark ? '#08080A' : colors.surface,
            borderRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: space[4],
            paddingTop: space[6],
            paddingBottom: space[5],
            overflow: 'hidden',
          }}
        >
          {/* floor glow for depth */}
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', hexToRgba(colors.accent, 0.10)]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 }}
          />

          {/* selection caption */}
          <View
            style={{
              position: 'absolute',
              top: space[3],
              left: space[4],
              right: space[4],
              gap: 2,
              zIndex: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              <Ionicons name="body-outline" size={14} color={colors.accentBright} />
              <Text variant="labelSm" color={isDark ? 'textOnPhoto' : 'textMuted'} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                {group ? group.label : 'Full body'}
              </Text>
            </View>

            {group && (
              <View style={{ marginTop: 2, gap: 1 }}>
                <Text variant="caption" color={isDark ? 'textOnPhoto' : 'text'} style={{ fontStyle: 'italic', opacity: 0.9 }}>
                  "{group.encouragement}"
                </Text>
                <Text variant="caption" color={isDark ? 'textOnPhoto' : 'textMuted'} style={{ fontSize: 10, opacity: 0.75, maxWidth: '65%' }}>
                  {group.importance}
                </Text>
              </View>
            )}
          </View>

          {panelW > 0 ? (
            Platform.OS === 'web' ? (
              <ErrorBoundary fallback={<MuscleFigure selectedGroup={selected} onSelectGroup={handleSelect} scale={figureScale} />}>
                <React.Suspense fallback={
                  <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                }>
                  <Mannequin3D selectedGroup={selected} onSelectGroup={handleSelect} />
                </React.Suspense>
              </ErrorBoundary>
            ) : (
              <MuscleFigure selectedGroup={selected} onSelectGroup={handleSelect} scale={figureScale} />
            )
          ) : (
            <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}
        </View>
      </Reveal>

      {/* MUSCLE SELECTOR */}
      <Reveal index={2}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space[2], paddingRight: space[5] }}
        >
          {MUSCLE_GROUPS.map((g) => (
            <Chip key={g.key} label={g.label} selected={selected === g.key} onPress={() => handleSelect(g.key)} />
          ))}
        </ScrollView>
      </Reveal>

      {/* RECOMMENDED EXERCISES */}
      {selected ? (
        <View style={{ gap: space[3] }}>
          <Reveal index={3}>
            <View style={{ gap: 2 }}>
              <Text variant="labelSm" color="accentBright">
                TARGETED WORK
              </Text>
              <Text variant="h3">{group?.label}</Text>
            </View>
          </Reveal>

          {exercises.length === 0 ? (
            <EmptyState icon="barbell-outline" title="No movements yet" body="We haven't added reference exercises for this group." />
          ) : (
            exercises.map((ex, i) => (
              <Reveal key={ex.id} index={4 + i}>
                <ExerciseCard
                  exercise={ex}
                  imageSource={getExerciseImage(ex.id)}
                  isBookmarked={bookmarkedIds.includes(ex.id)}
                  onBookmarkToggle={() => toggleBookmark(ex.id)}
                />
              </Reveal>
            ))
          )}
        </View>
      ) : (
        <Reveal index={3}>
          <Surface level={1} pad={5} style={{ alignItems: 'center', gap: space[2] }}>
            <Ionicons name="hand-left-outline" size={22} color={colors.textFaint} />
            <Text variant="body" color="textMuted" align="center">
              Select a muscle group to load recommended movements and form videos.
            </Text>
          </Surface>
        </Reveal>
      )}

      {/* BOOKMARKED VIDEOS SECTION */}
      <View style={{ gap: space[3], marginTop: space[4], paddingBottom: space[6] }}>
        <View style={{ gap: 2 }}>
          <Text variant="labelSm" color="accentBright">
            SAVED TUTORIALS
          </Text>
          <Text variant="h3">Bookmarked Videos</Text>
        </View>

        {bookmarkedExercises.length === 0 ? (
          <Surface level={1} pad={5} style={{ alignItems: 'center', gap: space[2] }}>
            <Ionicons name="bookmark-outline" size={22} color={colors.textFaint} />
            <Text variant="body" color="textMuted" align="center">
              No bookmarked videos yet. Tap the bookmark icon on any exercise to save it here.
            </Text>
          </Surface>
        ) : (
          bookmarkedExercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              imageSource={getExerciseImage(ex.id)}
              isBookmarked={true}
              onBookmarkToggle={() => toggleBookmark(ex.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}

function ExerciseCard({ exercise, imageSource, isBookmarked, onBookmarkToggle }) {
  const { colors, space, radius } = useTheme();

  const handlePress = () => {
    if (exercise.videoUrl) {
      Linking.openURL(exercise.videoUrl);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${exercise.name} video on YouTube`}
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <Surface level={1} pad={0} radius="lg" style={{ overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            padding: space[4],
          }}
        >
          {/* High-quality white background thumbnail showing correct workout pose */}
          <View
            style={{
              width: 72,
              height: 48,
              borderRadius: radius.md,
              backgroundColor: '#FFFFFF',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Image
              source={imageSource}
              style={{
                width: 64,
                height: 40,
              }}
              resizeMode="contain"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="h4">{exercise.name}</Text>
            <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
              {exercise.cue}
            </Text>
          </View>

          {/* Bookmark toggle button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onBookmarkToggle();
            }}
            accessibilityRole="button"
            accessibilityLabel={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}
            hitSlop={8}
            style={({ pressed }) => ({
              padding: space[2],
              transform: [{ scale: pressed ? 0.85 : 1 }]
            })}
          >
            <Ionicons
              name={isBookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={isBookmarked ? colors.accentBright : colors.textMuted}
            />
          </Pressable>

          <View style={{ padding: space[2], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="logo-youtube" size={18} color="#FF0000" />
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}
