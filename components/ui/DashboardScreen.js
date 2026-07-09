import React, { useRef } from 'react';
import { Animated, RefreshControl, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import ErrorState from './ErrorState';

/**
 * The dashboard shell — owns the parallax ScrollView, the layout contract
 * (content max-width + gutter + dock clearance) and the loading/error/empty/
 * data state branch, so every dashboard stops re-implementing them (review
 * R-007/R-016/R-026). The hero is rendered full-bleed above a centered body.
 *
 * <DashboardScreen
 *   renderHero={(scrollY) => <CinematicHero scrollY={scrollY} … />}
 *   loading={loading} error={error} isEmpty={!data} onRetry={retry}
 *   refreshing={refreshing} onRefresh={refresh}
 *   skeleton={<DashboardSkeleton/>} emptyState={<EmptyState … />}>
 *   {body}
 * </DashboardScreen>
 */
export default function DashboardScreen({
  renderHero,
  loading,
  error,
  isEmpty,
  onRetry,
  refreshing,
  onRefresh,
  skeleton,
  emptyState,
  errorTitle = "Couldn't load this",
  children,
}) {
  const { colors, space, layout } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;

  let body;
  if (loading) body = skeleton ?? null;
  else if (error && isEmpty) {
    body = (
      <ErrorState
        title={errorTitle}
        detail={error?.message}
        onRetry={onRetry}
        style={{ marginTop: space[8] }}
      />
    );
  } else if (isEmpty) body = emptyState ?? null;
  else body = children;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.scrollPadBottom }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
          ) : undefined
        }
      >
        {renderHero ? renderHero(scrollY) : null}
        <View
          style={{
            paddingHorizontal: layout.gutter,
            maxWidth: layout.contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          {body}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
