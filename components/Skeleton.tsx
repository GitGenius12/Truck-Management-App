import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = Radius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: Colors.border, opacity },
        style,
      ]}
    />
  );
}

/** Skeleton shaped like a typical list card row */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <View style={skStyles.card}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={skStyles.cardBody}>
        <Skeleton width="60%" height={14} />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={i === 0 ? '80%' : '50%'} height={12} style={{ marginTop: 6 }} />
        ))}
      </View>
    </View>
  );
}

/** Multiple card skeletons for list screens */
export function ListSkeleton({ count = 5, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <View style={skStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </View>
  );
}

/** Three stat boxes in a row (dashboard snapshot style) */
export function StatRowSkeleton() {
  return (
    <View style={skStyles.statRow}>
      {[0, 1, 2].map(i => (
        <View key={i} style={skStyles.statBox}>
          <Skeleton width={40} height={28} borderRadius={6} />
          <Skeleton width={50} height={10} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** Detail page skeleton with header block + info rows */
export function DetailSkeleton() {
  return (
    <View style={skStyles.detail}>
      <View style={skStyles.detailHeader}>
        <Skeleton width={64} height={64} borderRadius={32} />
        <Skeleton width="50%" height={18} style={{ marginTop: 12 }} />
        <Skeleton width="35%" height={12} style={{ marginTop: 8 }} />
      </View>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={skStyles.detailRow}>
          <Skeleton width="30%" height={12} />
          <Skeleton width="55%" height={12} />
        </View>
      ))}
      <Skeleton width="100%" height={1} style={{ marginVertical: 12 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={`t${i}`} lines={1} />
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  cardBody: { flex: 1 },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  statRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  detail: { padding: Spacing.lg },
  detailHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});
