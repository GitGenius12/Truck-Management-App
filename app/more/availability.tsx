import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OmLoader from '@/components/OmLoader';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface TruckAvailability {
  truckId: string;
  truckNumber: string;
  availabilityStatus: string;
  note?: string;
  updatedAt?: string;
}

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  AVAILABLE: { bg: Colors.successBg, text: Colors.success, dot: Colors.success },
  ON_TRIP: { bg: Colors.tealBg, text: Colors.primary, dot: Colors.primary },
  MAINTENANCE: { bg: '#FEF9C3', text: Colors.warning, dot: Colors.warning },
  UNAVAILABLE: { bg: Colors.errorBg, text: Colors.error, dot: Colors.error },
};

export default function AvailabilityScreen() {
  const [items, setItems] = useState<TruckAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.DAILY_OPS_AVAILABILITY);
      setItems(Array.isArray(data) ? data : (data.trucks ?? data.availability ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <OmLoader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, index) => i.truckId ?? (i as any)._id ?? String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No availability data</Text>
            </View>
          }
          renderItem={({ item }) => {
            const st = STATUS_COLOR[item.availabilityStatus] ?? STATUS_COLOR.UNAVAILABLE;
            return (
              <View style={styles.card}>
                <View style={styles.icon}>
                  <Ionicons name="car" size={20} color={Colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.truckNum}>{item.truckNumber}</Text>
                  {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <View style={[styles.dot, { backgroundColor: st.dot }]} />
                  <Text style={[styles.badgeText, { color: st.text }]}>
                    {item.availabilityStatus.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    gap: Spacing.md,
  },
  icon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.tealBg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  truckNum: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  note: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
});
