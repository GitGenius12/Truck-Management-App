import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface BankEntry {
  _id: string;
  date: string;
  submittedBy?: { name: string };
  loggedIntoNetBanking: boolean;
  accountType?: string;
  sainikMotorDetails?: { bankName: string; openingBalance: number; closingBalance: number; noOfTransactions: number };
  amritLogisticsDetails?: { bankName: string; openingBalance: number; closingBalance: number; noOfTransactions: number };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BankEntryScreen() {
  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.BANK_ENTRIES);
      setEntries(Array.isArray(data) ? data : (data.entries ?? data.bankEntries ?? []));
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
          data={entries}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No bank entries found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.date}>{formatDate(item.date)}</Text>
                  {item.submittedBy && <Text style={styles.sub}>By {item.submittedBy.name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: item.loggedIntoNetBanking ? Colors.successBg : Colors.border }]}>
                  <Text style={[styles.badgeText, { color: item.loggedIntoNetBanking ? Colors.success : Colors.textMuted }]}>
                    {item.loggedIntoNetBanking ? 'Net Banking' : 'Not Logged In'}
                  </Text>
                </View>
              </View>
              {item.accountType && (
                <View style={styles.typeRow}>
                  <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.typeText}>{item.accountType}</Text>
                </View>
              )}
              {item.sainikMotorDetails && (
                <AccountRow label="Sainik Motor" details={item.sainikMotorDetails} />
              )}
              {item.amritLogisticsDetails && (
                <AccountRow label="Amrit Logistics" details={item.amritLogisticsDetails} />
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AccountRow({ label, details }: { label: string; details: any }) {
  return (
    <View style={styles.accountRow}>
      <Text style={styles.accountLabel}>{label}</Text>
      <View style={styles.accountStats}>
        <StatChip label="Opening" value={`₹${details.openingBalance?.toLocaleString('en-IN') ?? '—'}`} />
        <StatChip label="Closing" value={`₹${details.closingBalance?.toLocaleString('en-IN') ?? '—'}`} />
        <StatChip label="Txns" value={String(details.noOfTransactions ?? '—')} />
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  date: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  typeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  accountRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  accountLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary, marginBottom: 6 },
  accountStats: { flexDirection: 'row', gap: Spacing.sm },
  statChip: { flex: 1, backgroundColor: Colors.tealBg, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: 2 },
});
