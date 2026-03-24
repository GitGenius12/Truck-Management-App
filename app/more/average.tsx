import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface Trip {
  _id: string;
  truckId?: { _id: string; truckNumber: string } | string;
  previousKm?: number;
  currentKm?: number;
  diesel?: number;
  tripDate?: string;
}

interface TruckStat {
  truckId: string;
  truckNumber: string;
  totalTrips: number;
  totalKm: number;
  totalDiesel: number;
  avgMileage: number;
}

export default function AverageScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TruckStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const endpoint = ENDPOINTS.TRIPS;

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(endpoint);
      const trips: Trip[] = Array.isArray(data) ? data : (data.trips ?? []);

      // Aggregate by truck
      const map: Record<string, TruckStat> = {};
      for (const t of trips) {
        const tid = typeof t.truckId === 'object' && t.truckId ? t.truckId._id : String(t.truckId);
        const tNum = typeof t.truckId === 'object' && t.truckId ? t.truckId.truckNumber : 'Unknown';
        if (!map[tid]) map[tid] = { truckId: tid, truckNumber: tNum, totalTrips: 0, totalKm: 0, totalDiesel: 0, avgMileage: 0 };
        const km = (t.currentKm ?? 0) - (t.previousKm ?? 0);
        if (km > 0) { map[tid].totalKm += km; }
        if (t.diesel) map[tid].totalDiesel += t.diesel;
        map[tid].totalTrips += 1;
      }
      const result = Object.values(map).map(s => ({
        ...s,
        avgMileage: s.totalDiesel > 0 ? parseFloat((s.totalKm / s.totalDiesel).toFixed(2)) : 0,
      })).sort((a, b) => b.totalTrips - a.totalTrips);
      setStats(result);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <ListSkeleton count={5} lines={2} />
      ) : (
        <FlatList
          data={stats}
          keyExtractor={i => i.truckId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListHeaderComponent={stats.length > 0 ? (
            <View style={styles.summaryRow}>
              <SummaryCard label="Total Trucks" value={String(stats.length)} icon="car-outline" />
              <SummaryCard
                label="Total KM"
                value={stats.reduce((s, t) => s + t.totalKm, 0).toLocaleString('en-IN')}
                icon="speedometer-outline"
              />
              <SummaryCard
                label="Avg Mileage"
                value={`${(stats.reduce((s, t) => s + t.avgMileage, 0) / stats.length).toFixed(1)} km/L`}
                icon="flash-outline"
              />
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trending-up-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No trip data found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.truckIcon}>
                  <Ionicons name="car" size={20} color={Colors.primary} />
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.truckNum}>{item.truckNumber}</Text>
                <Text style={styles.sub}>{item.totalTrips} trips</Text>
              </View>
              <View style={styles.statsCol}>
                <View style={styles.statRow}>
                  <Ionicons name="speedometer-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.statVal}>{item.totalKm.toLocaleString('en-IN')} km</Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="water-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.statVal}>{item.totalDiesel.toFixed(1)} L</Text>
                </View>
                <View style={styles.statRow}>
                  <Ionicons name="flash-outline" size={12} color={Colors.success} />
                  <Text style={[styles.statVal, { color: Colors.success, fontWeight: '700' }]}>
                    {item.avgMileage} km/L
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg, paddingBottom: 120 },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    alignItems: 'center', gap: 4, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  summaryValue: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    gap: Spacing.md,
  },
  cardLeft: {},
  truckIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.tealBg, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  truckNum: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statsCol: { alignItems: 'flex-end', gap: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statVal: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
