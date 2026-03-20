import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Assignment {
  truckId: string;
  truckNumber: string;
  driverId?: string;
  driverName?: string;
  assignedAt?: string;
}

export default function AssignmentScreen() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.DAILY_OPS_ASSIGNMENTS);
      setItems(Array.isArray(data) ? data : (data.assignments ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, index) => i.truckId ?? (i as any)._id ?? String(index)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="git-branch-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No assignments for today</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.truckIcon}>
                <Ionicons name="car" size={20} color={Colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={styles.truckNum}>{item.truckNumber}</Text>
                {item.driverName
                  ? <View style={styles.driverRow}>
                      <Ionicons name="person-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.driverName}>{item.driverName}</Text>
                    </View>
                  : <Text style={styles.unassigned}>Unassigned</Text>
                }
              </View>
              <View style={[styles.badge, { backgroundColor: item.driverName ? Colors.successBg : Colors.border }]}>
                <Text style={[styles.badgeText, { color: item.driverName ? Colors.success : Colors.textMuted }]}>
                  {item.driverName ? 'Assigned' : 'Open'}
                </Text>
              </View>
            </View>
          )}
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
  truckIcon: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.tealBg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  truckNum: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  driverName: { fontSize: FontSize.sm, color: Colors.textSecondary },
  unassigned: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 3 },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
});
