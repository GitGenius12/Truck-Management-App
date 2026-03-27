import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TextInput, TouchableOpacity, Modal,
  Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing, interpolate, clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// ── Types ────────────────────────────────────────────────────────
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

// ── Constants ────────────────────────────────────────────────────
const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = [
  { v: '1', label: 'Jan' }, { v: '2', label: 'Feb' }, { v: '3', label: 'Mar' },
  { v: '4', label: 'Apr' }, { v: '5', label: 'May' }, { v: '6', label: 'Jun' },
  { v: '7', label: 'Jul' }, { v: '8', label: 'Aug' }, { v: '9', label: 'Sep' },
  { v: '10', label: 'Oct' }, { v: '11', label: 'Nov' }, { v: '12', label: 'Dec' },
];
const STATUSES = [
  { v: 'PENDING', label: 'Pending' },
  { v: 'PARTIAL', label: 'Partial' },
  { v: 'PAID', label: 'Paid' },
];
const TYPES = [
  { v: 'false', label: 'Salaries' },
  { v: 'true', label: 'Misc Spends' },
];

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PAID: { bg: Colors.successBg, text: Colors.success },
  PARTIAL: { bg: '#FEF9C3', text: Colors.warning },
  PENDING: { bg: Colors.errorBg, text: Colors.error },
};

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.62;

const MONTH_FULL = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function buildQuery(params: Record<string, string>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

/** Human-readable label for what period/scope the totals cover */
function buildPeriodLabel(f: { search: string; month: string; year: string; status: string; type: string; bank: string }) {
  const parts: string[] = [];
  if (f.month && f.year) parts.push(`${MONTH_FULL[parseInt(f.month)]} ${f.year}`);
  else if (f.month) parts.push(MONTH_FULL[parseInt(f.month)]);
  else if (f.year) parts.push(`Year ${f.year}`);
  if (f.type === 'false') parts.push('Driver Salaries');
  else if (f.type === 'true') parts.push('Misc Spends');
  if (f.status) parts.push(f.status.charAt(0) + f.status.slice(1).toLowerCase());
  if (f.bank) parts.push(f.bank);
  if (f.search) parts.push(`"${f.search}"`);
  return parts.length > 0 ? parts.join(' · ') : 'All Time';
}

// ── Spend Summary Card ───────────────────────────────────────────
function SpendSummaryCard({ txns, applied, count }: {
  txns: Transaction[];
  applied: { search: string; month: string; year: string; status: string; type: string; bank: string };
  count: number;
}) {
  const totalSpend = txns.reduce((s, t) => s + (t.totalPayout ?? 0), 0);
  const totalPaid  = txns.reduce((s, t) => s + (t.paidAmount ?? 0), 0);
  const totalPending = Math.max(0, totalSpend - totalPaid);
  const period = buildPeriodLabel(applied);
  const hasFilter = Object.values(applied).some(v => v !== '');

  function fmt(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  return (
    <View style={sum.card}>
      {/* Top row: label + period badge */}
      <View style={sum.topRow}>
        <View style={sum.labelGroup}>
          <Text style={sum.eyebrow}>TOTAL SPEND</Text>
          <View style={sum.periodRow}>
            <Ionicons name={hasFilter ? 'funnel' : 'time-outline'} size={12} color="rgba(255,255,255,0.55)" />
            <Text style={sum.period}>{period}</Text>
          </View>
        </View>
        <View style={sum.countBadge}>
          <Text style={sum.countBadgeText}>{count} txn{count !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Big spend number */}
      <Text style={sum.bigAmount}>{fmt(totalSpend)}</Text>

      {/* Paid / Pending split */}
      <View style={sum.splitRow}>
        <View style={sum.splitItem}>
          <View style={[sum.splitDot, { backgroundColor: '#4ade80' }]} />
          <View>
            <Text style={sum.splitLabel}>Paid</Text>
            <Text style={sum.splitValue}>{fmt(totalPaid)}</Text>
          </View>
        </View>
        <View style={sum.splitDivider} />
        <View style={sum.splitItem}>
          <View style={[sum.splitDot, { backgroundColor: '#f87171' }]} />
          <View>
            <Text style={sum.splitLabel}>Pending</Text>
            <Text style={sum.splitValue}>{fmt(totalPending)}</Text>
          </View>
        </View>
        <View style={sum.splitDivider} />
        <View style={sum.splitItem}>
          <View style={[sum.splitDot, { backgroundColor: '#a78bfa' }]} />
          <View>
            <Text style={sum.splitLabel}>Recovery %</Text>
            <Text style={sum.splitValue}>
              {totalSpend > 0 ? `${Math.round((totalPaid / totalSpend) * 100)}%` : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Pill chip ────────────────────────────────────────────────────
function DarkPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[ds.pill, active && ds.pillActive]}
      activeOpacity={0.75}
    >
      <Text style={[ds.pillText, active && ds.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Filter bottom-sheet ──────────────────────────────────────────
function FilterSheet({ visible, onClose, onApply, onClear, hasFilters, filters, setFilters }: {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  hasFilters: boolean;
  filters: { search: string; month: string; year: string; status: string; type: string; bank: string };
  setFilters: (f: any) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_H);
  const opacity = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { mass: 0.8, stiffness: 120, damping: 20 });
      opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    } else {
      translateY.value = withTiming(SHEET_H, { duration: 415, easing: Easing.bezier(0.32, 0, 0.67, 0) });
      opacity.value = withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) });
    }
  }, [visible]);

  const sheetAnim = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropAnim = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SHEET_H], [1, 0], 'clamp'),
  }));

  const pan = Gesture.Pan()
    .activeOffsetY(5)
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = clamp(startY.value + e.translationY, 0, SHEET_H);
    })
    .onEnd((e) => {
      if (translateY.value > SHEET_H * 0.3 || e.velocityY > 500) {
        translateY.value = withTiming(SHEET_H, { duration: 415, easing: Easing.bezier(0.32, 0, 0.67, 0) }, (done) => {
          if (done) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { mass: 0.8, stiffness: 120, damping: 20 });
      }
    });

  function set(key: string, val: string) {
    setFilters((prev: any) => ({ ...prev, [key]: prev[key] === val ? '' : val }));
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[ds.overlay, backdropAnim]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[ds.sheet, { height: SHEET_H, paddingBottom: insets.bottom + 16 }, sheetAnim]}
          >
            {/* Handle */}
            <View style={ds.handleWrap}>
              <View style={ds.handle} />
            </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.sheetScroll}>
          {/* Search */}
          <View style={ds.searchRow}>
            <Ionicons name="search-outline" size={16} color="#6B7F7D" style={{ marginRight: 8 }} />
            <TextInput
              style={ds.searchInput}
              value={filters.search}
              onChangeText={v => setFilters((p: any) => ({ ...p, search: v }))}
              placeholder="Driver name or phone…"
              placeholderTextColor="#B8CECC"
              returnKeyType="done"
            />
            {!!filters.search && (
              <TouchableOpacity onPress={() => setFilters((p: any) => ({ ...p, search: '' }))}>
                <Ionicons name="close-circle" size={16} color="#B8CECC" />
              </TouchableOpacity>
            )}
          </View>

          {/* Month */}
          <Text style={ds.groupLabel}>Month</Text>
          <View style={ds.pillWrap}>
            {MONTHS.map(m => (
              <DarkPill key={m.v} label={m.label} active={filters.month === m.v} onPress={() => set('month', m.v)} />
            ))}
          </View>

          {/* Year */}
          <Text style={ds.groupLabel}>Year</Text>
          <View style={ds.searchRow}>
            <TextInput
              style={[ds.searchInput, { flex: 1 }]}
              value={filters.year}
              onChangeText={v => setFilters((p: any) => ({ ...p, year: v }))}
              placeholder={`e.g. ${new Date().getFullYear()}`}
              placeholderTextColor="#B8CECC"
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>

          {/* Status */}
          <Text style={ds.groupLabel}>Status</Text>
          <View style={ds.pillWrap}>
            {STATUSES.map(s => (
              <DarkPill key={s.v} label={s.label} active={filters.status === s.v} onPress={() => set('status', s.v)} />
            ))}
          </View>

          {/* Type */}
          <Text style={ds.groupLabel}>Type</Text>
          <View style={ds.pillWrap}>
            {TYPES.map(t => (
              <DarkPill key={t.v} label={t.label} active={filters.type === t.v} onPress={() => set('type', t.v)} />
            ))}
          </View>

          {/* Bank */}
          <Text style={ds.groupLabel}>Bank</Text>
          <View style={ds.searchRow}>
            <TextInput
              style={[ds.searchInput, { flex: 1 }]}
              value={filters.bank}
              onChangeText={v => setFilters((p: any) => ({ ...p, bank: v }))}
              placeholder="e.g. HDFC"
              placeholderTextColor="#B8CECC"
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        {/* Action row */}
        <View style={ds.actionRow}>
          {hasFilters && (
            <TouchableOpacity style={ds.clearBtn} onPress={onClear}>
              <Text style={ds.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={ds.applyBtn} onPress={onApply}>
            <Text style={ds.applyBtnText}>Apply filters</Text>
          </TouchableOpacity>
        </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [filters, setFilters] = useState({ search: '', month: '', year: '', status: '', type: '', bank: '' });
  const [applied, setApplied] = useState({ search: '', month: '', year: '', status: '', type: '', bank: '' });

  const hasFilters = Object.values(applied).some(v => v !== '');

  const load = useCallback(async (f = applied) => {
    try {
      const q = buildQuery({ search: f.search, month: f.month, year: f.year, paymentStatus: f.status, isMiscellaneous: f.type, bank: f.bank });
      const data = await api.get<any>(`${ENDPOINTS.DRIVER_TRANSACTIONS}${q}`);
      setTxns(Array.isArray(data) ? data : (data.transactions ?? []));
      setTotal(data.totalTransactions ?? (Array.isArray(data) ? data.length : 0));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [applied]);

  useEffect(() => { load(); }, []);

  function applyFilters() {
    setApplied({ ...filters });
    setLoading(true);
    load({ ...filters });
    setSheetOpen(false);
  }

  function clearFilters() {
    const empty = { search: '', month: '', year: '', status: '', type: '', bank: '' };
    setFilters(empty);
    setApplied(empty);
    setLoading(true);
    load(empty);
    setSheetOpen(false);
  }

  function openSheet() {
    setFilters({ ...applied }); // sync sheet state with applied
    setSheetOpen(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Record count bar */}
      {!loading && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {total} transaction{total !== 1 ? 's' : ''}
            {hasFilters ? <Text style={styles.countFiltered}> · filtered</Text> : null}
          </Text>
          {hasFilters && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearLink}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <ListSkeleton count={5} lines={2} />
      ) : (
        <FlatList
          data={txns}
          keyExtractor={i => i._id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 21) + 190 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListHeaderComponent={txns.length > 0 ? (
            <SpendSummaryCard txns={txns} applied={applied} count={total} />
          ) : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No transactions found</Text>
              {hasFilters && (
                <TouchableOpacity onPress={clearFilters} style={{ marginTop: Spacing.sm }}>
                  <Text style={styles.clearLink}>Clear filters</Text>
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
                      <View style={styles.miscBadge}><Text style={styles.miscBadgeText}>MISC</Text></View>
                    )}
                    <Text style={styles.driverName} numberOfLines={1}>
                      {item.isMiscellaneous ? (item.miscellaneousReason ?? 'Misc Spend') : (item.driverId?.name ?? 'Unknown')}
                    </Text>
                    {!item.isMiscellaneous && (
                      <Text style={styles.sub}>
                        {item.month ? MONTH_LABELS[item.month] : ''} {item.year}
                        {item.presentDays != null ? ` · ${item.presentDays}/${item.totalDays} days` : ''}
                      </Text>
                    )}
                    {item.bankName ? <Text style={styles.sub}>🏦 {item.bankName}</Text> : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.paymentStatus ?? 'PENDING'}</Text>
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

      {/* ── Floating filter button ── */}
      <TouchableOpacity style={[styles.filterFab, hasFilters && styles.filterFabActive, { bottom: Math.max(insets.bottom, 21) + 110 }]} onPress={openSheet} activeOpacity={0.85}>
        <Ionicons name="options-outline" size={22} color={Colors.white} />
        {hasFilters && <View style={styles.filterDot} />}
      </TouchableOpacity>

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        hasFilters={hasFilters}
        filters={filters}
        setFilters={setFilters}
      />
    </SafeAreaView>
  );
}

// ── Screen styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  countText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  countFiltered: { color: Colors.primary, fontWeight: '600' },
  clearLink: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
  list: { padding: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
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
  filterFab: {
    position: 'absolute', alignSelf: 'center',
    left: '50%', marginLeft: -28,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  filterFabActive: { backgroundColor: Colors.primary },
  filterDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.error, borderWidth: 1.5, borderColor: Colors.white,
  },
});

// ── Summary card styles ──────────────────────────────────────────
const sum = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  labelGroup: { gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.45)', letterSpacing: 1.2, textTransform: 'uppercase' },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  period: { fontSize: FontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  bigAmount: {
    fontSize: 36, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginVertical: Spacing.sm,
  },
  splitRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: Spacing.sm, marginTop: Spacing.xs,
  },
  splitItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
  splitLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 },
  splitValue: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff', marginTop: 1 },
});

// ── Filter sheet styles ──────────────────────────────────────────
const ds = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#F8FCFC',
    borderTopLeftRadius: 48, borderTopRightRadius: 48,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center', paddingVertical: 12,
  },
  handle: {
    width: 86, height: 5, borderRadius: 999,
    backgroundColor: '#8FBFBC',
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetScroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: '#DCE9E7',
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: '#102A2A' },

  groupLabel: {
    fontSize: FontSize.xs, fontWeight: '700',
    color: '#6B7F7D',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },

  pill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#DCE9E7',
  },
  pillActive: { backgroundColor: '#0D7377', borderColor: '#0D7377' },
  pillText: { fontSize: FontSize.sm, fontWeight: '600', color: '#102A2A' },
  pillTextActive: { color: Colors.white },

  actionRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#DCE9E7',
  },
  clearBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1, borderColor: '#DCE9E7',
    alignItems: 'center',
  },
  clearBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: '#6B7F7D' },
  applyBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#0D7377', alignItems: 'center',
  },
  applyBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ECFFFB' },
});
