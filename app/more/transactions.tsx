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

interface Transaction {
  _id: string;
  driverId?: { name: string; phone?: string };
  month?: number;
  year?: number;
  monthlySalary?: number;
  calculatedSalary?: number;
  totalPayout?: number;
  paidAmount?: number;
  paymentStatus?: string;
  isMiscellaneous?: boolean;
  miscellaneousReason?: string;
  presentDays?: number;
  totalDays?: number;
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID: { bg: Colors.successBg, text: Colors.success },
  PARTIAL: { bg: '#FEF9C3', text: Colors.warning },
  PENDING: { bg: Colors.errorBg, text: Colors.error },
};

export default function TransactionsScreen() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.DRIVER_TRANSACTIONS);
      setTxns(Array.isArray(data) ? data : (data.transactions ?? []));
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
          data={txns}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusStyle = STATUS_COLOR[item.paymentStatus ?? ''] ?? STATUS_COLOR.PENDING;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.driverName}>
                      {item.isMiscellaneous ? 'Misc Spend' : (item.driverId?.name ?? 'Unknown')}
                    </Text>
                    {item.isMiscellaneous
                      ? <Text style={styles.sub}>{item.miscellaneousReason}</Text>
                      : <Text style={styles.sub}>
                          {item.month ? MONTHS[item.month] : ''} {item.year}
                          {item.presentDays != null ? ` · ${item.presentDays}/${item.totalDays} days` : ''}
                        </Text>
                    }
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {item.paymentStatus ?? 'PENDING'}
                    </Text>
                  </View>
                </View>
                <View style={styles.amtRow}>
                  <View style={styles.amtItem}>
                    <Text style={styles.amtLabel}>Total</Text>
                    <Text style={styles.amtValue}>₹{(item.totalPayout ?? 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.amtItem}>
                    <Text style={styles.amtLabel}>Paid</Text>
                    <Text style={[styles.amtValue, { color: Colors.success }]}>₹{(item.paidAmount ?? 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.amtItem}>
                    <Text style={styles.amtLabel}>Pending</Text>
                    <Text style={[styles.amtValue, { color: Colors.error }]}>
                      ₹{Math.max(0, (item.totalPayout ?? 0) - (item.paidAmount ?? 0)).toLocaleString('en-IN')}
                    </Text>
                  </View>
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
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  driverName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  amtRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, gap: Spacing.sm },
  amtItem: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  amtValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
});
