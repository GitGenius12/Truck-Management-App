import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
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
  bankName?: string;
}

const MONTHS = [
  { v: '', label: 'All Months' },
  { v: '1', label: 'January' }, { v: '2', label: 'February' },
  { v: '3', label: 'March' }, { v: '4', label: 'April' },
  { v: '5', label: 'May' }, { v: '6', label: 'June' },
  { v: '7', label: 'July' }, { v: '8', label: 'August' },
  { v: '9', label: 'September' }, { v: '10', label: 'October' },
  { v: '11', label: 'November' }, { v: '12', label: 'December' },
];

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUSES = [
  { v: '', label: 'All Statuses' },
  { v: 'PENDING', label: 'Pending' },
  { v: 'PARTIAL', label: 'Partial' },
  { v: 'PAID', label: 'Paid' },
];

const TYPES = [
  { v: '', label: 'All Types' },
  { v: 'false', label: 'Driver Salaries' },
  { v: 'true', label: 'Misc Spends' },
];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID: { bg: Colors.successBg, text: Colors.success },
  PARTIAL: { bg: '#FEF9C3', text: Colors.warning },
  PENDING: { bg: Colors.errorBg, text: Colors.error },
};

function buildQuery(params: Record<string, string>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

// ── Simple inline picker pill row ────────────────────────────────
function PillRow({ options, value, onChange }: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
        {options.map(o => (
          <TouchableOpacity
            key={o.v}
            onPress={() => onChange(o.v)}
            style={[styles.pill, value === o.v && styles.pillActive]}
          >
            <Text style={[styles.pillText, value === o.v && styles.pillTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export default function TransactionsScreen() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // filter state
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [bank, setBank] = useState('');

  // applied filters (used for fetch)
  const [applied, setApplied] = useState({ search: '', month: '', year: '', status: '', type: '', bank: '' });

  const hasFilters = applied.search || applied.month || applied.year || applied.status || applied.type || applied.bank;

  const load = useCallback(async (filters = applied) => {
    try {
      const q = buildQuery({
        search: filters.search,
        month: filters.month,
        year: filters.year,
        paymentStatus: filters.status,
        isMiscellaneous: filters.type,
        bank: filters.bank,
      });
      const data = await api.get<any>(`${ENDPOINTS.DRIVER_TRANSACTIONS}${q}`);
      setTxns(Array.isArray(data) ? data : (data.transactions ?? []));
      setTotal(data.totalTransactions ?? (Array.isArray(data) ? data.length : 0));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [applied]);

  useEffect(() => { load(); }, []);

  function applyFilters() {
    const f = { search, month, year, status, type, bank };
    setApplied(f);
    setLoading(true);
    load(f);
    setShowFilters(false);
  }

  function clearFilters() {
    const empty = { search: '', month: '', year: '', status: '', type: '', bank: '' };
    setSearch(''); setMonth(''); setYear(''); setStatus(''); setType(''); setBank('');
    setApplied(empty);
    setLoading(true);
    load(empty);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Header bar ── */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>
          All Transactions{total > 0 ? <Text style={styles.headerCount}> · {total}</Text> : null}
        </Text>
        <TouchableOpacity onPress={() => setShowFilters(v => !v)} style={[styles.filterBtn, showFilters && styles.filterBtnActive]}>
          <Ionicons name="options-outline" size={18} color={showFilters ? Colors.white : Colors.primary} />
          <Text style={[styles.filterBtnText, showFilters && { color: Colors.white }]}>Filter</Text>
          {!!hasFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <TextInput
            style={styles.input}
            placeholder="Search driver name / phone…"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />

          <Text style={styles.filterLabel}>Month</Text>
          <PillRow options={MONTHS} value={month} onChange={setMonth} />

          <TextInput
            style={styles.input}
            placeholder={`Year (e.g. ${new Date().getFullYear()})`}
            placeholderTextColor={Colors.textMuted}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
          />

          <Text style={styles.filterLabel}>Status</Text>
          <PillRow options={STATUSES} value={status} onChange={setStatus} />

          <Text style={styles.filterLabel}>Type</Text>
          <PillRow options={TYPES} value={type} onChange={setType} />

          <TextInput
            style={styles.input}
            placeholder="Bank (e.g. HDFC)"
            placeholderTextColor={Colors.textMuted}
            value={bank}
            onChangeText={setBank}
          />

          <View style={styles.filterActions}>
            {!!hasFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={applyFilters} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <ListSkeleton count={5} lines={2} />
      ) : (
        <FlatList
          data={txns}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions found{hasFilters ? ' for selected filters' : ''}</Text>
              {!!hasFilters && (
                <TouchableOpacity onPress={clearFilters} style={styles.clearLink}>
                  <Text style={styles.clearLinkText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const statusStyle = STATUS_COLOR[item.paymentStatus ?? ''] ?? STATUS_COLOR.PENDING;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    {item.isMiscellaneous && (
                      <View style={styles.miscBadge}>
                        <Text style={styles.miscBadgeText}>MISC</Text>
                      </View>
                    )}
                    <Text style={styles.driverName} numberOfLines={1}>
                      {item.isMiscellaneous ? (item.miscellaneousReason ?? 'Misc Spend') : (item.driverId?.name ?? 'Unknown')}
                    </Text>
                    {item.isMiscellaneous
                      ? null
                      : <Text style={styles.sub}>
                          {item.month ? MONTH_LABELS[item.month] : ''} {item.year}
                          {item.presentDays != null ? ` · ${item.presentDays}/${item.totalDays} days` : ''}
                        </Text>
                    }
                    {item.bankName ? <Text style={styles.sub}>🏦 {item.bankName}</Text> : null}
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

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  headerCount: { fontSize: FontSize.sm, fontWeight: '400', color: Colors.textSecondary },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary,
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  filterDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.error, marginLeft: 2,
  },

  filterPanel: {
    backgroundColor: Colors.white, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text, marginBottom: Spacing.sm,
  },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
  filterActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  clearBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  clearBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  applyBtn: {
    flex: 2, paddingVertical: 10, borderRadius: Radius.sm,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  applyBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },

  list: { padding: Spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  clearLink: { marginTop: Spacing.xs },
  clearLinkText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  miscBadge: { backgroundColor: Colors.error, borderRadius: 4, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  miscBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.white },
  driverName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
  amtRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, gap: Spacing.sm },
  amtItem: { flex: 1, alignItems: 'center' },
  amtLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  amtValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
});
