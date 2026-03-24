import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Truck {
  _id: string;
  truckNumber: string;
  insuranceExpiry?: string;
  pollutionExpiry?: string;
  fitnessExpiry?: string;
  roadTaxExpiry?: string;
  carrierLegalLiabilityExpiry?: string;
  permitExpiry?: string;
}

const DOCS = [
  { key: 'insuranceExpiry', label: 'Insurance' },
  { key: 'pollutionExpiry', label: 'Pollution' },
  { key: 'fitnessExpiry', label: 'Fitness' },
  { key: 'roadTaxExpiry', label: 'Road Tax' },
  { key: 'carrierLegalLiabilityExpiry', label: 'CLL' },
  { key: 'permitExpiry', label: 'Permit' },
];

function docStatus(dateStr?: string): 'none' | 'expired' | 'soon' | 'valid' {
  if (!dateStr) return 'none';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return 'expired';
  if (diff < 14 * 24 * 60 * 60 * 1000) return 'soon';
  return 'valid';
}

const STATUS_COLOR = {
  expired: Colors.error,
  soon: Colors.warning,
  valid: Colors.success,
  none: Colors.textMuted,
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function ValidityScreen() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'expired' | 'soon'>('all');

  const endpoint = ENDPOINTS.TRUCKS;

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(endpoint);
      setTrucks(Array.isArray(data) ? data : (data.trucks ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  const filtered = trucks.filter(truck => {
    if (filter === 'all') return true;
    return DOCS.some(d => docStatus((truck as any)[d.key]) === filter);
  });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.filterRow}>
        {(['all', 'expired', 'soon'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'expired' ? 'Expired' : 'Expiring Soon'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ListSkeleton count={4} lines={2} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No trucks found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="car" size={18} color={Colors.primary} />
                <Text style={styles.truckNum}>{item.truckNumber}</Text>
              </View>
              <View style={styles.docsGrid}>
                {DOCS.map(d => {
                  const val = (item as any)[d.key];
                  const st = docStatus(val);
                  return (
                    <View key={d.key} style={styles.docItem}>
                      <View style={[styles.docDot, { backgroundColor: STATUS_COLOR[st] }]} />
                      <View>
                        <Text style={styles.docLabel}>{d.label}</Text>
                        <Text style={[styles.docDate, { color: STATUS_COLOR[st] }]}>{formatDate(val)}</Text>
                      </View>
                    </View>
                  );
                })}
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
  filterRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  filterBtn: {
    flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.sm,
    alignItems: 'center', backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  truckNum: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  docItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%' },
  docDot: { width: 8, height: 8, borderRadius: 4 },
  docLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  docDate: { fontSize: FontSize.xs, fontWeight: '500' },
});
