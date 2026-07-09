import React, { useRef } from 'react';
import { Animated, Pressable, RefreshControl, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
  Avatar,
  Badge,
  Button,
  CountUp,
  EmptyState,
  HeroBackdrop,
  IconButton,
  ListItem,
  ProgressBar,
  ProgressRing,
  Reveal,
  SectionTitle,
  Surface,
  Text,
} from '../../components/ui';
import { plural } from '../../utils/format';

/**
 * The member home â€” the most-used screen in the product, and the face of the
 * consumer app. Pure presentation: every datum and handler is passed in by
 * the TraineeHomeScreen container. No data access, no business logic here.
 */

const HERO = require('../../assets/photos/gym_hero.jpg');

const RINGS = [
  { key: 'attendance', label: 'GYM', color: 'accent' },
  { key: 'workout', label: 'WORKOUT', color: 'warning' },
  { key: 'diet', label: 'DIET', color: 'success' },
  { key: 'sleep', label: 'SLEEP', color: 'info' },
];

const DAY_INITIAL = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TraineeHomeView({
  userName,
  profileImage,
  gamification = {},
  todayLabel,
  todaysWorkouts = [],
  planActive = true,
  subscription,
  trainerInfo,
  motivation,
  nutritionSummary,
  refreshing = false,
  onRefresh,
  onShare,
  onToggleTheme,
  onScanPress,
  onDietPress,
  onCalendarPress,
  onSleepPress,
  onNutritionPress,
  onFeedbackPress,
  onWorkoutPress,
  onRenewPress,
}) {
  const { colors, space, radius, fonts, layout, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const daily = gamification.consistency?.daily || {};
  const weekly = gamification.consistency?.weekly || {};
  const streak = weekly.streak || 0;
  const daysDone = weekly.count || 0;
  const onFire = streak >= 5;
  const weekDays = Array.isArray(weekly.days) ? weekly.days : [];
  // First-run: nothing logged yet anywhere. Show encouragement, not a wall of 0%.
  const hasActivity =
    daysDone > 0 || streak > 0 || RINGS.some((r) => (daily[`${r.key}_weekly_avg`] || 0) > 0);

  const cals = Math.round(nutritionSummary?.total_calories || 0);
  const calGoal = nutritionSummary?.goals?.daily_calories
    ? Math.round(nutritionSummary.goals.daily_calories)
    : null;

  const quickActions = [
    { icon: 'qr-code-outline', label: 'Check in', onPress: onScanPress, tone: 'accent' },
    { icon: 'restaurant-outline', label: 'Log meal', onPress: onNutritionPress, tone: 'success' },
    { icon: 'moon-outline', label: 'Log sleep', onPress: onSleepPress, tone: 'info' },
    { icon: 'fast-food-outline', label: 'Diet plan', onPress: onDietPress, tone: 'warning' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.scrollPadBottom }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
          ) : undefined
        }
      >
        {/* cinematic hero â€” tighter, lighter scrim so the photo reads;
            capped to the content column so it doesn't letterbox on desktop */}
        <HeroBackdrop source={HERO} height={236} scrollY={scrollY} darkness={0.42} maxWidth={layout.contentMaxWidth} imageStyle={{ top: 0, bottom: 'auto' }}>
          <View
            style={{
              flex: 1,
              paddingHorizontal: space[5],
              maxWidth: 760,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            {/* Top row elements absolute positioned to top-right */}
            <View style={{ position: 'absolute', top: insets.top + space[3], right: space[5], flexDirection: 'row', alignItems: 'center', gap: space[2], zIndex: 10 }}>
              <IconButton
                icon={isDark ? 'sunny-outline' : 'moon-outline'}
                variant="ghost"
                color={colors.textOnPhoto}
                accessibilityLabel="Toggle theme"
                onPress={onToggleTheme}
              />
              <Avatar name={userName} uri={profileImage} size="md" />
            </View>

            {/* Centered container for details */}
            <View style={{ flex: 1, justifyContent: 'center', alignSelf: 'flex-end', width: '50%', alignItems: 'center', gap: space[3], marginTop: insets.top + space[4] }}>
              <Reveal index={0} distance={14} style={{ alignItems: 'center', width: '100%' }}>
                <Text variant="labelSm" color="textOnPhotoMuted" style={{ letterSpacing: 3, textAlign: 'center' }}>
                  WELCOME BACK
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.display, fontSize: 36, lineHeight: 40, letterSpacing: -1, color: colors.textOnPhoto, marginTop: 2, textAlign: 'center' }}>
                  {userName || ' '}
                </Text>
              </Reveal>

              <Reveal index={1} style={{ alignSelf: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], justifyContent: 'center' }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: space[3],
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: onFire ? 'rgba(255,69,0,0.22)' : 'rgba(0,0,0,0.35)',
                      borderWidth: 1,
                      borderColor: onFire ? '#FF6A00' : 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <Ionicons name="flame" size={15} color={onFire ? '#FF6A00' : '#FFB020'} />
                    <Text variant="label" color="textOnPhoto">
                      {plural(streak, 'day')}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: space[3],
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: 'rgba(0,0,0,0.35)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.18)',
                    }}
                  >
                    <Text variant="label" color="textOnPhoto">
                      Level {gamification.level || 1}
                    </Text>
                  </View>
                </View>
              </Reveal>
            </View>
          </View>
        </HeroBackdrop>

        <View style={{ paddingHorizontal: space[5], maxWidth: 760, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[4], marginTop: space[4] }}>
            {/* 1. WIDE HERO BLOCK: Daily Rings (Spans 100%) */}
            <View style={{ width: '100%' }}>
              <Reveal index={2}>
                <Surface level={1} pad={5} style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="labelSm" color="textMuted">TODAY'S RINGS</Text>
                    {hasActivity ? (
                      <Badge tone={daysDone >= 5 ? 'success' : 'neutral'}>{plural(daysDone, 'day')} this week</Badge>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[5] }}>
                    {RINGS.map((r) => (
                      <ProgressRing
                        key={r.key}
                        progress={daily[`${r.key}_weekly_avg`] || 0}
                        size={64}
                        strokeWidth={6}
                        color={r.color}
                        label={r.label}
                      />
                    ))}
                  </View>
                  {hasActivity ? (
                    <View style={{ marginTop: space[6] }}>
                      <Text variant="labelSm" color="textFaint" style={{ marginBottom: space[3] }}>7-DAY CONSISTENCY</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {DAY_INITIAL.map((d, i) => {
                          const met = weekDays[i]?.is_met;
                          const isToday = i === (new Date().getDay() + 6) % 7;
                          return (
                            <View key={`${d}-${i}`} style={{ alignItems: 'center', gap: 6 }}>
                              <View
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: 6,
                                  backgroundColor: met ? colors.accent : colors.surfaceOverlay,
                                  borderWidth: isToday ? 2 : (met ? 0 : 1),
                                  borderColor: isToday ? (colors.accentBright || '#2B7FE8') : colors.border,
                                }}
                              />
                              <Text
                                variant="caption"
                                color={isToday ? 'accentBright' : (met ? 'accentBright' : 'textFaint')}
                                style={isToday ? { fontWeight: 'bold' } : undefined}
                              >
                                {d}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    <View style={{ marginTop: space[5], paddingTop: space[5], borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="h4">Close your first ring today</Text>
                        <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>Check in at the gym to start your streak â€” workouts, meals and sleep fill the rest.</Text>
                      </View>
                      <Button title="Check in" size="sm" icon="qr-code-outline" onPress={onScanPress} />
                    </View>
                  )}
                </Surface>
              </Reveal>
            </View>
            {/* Macros Summary Card */}
            <Reveal index={2.5}>
              <Surface level={1} pad={5} style={{ marginTop: space[4] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[4] }}>
                  <Text variant="labelSm" color="textMuted">TODAY'S MACROS</Text>
                  <Badge tone={cals > (calGoal || 2000) ? 'danger' : 'success'}>
                    {cals} / {calGoal || 2000} kcal
                  </Badge>
                </View>

                <View style={{ flexDirection: 'row', gap: space[5], alignItems: 'center' }}>
                  {/* Left Column: Calories Progress Ring */}
                  <ProgressRing
                    progress={Math.min(cals / (calGoal || 2000), 1)}
                    size={80}
                    strokeWidth={8}
                    color="warning"
                  >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text variant="stat" style={{ fontSize: 14, fontWeight: 'bold' }}>
                        {Math.max(0, (calGoal || 2000) - cals)}
                      </Text>
                      <Text variant="caption" color="textMuted" style={{ fontSize: 9 }}>left</Text>
                    </View>
                  </ProgressRing>

                  {/* Right Column: Macro Progress Bars */}
                  <View style={{ flex: 1, gap: space[3] }}>
                    {/* Protein */}
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text variant="bodySm" color="textMuted" style={{ fontWeight: '500' }}>Protein 🍗</Text>
                        <Text variant="caption" color="textMuted">
                          {Math.round(nutritionSummary?.total_protein || 0)}g / {Math.round(nutritionSummary?.goals?.daily_protein || 150)}g
                        </Text>
                      </View>
                      <ProgressBar
                        progress={Math.min((nutritionSummary?.total_protein || 0) / (nutritionSummary?.goals?.daily_protein || 150), 1)}
                        color="danger"
                        height={6}
                      />
                    </View>

                    {/* Carbs */}
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text variant="bodySm" color="textMuted" style={{ fontWeight: '500' }}>Carbs 🍚</Text>
                        <Text variant="caption" color="textMuted">
                          {Math.round(nutritionSummary?.total_carbs || 0)}g / {Math.round(nutritionSummary?.goals?.daily_carbs || 200)}g
                        </Text>
                      </View>
                      <ProgressBar
                        progress={Math.min((nutritionSummary?.total_carbs || 0) / (nutritionSummary?.goals?.daily_carbs || 200), 1)}
                        color="success"
                        height={6}
                      />
                    </View>

                    {/* Fats */}
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text variant="bodySm" color="textMuted" style={{ fontWeight: '500' }}>Fats 🥑</Text>
                        <Text variant="caption" color="textMuted">
                          {Math.round(nutritionSummary?.total_fats || 0)}g / {Math.round(nutritionSummary?.goals?.daily_fats || 70)}g
                        </Text>
                      </View>
                      <ProgressBar
                        progress={Math.min((nutritionSummary?.total_fats || 0) / (nutritionSummary?.goals?.daily_fats || 70), 1)}
                        color="info"
                        height={6}
                      />
                    </View>
                  </View>
                </View>
              </Surface>
            </Reveal>

            {/* 2. TALL BLOCK LEFT: Today's Training (Spans ~50% on large, 100% on small) */}
            <View style={{ flex: 1, minWidth: 280 }}>
              <SectionTitle action="Calendar" onAction={onCalendarPress} style={{ marginTop: 0 }}>
                {todayLabel ? `Today Â· ${todayLabel}` : 'Today'}
              </SectionTitle>
              <Reveal index={3}>
                <Surface level={1} pad={todaysWorkouts.length && planActive ? 3 : 2} style={{ height: 260, justifyContent: 'space-between' }}>
                  {!planActive ? (
                    <EmptyState compact icon="lock-closed-outline" title="Membership inactive" body="Renew to unlock training." />
                  ) : todaysWorkouts.length === 0 ? (
                    <EmptyState compact icon="barbell-outline" title="Nothing scheduled" body="Rest is part of the plan. Tomorrow's session will load here." />
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ flex: 1 }}>
                      {todaysWorkouts.map((w, i) => (
                        <ListItem
                          key={w.id}
                          icon={w.isCompleted ? 'checkmark-done' : 'barbell'}
                          iconTone={w.isCompleted ? 'success' : 'accent'}
                          title={w.name}
                          subtitle={w.instructions ? w.instructions.split('\n')[0] : 'View session'}
                          chevron={!w.isCompleted}
                          onPress={() => onWorkoutPress(w)}
                          separator={i < todaysWorkouts.length - 1}
                        />
                      ))}
                    </ScrollView>
                  )}
                </Surface>
              </Reveal>
            </View>

            {/* 3. TALL BLOCK RIGHT: Nutrition (Spans ~50% on large, 100% on small) */}
            <View style={{ flex: 1, minWidth: 280 }}>
              <SectionTitle action="Log" onAction={onNutritionPress} style={{ marginTop: 0 }}>Nutrition</SectionTitle>
              <Reveal index={4}>
                <Pressable onPress={onNutritionPress} accessibilityRole="button" style={{ flex: 1 }}>
                  <Surface level={1} pad={4} style={{ height: 260, justifyContent: 'space-between' }}>
                    <View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                          <Text variant="labelSm" color="textMuted">CALORIES TODAY</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[1], marginTop: 4 }}>
                            <CountUp value={cals} variant="statLg" />
                            <Text variant="bodySm" color="textFaint" style={{ marginBottom: 5 }}>
                              / {calGoal ? `${calGoal} kcal` : 'â€” kcal'}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="flame" size={26} color={colors.accent} />
                      </View>
                      {calGoal ? <ProgressBar progress={cals / calGoal} style={{ marginTop: space[3] }} /> : null}
                    </View>

                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space[3], marginTop: space[3] }}>
                      {[
                        { label: 'PROTEIN', val: nutritionSummary?.total_protein, tone: 'danger' },
                        { label: 'CARBS', val: nutritionSummary?.total_carbs, tone: 'success' },
                        { label: 'FATS', val: nutritionSummary?.total_fats, tone: 'info' },
                      ].map((m) => (
                        <View key={m.label} style={{ flex: 1 }}>
                          <Text variant="labelSm" color={m.tone}>{m.label}</Text>
                          <Text variant="statSm" style={{ marginTop: 2 }}>{Math.round(m.val || 0)}g</Text>
                        </View>
                      ))}
                    </View>
                  </Surface>
                </Pressable>
              </Reveal>
            </View>

            {/* 4. ACTIONS: Quick Actions (Wide Block 100%) */}
            <View style={{ width: '100%', marginTop: space[2] }}>
              <Reveal index={5}>
                <Surface level={1} pad={4}>
                  <Text variant="labelSm" color="textMuted" style={{ marginBottom: space[4] }}>QUICK ACTIONS</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    {quickActions.map((a) => (
                      <Pressable
                        key={a.label}
                        onPress={a.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={a.label}
                        style={({ pressed }) => ({
                          flex: 1,
                          alignItems: 'center',
                          transform: [{ scale: pressed ? 0.96 : 1 }],
                        })}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: radius.md,
                            backgroundColor: colors[`${a.tone}Soft`] || colors.accentSoft,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: space[2],
                          }}
                        >
                          <Ionicons name={a.icon} size={22} color={colors[`${a.tone}Bright`] || colors[a.tone] || colors.accentBright} />
                        </View>
                        <Text variant="caption" color="textMuted" align="center">{a.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Surface>
              </Reveal>
            </View>

            {/* 5. MOTIVATION CARD (Spans 100%) */}
            {motivation ? (
              <View style={{ width: '100%' }}>
                <Reveal index={6}>
                  <Surface level={1} pad={4} style={{ flexDirection: 'row', gap: space[3], alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="ribbon" size={22} color={colors.accentBright} />
                    </View>
                    <View style={{ flex: 1 }}>
                      {motivation.greeting ? <Text variant="h4">{motivation.greeting}</Text> : null}
                      {motivation.quote ? <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>{motivation.quote}</Text> : null}
                    </View>
                    <IconButton icon="share-social-outline" variant="ghost" accessibilityLabel="Share" onPress={onShare} />
                  </Surface>
                </Reveal>
              </View>
            ) : null}

          </View>

          {/* Coach & Membership sections rendered below the bento grid */}
          <SectionTitle>Your coach</SectionTitle>
          <Surface level={1} pad={3}>
            {trainerInfo ? (
              <>
                <ListItem leading={<Avatar name={trainerInfo.name} size="md" />} title={trainerInfo.name} subtitle={trainerInfo.bio || 'Your assigned trainer'} separator />
                <ListItem icon="chatbubble-ellipses-outline" title="Send feedback" subtitle="Tell your coach how it's going" onPress={onFeedbackPress} chevron />
              </>
            ) : (
              <EmptyState compact icon="person-outline" title="No coach assigned yet" body="Ask the front desk to pair you with a trainer." />
            )}
          </Surface>

          <SectionTitle>Membership</SectionTitle>
          <Surface level={1} pad={4}>
            {!planActive ? (
              <View style={{ gap: space[3] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                  <Ionicons name="alert-circle" size={22} color={colors.danger} />
                  <Text variant="h4" style={{ flex: 1 }}>Membership inactive</Text>
                </View>
                <Text variant="bodySm" color="textMuted">Renew to bring back workouts, check-ins and your plan.</Text>
                <Button title="How to renew" variant="secondary" icon="refresh" onPress={onRenewPress} />
              </View>
            ) : subscription ? (
              <View style={{ gap: space[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text variant="h4">{subscription.planName}</Text>
                    <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>{subscription.daysLeft} day{subscription.daysLeft === 1 ? '' : 's'} left</Text>
                  </View>
                  <Badge tone={subscription.daysLeft < 5 ? 'warning' : 'success'} icon={subscription.daysLeft < 5 ? 'time' : 'checkmark-circle'}>
                    {subscription.daysLeft < 5 ? 'Expiring' : 'Active'}
                  </Badge>
                </View>
                {subscription.daysLeft < 5 ? (
                  <Button title="How to renew" variant="secondary" icon="refresh" onPress={onRenewPress} />
                ) : null}
              </View>
            ) : (
              <EmptyState compact icon="card-outline" title="No active membership" body="Visit the front desk to start a plan." />
            )}
          </Surface>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
