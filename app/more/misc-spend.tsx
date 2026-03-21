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

interface MiscSpend {
  _id: string;
  miscellaneousReason?: string;
  miscellaneousWhoDidTrx?: string;
  totalPayout?: number;
  paidAmount?: number;
  paidAt?: string;
  transactionUtr?: string;
}

function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MiscSpendScreen() {
  const [items, setItems] = useState<MiscSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(`${ENDPOINTS.DRIVER_TRANSACTIONS}?isMiscellaneous=true`);
      setItems(Array.isArray(data) ? data : (data.transactions ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total = items.reduce((s, i) => s + (i.totalPayout ?? 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {!loading && items.length > 0 && (
        <View style={styles.summaryBanner}>
          <Text style={styles.summaryLabel}>Total Misc Spend</Text>
          <Text style={styles.summaryValue}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
      )}
      {loading ? (
        <OmLoader />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No misc spends found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.iconBox}>
                <Ionicons name="receipt-outline" size={20} color={Colors.orange} />
              </View>
              <View style={styles.info}>
                <Text style={styles.reason}>{item.miscellaneousReason || '—'}</Text>
                {item.miscellaneousWhoDidTrx && <Text style={styles.sub}>By {item.miscellaneousWhoDidTrx}</Text>}
                <Text style={styles.date}>{formatDate(item.paidAt)}</Text>
              </View>
              <Text style={styles.amount}>₹{(item.totalPayout ?? 0).toLocaleString('en-IN')}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  summaryBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primaryDark, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  summaryLabel: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    gap: Spacing.md,
  },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  reason: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  amount: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.error },
});
