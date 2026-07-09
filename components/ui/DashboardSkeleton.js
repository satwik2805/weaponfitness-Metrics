import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Skeleton, { SkeletonRow } from './Skeleton';

/**
 * Configurable loading skeleton for dashboard bodies — was re-declared three
 * times with drifting heights (review R-027).
 *
 * <DashboardSkeleton tiles={4} rows={3} />
 */
export default function DashboardSkeleton({ tiles = 4, rows = 3 }) {
  const { space } = useTheme();
  const tileRows = Math.ceil(tiles / 2);
  return (
    <View style={{ gap: space[3], marginTop: space[5] }}>
      {Array.from({ length: tileRows }).map((_, i) => (
        <View key={`t${i}`} style={{ flexDirection: 'row', gap: space[3] }}>
          <Skeleton height={110} style={{ flex: 1 }} radius={20} />
          <Skeleton height={110} style={{ flex: 1 }} radius={20} />
        </View>
      ))}
      <Skeleton height={180} radius={20} style={{ marginTop: space[3] }} />
      <View style={{ gap: space[3], marginTop: space[3] }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={`r${i}`} />
        ))}
      </View>
    </View>
  );
}
